import { useState } from "react";

type UserRole = "buyer" | "seller" | "admin";
type UserStatus = "active" | "suspended" | "banned" | "pending";

type User = {
  id: string; name: string; email: string; mobile: string;
  role: UserRole; status: UserStatus; joinedDate: string;
  lastActive: string; orders: number; totalSpent: number; location: string;
  verified: boolean; flags: number;
};

const STATUS_CFG: Record<UserStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "var(--color-green)",  bg: "var(--color-green-light)" },
  suspended: { label: "Suspended", color: "var(--color-amber)",  bg: "var(--color-amber-light)" },
  banned:    { label: "Banned",    color: "var(--color-red)",    bg: "var(--color-red-light)"   },
  pending:   { label: "Pending",   color: "var(--color-navy)",   bg: "var(--color-navy-surface)" },
};

const ROLE_CFG: Record<UserRole, { label: string; color: string }> = {
  buyer:  { label: "Buyer",  color: "var(--color-ink-muted)" },
  seller: { label: "Seller", color: "var(--color-amber)"     },
  admin:  { label: "Admin",  color: "var(--color-violet)"    },
};

const USERS: User[] = [
  { id: "u001", name: "Ana Reyes",         email: "ana.reyes@email.com",       mobile: "+63 917 000 0001", role: "buyer",  status: "active",    joinedDate: "Oct 12, 2025", lastActive: "Today",        orders: 8,  totalSpent: 14240, location: "Makati",      verified: true,  flags: 0 },
  { id: "u002", name: "Maria Santos",      email: "maria@verdebotanics.com",   mobile: "+63 917 000 0002", role: "seller", status: "active",    joinedDate: "Jan 5, 2026",  lastActive: "Today",        orders: 0,  totalSpent: 0,     location: "Pasig",       verified: true,  flags: 0 },
  { id: "u003", name: "Carlos Mendoza",    email: "c.mendoza@email.com",       mobile: "+63 918 000 0003", role: "buyer",  status: "active",    joinedDate: "Jan 15, 2026", lastActive: "Aug 12",       orders: 5,  totalSpent: 8750,  location: "QC",          verified: true,  flags: 0 },
  { id: "u004", name: "Jonas Bautista",    email: "jbautista@email.com",       mobile: "+63 919 000 0004", role: "buyer",  status: "suspended", joinedDate: "Mar 2, 2026",  lastActive: "Aug 10",       orders: 2,  totalSpent: 1200,  location: "Pasay",       verified: true,  flags: 2 },
  { id: "u005", name: "Ramon Cruz",        email: "rcruz.fake@email.com",      mobile: "+63 920 000 0005", role: "buyer",  status: "banned",    joinedDate: "Jun 1, 2026",  lastActive: "Aug 3",        orders: 0,  totalSpent: 0,     location: "Unknown",     verified: false, flags: 5 },
  { id: "u006", name: "Sofia Villanueva",  email: "sofia.v@email.com",         mobile: "+63 921 000 0006", role: "buyer",  status: "active",    joinedDate: "Apr 20, 2026", lastActive: "Yesterday",    orders: 12, totalSpent: 22400, location: "Taguig",      verified: true,  flags: 0 },
  { id: "u007", name: "Lena Tan",          email: "lena.t@email.com",          mobile: "+63 922 000 0007", role: "seller", status: "pending",   joinedDate: "Aug 14, 2026", lastActive: "Today",        orders: 0,  totalSpent: 0,     location: "Marikina",    verified: false, flags: 0 },
  { id: "u008", name: "Eric Perez",        email: "e.perez@email.com",         mobile: "+63 923 000 0008", role: "buyer",  status: "active",    joinedDate: "Feb 14, 2026", lastActive: "Aug 8",        orders: 3,  totalSpent: 4100,  location: "Las Piñas",   verified: true,  flags: 0 },
  { id: "u009", name: "Admin User",        email: "admin@marketo.ph",          mobile: "+63 900 000 0001", role: "admin",  status: "active",    joinedDate: "Jan 1, 2024",  lastActive: "Today",        orders: 0,  totalSpent: 0,     location: "Marketo HQ",  verified: true,  flags: 0 },
];

