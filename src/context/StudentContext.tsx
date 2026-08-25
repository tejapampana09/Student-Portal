"use client";
import { useCallback } from "react";
import { toast } from "@/hooks/utils/useToast";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api/axiosClient";
import { extractErrorMessage, isSessionValid, needsRefresh } from "@/shared/utils/functions";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Profile, CGPA, Subject, Attendance, TimetableEntry, StudentDataContextType } from "@/types/context/studentContext";
import { useLocalStorageContext } from "@/context/LocalStorageContext";

const StudentDataContext = createContext<StudentDataContextType | undefined>(undefined);
export const StudentDataProvider = ({ children }: { children: ReactNode }) => {
  const { logout, isAuthenticated } = useAuth();
  const { updateActiveAccount, profile: lProfile } = useLocalStorageContext();

  const initialData = React.useMemo(() => {
    if (!lProfile?.data) return null;
    try {
      return typeof lProfile.data === "string" ? JSON.parse(lProfile.data) : lProfile.data;
    } catch {
      return null;
    }
  }, [lProfile?.data]);

  const [profile, setProfile] = useState<Profile | null>(() => initialData?.profile || null);
  const [cgpa, setCgpa] = useState<string | CGPA | null>(() => {
    if (!initialData) return null;
    return typeof initialData.cgpa === "object" && initialData.cgpa?.cgpa ? initialData.cgpa.cgpa : initialData.cgpa || null;
  });
  const [subjects, setSubjects] = useState<Subject[]>(() => initialData?.subjects || []);
  const [attendance, setAttendance] = useState<Attendance[]>(() => initialData?.attendance || []);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => initialData?.timetable || []);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState<boolean>(() => Boolean(initialData));
  const [error, setError] = useState<any>(null);
  const [loadCachedDataPrompt, setLoadCachedDataPrompt] = useState(false);

  const hasFetchedOnLoadRef = React.useRef(false);

  const loadDataToState = (data: any) => {
    if (!data) return;
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      setProfile(parsed.profile || null);
      const resolvedCgpa = typeof parsed.cgpa === "object" && parsed.cgpa?.cgpa ? parsed.cgpa.cgpa : parsed.cgpa;
      setCgpa(resolvedCgpa || null);
      setSubjects(parsed.subjects || []);
      setAttendance(parsed.attendance || []);
      setTimetable(parsed.timetable || []);
      setInitialized(true);
    } catch (e) {
      console.error("Error loading data to state:", e);
    }
  };

  const fetchFreshData = useCallback(async (override?: { sessionId?: string; sessionTime?: string }) => {
    setLoading(true);
    setError(null);
    try {
      let payload: { sessionId?: string, sent?: string } = {};

      const sid = override?.sessionId ?? lProfile.sessionId;
      const stime = override?.sessionTime ?? lProfile.sessionTime;

      if (isSessionValid(stime) && !lProfile.hasCachedData) {
        payload.sessionId = sid;
      }

      const res = await API.post('/srmapi/fetch', payload);
      const { data } = res.data;
      updateActiveAccount({ data });
      loadDataToState(data);
    } catch (err) {
      const errMsg = extractErrorMessage(err);
      if (errMsg.includes("SRM server is unreachable")) {
        setLoadCachedDataPrompt(true);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [lProfile.sessionTime, lProfile.sessionId]);

  const useCachedData = useCallback(async () => {
    updateActiveAccount({ hasCachedData: true });
    setLoadCachedDataPrompt(false);
    if (lProfile.data) {
      loadDataToState(lProfile.data);
    } else {
      await fetchFreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lProfile.data, fetchFreshData, updateActiveAccount]);

  const initiateSession = useCallback(async (): Promise<{ sessionId?: string; sessionTime?: string; } | null> => {
    try {
      const res = await API.get('/srmapi/initiate/session');
      const { sessionId: newSessionId, sessionTime: newSessionTime } = res.data;

      updateActiveAccount({ sessionId: newSessionId, sessionTime: newSessionTime, hasCachedData: false });
      // Non-blocking background data sync so the button activates instantly
      void fetchFreshData({ sessionId: newSessionId, sessionTime: newSessionTime });
      return { sessionId: newSessionId, sessionTime: newSessionTime };
    } catch (err) {
      const errMsg = extractErrorMessage(err);
      if (errMsg.includes("SRM server is unreachable")) {
        setLoadCachedDataPrompt(true);
      }
      console.error("Session initiation failed:", err);
      return null;
    }
  }, [updateActiveAccount, fetchFreshData]);

  const initializeStudentData = useCallback(async () => {
    try {
      const data = lProfile.data;
      const sessionId = lProfile.sessionId;
      const sessionTime = lProfile.sessionTime;

      if (data) {
        loadDataToState(data);
      }

      if (!sessionTime || needsRefresh(sessionTime)) {
        if (!lProfile.hasCachedData) {
          return await initiateSession();
        }
      }

      if (!hasFetchedOnLoadRef.current) {
        hasFetchedOnLoadRef.current = true;
        if (!data) {
          return await fetchFreshData();
        }
      }
    } catch (error) {
      console.error("Initialization error:", error);
      setError(error);
    }
  }, [lProfile.data, lProfile.sessionId, lProfile.sessionTime, lProfile.hasCachedData, fetchFreshData, initiateSession]);

  useEffect(() => {
    if (!isAuthenticated) return;
    hasFetchedOnLoadRef.current = false;
    setInitialized(false);
    initializeStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, lProfile.activeAccountId]);

  return (
    <StudentDataContext.Provider
      value={{
        profile,
        cgpa,
        subjects,
        attendance,
        timetable,
        loading,
        initialized,
        error,
        fetchFreshData,
        initializeStudentData,
        initiateSession,
        loadCachedDataPrompt,
        useCachedData
      }}
    >
      {children}
    </StudentDataContext.Provider>
  );
};

export const useStudentData = () => {
  const context = useContext(StudentDataContext);
  if (!context) {
    throw new Error("useStudentData must be used within a StudentDataProvider");
  }
  return context;
};