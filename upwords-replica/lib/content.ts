// Site copy for Clarivyn Advisory. Every fact here comes from clarivynadvisory.com
// (captured 13 Oct 2026). Long passages are condensed; nothing is invented.

export const brand = {
  name: "Clarivyn Advisory",
  short: "Clarivyn",
  tagline: "Clarity First. Always.",
  founder: "Jay Modi",
  location: "Ahmedabad, Gujarat, India",
  email: "clarivynadvisory@gmail.com",
  phone: "+91 99251 96237",
  phoneHref: "tel:+919925196237",
  phoneAlt: "+91 79904 94522",
  phoneAltHref: "tel:+917990494522",
  whatsapp: "https://wa.me/919925196237?text=Hi%20Clarivyn%20Advisory%2C%20I%27d%20like%20to%20book%20a%20consultation.",
  youtube: "https://youtube.com/@ClarivynAdvisory",
  linkedin: "https://linkedin.com/in/jay-modi-601b1262",
};

export const nav = [
  { label: "About", href: "/about" },
  { label: "Pharma", href: "/pharma" },
  { label: "Clinics", href: "/clinic" },
  { label: "Startups", href: "/startups" },
  { label: "Quick Services", href: "/quick-services" },
  { label: "Packages", href: "/packages" },
];

export const footerLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pharma", href: "/pharma" },
  { label: "Doctor Clinics", href: "/clinic" },
  { label: "Startups", href: "/startups" },
  { label: "Quick Services", href: "/quick-services" },
  { label: "Packages", href: "/packages" },
  { label: "Startup Registry", href: "/registry" },
  { label: "Partner With Us", href: "/partner" },
  { label: "Contact", href: "/contact" },
];

export const socials = [
  { label: "WhatsApp", href: brand.whatsapp, icon: "whatsapp" },
  { label: "YouTube", href: brand.youtube, icon: "youtube" },
  { label: "LinkedIn", href: brand.linkedin, icon: "linkedin" },
] as const;

export const cta = {
  primary: "Book a Consultation",
  short: "Book a Free Call",
  heading: "Let’s find the clarity first",
  body: "Tell us where the business is today. We’ll tell you honestly whether we can help, and what the right starting point would be.",
};

export const home = {
  badge: "Business Consulting · Gujarat, India",
  heroLine1: "Clarity that grows",
  heroLine2a: "your",
  heroLine2b: "business.",
  heroBody: "Written systems, structured frameworks and financial clarity for pharma firms, doctor clinics and early-stage startups across Gujarat.",
  ribbon: ["Clinic Growth Advisory", "Pharma Market Strategy", "Go-to-Market Roadmaps", "Positioning & Pricing", "Operating Rhythms", "Brand Clarity"],
  bigWord: "Clarity First",
  statement: "Gut-feeling businesses become well-run, growing practices when the systems are written down. Every Clarivyn engagement ends with written proof of results, not just advice.",
  areasHeading: ["Three", "Practice Areas"],
  areasIntro: "One firm. Three practice areas. One standard of clarity.",
  quote: {
    text: "“I built Clarivyn Advisory because Gujarat’s pharma owners, doctors, and founders deserve the same quality of structured business thinking that large corporations take for granted.”",
    name: "Jay Modi",
    role: "Founder, Clarivyn Advisory",
  },
  stepsHeading: ["How an engagement", "works"],
  pricingHeading: ["Our engagement", "packages"],
  pricingNote: "All packages include a free 20-minute discovery call before engagement begins.",
  storiesHeading: "What clients say",
  resourcesHeading: ["Free and published", "resources"],
  faqHeading: "Common questions",
};

export const steps = [
  { label: "Step 01", title: "Free Discovery Call", body: "Every engagement begins with a free 20-minute call. We respond to every enquiry within 24 hours." },
  { label: "Step 02", title: "Written Systems", body: "Your focus areas are diagnosed and systemised, with written SOPs your team can follow without asking you." },
  { label: "Step 03", title: "Written Proof", body: "A written Before and After report shows exactly what changed, at the end of every engagement." },
];

