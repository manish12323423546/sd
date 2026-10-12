import images from "@/data/images.json";

type Manifest = Record<string, { w: number; h: number; widths: number[] }>;
const IMAGES = images as Manifest;

type Props = {
  name: string;
  alt?: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/** Responsive WebP from public/img (two widths), with intrinsic size to avoid layout shift. */
export function Img({ name, alt = "", sizes, className, priority = false }: Props) {
  const meta = IMAGES[name];
  if (!meta) throw new Error(`Unknown image: ${name}`);
  const largest = meta.widths[meta.widths.length - 1];
  return (
    <img
      src={`/img/${name}-${largest}.webp`}
      srcSet={meta.widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(", ")}
      sizes={sizes}
      width={meta.w}
      height={meta.h}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
