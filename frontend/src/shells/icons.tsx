// Minimal SVG icon set for shell navigation

type IconProps = { size?: number; className?: string };

const ico = (path: string, opts?: { fill?: boolean; viewBox?: string }) =>
  ({ size = 18, className = "" }: IconProps) => (
    <svg width={size} height={size} viewBox={opts?.viewBox ?? "0 0 18 18"} fill="none" className={className}
      stroke={opts?.fill ? "none" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} fill={opts?.fill ? "currentColor" : "none"} />
    </svg>
  );

export const IconDashboard    = ico("M2 2h6v6H2zM10 2h6v6h-6zM2 10h6v6H2zM10 10h6v6h-6z");
export const IconProducts     = ico("M3 3h12v2H3zM3 8h12v2H3zM3 13h12v2H3z");
export const IconInventory    = ico("M2 5l7-3 7 3v8l-7 3-7-3zM9 2v14M2 5l7 3 7-3");
export const IconOrders       = ico("M4 4h10l1 10H3zM7 4V3a2 2 0 114 0v1");
export const IconCustomers    = ico("M9 9a3 3 0 100-6 3 3 0 000 6zM3 17a6 6 0 0112 0");
export const IconPromotions   = ico("M9 1l2.2 6.4H17l-5.1 3.7 2 6.4L9 14 5.1 17.5l2-6.4L2 7.4h5.8z");
export const IconAnalytics    = ico("M2 14l4-5 3 3 4-6 3 4");
export const IconMessages     = ico("M2 3h14a1 1 0 011 1v9a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z");
export const IconNotifications = ico("M9 2a5 5 0 015 5v3l1.5 3h-13L4 10V7a5 5 0 015-5zM7 14a2 2 0 004 0");
export const IconStore        = ico("M2 7l7-4 7 4v9H2zM6 16v-5h6v5");
export const IconSettings     = ico("M9 12a3 3 0 100-6 3 3 0 000 6zM9 1v2M9 15v2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M1 9h2M15 9h2M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4");
export const IconUsers        = ico("M13 15a4 4 0 00-8 0M9 8a3 3 0 100-6 3 3 0 000 6zM16 15a3 3 0 00-3-3M2 15a3 3 0 013-3M13 5a2 2 0 012 2");
export const IconSellers      = ico("M2 3h14l-1 10H3zM6 3V2a1 1 0 012 0v1M10 3V2a1 1 0 012 0v1");
export const IconCategories   = ico("M2 2h5v5H2zM11 2h5v5h-5zM2 11h5v5H2zM11 14h5M13.5 11.5v5");
export const IconReports      = ico("M4 2h10a1 1 0 011 1v12l-3-3H4a1 1 0 01-1-1V3a1 1 0 011-1zM7 8h4M7 11h2");
export const IconModeration   = ico("M9 1L2 4v6c0 4 3 7 7 8 4-1 7-4 7-8V4zM6 9l2 2 4-4");
export const IconSearch       = ico("M8 14A6 6 0 108 2a6 6 0 000 12zM16 16l-3-3");
export const IconCart         = ico("M1 2h2.2L5 11h8l2-6H4.5");
export const IconHeart        = ico("M9 15S3 11 3 6.5a3.5 3.5 0 017-0v0a3.5 3.5 0 017 0C17 11 9 15 9 15z");
export const IconMenu         = ico("M2 4.5h14M2 9h14M2 13.5h14");
export const IconClose        = ico("M2 2l14 14M16 2L2 16");
export const IconChevronDown  = ico("M4 7l5 5 5-5");
export const IconChevronRight = ico("M7 4l5 5-5 5");
export const IconChevronLeft  = ico("M11 4L6 9l5 5");
export const IconBell         = ico("M9 2a5 5 0 015 5v3l1.5 3h-13L4 10V7a5 5 0 015-5zM7 14a2 2 0 004 0");
export const IconLogout       = ico("M11 9H2M5 6l-3 3 3 3M11 2h5v14h-5");
export const IconHelp         = ico("M9 1a8 8 0 100 16A8 8 0 009 1zM9 11v1M9 7a2 2 0 011.9 2.5C10.5 10 9 10.5 9 11");
export const IconEye          = ico("M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6zM9 12a3 3 0 100-6 3 3 0 000 6z");
export const IconPlus         = ico("M9 3v12M3 9h12");
export const IconHome         = ico("M2 8l7-6 7 6v9H2zM6 17v-7h6v7");
export const IconTrendUp      = ico("M2 13l4-5 3 3 5-7 3 3");
export const IconBox          = ico("M2 5l7-3 7 3v8l-7 3-7-3zM9 2v14M2 5l7 3 7-3");