export type Area = { slug: string; title: string; label: string; summary: string; points: string[]; image: string };

export const areas: Area[] = [
  {
    slug: "pharma", title: "Pharma Firms", label: "Pharma", image: "/img/pharma.webp",
    summary: "Stronger distribution, sharper field performance and financial clarity for your pharma business.",
    points: ["Collections and outstanding visibility", "MR performance and territory intelligence", "Credit governance and inventory systems", "Monthly P&L clarity", "Business continuity without the owner"],
  },
  {
    slug: "clinic", title: "Doctors and Clinic Owners", label: "Doctor Clinics", image: "/img/clinic.webp",
    summary: "Turn a busy clinic into a more organised, profitable and patient-centred practice.",
    points: ["Walkaway patients and no recall system", "Patient flow and appointment systems", "Front desk excellence and staff SOPs", "Clinic profitability dashboard", "Online reputation and Google rating"],
  },
  {
    slug: "startups", title: "Startups and Founders", label: "Startups", image: "/img/startups.webp",
    summary: "Move from a promising idea to a focused, repeatable growth architecture built for scale.",
    points: ["Founder clarity and customer discovery", "Business model and market sizing", "Co-founder structure and team alignment", "Investor-ready financials and pitch deck", "The Growth Architecture, 36 chapters"],
  },
];

export type Plan = { name: string; price: string; unit: string; featured?: boolean; items: string[]; payment?: string };
export type PlanGroup = { key: string; label: string; duration: string; plans: Plan[] };

export const planGroups: PlanGroup[] = [
  {
    key: "pharma", label: "Pharma", duration: "30-day engagement",
    plans: [
      { name: "Starter", price: "₹9,999", unit: "/one focus area", items: ["Collections, MR performance, P&L clarity or inventory systems", "Complete written system built and implemented", "One written SOP for your team", "Written Before and After report"], payment: "₹4,999 on Day 1, ₹5,000 on Day 30" },
      { name: "Growth", price: "₹24,999", unit: "/three focus areas", featured: true, items: ["Three focus areas from the 10 pharma problems", "Full pharma systems audit", "Written SOP for each area", "Monthly review session", "Written Before and After report"], payment: "₹9,999 on Day 1, ₹15,000 on Day 30" },
      { name: "Transform", price: "₹49,999", unit: "/complete overhaul", items: ["All 10 pharma problem areas", "Written system for every function", "Full SOP library", "Monthly review session", "Priority access to Jay Modi"], payment: "₹14,999 on Day 1, ₹15,000 on Day 15, ₹20,000 on Day 30" },
    ],
  },
  {
    key: "clinic", label: "Doctor Clinics", duration: "45-day engagement",
    plans: [
      { name: "Starter", price: "₹12,999", unit: "/one focus area", items: ["Patient flow, front desk, appointments, staff SOPs or profitability", "Complete written system for that area", "One written SOP for your staff", "Written Before and After report"], payment: "₹4,999 on Day 1, ₹8,000 on Day 45" },
      { name: "Growth", price: "₹29,999", unit: "/three focus areas", featured: true, items: ["Three focus areas from the 10 clinic problems", "Full clinic systems audit", "Written SOP for each area", "Staff training guide", "Monthly review session"], payment: "₹9,999 on Day 1, ₹20,000 on Day 45" },
      { name: "Transform", price: "₹59,999", unit: "/complete overhaul", items: ["All 10 clinic problem areas", "Full SOP library", "Online reputation strategy", "Staff training guide for every department", "Priority access to Jay Modi"], payment: "₹14,999 on Day 1, ₹20,000 on Day 22, ₹25,000 on Day 45" },
    ],
  },
  {
    key: "startups", label: "Startups", duration: "30 to 90 days",
    plans: [
      { name: "Starter", price: "₹14,999", unit: "/30 days", items: ["Founder Clarity Assessment", "Customer Discovery Framework", "Business Model Canvas", "Written deliverable you keep"], payment: "₹4,999 on Day 1, ₹10,000 on completion" },
      { name: "Growth", price: "₹49,999", unit: "/60 days", featured: true, items: ["Everything in Starter", "Bottom-up market sizing (TAM, SAM, SOM)", "Financial model, Month 1 to Month 36", "Investor pitch deck restructure", "Investor Q&A preparation"], payment: "₹9,999 on Day 1, ₹40,000 on completion" },
      { name: "Transform", price: "₹89,999", unit: "/90 days", items: ["Everything in Growth", "All 36 chapters of The Growth Architecture applied", "1-Page Marketing Plan", "Co-Founder Alignment Session", "Investor introduction support"] },
    ],
  },
];

