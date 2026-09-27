export const CATEGORIES = [
  "Education",
  "Technology",
  "Agriculture",
  "Cars & Transport",
  "Community",
  "Environment",
  "Healthcare",
  "Business",
  "Engineering",
  "Other",
] as const;

export function extractTitle(md: string): string | null {
  const m = md.match(/##\s*Project Title\s*\n+([^\n]+)/i);
  return m ? m[1]!.replace(/[*_#"]/g, "").trim() : null;
}

export function extractSection(md: string, heading: string): string | null {
  const re = new RegExp(`##\\s*${heading.replace(/[/]/g, "\\/")}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const m = md.match(re);
  return m ? m[1]!.trim() : null;
}
