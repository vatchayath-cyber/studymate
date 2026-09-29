import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { AppProviders, useBumpStreak, useFocus, useThemePref } from "./lib/providers";
import { MOBILE_PRIMARY, NAV_ITEMS } from "./lib/nav";
import { budgetLevel } from "./lib/helpers";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Bell,
  Flame,
  LogOut,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router";

import Home from "./views/Home";
import Chat from "./views/Chat";
import Materials from "./views/Materials";
import Syllabus from "./views/Syllabus";
import Priority from "./views/Priority";
import Planner from "./views/Planner";
import CalendarView from "./views/CalendarView";
import Expenses from "./views/Expenses";
import Analytics from "./views/Analytics";
import Tasks from "./views/Tasks";
import Alerts from "./views/Alerts";
import Profile from "./views/Profile";

const VIEWS = {
  home: Home,
  chat: Chat,
  materials: Materials,
  syllabus: Syllabus,
  priority: Priority,
  planner: Planner,
  calendar: CalendarView,
  expenses: Expenses,
  analytics: Analytics,
  tasks: Tasks,
  alerts: Alerts,
  profile: Profile,
} as const;

function useAlertCount() {
  const tasks = useQuery(api.tracking.listTasks) ?? [];
  const expenses = useQuery(api.tracking.listExpenses) ?? [];
  const profile = useQuery(api.profile.getMy);
  const topics = useQuery(api.library.listSyllabus);
  const today = todayLocal();

  let count = 0;
  count += tasks.filter((t) => t.date === today && !t.done).length;
  const budget = profile?.monthlyBudget ?? 0;
  if (budget > 0) {
    const month = today.slice(0, 7);
    const spent = expenses
      .filter((e) => e.date.startsWith(month))
      .reduce((s, e) => s + e.amount, 0);
    if (budgetLevel(spent, budget) !== "ok") count += 1;
  }
  if (topics) {
    count += topics.topics.filter((t) => t.status === "Needs Revision").length;
  }
  return count;
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StreakChip({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm" title="Day streak">
      <Flame className="size-3.5 text-muted-foreground" />
      <span className="tnum font-medium">{value}</span>
    </div>
  );
}

function ThemeToggle() {
  const { pref, setPref } = useThemePref();
  const next = pref === "light" ? "dark" : pref === "dark" ? "auto" : "light";
  const Icon = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? Sun : Moon;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setPref(next)}
      title={`Theme: ${pref} (click for ${next})`}
    >
      <Icon className="size-4" />
    </Button>
  );
}

function FocusTimerWidget() {
  const { state, start, pause, reset } = useFocus();
  const mm = Math.floor(state.secondsLeft / 60);
  const ss = state.secondsLeft % 60;
  const [presetsOpen, setPresetsOpen] = useState(false);
  return (
    <div className="relative flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
      <Timer className="size-3.5 text-muted-foreground" />
      <span className="tnum w-11 text-center font-medium">
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </span>
      {state.running ? (
        <button className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={pause} title="Pause">
          <Pause className="size-3.5" />
        </button>
      ) : (
        <button
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          onClick={() => start(state.minutes)}
          title={`Start ${state.minutes}m focus`}
        >
          <Play className="size-3.5" />
        </button>
      )}
      <button className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={reset} title="Reset">
        <RotateCcw className="size-3.5" />
      </button>
      <button
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        onClick={() => setPresetsOpen((o) => !o)}
        title="Preset"
      >
        <span className="tnum text-[10px]">{state.minutes}m</span>
      </button>
      {presetsOpen && (
        <div className="absolute right-0 top-8 z-30 flex gap-1 rounded-md border bg-popover p-1 shadow-md">
          {[15, 25, 50].map((m) => (
            <button
              key={m}
              className={cn(
                "tnum rounded px-2 py-0.5 text-xs hover:bg-accent",
                state.minutes === m && "bg-accent font-medium",
              )}
              onClick={() => {
                start(m);
                setPresetsOpen(false);
              }}
            >
              {m}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MoreSheet() {
  const [open, setOpen] = useState(false);
  const { slug } = useParams();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex min-w-12 flex-col items-center gap-0.5 px-1 py-1.5 text-muted-foreground">
          <MoreHorizontal className="size-5" />
          <span className="text-[10px]">More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 pb-6">
          {NAV_ITEMS.filter((n) => !MOBILE_PRIMARY.includes(n.slug)).map((n) => (
            <Link
              key={n.slug}
              to={`/app/${n.slug}`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs text-muted-foreground hover:bg-accent",
                slug === n.slug && "border-foreground/30 text-foreground",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const groups = ["Study", "Life", "Account"] as const;
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-sidebar text-sidebar-foreground md:flex",
        collapsed ? "w-14" : "w-52",
      )}
    >
      <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <Link to="/app/home" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded bg-foreground text-[11px] font-bold text-background">S</span>
          {!collapsed && <span>StudyMate</span>}
        </Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {groups.map((g) => (
          <div key={g}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">{g}</p>
            )}
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((n) => n.group === g).map((n) => (
                <NavLink
                  key={n.slug}
                  to={`/app/${n.slug}`}
                  title={n.label}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0",
                    )
                  }
                >
                  <n.icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={onToggle}>
          <MoreHorizontal className="size-4" />
          {!collapsed && <span className="text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}

function TopBar() {
  const { user, signOut } = useAuth();
  const profile = useQuery(api.profile.getMy);
  const alerts = useAlertCount();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex items-center gap-2 md:hidden">
        <span className="grid size-6 place-items-center rounded bg-foreground text-[11px] font-bold text-background">S</span>
        <span className="font-semibold tracking-tight">StudyMate</span>
      </div>
      <div className="hidden items-center gap-2 md:flex" />
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <FocusTimerWidget />
        </div>
        <StreakChip value={profile?.streakCount ?? 0} />
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/app/alerts")} title="Alerts">
          <Bell className="size-4" />
          {alerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background tnum">
              {alerts > 9 ? "9+" : alerts}
            </span>
          )}
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <span className="hidden max-w-32 truncate text-sm text-muted-foreground sm:block">
          {profile?.name || user?.name || user?.email || "You"}
        </span>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function BottomNav() {
  const { slug } = useParams();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t bg-background/95 backdrop-blur md:hidden">
      {MOBILE_PRIMARY.map((s) => {
        const item = NAV_ITEMS.find((n) => n.slug === s)!;
        const active = slug === s;
        return (
          <Link
            key={s}
            to={`/app/${s}`}
            className={cn(
              "flex min-w-12 flex-col items-center gap-0.5 px-1 py-1.5 text-[10px]",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label === "AI Chat" ? "Chat" : item.label}
          </Link>
        );
      })}
      <MoreSheet />
    </nav>
  );
}

function Shell() {
  const { slug } = useParams();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sm.sb") === "1");
  const bump = useBumpStreak();

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("sm.sb", c ? "0" : "1");
      return !c;
    });
  };

  // Any app visit counts toward today's streak (deduped per day server-side).
  useEffect(() => {
    bump();
  }, [bump]);

  const View = VIEWS[(slug ?? "home") as keyof typeof VIEWS] ?? Home;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-14" : "md:pl-52")}>
        <TopBar />
        <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-24 md:pb-10">
          <View />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function AppShell() {
  return (
    <AppProviders>
      <Routes>
        <Route path=":slug" element={<Shell />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
    </AppProviders>
  );
}
