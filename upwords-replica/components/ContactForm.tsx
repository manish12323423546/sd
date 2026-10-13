"use client";
import { useState } from "react";
import { brand, contactPage } from "@/lib/content";

/**
 * Demo form. It is not connected to any service: submitting stores and sends nothing,
 * and the page says so plainly instead of showing a success message.
 */
export function ContactForm() {
  const [tried, setTried] = useState(false);
  return (
    <div className="form-card">
      <h2 className="h-sm">
        {contactPage.formTitle}
        <span className="demo-tag">Demo form, not connected</span>
      </h2>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
        }}
      >
        <div className="form-grid">
          <div className="field"><label htmlFor="f-name">Your name</label><input id="f-name" name="name" autoComplete="name" /></div>
          <div className="field"><label htmlFor="f-email">Email address</label><input id="f-email" name="email" type="email" autoComplete="email" /></div>
          <div className="field"><label htmlFor="f-phone">Phone (optional)</label><input id="f-phone" name="phone" type="tel" autoComplete="tel" /></div>
          <div className="field"><label htmlFor="f-topic">What is it about?</label><input id="f-topic" name="topic" /></div>
          <div className="field field--full"><label htmlFor="f-msg">Message</label><textarea id="f-msg" name="message" /></div>
        </div>
        <button type="submit" className="btn btn--green btn--block" style={{ marginTop: 24 }}>
          <span className="roll"><span>{contactPage.submit}</span><span aria-hidden="true">{contactPage.submit}</span></span>
        </button>
        <p className="form-note" role="status" aria-live="polite">
          {tried
            ? `Nothing was sent. This demo form is not connected to any inbox or database. To get in touch, email ${brand.email}.`
            : "This is a demo form. It is not connected yet, so submitting it sends and stores nothing."}
        </p>
      </form>
    </div>
  );
}
