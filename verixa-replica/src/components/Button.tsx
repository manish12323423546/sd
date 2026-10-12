import Link from "next/link";
import { ICON } from "@/lib/site";

function Roll({ children }: { children: string }) {
  return (
    <span className="roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

export function Arrow({ tone = "white" }: { tone?: "white" | "ink" }) {
  const src = tone === "white" ? ICON.arrowWhite : ICON.arrowInk;
  return (
    <span className="arrow" aria-hidden="true">
      <img src={src} alt="" width={24} height={24} />
      <img src={src} alt="" width={24} height={24} />
    </span>
  );
}

type ButtonProps = {
  href: string;
  children: string;
  variant?: "primary" | "secondary";
  className?: string;
  reveal?: boolean;
};

export function Button({ href, children, variant = "primary", className = "", reveal }: ButtonProps) {
  return (
    <Link href={href} className={`btn btn--${variant} ${className}`} data-reveal={reveal ? "fade" : undefined}>
      <Roll>{children}</Roll>
      <Arrow tone={variant === "primary" ? "white" : "ink"} />
    </Link>
  );
}

/** Primary button without the arrow (style guide variant). */
export function PlainButton({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="btn btn--primary">
      <Roll>{children}</Roll>
    </Link>
  );
}

export function SubmitLabel({ children }: { children: string }) {
  return (
    <>
      <Roll>{children}</Roll>
      <Arrow tone="white" />
    </>
  );
}

export function TextLink({ href, children, className = "" }: { href: string; children: string; className?: string }) {
  return (
    <Link href={href} className={`tlink ${className}`}>
      <Roll>{children}</Roll>
      <Arrow tone="ink" />
    </Link>
  );
}

/** Non-link version used inside a card that is itself the link. */
export function FauxLink({ children }: { children: string }) {
  return (
    <span className="tlink">
      <Roll>{children}</Roll>
      <Arrow tone="ink" />
    </span>
  );
}
