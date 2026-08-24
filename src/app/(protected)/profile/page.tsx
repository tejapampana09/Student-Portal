"use client";
import Male from "../../../../public/avatars/male.png";
import { trimText } from "@/shared/utils/functions";
import { toTitleCase } from "@/shared/utils/functions";
import { useStudentData } from "@/context/StudentContext";
import Female from "../../../../public/avatars/female.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Profile = () => {
    const { profile } = useStudentData();

    const avatarSrc =
        (profile?.gender?.toLowerCase() === "male"
        ? Male.src
        : profile?.gender?.toLowerCase() === "female"
        ? Female.src
        : Male.src);

    return (
        <div className="space-y-4 pb-6">
            <div className="mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Student Profile</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                    Verified Academic Identity & Enrollment Info
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-1 glass-card rounded-2xl border border-white/25 dark:border-white/10 shadow-lg p-2">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-3">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity"></div>
                                <Avatar className="relative h-24 w-24 border-2 border-white/40 shadow-md">
                                    <AvatarFallback className="bg-white/20 dark:bg-white/10 backdrop-blur-md">
                                        <img
                                            src={avatarSrc}
                                            alt={toTitleCase(profile?.studentName || "")}
                                            className="h-full w-full rounded-full object-cover"
                                        />
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <CardTitle className="text-lg font-bold truncate">{toTitleCase(profile?.studentName || "")}</CardTitle>
                        <CardDescription className="font-mono text-xs font-semibold text-primary">{profile?.registerNo || ""}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center pt-0">
                        <div className="inline-block px-3 py-1 rounded-full bg-white/20 dark:bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground">
                            {trimText(profile?.program, 28)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 glass-card rounded-2xl border border-white/25 dark:border-white/10 shadow-lg">
                    <CardHeader className="p-4 sm:p-5 border-b border-white/10">
                        <CardTitle className="text-lg font-bold">Academic Particulars</CardTitle>
                        <CardDescription className="text-xs">Directly synced from SRM AP University database</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="glass-panel p-3 rounded-xl border border-white/15">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Institution</h4>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{profile?.institution}</p>
                                </div>
                                <div className="glass-panel p-3 rounded-xl border border-white/15">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department / Major</h4>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{profile?.program}</p>
                                </div>
                                <div className="glass-panel p-3 rounded-xl border border-white/15">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Semester</h4>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{profile?.semester}</p>
                                </div>
                                <div className="glass-panel p-3 rounded-xl border border-white/15">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Section</h4>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{profile?.section}</p>
                                </div>
                                <div className="glass-panel p-3 rounded-xl border border-white/15">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth</h4>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{profile?.dob}</p>
                                </div>
                                <div className="glass-panel p-3 rounded-xl border border-white/15">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gender</h4>
                                    <p className="text-sm font-bold text-foreground mt-0.5">{profile?.gender}</p>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-xs text-muted-foreground italic text-center sm:text-left">
                                    Note: Sourced securely from the official SRMAP Student Portal API.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;