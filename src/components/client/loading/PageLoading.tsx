"use client";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4 select-none">
      <Image
        src="/icons/portal_logo.png"
        alt="Loading"
        width={80}
        height={80}
        priority
        className="w-16 h-16 sm:w-20 sm:h-20 object-contain animate-logo-fade"
      />
    </div>
  );
}
