import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  enabled?: boolean;
  className?: string;
  position?: "top" | "bottom";
  openDelayMs?: number;
  closeDelayMs?: number;
}

export default function InteractiveTooltip({
  children,
  content,
  enabled = true,
  className = "",
  position = "bottom",
  openDelayMs = 100,
  closeDelayMs = 80,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const [coords, setCoords] = useState<{
    x: number;
    y: number;
    arrowOffset: number;
    placement: "top" | "bottom";
  }>({ x: 0, y: 0, arrowOffset: 0, placement: position });

  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!targetRef.current || !show) return;

    const rect = targetRef.current.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 120;
    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 320;

    const targetCenterX = rect.left + rect.width / 2;
    const margin = 12;
    const viewportWidth = window.innerWidth;

    let clampedCenterX = targetCenterX;
    let arrowOffset = 0;

    // Horizontal clamping within viewport
    if (clampedCenterX - tooltipWidth / 2 < margin) {
      const overflow = margin - (clampedCenterX - tooltipWidth / 2);
      clampedCenterX += overflow;
      arrowOffset = -overflow;
    } else if (clampedCenterX + tooltipWidth / 2 > viewportWidth - margin) {
      const overflow = clampedCenterX + tooltipWidth / 2 - (viewportWidth - margin);
      clampedCenterX -= overflow;
      arrowOffset = overflow;
    }

    // Clamp the arrowOffset so the arrow stays inside the tooltip body
    const maxArrowOffset = Math.max(0, tooltipWidth / 2 - 20);
    const clampedArrowOffset = Math.max(-maxArrowOffset, Math.min(maxArrowOffset, arrowOffset));

    // Vertical overflow checking & flipping
    let placement = position;
    const marginY = 12;

    if (placement === "top") {
      const topSpaceNeeded = rect.top - 8 - tooltipHeight;
      if (topSpaceNeeded < marginY) {
        const bottomSpace = window.innerHeight - rect.bottom;
        if (bottomSpace > rect.top) {
          placement = "bottom";
        }
      }
    } else {
      const bottomSpaceNeeded = rect.bottom + 8 + tooltipHeight;
      if (bottomSpaceNeeded > window.innerHeight - marginY) {
        if (rect.top > window.innerHeight - rect.bottom) {
          placement = "top";
        }
      }
    }

    let y = 0;
    if (placement === "top") {
      y = rect.top - 8;
    } else {
      y = rect.bottom + 8;
    }

    setCoords((prev) => {
      if (
        prev.x === clampedCenterX &&
        prev.y === y &&
        prev.arrowOffset === clampedArrowOffset &&
        prev.placement === placement
      ) {
        return prev;
      }
      return { x: clampedCenterX, y, arrowOffset: clampedArrowOffset, placement };
    });
  }, [position, show]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Force close when disabled changes to false
  useEffect(() => {
    if (!enabled) {
      setShow(false);
    }
  }, [enabled]);

  // Positioning and event listeners (only attached when open & enabled)
  useEffect(() => {
    if (!enabled || !show) return;

    let animFrameRef: number;
    const handleUpdate = () => {
      updatePosition();
    };

    // Defer initial calculation to next paint to allow portal mounting
    animFrameRef = requestAnimationFrame(handleUpdate);

    // Watch resize and scroll
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    // Escape listener to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShow(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Outside tap/click listener
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        targetRef.current &&
        !targetRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      cancelAnimationFrame(animFrameRef);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [enabled, show, updatePosition]);

  const handleOpen = useCallback(() => {
    if (!enabled) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!openTimeoutRef.current) {
      openTimeoutRef.current = setTimeout(() => {
        setShow(true);
        openTimeoutRef.current = null;
      }, openDelayMs);
    }
  }, [enabled, openDelayMs]);

  const handleClose = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (!closeTimeoutRef.current) {
      closeTimeoutRef.current = setTimeout(() => {
        setShow(false);
        closeTimeoutRef.current = null;
      }, closeDelayMs);
    }
  }, [closeDelayMs]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return;
    // Toggle on touch for mobile devices, without blocking link clicks
    e.stopPropagation();
    setShow((prev) => !prev);
  };

  return (
    <div
      ref={targetRef}
      className={`inline-flex items-center justify-center min-w-0 ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      onTouchStart={handleTouchStart}
      aria-describedby={show && enabled ? tooltipId : undefined}
    >
      {children}
      {enabled &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {show && (
              <motion.div
                ref={tooltipRef}
                id={tooltipId}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="w-[280px] sm:w-[320px] p-3 bg-[#020502]/95 backdrop-blur-md border border-green-500/40 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] text-[11px] text-green-100 font-sans leading-relaxed pointer-events-none whitespace-normal break-words shadow-glass-inset"
                style={{
                  position: "fixed",
                  top: coords.y,
                  left: coords.x,
                  transform:
                    coords.placement === "top"
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
                    ...(coords.placement === "top"
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
