import {
  Bell,
  BookOpen,
  CalendarDays,
  Home,
  LayoutList,
  ListChecks,
  MessageSquareText,
  PieChart,
  Sparkles,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";

export type NavItem = {
  slug: string;
  label: string;
  icon: typeof Home;
  group: "Study" | "Life" | "Account";
};

export const NAV_ITEMS: NavItem[] = [
  { slug: "home", label: "Home", icon: Home, group: "Study" },
  { slug: "chat", label: "AI Chat", icon: MessageSquareText, group: "Study" },
  { slug: "materials", label: "Materials", icon: BookOpen, group: "Study" },
  { slug: "syllabus", label: "Syllabus", icon: LayoutList, group: "Study" },
  { slug: "priority", label: "Priority", icon: Target, group: "Study" },
  { slug: "planner", label: "Planner", icon: Sparkles, group: "Study" },
  { slug: "calendar", label: "Calendar", icon: CalendarDays, group: "Life" },
  { slug: "expenses", label: "Expenses", icon: Wallet, group: "Life" },
  { slug: "analytics", label: "Analytics", icon: PieChart, group: "Life" },
  { slug: "tasks", label: "Tasks", icon: ListChecks, group: "Life" },
  { slug: "alerts", label: "Alerts", icon: Bell, group: "Account" },
  { slug: "profile", label: "Profile", icon: UserRound, group: "Account" },
];

/** The 5 primary mobile bottom-bar items. */
export const MOBILE_PRIMARY = ["home", "chat", "syllabus", "calendar", "expenses"];
