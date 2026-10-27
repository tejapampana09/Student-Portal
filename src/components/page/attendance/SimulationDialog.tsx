"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SimulationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: number) => void;
    title: string;
    description: string;
    inputLabel: string;
    buttonText: string;
}

const SimulationDialog = ({ isOpen, onClose, onConfirm, title, description, inputLabel, buttonText }: SimulationDialogProps) => {
    const [value, setValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue >= 0) {
            onConfirm(numValue);
            setValue("");
            onClose();
        }
    };

    const handleClose = () => {
        setValue("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] glass-card rounded-[2rem] border border-white/20 p-6 shadow-2xl backdrop-blur-2xl">
                <DialogHeader className="space-y-1.5 text-left">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">{title}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">{description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label htmlFor="simulation-input" className="text-xs font-semibold text-foreground/90">
                            {inputLabel}
                        </label>
                        <Input
                            id="simulation-input"
                            type="number"
                            min="1"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="e.g. 2"
                            autoFocus
                            className="h-11 rounded-xl text-sm glass-input text-foreground border-white/20 focus:border-cyan-400 font-mono"
                        />
                    </div>
                    <div className="flex justify-end gap-2.5 pt-1">
                        <Button type="button" variant="ghost" onClick={handleClose} className="rounded-xl h-10 px-4 text-xs font-semibold hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="rounded-xl h-10 px-5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border border-white/20"
                        >
                            {buttonText}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default SimulationDialog;
