# Contact form

The "Ready to Get Started" form posts to `src/app/api/contact/route.ts`, which validates the input,
drops obvious spam (hidden honeypot field, submissions faster than 2.5 s, 5 per IP per 10 minutes)
and stores the message through an insert-only Postgres function. It reports success only when the
insert succeeded.

Until both environment variables below are set, the form says it is not connected and sends nothing.

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project API URL, e.g. `https://<ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | The project's publishable (anon) key. It can only call the function below. |

The pages are static, so redeploy after setting them.

## Database setup

Run `docs/contact-form.sql` once in the Supabase SQL editor. It creates `verixa_contact_messages`
with RLS on and no policies (nobody can read it through the API), and a `SECURITY DEFINER`
function `verixa_submit_contact` that anon may execute: it trims and length-checks the input,
rate-limits site-wide (60 per hour) and inserts one row. Read messages from the dashboard or with
the service role.
