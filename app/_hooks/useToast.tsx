"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = {
  message: string;
  visible: boolean;
};

export function useToast(durationMs = 1800) {
  const [toast, setToast] = useState<ToastState>({ message: "", visible: false });
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setToast((current) => ({ ...current, visible: false }));
  }, []);

  const show = useCallback(
    (message: string) => {
      if (timer.current) window.clearTimeout(timer.current);
      setToast({ message, visible: true });
      timer.current = window.setTimeout(() => {
        setToast((current) => ({ ...current, visible: false }));
        timer.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast.message) return null;
  return (
    <div
      className="vizforge-toast"
      role="status"
      aria-live="polite"
      style={{ opacity: toast.visible ? 1 : 0, transition: "opacity 0.2s ease" }}
    >
      {toast.message}
    </div>
  );
}
