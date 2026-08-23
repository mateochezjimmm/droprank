import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE CLIENT ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── GAME CONSTANTS ──
const COLS = 10, ROWS = 20, CELL = 26, TICK0 = 700, TICK_MIN = 60;
const SHAPES = {
  I: { m: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], c: "#2980b9" },
  O: { m: [[1,1],[1,1]], c: "#e6a817" },
  T: { m: [[0,1,0],[1,1,1],[0,0,0]], c: "#8e44ad" },
  S: { m: [[0,1,1],[1,1,0],[0,0,0]], c: "#27ae60" },
  Z: { m: [[1,1,0],[0,1,1],[0,0,0]], c: "#c0392b" },
  J: { m: [[1,0,0],[1,1,1],[0,0,0]], c: "#1a5276" },
  L: { m: [[0,0,1],[1,1,1],[0,0,0]], c: "#d35400" },
};
const KEYS = Object.keys(SHAPES);
const PTS = [0, 100, 300, 500, 800];

// ── WARM CREAM + BLUE + RED PALETTE ──
const C = {
  bg: "#f5e6c8",
  surface: "#efe0c4",
  card: "#e8d5b0",
  cardHover: "#e0cda4",
  blue: "#1a4a7a",
  blueMid: "#2563a8",
  blueLight: "rgba(26,74,122,0.08)",
  red: "#c0392b",
  redLight: "rgba(192,57,43,0.1)",
  gold: "#b8860b",
  goldLight: "rgba(184,134,11,0.12)",
  silver: "#8a8a8a",
  bronze: "#a0622e",
  green: "#27ae60",
  text: "#3d2e1a",
  white: "#2d1f0e",
  muted: "#8a7a60",
  border: "rgba(139,119,80,0.4)",
  borderDash: "rgba(139,119,80,0.5)",
  gameBg: "#1a3a5c",
};
const F = "'Press Start 2P',monospace", B = "'VT323',monospace";
const GFONT = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";

// ── TETRIS HELPERS ──
const mkB = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const rndP = () => { const k = KEYS[Math.floor(Math.random() * KEYS.length)]; return { k, shape: SHAPES[k].m.map(r => [...r]), color: SHAPES[k].c, x: 3, y: 0 }; };
const rot = s => { const R = s.length, W = s[0].length; return Array.from({ length: W }, (_, c) => Array.from({ length: R }, (_, r) => s[R - 1 - r][c])); };
const ok = (b, s, x, y) => { for (let r = 0; r < s.length; r++) for (let c = 0; c < s[0].length; c++) if (s[r][c]) { const nx = x + c, ny = y + r; if (nx < 0 || nx >= COLS || ny >= ROWS) return false; if (ny >= 0 && b[ny][nx]) return false; } return true; };
const stamp = (b, p) => { const n = b.map(r => [...r]); for (let r = 0; r < p.shape.length; r++) for (let c = 0; c < p.shape[0].length; c++) if (p.shape[r][c] && p.y + r >= 0) n[p.y + r][p.x + c] = p.color; return n; };
const clr = b => { let n = 0; const nb = b.filter(r => { if (r.every(c => c)) { n++; return false; } return true; }); while (nb.length < ROWS) nb.unshift(Array(COLS).fill(null)); return { b: nb, n }; };

// ── MINI BLOCKS (decorative) ──
const MINIS = [
  { s: [[1,1],[1,1]], c: "#c0392b" },
  { s: [[0,1,0],[1,1,1]], c: "#8e44ad" },
  { s: [[1,1,1,1]], c: "#2980b9" },
  { s: [[0,1,1],[1,1,0]], c: "#27ae60" },
  { s: [[1,0],[1,0],[1,1]], c: "#d35400" },
  { s: [[1,1,0],[0,1,1]], c: "#c0392b" },
  { s: [[0,1],[0,1],[1,1]], c: "#1a5276" },
];

