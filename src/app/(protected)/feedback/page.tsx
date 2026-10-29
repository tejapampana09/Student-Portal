"use client";

import API from "@/lib/api/axiosClient";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/utils/useToast";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SessionCard from "@/components/utils/SessionCard";
import { isValidComment } from "@/validators/srmapi/feedback";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import FeedbackInfoDialog from "@/components/page/feedback/InfoDialog";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import { RefreshCw, Info, BookOpen, ChevronDown, ChevronUp, Sparkles, CheckCircle2, MessageSquare, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface Subject {
  id: string;
  name: string;
  faculty: string;
}

const Feedback = () => {
  const { toast } = useToast();
  const { sessionValid, sessionId } = useSessionValidator();
  const { settings, updateSettings, updateProfile } = useLocalStorageContext();
  const router = useRouter();

  const [selectedOption, setSelectedOption] = useState("5");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [response, setReponse] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const feedbackOptions = [
    { value: "1", label: "Strongly Disagree" },
    { value: "2", label: "Disagree" },
    { value: "3", label: "Neutral" },
    { value: "4", label: "Agree" },
    { value: "5", label: "Strongly Agree" },
  ];

  useEffect(() => {
    if (!settings.feedbackExplanationSeen) {
      setShowExplanation(true);
      updateSettings({ feedbackExplanationSeen: true });
    }
  }, [settings.feedbackExplanationSeen]);

  const loadSubjects = async (showToast: boolean = true) => {
    setLoadingSubjects(true);
    try {
      const res = await API.post("/srmapi/feedback/subjects", { sessionId });
      if (res.data?.renewedSession) {
        updateProfile({
          sessionId: res.data.renewedSession.sessionId,
          sessionTime: res.data.renewedSession.sessionTime,
        });
      }
      if (res.data.success && res.data.subjects) {
        setSubjects(res.data.subjects);
        setSelectedSubjectIds(res.data.subjects.map((s: Subject) => s.id));
        if (showToast) {
          toast({
            title: "Subjects Loaded",
            description: `Found ${res.data.subjects.length} course(s) pending feedback.`,
          });
        }
      } else {
        setSubjects([]);
        setSelectedSubjectIds([]);
        if (showToast)
          toast({
            title: "Notice",
            description: res.data.message || "Feedback may have already been submitted or window is closed.",
          });
      }
    } catch (error: any) {
      setSubjects([]);
      setSelectedSubjectIds([]);
      if (showToast) {
        toast({
          title: "Notice",
          description: error?.response?.data?.message || "No pending feedback forms detected.",
          variant: "default",
        });
      }
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadFeedbackComments = async () => {
    setLoadingComments(true);
    try {
      const response = await API.get("/srmapi/feedback/comment");
      if (response.data.comment) {
        setComment(response.data.comment);
      }
    } catch (error) {
      setComment("The course was delivered well and the syllabus objectives were fulfilled effectively.");
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllSubjects = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSubjectIds.length === subjects.length) {
      setSelectedSubjectIds([]);
    } else {
      setSelectedSubjectIds(subjects.map((s) => s.id));
    }
  };

  const handleSubmitClick = () => {
    if (!selectedOption) {
      toast({ title: "Error", description: "Please Select A Feedback Option", variant: "destructive" });
      return;
    }

    const [valid, errorMessage] = isValidComment(comment);
    if (!valid) {
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one subject.", variant: "destructive" });
      return;
    }

    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false);
    setLoading(true);
    try {
      const res = await API.post("/srmapi/feedback/submit", {
        sessionId,
        option: selectedOption,
        optionNo: selectedOption,
        comment,
        subjectIds: selectedSubjectIds,
        selectedSubjectIds: selectedSubjectIds,
      });
      if (res.data?.renewedSession) {
        updateProfile({
          sessionId: res.data.renewedSession.sessionId,
          sessionTime: res.data.renewedSession.sessionTime,
        });
      }
      if (res.data.success) {
        setReponse(res.data.message);
        setSuccessDialogOpen(true);
        setTimeout(() => loadSubjects(false), 1200);
      } else {
        toast({
          title: "Feedback Notice",
          description: res.data.message || "Failed to submit feedback.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to submit feedback.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbackComments();
  }, []);

  useEffect(() => {
    if (sessionValid && sessionId) {
      loadSubjects();
    }
  }, [sessionValid, sessionId]);

  const selectedSubjects = subjects.filter((s) => selectedSubjectIds.includes(s.id));
  const allSelected = subjects.length > 0 && selectedSubjectIds.length === subjects.length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-28">
      <FeedbackInfoDialog
        open={showExplanation || infoDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setShowExplanation(false);
            setInfoDialogOpen(false);
          }
        }}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Faculty Feedback
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              1-Click Auto
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Submit mandatory semester feedback forms across all enrolled subjects
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInfoDialogOpen(true)}
          className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto border border-border/70"
        >
          <Info className="h-3.5 w-3.5 text-blue-500" />
          <span>How It Works</span>
        </Button>
      </div>

      {sessionValid ? (
        <div className="flex flex-col gap-5">
          {/* Section 1: Rating Score */}
          <div className="flex flex-col gap-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rating Score
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {feedbackOptions.map((option) => {
                const isSelected = selectedOption === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedOption(option.value)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold scale-[1.02]"
                        : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                    }`}
                  >
                    <div className="text-xs">{option.label}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? "text-white/80" : "opacity-60"}`}>
                      Score: {option.value}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Target Courses List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Courses ({selectedSubjectIds.length}/{subjects.length})
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadSubjects(true)}
                  disabled={loadingSubjects}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingSubjects ? "animate-spin" : ""}`} />
                  <span>{loadingSubjects ? "Scanning..." : "Scan SRM"}</span>
                </button>
                {!loadingSubjects && subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllSubjects}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
            </div>

            {loadingSubjects ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>Scanning SRM portal for pending feedback forms...</span>
              </div>
            ) : subjects.length === 0 ? (
              <div className="py-6 px-4 rounded-2xl border border-border/60 bg-muted/20 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/80" />
                <p className="text-xs font-medium text-foreground">
                  No Pending Feedback Detected
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Either you have already completed feedback for all courses, or the SRM feedback submission window is currently not active.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadSubjects(true)}
                  disabled={loadingSubjects}
                  className="mt-1 h-7 text-xs rounded-xl gap-1.5"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingSubjects ? "animate-spin" : ""}`} />
                  <span>Check Again</span>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card overflow-hidden">
                {subjects.map((subject) => {
                  const checked = selectedSubjectIds.includes(subject.id);
                  return (
                    <div
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${
                        checked ? "bg-blue-500/5" : ""
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSubject(subject.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {subject.name || subject.id}
                        </p>
                        {subject.faculty && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {subject.faculty}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Comment Field */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="comment" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comment Text
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadFeedbackComments}
                  disabled={loadingComments}
                  className="h-7 px-2 rounded-lg text-xs gap-1 text-blue-600 dark:text-blue-400"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingComments ? "animate-spin" : ""}`} />
                  <span>Shuffle AI Comment</span>
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {comment.length}/256
                </span>
              </div>
            </div>

            <Textarea
              id="comment"
              placeholder="Enter your feedback comment..."
              value={comment}
              onChange={(e) => e.target.value.length <= 256 && setComment(e.target.value)}
              className="min-h-[90px] resize-none rounded-2xl text-xs sm:text-sm p-3.5 border-border/80 focus-visible:ring-1 focus-visible:ring-blue-500"
              maxLength={256}
            />
          </div>

          {/* Section 4: Submit Button */}
          <Button
            onClick={handleSubmitClick}
            disabled={loading || !selectedOption || !comment.trim() || selectedSubjectIds.length === 0}
            className="w-full h-12 rounded-2xl font-bold bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-blue-600 dark:hover:bg-blue-500 uppercase tracking-wider text-xs sm:text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Submitting Feedback...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Auto-Submit Feedback ({selectedSubjectIds.length} Subjects)</span>
              </>
            )}
          </Button>
        </div>
      ) : (
        <SessionCard />
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirm Feedback Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You are about to auto-submit feedback for {selectedSubjects.length} subject(s):
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-52 overflow-y-auto space-y-1.5 py-1 divide-y divide-border/40">
            {selectedSubjects.map((subject) => (
              <div key={subject.id} className="pt-1.5 first:pt-0">
                <p className="text-xs font-semibold text-foreground truncate">{subject.name || subject.id}</p>
                {subject.faculty && (
                  <p className="text-[11px] text-muted-foreground truncate">{subject.faculty}</p>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1">
            <p>
              <strong className="text-muted-foreground">Rating: </strong>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {feedbackOptions.find((o) => o.value === selectedOption)?.label} ({selectedOption})
              </span>
            </p>
            <p className="truncate">
              <strong className="text-muted-foreground">Comment: </strong>
              <span>{comment}</span>
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmDialogOpen(false)}
              className="rounded-xl h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="rounded-xl h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
            >
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-sm p-6 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-3xl text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-1">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-base font-bold text-foreground">
              {response || "Feedback Submitted Successfully!"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Your faculty feedback has been submitted to SRM portal.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            className="w-full mt-3 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feedback;