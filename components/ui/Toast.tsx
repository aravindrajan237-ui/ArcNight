"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "info" | "warning" | "danger";
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

const ICONS: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};
const ACCENT: Record<ToastTone, string> = {
  success: "text-success",
  info: "text-primary",
  warning: "text-warning",
  danger: "text-danger",
};

interface ToastApi {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Wrap any subtree (e.g. a flow layout) to enable `useToast()`. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback(
    (id: number) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const api: ToastApi = {
    toast,
    success: (title, description) => toast({ tone: "success", title, description }),
    error: (title, description) => toast({ tone: "danger", title, description }),
    info: (title, description) => toast({ tone: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:top-auto sm:right-4 sm:items-end sm:px-0">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const Icon = ICONS[toast.tone];
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-mist bg-white p-3.5 shadow-lifted">
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ACCENT[toast.tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-slate">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDone}
        aria-label="Dismiss"
        className="-m-1 rounded-lg p-1 text-slate transition hover:bg-mist"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Access the toast API. Must be used under a <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
