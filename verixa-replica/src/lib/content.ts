import raw from "@/data/content.json";

export type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string };

export type Job = {
  slug: string;
  title: string;
  salary: string;
  badges: string[];
  category: string;
  summary: string;
  body: Block[];
  process: string[];
  howToApply: string;
  company: {
    name: string;
    website: string;
    logo: string;
    industry?: string;
    employees?: string;
    location?: string;
    founded?: string;
    email?: string;
    phone?: string;
  };
  socials: { name: string; href: string }[];
  metaTitle: string;
  metaDescription: string;
};

export type Post = {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  category: string;
  thumb: string;
  banner: string;
  excerpt: string;
  body: Block[];
  gallery: string[];
  metaTitle: string;
  metaDescription: string;
};

export type CaseStudy = {
  slug: string;
  title: string;
  tag: string;
  card: string;
  banner: string;
  summary: string;
  stats: { value: string; label: string }[];
  body: Block[];
  client: { name: string; logo: string; logoSmall: string; industry?: string; location?: string; duration?: string };
  metaTitle: string;
  metaDescription: string;
};

export type FaqTab = { tab: string; items: { q: string; a: string[] }[] };

const data = raw as unknown as { jobs: Job[]; blogs: Post[]; cases: CaseStudy[]; faq: FaqTab[] };

export const jobs = data.jobs;
export const posts = data.blogs;
export const cases = data.cases;
export const faq = data.faq;

export const getJob = (slug: string) => jobs.find((j) => j.slug === slug);
export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
export const getCase = (slug: string) => cases.find((c) => c.slug === slug);

export function neighbours<T extends { slug: string }>(list: T[], slug: string) {
  const i = list.findIndex((x) => x.slug === slug);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Feb 2, 2026" -> "February 2, 2026" (the sidebar uses long month names). */
export function longDate(short: string) {
  const mon = short.split(" ")[0];
  const full = MONTHS.find((m) => m.startsWith(mon));
  return full ? `${full}${short.slice(mon.length)}` : short;
}
