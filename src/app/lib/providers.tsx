import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/* ---------------- Theme (manual toggle + auto) ---------------- */

type ThemePref = "light" | "dark" | "auto";

function applyTheme(pref: ThemePref) {
  const osDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = pref === "dark" || (pref === "auto" && osDark);
  document.documentElement.classList.toggle("dark", dark);
}

const ThemeCtx = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void }>({
  pref: "auto",
  setPref: () => {},
});

function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    return (localStorage.getItem("sm.theme") as ThemePref) || "auto";
  });

  useEffect(() => {
    applyTheme(pref);
    localStorage.setItem("sm.theme", pref);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (pref === "auto") applyTheme("auto");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => setPrefState(p), []);
  return <ThemeCtx.Provider value={{ pref, setPref }}>{children}</ThemeCtx.Provider>;
}

export function useThemePref() {
  return useContext(ThemeCtx);
}

/* ---------------- Focus timer (survives navigation) ---------------- */

type FocusState = {
  minutes: number;
  secondsLeft: number;
  running: boolean;
};

const FocusCtx = createContext<{
  state: FocusState;
  start: (minutes: number) => void;
  pause: () => void;
  reset: () => void;
} | null>(null);

function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusState>({ minutes: 25, secondsLeft: 25 * 60, running: false });
  const record = useMutation(api.focus.complete);

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => {
      setState((s) => {
        if (!s.running) return s;
        if (s.secondsLeft <= 1) {
          record({ minutes: s.minutes, day: todayStrLocal() }).catch(() => {});
          toast.success("Focus session complete — nice work.");
          return { ...s, secondsLeft: 0, running: false };
        }
        return { ...s, secondsLeft: s.secondsLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.running, record]);

  const start = useCallback((minutes: number) => {
    setState({ minutes, secondsLeft: minutes * 60, running: true });
  }, []);
  const pause = useCallback(() => setState((s) => ({ ...s, running: false })), []);
  const reset = useCallback(
    () => setState((s) => ({ ...s, secondsLeft: s.minutes * 60, running: false })),
    [],
  );

  return <FocusCtx.Provider value={{ state, start, pause, reset }}>{children}</FocusCtx.Provider>;
}

function todayStrLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useFocus() {
  const ctx = useContext(FocusCtx);
  if (!ctx) throw new Error("useFocus outside provider");
  return ctx;
}

/* ---------------- Streak bump (any activity) ---------------- */

export function useBumpStreak() {
  const bump = useMutation(api.profile.bumpStreak);
  return useCallback(() => {
    bump({})
      .then((r) => {
        if (r?.milestone) toast.success(`🔥 ${r.milestone}-day streak!`);
      })
      .catch(() => {});
  }, [bump]);
}

/* ---------------- App providers ---------------- */

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <FocusProvider>{children}</FocusProvider>
    </ThemeProvider>
  );
}
