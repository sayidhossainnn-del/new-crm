"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home, LayoutDashboard, BarChart3, Box, LayoutGrid,
  TrendingUp, Users, Star, CreditCard, Search, ChevronDown,
  UserPlus, Download, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronRight, Wallet, Plus, X,
  Trash2, Pencil, Mail, Copy, LogOut, Settings, Check,
  Link2, Send, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid,
} from "recharts";

/* ============================================================================
   STYLE TOKENS
============================================================================ */
const bg = "#08080a";
const panel = "#111114";
const panelBorder = "#212126";
const textMuted = "#8a8a92";
const textFaint = "#5c5c63";

const STATUS_LABEL = { target: "Target", qualify: "Qualify", skip: "Skip" };
const STATUS_COLOR = { target: "#3ddc84", qualify: "#3fa9f5", skip: "#5c5c63" };
const METHOD_LABEL = { dm: "DM", email: "Email" };
const METHOD_COLOR = { dm: "#2d5bff", email: "#8b5cf6" };
const OUTREACH_LABEL = { pending: "Pending", contacted: "Contacted", replied: "Replied", call: "Call Booked", closed: "Closed" };
const OUTREACH_COLOR = { pending: "#5c5c63", contacted: "#3fa9f5", replied: "#f5c93f", call: "#a07dff", closed: "#3ddc84" };

const services = [
  { name: "Meta Ad Creative Package", desc: "5 static + 3 video ad concepts per month, built for DTC jewelry/accessories brands.", price: "$1,500/mo", icon: "🎬" },
  { name: "Loom Audit Video", desc: "Personalized teardown of a prospect's current Meta ad creative, sent cold.", price: "Free (outreach asset)", icon: "🎥" },
  { name: "Concept Pitch Deck", desc: "Custom 3-concept creative pitch built from live Meta Ad Library research.", price: "Included w/ package", icon: "🗂️" },
  { name: "Carousel & UGC Content", desc: "Instagram carousel assets, AI-composited lifestyle shots, testimonial carousels.", price: "$400/mo add-on", icon: "🖼️" },
];

const TARGET_NICHES = [
  "Fine Jewelry", "Statement Jewelry", "Minimalist", "Layered Necklaces", "Everyday Gold",
  "Fashion Apparel", "Skincare & Beauty",
];

const services = [
  { name: "Ana Sundelle", brand: "Sundelle Jewelry", quote: "Our CTR nearly doubled in the first two weeks of new creative.", avatar: "https://i.pravatar.cc/40?img=32" },
  { name: "Reya Cole", brand: "Notbranded", quote: "Flinza actually understands Meta ad fatigue — not just design.", avatar: "https://i.pravatar.cc/40?img=45" },
];

/* ============================================================================
   HELPERS
============================================================================ */
const fmtUSD = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyForm = {
  name: "", ig: "", founder: "", email: "", ads: "", problem: "",
  status: "qualify", method: "dm", outreach: "pending", value: 0, niche: "", paid: false,
};

/* ============================================================================
   SUPABASE-BACKED PROSPECTS HOOK
============================================================================ */
function useProspects(supabase) {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("prospects").select("*").order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else { setProspects(data || []); setErr(""); }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const addProspect = async (form) => {
    const { error } = await supabase.from("prospects").insert([{ ...form, ads: form.ads === "" ? null : Number(form.ads) }]);
    if (error) { setErr(error.message); return false; }
    await refresh();
    return true;
  };
  const updateProspect = async (form) => {
    const { id, created_at, ...rest } = form;
    const { error } = await supabase.from("prospects").update({ ...rest, ads: rest.ads === "" ? null : Number(rest.ads) }).eq("id", id);
    if (error) { setErr(error.message); return false; }
    await refresh();
    return true;
  };
  const deleteProspect = async (id) => {
    const { error } = await supabase.from("prospects").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    setProspects((p) => p.filter((x) => x.id !== id));
  };
  const setStatus = async (id, status) => {
    setProspects((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("prospects").update({ status }).eq("id", id);
    if (error) { setErr(error.message); refresh(); }
  };
  const togglePaid = async (id, paid) => {
    setProspects((p) => p.map((x) => (x.id === id ? { ...x, paid: !paid } : x)));
    const { error } = await supabase.from("prospects").update({ paid: !paid }).eq("id", id);
    if (error) { setErr(error.message); refresh(); }
  };

  return { prospects, loading, err, addProspect, updateProspect, deleteProspect, setStatus, togglePaid, refresh };
}

/* ============================================================================
   SPARKLINE + STAT CARD
============================================================================ */
function Sparkline({ data, color }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={90} height={36}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#grad-${color})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
const sparkUp = [4, 6, 5, 8, 6, 9, 7, 11, 9, 13, 11, 15];
const sparkUp2 = [3, 5, 4, 6, 5, 8, 6, 9, 7, 10, 9, 12];
const sparkDown = [12, 10, 11, 8, 9, 6, 7, 4, 5, 3, 4, 2];

function StatCard({ card }) {
  const Icon = card.icon;
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: card.iconBg }}>
            <Icon size={14} color={card.iconColor} strokeWidth={2.2} />
          </div>
          <span className="text-[13px]" style={{ color: "#c7c7cc" }}>{card.label}</span>
        </div>
        <ArrowUpRight size={14} color={textFaint} style={{ transform: "rotate(45deg)" }} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-semibold text-white tracking-tight">{card.value}</span>
            <span className="text-[11px]" style={{ color: textFaint }}>{card.unit}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {card.up ? <ArrowUpRight size={12} color="#3ddc84" /> : <ArrowDownRight size={12} color="#f5533f" />}
            <span className="text-[11px] font-medium" style={{ color: card.up ? "#3ddc84" : "#f5533f" }}>{card.delta}</span>
          </div>
        </div>
        <Sparkline data={card.spark} color={card.up ? "#3ddc84" : "#f5533f"} />
      </div>
    </div>
  );
}

