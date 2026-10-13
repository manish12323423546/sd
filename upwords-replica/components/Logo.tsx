import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/content";

export function LogoMark({ size = 34 }: { size?: number }) {
  return <Image src="/img/clarivyn-logo.webp" alt="" width={size} height={size} style={{ borderRadius: size * 0.2 }} />;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label={`${brand.name} home`} style={light ? { color: "#fff" } : undefined}>
      <LogoMark />
      <span>{brand.name}</span>
    </Link>
  );
}
