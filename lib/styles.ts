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
body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55;-webkit-font-smoothing:antialiased}
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
@media print{
  body{background:#fff}
  .noprint{display:none!important}
  .card,details.f{border-color:#ddd;break-inside:avoid}
}
`;