function Mini({ i }) {
  const p = MINIS[i % MINIS.length]; const z = 8;
  return (<div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${p.s[0].length}, ${z}px)` }}>{p.s.flat().map((v, j) => (<div key={j} style={{ width: z, height: z, background: v ? p.c : "transparent", borderRadius: v ? 2 : 0, border: v ? "1px solid rgba(0,0,0,0.15)" : "none" }} />))}</div>);
}

// ── TIME AGO ──
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── RANK HELPERS ──
const rc = i => i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : C.muted;
const rk = i => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

// ── SPONSOR STRIP ──
function SponsorStrip() {
  const sp = [
    { sold: true, name: "supastarter.dev" }, null, null,
    { sold: true, name: "agently.dev" }, null, null,
  ];
  return (
    <div style={{ display: "flex", gap: 6, padding: "8px 0", justifyContent: "center", flexWrap: "wrap" }}>
      {sp.map((s, i) => (
        <div key={i} style={{
          border: `1px dashed ${s?.sold ? C.border : C.borderDash}`,
          padding: s?.sold ? "6px 12px" : "6px 14px",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          background: s?.sold ? C.goldLight : "rgba(26,74,122,0.04)",
          whiteSpace: "nowrap",
        }}>
          {s?.sold ? (<>
            <span style={{ fontFamily: F, fontSize: 6, color: C.gold }}>SPONSOR</span>
            <span style={{ fontSize: 14, color: C.white }}>{s.name}</span>
          </>) : (<>
            <div style={{ animation: `bob ${2.5 + i * 0.4}s ease-in-out infinite` }}><Mini i={i} /></div>
            <span style={{ fontFamily: F, fontSize: 7, color: C.gold }}>$50</span>
            <span style={{ fontFamily: F, fontSize: 5, color: C.muted }}>AVAIL</span>
          </>)}
        </div>
      ))}
    </div>
  );
}

// ── SIDEBAR SLOT ──
function SideSlot({ i, ad }) {
  if (ad) return (
    <div style={{ border: `1px solid ${C.border}`, padding: "12px 6px", textAlign: "center", marginBottom: 8, background: C.card, minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
      <div style={{ fontFamily: F, fontSize: 7, color: C.muted }}>AD</div>
      <div style={{ width: "85%", height: 40, background: C.surface, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: F, fontSize: 5, color: C.muted }}>ADVERTISE</span>
      </div>
    </div>
  );
  return (
    <div style={{ border: `2px dashed ${C.borderDash}`, padding: "12px 8px", textAlign: "center", marginBottom: 8, cursor: "pointer", background: "rgba(26,74,122,0.03)", minHeight: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
      <div style={{ animation: `bob ${3 + i * 0.6}s ease-in-out infinite` }}><Mini i={i} /></div>
      <div style={{ fontFamily: F, fontSize: 12, color: C.muted }}>+</div>
      <div style={{ fontFamily: F, fontSize: 9, color: C.gold }}>$50</div>
      <div style={{ fontFamily: F, fontSize: 6, color: C.muted }}>AVAILABLE</div>
    </div>
  );
}

// ── TETRIS GAME ──
function Game({ product, listingId, onDone }) {
  const [board, setBoard] = useState(mkB);
  const [pc, setPc] = useState(() => rndP());
  const [next, setNext] = useState(() => rndP());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [over, setOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const spd = useRef(TICK0);
  const pR = useRef(pc), bR = useRef(board), oR = useRef(false), sR = useRef(0), lnR = useRef(0), lvR = useRef(0);
  useEffect(() => { pR.current = pc; }, [pc]);
  useEffect(() => { bR.current = board; }, [board]);
  useEffect(() => { oR.current = over; }, [over]);
  useEffect(() => { sR.current = score; }, [score]);
  useEffect(() => { lnR.current = lines; }, [lines]);
  useEffect(() => { lvR.current = level; }, [level]);

  const lock = useCallback(() => {
    const p = pR.current, b = bR.current; if (!p) return;
    const nb = stamp(b, p); const { b: cb, n } = clr(nb);
    const newLines = lnR.current + n;
    const newLevel = Math.floor(newLines / 10);
    const add = (PTS[n] || 0) * (newLevel + 1);
    setBoard(cb); setLines(newLines); setLevel(newLevel);
    setScore(s => s + add);
    if (n > 0) spd.current = Math.max(TICK_MIN, TICK0 * Math.pow(0.85, newLevel));
    const np = next;
    if (!ok(cb, np.shape, np.x, np.y)) { setOver(true); oR.current = true; return; }
    setPc({ ...np }); setNext(rndP());
  }, [next]);

  const drop = useCallback(() => { if (oR.current) return; const p = pR.current; if (!p) return; if (ok(bR.current, p.shape, p.x, p.y + 1)) setPc(pr => ({ ...pr, y: pr.y + 1 })); else lock(); }, [lock]);
  const mv = useCallback(dx => { setPc(pr => pr && ok(bR.current, pr.shape, pr.x + dx, pr.y) ? { ...pr, x: pr.x + dx } : pr); }, []);
  const doR = useCallback(() => { setPc(pr => { if (!pr) return pr; const rs = rot(pr.shape); for (const dx of [0, 1, -1, 2, -2]) if (ok(bR.current, rs, pr.x + dx, pr.y)) return { ...pr, shape: rs, x: pr.x + dx }; return pr; }); }, []);
  const hd = useCallback(() => { setPc(pr => { if (!pr) return pr; let ny = pr.y; while (ok(bR.current, pr.shape, pr.x, ny + 1)) ny++; const d = { ...pr, y: ny }; pR.current = d; setTimeout(lock, 0); return d; }); }, [lock]);

  useEffect(() => { if (over) return; const id = setInterval(drop, spd.current); return () => clearInterval(id); }, [over, drop, level]);
  useEffect(() => { if (over) return; const h = e => { switch (e.key) { case "ArrowLeft": case "a": e.preventDefault(); mv(-1); break; case "ArrowRight": case "d": e.preventDefault(); mv(1); break; case "ArrowDown": case "s": e.preventDefault(); drop(); break; case "ArrowUp": case "w": e.preventDefault(); doR(); break; case " ": e.preventDefault(); hd(); break; } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [over, mv, drop, doR, hd]);

  // Submit score to Supabase
  const submitScore = useCallback(async () => {
    if (submitted || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from("scores").insert({
        listing_id: listingId,
        score: sR.current,
        lines: lnR.current,
        level: lvR.current,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Score submit error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [listingId, submitted, submitting]);

  // Auto-submit on game over
  useEffect(() => {
    if (over && !submitted) submitScore();
  }, [over, submitted, submitScore]);

  let gY = pc ? pc.y : 0;
  if (pc) while (ok(board, pc.shape, pc.x, gY + 1)) gY++;
  const cells = board.map(r => [...r]);
  if (pc) {
    if (gY !== pc.y) for (let r = 0; r < pc.shape.length; r++) for (let c = 0; c < pc.shape[0].length; c++) if (pc.shape[r][c] && gY + r >= 0 && gY + r < ROWS && !cells[gY + r][pc.x + c]) cells[gY + r][pc.x + c] = "g";
    for (let r = 0; r < pc.shape.length; r++) for (let c = 0; c < pc.shape[0].length; c++) if (pc.shape[r][c] && pc.y + r >= 0 && pc.y + r < ROWS) cells[pc.y + r][pc.x + c] = pc.color;
  }

  const nxt = () => { const s = next.shape; return (<div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${s[0].length}, 16px)` }}>{s.flat().map((v, i) => (<div key={i} style={{ width: 16, height: 16, background: v ? next.color : "transparent", border: v ? "2px solid rgba(255,255,255,0.3)" : "none", borderRadius: v ? 3 : 0, boxShadow: v ? `inset 0 -2px 0 rgba(0,0,0,0.25)` : "none" }} />))}</div>); };
  const restart = () => { setBoard(mkB()); setPc(rndP()); setNext(rndP()); setScore(0); setLines(0); setLevel(0); setOver(false); setSubmitted(false); spd.current = TICK0; };

  // GAME OVER
  if (over) return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "28px", textAlign: "center", color: C.white, maxWidth: 320, width: "90vw", border: `4px solid ${C.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
      <div style={{ fontFamily: F, fontSize: 9, color: C.muted, marginBottom: 2 }}>dropping for</div>
      <div style={{ fontFamily: F, fontSize: 11, color: C.white, marginBottom: 16, wordBreak: "break-all" }}>{product}</div>
      <div style={{ fontFamily: F, fontSize: 11, color: C.red, marginBottom: 4 }}>SCORE</div>
      <div style={{ fontFamily: F, fontSize: 28, color: C.white, marginBottom: 6 }}>{score.toLocaleString()}</div>
      <div style={{ fontFamily: F, fontSize: 8, color: C.muted, marginBottom: 6 }}>{lines} lines · level {level}</div>
      {submitting && <div style={{ fontFamily: F, fontSize: 7, color: C.gold, marginBottom: 12 }}>Saving score...</div>}
      {submitted && <div style={{ fontFamily: F, fontSize: 7, color: C.green, marginBottom: 12 }}>Score saved ✓</div>}
      <button onClick={restart} style={{ width: "100%", padding: "14px", fontFamily: F, fontSize: 11, background: C.red, color: "#fff", border: "none", cursor: "pointer", borderRadius: 4, marginBottom: 8 }}>DROP AGAIN</button>
      <button style={{ width: "100%", padding: "12px", fontFamily: F, fontSize: 10, background: C.blue, color: "#fff", border: "none", cursor: "pointer", borderRadius: 4, marginBottom: 10 }}>FLEX IT ON 𝕏</button>
      <div onClick={() => onDone(score)} style={{ fontFamily: F, fontSize: 9, color: C.muted, cursor: "pointer", textDecoration: "underline" }}>done</div>
    </div>
  );

  // ACTIVE GAME
  return (
    <div style={{ background: C.gameBg, borderRadius: 8, padding: 12, border: `3px solid rgba(255,255,255,0.15)`, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
        <div><span style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.5)" }}>SCORE </span><span style={{ fontFamily: F, fontSize: 12, color: "#ffd700" }}>{score.toLocaleString()}</span></div>
        <div><span style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.5)" }}>LVL </span><span style={{ fontFamily: F, fontSize: 11, color: "#7dcea0" }}>{level}</span></div>
        <div><span style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.5)" }}>LINES </span><span style={{ fontFamily: F, fontSize: 11, color: "#85c1e9" }}>{lines}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.5)" }}>NEXT</span>{nxt()}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, border: "2px solid rgba(255,255,255,0.1)", borderRadius: 2, background: "rgba(0,0,0,0.2)" }}>
        {cells.flat().map((c, i) => (<div key={i} style={{ width: CELL, height: CELL, background: c === "g" ? "rgba(255,255,255,0.06)" : c ? c : "rgba(255,255,255,0.02)", border: c && c !== "g" ? "2px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.03)", borderRadius: c && c !== "g" ? 3 : 0, boxShadow: c && c !== "g" ? "inset 0 -2px 0 rgba(0,0,0,0.3)" : "none" }} />))}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
        {[{ l: "◀", fn: () => mv(-1) }, { l: "▼", fn: drop }, { l: "↻", fn: doR }, { l: "▶", fn: () => mv(1) }].map(b => (<button key={b.l} onPointerDown={b.fn} style={{ width: 48, height: 44, fontSize: 20, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", color: "#85c1e9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", touchAction: "manipulation" }}>{b.l}</button>))}
        <button onPointerDown={hd} style={{ width: 72, height: 44, fontSize: 9, fontFamily: F, background: "rgba(192,57,43,0.2)", border: "2px solid rgba(192,57,43,0.4)", color: "#e74c3c", borderRadius: 4, cursor: "pointer", touchAction: "manipulation" }}>DROP</button>
      </div>
      <div style={{ textAlign: "center", fontFamily: F, fontSize: 6, color: "rgba(255,255,255,0.4)", marginTop: 5 }}>← → move · ↑ rotate · SPACE drop</div>
    </div>
  );
}

// ── PAYMENT MODAL ──
function PayModal({ product, onPaid, onClose }) {
  const [loading, setLoading] = useState(false);
  // TODO: Replace with real Stripe Checkout session
  const pay = () => { setLoading(true); setTimeout(() => { setLoading(false); onPaid(); }, 1200); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(45,31,14,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.bg, border: `3px solid ${C.border}`, borderRadius: 8, padding: "28px 24px", maxWidth: 360, width: "90vw", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ fontFamily: F, fontSize: 13, color: C.blue, marginBottom: 14, lineHeight: 1.8 }}>List your product</div>
        <div style={{ background: C.surface, border: `1px dashed ${C.border}`, padding: "10px 14px", marginBottom: 16, borderRadius: 4 }}>
          <div style={{ fontFamily: F, fontSize: 7, color: C.muted, marginBottom: 3 }}>LISTING</div>
          <div style={{ fontSize: 20, color: C.white, wordBreak: "break-all" }}>{product}</div>
        </div>
        <div style={{ fontFamily: F, fontSize: 20, color: C.white, marginBottom: 4 }}>$2</div>
        <div style={{ fontFamily: F, fontSize: 7, color: C.muted, marginBottom: 18 }}>one-time listing fee</div>
        <button onClick={pay} disabled={loading} style={{ width: "100%", padding: "14px", fontFamily: F, fontSize: 11, background: loading ? C.muted : C.red, color: "#fff", border: "none", cursor: loading ? "default" : "pointer", borderRadius: 4, marginBottom: 8 }}>
          {loading ? "PROCESSING..." : "PAY $2 & LIST"}
        </button>
        <div style={{ fontFamily: F, fontSize: 8, color: C.muted, marginBottom: 12 }}>or</div>
        <button style={{ width: "100%", padding: "12px", fontFamily: F, fontSize: 10, background: C.blueLight, color: C.blue, border: `1px dashed ${C.border}`, cursor: "pointer", borderRadius: 4, marginBottom: 10 }}>WATCH 15s AD INSTEAD</button>
        <div onClick={onClose} style={{ fontFamily: F, fontSize: 9, color: C.muted, cursor: "pointer", textDecoration: "underline" }}>cancel</div>
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function DropRank() {
  const [url, setUrl] = useState("");
  const [listingId, setListingId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState("play");
  const [lb, setLb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalListings, setTotalListings] = useState(0);

  // ── FETCH LEADERBOARD ──
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from("today_leaderboard")
        .select("*")
        .order("best_score", { ascending: false })
        .limit(50);

      if (err) throw err;

      setLb((data || []).map(row => ({
        name: row.name,
        score: row.best_score || 0,
        runs: row.runs || 0,
        t: row.last_played ? timeAgo(row.last_played) : "—",
      })));
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setError("Could not load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── FETCH TOTAL LISTINGS ──
  const fetchTotalListings = useCallback(async () => {
    try {
      const { count } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true });
      setTotalListings(count || 0);
    } catch (err) {
      console.error("Count error:", err);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchLeaderboard();
    fetchTotalListings();
    const poll = setInterval(() => { fetchLeaderboard(); fetchTotalListings(); }, 30000);
    return () => clearInterval(poll);
  }, [fetchLeaderboard, fetchTotalListings]);

  // ── FIND OR CREATE LISTING ──
  const findOrCreateListing = useCallback(async (name) => {
    // Check if listing already exists
    const { data: existing } = await supabase
      .from("listings")
      .select("id, paid")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      setListingId(existing.id);
      return existing;
    }
    return null; // needs to be created via payment
  }, []);

  // ── CREATE LISTING AFTER PAYMENT ──
  const createListing = useCallback(async (name) => {
    const { data, error: err } = await supabase
      .from("listings")
      .insert({ name, paid: true })
      .select("id")
      .single();

    if (err) {
      // might be duplicate race condition
      const { data: existing } = await supabase
        .from("listings")
        .select("id")
        .eq("name", name)
        .single();
      if (existing) { setListingId(existing.id); return existing; }
      throw err;
    }
    setListingId(data.id);
    return data;
  }, []);

  // ── PLAY BUTTON HANDLER ──
  const onPlay = useCallback(async () => {
    const name = url.trim();
    if (!name) return;

    const existing = await findOrCreateListing(name);
    if (existing) {
      setListingId(existing.id);
      setPlaying(true);
    } else {
      setPaying(true); // show payment modal
    }
  }, [url, findOrCreateListing]);

  // ── AFTER PAYMENT ──
  const onPaid = useCallback(async () => {
    setPaying(false);
    try {
      await createListing(url.trim());
      setPlaying(true);
    } catch (err) {
      console.error("Create listing error:", err);
      setError("Could not create listing. Try again.");
    }
  }, [url, createListing]);

  // ── GAME DONE ──
  const onDone = useCallback(async (finalScore) => {
    setPlaying(false);
    // Refresh leaderboard
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ── FONTS ──
  useEffect(() => {
    if (!document.querySelector(`link[href="${GFONT}"]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = GFONT;
      document.head.appendChild(l);
    }
    // Bob animation for mini blocks
    if (!document.querySelector("style[data-dr]")) {
      const s = document.createElement("style"); s.dataset.dr = "1";
      s.textContent = `
        @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .sb { display: none; }
        @media (min-width: 900px) { .sb { display: block; width: 160px; flex-shrink: 0; } }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const champ = lb[0];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: B, color: C.text }}>
      {/* HEADER */}
      <div style={{ background: C.blue, padding: "14px 16px", textAlign: "center" }}>
        <div style={{ fontFamily: F, fontSize: 18, color: "#fff", letterSpacing: 2 }}>DROP<span style={{ color: "#c0392b" }}>RANK</span></div>
        <div style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>skill is the only currency</div>
      </div>

      {/* NAV */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "10px 0", borderBottom: `1px dashed ${C.borderDash}` }}>
        {["RULES", "STATS"].map(t => (
          <div key={t} onClick={() => setTab(t === tab ? "play" : t.toLowerCase())} style={{ fontFamily: F, fontSize: 8, color: tab === t.toLowerCase() ? C.blue : C.muted, cursor: "pointer", borderBottom: tab === t.toLowerCase() ? `2px solid ${C.blue}` : "2px solid transparent", paddingBottom: 4 }}>{t}</div>
        ))}
      </div>

      {/* RULES TAB */}
      {tab === "rules" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px", lineHeight: 1.8, fontSize: 18 }}>
          <div style={{ fontFamily: F, fontSize: 11, color: C.blue, marginBottom: 14 }}>How it works</div>
          <p><span style={{ fontFamily: F, fontSize: 8, color: C.red }}>1.</span> Enter your product URL, handle, or brand name.</p>
          <p><span style={{ fontFamily: F, fontSize: 8, color: C.red }}>2.</span> Pay the $2 listing fee (one-time) or watch a 15-second ad to play for free.</p>
          <p><span style={{ fontFamily: F, fontSize: 8, color: C.red }}>3.</span> Play the block-dropping game. Your best score today = your rank.</p>
          <p><span style={{ fontFamily: F, fontSize: 8, color: C.red }}>4.</span> Leaderboard resets daily at 00:00 UTC. Everyone starts fresh.</p>
          <p><span style={{ fontFamily: F, fontSize: 8, color: C.red }}>5.</span> The #1 spot gets maximum visibility — every visitor sees the champion first.</p>
          <div style={{ border: `1px dashed ${C.border}`, padding: "12px 14px", marginTop: 16, background: C.blueLight, borderRadius: 4 }}>
            <span style={{ fontFamily: F, fontSize: 7, color: C.blue }}>CONTROLS</span>
            <p style={{ margin: "6px 0 0" }}>← → move · ↑ rotate · SPACE hard drop · ↓ soft drop</p>
            <p style={{ margin: "4px 0 0" }}>Touch buttons available on mobile.</p>
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {tab === "stats" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontFamily: F, fontSize: 11, color: C.blue, marginBottom: 20 }}>Today&apos;s stats</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 30, flexWrap: "wrap" }}>
            {[
              { label: "PRODUCTS", value: lb.length },
              { label: "TOTAL RUNS", value: lb.reduce((a, x) => a + x.runs, 0) },
              { label: "HIGH SCORE", value: champ ? champ.score.toLocaleString() : "—" },
              { label: "ALL-TIME LISTINGS", value: totalListings },
            ].map(s => (
              <div key={s.label} style={{ minWidth: 100 }}>
                <div style={{ fontFamily: F, fontSize: 20, color: C.white }}>{s.value}</div>
                <div style={{ fontFamily: F, fontSize: 7, color: C.muted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {tab === "play" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "center" }}>
          {/* LEFT SIDEBAR */}
          <div className="sb" style={{ paddingTop: 12, position: "sticky", top: 12, paddingLeft: 8, paddingRight: 4 }}>
            {[0, 2, 5, 3, 6].map((pi, i) => <SideSlot key={`l${i}`} i={pi} ad={i % 2 !== 0} />)}
          </div>

          {/* CENTER */}
          <div style={{ flex: 1, maxWidth: 640, padding: "0 12px" }}>
            {/* CHAMPION BAR */}
            {champ && (
              <div style={{ background: C.goldLight, border: `1px dashed ${C.border}`, padding: "10px 14px", margin: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 4 }}>
                <span style={{ fontFamily: F, fontSize: 8, color: C.gold }}>👑 TODAY&apos;S CHAMPION</span>
                <span style={{ fontSize: 18, color: C.white, fontWeight: "bold" }}>{champ.name}</span>
                <span style={{ fontFamily: F, fontSize: 10, color: C.gold }}>{champ.score.toLocaleString()}</span>
              </div>
            )}

            {/* INPUT + PLAY */}
            <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onPlay()}
                placeholder="yourproduct.com or @handle"
                style={{
                  flex: 1, padding: "12px 14px", fontSize: 18, fontFamily: B,
                  border: `2px solid ${C.border}`, borderRadius: 4,
                  background: C.surface, color: C.white, outline: "none",
                }}
              />
              <button
                onClick={onPlay}
                disabled={!url.trim()}
                style={{
                  padding: "12px 20px", fontFamily: F, fontSize: 10,
                  background: url.trim() ? C.red : C.muted, color: "#fff",
                  border: "none", cursor: url.trim() ? "pointer" : "default",
                  borderRadius: 4, whiteSpace: "nowrap",
                }}
              >
                DROP IT
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div style={{ fontFamily: F, fontSize: 8, color: C.red, padding: "6px 0", textAlign: "center" }}>{error}</div>
            )}

            {/* SPONSOR STRIP */}
            <SponsorStrip />

            {/* LEADERBOARD */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: C.blueLight, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: F, fontSize: 9, color: C.blue }}>LEADERBOARD</span>
                <span style={{ fontFamily: F, fontSize: 7, color: C.muted }}>resets 00:00 UTC</span>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", fontFamily: F, fontSize: 8, color: C.muted }}>Loading...</div>
              ) : lb.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ fontFamily: F, fontSize: 10, color: C.muted, marginBottom: 8 }}>No drops yet today</div>
                  <div style={{ fontSize: 16, color: C.muted }}>Be the first to claim the #1 spot!</div>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: "center", padding: "5px", fontFamily: F, fontSize: 7, color: C.muted }}>{lb.length} PRODUCT{lb.length !== 1 ? "S" : ""} DROPPING TODAY</div>
                  {lb.map((item, i) => {
                    const isMe = url.trim() && item.name.toLowerCase() === url.trim().toLowerCase();
                    return (
                      <div key={item.name + i} style={{
                        display: "flex", alignItems: "center", padding: "11px 12px",
                        background: isMe ? C.blueLight : i === 0 ? C.goldLight : i % 2 === 0 ? C.card : C.surface,
                        borderLeft: `3px solid ${isMe ? C.blue : rc(i)}`,
                        borderBottom: `1px solid ${C.border}`, gap: 8,
                      }}>
                        <div style={{ fontFamily: F, fontSize: 10, color: rc(i), minWidth: 32, textAlign: "center" }}>{rk(i)}</div>
                        <div style={{ width: 32, height: 32, background: isMe ? C.blueLight : C.surface, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontSize: 11, color: isMe ? C.blue : C.muted, border: `1px solid ${isMe ? C.blue : C.border}`, flexShrink: 0 }}>
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 19, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name}
                            {isMe && <span style={{ fontFamily: F, fontSize: 7, color: C.blue, background: C.blueLight, padding: "2px 5px", marginLeft: 6, borderRadius: 2 }}>YOU</span>}
                            {i === 0 && !isMe && <span style={{ fontFamily: F, fontSize: 7, color: C.gold, background: C.goldLight, padding: "2px 5px", marginLeft: 6, borderRadius: 2 }}>CHAMPION</span>}
                          </div>
                          <div style={{ fontSize: 14, color: C.muted }}>{item.runs} run{item.runs !== 1 && "s"} · {item.t}</div>
                        </div>
                        <div style={{ fontFamily: F, fontSize: i < 3 ? 14 : 12, color: i === 0 ? C.gold : isMe ? C.blue : C.white, flexShrink: 0 }}>{item.score.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="sb" style={{ paddingTop: 12, position: "sticky", top: 12, paddingRight: 8, paddingLeft: 4 }}>
            {[5, 6, 3, 1, 4].map((pi, i) => <SideSlot key={`r${i}`} i={pi} ad={i % 2 !== 0} />)}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "20px 16px", borderTop: `1px dashed ${C.borderDash}`, color: C.muted, fontSize: 15, maxWidth: 1200, margin: "0 auto" }}>
        droprank.lol — skill is the only currency. New round every day at 00:00 UTC.
      </div>

      {/* PAYMENT MODAL */}
      {paying && <PayModal product={url.trim()} onPaid={onPaid} onClose={() => setPaying(false)} />}

      {/* GAME OVERLAY */}
      {playing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(8,12,26,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={e => { if (e.target === e.currentTarget) setPlaying(false); }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 4px" }}>
              <div style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.7)" }}>dropping for <span style={{ color: "#fff" }}>{url.trim()}</span></div>
              <button onClick={() => setPlaying(false)} style={{ fontFamily: F, fontSize: 14, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px" }}>✕</button>
            </div>
            <Game product={url.trim()} listingId={listingId} onDone={onDone} />
          </div>
        </div>
      )}
    </div>
  );
}