export const testimonials = [
  { text: "Jay helped us restructure our consultation packages and patient flow. Footfall grew within a quarter, and the systems still run without me watching every detail.", who: "Doctor clinic owner · Gujarat" },
  { text: "We came in with too many ideas and no sequence. Clarivyn gave us a 90-day plan we actually executed. First real revenue followed within two months.", who: "Startup founder · Gujarat" },
  { text: "The territory and distributor strategy reshaped where our field force spent time. Cleaner pipeline, fewer wasted visits, better margins.", who: "Pharma firm owner · Gujarat" },
  { text: "Honest, practical, and never sold us something we didn’t need. The pricing work alone paid for the engagement many times over.", who: "Doctor clinic owner · Gujarat" },
  { text: "Jay thinks like an operator, not a consultant. The offer and pricing architecture he built is still the backbone of how we sell.", who: "Startup founder · Gujarat" },
  { text: "Referral systems that respect medical ethics are rare. Clarivyn built one that feels right to clinicians and actually fills the calendar.", who: "Doctor clinic owner · Gujarat" },
];

export const resources = [
  { tag: "Framework", title: "The Growth Architecture", body: "Jay Modi’s 36-chapter founder framework from First Rupee to ₹100 Crore: four revenue stages and seven pillars.", href: "/startups", cta: "Explore the Framework", image: "/img/resource-framework.webp" },
  { tag: "Book", title: "Before The Investment", body: "Questions Every Startup Must Answer. A founder’s guide to becoming investor ready, available on Amazon India.", href: "/startups#book", cta: "Read More", image: "/img/resource-book.webp" },
];

export const youtube = {
  heading: "20 episodes. Real problems. Real solutions.",
  body: "Two free series on YouTube: 10 episodes for pharma firms and 10 for doctor clinics, each with a written Clarivyn solution. A new episode every week.",
  series: ["Is Your Pharma Business Running on Gut Feeling?", "Is Your Clinic Busy But Not Growing?"],
};

export const faqs = [
  { q: "Who does Clarivyn work with?", a: "Small and medium pharma firms, independent doctor clinics and early-stage startups across Gujarat." },
  { q: "How does an engagement start?", a: "With a free 20-minute discovery call. Every enquiry gets a reply within 24 hours." },
  { q: "How long does an engagement take?", a: "Pharma engagements run for 30 days and clinic engagements for 45 days. Startup packages run from 30 to 90 days." },
  { q: "What do I get at the end?", a: "Written systems and SOPs for your focus areas, plus a written Before and After report showing exactly what changed." },
  { q: "Can I start with something smaller?", a: "Yes. Quick Services are fixed-price, single-session diagnostics, starting with a 10-minute Idea Clarity Call and a 45-minute Business ROI Audit." },
];

