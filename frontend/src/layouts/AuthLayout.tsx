import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/* src/components/AuthLayout.tsx
   Shared shell for Login and Signup. Self-contained CSS, follows the same
   light/dark choice the landing page saves in localStorage ("fixflow-theme"). */

const CSS = `
.fa{--bg:#fff;--tx:#111;--mut:#6b6b6b;--bd:#e4e4e7;--card:#fff;--btn:#171717;--btnf:#fff;--err:#c62828;--errbg:#fdecea;--ok:#0f7a4f;--okbg:#e6f6ee;--sh:0 1px 2px rgba(0,0,0,.06);
 min-height:100vh;display:grid;place-items:center;padding:40px 20px;background:var(--bg);color:var(--tx);font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif;transition:background .3s,color .3s}
.fa[data-theme=dark]{--bg:#0b0a14;--tx:#f5f5f7;--mut:#a1a1aa;--bd:#2b2a3a;--card:#13121f;--btn:#f5f5f7;--btnf:#0b0a14;--err:#ff8a80;--errbg:#3a1a1a;--ok:#5fe0a8;--okbg:#12281f;--sh:none}
.fa *{box-sizing:border-box}.fa a{color:var(--tx);font-weight:600;text-decoration:none}.fa a:hover{text-decoration:underline}
.fa-in{width:100%;max-width:440px;text-align:center;animation:fa-up .6s cubic-bezier(.2,.7,.2,1) backwards}
@keyframes fa-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.fa-logo{width:52px;height:52px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#FBBF24,#F472B6,#7C3AED)}
.fa h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0 0 26px}
.fa-card{text-align:left;border:1px solid var(--bd);background:var(--card);border-radius:24px;padding:28px;display:grid;gap:18px}
.fa-lab{display:block;font-size:14px;font-weight:600;margin-bottom:8px}
.fa-box{position:relative}
.fa-inp{width:100%;height:48px;border-radius:12px;border:1px solid var(--bd);background:var(--card);color:var(--tx);padding:0 14px;font:inherit;font-size:15px;box-shadow:var(--sh);transition:border-color .2s,box-shadow .2s}
.fa-inp::placeholder{color:var(--mut)}
.fa-inp:focus{outline:none;border-color:#7C3AED;box-shadow:0 0 0 4px rgba(124,58,237,.18)}
.fa-eye{position:absolute;right:6px;top:6px;height:36px;width:36px;border:0;border-radius:9px;background:none;color:var(--mut);cursor:pointer;display:grid;place-items:center}
.fa-eye:hover{color:var(--tx)}
.fa-hint{font-size:12.5px;color:var(--mut);margin-top:6px}
.fa-btn{height:48px;border:0;border-radius:12px;background:var(--btn);color:var(--btnf);font:inherit;font-size:15px;font-weight:700;cursor:pointer;transition:transform .2s,opacity .2s}
.fa-btn:hover:not(:disabled){transform:translateY(-1px)}.fa-btn:active:not(:disabled){transform:scale(.99)}.fa-btn:disabled{opacity:.6;cursor:wait}
.fa-msg{border-radius:12px;padding:11px 14px;font-size:14px}.fa-err{background:var(--errbg);color:var(--err)}.fa-ok{background:var(--okbg);color:var(--ok)}
.fa-fine{font-size:13.5px;color:var(--mut);line-height:1.5}
.fa-alt{margin-top:26px;font-size:15px;color:var(--mut)}
.fa-home{display:inline-block;margin-top:14px;font-size:13.5px}
@media(prefers-reduced-motion:reduce){.fa-in{animation:none}.fa *{transition:none!important}}
`;

function getTheme(): "dark" | "light" {
  try {
    const s = localStorage.getItem("fixflow-theme");
    if (s === "light" || s === "dark") return s;
  } catch { /* ignore */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function Field(props: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = props.type === "password";
  return (
    <div>
      <label className="fa-lab" htmlFor={id}>{props.label}</label>
      <div className="fa-box">
        <input
          id={id}
          className="fa-inp"
          type={isPw && show ? "text" : props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          required
          style={isPw ? { paddingRight: 48 } : undefined}
        />
        {isPw && (
          <button type="button" className="fa-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {show ? <><path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
            </svg>
          </button>
        )}
      </div>
      {props.hint && <div className="fa-hint">{props.hint}</div>}
    </div>
  );
}

export default function AuthLayout(props: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="fa" data-theme={getTheme()}>
      <style>{CSS}</style>
      <div className="fa-in">
        <div className="fa-logo" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
        </div>
        <h1>{props.title}</h1>
        {props.children}
        <p className="fa-alt">{props.footer}</p>
        <Link to="/" className="fa-home">Back to home</Link>
      </div>
    </div>
  );
}