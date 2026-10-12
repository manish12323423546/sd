export const SITE = {
  name: "Verixa",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://verixa-replica.vercel.app",
  description:
    "Verixa is a modern job board and recruitment template for hiring platforms, HR agencies and career websites. Find verified jobs, explore case studies and get career advice.",
};

export const MAIN_NAV = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About" },
  { href: "/case-studies", label: "Case Studies" },
];

export const PAGES_MENU = [
  {
    title: "Main Pages",
    links: [
      { href: "/", label: "Home" },
      { href: "/about-us", label: "About Us" },
      { href: "/service", label: "Services" },
      { href: "/case-studies", label: "Case Studies" },
      { href: "/jobs", label: "Jobs" },
    ],
  },
  {
    title: "Inner Pages",
    links: [
      { href: "/blog", label: "Blogs" },
      { href: "/case-studies/reduced-cost-per-hire-by-35-with-recruits-hiring-tools", label: "Case Studies CMS" },
      { href: "/blog/switching-careers-successfully-a-step-by-step-guide", label: "Blogs CMS" },
      { href: "/jobs/frontend-developer-react", label: "Jobs CMS" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Utilities",
    links: [
      { href: "/404", label: "404 Not Found" },
      { href: "/utility/style-guide", label: "Style Guide" },
      { href: "/utility/changelog", label: "Changelogs" },
      { href: "/utility/licenses", label: "Licenses" },
    ],
  },
];

export const FOOTER = [
  {
    title: "Company",
    links: [
      { href: "/about-us", label: "About Us" },
      { href: "/jobs", label: "Jobs" },
      { href: "/contact", label: "Contact" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/utility/licenses", label: "License" },
      { href: "/utility/style-guide", label: "Style Guide" },
      { href: "/utility/changelog", label: "Changelog" },
      { href: "/404", label: "404 Page" },
    ],
  },
  {
    title: "Social",
    links: [
      { href: "https://www.facebook.com/", label: "Facebook" },
      { href: "https://www.linkedin.com/", label: "LinkedIn" },
      { href: "https://www.instagram.com/", label: "Instagram" },
      { href: "https://x.com/", label: "Twitter" },
    ],
  },
];

export const svg = (name: string) => `/svg/${name}.svg`;
export const ICON = {
  logo: svg("alubmguetehazqxmx2rtmz0e"),
  arrowWhite: svg("blxaxb60cg3s5kho0x1jqdwln28"),
  arrowInk: svg("utpvu16e41e7mhbu13cpkv6pagm"),
  chevron: svg("leigkdsk9e8drw8vty0tbzsnxr4"),
  wave: svg("v8pnh4dkyr06flh8hgqrdy6v0w"),
};
