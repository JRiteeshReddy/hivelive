"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  heavy?: boolean;
}

export function GlassCard({
  children,
  className,
  animate = true,
  heavy = false,
}: GlassCardProps) {
  const glassClass = heavy ? "glass-panel-heavy" : "glass-panel";
  const combinedClass = cn(
    "rounded-2xl border border-white/15 p-6 shadow-2xl backdrop-blur-xl transition-shadow duration-300",
    glassClass,
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={combinedClass}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedClass}>
      {children}
    </div>
  );
}
