# ReconEPR MVP

Option 2 client intake portal on a Supabase backend. Two front ends can sit on the same backend: this Next.js app (the Cursor path) or a WeWeb project (the no-code path). The security that keeps one company from seeing another's data lives in the database, in `supabase/schema.sql`, so it protects both.

MVP scope: magic-link login, company onboarding, KYC document upload, a read-only status tracker, a downloads area for agent-prepared certificates, and a public liability estimator that shows both kg and an indicative rupee cost. Out of scope for now: the credit ledger, in-app payments, the Owner/Admin/Manager split, and the two-prior-FY averaging. Do those by hand and add them later.

---

## Step 1, shared Supabase backend (do this first, both paths need it)

1. Create a Supabase project. Pick the Mumbai region (ap-south-1) so data rests in India.
2. Open the SQL editor and run `supabase/schema.sql` in full. This creates the tables, the row-level-security policies, the private `documents` storage bucket, the signup trigger, and the `create_company_and_link` onboarding function.
3. In Authentication, Providers, enable Email and turn on the magic link (OTP) option.
4. In Authentication, URL configuration, set the Site URL and add redirect URLs:
   - For the Next.js app: `http://localhost:3000/auth/callback` and your deployed `https://yourdomain/auth/callback`.
   - For WeWeb: the URLs WeWeb gives you for its auth redirect.
5. Keep the service role key server-side only. It bypasses RLS and must never go into the browser, a `NEXT_PUBLIC_` variable, or WeWeb. Your agents use it (via the Supabase dashboard or a small internal tool) to set `compliance_status` and to upload deliverables, since clients cannot do either.

A note on what the policies guarantee: every client uses the public anon key, and every query it makes is filtered by RLS to the caller's own company. A missed filter in the UI cannot leak another company's rows, because the database refuses them. That is the reason to put PAN here rather than in a UI-filtered tool.

---

## Step 2a, Cursor path (this Next.js app)

Requirements: Node 18.17 or newer.

```
cp .env.local.example .env.local     # then fill in your Supabase URL and anon key
npm install
npm run dev
```

Open http://localhost:3000. Sign in with your email, complete onboarding, and you land on the dashboard. Upload a document, then in the Supabase dashboard flip your company's `compliance_status` and refresh to see the badge change.

What is already built: `/` landing, `/estimator`, `/login` magic link, `/auth/callback`, onboarding calling the RPC, dashboard, document upload to the private bucket, and downloads with short-lived signed URLs. RLS is applied everywhere because both the browser and server clients use the anon key.

To extend it in Cursor, paste this prompt:

> This is a Next.js 14 App Router app on Supabase using @supabase/ssr, with row-level security defined in supabase/schema.sql. Keep every data access under RLS using the anon key, never the service role. Follow the existing patterns in lib/supabase and app/(app). Add: (1) a Privacy page at app/(app)/privacy that lists the company's consents from the consents table and lets the user withdraw a purpose by setting withdrawn and withdrawn_at, and shows a data-request form that inserts into a new data_requests table; (2) a simple monthly-weight entry page that writes to a new monthly_data table and shows the running annual total. Add the SQL for the new tables with matching RLS policies (company_id = auth_company_id()) to a new migration file, mirroring the existing policy style. Do not weaken any existing policy.

---

## Step 2b, WeWeb path (no-code, same backend)

WeWeb menu labels change between versions, so treat these as the steps and confirm the exact control in the current WeWeb docs.

1. New WeWeb project. Add the Supabase plugin and paste your project URL and anon key.
2. Enable Supabase Auth in the plugin and configure the magic-link (email OTP) sign-in. WeWeb stores the returned session and sends the user's JWT with every request, which is what makes RLS apply automatically. You do not add a manual company filter, the database does it.
3. Collections: add collections bound to `companies`, `documents`, and `target_rates`. They return only the caller's rows for companies and documents, and all rows for target_rates.
4. Onboarding page: a form that calls the Postgres function `create_company_and_link` through the Supabase plugin's call-function action, passing the form fields. It creates the company, links the user as owner, records consent, and blocks a duplicate GST.
5. Gate: after login, if the user's company row is empty, route them to onboarding, else to the dashboard.
6. Document upload: use the Supabase Storage upload action into the `documents` bucket with the object path `{company_id}/{doc_type}-{timestamp}.{ext}`, then insert a row into `documents` with `is_deliverable` false. The storage policies only allow writing into the user's own company folder.
7. Downloads page: list `documents` where `is_deliverable` is true and create a signed URL for each with the storage action.
8. Status tracker: bind a badge to `companies.compliance_status` with the four states.
9. Estimator (public page, no auth): bind to the `target_rates` collection, take a weight input and a category and year selector, and compute obligation kg and an indicative rupee range with a WeWeb formula. Label it indicative.

WeWeb gives you the same isolation and India residency as the Cursor path with less code. The trade-off is less control over custom flows later, which is why the credit ledger and payments are easier to add on the Cursor path when you get there.

---

## Security checklist (applies to both)

- Service role key stays server-side only. Never in the browser, a NEXT_PUBLIC_ variable, or WeWeb.
- Turn on MFA for your own Supabase and hosting logins.
- The `documents` bucket is private. Files are reached only through short-lived signed URLs.
- RLS is enabled on every table. If you add a table, add its policies in the same style before you expose it.
- Agents change `compliance_status` and upload deliverables with the service role, so clients cannot fake a status or a certificate.
- Collect PAN only after a client is serious, if you want to minimise sensitive data early. The schema supports it either way.
- Publish a real privacy notice and set NEXT_PUBLIC_PRIVACY_NOTICE_VERSION (or the WeWeb equivalent) to its version, which is what the consent record stores.
