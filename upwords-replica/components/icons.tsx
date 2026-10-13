type P = { size?: number; className?: string };

export const ArrowUpRight = ({ size = 20, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path d="M6 14 14 6M7.5 6H14v6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRight = ({ size = 20, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowLeft = ({ size = 20, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusMinus = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 1v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: "center", transform: open ? "scaleY(0)" : "scaleY(1)", transition: "transform .3s" }} />
  </svg>
);

/** Small rising-bars mark used inside the hero headline (echoes the Clarivyn logo). */
export const Summit = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="5" y="18" width="4" height="8" rx="1.2" fill="#0d2440" opacity="0.55" />
    <rect x="11" y="14" width="4" height="12" rx="1.2" fill="#0d2440" opacity="0.75" />
    <rect x="17" y="10" width="4" height="16" rx="1.2" fill="#0d2440" />
    <rect x="23" y="5" width="4" height="21" rx="1.2" fill="#0d2440" />
    <path d="M6 16 25 4" stroke="#0d2440" strokeWidth="1.4" strokeDasharray="2 2" />
  </svg>
);

/** Four-point sparkle used between ribbon items. */
export const Sparkle = ({ size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M13 0c1 6.5 6.5 12 13 13-6.5 1-12 6.5-13 13-1-6.5-6.5-12-13-13C6.5 12 12 6.5 13 0Z" fill="#c9933a" />
  </svg>
);

export const QuoteMark = () => (
  <svg width="48" height="34" viewBox="0 0 48 34" fill="none" aria-hidden="true">
    <path d="M0 34V20.5C0 9.8 5.7 2.8 17 0l2 5.2c-6 2-9 5.8-9.4 11.3H19V34H0Zm29 0V20.5C29 9.8 34.7 2.8 46 0l2 5.2c-6 2-9 5.8-9.4 11.3H48V34H29Z" fill="currentColor" />
  </svg>
);

export const MenuIcon = ({ open }: { open: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {open ? (
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    ) : (
      <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

export const Mail = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="5" y="9" width="30" height="22" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="m6 11 14 11 14-11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const Phone = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M12.5 6h-5A1.5 1.5 0 0 0 6 7.6C6.8 22 18 33.2 32.4 34a1.5 1.5 0 0 0 1.6-1.5v-5a1.5 1.5 0 0 0-1.1-1.4l-5.6-1.6a1.5 1.5 0 0 0-1.5.4l-2.4 2.4a20 20 0 0 1-9.7-9.7l2.4-2.4c.4-.4.5-1 .4-1.5L14 7.1A1.5 1.5 0 0 0 12.5 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const valuePaths: Record<string, React.ReactNode> = {
  ear: <path d="M8 10a6 6 0 1 1 12 0c0 3-2.5 4-3.5 6S15 20 12.5 20 9 18 9 16M12 10a2 2 0 1 1 4 0" stroke="#1d1d1d" strokeWidth="1.6" strokeLinecap="round" />,
  map: <path d="M4 7l6-2 8 3 6-2v16l-6 2-8-3-6 2V7Zm6-2v16m8-13v16" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round" />,
  people: <path d="M10 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c0-3.3 2.7-6 6-6s6 2.7 6 6m1-15.5a3 3 0 0 1 0 6M20 16c2.3.6 4 2.8 4 5.5" stroke="#1d1d1d" strokeWidth="1.6" strokeLinecap="round" />,
  target: <path d="M14 24a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-5a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" stroke="#1d1d1d" strokeWidth="1.6" />,
  pill: <path d="M9.5 18.5 18.5 9.5a4.2 4.2 0 0 0-6-6L3.5 12.5a4.2 4.2 0 0 0 6 6ZM8 8l6 6" stroke="#1d1d1d" strokeWidth="1.6" strokeLinecap="round" transform="translate(3 3)" />,
  cap: <path d="M2 11 14 5l12 6-12 6-12-6Zm5 2.5V19c0 1.5 3 3 7 3s7-1.5 7-3v-5.5M26 11v6" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round" />,
  school: <path d="M4 24h20M6 24V12m16 12V12M3 12 14 5l11 7H3Zm8 12v-6h6v6" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round" />,
  book: <path d="M4 6c3-1 7-1 10 1v16c-3-2-7-2-10-1V6Zm20 0c-3-1-7-1-10 1v16c3-2 7-2 10-1V6Z" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round" />,
  layers: <path d="m14 4 10 5-10 5-10-5 10-5Zm-10 10 10 5 10-5M4 19l10 5 10-5" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round" />,
  play: <path d="M14 25a11 11 0 1 1 0-22 11 11 0 0 1 0 22Zm-2.5-15v8l6.5-4-6.5-4Z" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round" />,
  check: <path d="m6 14 5 5 11-11" stroke="#1d1d1d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
};

export const ValueIcon = ({ name }: { name: string }) => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    {valuePaths[name]}
  </svg>
);

export const SocialIcon = ({ name }: { name: string }) => {
  switch (name) {
    case "whatsapp":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 8.5V6.8c0-.8.5-1.3 1.3-1.3H17V2h-2.6C11.6 2 10.5 3.8 10.5 6.4v2.1H8V12h2.5v10H14V12h2.6l.4-3.5h-3Z" fill="currentColor" />
        </svg>
      );
    case "instagram":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h5.2l4.5 6.2L18.2 3H21l-7 8 7.5 10h-5.2l-4.9-6.6L5.4 21H2.6l7.6-8.6L3 3Z" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h3.6v12H4V9Zm1.8-6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2ZM10 9h3.4v1.7c.5-.9 1.7-2 3.6-2 3.8 0 4.5 2.5 4.5 5.7V21H18v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H10V9Z" fill="currentColor" />
        </svg>
      );
  }
};
