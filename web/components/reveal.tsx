"use client";

import { motion, type HTMLMotionProps } from "motion/react";

/**
 * Reveal escalonado en la carga de página (frontend-design: "one well-orchestrated
 * page load with staggered reveals"). Respeta prefers-reduced-motion vía Motion.
 */
export function Reveal({
  index = 0,
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
