import Link from "next/link";
import { ThermometerSun } from "lucide-react";

export const metadata = { title: "Mains gas — coming soon — FairBills" };

export default function MainsGasComingSoonPage() {
  return (
    <main className="min-h-dvh bg-surface-muted px-5 py-16">
      <div className="mx-auto w-full max-w-md rounded-[12px] bg-surface p-7 text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-[10px] bg-brand-50">
          <ThermometerSun className="size-6 text-brand-600" />
        </span>
        <h1 className="text-[22px] font-medium tracking-[-0.3px]">Mains gas is next.</h1>
        <p className="mt-2 text-sm text-text-secondary">
          We&rsquo;re building piped-gas comparison now. For today we cover electricity and
          bottled LPG — both with real savings.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/check"
            className="inline-flex h-11 items-center justify-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Check electricity or bottled gas
          </Link>
          <Link href="/" className="text-[13px] text-text-secondary hover:text-text-primary">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
