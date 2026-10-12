import Link from "next/link";
import { WHO_WE_ARE } from "@/lib/hirepulse";
import { FauxLink, SubmitLabel } from "./Button";

type Service = { id: string; title: string; text: string; tags: string[] };

export function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <Link href={`/service#${service.id}`} className="job-card hover-card" data-reveal="group">
      <div className="job-card__head">
        <h3 className="job-card__title">{service.title}</h3>
        <span className="h6 service-num">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <p className="t-s service-text">{service.text}</p>
      <div className="job-card__foot">
        <div className="badge-row">
          {service.tags.map((b) => (
            <span className="badge" key={b}>
              {b}
            </span>
          ))}
        </div>
        <FauxLink>Learn More</FauxLink>
      </div>
    </Link>
  );
}

/** Illustrative pathway card (hero / feature): the Hire, Train, Deploy model at a glance. */
export function PathwayCard() {
  return (
    <div className="progress-card">
      <p className="h6">Hire. Train. Deploy.</p>
      <div className="progress-item">
        <p className="t-s">Hire &amp; train</p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: "62%" }} />
        </div>
        <div className="progress-meta">
          <span>Fresher pathway</span>
          <span>Agreed role brief</span>
        </div>
      </div>
      <div className="progress-item">
        <p className="t-s">Deploy</p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

export function PurposeCard() {
  return (
    <div className="review-card">
      <div className="review-card__head">
        <strong>Our Purpose</strong>
        <Link href="/about-us" className="t-s">
          About us
        </Link>
      </div>
      <p className="t-s">{WHO_WE_ARE.purpose}</p>
      <Link href="/service" className="btn btn--primary btn--block btn--sm">
        <SubmitLabel>Explore services</SubmitLabel>
      </Link>
    </div>
  );
}

export function SourcingCard() {
  return (
    <div className="progress-card">
      <p className="h6">Multiple sourcing channels</p>
      <ul className="source-list">
        <li>College relationships</li>
        <li>Job portals</li>
        <li>Regional recruiter network</li>
      </ul>
      <p className="source-note">50+ active college tie-ups across India</p>
    </div>
  );
}