export const about = {
  heading: ["Jay Modi"],
  role: "Founder, Clarivyn Advisory",
  body: "A management consultant based in Ahmedabad, working exclusively with small and medium pharma firms, independent doctor clinics and early-stage startups across Gujarat.",
  stats: [
    { value: 3, suffix: "", label: "Practice areas" },
    { value: 36, suffix: "", label: "Growth Architecture chapters" },
    { value: 20, suffix: "", label: "Free YouTube episodes" },
  ],
  storyHeading: ["Structured thinking,", "in writing"],
  story: [
    "Jay holds a B.Pharma degree and an MBA in Marketing, and is an IIM Kozhikode Executive Alumni, with programmes in Entrepreneurship and New Venture Creation, and Strategies for Product and Marketing.",
    "He is the author of Before The Investment, the creator of The Growth Architecture, and a Udemy instructor whose Zero to Startup Masterclass is live on Udemy and YouTube.",
  ],
  credentialsHeading: ["Credentials", "and work"],
  credentials: [
    { icon: "pill", title: "B.Pharma", body: "Pharmaceutical Sciences." },
    { icon: "cap", title: "MBA in Marketing", body: "Marketing specialisation." },
    { icon: "school", title: "IIM Kozhikode", body: "Executive Alumni: Entrepreneurship and New Venture Creation; Strategies for Product and Marketing." },
    { icon: "book", title: "Author", body: "Before The Investment: Questions Every Startup Must Answer, on Amazon India." },
    { icon: "layers", title: "The Growth Architecture", body: "Creator of the 36-chapter startup growth framework." },
    { icon: "play", title: "Udemy instructor", body: "Zero to Startup: The Complete Masterclass, on Udemy and YouTube." },
  ],
};

export type Problem = { title: string; line: string };
export type Practice = {
  slug: "pharma" | "clinic";
  eyebrow: string;
  heading: string;
  body: string;
  promise: string;
  image: string;
  problemsHeading: string;
  problems: Problem[];
  groupKey: string;
  closing: string;
};

export const practices: Practice[] = [
  {
    slug: "pharma", eyebrow: "For pharma firms", heading: "Is your pharma business running on gut feeling?", image: "/img/pharma.webp",
    body: "Many small and medium pharma firms in Gujarat run without collections systems, MR performance reviews, monthly P&L clarity, inventory governance or a continuity plan. The owner does everything, so the business survives but never scales.",
    promise: "Clarivyn builds written systems for every function of your pharma firm, in 30 days.",
    problemsHeading: "The gaps that keep your firm small",
    problems: [
      { title: "No Collections Visibility", line: "Outstanding running on memory." },
      { title: "MR Activity Without Performance", line: "In the field, but prescriptions are not growing." },
      { title: "Owner-Driven Chaos", line: "Business stops when you stop." },
      { title: "No Credit Policy", line: "Cash flow silently dying." },
      { title: "Inventory Without FIFO", line: "Expiry losses every month." },
      { title: "No Organisational Accountability", line: "Everyone busy, nobody responsible." },
      { title: "No Territory Intelligence", line: "MR walking blind." },
      { title: "No Business Continuity", line: "Firm cannot run without the owner." },
      { title: "No Monthly P&L", line: "You do not know if you made money." },
      { title: "Margin Erosion", line: "Products moving, profit not growing." },
    ],
    groupKey: "pharma",
    closing: "Ready to stop running on gut feeling?",
  },
  {
    slug: "clinic", eyebrow: "For doctor clinics", heading: "Your clinic is busy. But is it growing?", image: "/img/clinic.webp",
    body: "Independent doctors across Gujarat see patients every day, yet patients walk away, staff have no routine, fees go unrevised, profits stay unclear and Google ratings slip.",
    promise: "Clarivyn builds written systems for every function of your clinic, in 45 days.",
    problemsHeading: "Why busy does not mean growing",
    problems: [
      { title: "Walkaway Patients", line: "A long wait, and nobody said how long." },
      { title: "No Patient Recall", line: "Patients never called back." },
      { title: "No Appointment System", line: "Unpredictable OPD every day." },
      { title: "Front Desk Failure", line: "Patient lost before you see them." },
      { title: "No Patient Relationship", line: "Every visit is a transaction." },
      { title: "No Profit Clarity", line: "Busy, but the money is unclear." },
      { title: "Clinic Runs on Doctor", line: "Nothing moves without you." },
      { title: "Staff With No Routine", line: "Daily chaos, no written process." },
      { title: "Bad Google Reviews", line: "Smiles in the clinic, two stars at home." },
      { title: "No Online Reputation", line: "The most trusted doctor wins, not the best." },
    ],
    groupKey: "clinic",
    closing: "Step off the treadmill. Start growing.",
  },
];

