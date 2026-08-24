"use client";

import React from "react";

export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden" aria-hidden="true">
      {/* 🖼️ User Custom Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat app-custom-wallpaper"
        style={{ backgroundImage: "url('/wallpaper.png?v=2')" }}
      />
      {/* 🪟 Subtle ambient translucent tone for text readability */}
      <div className="absolute inset-0 bg-black/15 dark:bg-black/30" />
    </div>
  );
}
