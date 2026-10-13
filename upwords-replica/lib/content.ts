// All copy for the demo lives here. Every name, quote, price and figure is sample content
// written for this build; none of it comes from the reference template.

export const brand = {
  name: "Climbwell",
  coach: "Maya Ellison",
  tagline: "Career coaching for people who are ready for the next rung.",
  email: "hello@example.com",
  phone: "+1 (555) 014-2290",
  phoneHref: "tel:+15550142290",
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about" },
  { label: "Services", href: "/service" },
  { label: "Packages", href: "/packages" },
  { label: "Articles", href: "/blog" },
];

export const footerLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/service" },
  { label: "Packages", href: "/packages" },
  { label: "Articles", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "404", href: "/404" },
];

export const socials = [
  { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  { label: "X", href: "https://x.com", icon: "x" },
  { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
] as const;

export const cta = {
  primary: "Book an Intro Call",
  short: "Book a Call",
  heading: "Your next step can start this week",
  body: "Pick a time that suits you for a relaxed 30-minute intro call and we will map out where to go from here.",
};

export const home = {
  badge: "Career & Leadership Coach",
  heroLine1: "Step into the role",
  heroLine2a: "you've",
  heroLine2b: "earned",
  heroBody: "Coaching for mid-career professionals who want a bigger remit, fairer pay and work that finally fits.",
  stats: ["400+ Sessions Delivered", "15 Industries Served", "9 Years Coaching", "4.9 Average Rating"],
  bigWord: "Make Your Move",
  statement:
    "Talent is rarely what holds people back. A missing plan usually is. We turn what you already know into one clear next step, then take it together.",
  workHeading: ["Ways", "To Work"],
  workIntro: "Pick the format that suits where you are right now.",
  quote: {
    text: "“Six months ago I was quietly job hunting. With Maya’s plan I pitched a new team lead role internally and got it, with a raise I would never have asked for.”",
    name: "Priya Nair",
    role: "Operations Lead",
    company: "Fernhill Logistics",
    image: "/img/client-1.webp",
  },
  stepsHeading: ["Three steps,", "Real momentum"],
  pricingHeading: ["Choose a place", "To begin"],
  storiesHeading: "Could your story be next?",
  blogHeading: ["Notes on", "moving up"],
  faqHeading: "Questions people often ask",
};

export const steps = [
  { label: "Step 01", title: "Intro Call", body: "A free half hour to talk through where you are, what is in the way and what a good year would look like." },
  { label: "Step 02", title: "Shape the Plan", body: "We agree a short list of moves for the next 90 days, with dates, owners and the conversations you need to have." },
  { label: "Step 03", title: "Act and Review", body: "Regular sessions keep you moving. We review what worked, adjust the plan and celebrate each step forward." },
];

export const plans = [
  {
    name: "Starter",
    price: "$180",
    unit: "/Focus Session",
    featured: false,
    items: ["A single 75-minute 1:1 session", "Pre-session reflection worksheet", "Written summary of next steps", "Recording of the session", "One follow-up email check-in"],
  },
  {
    name: "Most Chosen",
    price: "$2,400",
    unit: "/90-Day Programme",
    featured: true,
    items: ["Ten fortnightly 1:1 sessions", "A 90-day plan built around you", "Message support between sessions", "CV and profile review", "Pay conversation rehearsal", "Library of templates and scripts"],
  },
  {
    name: "Leadership",
    price: "$4,900",
    unit: "/Executive Track",
    featured: false,
    items: ["Everything in the 90-Day Programme", "Flexible scheduling across time zones", "Quarterly strategy deep dives", "Stakeholder mapping workshop", "Presence and presenting practice", "Ongoing access to the resource library"],
  },
];

export const values = [
  { icon: "ear", title: "Listen Before Advising", body: "The first session is mostly questions. Good advice depends on understanding your context, not on a script." },
  { icon: "map", title: "Plans Beat Pep Talks", body: "Energy comes and goes. A written plan with dates on it keeps you moving on the weeks when it does not." },
  { icon: "people", title: "Someone in Your Corner", body: "Short check-ins between sessions mean you are never stuck waiting a fortnight for a second opinion." },
  { icon: "target", title: "Progress You Can See", body: "We set two or three measures at the start and look at them every session, so you always know where you stand." },
];

export const valuesHeading = ["Practical plans,", "No vague advice"];

export const faqs = [
  { q: "Who is coaching a good fit for?", a: "People with a few years of experience who feel ready for more responsibility but are not sure how to get it. If that sounds like you, the intro call will tell us both quickly." },
  { q: "Do we meet online or face to face?", a: "Almost all sessions run on video so you can join from anywhere. In-person sessions are possible in the city on request." },
  { q: "How soon will I notice a difference?", a: "Most clients leave the first session with one concrete action. Bigger changes, like a new role or a pay rise, usually take one to three months." },
  { q: "What happens if it is not working for me?", a: "Tell me. We will change the approach, and if coaching is not the right tool you can stop at the end of any month." },
  { q: "How is this different from reading career books?", a: "Books give general advice. Coaching applies it to your manager, your company and your calendar, and someone checks you followed through." },
];

export type Service = {
  slug: string;
  title: string;
  image: string;
  summary: string;
  idea: string;
  suits: string;
  included: string[];
  after: string;
};

export const services: Service[] = [
  {
    slug: "1-1-career-coaching",
    title: "1:1 Career Coaching",
    image: "/img/svc-one-to-one.webp",
    summary: "Focused sessions on the decision or challenge that matters most right now.",
    idea: "A single, structured conversation about one pressing question, whether that is a job offer, a difficult manager or a choice between two paths. You bring the problem; we leave with a decision and a first step.",
    suits: "People facing a specific crossroads who want a clear head and an outside view before they commit.",
    included: ["One 75-minute video session", "Short reflection worksheet beforehand", "Written summary within a day", "Session recording", "Email follow-up a week later"],
    after: "You leave with a short written plan and a date for your first action, so the clarity from the call turns into movement.",
  },
  {
    slug: "90-day-accelerator",
    title: "90-Day Accelerator",
    image: "/img/svc-accelerator.webp",
    summary: "A three-month programme that turns a goal into a dated, reviewed plan.",
    idea: "A structured quarter of fortnightly sessions built around one goal, such as a promotion, a move into management or a pay review. Each session reviews progress and sets the next two weeks of actions.",
    suits: "Professionals who know what they want next and need structure and accountability to get there.",
    included: ["Ten fortnightly 1:1 sessions", "A written 90-day plan", "Message support between sessions", "CV and profile review", "Rehearsal for the key conversation"],
    after: "At the end of the quarter we review the results together and agree what to keep doing on your own.",
  },
  {
    slug: "executive-coaching",
    title: "Executive Coaching",
    image: "/img/svc-executive.webp",
    summary: "Support for senior leaders stepping into larger roles and wider influence.",
    idea: "Ongoing coaching for leaders who have just stepped up, or are about to. We work on priorities, stakeholders and the way you show up in rooms where decisions are made.",
    suits: "Heads of function, directors and new executives who want a confidential thinking partner.",
    included: ["Monthly or fortnightly sessions", "Stakeholder mapping workshop", "Presence and presenting practice", "Quarterly strategy reviews", "Flexible scheduling across time zones"],
    after: "You leave each quarter with sharper priorities and a clearer story about the impact you are having.",
  },
  {
    slug: "resume-personal-brand",
    title: "Resume & Personal Brand",
    image: "/img/svc-brand.webp",
    summary: "A sharper CV and profile that tell the story of the role you want next.",
    idea: "We rework your CV and online profile around the role you are aiming for, not the one you have. The focus is on outcomes, numbers and a clear headline.",
    suits: "Anyone about to apply for roles, or preparing for an internal move that needs a written case.",
    included: ["Two working sessions", "Rewritten CV in two formats", "Profile headline and summary", "Short bio for introductions", "One round of revisions"],
    after: "You get finished documents you can send the same day, plus a short guide for keeping them current.",
  },
];

export const servicesPage = {
  heading: ["Coaching shaped around", "your next step"],
  body: "Every programme starts from your goals and your timeline, so no two plans look quite the same.",
  listHeading: ["Find the format", "that fits you"],
  otherHeading: ["Explore the", "other formats"],
};

export const about = {
  heading: ["The coach in", "your corner"],
  body: "I spent eleven years in operations before I worked out how promotions really happen. Now I help others skip the guesswork.",
  stats: [
    { value: 9, suffix: "yrs", label: "Coaching" },
    { value: 400, suffix: "+", label: "Sessions Delivered" },
    { value: 4.9, suffix: "", label: "Average Rating", decimals: 1 },
  ],
  storyHeading: ["I learned this", "the hard way"],
  story: [
    "For most of my thirties I was the person everyone relied on and nobody promoted. I worked late, fixed problems and waited to be noticed. It did not work.",
    "What changed things was treating my career like a project: a goal, a plan, a few honest conversations and someone holding me to it. Within a year I was leading the team I used to support.",
  ],
  logosHeading: ["Clients have gone on", "to roles at teams like these"],
  logos: ["Northbank", "Fieldstone", "Kestrel", "Orbitly"],
};

export const packagesPage = { heading: ["Choose a place", "To begin"] };

export const contactPage = {
  heading: ["Let's start", "a conversation"],
  formTitle: "Say hello",
  submit: "Send Message",
  directHeading: ["Rather get in", "touch directly?"],
  emailTitle: "Write an email",
  emailBody: "Questions about programmes, pricing or timing are all welcome. Expect a reply within one working day.",
  phoneTitle: "Call the studio",
  phoneBody: "Calls are answered on weekdays between nine and five. Leave a message outside those hours.",
};

export const notFound = {
  title: "This page took a different path",
  body: "The link may be old or the page may have moved.",
  button: "Back to Home",
};

export const blogPage = {
  heading: ["Notes on", "moving up"],
  moreHeading: ["More reading for", "your next move"],
  filters: ["All", "Guide", "Advice", "Leadership"],
};
