"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CloudUpload,
  Loader2,
  Lock,
  Pencil,
  TriangleAlert,
  UserX,
  Zap,
} from "lucide-react";

import { ESTIMATE_KEY, PARSED_BILL_KEY } from "@/lib/bill";

const STAGES = [
  "Reading your bill…",
  "Pulling your plan and rates…",
  "Tidying up the numbers…",
];

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (status !== "parsing") return;
    setStage(0);
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);
    return () => clearInterval(id);
  }, [status]);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      setStatus("error");
      setError("That's not a bill we can read. Try a PDF or a photo (JPG, PNG).");
      return;
    }
    setStatus("parsing");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-bill", { method: "POST", body });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem(PARSED_BILL_KEY, JSON.stringify(data.bill));
        sessionStorage.removeItem(ESTIMATE_KEY); // a real upload, not an estimate
        router.push("/confirm");
        return;
      }
      setStatus("error");
      setError(data.error ?? "Something went wrong reading that bill.");
    } catch {
      setStatus("error");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <main className="min-h-full bg-surface-muted px-5 py-10">
      <div className="mx-auto w-full max-w-[560px] rounded-[12px] bg-surface p-7">
        {/* App chrome */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-brand-500">
              <Zap className="size-4 text-white" />
            </span>
            <span className="text-[15px] font-medium">FairBills</span>
          </Link>
          <span className="text-xs text-text-tertiary">Step 1 of 3</span>
        </div>

        <h2 className="text-2xl font-medium tracking-[-0.3px]">
          Drop in your power bill.
        </h2>
        <p className="mt-2 mb-6 text-sm text-text-secondary">
          PDF, photo, screenshot — we&rsquo;ll figure it out. Takes about 8 seconds.
        </p>

        {status === "parsing" ? (
          <div className="flex flex-col items-center rounded-[12px] border border-brand-500/40 bg-brand-50 px-6 py-12 text-center">
            <Loader2 className="size-7 animate-spin text-brand-600" />
            <div className="mt-4 text-[15px] font-medium text-text-primary">
              {STAGES[stage]}
            </div>
            <div className="mt-1 text-[13px] text-brand-600">Hang tight.</div>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center rounded-[12px] border-[1.5px] border-dashed px-6 py-9 text-center transition-colors ${
                dragOver
                  ? "border-brand-600 bg-brand-100"
                  : "border-brand-500 bg-brand-50"
              }`}
            >
              <span className="mb-3.5 flex size-12 items-center justify-center rounded-full bg-surface">
                <CloudUpload className="size-6 text-brand-600" />
              </span>
              <div className="text-[15px] font-medium text-text-primary">
                Drag your bill here
              </div>
              <div className="mt-1 mb-3.5 text-[13px] text-brand-600">or</div>
              <span className="inline-flex h-9 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white">
                Choose a file
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-[8px] bg-danger-50 px-4 py-3 text-[13px] text-danger-800">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Divider */}
            <div className="my-[18px] flex items-center gap-3">
              <div className="h-px flex-1 bg-black/15" />
              <span className="text-xs text-text-tertiary">no bill handy?</span>
              <div className="h-px flex-1 bg-black/15" />
            </div>

            <Link
              href="/quick-check"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border-[0.5px] border-black/30 bg-surface text-sm font-medium text-text-primary hover:bg-surface-muted"
            >
              <Pencil className="size-4" />
              Enter details manually instead
            </Link>
          </>
        )}

        {/* Privacy strip */}
        <div className="mt-[22px] flex flex-wrap justify-center gap-x-[18px] gap-y-2 text-xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5" /> Bills processed and discarded
          </span>
          <span className="flex items-center gap-1.5">
            <UserX className="size-3.5" /> No account needed
          </span>
        </div>
      </div>
    </main>
  );
}
