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

/* ── Clinic-app additions ────────────────────────────────────────────────── */
export const ArrowLeft = (p) => (<Svg {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Svg>);
export const X = (p) => (<Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>);
export const ChevronUp = (p) => (<Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>);
export const Users = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.4" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 20a6 6 0 0 0-3-5.2" /></Svg>
);
export const UserPlus = (p) => (
  <Svg {...p}><circle cx="10" cy="8" r="3.6" /><path d="M4 20a6 6 0 0 1 12 0" /><path d="M18 8v6M15 11h6" /></Svg>
);
export const Camera = (p) => (
  <Svg {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.4" /></Svg>
);
export const Upload = (p) => (<Svg {...p}><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /><path d="M12 16V4M7 9l5-5 5 5" /></Svg>);
export const FileText = (p) => (
  <Svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></Svg>
);
export const ClipboardList = (p) => (
  <Svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4M9 10h6M9 14h6M9 18h4" /></Svg>
);
export const CreditCard = (p) => (<Svg {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></Svg>);
export const Wallet = (p) => (
  <Svg {...p}><path d="M4 7a2 2 0 0 1 2-2h11v4" /><path d="M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2z" /><circle cx="16.5" cy="13" r="1.3" fill="currentColor" stroke="none" /></Svg>
);
export const TrendingUp = (p) => (<Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></Svg>);
export const BarChart = (p) => (<Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>);
export const IndianRupee = (p) => (<Svg {...p}><path d="M7 5h10M7 9h10M15 5c0 4-3.5 4-6 4l6 6" /></Svg>);
export const Edit = (p) => (<Svg {...p}><path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3z" /><path d="M13.5 6.5l3 3" /></Svg>);
export const Trash = (p) => (<Svg {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" /></Svg>);
export const Filter = (p) => (<Svg {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z" /></Svg>);
export const MoreHorizontal = (p) => (<Svg {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></Svg>);
export const Settings = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5l1.4 2.6 2.9-.6.4 2.9 2.6 1.4-1.2 2.7 1.2 2.7-2.6 1.4-.4 2.9-2.9-.6L12 21.5l-1.4-2.6-2.9.6-.4-2.9-2.6-1.4 1.2-2.7-1.2-2.7 2.6-1.4.4-2.9 2.9.6z" /></Svg>
);
export const LogOut = (p) => (<Svg {...p}><path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2M10 17l-5-5 5-5M5 12h11" /></Svg>);
export const HelpCircle = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.2 9.5a2.8 2.8 0 0 1 5.3 1.2c0 1.8-2.5 2.3-2.5 3.8M12 17.5h.01" /></Svg>);
export const MessageCircle = (p) => (<Svg {...p}><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 20l1.8-5.2A7.5 7.5 0 1 1 20 11.5z" /></Svg>);
export const MessageSquare = (p) => (<Svg {...p}><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z" /></Svg>);
export const Menu = (p) => (<Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>);
export const Grid = (p) => (<Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>);
export const Play = (p) => (<Svg {...p} fill="currentColor" stroke="none"><path d="M7 5l12 7-12 7z" /></Svg>);
export const Pause = (p) => (<Svg {...p} fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></Svg>);
export const SkipForward = (p) => (<Svg {...p}><path d="M5 5l10 7-10 7zM19 5v14" /></Svg>);
export const RotateCcw = (p) => (<Svg {...p}><path d="M4 5v5h5M4.5 10a8 8 0 1 1-1 5" /></Svg>);
export const RefreshCw = (p) => (<Svg {...p}><path d="M20 9a8 8 0 0 0-14-3L4 8M4 5v3h3M4 15a8 8 0 0 0 14 3l2-2M20 19v-3h-3" /></Svg>);
export const Info = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>);
export const Sun = (p) => (<Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>);
export const Moon = (p) => (<Svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></Svg>);
export const Activity = (p) => (<Svg {...p}><path d="M3 12h4l2.5-6 4 12L16 12h5" /></Svg>);
export const Tag = (p) => (<Svg {...p}><path d="M4 4h7l9 9-7 7-9-9z" /><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" /></Svg>);
export const Bookmark = (p) => (<Svg {...p}><path d="M6 4h12v17l-6-4-6 4z" /></Svg>);
export const Send = (p) => (<Svg {...p}><path d="M21 4L3 11l7 2.5L12.5 21z" /><path d="M21 4L10 13.5" /></Svg>);
export const Percent = (p) => (<Svg {...p}><path d="M19 5L5 19" /><circle cx="7.5" cy="7.5" r="2.2" /><circle cx="16.5" cy="16.5" r="2.2" /></Svg>);
export const Ban = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></Svg>);
export const Download = (p) => (<Svg {...p}><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /><path d="M12 4v12M7 11l5 5 5-5" /></Svg>);
export const Share = (p) => (<Svg {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></Svg>);
export const QrCode = (p) => (<Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h.01M20 17v4" /></Svg>);
export const Video = (p) => (<Svg {...p}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></Svg>);
export const Zap = (p) => (<Svg {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6z" /></Svg>);
export const Copy = (p) => (<Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Svg>);
export const Eye = (p) => (<Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Svg>);
export const EyeOff = (p) => (<Svg {...p}><path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.1-.9M4 4l16 16M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>);
export const Lock = (p) => (<Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>);
export const Globe = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></Svg>);
export const PhoneCall = (p) => (<Svg {...p}><path d="M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.3a1 1 0 0 0-.8-1l-3.6-.7a1 1 0 0 0-1 .4l-1 1.4a12 12 0 0 1-5.1-5.1l1.4-1a1 1 0 0 0 .4-1L10.3 4.8a1 1 0 0 0-1-.8H7a3 3 0 0 0-3 3z" /><path d="M15 4a5 5 0 0 1 5 5" /></Svg>);
export const Award = (p) => (<Svg {...p}><circle cx="12" cy="9" r="5" /><path d="M9 13.5L8 21l4-2 4 2-1-7.5" /></Svg>);
export const Briefcase = (p) => (<Svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></Svg>);
export const Image = (p) => (<Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="M4 18l5-5 4 3 3-3 4 4" /></Svg>);
