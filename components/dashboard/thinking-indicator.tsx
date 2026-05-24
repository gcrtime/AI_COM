"use client";

import { motion } from "motion/react";

export function ThinkingIndicator() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-start"
      initial={{ opacity: 0, y: 6 }}
    >
      <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
        <span className="font-medium text-zinc-800">Thinking</span>
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              animate={{ y: [0, -5, 0] }}
              className="size-1.5 rounded-full bg-zinc-500"
              transition={{
                duration: 0.55,
                repeat: Infinity,
                delay: index * 0.14,
                ease: "easeInOut",
              }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
