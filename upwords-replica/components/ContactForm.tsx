"use client";
import { useState } from "react";
import { brand, contactPage } from "@/lib/content";

/**
 * Not connected to any service yet: submitting stores and sends nothing,
 * and the page says so plainly instead of showing a success message.
 */
export function ContactForm() {
  const [tried, setTried] = useState(false);
  return (
    <div className="form-card">
      <h2 className="h-sm">
        {contactPage.formTitle}
        <span className="demo-tag">Form not connected yet</span>
      </h2>
      <form noValidate onSubmit={(e) => { e.preventDefault(); setTried(true); }}>
        <div className="form-grid">
          <div className="field"><label htmlFor="f-name">Name</label><input id="f-name" name="name" autoComplete="name" /></div>
          <div className="field"><label htmlFor="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autoComplete="tel" /></div>
          <div className="field field--full">
            <label htmlFor="f-who">I am a</label>
            <select id="f-who" name="who" defaultValue="">
              <option value="" disabled>Select one</option>
              <option>Pharma firm</option>
              <option>Doctor / Clinic owner</option>
              <option>Early-stage founder</option>
              <option>Other</option>
            </select>
          </div>
          <div className="field field--full"><label htmlFor="f-msg">What would you like to solve?</label><textarea id="f-msg" name="message" /></div>
        </div>
        <button type="submit" className="btn btn--green btn--block" style={{ marginTop: 24 }}>
          <span className="roll"><span>{contactPage.submit}</span><span aria-hidden="true">{contactPage.submit}</span></span>
        </button>
        <p className="form-note" role="status" aria-live="polite">
          {tried ? (
            <>Nothing was sent: this form is not connected to an inbox yet. Please <a href={brand.whatsapp} style={{ textDecoration: "underline" }}>message on WhatsApp</a> or email {brand.email}.</>
          ) : (
            <>This form is not connected yet, so it sends and stores nothing. For a reply within 24 hours, <a href={brand.whatsapp} style={{ textDecoration: "underline" }}>WhatsApp {brand.phone}</a>.</>
          )}
        </p>
      </form>
    </div>
  );
}
