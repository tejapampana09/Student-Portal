"use client";

import React from "react";

export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden select-none" aria-hidden="true">
      {/* 🍏 Pure Clean Apple White Canvas - Crystal Clean, No Blobs */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#ffffff] via-[#fafbfc] to-[#f4f6f8] dark:bg-gradient-to-b dark:from-[#090d16] dark:via-[#0c1220] dark:to-[#080c14] transition-colors duration-500" />
    </div>
  );
}
