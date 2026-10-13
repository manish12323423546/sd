// Eight original sample articles written for this demo build.
export type Section = { h: string; p?: string[]; list?: string[]; ordered?: boolean; after?: string[] };
export type Post = {
  slug: string;
  category: "Guide" | "Advice" | "Leadership";
  title: string;
  excerpt: string;
  intro: string;
  image: string;
  sections: Section[];
};

export const posts: Post[] = [
  {
    slug: "why-strong-performers-get-promoted-last",
    category: "Guide",
    title: "Why strong performers are often promoted last.",
    excerpt: "Being reliable can quietly keep you where you are. Here is why it happens and the small changes that make your readiness obvious to the people who decide.",
    intro: "Reliability earns trust, but on its own it rarely earns a new title. Here is what is going on.",
    image: "/img/post-1.webp",
    sections: [
      { h: "The problem with being indispensable", p: ["Managers protect the people who keep things running. If you are the one who fixes every outage or answers every client question, promoting you creates a gap they would rather not fill.", "None of this is a judgement on your ability. It is a staffing problem, and you can help solve it."] },
      { h: "Make yourself replaceable on purpose", p: ["Write down the parts of your job that only you can do. Then pick one and teach it to someone else this month. Each handover makes it easier to say yes to your move."] },
      { h: "Show the work you want, not just the work you do", p: ["Decision makers promote people they can already picture in the bigger role. Give them evidence:"], list: ["Volunteer for one piece of planning work each quarter", "Summarise results in terms of the wider team, not your own tasks", "Ask to sit in on one meeting a level above you"] },
      { h: "The takeaway", p: ["Keep being dependable, but make sure your next role is easy to imagine and easy to staff. That combination moves people up."] },
    ],
  },
  {
    slug: "a-weekly-habit-that-makes-your-work-visible",
    category: "Advice",
    title: "A weekly habit that makes your work visible.",
    excerpt: "Fifteen minutes on a Friday can change how your manager sees your year. A simple note format that keeps the right people informed without bragging.",
    intro: "Good work that nobody hears about is easy to overlook. A short weekly note fixes that.",
    image: "/img/post-2.webp",
    sections: [
      { h: "Why visibility is a skill", p: ["Most people assume their manager knows what they did this week. Usually they know a fraction of it, and only the parts that went wrong.", "Sharing progress is not showing off. It helps your manager do their job, which includes speaking up for you."] },
      { h: "The three-line note", p: ["Every Friday, send a short message with three headings:"], list: ["Done: what moved forward and why it matters", "Next: what you are working on next week", "Help: one thing where a decision or introduction would speed you up"] },
      { h: "Keep it short and consistent", p: ["Five bullet points is plenty. The value comes from the rhythm, not the length. After a few months you also have a ready-made record for your review."] },
      { h: "The takeaway", p: ["Visibility is something you can schedule. Put fifteen minutes in your calendar every Friday and protect it."] },
    ],
  },
  {
    slug: "prepare-for-a-pay-conversation-in-five-days",
    category: "Guide",
    title: "How to prepare for a pay conversation in five days.",
    excerpt: "A day-by-day plan for gathering evidence, choosing a number and rehearsing the conversation so that you walk in calm and walk out with an answer.",
    intro: "Pay conversations go better with a plan. This one fits into a working week.",
    image: "/img/post-3.webp",
    sections: [
      { h: "Day one: collect your evidence", p: ["List the results you have delivered in the last twelve months. Use numbers wherever you can: time saved, revenue protected, people trained."] },
      { h: "Day two: research the range", p: ["Look at salary surveys, job adverts and conversations with peers you trust. Write down a realistic range for your role and location."] },
      { h: "Day three: choose your number", p: ["Pick a figure near the top of the range that you can justify with your evidence. Decide in advance what you would accept and what else, such as training budget or title, you could ask for."] },
      { h: "Days four and five: rehearse", p: ["Practise out loud with a friend or a coach. Prepare short answers to the likely replies:"], list: ["There is no budget this year", "We review pay in the spring", "What would you say you have done differently?"], after: ["Rehearsal turns a nervous conversation into a familiar one."] },
      { h: "The takeaway", p: ["Ask for a meeting, bring a one-page summary and stay with the facts. Calm preparation does most of the work."] },
    ],
  },
  {
    slug: "speaking-up-when-you-are-not-the-loudest",
    category: "Leadership",
    title: "Speaking up in meetings when you are not the loudest.",
    excerpt: "Influence does not require volume. Practical ways to get your ideas heard, from preparing one point in advance to following up in writing.",
    intro: "Quiet people often have the best ideas in the room. Here is how to make sure they land.",
    image: "/img/post-4.webp",
    sections: [
      { h: "Prepare one point", p: ["Before an important meeting, decide on the single point you most want to make. Write it in one sentence. Having it ready makes it far easier to speak early."] },
      { h: "Speak in the first ten minutes", p: ["The longer you wait, the harder it gets. An early question or comment establishes you as part of the conversation, which makes later contributions easier."] },
      { h: "Use structure, not volume", p: ["Short, structured points cut through noise:"], list: ["State the point first, then the reason", "Use numbers or examples where you have them", "End with a clear suggestion or question"] },
      { h: "Follow up in writing", p: ["Send a short note after the meeting that restates your idea and the next step. Written follow-ups often have more influence than anything said in the room."] },
      { h: "The takeaway", p: ["You do not need to change your personality. Preparation and follow-through give quiet professionals a strong voice."] },
    ],
  },
  {
    slug: "signals-you-have-outgrown-your-role",
    category: "Advice",
    title: "Signals that you have outgrown your current role.",
    excerpt: "Restlessness is not always a reason to leave. Sometimes it is a sign that you are ready for more. Eight signals worth paying attention to.",
    intro: "Feeling restless at work can mean many things. These signals suggest you are ready for the next step.",
    image: "/img/post-5.webp",
    sections: [
      { h: "Restless, or ready?", p: ["Boredom can come from a bad week, a difficult project or a team change. Readiness looks different: it shows up in how others treat you and how you spend your time."] },
      { h: "Eight signals to watch", p: ["If several of these are true, it is time to talk about what is next:"], ordered: true, list: ["Colleagues bring you problems that sit outside your job description", "You already coach newer team members informally", "You find yourself thinking about priorities, not just tasks", "Your manager asks for your view before making decisions", "You can do your core work in less time than it used to take", "Feedback on your work is mostly about polish, not substance", "You represent the team in cross-functional meetings", "You have started noticing gaps in how the wider team works"] },
      { h: "What to do next", p: ["Write down the signals that apply to you with an example of each. That list becomes the start of a conversation with your manager about your next role."] },
      { h: "The takeaway", p: ["Readiness is visible in what you already do. Name it, gather examples, and start the conversation."] },
    ],
  },
  {
    slug: "what-new-managers-get-wrong-early",
    category: "Leadership",
    title: "What new managers get wrong in their first 90 days.",
    excerpt: "The skills that earned the promotion are not the ones that make a good manager. Common early mistakes and simple ways to avoid them.",
    intro: "Stepping into management changes what success looks like. These are the traps worth avoiding.",
    image: "/img/post-6.webp",
    sections: [
      { h: "Doing the work yourself", p: ["It is tempting to stay the best individual contributor on the team. But every task you keep is a task someone else does not learn. Delegate early, even when it feels slower."] },
      { h: "Changing everything at once", p: ["Spend the first month listening. Ask each person what works, what does not and what they would change. You will make better decisions and earn trust along the way."] },
      { h: "Skipping regular one-to-ones", p: ["A short weekly conversation with each person is the most useful habit a new manager can build. Keep it about them, not just status updates."] },
      { h: "Forgetting to manage upwards", p: ["Your own manager needs to know how the team is doing. A short weekly summary keeps them informed and makes it easier to secure support when you need it."] },
      { h: "The takeaway", p: ["Listen first, delegate early and keep regular conversations going in both directions. The rest follows."] },
    ],
  },
  {
    slug: "sideways-moves-that-lead-upward",
    category: "Guide",
    title: "Sideways moves that lead upward.",
    excerpt: "Not every good career move comes with a new title. How a lateral role can build the experience that makes the next promotion straightforward.",
    intro: "Sometimes the fastest route up runs sideways for a while.",
    image: "/img/post-7.webp",
    sections: [
      { h: "Why lateral moves work", p: ["A new team or function gives you exposure to different problems and different decision makers. That breadth is often what separates candidates for senior roles."] },
      { h: "Spotting a good sideways move", p: ["Look for roles that add something your current path lacks:"], list: ["Customer or commercial exposure", "Responsibility for a budget or a process end to end", "Work with a senior sponsor you have not met yet"] },
      { h: "Making the case", p: ["Frame the move in terms of what the business gains, not just what you learn. Show how your existing skills transfer and what you will bring from day one."] },
      { h: "The takeaway", p: ["Judge a move by where it leads in two years, not by its title today."] },
    ],
  },
  {
    slug: "a-one-page-case-for-your-next-role",
    category: "Advice",
    title: "Writing a one-page case for your next role.",
    excerpt: "A short written case makes it easier for your manager to argue for you. What to include and how to keep it to a single page.",
    intro: "Promotion decisions often happen in rooms you are not in. A one-page case speaks for you there.",
    image: "/img/post-8.webp",
    sections: [
      { h: "Why write it down", p: ["Your manager may need to make the case to their own boss or a panel. A clear page of evidence makes that much easier and keeps the story consistent."] },
      { h: "What to include", p: ["Keep it to four short sections:"], list: ["The role you are aiming for and why now", "Three results from the past year, with numbers", "Examples of you already working at the next level", "What you would focus on in the first six months"] },
      { h: "Keep it honest and specific", p: ["Specific examples beat adjectives. Instead of saying you are a strong communicator, describe the stakeholder update that unblocked a project."] },
      { h: "The takeaway", p: ["One page, real evidence and a clear ask. It is the most useful document you will write this year."] },
    ],
  },
];

// The reference site's article addresses, redirected to the closest sample article.
export const legacyPostRedirects: Record<string, string> = {
  "the-mindset-shift-that-transforms-average-careers.": "why-strong-performers-get-promoted-last",
  "5-proven-strategies-to-land-your-dream-promotion-this-year.": "a-one-page-case-for-your-next-role",
  "why-most-professionals-stay-stuck-and-exactly-how-to-break-free.": "what-new-managers-get-wrong-early",
  "how-to-ask-for-a-raise-without-feeling-awkward.": "prepare-for-a-pay-conversation-in-five-days",
  "stop-being-overlooked-and-start-getting-recognized.": "a-weekly-habit-that-makes-your-work-visible",
  "10-signs-you-are-ready-for-promotion.": "signals-you-have-outgrown-your-role",
  "how-successful-leaders-communicate-and-influence.": "speaking-up-when-you-are-not-the-loudest",
  "the-one-career-move-most-professionals-overlook.": "sideways-moves-that-lead-upward",
};

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
