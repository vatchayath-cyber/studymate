import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { useThemePref } from "../lib/providers";

export default function Profile() {
  const { user, signOut } = useAuth();
  const profile = useQuery(api.profile.getMy);
  const update = useMutation(api.profile.update);
  const wipeData = useMutation(api.profile.deleteMyData);
  const navigate = useNavigate();
  const { pref, setPref } = useThemePref();

  const [name, setName] = useState<string | null>(null);
  const [college, setCollege] = useState<string | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [sem, setSem] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const v = <T,>(current: string | null, fallback: T | undefined): string =>
    current ?? (fallback as string | undefined) ?? "";

  if (profile === undefined || profile === null) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  const isStudent = profile.mode !== "office";
  const mode = profile.mode ?? "student";

  const save = async () => {
    try {
      await update({
        name: v(name, profile.name).trim() || undefined,
        mode,
        college: v(college, profile.college).trim() || undefined,
        course: v(course, profile.course).trim() || undefined,
        dept: v(dept, profile.dept).trim() || undefined,
        sem: v(sem, profile.sem).trim() || undefined,
        jobTitle: v(jobTitle, profile.jobTitle).trim() || undefined,
        monthlyBudget: Number(v(budget, profile.monthlyBudget?.toString())) > 0 ? Number(v(budget, profile.monthlyBudget?.toString())) : 0,
      });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const switchMode = (m: "student" | "office") => {
    update({ mode: m }).then(() => toast.success(`Switched to ${m} mode`)).catch(() => toast.error("Failed"));
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await wipeData({});
      toast.success("All app data deleted");
      setConfirmDelete(false);
    } catch {
      toast.error("Failed to delete data");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Profile & settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email ?? "Signed in"}</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex rounded-md border text-sm">
            {(["student", "office"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  "px-4 py-1.5 capitalize first:rounded-l-md last:rounded-r-md",
                  mode === m ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {isStudent
              ? "Student mode: syllabus tracking, materials, exam priorities."
              : "Office mode: work assistant with expense tracking and planning."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={v(name, profile.name)} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            {isStudent ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">College</label>
                  <Input value={v(college, profile.college)} onChange={(e) => setCollege(e.target.value)} placeholder="College name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Course</label>
                  <Input value={v(course, profile.course)} onChange={(e) => setCourse(e.target.value)} placeholder="B.Tech CSE…" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Semester</label>
                  <Input value={v(sem, profile.sem)} onChange={(e) => setSem(e.target.value)} placeholder="e.g. 5" />
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs text-muted-foreground">Job title</label>
                <Input value={v(jobTitle, profile.jobTitle)} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Analyst" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Monthly budget</label>
              <Input
                type="number"
                min="0"
                value={v(budget, profile.monthlyBudget ? String(profile.monthlyBudget) : "")}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 8000"
              />
            </div>
          </div>
          <Button onClick={save}>Save profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex rounded-md border text-sm">
            {(["light", "dark", "auto"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPref(p)}
                className={cn(
                  "flex-1 px-4 py-1.5 capitalize first:rounded-l-md last:rounded-r-md",
                  pref === p ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
          <Button variant="outline" className="text-destructive" onClick={handleDelete}>
            {confirmDelete ? "Tap again to confirm" : "Delete all app data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