export const startupsPage = {
  eyebrow: "For startups",
  heading: "Your startup deserves the same clarity as funded ventures.",
  body: "Many first-time founders build on assumption, not evidence: they pitch before validating and raise before the model is clear. Clarivyn bridges that gap.",
  frameworkTitle: "The Growth Architecture",
  frameworkSub: "A founder’s framework from First Rupee to ₹100 Crore · 36 chapters · 4 revenue stages · 7 pillars",
  stages: [
    { range: "₹0 → ₹10L", name: "Foundation", body: "Idea validation, customer discovery, first revenue." },
    { range: "₹10L → ₹1Cr", name: "Early Traction", body: "Market sizing, traction roadmap, first investor." },
    { range: "₹1Cr → ₹10Cr", name: "Growth", body: "Team building, sales systems, Series A readiness." },
    { range: "₹10Cr → ₹100Cr", name: "Scale", body: "Organisational structure, P&L discipline, institutions." },
  ],
  pillars: ["Ideation & Market Research", "Business Model & Revenue", "Marketing & Sales", "Team & Operations", "Fundraising & Investor Strategy", "Financial Systems & P&L", "Scaling"],
  quickStart: { title: "Not ready for a full engagement? Start here.", body: "The Startup Clarity Session combines The Growth Architecture Assessment, the 1-Page Marketing Plan and the Business Blueprint in one focused three-hour session, with three written documents.", price: "₹9,999" },
  book: { title: "Before The Investment", sub: "Questions Every Startup Must Answer · by Jay Modi · Available on Amazon India" },
  masterclass: { title: "Zero to Startup: The Complete Masterclass", body: "The full founder journey, from idea validation to investor readiness, live on Udemy and YouTube. Learn at your own pace and apply it with Clarivyn support." },
};

export const quickServices = {
  heading: "Clarity in hours. Not months.",
  body: "Focused, fixed-price diagnostics that give you clarity on your business before you commit to a full engagement. Delivered in one session, on WhatsApp video or in person in Ahmedabad.",
  items: [
    { length: "10 min call", name: "Idea Clarity Call", price: "₹199", body: "A short, structured and honest check of your idea.", gets: ["Written WhatsApp summary"] },
    { length: "45 min session", name: "Business ROI Audit", price: "₹999", body: "A review of your business across five key areas, with the ROI opportunity calculated.", gets: ["Written Business Health Score across 5 areas", "Written ROI calculation", "Three specific action recommendations"] },
    { length: "90 min + report", name: "Franchise Evaluation", price: "₹5,999", body: "For anyone weighing a franchise opportunity, before they sign.", gets: ["12-month financial projection with break-even and ROI", "Six operational risk factors scored", "Review of the franchisor’s track record and contract terms"] },
    { length: "90 min + report", name: "Franchise Readiness Diagnostic", price: "₹5,999", body: "For owners considering franchising a business that already works.", gets: ["28-criterion readiness score across 7 pillars", "Franchise model recommendation"] },
    { length: "2 hour session", name: "Business Blueprint & 1-Page Marketing Plan", price: "₹4,999", body: "Your business model, revenue streams, target customer and positioning, plus a marketing plan.", gets: ["Written Business Blueprint", "Written 1-Page Marketing Plan"] },
    { length: "3 hour session", name: "The Startup Clarity Session", price: "₹9,999", body: "Three startup frameworks combined into one focused session.", gets: ["Growth Architecture Assessment", "1-Page Marketing Plan", "Business Blueprint"] },
  ],
  note: "Written reports are delivered within 24 hours of the session.",
};

