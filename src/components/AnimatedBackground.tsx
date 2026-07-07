"use client";

import React from "react";
import { motion } from "framer-motion";

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-animated-gradient flex flex-col items-center">
      {/* Grid texture for futuristic tech feel */}
      <div className="absolute inset-0 bg-grid-overlay pointer-events-none opacity-70 z-0" />
      
      {/* Radial vignetting overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none z-0" />

      {/* Floating abstract glowing blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#FED71A]/25 via-[#FF6B00]/10 to-transparent blur-3xl"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -70, 80, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/3 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#FF6B00]/20 via-[#FED71A]/10 to-transparent blur-3xl"
          animate={{
            x: [0, -120, 60, 0],
            y: [0, 100, -80, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 left-1/4 w-[450px] h-[450px] rounded-full bg-gradient-to-t from-red-600/15 via-[#FF6B00]/10 to-transparent blur-3xl"
          animate={{
            x: [0, 80, -90, 0],
            y: [0, 120, -50, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative w-full z-10 flex-grow flex flex-col">
        {children}
      </div>
    </div>
  );
}
