/** Decorative ribbon lines: a lime stroke with a thinner white stroke beside it. All paths drawn for this build. */
type Props = { className?: string };

export const HeroWave = ({ className }: Props) => (
  <svg className={className} viewBox="0 0 420 420" fill="none" aria-hidden="true">
    <path d="M10 30c120 10 210 70 250 170s80 170 150 200" stroke="#c9933a" strokeWidth="7" strokeLinecap="round" />
    <path d="M2 44c116 10 202 70 241 168s82 170 154 198" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const ServiceWave = ({ className }: Props) => (
  <svg className={className} viewBox="0 0 1800 800" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 640C220 680 420 690 560 650S760 500 890 490 1050 640 1190 650 1450 620 1560 420 1720 80 1800 40" stroke="#c9933a" strokeWidth="10" strokeLinecap="round" />
    <path d="M0 626C220 666 420 676 556 636S758 486 890 476 1048 626 1186 636 1444 606 1552 406 1714 66 1796 26" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const StepsWave = ({ className }: Props) => (
  <svg className={className} viewBox="0 0 1412 306" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 160c120 40 230 160 340 140S500 30 700 26s250 270 360 270 230-120 352-160" stroke="#e8cf9f" strokeWidth="6" strokeLinecap="round" />
    <path d="M0 170c120 40 230 160 340 140S500 40 700 36s250 270 360 270 230-120 352-160" stroke="#c9933a" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CtaWave = ({ className }: Props) => (
  <svg className={className} viewBox="0 0 280 520" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <path d="M270 20c-90 0-130 60-110 150s40 170-20 240S20 480 0 510" stroke="#c9933a" strokeWidth="10" strokeLinecap="round" />
    <path d="M282 34c-86 0-124 58-104 146s38 170-24 238S34 492 14 522" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const SideWave = ({ className }: Props) => (
  <svg className={className} viewBox="0 0 360 700" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 80c140 20 220 110 160 220S20 470 120 560s170 90 240 120" stroke="#c9933a" strokeWidth="8" strokeLinecap="round" />
    <path d="M0 96c136 20 212 108 152 216S12 482 112 572s170 90 248 120" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
  </svg>
);
