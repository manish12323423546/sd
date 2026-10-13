import Link from "next/link";
import { brand } from "@/lib/content";

/** Original mark for the demo brand: two rising steps inside a rounded tile. */
export function LogoMark({ size = 30, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="8" fill={light ? "#bbfd6a" : "#245333"} />
      <path d="M7 22h5v-5h5v-5h6" fill="none" stroke={light ? "#245333" : "#bbfd6a"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label={`${brand.name} home`} style={light ? { color: "#fff" } : undefined}>
      <LogoMark light={light} />
      <span>{brand.name}</span>
    </Link>
  );
}