export const registryPage = {
  eyebrow: "Clarivyn Startup Registry",
  heading: "Find your next opportunity. Or get found.",
  body: "A curated directory of screened and Clarivyn-prepared startups across Gujarat, built for serious investors and ambitious founders.",
  sectors: "Pharma · Health Tech · Consumer · SaaS · Manufacturing",
  badges: [
    { name: "Gold · Clarivyn Prepared", body: "The startup has completed a full Clarivyn engagement: business model validated, financial model built, pitch deck structured and an Investment Readiness Certificate issued.", price: "Free with Clarivyn consulting", items: ["Full investor-ready profile", "Pitch deck for Premium investors", "Investment Readiness Certificate", "Priority placement", "Invitations to Clarivyn Pitch Day events", "12 months free with any consulting engagement"] },
    { name: "Silver · Clarivyn Screened", body: "The startup has passed a 20-minute Clarivyn screening call, and the founder and business are verified as genuine.", price: "₹299 per month, cancel any month", items: ["Basic startup profile", "Clarivyn Screened badge", "Visible to all investor members", "Upgrade to Gold with any consulting engagement"] },
  ],
};

export const partnerPage = {
  eyebrow: "Clarivyn Partner Program",
  heading: "Refer once. Earn 10%.",
  body: "Refer a pharma firm, clinic doctor or startup founder and earn 10% of what they pay, on any plan or quick service. No cap. No expiry.",
  benefits: [
    { title: "10% on every confirmed engagement", body: "Starter, Growth, Transform or any Quick Service." },
    { title: "Real results for your network", body: "Every client receives a written report with before and after numbers." },
    { title: "No targets, no minimums, no expiry", body: "Refer one or fifty. Every confirmed referral pays." },
  ],
  rewards: [
    ["Pharma Starter", "₹9,999", "₹1,000"], ["Pharma Growth", "₹24,999", "₹2,500"], ["Pharma Transform", "₹49,999", "₹5,000"],
    ["Clinic Starter", "₹12,999", "₹1,300"], ["Clinic Growth", "₹29,999", "₹3,000"], ["Clinic Transform", "₹59,999", "₹6,000"],
    ["Startup Starter", "₹14,999", "₹1,500"], ["Startup Growth", "₹49,999", "₹5,000"], ["Startup Transform", "₹89,999", "₹9,000"],
  ],
  rewardsNote: "Paid within 7 working days of the client’s Day 1 payment. This is a launch offer and terms may be revised after the launch period.",
  who: ["Chartered Accountants", "Pharma distributors and stockists", "Hospital admins and healthcare consultants", "MBA alumni and business coaches", "Co-working spaces and incubators", "Any business professional"],
  process: [
    { title: "Register free", body: "Takes two minutes. No fee, no commitment." },
    { title: "Send the referral", body: "WhatsApp Jay the name and number of the person you are referring, which creates a written record." },
    { title: "Get paid", body: "Once the client makes the Day 1 payment, you receive 10% within 7 working days by UPI or bank transfer." },
  ],
};

export const contactPage = {
  heading: ["Let’s talk about what is", "stopping your business"],
  sub: "We respond within 24 hours. Engagements begin with a free 20-minute discovery call.",
  formTitle: "Send an enquiry",
  submit: "Request a Consultation",
  directHeading: ["Pick the channel", "that suits you"],
};

export const packagesPage = { heading: ["Our engagement", "packages"] };

export const notFound = { title: "This page could not be found", body: "The link may be old or the page may have moved.", button: "Back to Home" };
