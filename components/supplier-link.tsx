import { ExternalLink } from "lucide-react";

/**
 * Renders a supplier/retailer name as a link to their published contact page
 * when we have a URL on file, otherwise falls back to plain text. Used in the
 * results lists so the user can quickly check a supplier they don't recognise.
 */
export function SupplierLink({
  name,
  url,
  className = "",
}: {
  name: string;
  url: string | null | undefined;
  className?: string;
}) {
  if (!url) return <span className={className}>{name}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} inline-flex items-center gap-0.5 hover:underline`}
    >
      {name}
      <ExternalLink
        className="size-3 shrink-0 text-text-tertiary"
        aria-hidden="true"
      />
    </a>
  );
}
