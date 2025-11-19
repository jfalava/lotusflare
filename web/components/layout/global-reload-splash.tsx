"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flower } from "lucide-react";

export default function GlobalReloadSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const isReload = (() => {
      try {
        const nav = (performance.getEntriesByType("navigation")[0] ||
          {}) as PerformanceNavigationTiming & { type?: string };
        if (nav && nav.type) return nav.type === "reload";
        // Fallback for older browsers
        if (performance.navigation?.type === 1) return true;
      } catch {}
      return false;
    })();

    const sessionFlag = sessionStorage.getItem("lf_last_nav_reload");
    if (isReload) {
      sessionStorage.setItem("lf_last_nav_reload", "1");
    }

    if (!isReload && !sessionFlag) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setVisible(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-background"
          style={{
            fontFamily:
              'Atlassian Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <div className="text-center">
            <Flower className="mx-auto mb-4 h-16 w-16 text-indigo-500" />
            <h1 className="text-4xl font-extrabold tracking-tight">
              Lotusflare
            </h1>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
