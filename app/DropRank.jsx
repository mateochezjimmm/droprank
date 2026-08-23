import { useState, useEffect, useCallback, useRef } from "react";

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
const C = {
  bg: "#f5e6c8", surface: "#efe0c4", card: "#e8d5b0",
  blue: "#1a4a7a", blueMid: "#2563a8",
  red: "#c0392b", redLight: "rgba(192,57,43,0.1)",
  gold: "#b8860b", goldLight: "rgba(184,134,11,0.12)",
  silver: "#8a8a8a", bronze: "#a0622e", green: "#27ae60",
  text: "#3d2e1a", white: "#2d1f0e", muted: "#8a7a60",
  border: "rgba(139,119,80,0.4)", borderDash: "rgba(139,119,80,0.5)",
  gameBg: "#1a3a5c",
};
const F = "'Press Start 2P',monospace", B = "'VT323',monospace";
const GFONT = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";

const mkB = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const rndP = () => { const k = KEYS[Math.floor(Math.random() * KEYS.length)]; return { k, shape: SHAPES[k].m.map(r => [...r]), color: SHAPES[k].c, x: 3, y: 0 }; };
const rot = s => { const R = s.length, W = s[0].length; return Array.from({ length: W }, (_, c) => Array.from({ length: R }, (_, r) => s[R - 1 - r][c])); };
const ok = (b, s, x, y) => { for (let r = 0; r < s.length; r++) for (let c = 0; c < s[0].length; c++) if (s[r][c]) { const nx = x + c, ny = y + r; if (nx < 0 || nx >= COLS || ny >= ROWS) return false; if (ny >= 0 && b[ny][nx]) return false; } return true; };
const stamp = (b, p) => { const n = b.map(r => [...r]); for (let r = 0; r < p.shape.length; r++) for (let c = 0; c < p.shape[0].length; c++) if (p.shape[r][c] && p.y + r >= 0) n[p.y + r][p.x + c] = p.color; return n; };
const clr = b => { let n = 0; const nb = b.filter(r => { if (r.every(c => c)) { n++; return false; } return true; }); while (nb.length < ROWS) nb.unshift(Array(COLS).fill(null)); return { b: nb, n }; };

