export function Tag({ children, color = "navy" }: { children: React.ReactNode; color?: "navy" | "amber" | "green" | "red" | "violet" | "muted" }) {
  const styles: Record<string, string> = {
    navy: "bg-[#E0EAF4] text-[#1A3550] border-[#B8CEDF]",
    amber: "bg-[#F5E8D0] text-[#7A4E14] border-[#D9BC8A]",
    green: "bg-[#D8EDD6] text-[#1E5238] border-[#9ECBA0]",
    red: "bg-[#F5DADA] text-[#6B1E1E] border-[#D9A0A0]",
    violet: "bg-[#E8E0F4] text-[#4A3272] border-[#BDB0D6]",
    muted: "bg-[#EFEDE7] text-[#6B6860] border-[#DDD9CE]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-[var(--font-mono)] tracking-wide border rounded ${styles[color]}`}>
      {children}
    </span>
  );
}

export function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-[var(--color-border)]">
      <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-widest shrink-0 pt-1">{num}</span>
      <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] leading-tight">{title}</h2>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[var(--color-border)] rounded-sm p-5 ${className}`}>
      {children}
    </div>
  );
}
