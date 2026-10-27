"use client";
import { Info, Sparkles, Award, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Subject } from "./AttendanceCard";
import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";

const AttendanceDialog = ({ subject }: { subject: Subject }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-1 h-7 w-7 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    title="View Attendance & OD Details"
                >
                    <Info className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md glass-card rounded-[2rem] border border-white/20 p-6 shadow-2xl backdrop-blur-3xl">
                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-bold">
                            {subject.subject_code}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-foreground mt-2 tracking-tight leading-snug">
                            {subject.subject_name}
                        </h3>
                    </div>

                    <div className="space-y-2.5">
                        {/* OD / ML Approved Classes */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <CalendarCheck className="h-5 w-5 text-cyan-400 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-foreground">OD / Medical Leave</p>
                                    <p className="text-[11px] text-muted-foreground">Approved by university</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-base font-bold text-foreground font-mono">{subject.od_ml_taken ?? 0} classes</p>
                                <p className="text-[10px] font-medium text-muted-foreground">+{subject.od_ml_percentage ?? 0}%</p>
                            </div>
                        </div>

                        {/* Raw Classroom Attendance */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-foreground">Raw Present</p>
                                <p className="text-[11px] text-muted-foreground">{subject.attended} / {subject.conducted} classes</p>
                            </div>
                            <p className="text-base font-bold text-foreground font-mono">{subject.present_percentage ?? 0}%</p>
                        </div>

                        {/* Total Effective Attendance */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/25 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <Award className="h-4 w-4 text-emerald-400" />
                                    <p className="text-xs font-bold text-emerald-400">Total Attendance</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Present + OD / ML Combined
                                </p>
                            </div>
                            <p className="text-2xl font-extrabold text-emerald-400 font-mono">{subject.percentage}%</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <DialogClose asChild>
                        <Button className="w-full h-10 rounded-xl glass-btn font-semibold border-white/20">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AttendanceDialog;
