"use client";

import React from "react";
import { motion } from "framer-motion";

export function AnimatedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-animated-gradient flex flex-col items-center">
      {/* Floating abstract decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-yellow-300/20 blur-3xl"
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -50, 60, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl"
          animate={{
            x: [0, -100, 50, 0],
            y: [0, 80, -60, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-red-500/15 blur-3xl"
          animate={{
            x: [0, 60, -80, 0],
            y: [0, 90, -40, 0],
          }}
          transition={{
            duration: 20,
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
