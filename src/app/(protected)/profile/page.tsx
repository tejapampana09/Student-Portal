"use client";
import Male from "../../../../public/avatars/male.png";
import { trimText, toTitleCase } from "@/shared/utils/functions";
import { useStudentData } from "@/context/StudentContext";
import Female from "../../../../public/avatars/female.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building, BookOpen, Layers, Calendar, Sparkles, ShieldCheck } from "lucide-react";

const Profile = () => {
    const { profile } = useStudentData();

    const avatarSrc =
        (profile?.gender?.toLowerCase() === "male"
        ? Male.src
        : profile?.gender?.toLowerCase() === "female"
        ? Female.src
        : Male.src);

    return (
        <div className="space-y-6 pb-8 max-w-7xl mx-auto w-full">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Student Identity & Profile
                    </h1>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Verified Academic Identity & Official University Particulars
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Profile Identity Card */}
                <Card className="md:col-span-4 relative overflow-hidden glass-card rounded-[2.5rem] border border-white/20 p-5 shadow-2xl flex flex-col items-center text-center">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                    
                    <div className="relative mt-4 mb-4">
                        <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-cyan-400/30 rounded-full blur-xl opacity-75" />
                        <Avatar className="relative h-28 w-28 border-2 border-white/30 shadow-2xl">
                            <AvatarFallback className="bg-white/10 backdrop-blur-xl">
                                <img
                                    src={avatarSrc}
                                    alt={toTitleCase(profile?.studentName || "")}
                                    className="h-full w-full rounded-full object-cover"
                                />
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <CardTitle className="text-xl font-bold text-foreground truncate max-w-full px-2">
                        {toTitleCase(profile?.studentName || "Student")}
                    </CardTitle>
                    <p className="font-mono text-xs font-bold text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mt-2">
                        {profile?.registerNo || "N/A"}
                    </p>

                    <div className="mt-4 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground max-w-full truncate">
                        {trimText(profile?.program, 36) || "Degree Program"}
                    </div>

                    <div className="w-full mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-2 text-left">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Semester</span>
                            <p className="text-sm font-bold text-foreground font-mono mt-0.5">{profile?.semester || "N/A"}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Section</span>
                            <p className="text-sm font-bold text-foreground font-mono mt-0.5">{profile?.section || "N/A"}</p>
                        </div>
                    </div>
                </Card>

                {/* Academic Records Breakdown */}
                <Card className="md:col-span-8 relative overflow-hidden glass-card rounded-[2.5rem] border border-white/20 shadow-2xl">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
                    
                    <CardHeader className="p-6 border-b border-white/10">
                        <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Academic Particulars</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Directly retrieved and decrypted from the SRM campus server</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="p-4 rounded-2xl bg-white/5 dark:bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Building className="h-3.5 w-3.5 text-cyan-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Institution</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">{profile?.institution || "SRM University AP"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 dark:bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Program / Major</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">{profile?.program || "N/A"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 dark:bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Current Semester</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">{profile?.semester || "N/A"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 dark:bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <User className="h-3.5 w-3.5 text-purple-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Section Assignment</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">{profile?.section || "N/A"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 dark:bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <Calendar className="h-3.5 w-3.5 text-teal-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Date of Birth</span>
                                </div>
                                <p className="text-sm font-bold text-foreground font-mono">{profile?.dob || "N/A"}</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 dark:bg-white/[0.03] border border-white/10">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                    <User className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Gender</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">{profile?.gender || "N/A"}</p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center gap-2 text-xs">
                            <Sparkles className="h-4 w-4 shrink-0" />
                            <span>Academic credentials synced directly from SRM Student Corner portal.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;
