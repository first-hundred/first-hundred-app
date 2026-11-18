export function IntentBadge({ score }: { score: number }) {
  const [label, cls] =
    score >= 80 ? ["Hot", "bg-ink text-white ring-ink"]
    : score >= 50 ? ["Warm", "bg-stock text-ink ring-stock"]
    : ["Cool", "bg-screen text-grain ring-rule"];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
      {label} <span className="tabular-nums opacity-70">{score}</span>
    </span>
  );
}

export function SourcePill({ source, community, role }: { source: string; community?: string; role?: string }) {
  const cls = source === "event" ? "border border-ink text-ink" : "border border-rule text-grain";
  const text = source === "event" ? `${role ? role[0].toUpperCase() + role.slice(1) + " · " : ""}${community ?? "Event"}` : community ?? source;
  return <span className={`max-w-[260px] truncate rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  const initials = name.split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return src ? (
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-1 ring-rule" style={{ width: size, height: size }} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ width: size, height: size, background: `hsl(${h} 45% 45%)` }}>{initials || "?"}</div>
  );
}

export function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}
