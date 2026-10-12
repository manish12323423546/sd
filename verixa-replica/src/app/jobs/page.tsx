import type { Metadata } from "next";
import { ContactCta } from "@/components/ContactCta";
import { JobsBrowser } from "@/components/JobsBrowser";
import { Split } from "@/components/Split";
import { jobs } from "@/lib/content";

export const metadata: Metadata = { title: { absolute: "Jobs – Verixa" } };

export default function JobsPage() {
  return (
    <>
      <section className="jobs-page">
        <div className="container">
          <div className="intro">
            <Split as="h1" className="h1" text="Find Your Perfect Job" mode="load" />
            <p className="t-r load-fade" style={{ "--d": "160ms" } as React.CSSProperties}>
              Browse verified opportunities tailored to your skills, interests, and career goals—all in one smart platform.
            </p>
          </div>
          <JobsBrowser jobs={jobs} />
        </div>
      </section>
      <ContactCta />
    </>
  );
}
