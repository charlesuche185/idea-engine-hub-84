<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Ask AI uses Google Gemini via the user's GEMINI_API_KEY in src/lib/ai.server.ts (server route), falling back to Lovable AI when unset — free-tier Gemini avoids workspace AI credit limits.
- Ask AI answers render through src/components/Markdown.tsx, which whitelists http/https/mailto links and shows link cards (domain + Open/Copy, no fetched previews) — avoids unsafe schemes and fabricated previews.
