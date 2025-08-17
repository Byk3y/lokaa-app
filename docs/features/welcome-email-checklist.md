## Welcome Email – Implementation Checklist (Phased)

Goal: Send a polished “Welcome to Lokaa” email after a user’s first verified session, with clear CTAs to explore or create a space. Keep deliverability high and avoid link tracking issues.

### Phase 0 — Scoping and Pre‑checks
- [x] Confirm “Confirm email” flow is working end‑to‑end (validated and shipped)
- [x] Verify Resend domain, DKIM/SPF/DMARC (done for `lokaa.app`)
- [ ] Choose From/Reply‑To:
  - [x] From: `Lokaa <noreply@lokaa.app>`
  - [ ] Reply‑To: `support@lokaa.app`
- [ ] Disable link tracking (avoid URL rewrites)

### Phase 1 — Template and Design System
- [ ] Create reusable email layout (header/body/footer)
  - [ ] Header: centered Lokaa logo (200×40, alt text)
  - [ ] Body: title, greeting, 3 value bullets, primary CTA, secondary links
  - [ ] Footer: “Manage preferences”, physical address, support link
- [ ] Implement dark/light friendly styles (high contrast, accessible)
- [x] Build HTML + text versions
- [ ] Host or inline logo (HTTPS) and confirm fast load

### Phase 2 — Welcome Email Template
- [x] Content
  - [x] Subject: “Welcome to Lokaa!”
  - [ ] Preheader: “You’re ready to explore spaces, learn, and connect.”
  - [x] Greeting: “Hi {FirstName}, …” (fallback to generic)
  - [x] Value bullets (3) — updated copy shipped
  - [ ] CTA variants:
    - [x] Explore/Join: `https://lokaa.app/discover`
    - [ ] Create: `https://lokaa.app/create-space`
    - [ ] Go to your space: `https://lokaa.app/{subdomain}/space`
  - [x] Secondary links: Help Center added (Invite friends optional, Contact support pending)
  - [ ] Footer: preferences (`https://lokaa.app/settings/notifications`), physical address, support
- [x] Text‑only fallback (links included)

### Phase 3 — Edge Function Integration
- [x] Reuse `supabase/functions/send-welcome-email` to support `type: 'welcome'`
- [x] Inputs: `to`, `firstName` (cta optional)
- [x] Resend send call with From only (sending‑only for now)
- [x] Handle idempotency in DB (`email_sends` + sent_at update)

### Phase 4 — Trigger Logic & Idempotency
- [x] Create persistence table: `email_sends(user_id uuid, type text, sent_at timestamptz, primary key(user_id, type))`
- [x] Trigger condition: first verified session (Auth `SIGNED_IN` after email verify)
  - [x] Detect in app and call Edge Function once (client guard + server idempotency)
- [ ] Backoff/retry strategy (exponential or simple cron retry for failures)

### Phase 5 — Preferences & Compliance
- [ ] Ensure `notification_preferences` includes global email toggle
- [ ] Link “Manage preferences” in footer
- [ ] Unsubscribe handling (global toggle is acceptable for welcome; category‑based later)
- [ ] Physical address in footer (compliance)

### Phase 6 — QA Matrix
- [ ] Clients: Gmail (iOS/Android/Web), Apple Mail (iOS/Mac), Outlook (Win/Mac/Web)
- [ ] Dark mode checks
- [ ] Button tap targets (≥44px), contrast, fonts
- [ ] Verify links and CTAs open correct in‑app destinations
- [ ] Validate text version renders cleanly

Notes: Gmail (iOS/Web) smoke‑tested; trimming behavior observed when sending multiple similar emails rapidly in the same thread (expected). Plain‑text fallback added to avoid blank previews.

### Phase 7 — Observability
- [ ] Resend dashboard: deliverability/bounce metrics
- [ ] Log structured event on send (user_id, type, sent_at)
- [ ] Alert on error rate spike

### Phase 8 — Future Enhancements (Backlog)
- [ ] Personalize CTA based on inferred intent (creator vs member)
- [ ] Add recommended spaces block
- [ ] A/B test subject lines and hero message (ensure deterministic rollouts)
- [ ] Localize content (en → others)
- [ ] Weekly digest implementation (posts, mentions, DMs summary)

### Acceptance Criteria
- [x] New verified users receive a welcome email once
- [ ] Email renders correctly across major clients (dark/light)
- [x] CTA works and links to the intended destination
- [x] No tracking link rewrites; deliverability is stable
- [x] Idempotency verified (no duplicate sends)


