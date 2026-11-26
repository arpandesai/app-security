export const CSS = `
:root{
  --ink:#0f1729; --ink-2:#3b4558; --ink-3:#6b7486; --line:#e5e8ee; --bg:#f6f7f9; --card:#fff;
  --brand:#1a56db; --brand-ink:#0b3aa4;
  --crit:#b42318; --crit-bg:#fef3f2; --high:#c4320a; --high-bg:#fff4ed;
  --med:#b54708; --med-bg:#fffaeb; --low:#475467; --low-bg:#f2f4f7;
  --ok:#067647; --ok-bg:#ecfdf3;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:var(--brand)}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px}
.wrap{max-width:880px;margin:0 auto;padding:0 20px}
.top{display:flex;justify-content:space-between;align-items:center;padding:20px 0}
.logo{font-weight:700;letter-spacing:-.01em;font-size:15px;color:var(--ink);text-decoration:none}
.logo span{color:var(--brand)}
.muted{color:var(--ink-3);font-size:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;margin:0 0 16px}
.hero h1{font-size:26px;line-height:1.2;margin:0 0 4px;letter-spacing:-.02em}
.hero .row{display:flex;flex-wrap:wrap;gap:24px;align-items:center;margin-top:20px}
.score{font-size:44px;font-weight:750;letter-spacing:-.03em;line-height:1}
.score small{font-size:16px;color:var(--ink-3);font-weight:500;margin-left:4px}
.verdict{display:inline-block;font-weight:650;font-size:14px;padding:6px 12px;border-radius:999px}
.v-bad{background:var(--crit-bg);color:var(--crit)} .v-warn{background:var(--med-bg);color:var(--med)} .v-ok{background:var(--ok-bg);color:var(--ok)}
.counts{display:flex;gap:8px;flex-wrap:wrap}
.pill{font-size:13px;font-weight:600;padding:4px 10px;border-radius:999px}
.s-critical{background:var(--crit-bg);color:var(--crit)} .s-high{background:var(--high-bg);color:var(--high)}
.s-medium{background:var(--med-bg);color:var(--med)} .s-low{background:var(--low-bg);color:var(--low)}
.s-review{background:#eef4ff;color:var(--brand-ink)}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.btn{appearance:none;border:1px solid var(--brand);background:var(--brand);color:#fff;font-weight:600;font-size:15px;padding:11px 18px;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{background:var(--brand-ink)}
.btn.ghost{background:#fff;color:var(--brand)} .btn.ghost:hover{background:#f5f8ff}
.btn[disabled]{opacity:.6;cursor:default}
h2{font-size:18px;margin:32px 0 12px;letter-spacing:-.01em}
.top3 .item{display:flex;gap:12px;padding:14px 0;border-top:1px solid var(--line)}
.top3 .item:first-child{border-top:0;padding-top:0}
.top3 .n{font-weight:700;color:var(--ink-3);min-width:18px}
.top3 b{display:block;margin-bottom:2px}
.top3 p{margin:0;color:var(--ink-2);font-size:15px}
details.f{background:var(--card);border:1px solid var(--line);border-radius:12px;margin:0 0 10px}
details.f>summary{list-style:none;cursor:pointer;padding:14px 18px;display:flex;gap:10px;align-items:center}
details.f>summary::-webkit-details-marker{display:none}
details.f>summary .t{font-weight:600;flex:1}
details.f>summary .c{font-size:13px;color:var(--ink-3)}
details.f[open]>summary{border-bottom:1px solid var(--line)}
.fb{padding:16px 18px}
.fb h4{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);margin:14px 0 6px}
.fb h4:first-child{margin-top:0}
.fb p{margin:0}
.ev{border:1px solid var(--line);border-radius:8px;margin:0 0 8px;overflow:hidden}
.ev .path{background:#f9fafb;padding:6px 10px;font-size:13px;color:var(--ink-2);border-bottom:1px solid var(--line);word-break:break-all}
.ev pre{margin:0;padding:10px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#fff}
.refs{font-size:13px;color:var(--ink-3)}
ul.plain{list-style:none;padding:0;margin:0}
ul.plain li{padding:6px 0;border-top:1px solid var(--line);font-size:14px;display:flex;gap:8px}
ul.plain li:first-child{border-top:0}
.ok{color:var(--ok);font-weight:700}
.form{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.form input{flex:1;min-width:220px;padding:11px 12px;border:1px solid #cfd5df;border-radius:10px;font-size:15px}
.note{font-size:14px;color:var(--ink-2);margin-top:10px}
.foot{padding:28px 0 48px;color:var(--ink-3);font-size:13px}
.foot p{margin:4px 0}
.hero-landing{padding:56px 0 24px}
.hero-landing h1{font-size:40px;line-height:1.1;letter-spacing:-.03em;margin:0 0 14px}
.hero-landing p{font-size:18px;color:var(--ink-2);margin:0;max-width:600px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-size:14px;font-weight:600;cursor:pointer;color:var(--ink-2)}
.tab.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.snip{position:relative;background:#0f1729;color:#e6e9ef;border-radius:10px;padding:14px 16px;overflow:auto}
.snip pre{margin:0;white-space:pre-wrap;word-break:break-all;color:inherit;padding-right:58px}
.copy{position:absolute;top:8px;right:8px;background:#26324a;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer}
.step{font-size:15px;color:var(--ink-2);margin:12px 0 0}
.signup{display:grid;gap:10px;grid-template-columns:1fr}
@media(min-width:720px){.signup{grid-template-columns:1fr 1fr 1.2fr auto}}
.signup input{padding:11px 12px;border:1px solid #cfd5df;border-radius:10px;font-size:15px;min-width:0}
.signup .note{grid-column:1/-1;margin:0}
@media(min-width:720px){.signup.login{grid-template-columns:1fr auto}}
.otp{display:grid;gap:12px}
.otp-row{display:flex;gap:10px;flex-wrap:wrap}
.otp-row input{flex:0 1 200px;min-width:0;padding:11px 12px;border:1px solid #cfd5df;border-radius:10px;font-size:22px;letter-spacing:6px;font-variant-numeric:tabular-nums}
.note.err{color:var(--crit);margin:0}
.linkbtn{appearance:none;background:none;border:0;padding:0;color:var(--brand);font:inherit;cursor:pointer;text-decoration:underline}
.linkbtn[disabled]{opacity:.6;cursor:default}
.signout{display:flex;gap:12px;align-items:center;margin:0;min-width:0}
.signout .muted{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}
@media(max-width:600px){.signout .muted{display:none}}
.wrap.narrow{max-width:520px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.dash-h{font-size:26px;letter-spacing:-.02em;margin:0 0 6px}
.btn.sm{padding:6px 12px;font-size:14px}
ul.audits{list-style:none;margin:0;padding:0}
ul.audits li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 16px;padding:14px 0;border-top:1px solid var(--line);align-items:center}
ul.audits li:first-child{border-top:0;padding-top:0}
.a-main{display:flex;flex-direction:column;min-width:0}
.a-side{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.a-score{font-weight:700;font-size:18px}.a-score small{font-size:13px;color:var(--ink-3);font-weight:500;margin-left:2px}
.wrap.wide{max-width:1180px}
.tbl{padding:0;overflow-x:auto}
.tbl table{border-collapse:collapse;width:100%;font-size:14px}
.tbl th,.tbl td{text-align:left;padding:10px 12px;border-top:1px solid var(--line);vertical-align:middle}
.tbl th,.tbl td.nw,.tbl .actions{white-space:nowrap}
.tbl thead th{border-top:0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);background:#fafbfc}
.tbl .actions{display:flex;gap:12px;align-items:center}
.tbl form{margin:0}
.s-ok{background:var(--ok-bg);color:var(--ok)}

/* ---------- Landing page ---------- */
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lp{--lp-ink:#0e1a2f;--lp-ink2:#3b4558;--lp-ink3:#5d6779;--lp-line:#d5dce8;--lp-paper:#f5f7fb;--lp-blue:#1a56db;--lp-blue-ink:#0b3aa4;
  max-width:1180px;margin:0 auto;padding:0 24px;color:var(--lp-ink)}
.lp-top{display:flex;justify-content:space-between;align-items:center;padding:22px 0}
.lp-logo{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:18px;letter-spacing:-.01em}
.lp-logo span{color:var(--lp-blue)}
.lp-signin{font-size:15px;font-weight:500;color:var(--lp-ink2);text-decoration:none;padding:8px 2px}
.lp-signin:hover{color:var(--lp-ink)}
.lp-nav{display:flex;align-items:center;gap:22px}
.lp-hero{display:grid;gap:44px;padding:36px 0 72px;align-items:center}
@media(min-width:980px){.lp-hero{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:64px;padding:56px 0 96px}}
.lp h1{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:clamp(38px,5.4vw,64px);line-height:1.03;
  letter-spacing:-.035em;margin:0 0 20px;text-wrap:balance}
.lp-sub{font-size:19px;line-height:1.55;color:var(--lp-ink2);margin:0 0 28px;max-width:33em}
.lp-assure{font-size:14.5px;color:var(--lp-ink2);margin:14px 0 0}
.lp-tools{font-size:14.5px;color:var(--lp-ink3);margin:6px 0 0}

/* email + code form (landing and /login) */
.auth{max-width:560px}
.auth-row{display:flex;gap:10px}
.auth-email,.auth-code{flex:1;min-width:0;height:56px;padding:0 18px;font:inherit;font-size:17px;color:var(--ink);background:#fff;
  border:1.5px solid #c3ccdc;border-radius:12px;outline:none;transition:border-color .15s}
.auth-email:focus,.auth-code:focus{border-color:var(--brand);box-shadow:0 0 0 4px #1a56db26}
.auth-code{flex:0 1 220px;font-size:26px;letter-spacing:.32em;font-variant-numeric:tabular-nums;text-align:center;padding:0 10px}
.btn.auth-btn{height:56px;padding:0 24px;border-radius:12px;font-size:17px;white-space:nowrap}
.btn:focus-visible,.linkbtn:focus-visible,.lp a:focus-visible{outline:3px solid #7aa2ff;outline-offset:2px}
.auth-lead{font-size:16px;color:var(--ink-2);margin:0 0 12px}
.auth-err{color:var(--crit);font-size:15px;margin:10px 0 0}
.auth-small{font-size:14px;color:var(--ink-3);margin:12px 0 0}
@media(max-width:560px){.auth-row{flex-direction:column}.auth-email,.auth-code{flex:none;width:100%}.btn.auth-btn{width:100%}}

/* hero visual: the report a founder gets */
.hr{position:relative;margin:0;padding-top:20px;--crit:#d92d20;--high:#e8590c;--med:#d99a06;--low:#98a2b3}
.hr-cmd{position:absolute;top:0;left:22px;z-index:2;display:inline-flex;align-items:center;gap:6px;background:var(--lp-ink);color:#eef2fb;
  font:600 14px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:11px 14px;border-radius:10px;box-shadow:0 10px 24px -10px rgba(14,26,47,.5);
  animation:hr-rise .5s cubic-bezier(.2,.7,.2,1) both}
.hr-prompt{color:#7aa2ff}
.hr-caret{display:inline-block;width:7px;height:15px;background:#7aa2ff;margin-left:2px;animation:hr-blink 1s steps(2,start) 6}
.hr-card{background:#fff;border:1px solid #e1e7f0;border-radius:20px;padding:30px 26px 18px;box-shadow:0 40px 80px -36px rgba(14,26,47,.38),0 2px 6px rgba(14,26,47,.04);
  animation:hr-rise .6s cubic-bezier(.2,.7,.2,1) .08s both}
.hr-head{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.hr-app{display:flex;align-items:center;gap:12px}
.hr-app b{display:block;font-size:17px;letter-spacing:-.01em}
.hr-app small{display:block;font-size:13px;color:var(--lp-ink3)}
.hr-icon{flex:none;width:40px;height:40px;border-radius:11px;background:var(--lp-blue);color:#fff;display:flex;align-items:center;justify-content:center;
  font:700 19px "Space Grotesk",ui-sans-serif,system-ui,sans-serif}
.hr-verdict{background:#fef3f2;color:#b42318;border:1px solid #fecdca;font-weight:600;font-size:13.5px;padding:6px 12px;border-radius:999px;
  animation:hr-pop .5s cubic-bezier(.2,.7,.2,1) 1.45s both}
.hr-score{display:grid;grid-template-columns:120px minmax(0,1fr);gap:24px;align-items:center;margin:22px 0 6px}
.hr-dial{position:relative;width:120px;height:120px}
.hr-dial svg{display:block;transform:rotate(-90deg)}
.hr-track{fill:none;stroke:#eef1f6;stroke-width:11}
.hr-arc{fill:none;stroke:var(--crit);stroke-width:11;stroke-linecap:round;stroke-dashoffset:var(--c);animation:hr-sweep 1.3s cubic-bezier(.3,.7,.2,1) .45s forwards}
.hr-num{position:absolute;inset:0;display:flex;align-items:baseline;justify-content:center;padding-top:38px;
  font:700 36px/1 "Space Grotesk",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.02em;animation:hr-fade .4s ease-out 1.1s both}
.hr-num small{font-size:13px;font-weight:500;color:var(--lp-ink3);margin-left:2px}
.hr-bar{display:flex;gap:2px;height:10px;border-radius:999px;overflow:hidden}
.hr-bar span{display:block;min-width:4px}
.hr-counts ul{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13.5px;color:var(--lp-ink2)}
.hr-counts li{display:flex;align-items:center;gap:6px}
.hr-counts li b{color:var(--lp-ink)}
.hr-counts i{width:8px;height:8px;border-radius:50%}
.hr-total{margin:8px 0 0;font-size:13px;color:var(--lp-ink3)}
.hr .s-critical{background:var(--crit)}.hr .s-high{background:var(--high)}.hr .s-medium{background:var(--med)}.hr .s-low{background:var(--low)}
.hr-list{margin-top:18px}
.hr-list-h{margin:0 0 4px;font-size:14px;font-weight:600;color:var(--lp-ink2)}
.hr-list ol{list-style:none;margin:0;padding:0}
.hr-list li{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:4px 12px;align-items:start;padding:12px 0;border-top:1px solid #edf0f5;
  opacity:0;animation:hr-in .45s cubic-bezier(.2,.7,.2,1) forwards}
.hr-sev{justify-self:start;font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;margin-top:1px;white-space:nowrap}
.hr .hr-sev.s-critical{background:#fef3f2;color:#b42318}
.hr .hr-sev.s-high{background:#fff4ed;color:#b93815}
.hr-f b{display:block;font-size:15px;line-height:1.35;color:var(--lp-ink)}
.hr-f small{display:block;font-size:13.5px;color:var(--lp-ink3);margin-top:1px}
.hr-list code{font:12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--lp-ink2);background:#f2f5fa;border-radius:6px;padding:5px 7px;margin-top:1px;white-space:nowrap}
.hr-foot{display:flex;align-items:center;gap:8px;border-top:1px solid #edf0f5;padding-top:14px;margin-top:2px;font-size:13px;color:var(--lp-ink3)}
.hr-foot svg{color:#067647;flex:none}
@keyframes hr-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes hr-sweep{to{stroke-dashoffset:var(--off)}}
@keyframes hr-fade{from{opacity:0}to{opacity:1}}
@keyframes hr-pop{0%{opacity:0;transform:scale(.86)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}
@keyframes hr-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes hr-blink{to{visibility:hidden}}
@media(prefers-reduced-motion:reduce){.hr-cmd,.hr-card,.hr-verdict,.hr-num,.hr-list li,.hr-caret{animation:none;opacity:1}.hr-arc{animation:none;stroke-dashoffset:var(--off)}}
@media(max-width:560px){.hr-card{padding:28px 18px 16px}.hr-score{grid-template-columns:96px minmax(0,1fr);gap:16px}.hr-dial{width:96px;height:96px}.hr-dial svg{width:96px;height:96px}
  .hr-num{font-size:29px;padding-top:30px}.hr-list li{grid-template-columns:62px minmax(0,1fr)}.hr-list code{grid-column:2;justify-self:start}}

/* how it works */
.lp h2{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:600;font-size:28px;letter-spacing:-.02em;margin:0 0 28px}

/* proof + second CTA */
.lp-proof{padding:64px 0 48px;max-width:760px}
.lp-stat{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:600;font-size:clamp(22px,2.6vw,28px);line-height:1.3;
  letter-spacing:-.015em;margin:0 0 16px}
.lp-stat sup{font-size:.5em;margin-left:2px}
.lp-trust{font-size:16.5px;line-height:1.6;color:var(--lp-ink2);margin:0 0 26px}
.btn.lp-again{padding:15px 24px;border-radius:12px;font-size:17px}
/* Trust stripe: MobileFirst's clients */
.lp-clients{border-top:1px solid var(--lp-line);padding:28px 0 4px;display:flex;flex-direction:column;gap:16px}
.lp-clients p{margin:0;font-size:14.5px;color:var(--lp-ink3)}
.lp-clients p a{color:var(--lp-ink2);font-weight:600;text-decoration:none}
.lp-clients p a:hover{text-decoration:underline}
.lp-clients ul{--row:44px;--k:1;list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;align-items:center;gap:18px 40px;min-height:var(--row)}
.lp-clients li{display:flex;align-items:center;height:var(--row)}
.lp-clients img{display:block;height:calc(var(--h) * var(--k));width:auto;max-width:none;object-fit:contain;
  margin-block:min(0px,calc((var(--row) - var(--h) * var(--k)) / 2));filter:grayscale(1);opacity:.74;mix-blend-mode:multiply}
.lp-clients img.t-lift{filter:grayscale(1) brightness(.55) contrast(1.35);opacity:.8}
.lp-clients img.t-soft{opacity:.6}
@media(min-width:980px){.lp-clients ul{flex-wrap:nowrap;justify-content:space-between;gap:24px}}
@media(max-width:600px){.lp-clients ul{--row:34px;--k:.7;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 10px}.lp-clients li{justify-content:flex-start}}
/* Scrolling security tips */
.lp-tips{display:flex;align-items:stretch;margin:28px 0 0;background:var(--lp-ink);color:#e6ecf7;border-radius:14px;overflow:hidden}
.lp-tips-label{flex:none;display:flex;align-items:center;padding:0 18px;font-weight:600;font-size:14px;color:#9db8ff;border-right:1px solid #2a3858;white-space:nowrap}
.lp-tips-window{flex:1;min-width:0;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)}
.lp-tips-track{display:flex;width:max-content;animation:lptips 110s linear infinite}
.lp-tips:hover .lp-tips-track,.lp-tips:focus-within .lp-tips-track,.lp-tips.paused .lp-tips-track{animation-play-state:paused}
.lp-tips-row{display:flex;list-style:none;margin:0;padding:0}
.lp-tips-row li{white-space:nowrap;padding:15px 30px;font-size:15px;position:relative}
.lp-tips-row li::after{content:"";position:absolute;right:-3px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#5b8cff}
@keyframes lptips{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lp-tips-pause{flex:none;appearance:none;border:0;border-left:1px solid #2a3858;background:none;color:#c4cde0;font:600 13px/1 Inter,ui-sans-serif,system-ui,sans-serif;padding:0 16px;cursor:pointer;min-width:64px}
.lp-tips-pause:hover{color:#fff}
.lp-tips-pause:focus-visible{outline:3px solid #7aa2ff;outline-offset:-3px}
@media(max-width:600px){.lp-tips-label{display:none}.lp-tips-row li{font-size:14px;padding:13px 24px}}
@media(prefers-reduced-motion:reduce){.lp-tips-track{animation:none}.lp-tips-window{overflow-x:auto;-webkit-mask-image:none;mask-image:none}.lp-tips-row[aria-hidden]{display:none}.lp-tips-pause{display:none}}
/* Found issues? Our engineers fix them. */
.lp-fix{border-top:1px solid var(--lp-line);padding:56px 0 64px;display:grid;gap:32px}
@media(min-width:900px){.lp-fix{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px;align-items:center}}
.lp-fix h2{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:clamp(26px,3vw,34px);line-height:1.15;letter-spacing:-.02em;margin:0 0 12px}
.lp-fix p{font-size:17px;line-height:1.6;color:var(--lp-ink2);margin:0 0 24px;max-width:32em}
.lp-quote{margin:0;background:#fff;border:1px solid var(--lp-line);border-radius:16px;padding:28px 28px 24px}
.lp-quote blockquote{margin:0}
.lp-quote blockquote p{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:500;font-size:clamp(19px,2vw,22px);line-height:1.4;color:var(--lp-ink);margin:0 0 22px;max-width:none}
.lp-quote figcaption{display:flex;align-items:center;gap:14px;font-size:14.5px;line-height:1.4;color:var(--lp-ink3)}
.lp-quote figcaption img{flex:none;width:48px;height:48px;border-radius:50%;object-fit:cover;background:#e8edf6}
.lp-quote figcaption b{display:block;color:var(--lp-ink);font-size:15.5px;font-weight:600}
.lp-foot{border-top:1px solid var(--lp-line);padding:24px 0 48px;font-size:13px;color:var(--lp-ink3)}
.lp-foot p{margin:4px 0}

/* ---------- Customer panel ---------- */
.pn{display:grid;min-height:100vh}
@media(min-width:900px){.pn{grid-template-columns:252px minmax(0,1fr)}}
.pn-side{background:#fff;border-bottom:1px solid var(--line);padding:14px 16px;display:flex;flex-direction:column;gap:12px}
@media(min-width:900px){.pn-side{border-bottom:0;border-right:1px solid var(--line);padding:24px 18px;gap:26px;position:sticky;top:0;height:100vh}}
.pn-brand{display:flex;justify-content:space-between;align-items:center;gap:12px}
.pn-logo{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:18px;letter-spacing:-.01em;color:var(--ink);text-decoration:none;padding-left:4px}
.pn-logo span{color:var(--brand)}
@media(max-width:899px){.pn-side{position:relative}}
.pn-burger{position:static}
.pn-burger>summary{list-style:none;cursor:pointer;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--ink)}
.pn-burger>summary::-webkit-details-marker{display:none}
.pn-burger>summary:hover,.pn-burger[open]>summary{background:var(--bg)}
.pn-burger>summary:focus-visible{outline:3px solid #7aa2ff;outline-offset:2px}
.pn-burger-menu{position:absolute;left:0;right:0;top:100%;z-index:20;background:#fff;border-bottom:1px solid var(--line);box-shadow:0 18px 30px -18px rgba(14,26,47,.35);padding:8px 12px 14px}
.pn-burger-menu nav{display:flex;flex-direction:column;gap:2px}
.pn-burger-menu nav a{display:block;padding:12px 12px;border-radius:9px;color:var(--ink-2);text-decoration:none;font-weight:500;font-size:16px}
.pn-burger-menu nav a[aria-current=page]{background:#eaf0fe;color:var(--brand-ink);font-weight:600}
.pn-burger-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid var(--line);margin-top:8px;padding:12px 12px 0;font-size:14px;color:var(--ink-3)}
.pn-burger-foot span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pn-burger-foot form{margin:0;flex:none}
@media(min-width:900px){.pn-burger{display:none}}
.pn-nav{display:none}
@media(min-width:900px){.pn-nav{display:flex;flex-direction:column;gap:2px}}
.pn-nav a{display:block;padding:9px 13px;border-radius:9px;color:var(--ink-2);text-decoration:none;font-weight:500;font-size:15px;white-space:nowrap}
.pn-nav a:hover{background:var(--bg);color:var(--ink)}
.pn-nav a[aria-current=page]{background:#eaf0fe;color:var(--brand-ink);font-weight:600}
.pn-nav a:focus-visible,.pn-logo:focus-visible,.pn-back:focus-visible{outline:3px solid #7aa2ff;outline-offset:2px}
.pn-help,.pn-help-mobile{border:1px solid var(--line);border-radius:12px;padding:16px;background:var(--bg)}
.pn-help b,.pn-help-mobile b{display:block;font-size:15px;margin-bottom:4px}
.pn-help p,.pn-help-mobile p{margin:0 0 12px;font-size:14px;color:var(--ink-2);line-height:1.5}
.pn-help{display:none;margin-top:auto}
@media(min-width:900px){.pn-help{display:block}}
.pn-help-mobile{margin-top:32px}
@media(min-width:900px){.pn-help-mobile{display:none}}
.pn-me{display:none}
@media(min-width:900px){.pn-me{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:14px;font-size:14px;color:var(--ink-3)}}
.pn-me span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.pn-me form{margin:0;flex:none}
.pn-main{padding:28px 18px 24px;min-width:0}
@media(min-width:900px){.pn-main{padding:40px 48px 32px}}
.pn-inner{max-width:960px}
.pn-back{display:inline-block;font-size:14px;color:var(--ink-3);text-decoration:none;margin:0 0 14px}
.pn-back:hover{color:var(--ink)}
.pn-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px 24px;margin:0 0 24px}
.pn-head h1{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:32px;line-height:1.1;letter-spacing:-.025em;margin:0}
.pn-head p{margin:8px 0 0;color:var(--ink-2);font-size:16px;max-width:42em}
.pn-h2{font-size:19px;letter-spacing:-.01em;margin:0 0 8px}
.pn-sec{font-size:17px;margin:8px 0 12px}
.pn-sec-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:36px}
.pn-sec-row a{font-size:14px}
.pn-apps{display:grid;gap:16px}
@media(min-width:1100px){.pn-apps{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pn-app{margin:0;display:flex;flex-direction:column;gap:18px}
.pn-app-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.pn-app-name{min-width:0}
.pn-app h3{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-size:21px;letter-spacing:-.015em;margin:0 0 2px;overflow-wrap:anywhere}
.pn-app .muted{margin:0}
.pn-app .verdict{flex:none;font-size:13px;padding:5px 11px}
.pn-app-mid{display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px}
.pn-score{font-family:"Space Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:52px;line-height:.9;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.pn-score small{font-family:"Inter",ui-sans-serif,system-ui,sans-serif;font-size:15px;font-weight:500;letter-spacing:0;color:var(--ink-3);margin-left:3px}
.pn-app-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:auto}
.pn-tip{font-size:14px;color:var(--ink-3);margin:18px 0 0}
.pn-start .pn-h2{margin-bottom:18px}
.pn-steps{list-style:none;margin:0;padding:0;display:grid;gap:18px;counter-reset:pn}
.pn-steps li{counter-increment:pn;display:grid;grid-template-columns:34px minmax(0,1fr);gap:2px 12px;align-items:start}
.pn-steps li::before{content:counter(pn);grid-row:1/span 3;width:28px;height:28px;border-radius:50%;background:#eaf0fe;color:var(--brand-ink);
  font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:-2px}
.pn-steps b{font-size:16px}
.pn-steps span{color:var(--ink-2);font-size:15px}
.pn-steps .btn{justify-self:start;margin-top:8px}
.pn-stuck{margin:22px 0 0;padding-top:16px;border-top:1px solid var(--line);font-size:15px;color:var(--ink-2)}
.pn-callout{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px 24px}
.pn-callout>div{flex:1 1 320px}
.pn-callout .btn{flex:none}
.pn-form{display:grid;gap:16px;max-width:460px}
.pn-form label{display:grid;gap:6px}
.pn-form label span{font-size:14px;font-weight:600;color:var(--ink-2)}
.pn-form input{height:46px;padding:0 14px;font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1.5px solid #c3ccdc;border-radius:10px;outline:none}
.pn-form input:focus{border-color:var(--brand);box-shadow:0 0 0 4px #1a56db26}
.pn-form input[disabled]{background:var(--bg);color:var(--ink-3)}
.pn-form small{font-size:13px;color:var(--ink-3)}
.pn-form-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:4px}
.pn-saved{color:var(--ok);font-weight:600;font-size:15px}
.pn-foot{padding-bottom:8px}
.pn code,.pn-start code{background:#eef1f6;border-radius:5px;padding:1px 6px;font-size:.9em}
.verdict.sm{font-size:12.5px;padding:4px 10px}
.cta-note{font-size:13px;color:var(--ink-3);margin:10px 0 0}
.f-fix{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:12px 0 2px}
.f-fix .muted{font-size:13px}
.tbl td .muted{font-size:13px}
.shared-by{font-size:14px;color:var(--ink-2);background:#eaf0fe;border-radius:10px;padding:10px 14px;margin:0 0 14px}
.share .share-form{display:flex;gap:10px;flex-wrap:wrap}
.share .share-form input{flex:1 1 260px;min-width:0;height:46px;padding:0 14px;font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1.5px solid #c3ccdc;border-radius:10px;outline:none}
.share .share-form input:focus{border-color:var(--brand);box-shadow:0 0 0 4px #1a56db26}
.share-msg{font-size:15px;margin:0 0 14px}
.ok-msg{color:var(--ok);font-weight:600}
.share-list{list-style:none;margin:18px 0 0;padding:0}
.share-list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line)}
.share-list li>div{display:flex;flex-direction:column;min-width:0}
.share-list b{overflow-wrap:anywhere;font-weight:600}
.share-list form{margin:0;flex:none}
@media(max-width:560px){.pn-app-top{flex-direction:column;gap:10px}}
@media(max-width:700px){
  .pn .tbl thead{display:none}
  .pn .tbl table,.pn .tbl tbody,.pn .tbl tr,.pn .tbl td{display:block;width:100%}
  .pn .tbl tr{padding:14px 16px;border-top:1px solid var(--line)}
  .pn .tbl tr:first-child{border-top:0}
  .pn .tbl td{border:0;padding:2px 0}
  .pn .tbl td:first-child{margin-bottom:6px}
  .pn .tbl td.nw{display:inline-block;width:auto;margin-right:12px;vertical-align:middle}
}

@media print{
  body{background:#fff}
  .pn{display:block}.pn-side,.pn-help-mobile,.pn-foot{display:none!important}.pn-main{padding:0}
  .noprint{display:none!important}
  .card,details.f{border-color:#ddd;break-inside:avoid}
}

/* Run a new audit guide */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.ng-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px;margin-top:14px}
.ng-tool{appearance:none;text-align:left;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer;display:flex;flex-direction:column;gap:2px;font:inherit;color:var(--ink)}
.ng-tool b{font-size:15.5px}
.ng-tool span{font-size:13px;color:var(--ink-3)}
.ng-tool:hover{border-color:#b9c7e4}
.ng-tool.on{border-color:var(--brand);box-shadow:inset 0 0 0 1px var(--brand);background:#f5f8ff}
.ng-tool:focus-visible{outline:3px solid #7aa2ff;outline-offset:2px}
.ng-steps{list-style:none;margin:16px 0 0;padding:0}
.ng-steps li{position:relative;display:grid;grid-template-columns:32px minmax(0,1fr);gap:0 14px;padding-bottom:22px}
.ng-steps li:last-child{padding-bottom:0}
.ng-steps li:not(:last-child)::after{content:"";position:absolute;left:15px;top:34px;bottom:4px;width:2px;background:var(--line)}
.ng-steps li.done:not(:last-child)::after{background:#9fd8b8}
.ng-n{width:32px;height:32px;border-radius:50%;background:#eaf0fe;color:var(--brand-ink);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
.ng-steps li.done .ng-n{background:var(--ok);color:#fff}
.ng-body{min-width:0;padding-top:4px}
.ng-body h3{font-size:16.5px;margin:0 0 4px;letter-spacing:-.005em}
.ng-body p{margin:0;color:var(--ink-2);font-size:15px}
.ng-snip{margin-top:10px}
.ng-status{display:flex;align-items:center;gap:8px;margin:12px 0 0!important;font-size:14.5px!important;font-weight:600}
.ng-status.wait{color:var(--ink-3)!important;font-weight:500}
.ng-status.ok{color:var(--ok)!important}
.ng-status.ok::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--ok)}
.ng-status.run{color:var(--brand-ink)!important}
.ng-dot{width:8px;height:8px;border-radius:50%;background:#9aa6bd;animation:ngpulse 1.4s ease-in-out infinite}
@keyframes ngpulse{0%,100%{opacity:.35}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){.ng-dot{animation:none}}
.ng-hint{font-size:13.5px!important;color:var(--ink-3)!important;margin-top:4px!important}
.ng-bar{height:8px;border-radius:999px;background:#eaf0fe;overflow:hidden;margin-top:8px;max-width:420px}
.ng-bar span{display:block;height:100%;background:var(--brand);border-radius:999px;transition:width .4s}
@media(prefers-reduced-motion:reduce){.ng-bar span{transition:none}}
.ng-done{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}
.ng-done .ng-status{margin:12px 0 0!important}
.ng-done .btn{margin-top:12px}

/* app card with a separately audited server */
.pn-part{border-top:1px solid var(--line);padding-top:16px;display:flex;flex-direction:column;gap:14px}
.pn-part-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.pn-part-head>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.pn-part-head b{font-size:15px}
.pn-part-head .muted{font-size:13.5px}
.ng-next{flex-basis:100%;margin:4px 0 0!important;font-size:14.5px!important;color:var(--ink-2)!important}
`;
