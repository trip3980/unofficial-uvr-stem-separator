import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  enabled?: boolean;
  className?: string;
  position?: "top" | "bottom";
}

export default function InteractiveTooltip({
  children,
  content,
  enabled = true,
  className = "",
  position = "bottom",
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, arrowOffset: 0 });

  const updatePosition = useCallback(() => {
    if (targetRef.current && show) {
      const rect = targetRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      let newX = rect.left + rect.width / 2 + scrollX;
      let newY =
        position === "top" ? rect.top + scrollY - 8 : rect.bottom + scrollY + 8;

      let arrowOffset = 0;
      const tooltipMaxWidth = 320;
      const margin = 24;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

      // Check if it overflows the right side of the screen
      if (newX + tooltipMaxWidth / 2 > viewportWidth - margin) {
        const overflow =
          newX + tooltipMaxWidth / 2 - (viewportWidth - margin);
        newX -= overflow;
        arrowOffset = overflow;
      }
      // Check if it overflows the left side of the screen
      else if (newX - tooltipMaxWidth / 2 < margin) {
        const overflow = margin - (newX - tooltipMaxWidth / 2);
        newX += overflow;
        arrowOffset = -overflow;
      }

      setCoords({ x: newX, y: newY, arrowOffset });
    }
  }, [position, show]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  return (
    <div
      ref={targetRef}
      className={`inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {enabled &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {show && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="w-[280px] sm:w-[320px] p-3 bg-[#020502]/95 backdrop-blur-md border border-green-500/40 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] text-[11px] text-green-100 font-sans leading-relaxed pointer-events-none whitespace-normal break-words shadow-glass-inset"
                style={{
                  position: "absolute",
                  top: coords.y,
                  left: coords.x,
                  transform:
                    position === "top"
                      ? "translate(-50%, -100%)"
                      : "translate(-50%, 0)",
                  zIndex: 999999,
                  maxWidth: "min(320px, calc(100vw - 48px))",
                }}
              >
                {content}
                <div
                  className="absolute w-2.5 h-2.5 bg-[#020502] border-green-500/40 rotate-45"
                  style={{
                    left: `calc(50% + ${coords.arrowOffset}px)`,
                    transform: "translateX(-50%) rotate(45deg)",
                    ...(position === "top"
                      ? {
                          bottom: "-5px",
                          borderBottom: "1px solid",
                          borderRight: "1px solid",
                        }
                      : {
                          top: "-5px",
                          borderTop: "1px solid",
                          borderLeft: "1px solid",
                        }),
                  }}
                ></div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