/* ============================================================================
   DONUT — Pipeline Activity (by real `status` field)
============================================================================ */
function DonutCard({ prospects }) {
  const [range, setRange] = useState("1M");
  const counts = useMemo(() => {
    const c = { target: 0, qualify: 0, skip: 0 };
    prospects.forEach((p) => (c[p.status] = (c[p.status] || 0) + 1));
    return c;
  }, [prospects]);

  const data = [
    { name: "Target", value: counts.target, color: STATUS_COLOR.target },
    { name: "Qualify", value: counts.qualify, color: STATUS_COLOR.qualify },
    { name: "Skip", value: counts.skip, color: STATUS_COLOR.skip },
  ];
  const total = prospects.length;

  return (
    <div className="rounded-2xl p-4 flex flex-col" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1a2e22" }}>
            <BarChart3 size={14} color="#3ddc84" strokeWidth={2.2} />
          </div>
          <span className="text-[13px]" style={{ color: "#c7c7cc" }}>Pipeline Activity</span>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "#1a1a1e" }}>
          {["1W", "1M", "3W", "YTD", "Total"].map((r) => (
            <button key={r} onClick={() => setRange(r)} className="text-[10px] px-2 py-1 rounded-md transition-colors"
              style={{ color: range === r ? "#08080a" : textMuted, background: range === r ? "#ffffff" : "transparent", fontWeight: range === r ? 600 : 400 }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center gap-6 mt-2">
        <div className="relative w-[150px] h-[150px] flex items-center justify-center shrink-0">
          <ResponsiveContainer width={150} height={150}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={52} outerRadius={70} startAngle={90} endAngle={-270} paddingAngle={3} stroke="none" isAnimationActive={false}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[20px] font-bold text-white">{total}</span>
            <span className="text-[10px]" style={{ color: textFaint }}>Total Prospects</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[11.5px]" style={{ color: "#b8b8bd" }}>{d.name}</span>
              </div>
              <span className="text-[11.5px] font-medium text-white">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   OUTREACH FUNNEL BAR CHART (by real `outreach` field)
============================================================================ */
function FunnelTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "#1c1c21", border: "1px solid #2c2c33" }}>
      <div className="text-white font-medium">{p.payload.label}: {p.value}</div>
    </div>
  );
}

