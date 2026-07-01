# Smart Multi-Tester AI — Build Plan

A production-ready web app for AI-powered IC / electronic component diagnosis, with real Supabase data only (no placeholders).

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud. Provision:

**Tables**
- `profiles` — id (FK auth.users), email, name, avatar_url, approved (bool), created_at
- `user_roles` — id, user_id, role enum('admin','user') — separate table (security)
- `diagnoses` — id, user_id, image_url, source ('upload'|'camera'), component_name, package_type, manufacturer, visible_damage jsonb, severity, possible_cause, confidence numeric, summary, recommendation text, status ('pending'|'healthy'|'defective'|'severe'|'unknown'), created_at
- `reports` — id, diagnosis_id, pdf_url, created_at
- `system_logs` — id, user_id, action, metadata jsonb, timestamp

**Storage buckets** (private): `component-images`, `camera-captures`, `reports`

**Security**
- RLS on all tables; `has_role()` security-definer function
- Users only see their own diagnoses/reports; admins see all
- Trigger on `auth.users` insert → create profile (approved=false)
- Trigger auto-grants 'admin' role + approved=true for `shernanjerk@gmail.com`
- Grants for authenticated/service_role per convention

**Admin seeding**
Admin account `shernanjerk@gmail.com` / `Lindie@29` created via a one-time migration using auth admin API-safe approach (or documented manual signup — the trigger will auto-promote by email).

## 2. AI Server Function

`analyzeComponent` server function (auth-protected) that:
- Receives storage path of uploaded image
- Signs URL, calls Lovable AI Gateway (`google/gemini-3-flash-preview` with vision) with structured output (Zod schema for all diagnosis fields)
- Handles 429/402 with clear errors
- Inserts row into `diagnoses`, logs to `system_logs`
- Returns diagnosis record

System prompt covers all damage categories listed (burn marks, bent pins, corrosion, cracks, etc.) and produces recommendations per rule set.

## 3. Frontend Routes (TanStack Start)

Public:
- `/auth` — login, register, forgot password, reset password page
- `/` — landing → redirect to dashboard if authed

Authenticated (`_authenticated/`):
- `/dashboard` — stats cards + Recharts weekly chart + recent diagnoses
- `/diagnosis` — choose upload or live camera
- `/diagnosis/camera` — WebRTC live capture (switch camera, zoom, flash where supported)
- `/diagnosis/upload` — drag-drop image
- `/diagnosis/$id` — result view (component info, damage, confidence gauge, recommendations, PDF download)
- `/history` — table with search, filter, pagination, CSV/PDF export
- `/reports` — generated PDFs
- `/profile` — edit name, avatar, password, email
- `/settings` — theme, notifications
- `/admin` (admin only) — user approvals, role changes, logs, all diagnoses

## 4. Approval Flow

- Register → profile row with `approved=false`
- Login gate: if `!approved && !admin` → show "Pending admin approval" screen (no app access)
- Admin panel shows pending users → approve / reject / delete / change role

## 5. Design System

Industrial lab-equipment aesthetic:
- Palette: deep navy `#0B1220`, instrument blue `#1E63D6`, signal cyan accent, warm white, precise grays
- Typography: `Space Grotesk` (display) + `Inter` (body) via `<link>` in `__root.tsx`
- Semantic oklch tokens in `src/styles.css`; measurement-style card variants, subtle grid backgrounds, LED-style status dots, gauge component for confidence
- Dark mode default, light mode toggle
- Sidebar navigation (shadcn sidebar) with collapsible icon rail

## 6. PDF Reports

Client-side generation with `jspdf` + `qrcode`:
- Header, image, diagnosis fields, recommendations table, technician, date, AI confidence, QR code linking to `/diagnosis/$id`
- Uploaded to `reports` bucket, row in `reports` table

## 7. Data Integrity

All views query Supabase directly. Empty states rendered when no data — no seeded demo diagnoses.

---

## Technical Notes

- Stack per template: **TanStack Start + React 19 + Tailwind v4 + shadcn**, TanStack Router (not React Router DOM), TanStack Query, TanStack server functions (not Supabase Edge Functions) for AI calls, using Lovable AI Gateway (OpenAI Vision not used — Gemini vision via gateway; no user API keys).
- Camera + PDF are client-only (WebRTC, jspdf).
- RBAC via `user_roles` + `has_role()` security definer; never store role on profile.
- Image analysis is server-side (server fn) so no key leaks.

---

Confirm and I'll build. Two quick confirmations:

1. **AI model** — I'll use Lovable AI Gateway with Gemini vision (no key required, billed through your workspace credits) rather than a user-supplied OpenAI key. OK?
2. **Admin seeding** — Simplest reliable path: I'll add a DB trigger that auto-promotes any signup with email `shernanjerk@gmail.com` to admin + approved. You then register once with that email/password on the auth page. Alternative: I create the user via the admin API in a one-shot server function you invoke. Which do you prefer?
