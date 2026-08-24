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
        <div className="space-y-6 pb-8 max-w-7xl mx-auto w-full">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Student Profile
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Verified Academic Identity & Enrollment Particulars
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                <Card className="md:col-span-4 glass-card rounded-3xl border border-white/10 shadow-lg p-3">
                    <CardHeader className="text-center pb-3">
                        <div className="flex justify-center mb-3">
                            <div className="relative">
                                <Avatar className="h-28 w-28 border border-white/20 shadow-lg">
                                    <AvatarFallback className="bg-white/10 backdrop-blur-xl">
                                        <img
                                            src={avatarSrc}
                                            alt={toTitleCase(profile?.studentName || "")}
                                            className="h-full w-full rounded-full object-cover"
                                        />
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-foreground truncate">{toTitleCase(profile?.studentName || "")}</CardTitle>
                        <CardDescription className="font-mono text-xs font-semibold text-muted-foreground mt-1">
                            {profile?.registerNo || ""}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center pt-0">
                        <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-muted-foreground">
                            {trimText(profile?.program, 32)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-8 glass-card rounded-3xl border border-white/10 shadow-lg">
                    <CardHeader className="p-5 sm:p-6 border-b border-white/10">
                        <CardTitle className="text-lg font-bold tracking-tight">Academic Particulars</CardTitle>
                        <CardDescription className="text-xs">Directly synced from SRM University database</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Institution</h4>
                                    <p className="text-sm font-bold text-foreground mt-1">{profile?.institution || "SRM University AP"}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Program / Major</h4>
                                    <p className="text-sm font-bold text-foreground mt-1">{profile?.program || "N/A"}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current Semester</h4>
                                    <p className="text-sm font-bold text-foreground mt-1">{profile?.semester || "N/A"}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Section</h4>
                                    <p className="text-sm font-bold text-foreground mt-1">{profile?.section || "N/A"}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth</h4>
                                    <p className="text-sm font-bold text-foreground mt-1">{profile?.dob || "N/A"}</p>
                                </div>
                                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gender</h4>
                                    <p className="text-sm font-bold text-foreground mt-1">{profile?.gender || "N/A"}</p>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-xs text-muted-foreground opacity-75">
                                    Data synced with SRM student corner HRD system.
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