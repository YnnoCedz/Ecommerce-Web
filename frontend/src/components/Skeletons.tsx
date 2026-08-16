import React from "react";

export function Sk({
  w = "100%", h = 14, pill = false, className = "",
}: {
  w?: string | number; h?: number; pill?: boolean; className?: string;
}) {
  return (
    <div
      className={`skeleton ${pill ? "rounded-full" : "rounded-sm"} shrink-0 ${className}`}
      style={{
        width: typeof w === "number" ? `${w}px` : w,
        height: `${h}px`,
      }}
    />
  );
}

export function SkLine({ w = "100%", h = 13 }: { w?: string | number; h?: number }) {
  return <Sk w={w} h={h} />;
}

export function SkCircle({ size = 36 }: { size?: number }) {
  return <Sk w={size} h={size} pill />;
}

export function SkText({ lines = 3, lastWidth = "55%" }: { lines?: number; lastWidth?: string }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} w={i === lines - 1 ? lastWidth : "100%"} h={13} />
      ))}
    </div>
  );
}

export function SkProductCard({ imageH = 200 }: { imageH?: number }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm overflow-hidden">
      <Sk w="100%" h={imageH} className="rounded-none" />
      <div className="p-3 space-y-2">
        <Sk w="85%" h={12} />
        <Sk w="65%" h={11} />
        <div className="flex items-center justify-between pt-1.5">
          <Sk w={56} h={16} />
          <Sk w={36} h={10} />
        </div>
      </div>
    </div>
  );
}

export function SkTableRow({ cols = 5, heights }: { cols?: number; heights?: number[] }) {
  const colWidths = ["18%", "15%", "20%", "15%", "12%", "12%", "8%"];
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
      {Array.from({ length: cols }).map((_, i) => (
        <Sk key={i} w={colWidths[i] ?? "15%"} h={heights?.[i] ?? 12} />
      ))}
    </div>
  );
}

export function SkCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[var(--color-border)] rounded-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

export function SkKpiCard() {
  return (
    <SkCard>
      <Sk w="50%" h={10} className="mb-3" />
      <Sk w="60%" h={28} className="mb-2" />
      <Sk w="75%" h={10} className="mb-4" />
      <Sk w="100%" h={36} />
    </SkCard>
  );
}

export function SkAvatar({ size = 36 }: { size?: number }) {
  return <SkCircle size={size} />;
}

export function SkConversationRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border-subtle)]">
      <SkCircle size={40} />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Sk w="45%" h={12} />
          <Sk w={32} h={10} />
        </div>
        <Sk w="75%" h={11} />
      </div>
    </div>
  );
}

export function SkMessageBubble({ align = "left", width = "60%" }: { align?: "left" | "right"; width?: string }) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"} mb-3`}>
      {align === "left" && <SkCircle size={28} />}
      <div className={`${align === "left" ? "ml-2" : "mr-2"}`}>
        <Sk w={width} h={44} className={align === "right" ? "rounded-sm" : "rounded-sm"} />
        <Sk w="30%" h={9} className="mt-1" />
      </div>
      {align === "right" && <SkCircle size={28} />}
    </div>
  );
}
