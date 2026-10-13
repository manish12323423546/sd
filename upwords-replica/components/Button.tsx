import Link from "next/link";

type Props = {
  href: string;
  children: string;
  variant?: "green" | "lime";
  size?: "md" | "sm";
  block?: boolean;
  className?: string;
};

/** Pill button whose label rolls up on hover, like the reference template. */
export function Button({ href, children, variant = "green", size = "md", block, className = "" }: Props) {
  const cls = ["btn", `btn--${variant}`, size === "sm" ? "btn--sm" : "", block ? "btn--block" : "", className].filter(Boolean).join(" ");
  return (
    <Link href={href} className={cls}>
      <span className="roll">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
    </Link>
  );
}
