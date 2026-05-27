import Link from "next/link";

const MESSAGES: Record<string, { title: string; body: string }> = {
  ok: {
    title: "You're unsubscribed.",
    body: "We won't email you again. No hard feelings — your bill's always welcome back.",
  },
  invalid: {
    title: "That link didn't check out.",
    body: "The unsubscribe link looks invalid or expired. Reply to the email and we'll sort it.",
  },
  error: {
    title: "Something went wrong.",
    body: "We couldn't process that just now. Try the link again in a minute.",
  },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const msg = MESSAGES[status ?? ""] ?? MESSAGES.invalid;

  return (
    <main className="min-h-full bg-surface-muted px-5 py-16">
      <div className="mx-auto w-full max-w-[480px] rounded-[12px] bg-surface p-7 text-center">
        <h1 className="text-[22px] font-medium tracking-[-0.3px]">{msg.title}</h1>
        <p className="mt-2 text-sm text-text-secondary">{msg.body}</p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center rounded-[8px] bg-brand-500 px-5 text-sm font-medium text-white"
        >
          Back to FairBills
        </Link>
      </div>
    </main>
  );
}
