// Agency Landing — Critical CSS

export const criticalCss = `/* Agency Landing — Critical CSS */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --color-primary:#ffffff;
  --color-accent:#f59e0b;
  --color-bg:#0a0a0a;
  --color-text:#e5e5e5;
  --color-muted:#a3a3a3;
  --color-surface:#171717;
  --color-border:#262626;
  --font-heading:"Inter",system-ui,-apple-system,sans-serif;
  --font-body:"Inter",system-ui,-apple-system,sans-serif;
  --font-mono:ui-monospace,"Cascadia Code","Source Code Pro",Menlo,monospace;
  --max-width:1200px;
}
html{font-size:16px;line-height:1.7;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{font-family:var(--font-body);color:var(--color-text);background:var(--color-bg)}
a{color:var(--color-accent);text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%;height:auto;display:block}
.skip-link{position:absolute;left:-9999px;top:0;padding:.5rem 1rem;background:var(--color-accent);color:#000;z-index:100}
.skip-link:focus{left:0}
.wrap{max-width:var(--max-width);margin:0 auto;padding:0 2rem}
header[role="banner"]{padding:1.5rem 0;border-bottom:1px solid var(--color-border)}
header nav{display:flex;align-items:center;justify-content:space-between;max-width:var(--max-width);margin:0 auto;padding:0 2rem}
header .logo{font-weight:800;font-size:1.25rem;color:var(--color-primary);text-decoration:none;letter-spacing:-.02em}
header ul{list-style:none;display:flex;gap:2rem}
header a{color:var(--color-muted);font-size:.875rem;font-weight:500}
header a:hover{color:var(--color-primary)}
.hero{padding:6rem 0;text-align:center}
.hero h1{font-family:var(--font-heading);font-size:3.5rem;line-height:1.1;font-weight:800;color:var(--color-primary);margin-bottom:1.5rem;letter-spacing:-.03em}
.hero .subtitle{font-size:1.25rem;color:var(--color-muted);max-width:640px;margin:0 auto 2.5rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:1rem 2.5rem;border-radius:.5rem;font-weight:600;font-size:.95rem;border:none;cursor:pointer;text-decoration:none;transition:transform .15s,box-shadow .15s}
.btn-primary{background:var(--color-accent);color:#000;box-shadow:0 4px 14px rgba(245,158,11,.25)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(245,158,11,.35);text-decoration:none}
.btn-secondary{background:transparent;color:var(--color-text);border:1.5px solid var(--color-border)}
.btn-secondary:hover{border-color:var(--color-accent);color:var(--color-accent);text-decoration:none}
.hero-image{margin:4rem auto 0;max-width:960px;border-radius:1rem;overflow:hidden;border:1px solid var(--color-border)}
.services{padding:5rem 0;background:var(--color-surface)}
.services h2{font-size:2.25rem;font-weight:700;color:var(--color-primary);margin-bottom:1rem;text-align:center}
.services .lead{color:var(--color-muted);font-size:1.1rem;max-width:560px;margin:0 auto 3rem;text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;max-width:var(--max-width);margin:0 auto;padding:0 2rem}
.service-card{background:var(--color-bg);border:1px solid var(--color-border);border-radius:.75rem;padding:2rem}
.service-card h3{font-size:1.125rem;font-weight:600;color:var(--color-primary);margin-bottom:.5rem}
.service-card p{color:var(--color-muted);font-size:.9rem}
.cta-section{padding:5rem 0;text-align:center}
.cta-section h2{font-size:2.25rem;font-weight:700;color:var(--color-primary);margin-bottom:1rem}
.cta-section p{color:var(--color-muted);font-size:1.1rem;max-width:560px;margin:0 auto 2rem}
.content{max-width:var(--max-width);margin:0 auto;padding:3rem 2rem}
.content h2{font-size:1.75rem;font-weight:700;color:var(--color-primary);margin:2.5rem 0 1rem}
.content h3{font-size:1.25rem;font-weight:600;color:var(--color-primary);margin:2rem 0 .75rem}
.content p{margin-bottom:1rem}
.content ul,.content ol{margin:0 0 1rem 1.5rem}
.content blockquote{border-left:3px solid var(--color-accent);padding:.75rem 1rem;margin:1rem 0;color:var(--color-muted);font-style:italic}
.content pre{background:var(--color-surface);border:1px solid var(--color-border);border-radius:.5rem;padding:1rem;overflow-x:auto;font-family:var(--font-mono);font-size:.85rem;margin:1rem 0}
.content code{font-family:var(--font-mono);font-size:.9em;background:var(--color-surface);padding:.1em .3em;border-radius:.25rem}
.content pre code{background:none;padding:0}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:.75rem;padding:1.5rem;margin-bottom:1.5rem}
.card h2{font-size:1.25rem;margin-bottom:.5rem}
.card h2 a{color:var(--color-primary)}
.card h2 a:hover{color:var(--color-accent)}
.card .excerpt{color:var(--color-muted);font-size:.9rem}
.meta{display:flex;flex-wrap:wrap;gap:1rem;font-size:.8rem;color:var(--color-muted);margin-bottom:1rem}
footer[role="contentinfo"]{padding:2rem 0;border-top:1px solid var(--color-border);text-align:center;font-size:.8rem;color:var(--color-muted)}
@media(max-width:768px){
  .hero h1{font-size:2.25rem}
  .hero .subtitle{font-size:1rem}
  .grid{grid-template-columns:1fr}
  .wrap{padding:0 1.25rem}
}`
