# Firebase environment variables missing (VITE_FIREBASE_*)

## Current issue
Frontend throws: Missing Firebase environment variable(s): VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID.

## Fix checklist
- [ ] Copy `.env.example` -> `.env`
- [ ] Set these required variables in `.env`:
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_AUTH_DOMAIN
  - VITE_FIREBASE_PROJECT_ID
- [ ] Restart `vite dev` (so `import.meta.env` is reloaded)

## Where it is used
- `src/integrations/firebase/client.ts` validates required env vars at import-time.

