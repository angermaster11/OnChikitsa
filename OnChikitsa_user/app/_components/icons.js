// Lightweight inline SVG icons (Lucide-style stroke). No emoji, no icon deps.
function Svg({ size = 24, children, fill = 'none', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Cross = (p) => (
  <Svg {...p}>
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
  </Svg>
);
export const Stethoscope = (p) => (
  <Svg {...p}>
    <path d="M4 3v6a5 5 0 0 0 10 0V3" />
    <path d="M6 3H4M14 3h-2" />
    <path d="M9 14v3a5 5 0 0 0 10 0v-2" />
    <circle cx="20" cy="10" r="2" />
  </Svg>
);
export const Calendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);
export const FileHeart = (p) => (
  <Svg {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 18c2.5-1.7 3.5-3 3.5-4.2A1.6 1.6 0 0 0 12 12.8a1.6 1.6 0 0 0-3.5 1c0 1.2 1 2.5 3.5 4.2z" />
  </Svg>
);
export const Pill = (p) => (
  <Svg {...p}>
    <path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7z" />
    <path d="M8.5 8.5l7 7" />
  </Svg>
);
export const Home = (p) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Svg>
);
export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);
export const Bell = (p) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
  </Svg>
);
export const Search = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4-4" />
  </Svg>
);
export const Star = (p) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9z" />
  </Svg>
);
export const MapPin = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);
export const Clock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const ArrowRight = (p) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const HeartPulse = (p) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.6-7-10a4.2 4.2 0 0 1 7-3 4.2 4.2 0 0 1 7 3c0 5.4-7 10-7 10z" />
    <path d="M3.5 12h3l1.5-2.5L10 15l2-6 1.5 3H20" />
  </Svg>
);
export const Shield = (p) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
    <path d="M9.5 12l1.8 1.8 3.4-3.6" />
  </Svg>
);
export const Flask = (p) => (
  <Svg {...p}>
    <path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19L14 9V3" />
    <path d="M7.5 15h9" />
  </Svg>
);
export const Building = (p) => (
  <Svg {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 8h1M14 8h1M9 12h1M14 12h1M10 21v-3h4v3" />
  </Svg>
);
export const Emergency = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </Svg>
);
export const Newspaper = (p) => (
  <Svg {...p}>
    <path d="M4 5h13v14a2 2 0 0 1-2 2H5a2 2 0 0 1-1-1.7z" />
    <path d="M17 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
    <path d="M7 8h6M7 12h6M7 16h4" />
  </Svg>
);
export const ChevronRight = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const ChevronLeft = (p) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);
export const ChevronDown = (p) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const AlertCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </Svg>
);
export const Phone = (p) => (
  <Svg {...p}>
    <path d="M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.3a1 1 0 0 0-.8-1l-3.6-.7a1 1 0 0 0-1 .4l-1 1.4a12 12 0 0 1-5.1-5.1l1.4-1a1 1 0 0 0 .4-1L10.3 4.8a1 1 0 0 0-1-.8H7a3 3 0 0 0-3 3z" />
  </Svg>
);
export const Mail = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M4 7l8 6 8-6" />
  </Svg>
);
export const Check = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const CheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.2l2.4 2.4L15.8 9.5" />
  </Svg>
);
export const Ticket = (p) => (
  <Svg {...p}>
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2 2 2 0 0 0 0-4" />
    <path d="M4 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
    <path d="M13 6v12" strokeDasharray="2 2" />
  </Svg>
);
export const Ruler = (p) => (
  <Svg {...p}>
    <rect x="3" y="8" width="18" height="8" rx="2" />
    <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
  </Svg>
);
export const Weight = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="6" r="2.5" />
    <path d="M6.5 9h11l2 11H4.5z" />
  </Svg>
);
export const Plus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const Navigation = (p) => (
  <Svg {...p}>
    <path d="M21 4L3 11l7 2.5L12.5 21z" />
  </Svg>
);
export const Baby = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="9" r="4" />
    <path d="M9.5 8.5h.01M14.5 8.5h.01M10 11a3 3 0 0 0 4 0" />
    <path d="M6 21a6 6 0 0 1 12 0" />
  </Svg>
);
export const Tooth = (p) => (
  <Svg {...p}>
    <path d="M12 3c-2 0-3 1-4.5 1S5 3 4.5 4.5 4 9 5 13s1.2 6 2.3 6 1-3 2.2-3 1 3 2.5 3 1.3-2 2.3-6 1-7 .5-8.5S15 5 13.5 5 14 3 12 3z" />
  </Svg>
);
export const Google = (p) => (
  <Svg {...p} fill="none" stroke="none">
    <path fill="#EA4335" d="M12 10.8v3.6h5.05a4.32 4.32 0 0 1-1.87 2.83l3.02 2.34C19.95 17.9 21 15.2 21 12.05c0-.7-.06-1.37-.18-2.02z" transform="translate(0 0)" />
    <path fill="#4285F4" d="M12 21c2.43 0 4.47-.8 5.96-2.18l-3.02-2.34c-.84.56-1.9.9-2.94.9-2.26 0-4.18-1.53-4.87-3.58l-3.12 2.4A9 9 0 0 0 12 21z" />
    <path fill="#FBBC05" d="M7.13 13.8A5.4 5.4 0 0 1 6.85 12c0-.62.1-1.23.28-1.8l-3.12-2.4A9 9 0 0 0 3 12c0 1.46.35 2.83.96 4.05z" />
    <path fill="#34A853" d="M12 6.62c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 3.96 7.95l3.17 2.45C7.82 8.15 9.74 6.62 12 6.62z" />
  </Svg>
);
export const Facebook = (p) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M14 8.5h2V6h-2c-2 0-3 1.2-3 3v1.5H9V13h2v6h2.5v-6H16l.5-2.5H13.5V9c0-.4.2-.5.5-.5z" />
  </Svg>
);
export const Apple = (p) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M16.4 12.6c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.5 2 1 0 1.3-.6 2.5-.6s1.5.6 2.6.6 1.7-.9 2.4-1.9c.7-1.1 1-2.1 1-2.2-.1 0-2-.8-2-3zM14.5 6.2c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z" />
  </Svg>
);
export const Grid = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </Svg>
);
export const Sparkles = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z" />
    <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </Svg>
);
export const Eye = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const Ear = (p) => (
  <Svg {...p}>
    <path d="M6 8.5a6 6 0 0 1 12 0c0 3-2.4 4.2-3.8 5.6C13 15.3 13 16.5 13 18a3 3 0 0 1-6 0" />
    <path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 1.4-1.3 2-2.2 2.8" />
  </Svg>
);
export const Bone = (p) => (
  <Svg {...p}>
    <path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5z" />
  </Svg>
);
export const Brain = (p) => (
  <Svg {...p}>
    <path d="M9.5 4A2.5 2.5 0 0 0 7 6.5 2.5 2.5 0 0 0 5 11v.5A2.5 2.5 0 0 0 6.5 16 2.5 2.5 0 0 0 9.5 20 2 2 0 0 0 12 18V5.5A1.5 1.5 0 0 0 9.5 4z" />
    <path d="M14.5 4A2.5 2.5 0 0 1 17 6.5 2.5 2.5 0 0 1 19 11v.5A2.5 2.5 0 0 1 17.5 16 2.5 2.5 0 0 1 14.5 20 2 2 0 0 1 12 18" />
  </Svg>
);
export const Activity = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Svg>
);
export const Leaf = (p) => (
  <Svg {...p}>
    <path d="M11 20A7 7 0 0 1 4 13c0-4 3-9 16-9 0 9-5 12-9 12z" />
    <path d="M8 17c1.5-4 4.5-6.5 8-8" />
  </Svg>
);
export const Syringe = (p) => (
  <Svg {...p}>
    <path d="M18 2l4 4M17.5 6.5l-3-3M14 6l4 4-8.5 8.5a2.1 2.1 0 0 1-3-3z" />
    <path d="M9 11l2 2M6.5 13.5l2 2M5 15l-3 3" />
  </Svg>
);
export const Compass = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" />
  </Svg>
);
export const History = (p) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 8v4l3 2" />
  </Svg>
);
export const Heart = (p) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.6-7-10a4.2 4.2 0 0 1 7-3 4.2 4.2 0 0 1 7 3c0 5.4-7 10-7 10z" />
  </Svg>
);
export const Trophy = (p) => (
  <Svg {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" />
    <path d="M10 13v3M14 13v3M9 20h6M9 20a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
  </Svg>
);
export const ArrowLeft = (p) => (
  <Svg {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Svg>
);
export const Briefcase = (p) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
    <path d="M3 12h18" />
  </Svg>
);
export const X = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const MessageCircle = (p) => (
  <Svg {...p}>
    <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-4.9A7.5 7.5 0 1 1 20 11.5z" />
  </Svg>
);
export const Clipboard = (p) => (
  <Svg {...p}>
    <rect x="5" y="5" width="14" height="16" rx="2" />
    <rect x="9" y="3" width="6" height="4" rx="1.2" />
    <path d="M9 12h6M9 16h4" />
  </Svg>
);
export const Settings = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
export const LifeBuoy = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M4.9 4.9l4.6 4.6M14.5 14.5l4.6 4.6M14.5 9.5l4.6-4.6M4.9 19.1l4.6-4.6" />
  </Svg>
);
export const Globe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </Svg>
);
export const LogOut = (p) => (
  <Svg {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l5-5-5-5M15 12H3" />
  </Svg>
);
