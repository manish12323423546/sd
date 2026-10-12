import { NextResponse } from "next/server";

// Contact form endpoint. Validates input, drops obvious spam (honeypot + minimum fill time),
// and stores the message through an insert-only Supabase function. It never reports success
// unless the insert succeeded.

const LIMITS = { name: 120, phone: 40, subject: 200, message: 4000 } as const;
const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Bots fill the hidden field or submit instantly; answer quietly without storing anything.
  if (clean(body.website, 200) || Number(body.elapsed) < 2500) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, LIMITS.name);
  const phone = clean(body.phone, LIMITS.phone);
  const subject = clean(body.subject, LIMITS.subject);
  const message = clean(body.message, LIMITS.message);
  if (!name || !subject || message.length < 2) {
    return NextResponse.json({ error: "Please fill in your name, a subject and a message." }, { status: 400 });
  }
  if (phone && !/^[+()\d\s.-]{5,40}$/.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many messages. Please try again in a few minutes." }, { status: 429 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "The contact form is not available right now. Please try again later." }, { status: 503 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/verixa_submit_contact`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: name, p_phone: phone || null, p_subject: subject, p_message: message }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`insert failed: ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact form", err);
    return NextResponse.json({ error: "Your message could not be sent. Please try again later." }, { status: 502 });
  }
}
