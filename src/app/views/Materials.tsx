import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { useBumpStreak } from "../lib/providers";

export default function Materials() {
  const materials = useQuery(api.library.listMaterials) ?? [];
  const add = useMutation(api.library.addMaterial);
  const remove = useMutation(api.library.deleteMaterial);
  const bump = useBumpStreak();
  const [tab, setTab] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveText = async () => {
    if (!title.trim() || !text.trim()) {
      toast.error("Give it a title and some text");
      return;
    }
    setBusy(true);
    try {
      await add({ title: title.trim(), kind: "text", text });
      setTitle("");
      setText("");
      bump();
      toast.success("Material saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const extractText = async (file: File): Promise<string> => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv")) {
      return await file.text();
    }
    if (lower.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const chunks: string[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        chunks.push(
          content.items
            .map((it: any) => ("str" in it ? it.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        );
        if (chunks.join(" ").length > 200_000) break;
      }
      return chunks.join("\n\n").trim();
    }
    throw new Error("Unsupported file — use .txt, .md, .csv or .pdf, or paste the text.");
  };

  const saveFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await extractText(file);
      if (!text.trim()) {
        toast.error("Couldn't extract text — try pasting it instead.");
        return;
      }
      await add({
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || file.name,
        kind: "file",
        fileName: file.name,
        text,
      });
      bump();
      toast.success("File added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Materials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste text or upload files. Text is extracted so the assistant can quote your own notes.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex rounded-md border text-sm" role="tablist">
            {(["text", "file"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 capitalize first:rounded-l-md last:rounded-r-md ${
                  tab === t ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {t === "text" ? "Paste text" : "Upload file"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab === "text" ? (
            <div className="space-y-3">
              <Input placeholder="Title (e.g. DBMS Unit 3 notes)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                placeholder="Paste your notes, chapter, or question bank here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
              />
              <Button onClick={saveText} disabled={busy || !title.trim() || !text.trim()}>
                Save material
              </Button>
            </div>
      ) : (
            <div className="space-y-3">
              <div
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center hover:bg-accent"
                onClick={() => fileRef.current?.click()}
              >
                {busy ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <FileText className="size-5 text-muted-foreground" />}
                <p className="text-sm">{busy ? "Extracting text…" : "Click to upload (.txt, .md, .csv, .pdf)"}</p>
                <p className="text-xs text-muted-foreground">PDF text is extracted in your browser via pdf.js</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && saveFile(e.target.files[0])}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {materials.map((m) => (
          <Card key={m._id}>
            <CardContent className="flex items-start gap-3 py-4">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <span className="tnum shrink-0 text-xs text-muted-foreground">
                    {(m.text?.length ?? 0).toLocaleString()} chars
                  </span>
                </div>
                {m.fileName && <p className="truncate text-xs text-muted-foreground">{m.fileName}</p>}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">{m.text?.slice(0, 160) || "No text"}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove({ id: m._id }).catch(() => toast.error("Failed to delete"))}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {materials.length === 0 && (
          <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No materials yet.
          </p>
        )}
      </div>
    </div>
  );
}
