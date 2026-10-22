# Running Solve X on Replit

## Start the app

Use the **Start application** workflow
(`bun run dev --host 0.0.0.0 --port 5000 --strictPort`) to run the existing
TanStack Start app in the Replit preview.

Useful commands:

- `bun run build` — production build
- `bun run lint` — lint the project

## Environment

The app uses Supabase for authentication and data. The browser uses
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; server routes use
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Configure these in Replit's
environment settings if they are not already available. Only the Supabase
publishable key belongs in browser configuration.

Ask AI also needs a server-side provider key: `GEMINI_API_KEY` or
`LOVABLE_API_KEY`. Add it through Replit Secrets if you want to test AI chat.
Do not put AI or service-role credentials in browser variables, source code, or
logs.
