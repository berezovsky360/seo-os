// Product Launch — Critical CSS

export const criticalCss = `/* Product Launch — Critical CSS */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --color-primary:#0f172a;
  --color-accent:#6366f1;
  --color-bg:#ffffff;
  --color-text:#1e293b;
  --color-muted:#64748b;
  --color-surface:#f8fafc;
  --color-border:#e2e8f0;
  --font-heading:"Inter",system-ui,-apple-system,sans-serif;
  --font-body:"Inter",system-ui,-apple-system,sans-serif;
  --max-width:1120px;
}
html{font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:var(--font-body);color:var(--color-text);background:var(--color-bg)}
a{color:var(--color-accent);text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%;height:auto;display:block}
.skip-link{position:absolute;left:-9999px;top:0;padding:.5rem 1rem;background:var(--color-accent);color:#fff;z-index:100}
.skip-link:focus{left:0}
.wrap{max-width:var(--max-width);margin:0 auto;padding:0 1.5rem}
header[role="banner"]{padding:1.25rem 0;border-bottom:1px solid var(--color-border)}
header nav{display:flex;align-items:center;justify-content:space-between;max-width:var(--max-width);margin:0 auto;padding:0 1.5rem}
header .logo{font-weight:800;font-size:1.25rem;color:var(--color-primary);text-decoration:none}
header ul{list-style:none;display:flex;gap:1.5rem}
header a{color:var(--color-muted);font-size:.875rem;font-weight:500}
header a:hover{color:var(--color-primary)}
.hero{padding:5rem 0;text-align:center}
.hero h1{font-family:var(--font-heading);font-size:3rem;line-height:1.15;font-weight:800;margin-bottom:1.5rem;letter-spacing:-.02em}
.hero .subtitle{font-size:1.25rem;color:var(--color-muted);max-width:640px;margin:0 auto 2rem}
.hero .cta-group{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.875rem 2rem;border-radius:.5rem;font-weight:600;font-size:.95rem;border:none;cursor:pointer;text-decoration:none;transition:transform .15s,box-shadow .15s}
.btn-primary{background:var(--color-accent);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.3)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,.4);text-decoration:none}
.btn-secondary{background:transparent;color:var(--color-text);border:1.5px solid var(--color-border)}
.btn-secondary:hover{border-color:var(--color-accent);color:var(--color-accent);text-decoration:none}
.hero-image{margin:3rem auto 0;max-width:900px;border-radius:1rem;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,.1)}
.features{padding:5rem 0;background:var(--color-surface)}
.features .wrap{text-align:center}
.features h2{font-size:2rem;font-weight:700;margin-bottom:.75rem}
.features .lead{color:var(--color-muted);font-size:1.1rem;max-width:560px;margin:0 auto 3rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem}
.feature-card{background:#fff;border:1px solid var(--color-border);border-radius:.75rem;padding:2rem;text-align:left}
.feature-card h3{font-size:1.125rem;font-weight:600;margin-bottom:.5rem}
.feature-card p{color:var(--color-muted);font-size:.9rem}
.cta-section{padding:5rem 0;text-align:center}
.cta-section h2{font-size:2rem;font-weight:700;margin-bottom:1rem}
.cta-section p{color:var(--color-muted);font-size:1.1rem;max-width:560px;margin:0 auto 2rem}
.content{max-width:var(--max-width);margin:0 auto;padding:3rem 1.5rem}
.content h2{font-size:1.75rem;font-weight:700;margin:2.5rem 0 1rem}
.content h3{font-size:1.25rem;font-weight:600;margin:2rem 0 .75rem}
.content p{margin-bottom:1rem}
.content ul,.content ol{margin:0 0 1rem 1.5rem}
.content blockquote{border-left:3px solid var(--color-accent);padding:.75rem 1rem;margin:1rem 0;color:var(--color-muted);font-style:italic}
footer[role="contentinfo"]{padding:2rem 0;border-top:1px solid var(--color-border);text-align:center;font-size:.8rem;color:var(--color-muted)}
@media(max-width:768px){
  .hero h1{font-size:2rem}
  .hero .subtitle{font-size:1rem}
  .grid{grid-template-columns:1fr}
}`
