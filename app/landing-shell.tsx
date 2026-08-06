"use client";

import {
  ComponentPropsWithoutRef,
  PointerEvent,
  useEffect,
  useRef,
} from "react";

type LandingShellProps = Omit<
  ComponentPropsWithoutRef<"main">,
  "onPointerMove"
>;

export default function LandingShell({
  children,
  className = "landing",
  ...props
}: LandingShellProps) {
  const glowRef = useRef<HTMLSpanElement>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });

  useEffect(
    () => () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current);
      }
    },
    [],
  );

  function trackPointer(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;

    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    if (pointerFrameRef.current !== null) return;

    const landing = event.currentTarget;
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      if (!glowRef.current) return;

      const bounds = landing.getBoundingClientRect();
      const { x, y } = pointerPositionRef.current;
      glowRef.current.style.transform = `translate3d(${x - bounds.left}px, ${y - bounds.top}px, 0) translate(-50%, -50%)`;
    });
  }

  return (
    <main {...props} className={className} onPointerMove={trackPointer}>
      <div className="landing-atmosphere" aria-hidden="true">
        <span ref={glowRef} className="landing-glow" />
      </div>
      {children}
    </main>
  );
}
