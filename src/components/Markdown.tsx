import { useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/** Only allow web and email links; anything else (javascript:, data:, etc.) is dropped. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? url : null;
  } catch {
    return null;
  }
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Collect unique http(s) links in the order they appear. */
function extractLinks(md: string): string[] {
  const found = md.match(/https?:\/\/[^\s<>()\[\]"'`]+/g) ?? [];
  const clean = found.map((u) => u.replace(/[.,;:!?*_]+$/, ""));
  return [...new Set(clean)].filter((u) => safeUrl(u)).slice(0, 6);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function LinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{domainOf(url)}</p>
        <p className="truncate text-[11px] text-muted-foreground">{url}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-secondary px-3 text-xs font-medium"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Open
      </a>
      <button
        type="button"
        onClick={async () => {
          if (await copyText(url)) {
            setCopied(true);
            toast.success("Link copied");
            setTimeout(() => setCopied(false), 1500);
          } else toast.error("Couldn't copy the link. Press and hold it to copy instead.");
        }}
        aria-label="Copy link"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function Markdown({ children, linkCards = false }: { children: string; linkCards?: boolean }) {
  const links = linkCards ? extractLinks(children) : [];
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (safeUrl(url) ? defaultUrlTransform(url) : "")}
        components={{
          a: ({ href, children: label }) => {
            const url = href && safeUrl(href);
            if (!url) return <span>{label}</span>;
            return (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
      {links.length > 0 && (
        <div className="!mt-4 space-y-2" aria-label="Links in this answer">
          {links.map((u) => (
            <LinkCard key={u} url={u} />
          ))}
        </div>
      )}
    </div>
  );
}
