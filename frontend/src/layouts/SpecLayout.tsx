import { useNavigate, useParams, Navigate } from "react-router";
import { Tag } from "../shared";
import Part01 from "../Part01";
import Part02 from "../Part02";
import Part03 from "../Part03";
import Part04 from "../Part04";
import Part05 from "../Part05";
import Part06 from "../Part06";
import Part07 from "../Part07";
import Part08 from "../Part08";
import Part09 from "../Part09";
import Part10 from "../Part10";
import Part11 from "../Part11";
import Part12 from "../Part12";
import Part13 from "../Part13";
import Part14 from "../Part14";
import Part15 from "../Part15";

const PARTS = [
  { id: "01", label: "Project Foundation",     sublabel: "Scope · Roles · Principles" },
  { id: "02", label: "IA & User Flows",         sublabel: "Sitemap · Routes · Flows · Permissions" },
  { id: "03", label: "Design System",           sublabel: "Tokens · Typography · Components" },
  { id: "04", label: "Global Shells",           sublabel: "Public · Seller · Admin" },
  { id: "05", label: "Public Storefront",       sublabel: "Home · Category · Search · Product · Seller" },
  { id: "06", label: "Auth & Account",          sublabel: "Login · Register · Profile · Security" },
  { id: "07", label: "Buyer Experience",        sublabel: "Cart · Wishlist · Product · Dashboard · Reviews" },
  { id: "08", label: "Checkout & Orders",       sublabel: "Checkout · Payment · Orders · Tracking · Seller · Admin" },
  { id: "09", label: "Messaging & Notifications", sublabel: "Messages · Notifications · Reporting" },
  { id: "10", label: "Seller Platform",         sublabel: "Onboarding · Dashboard · Products · Inventory · Orders · Analytics" },
  { id: "11", label: "Admin Platform",          sublabel: "Dashboard · Users · Sellers · Products · Orders · Categories · Moderation · Analytics" },
  { id: "12", label: "States & Edge Cases",     sublabel: "Loading · Empty · Errors · Seller · Orders · Account" },
  { id: "13", label: "Responsive Design",       sublabel: "Mobile · Tablet · Desktop · Patterns" },
  { id: "14", label: "Accessibility & UX",      sublabel: "WCAG · UX · Consistency · Trust · Conversion" },
  { id: "15", label: "Final QA",                sublabel: "Visual · Component · Page · Role · Multi-vendor · Routing" },
];

const PART_COMPONENTS: Record<string, React.ComponentType> = {
  "01": Part01, "02": Part02, "03": Part03, "04": Part04, "05": Part05,
  "06": Part06, "07": Part07, "08": Part08, "09": Part09, "10": Part10,
  "11": Part11, "12": Part12, "13": Part13, "14": Part14, "15": Part15,
};

const FULLSCREEN_PARTS = new Set(["04","05","06","07","08","09","10","11","12","13","14","15"]);

export default function SpecLayout() {
  const { partId = "01" } = useParams<{ partId: string }>();
  const navigate = useNavigate();

  if (!PART_COMPONENTS[partId]) return <Navigate to="/spec/01" replace />;

  const isFullscreen = FULLSCREEN_PARTS.has(partId);
  const PartComponent = PART_COMPONENTS[partId];

  return (
    <div className={`bg-[var(--color-ground)] ${isFullscreen ? "h-screen flex flex-col overflow-hidden" : "min-h-screen"}`}>
      {/* Spec header */}
      <header className="sticky top-0 z-20 bg-[var(--color-navy)] text-white shrink-0">
        <div className="px-6 py-2.5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="font-[var(--font-mono)] text-[11px] tracking-widest text-white font-[500] hover:text-white/80 cursor-pointer">
              MARKETPLACE·OS
            </button>
            <span className="text-white/20">|</span>
            <span className="text-xs font-[var(--font-body)] font-[300] text-white/60">Design System — Web Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 hover:text-white cursor-pointer transition-colors border border-white/20 hover:border-white/40 px-3 py-1 rounded-sm">
              <span>↗</span> Live App
            </button>
            <span className="font-[var(--font-mono)] text-[10px] text-white/30 hidden sm:block">REV 2026-08-15</span>
          </div>
        </div>

        {/* Part switcher */}
        <div className="flex px-4 overflow-x-auto">
          {PARTS.map((part) => (
            <button
              key={part.id}
              onClick={() => navigate(`/spec/${part.id}`)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                partId === part.id
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white/70 hover:border-white/30"
              }`}
            >
              <span className={`font-[var(--font-mono)] text-[10px] tracking-wider px-1.5 py-0.5 rounded ${partId === part.id ? "bg-white/20" : "bg-white/5"}`}>
                {part.id}
              </span>
              <span className="font-[500] hidden sm:inline">{part.label}</span>
              <span className="text-[10px] text-white/40 hidden lg:inline">— {part.sublabel}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center pb-1 pr-1 shrink-0">
            <Tag color="muted">DESIGN SPEC</Tag>
          </div>
        </div>
      </header>

      <div className={isFullscreen ? "flex-1 overflow-hidden" : ""}>
        <PartComponent />
      </div>
    </div>
  );
}