const LB = [
  { name: "launchfast.io", score: 4820, runs: 12, clicks: 341, t: "2h ago" },
  { name: "autoship.dev", score: 3150, runs: 8, clicks: 127, t: "45m ago" },
  { name: "@indie_sara", score: 2900, runs: 15, clicks: 89, t: "1h ago" },
  { name: "apiboss.com", score: 2340, runs: 6, clicks: 203, t: "3h ago" },
  { name: "deploykit.io", score: 1870, runs: 4, clicks: 56, t: "30m ago" },
  { name: "neonstack.app", score: 1650, runs: 9, clicks: 44, t: "5h ago" },
  { name: "@devmarco", score: 1200, runs: 3, clicks: 31, t: "4h ago" },
  { name: "shipfast.tools", score: 980, runs: 7, clicks: 18, t: "6h ago" },
  { name: "formhero.co", score: 870, runs: 2, clicks: 12, t: "1h ago" },
  { name: "cachelab.dev", score: 640, runs: 5, clicks: 8, t: "7h ago" },
  { name: "@buildinpublic", score: 520, runs: 11, clicks: 5, t: "2h ago" },
  { name: "refactor.ai", score: 410, runs: 1, clicks: 3, t: "8h ago" },
  { name: "stackpilot.co", score: 380, runs: 3, clicks: 2, t: "9h ago" },
  { name: "devlaunch.me", score: 290, runs: 2, clicks: 1, t: "10h ago" },
  { name: "@codejess", score: 210, runs: 4, clicks: 0, t: "11h ago" },
];

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
  const p = MINIS[i % MINIS.length]; const z = 10;
  return (<div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${p.s[0].length}, ${z}px)` }}>{p.s.flat().map((v, j) => (<div key={j} style={{ width: z, height: z, background: v ? p.c : "transparent", borderRadius: v ? 2 : 0, border: v ? "1px solid rgba(0,0,0,0.15)" : "none" }} />))}</div>);
}

// ── SPONSOR STRIP (compact) ──
function SponsorStrip() {
  const sp = [{ sold: true, name: "supastarter.dev" }, null, null, { sold: true, name: "agently.dev" }, null, null];
  return (
    <div style={{ display: "flex", gap: 6, padding: "8px 0", justifyContent: "center", flexWrap: "wrap" }}>
      {sp.map((s, i) => (
        <div key={i} style={{ border: `1px dashed ${s?.sold ? C.border : C.borderDash}`, padding: s?.sold ? "6px 12px" : "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: s?.sold ? C.goldLight : "rgba(26,74,122,0.04)", whiteSpace: "nowrap" }}>
          {s?.sold ? (<><span style={{ fontFamily: F, fontSize: 6, color: C.gold }}>SPONSOR</span><span style={{ fontSize: 14, color: C.white }}>{s.name}</span></>) : (<><div style={{ animation: `bob ${2.5 + i * 0.4}s ease-in-out infinite` }}><Mini i={i} /></div><span style={{ fontFamily: F, fontSize: 7, color: C.gold }}>$50</span><span style={{ fontFamily: F, fontSize: 5, color: C.muted }}>AVAIL</span></>)}
        </div>
      ))}
    </div>
  );
}

// ── SIDEBAR SLOT (BIGGER) ──
function SideSlot({ i, ad }) {
  if (ad) return (
    <div style={{ border: `1px solid ${C.border}`, padding: "18px 8px", textAlign: "center", marginBottom: 10, background: C.card, minHeight: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div style={{ fontFamily: F, fontSize: 8, color: C.muted }}>AD</div>
      <div style={{ width: "90%", height: 55, background: C.surface, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: F, fontSize: 6, color: C.muted }}>ADVERTISE</span>
      </div>
    </div>
  );
  return (
    <div style={{ border: `2px dashed ${C.borderDash}`, padding: "18px 10px", textAlign: "center", marginBottom: 10, cursor: "pointer", background: "rgba(26,74,122,0.03)", minHeight: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
      <div style={{ animation: `bob ${3 + i * 0.6}s ease-in-out infinite` }}><Mini i={i} /></div>
      <div style={{ fontFamily: F, fontSize: 16, color: C.muted }}>+</div>
      <div style={{ fontFamily: F, fontSize: 11, color: C.gold }}>$50</div>
      <div style={{ fontFamily: F, fontSize: 7, color: C.muted }}>AVAILABLE</div>
    </div>
  );
}

// ── TETRIS GAME ──
function Game({ product, onDone }) {
  const [board, setBoard] = useState(mkB);
  const [pc, setPc] = useState(() => rndP());
  const [next, setNext] = useState(() => rndP());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [over, setOver] = useState(false);
  const spd = useRef(TICK0);
  const pR = useRef(pc), bR = useRef(board), oR = useRef(false), sR = useRef(0);
  useEffect(() => { pR.current = pc; }, [pc]);
  useEffect(() => { bR.current = board; }, [board]);
  useEffect(() => { oR.current = over; }, [over]);
  useEffect(() => { sR.current = score; }, [score]);

  const lock = useCallback(() => {
    const p = pR.current, b = bR.current; if (!p) return;
    const nb = stamp(b, p); const { b: cb, n } = clr(nb);
    const newLines = lines + n;
    const newLevel = Math.floor(newLines / 10);
    const add = (PTS[n] || 0) * (newLevel + 1);
    setBoard(cb); setLines(newLines); setLevel(newLevel);
    setScore(s => s + add);
    if (n > 0) spd.current = Math.max(TICK_MIN, TICK0 * Math.pow(0.85, newLevel));
    const np = next;
    if (!ok(cb, np.shape, np.x, np.y)) { setOver(true); oR.current = true; return; }
    setPc({ ...np }); setNext(rndP());
  }, [lines, next]);

  const drop = useCallback(() => { if (oR.current) return; const p = pR.current; if (!p) return; if (ok(bR.current, p.shape, p.x, p.y + 1)) setPc(pr => ({ ...pr, y: pr.y + 1 })); else lock(); }, [lock]);
  const mv = useCallback(dx => { setPc(pr => pr && ok(bR.current, pr.shape, pr.x + dx, pr.y) ? { ...pr, x: pr.x + dx } : pr); }, []);
  const doR = useCallback(() => { setPc(pr => { if (!pr) return pr; const rs = rot(pr.shape); for (const dx of [0, 1, -1, 2, -2]) if (ok(bR.current, rs, pr.x + dx, pr.y)) return { ...pr, shape: rs, x: pr.x + dx }; return pr; }); }, []);
  const hd = useCallback(() => { setPc(pr => { if (!pr) return pr; let ny = pr.y; while (ok(bR.current, pr.shape, pr.x, ny + 1)) ny++; const d = { ...pr, y: ny }; pR.current = d; setTimeout(lock, 0); return d; }); }, [lock]);

  useEffect(() => { if (over) return; const id = setInterval(drop, spd.current); return () => clearInterval(id); }, [over, drop, level]);
  useEffect(() => { if (over) return; const h = e => { switch (e.key) { case "ArrowLeft": case "a": e.preventDefault(); mv(-1); break; case "ArrowRight": case "d": e.preventDefault(); mv(1); break; case "ArrowDown": case "s": e.preventDefault(); drop(); break; case "ArrowUp": case "w": e.preventDefault(); doR(); break; case " ": e.preventDefault(); hd(); break; } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [over, mv, drop, doR, hd]);

  let gY = pc ? pc.y : 0;
  if (pc) while (ok(board, pc.shape, pc.x, gY + 1)) gY++;
  const cells = board.map(r => [...r]);
  if (pc) {
    if (gY !== pc.y) for (let r = 0; r < pc.shape.length; r++) for (let c = 0; c < pc.shape[0].length; c++) if (pc.shape[r][c] && gY + r >= 0 && gY + r < ROWS && !cells[gY + r][pc.x + c]) cells[gY + r][pc.x + c] = "g";
    for (let r = 0; r < pc.shape.length; r++) for (let c = 0; c < pc.shape[0].length; c++) if (pc.shape[r][c] && pc.y + r >= 0 && pc.y + r < ROWS) cells[pc.y + r][pc.x + c] = pc.color;
  }
  const nxt = () => { const s = next.shape; return (<div style={{ display: "inline-grid", gridTemplateColumns: `repeat(${s[0].length}, 16px)` }}>{s.flat().map((v, i) => (<div key={i} style={{ width: 16, height: 16, background: v ? next.color : "transparent", border: v ? "2px solid rgba(255,255,255,0.3)" : "none", borderRadius: v ? 3 : 0, boxShadow: v ? "inset 0 -2px 0 rgba(0,0,0,0.25)" : "none" }} />))}</div>); };
  const restart = () => { setBoard(mkB()); setPc(rndP()); setNext(rndP()); setScore(0); setLines(0); setLevel(0); setOver(false); spd.current = TICK0; };
  const gRank = () => { const s = sR.current; const i = LB.findIndex(l => s >= l.score); return i === -1 ? LB.length + 1 : i + 1; };

  if (over) return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "28px", textAlign: "center", color: C.white, maxWidth: 320, width: "90vw", border: `4px solid ${C.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
      <div style={{ fontFamily: F, fontSize: 9, color: C.muted, marginBottom: 2 }}>dropping for</div>
      <div style={{ fontFamily: F, fontSize: 11, color: C.white, marginBottom: 16, wordBreak: "break-all" }}>{product}</div>
      <div style={{ fontFamily: F, fontSize: 11, color: C.red, marginBottom: 4 }}>SCORE</div>
      <div style={{ fontFamily: F, fontSize: 28, color: C.white, marginBottom: 6 }}>{score.toLocaleString()}</div>
      <div style={{ fontFamily: F, fontSize: 8, color: C.muted, marginBottom: 16 }}>{lines} lines · level {level} · rank #{gRank()}</div>
      <button onClick={restart} style={{ width: "100%", padding: "14px", fontFamily: F, fontSize: 11, background: C.red, color: "#fff", border: "none", cursor: "pointer", borderRadius: 4, marginBottom: 8 }}>DROP AGAIN</button>
      <button style={{ width: "100%", padding: "12px", fontFamily: F, fontSize: 10, background: C.blue, color: "#fff", border: "none", cursor: "pointer", borderRadius: 4, marginBottom: 10 }}>FLEX IT ON 𝕏</button>
      <div onClick={() => onDone(score)} style={{ fontFamily: F, fontSize: 9, color: C.muted, cursor: "pointer", textDecoration: "underline" }}>done</div>
    </div>
  );

  return (
    <div style={{ background: C.gameBg, borderRadius: 8, padding: 12, border: "3px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
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

// ── GATE MODAL (Pay $2 OR Watch Ad) ──
function GateModal({ product, onPaid, onWatchAd, onClose }) {
  const [loading, setLoading] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(15);

  useEffect(() => {
    if (!watchingAd) return;
    if (adTimer <= 0) { onWatchAd(); return; }
    const id = setTimeout(() => setAdTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [watchingAd, adTimer, onWatchAd]);

  const pay = () => { setLoading(true); setTimeout(() => { setLoading(false); onPaid(); }, 1200); };

  if (watchingAd) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(45,31,14,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 8, padding: "32px 28px", maxWidth: 400, width: "90vw", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.3)", border: `3px solid ${C.border}` }}>
          <div style={{ fontFamily: F, fontSize: 8, color: C.muted, marginBottom: 12, letterSpacing: 1 }}>ADVERTISEMENT</div>

          {/* Simulated ad slot */}
          <div style={{ width: "100%", height: 200, background: "#f0f0f0", border: `1px solid #ddd`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: F, fontSize: 8, color: "#aaa" }}>AD CONTENT</div>
              <div style={{ fontFamily: F, fontSize: 6, color: "#ccc", marginTop: 4 }}>Google AdSense / Rewarded Ad</div>
            </div>
          </div>

          {/* Timer bar */}
          <div style={{ width: "100%", height: 6, background: "#eee", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${((15 - adTimer) / 15) * 100}%`, height: "100%", background: C.blue, borderRadius: 3, transition: "width 1s linear" }} />
          </div>

          <div style={{ fontFamily: F, fontSize: 10, color: adTimer > 0 ? C.muted : C.green }}>
            {adTimer > 0 ? (
              <>Skip in <span style={{ color: C.red }}>{adTimer}s</span></>
            ) : (
              <button onClick={onWatchAd} style={{ fontFamily: F, fontSize: 10, color: "#fff", background: C.green, border: "none", padding: "10px 24px", cursor: "pointer", borderRadius: 4 }}>
                ✓ PLAY NOW
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(45,31,14,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.bg, border: `3px solid ${C.border}`, borderRadius: 8, padding: "28px 24px", maxWidth: 380, width: "90vw", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ fontFamily: F, fontSize: 13, color: C.blue, marginBottom: 14, lineHeight: 1.8 }}>List your product</div>

        <div style={{ background: C.surface, border: `1px dashed ${C.border}`, padding: "10px 14px", marginBottom: 20, borderRadius: 4 }}>
          <div style={{ fontFamily: F, fontSize: 7, color: C.muted, marginBottom: 3 }}>LISTING</div>
          <div style={{ fontSize: 20, color: C.white, wordBreak: "break-all" }}>{product}</div>
        </div>

        {/* Option 1: Pay $2 */}
        <div style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 6, padding: "16px", marginBottom: 12 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: C.gold, marginBottom: 6, letterSpacing: 1 }}>⭐ PREMIUM</div>
          <div style={{ fontFamily: F, fontSize: 22, color: C.white, marginBottom: 4 }}>$2</div>
          <div style={{ fontSize: 15, color: C.muted, marginBottom: 12 }}>Pay once · unlimited plays forever · no ads</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={pay} disabled={loading} style={{ flex: 1, padding: "12px", fontFamily: F, fontSize: 9, background: loading ? C.muted : C.red, color: "#fff", border: "none", cursor: loading ? "wait" : "pointer", borderRadius: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : "💳 CARD"}
            </button>
            <button onClick={pay} disabled={loading} style={{ flex: 1, padding: "12px", fontFamily: F, fontSize: 9, background: "#0070ba", color: "#fff", border: "none", cursor: loading ? "wait" : "pointer", borderRadius: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : "🅿 PAYPAL"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: F, fontSize: 8, color: C.muted }}>OR</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Option 2: Watch Ad */}
        <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 6, padding: "14px", marginTop: 12 }}>
          <div style={{ fontFamily: F, fontSize: 8, color: C.muted, marginBottom: 6 }}>FREE</div>
          <div style={{ fontSize: 16, color: C.white, marginBottom: 4 }}>Watch a 15s ad</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 10 }}>Plays 1 game · watch again next time</div>
          <button onClick={() => { setWatchingAd(true); setAdTimer(15); }} style={{ width: "100%", padding: "11px", fontFamily: F, fontSize: 9, background: "transparent", color: C.blue, border: `2px solid ${C.blue}`, cursor: "pointer", borderRadius: 4 }}>
            ▶ WATCH AD TO PLAY
          </button>
        </div>

        <div onClick={onClose} style={{ fontFamily: F, fontSize: 8, color: C.muted, cursor: "pointer", textDecoration: "underline", marginTop: 14 }}>cancel</div>
      </div>
    </div>
  );
}

// ── MAIN ──
export default function App() {
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [gating, setGating] = useState(false);
  const [paid, setPaid] = useState(false);
  const [best, setBest] = useState(null);

  const onDone = s => { setBest(p => Math.max(p || 0, s)); setPlaying(false); };
  const play = () => {
    if (!url.trim()) return;
    if (paid) { setPlaying(true); return; }
    setGating(true);
  };
  const onPaid = () => { setGating(false); setPaid(true); setPlaying(true); };
  const onWatchAd = () => { setGating(false); setPlaying(true); }; // free users see ad each time

  const lb = (() => {
    if (!best) return LB;
    const me = { name: url || "you", score: best, runs: 1, clicks: 0, t: "just now", me: true };
    return [...LB, me].sort((a, b) => b.score - a.score);
  })();

  const rk = i => i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
  const rc = i => i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : C.muted;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: B, fontSize: 18 }}>
      <link href={GFONT} rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:rgba(26,74,122,0.2)}
        input::placeholder{color:${C.muted}}
        @keyframes bob{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-5px) rotate(3deg)}}
        @media(max-width:860px){.sb{display:none!important}.mg{display:block!important}}
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.blue, padding: "0 16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
          <div style={{ fontFamily: F, fontSize: 14, color: "#fff", letterSpacing: 2, cursor: "pointer" }}>▓ DROPRANK</div>
          <div style={{ display: "flex", gap: 20 }}>
            {["RULES", "STATS"].map(t => (<span key={t} style={{ fontFamily: F, fontSize: 8, color: "rgba(255,255,255,0.7)", cursor: "pointer", letterSpacing: 1 }}>{t}</span>))}
          </div>
        </div>
      </div>

      {/* CHAMPION BAR */}
      <div style={{ background: C.card, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "9px 16px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: F, fontSize: 8, color: C.gold }}>👑 REIGNING CHAMPION</span>
          <span style={{ fontSize: 20, color: C.white }}>{LB[0].name}</span>
          <span style={{ fontFamily: F, fontSize: 13, color: C.gold }}>{LB[0].score.toLocaleString()}</span>
          <span style={{ fontSize: 15, color: C.muted }}>· {LB[0].clicks} clicks sent</span>
        </div>
      </div>

      {/* 3-COL */}
      <div className="mg" style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px", gap: 0, alignItems: "start" }}>

        {/* LEFT */}
        <div className="sb" style={{ paddingTop: 12, position: "sticky", top: 12, paddingLeft: 8, paddingRight: 4 }}>
          {[0, 1, 2, 3, 4].map(i => <SideSlot key={`l${i}`} i={i} ad={i % 2 === 0} />)}
        </div>

        {/* CENTER */}
        <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", padding: "0 12px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 28, padding: "11px 0", borderBottom: `1px dashed ${C.borderDash}`, flexWrap: "wrap" }}>
            {[{ n: "10,812", l: "VISITORS" }, { n: "■ 236", l: "ONLINE", c: C.green }, { n: "34,644", l: "DROPS TODAY" }, { n: "598", l: "PRODUCTS" }].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontSize: 20, color: s.c || C.white, fontWeight: "bold" }}>{s.n}</div><div style={{ fontFamily: F, fontSize: 7, color: C.muted, marginTop: 2 }}>{s.l}</div></div>
            ))}
          </div>

          <div style={{ textAlign: "center", padding: "28px 12px 16px" }}>
            <div style={{ fontFamily: F, fontSize: 16, color: C.blue, lineHeight: 2, marginBottom: 6 }}>Drop blocks.<br />Claim #1.</div>
            <div style={{ fontSize: 19, color: C.muted, maxWidth: 480, margin: "0 auto 18px", lineHeight: 1.5 }}>
              The leaderboard money can't buy. Play to rank your product — pay $2 for unlimited or watch an ad each game.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 440, margin: "0 auto", flexWrap: "wrap" }}>
              <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && play()}
                placeholder="yourproduct.com or @handle"
                style={{ flex: 1, minWidth: 180, padding: "11px 12px", fontSize: 19, fontFamily: B, background: C.surface, color: C.white, border: `2px dashed ${C.borderDash}`, outline: "none" }}
              />
              <button onClick={play} style={{ padding: "11px 24px", fontFamily: F, fontSize: 11, background: C.red, color: "#fff", border: "none", cursor: "pointer" }}>
                {paid ? "▶ PLAY" : "$2 · PLAY"}
              </button>
            </div>
            <div style={{ fontFamily: F, fontSize: 7, color: C.muted, marginTop: 8 }}>
              {paid
                ? <>✓ Premium · unlimited plays · resets <span style={{ color: C.red }}>13:42:07</span></>
                : <>$2 unlimited or watch ad per game · resets daily</>
              }
            </div>
          </div>

          <SponsorStrip />

          <div style={{ paddingBottom: 32 }}>
            <div style={{ textAlign: "center", padding: "9px", background: C.blue, fontFamily: F, fontSize: 9, color: "#fff", letterSpacing: 2 }}>🏆 TODAY'S BEST 🏆</div>
            <div style={{ textAlign: "center", padding: "5px", fontFamily: F, fontSize: 7, color: C.muted }}>{lb.length} PRODUCTS DROPPING TODAY</div>
            {lb.map((item, i) => (
              <div key={item.name + i} style={{
                display: "flex", alignItems: "center", padding: "11px 12px",
                background: item.me ? "rgba(26,74,122,0.08)" : i === 0 ? C.goldLight : i % 2 === 0 ? C.card : C.surface,
                borderLeft: `3px solid ${item.me ? C.blue : rc(i)}`,
                borderBottom: `1px solid ${C.border}`, gap: 8, cursor: "pointer",
              }}>
                <div style={{ fontFamily: F, fontSize: 10, color: rc(i), minWidth: 32, textAlign: "center" }}>{rk(i)}</div>
                <div style={{ width: 32, height: 32, background: item.me ? "rgba(26,74,122,0.12)" : C.surface, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontSize: 11, color: item.me ? C.blue : C.muted, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name}
                    {item.me && <span style={{ fontFamily: F, fontSize: 7, color: "#fff", background: C.blue, padding: "2px 5px", marginLeft: 6, borderRadius: 2 }}>YOU</span>}
                    {i === 0 && !item.me && <span style={{ fontFamily: F, fontSize: 7, color: "#fff", background: C.gold, padding: "2px 5px", marginLeft: 6, borderRadius: 2 }}>CHAMPION</span>}
                  </div>
                  <div style={{ fontSize: 14, color: C.muted }}>{item.runs} run{item.runs !== 1 && "s"} · {item.clicks} clicks · {item.t}</div>
                </div>
                <div style={{ fontFamily: F, fontSize: i < 3 ? 14 : 12, color: i === 0 ? C.gold : item.me ? C.blue : C.white, flexShrink: 0 }}>{item.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="sb" style={{ paddingTop: 12, position: "sticky", top: 12, paddingRight: 8, paddingLeft: 4 }}>
          {[5, 6, 3, 1, 4].map((pi, i) => <SideSlot key={`r${i}`} i={pi} ad={i % 2 !== 0} />)}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px 16px", borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 15, maxWidth: 1200, margin: "0 auto" }}>
        droprank.lol — skill is the only currency. Resets daily at 00:00 UTC.
      </div>

      {gating && <GateModal product={url} onPaid={onPaid} onWatchAd={onWatchAd} onClose={() => setGating(false)} />}

      {playing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(45,31,14,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={e => { if (e.target === e.currentTarget) setPlaying(false); }}>
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 4px" }}>
              <div style={{ fontFamily: F, fontSize: 7, color: "rgba(255,255,255,0.6)" }}>dropping for <span style={{ color: "#fff" }}>{url}</span></div>
              <button onClick={() => setPlaying(false)} style={{ fontFamily: F, fontSize: 14, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px" }}>✕</button>
            </div>
            <Game product={url} onDone={onDone} />
          </div>
        </div>
      )}
    </div>
  );
}
