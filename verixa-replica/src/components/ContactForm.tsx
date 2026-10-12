"use client";

import { useRef, useState } from "react";
import { SubmitLabel } from "./Button";

type State = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

export function ContactForm({ id = "contact" }: { id?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const startedAt = useRef(Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, elapsed: Date.now() - startedAt.current }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Your message could not be sent. Please try again later.");
      form.reset();
      // Mock endpoint (demo replica): be clear that nothing was actually delivered.
      setState({ kind: "sent", message: "Thanks for your message! This is a demo site, so it wasn't sent anywhere." });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Your message could not be sent." });
    }
  }

  return (
    <form className="cta-card-form" onSubmit={onSubmit} noValidate aria-describedby={`${id}-status`} id={id}>
      <div className="cta-fields">
        <label className="field">
          <span>Name</span>
          <input type="text" name="name" required maxLength={120} placeholder="Enter your name" autoComplete="name" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input type="tel" name="phone" maxLength={40} placeholder="Enter your phone number" autoComplete="tel" />
        </label>
        <label className="field">
          <span>Subject</span>
          <input type="text" name="subject" required maxLength={200} placeholder="Write your subject" />
        </label>
        <label className="field">
          <span>Your message</span>
          <textarea name="message" required maxLength={4000} placeholder="What comes to your mind?" />
        </label>
        <label className="hp" aria-hidden="true">
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <SubmitRow state={state} id={id} />
    </form>
  );
}

function SubmitRow({ state, id }: { state: State; id: string }) {
  return (
    <div className="cta-submit">
      <button type="submit" className="btn btn--primary" disabled={state.kind === "sending"}>
        <SubmitLabel>{state.kind === "sending" ? "Sending..." : "Send Message"}</SubmitLabel>
      </button>
      <p id={`${id}-status`} className="form-status" role="status" aria-live="polite" data-state={state.kind}>
        {state.message ?? ""}
      </p>
    </div>
  );
}
