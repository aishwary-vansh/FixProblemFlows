import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

/* src/pages/Landing.tsx  (route: /)
   Self-contained CSS (no Tailwind needed). Needs react + react-router-dom.
   Buttons go to /login and /signup. Theme toggle remembers the choice. */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
html{scroll-behavior:smooth}
.ff{--bg:#07060F;--tx:#fff;--mut:rgba(255,255,255,.68);--line:rgba(255,255,255,.12);--card:rgba(255,255,255,.055);--hd:rgba(7,6,15,.72);--chip:rgba(22,20,42,.88);--dot:rgba(255,255,255,.14);--gl:1;
 --wb:#fff;--wf:#0B0A16;--wh:#EFE9FF;--cy:#22D3EE;--pk:#F472B6;--vi:#A78BFA;--am:#FBBF24;--gn:#34D399;
 position:relative;min-height:100vh;overflow:hidden;background:var(--bg);color:var(--tx);font-family:'Plus Jakarta Sans',system-ui,sans-serif;line-height:1.5;transition:background .4s,color .4s}
.ff[data-theme=light]{--bg:#F7F5FF;--tx:#17132B;--mut:rgba(23,19,43,.7);--line:rgba(23,19,43,.12);--card:rgba(255,255,255,.78);--hd:rgba(247,245,255,.78);--chip:rgba(255,255,255,.95);--dot:rgba(23,19,43,.13);--gl:.55;
 --wb:#17132B;--wf:#fff;--wh:#2b2450;--cy:#0891B2;--pk:#DB2777;--vi:#7C3AED;--am:#D97706;--gn:#059669}
.ff *{box-sizing:border-box}:where(.ff) a{color:inherit;text-decoration:none}
.ff a:focus-visible,.ff button:focus-visible{outline:2px solid var(--vi);outline-offset:3px}
.ff-wrap{position:relative;z-index:2;max-width:1160px;margin:0 auto;padding:0 24px}
.ff-glow{position:absolute;border-radius:50%;filter:blur(110px);pointer-events:none;z-index:0}
.ff-g1{width:540px;height:540px;left:-160px;top:-40px;background:#7C3AED;opacity:calc(.5*var(--gl));animation:ffd1 16s ease-in-out infinite}
.ff-g2{width:480px;height:480px;right:-140px;top:60px;background:#F472B6;opacity:calc(.38*var(--gl));animation:ffd2 19s ease-in-out infinite}
.ff-g3{width:440px;height:440px;left:32%;top:560px;background:#22D3EE;opacity:calc(.28*var(--gl));animation:ffd1 22s ease-in-out infinite}
.ff-grid{position:absolute;inset:0;z-index:1;pointer-events:none;background-image:radial-gradient(var(--dot) 1px,transparent 1px);background-size:28px 28px;-webkit-mask-image:radial-gradient(ellipse at 50% 15%,#000 10%,transparent 62%);mask-image:radial-gradient(ellipse at 50% 15%,#000 10%,transparent 62%)}
@keyframes ffd1{50%{transform:translate(60px,40px) scale(1.15)}}
@keyframes ffd2{50%{transform:translate(-60px,30px) scale(1.1)}}
@keyframes ffrise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes fflt{50%{transform:translateY(-10px)}}
@keyframes ffshine{to{background-position:200% center}}
@keyframes ffping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}
@keyframes ffmq{to{transform:translateX(-50%)}}
.ff-rise{animation:ffrise .8s cubic-bezier(.2,.7,.2,1) backwards}

.ff-head{position:sticky;top:0;z-index:20;background:var(--hd);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.ff-bar{display:flex;align-items:center;justify-content:space-between;height:68px;gap:12px}
.ff-logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;letter-spacing:-.02em}
.ff-mark{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#FBBF24,#F472B6,#7C3AED)}
.ff-nav{display:flex;gap:4px;font-size:14px;color:var(--mut)}
.ff-nav a,.ff-link{padding:8px 14px;border-radius:99px;transition:background .25s,color .25s}
.ff-nav a:hover,.ff-link:hover{background:var(--line);color:var(--tx)}
.ff-act{display:flex;align-items:center;gap:6px;flex-shrink:0}
.ff-link{font-size:14px;font-weight:600;color:var(--mut)}
.ff-tog{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--tx);display:grid;place-items:center;cursor:pointer;transition:transform .4s,background .25s}
.ff-tog:hover{transform:rotate(25deg) scale(1.06);background:var(--line)}
.ff-btn{display:inline-flex;align-items:center;gap:12px;border-radius:99px;font-weight:700;font-size:15px;padding:6px 6px 6px 22px;white-space:nowrap;flex-shrink:0;border:0;cursor:pointer;transition:box-shadow .35s,transform .3s cubic-bezier(.2,.7,.2,1),background .3s}
.ff-btn:hover{transform:translateY(-2px)}.ff-btn:active{transform:scale(.97)}
.ff-btn i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-style:normal;transition:transform .3s}
.ff-btn:hover i{transform:rotate(45deg)}
.ff-bar .ff-btn{font-size:14px;padding:4px 4px 4px 18px}.ff-bar .ff-btn i{width:32px;height:32px}
.ff-w{background:var(--wb);color:var(--wf)}.ff-w:hover{background:var(--wh)}.ff-w i{background:var(--wf);color:var(--wb)}
.ff-p{background:linear-gradient(90deg,#FBBF24,#F472B6,#A78BFA);color:#0B0A16;box-shadow:0 0 44px -8px rgba(244,114,182,.7)}
.ff-p:hover{box-shadow:0 0 60px -4px rgba(244,114,182,.95)}.ff-p i{background:#0B0A16;color:#fff}
.ff-o{border:1px solid var(--line);background:var(--card);color:var(--tx)}.ff-o:hover{background:var(--line)}.ff-o i{background:var(--tx);color:var(--bg)}

.ff-hero{padding:72px 0 30px;text-align:center}
.ff-h1{font-size:clamp(40px,7vw,78px);font-weight:800;line-height:1.03;letter-spacing:-.035em;margin:0 auto;max-width:900px}
.ff-i{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;font-size:1.1em;color:var(--pk);padding-right:.05em}
@supports ((-webkit-background-clip:text) or (background-clip:text)){.ff-i{background:linear-gradient(90deg,var(--cy),var(--pk),var(--am),var(--cy));background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:ffshine 7s linear infinite}}
.ff-sub{max-width:640px;margin:26px auto 0;font-size:19px;color:var(--mut)}
.ff-cta{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:36px}
.ff-note{margin-top:22px;font-size:14px;color:var(--mut)}.ff-note b{color:var(--gn)}
.ff-pills{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}
.ff-pills span{border:1px solid var(--line);background:var(--card);border-radius:99px;padding:6px 14px;font-size:13px;font-weight:600}

.ff-stage{position:relative;max-width:940px;margin:56px auto 0;display:grid;grid-template-columns:1.25fr 1fr;gap:18px;text-align:left}
.ff-card{border:1px solid var(--line);border-radius:22px;background:var(--card);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);padding:22px;box-shadow:0 30px 70px -36px rgba(20,10,60,.55)}
.ff-tk{display:flex;justify-content:space-between;gap:12px}
.ff-id{font:500 12px ui-monospace,monospace;color:var(--mut)}.ff-tt{font-size:19px;font-weight:700}.ff-loc{font-size:13px;color:var(--mut)}
.ff-badge{align-self:flex-start;border-radius:99px;padding:5px 12px;font:600 12px ui-monospace,monospace;background:#FBBF24;color:#0B0A16;transition:background .3s}.ff-badge.g{background:#34D399}
.ff-meta{display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px;font-size:13px;font-weight:600}
.ff-pri{background:rgba(244,114,182,.2);color:var(--pk);border-radius:6px;padding:3px 9px;font-size:12px}
.ff-seg{display:flex;gap:6px}.ff-seg button{flex:1;height:22px;background:none;border:0;padding:0;cursor:pointer;display:flex;align-items:center}
.ff-seg span{display:block;width:100%;height:6px;border-radius:9px;background:var(--line);transition:background .3s}
.ff-seg .on span{background:linear-gradient(90deg,var(--cy),var(--vi))}.ff-seg .done span{background:var(--gn)}
.ff-log{list-style:none;margin:14px 0 0;padding:14px 0 0;border-top:1px solid var(--line);display:grid;gap:11px;min-height:170px;align-content:start}
.ff-log li{display:flex;gap:12px;font-size:13.5px;animation:ffrise .5s backwards}
.ff-log time{flex:0 0 42px;font:500 12px ui-monospace,monospace;color:var(--mut);padding-top:2px}
.ff-log small{display:block;color:var(--mut);font-size:12px}
.ff-side{display:grid;gap:18px;align-content:start}
.ff-stat{display:flex;align-items:center;gap:14px}.ff-stat strong{font-size:30px;line-height:1;letter-spacing:-.03em}.ff-stat span{font-size:13px;color:var(--mut)}
.ff-dot{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:20px;flex-shrink:0}
.ff-ex{text-align:center;font-size:12px;color:var(--mut);margin-top:14px}
.ff-chip{position:absolute;display:flex;align-items:center;gap:10px;padding:11px 15px;border-radius:16px;border:1px solid var(--line);background:var(--chip);font-size:13px;font-weight:600;animation:fflt 6s ease-in-out infinite;box-shadow:0 20px 40px -22px rgba(20,10,60,.6)}
.ff-ping{position:relative;width:10px;height:10px;border-radius:50%;background:var(--gn)}
.ff-ping:after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--gn);animation:ffping 2s ease-out infinite}

.ff-mq{margin-top:56px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.ff-mq div{display:flex;gap:14px;width:max-content;animation:ffmq 34s linear infinite}.ff-mq:hover div{animation-play-state:paused}
.ff-mq span{display:flex;align-items:center;gap:10px;border:1px solid var(--line);background:var(--card);border-radius:99px;padding:11px 22px;font-size:17px;font-weight:700}
.ff-mq i{width:11px;height:11px;border-radius:50%;box-shadow:0 0 14px currentColor;background:currentColor}
.ff-band{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;border:1px solid var(--line);border-radius:24px;background:var(--card);overflow:hidden}
.ff-band div{padding:28px;text-align:center}.ff-band div+div{border-left:1px solid var(--line)}
.ff-band strong{display:block;font-size:44px;letter-spacing:-.04em;line-height:1.1;background:linear-gradient(90deg,var(--cy),var(--pk));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.ff-band span{color:var(--mut);font-size:15px}

.ff-sec{padding:96px 0 0;scroll-margin-top:24px}
.ff-eh{text-align:center;max-width:720px;margin:0 auto 44px}
.ff-eh h2{font-size:clamp(30px,4.5vw,46px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin:0}
.ff-eh p{color:var(--mut);font-size:18px;margin:14px 0 0}
.ff-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.ff-bad{border-color:rgba(251,113,133,.4)}.ff-good{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.09)}
.ff-card h3{margin:0 0 14px;font-size:20px}
.ff-ul{list-style:none;margin:0;padding:0;display:grid;gap:11px;color:var(--mut);font-size:15.5px}
.ff-ul li{display:flex;gap:11px}.ff-ul li:before{content:"✕";color:#FB7185;font-weight:800}.ff-good .ff-ul li:before{content:"✓";color:var(--gn)}
.ff-tabs{display:flex;gap:8px;justify-content:center;margin-bottom:26px;flex-wrap:wrap}
.ff-tabs button{border:1px solid var(--line);background:var(--card);color:var(--tx);border-radius:99px;padding:10px 22px;font:700 15px 'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:all .25s}
.ff-tabs button.on{background:var(--tx);color:var(--bg);border-color:var(--tx)}
.ff-role{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center}
.ff-role h3{font-size:30px;letter-spacing:-.02em;margin:0 0 12px}.ff-role p{color:var(--mut);font-size:17px;margin:0 0 18px}
.ff-rows{display:grid;gap:10px}
.ff-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 15px;border:1px solid var(--line);border-radius:14px;font-size:14px;animation:ffrise .5s backwards}
.ff-row small{display:block;color:var(--mut);font-size:12px}
.ff-tag{border-radius:99px;padding:4px 11px;font:600 11px ui-monospace,monospace;color:#0B0A16;white-space:nowrap}
.ff-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;counter-reset:s}
.ff-step{position:relative;padding-top:30px}
.ff-step:before{counter-increment:s;content:counter(s);position:absolute;top:-16px;left:22px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#0B0A16;background:var(--c)}
.ff-step h3{font-size:18px}.ff-step p{margin:0;color:var(--mut);font-size:15px}
.ff-fs{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.ff-f{position:relative;overflow:hidden;transition:transform .25s,border-color .25s}.ff-f:hover{transform:translateY(-4px);border-color:var(--c)}
.ff-f:after{content:"";position:absolute;right:-40px;top:-40px;width:140px;height:140px;border-radius:50%;background:var(--c);opacity:.16;filter:blur(30px)}
.ff-f.wide{grid-column:span 2}
.ff-f .ff-dot{background:color-mix(in srgb,var(--c) 22%,transparent);margin-bottom:16px}
.ff-f h3{margin:0 0 6px;font-size:18px}.ff-f p{margin:0;color:var(--mut);font-size:15px}
.ff-fin{margin:96px 0 0;padding:68px 28px;border-radius:32px;text-align:center;border:1px solid var(--line);background:radial-gradient(600px 240px at 20% 0,rgba(124,58,237,.5),transparent),radial-gradient(600px 240px at 85% 100%,rgba(244,114,182,.42),transparent),var(--card)}
.ff-fin h2{font-size:clamp(30px,5vw,52px);font-weight:800;letter-spacing:-.03em;line-height:1.08;margin:0 auto;max-width:720px}
.ff-fin p{color:var(--mut);font-size:18px;margin:14px 0 0}
.ff-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px;padding:44px 24px;font-size:14px;color:var(--mut)}

@media(max-width:860px){.ff-nav,.ff-chip{display:none}.ff-stage,.ff-2,.ff-fs,.ff-role{grid-template-columns:1fr}.ff-f.wide{grid-column:auto}.ff-steps{grid-template-columns:1fr 1fr;row-gap:36px}.ff-band strong{font-size:32px}.ff-band div{padding:20px 8px}}
@media(max-width:520px){.ff-link{display:none}.ff-steps{grid-template-columns:1fr}.ff-hero{padding-top:48px}.ff-sub{font-size:17px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.ff *,.ff *:before,.ff *:after{animation:none!important;transition:none!important}}
`;

const STEPS = [
  { s: "NEW", who: "Sam, student", n: "Reported: AC not cooling", t: "10:00", sla: "6h 00m left" },
  { s: "ASSIGNED", who: "Admin", n: "Priority HIGH, assigned to Rahul", t: "10:12", sla: "5h 48m left" },
  { s: "ACCEPTED", who: "Rahul, technician", n: "Accepted the assignment", t: "10:20", sla: "5h 40m left" },
  { s: "IN_PROGRESS", who: "Rahul, technician", n: "Started work on site", t: "10:45", sla: "5h 15m left" },
  { s: "RESOLVED", who: "Rahul, technician", n: "Compressor fixed, AC tested", t: "13:40", sla: "2h 20m left" },
  { s: "CLOSED", who: "Sam, student", n: "Verified the fix, rated 5/5", t: "14:05", sla: "Closed within SLA" },
];

const STAGES: [string, string][] = [["Report", "#22D3EE"], ["Prioritize", "#F472B6"], ["Assign", "#A78BFA"], ["Accept", "#FBBF24"], ["Work", "#FB923C"], ["Resolve", "#34D399"], ["Verify", "#60A5FA"], ["Close", "#E879F9"]];

const ROLES = [
  { k: "Users", h: "Report it once, then relax", p: "Say what is broken, where it is and how urgent it feels. Follow every update and confirm the fix yourself.",
    rows: [["AC not working", "Block B, Room 204", "IN_PROGRESS", "#FBBF24"], ["Water leakage", "Block A, Floor 1", "ASSIGNED", "#A78BFA"], ["Projector flicker", "Lab 3", "RESOLVED", "#34D399"]] },
  { k: "Technicians", h: "Know what to fix next", p: "Your assigned issues are sorted with SLA deadlines. Accept, start, add notes and resolve with a photo.",
    rows: [["FX-1024 AC not working", "HIGH, 5h 15m left", "START", "#FBBF24"], ["FX-1031 Broken tap", "MEDIUM, 21h left", "ACCEPT", "#22D3EE"], ["FX-1036 Fuse tripped", "CRITICAL, 1h 10m left", "ACCEPT", "#F472B6"]] },
  { k: "Admins", h: "See everything, miss nothing", p: "Review new issues, set priority, assign the right technician and watch SLA warnings before they become breaches.",
    rows: [["12 new issues", "Waiting for assignment", "REVIEW", "#22D3EE"], ["3 near SLA limit", "Needs attention today", "WARNING", "#FBBF24"], ["Internet, Block A", "Most reported category", "TREND", "#F472B6"]] },
];

const FEATURES = [
  { c: "#22D3EE", i: "⏱", t: "SLA timers", p: "Deadlines are set from priority. Admins see warnings before an issue is late.", w: true },
  { c: "#F472B6", i: "📜", t: "Full history", p: "Every status change and reassignment is logged." },
  { c: "#FBBF24", i: "📷", t: "Photo proof", p: "Photos when reporting, proof when finished." },
  { c: "#A78BFA", i: "🔁", t: "Verify or reopen", p: "Nothing closes until the reporter confirms it is fixed." },
  { c: "#34D399", i: "📊", t: "Analytics", p: "Pending work, technician workload, resolution time and repeat problems.", w: true },
  { c: "#FB923C", i: "🔒", t: "Role-based access", p: "Users, technicians and admins see only what they need." },
];

const Arrow = () => (
  <i aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M8 7h9v9" /></svg></i>
);

function Demo() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const last = i === STEPS.length - 1;
    const t = setTimeout(() => setI(last ? 0 : i + 1), last ? 3800 : 2200);
    return () => clearTimeout(t);
  }, [i, hold]);
  const c = STEPS[i];
  const closed = c.s === "CLOSED";
  return (
    <div className="ff-card" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="ff-tk">
        <div><div className="ff-id">FX-1024</div><div className="ff-tt">AC not working</div><div className="ff-loc">Block B, Floor 2, Room 204</div></div>
        <span className={"ff-badge" + (closed ? " g" : "")} aria-live="polite">{c.s}</span>
      </div>
      <div className="ff-meta"><span className="ff-pri">HIGH priority</span><span style={{ color: closed ? "var(--gn)" : "inherit" }}>{c.sla}</span></div>
      <div className="ff-seg" role="group" aria-label="Ticket status steps">
        {STEPS.map((s, k) => (
          <button key={s.s} type="button" aria-label={"Show " + s.s} onClick={() => setI(k)} className={k < i || (closed && k === i) ? "done" : k === i ? "on" : ""}><span /></button>
        ))}
      </div>
      <ol className="ff-log">
        {STEPS.slice(0, i + 1).map((s) => (
          <li key={s.s}><time>{s.t}</time><span>{s.n}<small>{s.who}</small></span></li>
        ))}
      </ol>
    </div>
  );
}

function Roles() {
  const [r, setR] = useState(0);
  const role = ROLES[r];
  return (
    <>
      <div className="ff-tabs" role="tablist">
        {ROLES.map((x, k) => (
          <button key={x.k} role="tab" aria-selected={k === r} className={k === r ? "on" : ""} onClick={() => setR(k)}>{x.k}</button>
        ))}
      </div>
      <div className="ff-card ff-role" key={role.k}>
        <div><h3>{role.h}</h3><p>{role.p}</p><Link to="/signup" className="ff-btn ff-w">Join as {role.k.slice(0, -1).toLowerCase()}<Arrow /></Link></div>
        <div className="ff-rows">
          {role.rows.map(([a, b, tag, col], k) => (
            <div key={a} className="ff-row" style={{ animationDelay: k * 0.08 + "s" }}>
              <span>{a}<small>{b}</small></span><span className="ff-tag" style={{ background: col }}>{tag}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Landing() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const s = localStorage.getItem("fixflow-theme");
      if (s === "light" || s === "dark") return s;
    } catch { /* ignore */ }
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  useEffect(() => {
    try { localStorage.setItem("fixflow-theme", theme); } catch { /* ignore */ }
  }, [theme]);
  const dark = theme === "dark";

  return (
    <div className="ff" data-theme={theme} id="top">
      <style>{CSS}</style>
      <div className="ff-glow ff-g1" aria-hidden="true" /><div className="ff-glow ff-g2" aria-hidden="true" /><div className="ff-glow ff-g3" aria-hidden="true" />
      <div className="ff-grid" aria-hidden="true" />

      <header className="ff-head">
        <div className="ff-wrap ff-bar">
          <a href="#top" className="ff-logo">
            <span className="ff-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg></span>
            FixFlow
          </a>
          <nav className="ff-nav" aria-label="Sections"><a href="#why">Why FixFlow</a><a href="#roles">Roles</a><a href="#how">How it works</a><a href="#features">Features</a></nav>
          <div className="ff-act">
            <button type="button" className="ff-tog" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
              )}
            </button>
            <Link to="/login" className="ff-link">Log in</Link>
            <Link to="/signup" className="ff-btn ff-w">Register<Arrow /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="ff-wrap ff-hero">
          <h1 className="ff-h1 ff-rise">Stop chasing repairs. Track every fix from <span className="ff-i">report to done</span></h1>
          <p className="ff-sub ff-rise" style={{ animationDelay: ".12s" }}>FixFlow replaces WhatsApp threads and spreadsheets with one place to report issues, assign technicians, meet deadlines and confirm the work.</p>
          <div className="ff-cta ff-rise" style={{ animationDelay: ".24s" }}>
            <Link to="/signup" className="ff-btn ff-p">Create your account<Arrow /></Link>
            <Link to="/login" className="ff-btn ff-o">Log in<Arrow /></Link>
          </div>
          <div className="ff-pills ff-rise" style={{ animationDelay: ".36s" }}><span>🎓 Colleges</span><span>🏢 Offices</span><span>🏠 Apartments</span></div>

          <div className="ff-stage ff-rise" style={{ animationDelay: ".45s" }}>
            <div className="ff-chip" style={{ left: -70, top: -22 }}><span className="ff-ping" />FX-1024 assigned to Rahul</div>
            <div className="ff-chip" style={{ right: -60, bottom: 56, animationDelay: "2s" }}>★★★★★ Fix verified by user</div>
            <Demo />
            <div className="ff-side">
              {([["📥", "12", "New issues waiting", "34,211,238"], ["🛠", "8.4h", "Average time to resolve", "251,191,36"], ["✅", "94%", "Fixed within SLA", "52,211,153"]] as const).map(([ic, n, l, rgb]) => (
                <div key={l} className="ff-card ff-stat"><span className="ff-dot" style={{ background: `rgba(${rgb},.2)` }}>{ic}</span><div><strong>{n}</strong><br /><span>{l}</span></div></div>
              ))}
            </div>
          </div>
          <p className="ff-ex">Example dashboard with sample data</p>

          <div className="ff-mq" aria-hidden="true">
            <div>{[...STAGES, ...STAGES].map(([l, c], k) => <span key={k}><i style={{ color: c }} />{l}</span>)}</div>
          </div>
          <div className="ff-band">
            <div><strong>3</strong><span>roles in one workspace</span></div>
            <div><strong>4</strong><span>priority levels with SLA timers</span></div>
            <div><strong>7</strong><span>ticket states, all tracked</span></div>
          </div>
        </section>

        <section className="ff-wrap ff-sec" id="why">
          <div className="ff-eh"><h2>Maintenance should not live in a chat group</h2><p>When requests are scattered, nobody knows who owns the fix or whether it happened.</p></div>
          <div className="ff-2">
            <div className="ff-card ff-bad"><h3>Without FixFlow</h3><ul className="ff-ul"><li>Requests arrive by call, message and spreadsheet</li><li>No one knows who is fixing what</li><li>Urgent problems sit in the queue</li><li>Reporters never hear back</li></ul></div>
            <div className="ff-card ff-good"><h3>With FixFlow</h3><ul className="ff-ul"><li>One ticket per issue, with photos and location</li><li>Clear owner, priority and deadline</li><li>Live status the reporter can follow</li><li>Closed only after the reporter confirms</li></ul></div>
          </div>
        </section>

        <section className="ff-wrap ff-sec" id="roles">
          <div className="ff-eh"><h2>One platform, three views</h2><p>Everyone sees the same ticket, shaped for their job.</p></div>
          <Roles />
        </section>

        <section className="ff-wrap ff-sec" id="how">
          <div className="ff-eh"><h2>From problem to solved in four steps</h2></div>
          <div className="ff-steps">
            {([["#22D3EE", "Report", "Describe the issue, pick the location and add a photo."], ["#F472B6", "Assign", "An admin sets the priority and picks a technician."], ["#FBBF24", "Fix", "The technician accepts, starts work and adds notes."], ["#34D399", "Verify", "The reporter confirms the fix, or reopens it."]] as const).map(([c, t, p]) => (
              <div key={t} className="ff-card ff-step" style={{ "--c": c } as CSSProperties}><h3>{t}</h3><p>{p}</p></div>
            ))}
          </div>
        </section>

        <section className="ff-wrap ff-sec" id="features">
          <div className="ff-eh"><h2>Everything a maintenance team needs</h2><p>Simple for the people reporting. Clear for the people fixing.</p></div>
          <div className="ff-fs">
            {FEATURES.map((f) => (
              <div key={f.t} className={"ff-card ff-f" + (f.w ? " wide" : "")} style={{ "--c": f.c } as CSSProperties}>
                <span className="ff-dot" aria-hidden="true">{f.i}</span><h3>{f.t}</h3><p>{f.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ff-wrap">
          <div className="ff-fin">
            <h2>Give every issue an owner and a deadline</h2>
            <p>Set up in minutes. Report your first issue today.</p>
            <div className="ff-cta"><Link to="/signup" className="ff-btn ff-p">Create your account<Arrow /></Link><Link to="/login" className="ff-btn ff-o">Log in<Arrow /></Link></div>
          </div>
        </section>
      </main>

      <footer className="ff-wrap ff-foot"><span>© {new Date().getFullYear()} FixFlow</span><span>Report. Assign. Fix. Verify.</span></footer>
    </div>
  );
}