function OutreachFunnelCard({ prospects }) {
  const stages = ["pending", "contacted", "replied", "call", "closed"];
  const data = stages.map((s) => ({ stage: s, label: OUTREACH_LABEL[s], count: prospects.filter((p) => p.outreach === s).length }));

  return (
    <div className="rounded-2xl p-4 flex flex-col" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#3a1220" }}>
            <TrendingUp size={14} color="#f6538b" strokeWidth={2.2} />
          </div>
          <span className="text-[13px]" style={{ color: "#c7c7cc" }}>Outreach Funnel</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ left: -20 }}>
          <CartesianGrid vertical={false} stroke="#1c1c21" />
          <XAxis dataKey="label" tick={{ fill: "#5c5c63", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#5c5c63", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<FunnelTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
            {data.map((d, i) => <Cell key={i} fill={OUTREACH_COLOR[d.stage]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================================
   AD VOLUME CARD (real `ads` field — creative-fatigue signal ranking)
============================================================================ */
function AdVolumeCard({ prospects, onViewAll }) {
  const rows = useMemo(() => {
    const withAds = prospects.filter((p) => p.ads != null).sort((a, b) => b.ads - a.ads).slice(0, 5);
    const max = Math.max(...withAds.map((p) => p.ads), 1);
    return withAds.map((p) => ({ ...p, pct: Math.round((p.ads / max) * 100) }));
  }, [prospects]);

  return (
    <div className="rounded-2xl p-4 flex flex-col" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0f2e22" }}>
            <Users size={14} color="#3ddc84" strokeWidth={2.2} />
          </div>
          <span className="text-[13px]" style={{ color: "#c7c7cc" }}>Highest Ad Volume</span>
        </div>
        <button onClick={onViewAll} className="text-[11px] flex items-center gap-1 hover:text-white transition-colors" style={{ color: textMuted }}>
          View All <ChevronRight size={12} />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {rows.length === 0 && <div className="text-[11.5px]" style={{ color: textFaint }}>No ad-volume data logged yet.</div>}
        {rows.map((p) => (
          <div key={p.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#c7c7cc" }}>{p.name}</span>
              <span className="text-[12px] text-white font-medium">{p.ads} <span style={{ color: textFaint }}>active ads</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: "#1c1c21" }}>
              <div className="h-1.5 rounded-full" style={{ width: `${p.pct}%`, background: STATUS_COLOR[p.status] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   BADGES
============================================================================ */
function StatusBadge({ status }) {
  return (
    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ color: STATUS_COLOR[status], background: `${STATUS_COLOR[status]}22` }}>
      {STATUS_LABEL[status]}
    </span>
  );
}
function MethodBadge({ method }) {
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: "#c7c7cc" }}>
      <span className="w-2 h-2 rounded-full" style={{ background: METHOD_COLOR[method] }} />
      {METHOD_LABEL[method]}
    </span>
  );
}
function OutreachBadge({ outreach }) {
  return (
    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ color: OUTREACH_COLOR[outreach], background: `${OUTREACH_COLOR[outreach]}22` }}>
      {OUTREACH_LABEL[outreach]}
    </span>
  );
}

/* ============================================================================
   PROSPECT TABLE
============================================================================ */
function ProspectTable({ prospects, title, count, full, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hideExtra, setHideExtra] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [cols, setCols] = useState({ email: true, method: true, date: true, outreach: true });
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    let rows = prospects;
    if (full && statusFilter !== "All") rows = rows.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.founder || "").toLowerCase().includes(q) || (p.niche || "").toLowerCase().includes(q));
    }
    return rows;
  }, [prospects, search, statusFilter, full]);

  const visible = full ? filtered : filtered.slice(0, 6);

  return (
    <div className="rounded-2xl p-4" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-[14px] font-medium text-white">
          {title} <span style={{ color: textFaint, fontWeight: 400 }}>{count ?? prospects.length}</span>
        </span>

        <div className="flex items-center gap-2 relative">
          {full && (
            <div className="flex items-center gap-0.5 rounded-lg p-0.5 mr-1" style={{ background: "#1a1a1e" }}>
              {["All", "target", "qualify", "skip"].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className="text-[10px] px-2 py-1 rounded-md transition-colors capitalize"
                  style={{ color: statusFilter === s ? "#08080a" : textMuted, background: statusFilter === s ? "#ffffff" : "transparent", fontWeight: statusFilter === s ? 600 : 400 }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {searchOpen ? (
            <input
              autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setSearchOpen(false)}
              placeholder="Search brand, founder, niche..."
              className="text-[11px] px-3 py-1.5 rounded-lg outline-none w-[180px]"
              style={{ color: "white", background: "#1a1a1e", border: `1px solid ${panelBorder}` }}
            />
          ) : (
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg hover:text-white transition-colors" style={{ color: textMuted, background: "#1a1a1e" }}>
              <Search size={12} /> Search
            </button>
          )}

          <button onClick={() => setHideExtra((h) => !h)} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg hover:text-white transition-colors" style={{ color: textMuted, background: "#1a1a1e" }}>
            {hideExtra ? "Show" : "Hide"}
          </button>

          <div className="relative">
            <button onClick={() => setCustomizeOpen((o) => !o)} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg hover:text-white transition-colors" style={{ color: textMuted, background: "#1a1a1e" }}>
              <SlidersHorizontal size={12} /> Customize <ChevronDown size={12} />
            </button>
            {customizeOpen && (
              <div className="absolute right-0 top-full mt-1 rounded-lg p-2 z-20 flex flex-col gap-1 w-[140px]" style={{ background: "#1c1c21", border: `1px solid ${panelBorder}` }}>
                {Object.keys(cols).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-[11px] px-1.5 py-1 rounded-md cursor-pointer hover:bg-white/5 capitalize" style={{ color: "#c7c7cc" }}>
                    <input type="checkbox" checked={cols[k]} onChange={() => setCols((c) => ({ ...c, [k]: !c[k] }))} />
                    {k}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => downloadCSV(filtered.map(({ id, name, niche, founder, email, value, status, method, outreach, ads, created_at }) => ({ id, name, niche, founder, email, value, status, method, outreach, ads, created_at })), "flinza-prospects.csv")}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            style={{ color: "#08080a", background: "#ffffff" }}
          >
            <Download size={12} /> Export
          </button>

          {full && (
            <button onClick={onAdd} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity" style={{ color: "#08080a", background: "#3ddc84" }}>
              <Plus size={12} /> Add Prospect
            </button>
          )}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: `1px solid ${panelBorder}` }}>
            {["ID", "Brand", "Deal Value", "Founder", ...(cols.date ? ["Date Added"] : []), ...(cols.method ? ["Method"] : []), ...(cols.outreach ? ["Outreach"] : []), ...(!hideExtra && cols.email ? ["Email"] : []), "Status", ...(full ? [""] : [])].map((h) => (
              <th key={h} className="text-left text-[11px] font-medium py-2.5 px-2 first:pl-1" style={{ color: textFaint }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr><td colSpan={10} className="text-center py-8 text-[12px]" style={{ color: textFaint }}>No prospects match.</td></tr>
          )}
          {visible.map((t, i) => (
            <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => full && onEdit(t)}
              style={{ borderBottom: i === visible.length - 1 ? "none" : `1px solid ${panelBorder}` }}>
              <td className="py-3 px-2 pl-1 text-[12px]" style={{ color: "#c7c7cc" }}>#{t.id}</td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px]" style={{ background: "#1a1a1e" }}>💍</div>
                  <div className="flex flex-col">
                    <span className="text-[12.5px] text-white font-medium">{t.name}</span>
                    <span className="text-[11px]" style={{ color: textFaint }}>{t.niche || t.ig || "—"}</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-2 text-[12.5px] text-white font-medium">{t.value ? fmtUSD(t.value) : "—"}</td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium" style={{ background: "#1a1a1e", color: "#c7c7cc" }}>
                    {(t.founder || t.name).split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </span>
                  <span className="text-[12.5px]" style={{ color: "#c7c7cc" }}>{t.founder || "—"}</span>
                </div>
              </td>
              {cols.date && <td className="py-3 px-2 text-[12px]" style={{ color: textMuted }}>{fmtDate(t.created_at)}</td>}
              {cols.method && <td className="py-3 px-2"><MethodBadge method={t.method} /></td>}
              {cols.outreach && <td className="py-3 px-2"><OutreachBadge outreach={t.outreach} /></td>}
              {!hideExtra && cols.email && <td className="py-3 px-2 text-[12px]" style={{ color: textMuted }}>{t.email || "—"}</td>}
              <td className="py-3 px-2"><StatusBadge status={t.status} /></td>
              {full && (
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1.5 rounded-md hover:bg-white/10"><Pencil size={13} color={textMuted} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1.5 rounded-md hover:bg-white/10"><Trash2 size={13} color="#f5533f" /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
   ADD / EDIT MODAL
============================================================================ */
function ProspectModal({ prospect, onClose, onSave, saving }) {
  const [form, setForm] = useState(prospect || emptyForm);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: panel, border: `1px solid ${panelBorder}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-medium text-white">{prospect ? "Edit Prospect" : "Add Prospect"}</span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X size={16} color={textMuted} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand" value={form.name} onChange={(v) => set("name", v)} />
          <Field label="Instagram" value={form.ig} onChange={(v) => set("ig", v)} />
          <Field label="Niche" value={form.niche} onChange={(v) => set("niche", v)} />
          <Field label="Deal Value ($)" type="number" value={form.value} onChange={(v) => set("value", Number(v))} />
          <Field label="Founder Name" value={form.founder} onChange={(v) => set("founder", v)} />
          <Field label="Active Ads" type="number" value={form.ads} onChange={(v) => set("ads", v)} />
          <Field label="Founder Email" value={form.email} onChange={(v) => set("email", v)} />
          <SelectField label="Outreach Method" value={form.method} onChange={(v) => set("method", v)} options={[["dm", "DM"], ["email", "Email"]]} />
          <SelectField label="Fit Status" value={form.status} onChange={(v) => set("status", v)} options={[["target", "Target"], ["qualify", "Qualify"], ["skip", "Skip"]]} />
          <SelectField label="Outreach Stage" value={form.outreach} onChange={(v) => set("outreach", v)} options={[["pending", "Pending"], ["contacted", "Contacted"], ["replied", "Replied"], ["call", "Call Booked"], ["closed", "Closed"]]} />
        </div>

        <div className="mt-3">
          <label className="text-[11px]" style={{ color: textFaint }}>Ad Problem Spotted</label>
          <textarea value={form.problem} onChange={(e) => set("problem", e.target.value)} rows={2}
            className="w-full mt-1 text-[12px] px-3 py-2 rounded-lg outline-none resize-none" style={{ color: "white", background: "#1a1a1e", border: `1px solid ${panelBorder}` }} />
        </div>

        <label className="flex items-center gap-2 text-[11.5px] mt-3" style={{ color: "#c7c7cc" }}>
          <input type="checkbox" checked={!!form.paid} onChange={(e) => set("paid", e.target.checked)} /> Paid
        </label>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-[12px] px-3.5 py-2 rounded-lg" style={{ color: textMuted, background: "#1a1a1e" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving} className="flex items-center gap-2 text-[12px] font-medium px-3.5 py-2 rounded-lg disabled:opacity-60" style={{ color: "#08080a", background: "#ffffff" }}>
            {saving && <Loader2 size={13} className="animate-spin" />} Save Prospect
          </button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, type = "text" }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px]" style={{ color: textFaint }}>{label}</label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="text-[12px] px-3 py-2 rounded-lg outline-none" style={{ color: "white", background: "#1a1a1e", border: `1px solid ${panelBorder}` }} />
    </div>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px]" style={{ color: textFaint }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="text-[12px] px-3 py-2 rounded-lg outline-none" style={{ color: "white", background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

/* ============================================================================
   PIPELINE VIEW — kanban by real `status`
============================================================================ */
function PipelineView({ prospects, onEdit, setStatus }) {
  const stages = ["target", "qualify", "skip"];
  return (
    <div className="grid grid-cols-3 gap-4">
      {stages.map((status) => {
        const rows = prospects.filter((p) => p.status === status);
        const value = rows.reduce((s, p) => s + Number(p.value || 0), 0);
        return (
          <div key={status} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-[12px]" style={{ color: textFaint }}>{rows.length}</span>
              </div>
              <span className="text-[12px] text-white font-medium">{fmtUSD(value)}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {rows.map((p) => (
                <div key={p.id} onClick={() => onEdit(p)} className="rounded-xl p-3 cursor-pointer hover:border-white/20 transition-colors" style={{ background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12.5px] text-white font-medium">💍 {p.name}</span>
                    <span className="text-[11px]" style={{ color: textFaint }}>{p.value ? fmtUSD(p.value) : "—"}</span>
                  </div>
                  <div className="text-[11px] mb-2" style={{ color: textMuted }}>{p.niche || "No niche set"} · {p.founder || "No founder set"}</div>
                  <select
                    value={p.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setStatus(p.id, e.target.value)}
                    className="w-full text-[11px] px-2 py-1 rounded-md outline-none capitalize"
                    style={{ color: "#c7c7cc", background: "#111114", border: `1px solid ${panelBorder}` }}
                  >
                    {stages.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              ))}
              {rows.length === 0 && <div className="text-[11px] text-center py-6" style={{ color: textFaint }}>No prospects here.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
   GENERIC SIMPLE VIEWS
============================================================================ */
function SectionShell({ icon: Icon, iconBg, iconColor, title, action, children }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
            <Icon size={14} color={iconColor} strokeWidth={2.2} />
          </div>
          <span className="text-[14px] font-medium text-white">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ServicesView() {
  return (
    <SectionShell icon={Box} iconBg="#0f2440" iconColor="#4da6ff" title="Services Offered">
      <div className="grid grid-cols-2 gap-3">
        {services.map((s) => (
          <div key={s.name} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white font-medium">{s.icon} {s.name}</span>
              <span className="text-[11px]" style={{ color: "#3ddc84" }}>{s.price}</span>
            </div>
            <span className="text-[11.5px]" style={{ color: textMuted }}>{s.desc}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function NichesView({ prospects }) {
  const map = {};
  prospects.forEach((p) => { const n = p.niche || "Unspecified"; map[n] = (map[n] || 0) + 1; });
  return (
    <SectionShell icon={LayoutGrid} iconBg="#241547" iconColor="#a07dff" title="Jewelry Sub-Niches">
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(map).map(([niche, count]) => (
          <div key={niche} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
            <span className="text-[13px] text-white font-medium">{niche}</span>
            <span className="text-[11px]" style={{ color: textFaint }}>{count} prospect{count !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function OutreachStatusView({ prospects }) {
  const stages = ["pending", "contacted", "replied", "call", "closed"];
  return (
    <SectionShell icon={Send} iconBg="#0f2e22" iconColor="#3ddc84" title="Stock Status">
      <div className="grid grid-cols-5 gap-3">
        {stages.map((s) => {
          const value = prospects.filter((p) => p.outreach === s).length;
          return (
            <div key={s} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
              <span className="text-[22px] font-semibold text-white">{value}</span>
              <span className="text-[11.5px]" style={{ color: OUTREACH_COLOR[s] }}>{OUTREACH_LABEL[s]}</span>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function PaymentsView({ prospects, togglePaid }) {
  const rows = prospects.filter((p) => p.outreach === "closed");
  return (
    <SectionShell icon={CreditCard} iconBg="#241547" iconColor="#a07dff" title="Payments">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: `1px solid ${panelBorder}` }}>
            {["Brand", "Deal Value", "Status", ""].map((h) => (
              <th key={h} className="text-left text-[11px] font-medium py-2.5 px-2" style={{ color: textFaint }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id} style={{ borderBottom: i === rows.length - 1 ? "none" : `1px solid ${panelBorder}` }}>
              <td className="py-3 px-2 text-[12.5px] text-white font-medium">💍 {p.name}</td>
              <td className="py-3 px-2 text-[12.5px] text-white">{fmtUSD(p.value)}</td>
              <td className="py-3 px-2">
                <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ color: p.paid ? "#3ddc84" : "#f5c93f", background: p.paid ? "#3ddc8422" : "#f5c93f22" }}>
                  {p.paid ? "Paid" : "Pending"}
                </span>
              </td>
              <td className="py-3 px-2">
                <button onClick={() => togglePaid(p.id, p.paid)} className="text-[11px] px-2.5 py-1 rounded-md" style={{ color: textMuted, background: "#1a1a1e" }}>
                  Mark {p.paid ? "Pending" : "Paid"}
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-[12px]" style={{ color: textFaint }}>No closed deals yet — mark a prospect's Outreach Stage as "Closed" to see it here.</td></tr>}
        </tbody>
      </table>
    </SectionShell>
  );
}

function TestimonialsView() {
  return (
    <SectionShell
      icon={Star} iconBg="#3a2a10" iconColor="#f5c93f" title="Testimonials"
      action={<a href="mailto:hello@flinzaworks.com?subject=Testimonial Request" className="text-[11px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ color: "#08080a", background: "#ffffff" }}><Mail size={12} /> Request one</a>}
    >
      <div className="grid grid-cols-2 gap-3">
        {testimonials.map((t) => (
          <div key={t.name} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
            <span className="text-[12.5px]" style={{ color: "#c7c7cc" }}>&ldquo;{t.quote}&rdquo;</span>
            <div className="flex items-center gap-2 mt-1">
              <img src={t.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11.5px] text-white font-medium">{t.name}</span>
                <span className="text-[10.5px]" style={{ color: textFaint }}>{t.brand}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ============================================================================
   HOME VIEW
============================================================================ */
function HomeView({ prospects, userEmail, setView, setEditing }) {
  const activeCount = prospects.filter((p) => p.status !== "skip").length;
  const targetCount = prospects.filter((p) => p.status === "target").length;
  const pipelineValue = prospects.filter((p) => p.status !== "skip").reduce((s, p) => s + Number(p.value || 0), 0);
  const firstName = (userEmail || "there").split("@")[0];

  const actions = [
    { label: "Add a Prospect", desc: "Log a new brand you've qualified from Meta Ad Library research.", icon: Plus, color: "#3ddc84", onClick: () => setEditing({}) },
    { label: "Open Pipeline", desc: "See every prospect grouped by fit status — Target, Qualify, Skip.", icon: LayoutGrid, color: "#3fa9f5", onClick: () => setView("pipeline") },
    { label: "View All Prospects", desc: "Full searchable, exportable prospect table.", icon: Users, color: "#f6538b", onClick: () => setView("prospects") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl p-6" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
        <span className="text-[20px] font-semibold text-white capitalize">Welcome back, {firstName} 👋</span>
        <p className="text-[13px] mt-1" style={{ color: textMuted }}>
          {activeCount} active prospects · {targetCount} marked as target · {fmtUSD(pipelineValue)} in pipeline value.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={a.onClick} className="text-left rounded-2xl p-4 flex flex-col gap-3 hover:border-white/20 transition-colors" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${a.color}22` }}>
                <Icon size={16} color={a.color} />
              </div>
              <div>
                <div className="text-[13.5px] text-white font-medium">{a.label}</div>
                <div className="text-[11.5px] mt-1" style={{ color: textFaint }}>{a.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <ProspectTable prospects={prospects} title="Recently Added" onAdd={() => setEditing({})} onEdit={setEditing} />
    </div>
  );
}

/* ============================================================================
   SIDEBAR
============================================================================ */
const navDashboardSub = [
  { label: "Analytics", view: "overview" },
  { label: "Sales Overview", view: "pipeline" },
  { label: "Top Products", view: "niches" },
  { label: "Stock Status", view: "outreachstatus" },
];
const navRest = [
  { label: "Analytics", icon: BarChart3, view: "reports" },
  { label: "Services", icon: Box, view: "services" },
  { label: "Categories", icon: LayoutGrid, view: "niches" },
  { label: "Analytics", icon: TrendingUp, view: "reports" },
  { label: "Customers", icon: Users, view: "prospects" },
  { label: "Reviews", icon: Star, view: "testimonials" },
  { label: "Payments", icon: CreditCard, view: "payments" },
];
const dashboardViews = ["overview", "pipeline", "niches", "outreachstatus"];

function Sidebar({ view, setView, userEmail, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dashboardActive = dashboardViews.includes(view);
  const initials = (userEmail || "U").slice(0, 2).toUpperCase();

  return (
    <aside className="w-[240px] shrink-0 h-full flex flex-col justify-between px-3 py-4" style={{ background: "#08080a", borderRight: `1px solid ${panelBorder}` }}>
      <div>
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[13px]" style={{ background: "linear-gradient(135deg,#f6538b,#8b5cf6)", color: "white" }}>F</div>
            <div className="flex flex-col leading-tight">
              <span className="flex items-center gap-1 text-[13px] font-semibold text-white">Flinza Works <ChevronDown size={12} color={textFaint} /></span>
              <span className="text-[10px]" style={{ color: textFaint }}>ID: FLZ-001</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Search size={14} color={textFaint} />
            <LayoutDashboard size={14} color={textFaint} />
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          <button onClick={() => setView("home")} className="flex items-center gap-2.5 text-[12.5px] py-2 px-2 rounded-md transition-colors"
            style={{ color: view === "home" ? "#f6538b" : "#b8b8bd", background: view === "home" ? "rgba(246,83,139,0.08)" : "transparent" }}>
            <Home size={15} strokeWidth={2} /> Home
          </button>

          <button onClick={() => setView("overview")} className="flex items-center gap-2.5 text-[12.5px] py-2 px-2 rounded-md transition-colors"
            style={{ color: dashboardActive ? "#f6538b" : "#b8b8bd" }}>
            <LayoutDashboard size={15} strokeWidth={2} /> Dashboard
          </button>
          <div className="flex flex-col ml-[34px] border-l pl-3 gap-0.5 mb-1" style={{ borderColor: panelBorder }}>
            {navDashboardSub.map((s) => (
              <button key={s.label} onClick={() => setView(s.view)} className="text-left text-[12.5px] py-1.5 px-2 rounded-md transition-colors"
                style={{ color: view === s.view ? "#f6538b" : textMuted, background: view === s.view ? "rgba(246,83,139,0.08)" : "transparent", fontWeight: view === s.view ? 500 : 400 }}>
                {s.label}
              </button>
            ))}
          </div>

          {navRest.map((item, i) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button key={item.label + i} onClick={() => setView(item.view)} className="flex items-center gap-2.5 text-[12.5px] py-2 px-2 rounded-md transition-colors"
                style={{ color: active ? "#f6538b" : "#b8b8bd", background: active ? "rgba(246,83,139,0.08)" : "transparent" }}>
                <Icon size={15} strokeWidth={2} /> {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative">
        <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center gap-2 px-1 w-full">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0" style={{ background: "#1a1a1e", color: "#c7c7cc" }}>{initials}</span>
          <div className="flex flex-col leading-tight text-left overflow-hidden">
            <span className="flex items-center gap-1 text-[12.5px] text-white font-medium">
              Sayid <span className="text-[9px] px-1 rounded shrink-0" style={{ background: "#3a2a10", color: "#f5c93f" }}>CO-FOUNDER</span>
            </span>
            <span className="text-[10.5px] truncate" style={{ color: textFaint }}>{userEmail}</span>
          </div>
        </button>
        {profileOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-full rounded-lg p-1.5 flex flex-col gap-0.5" style={{ background: "#1c1c21", border: `1px solid ${panelBorder}` }}>
            <button className="flex items-center gap-2 text-[11.5px] px-2 py-1.5 rounded-md hover:bg-white/5" style={{ color: "#c7c7cc" }}><Settings size={12} /> Settings</button>
            <button onClick={onSignOut} className="flex items-center gap-2 text-[11.5px] px-2 py-1.5 rounded-md hover:bg-white/5" style={{ color: "#f5533f" }}><LogOut size={12} /> Log out</button>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ============================================================================
   INVITE MODAL
============================================================================ */
function InviteModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/login` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(true);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-2xl p-5" style={{ background: panel, border: `1px solid ${panelBorder}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-medium text-white">Invite to Flinza Works CRM</span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X size={16} color={textMuted} /></button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <img src="https://i.pravatar.cc/40?img=51" className="w-8 h-8 rounded-full object-cover" alt="" />
          <div className="flex flex-col leading-tight">
            <span className="text-[12.5px] text-white font-medium">Imtiaz</span>
            <span className="text-[10.5px]" style={{ color: textFaint }}>Co-founder · Booking &amp; Closing</span>
          </div>
        </div>
        <p className="text-[11.5px] mb-3" style={{ color: textMuted }}>
          Share this link — they'll sign up with their own email and password to get access.
        </p>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#1a1a1e", border: `1px solid ${panelBorder}` }}>
          <Link2 size={13} color={textFaint} />
          <span className="text-[11.5px] flex-1 truncate" style={{ color: "#c7c7cc" }}>{link}</span>
          <button onClick={copy} className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md" style={{ color: "#08080a", background: "#ffffff" }}>
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   OVERVIEW / ANALYTICS VIEW
============================================================================ */
function OverviewView({ prospects, setView, setEditing }) {
  const pipelineValue = prospects.filter((p) => p.status !== "skip").reduce((s, p) => s + Number(p.value || 0), 0);
  const activeCount = prospects.filter((p) => p.status !== "skip").length;
  const closedRevenue = prospects.filter((p) => p.outreach === "closed").reduce((s, p) => s + Number(p.value || 0), 0);
  const outreachSent = prospects.filter((p) => p.outreach !== "pending").length;

  const statCards = [
    { label: "Pipeline Value", value: pipelineValue.toLocaleString(), unit: "USD", delta: "1.19%", up: true, icon: Wallet, iconBg: "#3a1220", iconColor: "#f6538b", spark: sparkUp },
    { label: "Active Prospects", value: String(activeCount), unit: "LEADS", delta: "0.29%", up: true, icon: Box, iconBg: "#0f2440", iconColor: "#4da6ff", spark: sparkUp2 },
    { label: "Closed Revenue", value: closedRevenue.toLocaleString(), unit: "USD", delta: "0.29%", up: true, icon: TrendingUp, iconBg: "#0f2e22", iconColor: "#3ddc84", spark: sparkUp },
    { label: "Outreach Sent", value: String(outreachSent), unit: "LEADS", delta: "0.15%", up: false, icon: CreditCard, iconBg: "#241547", iconColor: "#a07dff", spark: sparkDown },
  ];

  return (
    <>
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1.4fr" }}>
        <div className="grid grid-cols-1 gap-4">
          <StatCard card={statCards[0]} />
          <StatCard card={statCards[2]} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <StatCard card={statCards[1]} />
          <StatCard card={statCards[3]} />
        </div>
        <DonutCard prospects={prospects} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
        <OutreachFunnelCard prospects={prospects} />
        <AdVolumeCard prospects={prospects} onViewAll={() => setView("prospects")} />
      </div>

      <ProspectTable prospects={prospects} title="Recent Prospects" onAdd={() => setEditing({})} onEdit={setEditing} />
    </>
  );
}

/* ============================================================================
   ROOT
============================================================================ */
export default function Dashboard({ userEmail }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { prospects, loading, err, addProspect, updateProspect, deleteProspect, setStatus, togglePaid } = useProspects(supabase);

  const [view, setView] = useState("home");
  const [editing, setEditing] = useState(null); // null = closed, {} = add, object = edit
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const saveProspect = async (form) => {
    setSaving(true);
    const ok = form.id ? await updateProspect(form) : await addProspect(form);
    setSaving(false);
    if (ok) setEditing(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const viewTitle = {
    home: "Home", overview: "Analytics", prospects: "Customers", pipeline: "Sales Overview",
    niches: "Categories", services: "Services", reports: "Analytics", testimonials: "Reviews",
    payments: "Payments", outreachstatus: "Stock Status",
  }[view];

  return (
    <div className="w-full h-screen flex overflow-hidden" style={{ background: bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar view={view} setView={setView} userEmail={userEmail} onSignOut={handleSignOut} />

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[13px]" style={{ color: textMuted }}>
            <Home size={13} /><span>Home</span><ChevronRight size={12} />
            <LayoutGrid size={13} /><span>Dashboard</span><ChevronRight size={12} />
            <span className="text-white">{viewTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-lg" style={{ background: "#ffffff", color: "#08080a" }}>
              <UserPlus size={13} /> Invite
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{ color: "#f5533f", background: "#f5533f18", border: "1px solid #f5533f33" }}>
            Database error: {err}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin" color={textFaint} />
          </div>
        ) : (
          <>
            {view === "home" && <HomeView prospects={prospects} userEmail={userEmail} setView={setView} setEditing={setEditing} />}
            {view === "overview" && <OverviewView prospects={prospects} setView={setView} setEditing={setEditing} />}
            {view === "prospects" && (
              <ProspectTable prospects={prospects} title="Prospects" full onAdd={() => setEditing({})} onEdit={setEditing} onDelete={deleteProspect} />
            )}
            {view === "pipeline" && <PipelineView prospects={prospects} onEdit={setEditing} setStatus={setStatus} />}
            {view === "niches" && <NichesView prospects={prospects} />}
            {view === "services" && <ServicesView />}
            {view === "reports" && <OverviewView prospects={prospects} setView={setView} setEditing={setEditing} />}
            {view === "payments" && <PaymentsView prospects={prospects} togglePaid={togglePaid} />}
            {view === "testimonials" && <TestimonialsView />}
            {view === "outreachstatus" && <OutreachStatusView prospects={prospects} />}
          </>
        )}
      </main>

      {editing !== null && (
        <ProspectModal
          prospect={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSave={saveProspect}
          saving={saving}
        />
      )}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}