const ACTIVITY_LOG = [
  { time: "Aug 15 at 2:34 PM", event: "Account suspended", actor: "Admin", note: "Multiple chargeback disputes" },
  { time: "Aug 14 at 9:10 AM", event: "Password changed", actor: "System", note: "User-initiated" },
  { time: "Aug 10 at 6:45 PM", event: "Order placed — ORD-2870", actor: "User", note: "₱1,200" },
  { time: "Aug 3 at 3:22 PM",  event: "Report filed against account", actor: "System", note: "Report RPT-100480" },
];

type ActionType = "suspend" | "ban" | "restore" | "message" | "none";

function UserDetailPanel({ user, onClose }: { user: User; onClose: () => void }) {
  const [action, setAction] = useState<ActionType>("none");
  const [note, setNote] = useState("");
  const stCfg = STATUS_CFG[user.status];
  const roleCfg = ROLE_CFG[user.role];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-navy)] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-[500]">{user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-[600] text-[var(--color-ink)]">{user.name}</p>
              {user.flags > 0 && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1.5 py-0.5 rounded">{user.flags} flags</span>}
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">{user.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer shrink-0 p-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status & role */}
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex flex-wrap gap-3">
          <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded" style={{ color: stCfg.color, background: stCfg.bg }}>{stCfg.label}</span>
          <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)]" style={{ color: roleCfg.color }}>{roleCfg.label}</span>
          {user.verified && <span className="font-[var(--font-mono)] text-[9px] px-2 py-1 rounded bg-[var(--color-green-light)] text-[var(--color-green)]">✓ Verified</span>}
        </div>

        {/* Key info */}
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] space-y-2">
          {[
            ["User ID", user.id],
            ["Mobile", user.mobile],
            ["Location", user.location],
            ["Joined", user.joinedDate],
            ["Last active", user.lastActive],
            ["Orders", `${user.orders}`],
            ["Total spent", user.totalSpent > 0 ? `₱${user.totalSpent.toLocaleString()}` : "—"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-xs text-[var(--color-ink-muted)]">{l}</span>
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{v}</span>
            </div>
          ))}
        </div>

        {/* Admin actions */}
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Admin actions</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {user.status !== "suspended" && user.status !== "banned" && (
              <button onClick={() => setAction("suspend")} className="py-2 text-xs font-[500] border border-[var(--color-amber-border)] text-[var(--color-amber)] rounded-sm hover:bg-[var(--color-amber-light)] cursor-pointer">Suspend</button>
            )}
            {user.status !== "banned" && (
              <button onClick={() => setAction("ban")} className="py-2 text-xs font-[500] border border-[var(--color-red-border)] text-[var(--color-red)] rounded-sm hover:bg-[var(--color-red-light)] cursor-pointer">Ban</button>
            )}
            {(user.status === "suspended" || user.status === "banned") && (
              <button onClick={() => setAction("restore")} className="py-2 text-xs font-[500] border border-[var(--color-green-border)] text-[var(--color-green)] rounded-sm hover:bg-[var(--color-green-light)] cursor-pointer">Restore access</button>
            )}
            <button onClick={() => setAction("message")} className="py-2 text-xs font-[500] border border-[var(--color-border)] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Send notice</button>
          </div>
          {action !== "none" && (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder={`Reason for ${action}...`}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-navy)] resize-none font-[var(--font-body)]"
              />
              <div className="flex gap-2">
                <button onClick={() => setAction("none")} className="flex-1 py-1.5 border border-[var(--color-border)] text-xs text-[var(--color-ink-muted)] rounded-sm cursor-pointer">Cancel</button>
                <button className={`flex-1 py-1.5 text-xs font-[500] text-white rounded-sm cursor-pointer ${action === "ban" ? "bg-[var(--color-red)]" : action === "restore" ? "bg-[var(--color-green)]" : "bg-[var(--color-navy)]"}`}>Confirm {action}</button>
              </div>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="px-5 py-4">
          <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">Activity log</p>
          <div className="space-y-3">
            {ACTIVITY_LOG.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-[500] text-[var(--color-ink)]">{e.event}</p>
                    <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)] shrink-0">{e.time}</span>
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)]">{e.actor} · {e.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>(USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase()) && !u.id.includes(search)) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    return true;
  });

  const toggleCheck = (id: string) => setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setCheckedIds(checkedIds.length === filtered.length ? [] : filtered.map(u => u.id));

  const statusCounts: Record<string, number> = { all: users.length };
  users.forEach(u => { statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1; });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main list */}
      <div className={`flex flex-col ${selected ? "hidden lg:flex lg:flex-1" : "flex-1"} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Users <span className="font-[var(--font-mono)] text-sm text-[var(--color-ink-disabled)]">({users.length})</span></h1>
            <button className="px-3 py-2 bg-[var(--color-navy)] text-white text-xs font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">Export CSV</button>
          </div>
          {/* Search & filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-48 border border-[var(--color-border)] rounded-sm bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-navy)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or ID" className="text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none bg-transparent flex-1 font-[var(--font-body)]" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | "all")} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
              <option value="all">All roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as UserStatus | "all")} className="px-2.5 py-2 border border-[var(--color-border)] rounded-sm text-xs text-[var(--color-ink)] bg-white focus:outline-none cursor-pointer font-[var(--font-body)]">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {/* Status counts */}
          <div className="flex gap-3 mt-2 text-xs text-[var(--color-ink-muted)]">
            {Object.entries(statusCounts).filter(([k]) => k !== "all").map(([s, n]) => (
              <button key={s} onClick={() => setStatusFilter(s as UserStatus)} className={`cursor-pointer hover:text-[var(--color-ink)] ${statusFilter === s ? "text-[var(--color-navy)] font-[500]" : ""}`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: STATUS_CFG[s as UserStatus]?.color }} />{s} ({n})
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {checkedIds.length > 0 && (
          <div className="px-5 py-2 bg-[var(--color-navy-surface)] border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
            <span className="text-xs text-[var(--color-navy)] font-[500]">{checkedIds.length} selected</span>
            <button className="text-xs text-[var(--color-amber)] hover:underline cursor-pointer">Suspend all</button>
            <button className="text-xs text-[var(--color-red)] hover:underline cursor-pointer">Ban all</button>
            <button className="text-xs text-[var(--color-ink-muted)] hover:underline cursor-pointer ml-auto" onClick={() => setCheckedIds([])}>Clear selection</button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
              <tr>
                <th className="px-4 py-2.5 w-10"><input type="checkbox" checked={checkedIds.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[var(--color-navy)]" /></th>
                {["User", "Role", "Status", "Joined", "Last active", "Orders", "Flags", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filtered.map((u, i) => {
                const stCfg = STATUS_CFG[u.status];
                const rlCfg = ROLE_CFG[u.role];
                const isChecked = checkedIds.includes(u.id);
                return (
                  <tr key={u.id} onClick={() => setSelected(u)} className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors ${isChecked ? "bg-[var(--color-navy-surface)]" : "hover:bg-[var(--color-surface)]"} ${selected?.id === u.id ? "bg-[var(--color-navy-surface)]" : ""}`}>
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleCheck(u.id); }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(u.id)} className="accent-[var(--color-navy)]" />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-[500] text-[var(--color-ink)]">{u.name}</p>
                        <p className="text-[10px] text-[var(--color-ink-muted)]">{u.email}</p>
                        <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{u.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]" style={{ color: rlCfg.color }}>{rlCfg.label}</span></td>
                    <td className="px-4 py-3"><span className="font-[var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded" style={{ color: stCfg.color, background: stCfg.bg }}>{stCfg.label}</span></td>
                    <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)] whitespace-nowrap">{u.joinedDate}</td>
                    <td className="px-4 py-3 text-[10px] text-[var(--color-ink-muted)]">{u.lastActive}</td>
                    <td className="px-4 py-3 font-[var(--font-mono)] text-xs text-[var(--color-ink-muted)]">{u.orders}</td>
                    <td className="px-4 py-3">
                      {u.flags > 0 && <span className="font-[var(--font-mono)] text-[9px] bg-[var(--color-red-light)] text-[var(--color-red)] px-1.5 py-0.5 rounded">{u.flags}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setSelected(u); }} className="text-[10px] text-[var(--color-navy)] hover:underline cursor-pointer">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-[var(--color-ink-muted)]">No users match this search.</div>}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col overflow-hidden">
          <UserDetailPanel user={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
