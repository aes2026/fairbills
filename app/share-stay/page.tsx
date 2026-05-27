import Link from "next/link";
import { CheckCircle2, Zap } from "lucide-react";

export const metadata = {
  title: "FairBills told me to stay put",
  description: "No commissions. No kickbacks. Just honest advice on your energy bills.",
};

export default function ShareStayPage() {
  return (
    <main className="min-h-dvh bg-surface-muted px-5 py-16">
      <div className="mx-auto w-full max-w-md rounded-[12px] bg-surface p-7 text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[10px] bg-brand-100">
          <CheckCircle2 className="size-6 text-brand-600" />
        </span>
        <h1 className="text-[22px] font-medium tracking-[-0.3px]">
          A comparison tool that says &ldquo;stay put&rdquo;.
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          FairBills doesn&rsquo;t take commission from retailers — so when your current plan is
          already the right one, it says so. Check your own power or gas bill free.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/upload"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Zap className="size-4" />
            Check my bill
          </Link>
          <Link href="/" className="text-[13px] text-text-secondary hover:text-text-primary">
            What is FairBills?
          </Link>
        </div>
      </div>
    </main>
  );
}
