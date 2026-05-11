# Restore Point - April 28, 2026

## Current Working State
- **Architecture**: Full-stack (Express + Vite).
- **AI Logic**: Server-side proxy via `/api/screening/advanced`.
- **Model**: `gemini-3-flash-preview` (Standard) via `@google/genai` (SDK v1.x).
- **Rate Limiting**: Implemented exponential backoff retry logic (3 retries).
- **Keep-Alive**: Automated background background database activity pings every 12 hours to prevent Supabase project pausing.
- **Key Configuration**: Supports `MY_GEMINI_API_KEY` (User-provided) with fixed fallback to `GEMINI_API_KEY`.
- **API Security**: Keys are stored on the server and never leaked to the client (Vite `define` removed for security).

## Critical Implementation Details
1. **Server Proxy**: `server.ts` handles the POST request to `/api/screening/advanced`, importing and running `performAdvancedScreening`.
2. **Client Integration**: `services/cloudDb.ts` uses `fetch()` to call the server API rather than calling Gemini directly.
3. **Error Handling**: `services/geminiService.ts` specifically catches `RESOURCE_EXHAUSTED` (429) errors to provide billing/quota guidance.

## To Restore Manually:
If files are accidentally deleted or corrupted, refer to the files in `/backups/stable_2026_04_28/`.
