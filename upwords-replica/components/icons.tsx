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

/** Small mountain-and-flag mark used inside the hero headline. */
export const Summit = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M3 26 12.5 11l5 7.5L21 13l8 13H3Z" fill="#245333" />
    <path d="M21 13V4.5l6 2.5-6 2.5" stroke="#245333" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/** Four-point sparkle used between ribbon items. */
export const Sparkle = ({ size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <path d="M13 0c1 6.5 6.5 12 13 13-6.5 1-12 6.5-13 13-1-6.5-6.5-12-13-13C6.5 12 12 6.5 13 0Z" fill="#bbfd6a" />
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
};

export const ValueIcon = ({ name }: { name: string }) => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    {valuePaths[name]}
  </svg>
);

export const SocialIcon = ({ name }: { name: string }) => {
  switch (name) {
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
