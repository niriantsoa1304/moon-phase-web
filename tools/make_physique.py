"""Génère site/physique.html à partir d'index.html (tête, en-tête, pied de page) et des textes FR
de site/js/translations-physique.js. À relancer après une modification de l'en-tête, du pied de page
ou des textes de la page :

    python tools/make_physique.py
"""
import math, re, sys
from pathlib import Path

SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "site"
index = (SITE / "index.html").read_text()

def load(path, lang="fr"):
    s = (SITE / path).read_text()
    block = s[s.index(f"  {lang}: {{"):]
    block = block[: block.index("\n  },")]
    unesc = lambda v: re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), v)
    return {k: unesc(v) for k, v in re.findall(r'"([^"]+)":\s*"((?:[^"\\]|\\.)*)"', block)}

P = load("js/translations-physique.js")
M = load("js/translations.js")

def t(key):          # texte + attribut de traduction
    return f'data-i18n="phy.{key}">{P[key]}'
def th(key):         # texte avec balisage
    return f'data-i18n-html="phy.{key}">{P[key]}'
def tm(key):         # clé du fichier principal
    return f'data-i18n="{key}">{M[key]}'

# ---------- habillage repris d'index.html ----------
head_end = index.index("</head>")
head = index[:head_end]
head = re.sub(r"<title>.*?</title>", f"<title>{P['meta.title']}</title>", head, flags=re.S)
head = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + P["meta.description"], head)
head = head.replace('<link rel="canonical" href="[URL DU SITE]/">', '<link rel="canonical" href="[URL DU SITE]/physique.html">')
head = head.replace('<meta property="og:url" content="[URL DU SITE]/">', '<meta property="og:url" content="[URL DU SITE]/physique.html">')
head = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + P["meta.title"], head)
head = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m.group(1) + P["meta.description"], head)
head = head.replace('<script type="module" src="js/app.js"></script>', '<script type="module" src="js/physique.js"></script>')
head = head.replace('  <link rel="preload" href="assets/moon-poster.webp" as="image" type="image/webp">\n', "")
# pas d'animations d'entrée ni de données structurées « code source » sur cette page
head = re.sub(r"  <script>\n    /\* Animations d'entrée.*?</script>\n", "", head, flags=re.S)
head = re.sub(r'\n  <script type="application/ld\+json">.*?</script>\n', "\n", head, flags=re.S)
head = head.replace('<html lang="fr">', '<html lang="fr" class="article">')
head += '''  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "La physique des phases de la Lune",
    "inLanguage": ["fr", "en"],
    "author": { "@type": "Person", "name": "Niriantsoa Francia Raheriniaina" },
    "about": "Phases de la Lune"
  }
  </script>
'''

body_start = index.index("<body>")
sprite = index[body_start: index.index("</svg>", body_start) + len("</svg>")]
header = index[index.index('  <a class="skip-link"'): index.index("  <main")]
footer = index[index.index("  <footer"): index.index("</footer>") + len("</footer>")]

nav_links = {"#calculateur": "index.html#calculateur", "#fonctionnalites": "index.html#fonctionnalites",
             "#comment": "index.html#comment", "#code": "index.html#code", "#phases": "index.html#phases"}
for a, b in nav_links.items():
    header = header.replace(f'href="{a}"', f'href="{b}"')
    footer = footer.replace(f'href="{a}"', f'href="{b}"')
phys_li = f'<li><a href="physique.html" aria-current="page" {tm("nav.physics")}</a></li>'
# Le lien « Physique » existe déjà dans index.html : on le marque comme page courante.
old_li = '<li><a href="physique.html" data-i18n="nav.physics">Physique</a></li>'
assert header.count(old_li) == 1 and footer.count(old_li) == 1
header = header.replace(old_li, phys_li)
footer = footer.replace(old_li, phys_li)
header = header.replace('<a class="logo" href="#top"', '<a class="logo" href="index.html"')

# ---------- schémas ----------
def f(x): return f"{x:.1f}"

# 1. Orbite (vue de dessus)
CX, CY, R = 340, 205, 140
rays = "".join(f'<line x1="18" y1="{y}" x2="118" y2="{y}"/>' for y in range(70, 351, 40))
orbit_svg = f'''<svg class="orbit" viewBox="0 0 560 400" role="img" aria-labelledby="orbit-title">
              <title id="orbit-title" {t("demo.top")}</title>
              <defs>
                <marker id="ray-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="#E8C27A"/></marker>
                <marker id="orbit-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 10 5 0 10z" fill="#6E7399"/></marker>
              </defs>
              <g class="rays" marker-end="url(#ray-head)">{rays}</g>
              <text class="svg-label svg-gold" x="18" y="48" {t("demo.sun")}</text>
              <text class="svg-label svg-muted" x="540" y="30" text-anchor="end" {t("demo.top")}</text>
              <circle class="orbit-path" cx="{CX}" cy="{CY}" r="{R}"/>
              <path class="orbit-dir" d="M{f(CX + R*math.cos(math.radians(30)))} {f(CY - R*math.sin(math.radians(30)))} A{R} {R} 0 0 0 {f(CX + R*math.cos(math.radians(55)))} {f(CY - R*math.sin(math.radians(55)))}" marker-end="url(#orbit-head)"/>
              <line id="sight" class="sight" x1="{CX}" y1="{CY}" x2="{CX - R}" y2="{CY}"/>
              <g transform="translate({CX} {CY})">
                <circle r="20" fill="#16233F"/>
                <path d="M0 -20A20 20 0 0 0 0 20Z" fill="#3E78B5"/>
                <circle r="20" fill="none" stroke="#5A8FD0" stroke-opacity=".5"/>
              </g>
              <text class="svg-label" x="{CX}" y="{CY + 42}" text-anchor="middle" {t("demo.earth")}</text>
              <g id="orbit-moon" transform="translate({CX - R} {CY})">
                <circle r="13" fill="#2A2E52"/>
                <path d="M0 -13A13 13 0 0 0 0 13Z" fill="#EFE9DA"/>
                <path id="visible-arc" class="visible-arc" d="M0 -20A20 20 0 0 0 0 20"/>
              </g>
            </svg>'''

# 2. Mois sidéral / synodique
S = (70, 330); RO = 430; d = 58
def pt(c, a, r): return (c[0] + r*math.cos(math.radians(a)), c[1] - r*math.sin(math.radians(a)))
def toward(A, B, r):
    dx, dy = B[0]-A[0], B[1]-A[1]; n = math.hypot(dx, dy); return (A[0] + r*dx/n, A[1] + r*dy/n)
a1, a2 = 14, 14 + 26.9
E1, E2 = pt(S, a1, RO), pt(S, a2, RO)
M1 = toward(E1, S, d); v = (M1[0]-E1[0], M1[1]-E1[1])
M2s = (E2[0]+v[0], E2[1]+v[1]); M2 = toward(E2, S, d)
p0, p1 = pt(S, a1-8, RO), pt(S, a2+8, RO)
star1 = (E1[0]+2.6*v[0], E1[1]+2.6*v[1]); star2 = (E2[0]+2.6*v[0], E2[1]+2.6*v[1])
def badge(x, y, n):
    return f'<g class="fig-badge" transform="translate({f(x)} {f(y)})"><circle r="12"/><text y="4.5" text-anchor="middle">{n}</text></g>'
def moon(p, lit=True, cls=""):
    return f'<circle class="{cls}" cx="{f(p[0])}" cy="{f(p[1])}" r="9" fill="{"#EFE9DA" if lit else "#2A2E52"}" stroke="#8A8FB8" stroke-width="1"/>'
synodic_svg = f'''<svg viewBox="0 0 600 420" role="img" aria-labelledby="syn-title">
              <title id="syn-title" {t("s2.fig.caption")}</title>
              <defs><marker id="star-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="#8F8CA3"/></marker></defs>
              <circle cx="{S[0]}" cy="{S[1]}" r="34" fill="#E8C27A"/><circle cx="{S[0]}" cy="{S[1]}" r="48" fill="#E8C27A" opacity=".15"/>
              <text class="svg-label svg-gold" x="{S[0]}" y="{S[1]+68}" text-anchor="middle" {t("s2.fig.sun")}</text>
              <path class="orbit-path" d="M{f(p0[0])} {f(p0[1])} A{RO} {RO} 0 0 0 {f(p1[0])} {f(p1[1])}"/>
              <g class="star-dir" marker-end="url(#star-head)">
                <line x1="{f(E1[0])}" y1="{f(E1[1])}" x2="{f(star1[0])}" y2="{f(star1[1])}"/>
                <line x1="{f(E2[0])}" y1="{f(E2[1])}" x2="{f(star2[0])}" y2="{f(star2[1])}"/>
              </g>
              <text class="svg-label svg-muted" x="{f(star1[0]-6)}" y="{f(star1[1]+22)}" text-anchor="end" {t("s2.fig.stars")}</text>
              <line class="sun-line" x1="{f(E2[0])}" y1="{f(E2[1])}" x2="{f(S[0])}" y2="{f(S[1])}"/>
              <circle cx="{f(E1[0])}" cy="{f(E1[1])}" r="13" fill="#3E78B5"/>
              <circle cx="{f(E2[0])}" cy="{f(E2[1])}" r="13" fill="#3E78B5"/>
              {moon(M1, False)}
              {moon(M2s, True)}
              {moon(M2, False, "moon-new")}
              {badge(M1[0]-4, M1[1]+30, 1)}
              {badge(M2s[0]-30, M2s[1]-4, 2)}
              {badge(M2[0]-4, M2[1]+30, 3)}
            </svg>'''

# 3. Terminateur (i = 60°, k = 75 %)
term_svg = f'''<svg viewBox="-1.6 -1.35 3.2 2.7" role="img" aria-labelledby="term-title">
              <title id="term-title" {t("s3.fig.caption")}</title>
              <circle r="1" fill="#2A2E52"/>
              <path d="M0 -1A1 1 0 0 1 0 1A0.5 1 0 0 1 0 -1Z" fill="#EFE9DA"/>
              <path class="term-line" d="M0 1A0.5 1 0 0 1 0 -1"/>
              <line class="term-measure" x1="0" y1="0" x2="-0.5" y2="0"/>
              <circle r="0.025" fill="#E8C27A"/>
              <text class="svg-small svg-gold" x="-0.62" y="-0.72" text-anchor="end" {t("s3.fig.term")}</text>
              <line class="term-leader" x1="-0.6" y1="-0.68" x2="-0.42" y2="-0.5"/>
              <text class="svg-small" x="-0.25" y="0.18" text-anchor="middle">cos i</text>
              <text class="svg-small svg-muted" x="0" y="1.25" text-anchor="middle" {t("s3.fig.half")}</text>
            </svg>'''

# 5. Éclipses (perspective)
ECX, ECY, beta, eps, RB, A = 290, 120, 12, 12, 250, 150
ry_ecl = RB*math.sin(math.radians(beta)); ry_ref = A*math.sin(math.radians(beta)); ry_moon = A*math.sin(math.radians(beta+eps))
eclipse_svg = f'''<svg viewBox="0 0 580 250" role="img" aria-labelledby="ecl-title">
              <title id="ecl-title" {t("s5.fig.caption")}</title>
              <ellipse class="ecl-plane" cx="{ECX}" cy="{ECY}" rx="{RB}" ry="{f(ry_ecl)}"/>
              <ellipse class="ecl-ref" cx="{ECX}" cy="{ECY}" rx="{A}" ry="{f(ry_ref)}"/>
              <path class="moon-orbit-back" d="M{ECX-A} {ECY} A{A} {f(ry_moon)} 0 0 0 {ECX+A} {ECY}"/>
              <path class="moon-orbit-front" d="M{ECX-A} {ECY} A{A} {f(ry_moon)} 0 0 1 {ECX+A} {ECY}"/>
              <circle cx="{ECX}" cy="{ECY}" r="11" fill="#3E78B5"/>
              <circle class="node" cx="{ECX-A}" cy="{ECY}" r="5"/><circle class="node" cx="{ECX+A}" cy="{ECY}" r="5"/>
              <text class="svg-label svg-gold" x="{ECX-A}" y="{ECY+24}" text-anchor="middle" {t("s5.fig.node")}</text>
              <text class="svg-label svg-gold" x="{ECX+A}" y="{ECY-14}" text-anchor="middle" {t("s5.fig.node")}</text>
              <text class="svg-label" x="{ECX}" y="{f(ECY - ry_moon - 12)}" text-anchor="middle" {t("s5.fig.orbit")}</text>
              <text class="svg-label svg-muted" x="{ECX}" y="{f(ECY + ry_ecl + 26)}" text-anchor="middle" {t("s5.fig.ecl")}</text>
            </svg>'''

# 6. Hémisphères (k = 0,17, quatre jours après la nouvelle lune)
def small_moon(path, key):
    return f'''<figure class="mini-figure">
                <svg viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true"><circle r="1" fill="#2A2E52"/><path d="{path}" fill="#EFE9DA"/></svg>
                <figcaption {t(key)}</figcaption>
              </figure>'''
hemi = small_moon("M0 -1A1 1 0 0 1 0 1A0.66 1 0 0 0 0 -1Z", "s6.fig.north") + "\n              " + \
       small_moon("M0 -1A1 1 0 0 0 0 1A0.66 1 0 0 1 0 -1Z", "s6.fig.south")

# 7. Lumière cendrée
earthshine_svg = '''<svg viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true">
              <defs><radialGradient id="es" cx="40%" cy="45%" r="70%"><stop offset="0" stop-color="#3A4574"/><stop offset="1" stop-color="#1E2546"/></radialGradient></defs>
              <circle r="1.2" fill="#EFE9DA" opacity=".05"/>
              <circle r="1" fill="url(#es)"/>
              <path d="M0 -1A1 1 0 0 1 0 1A0.8 1 0 0 0 0 -1Z" fill="#EFE9DA"/>
            </svg>'''

def section(sid, alt, eyebrow, title, inner):
    # Le titre est placé en tête de la première colonne de texte (.prose) : il reste à côté du schéma.
    heading = f'''
            <p class="eyebrow" {t(eyebrow)}</p>
            <h2 id="{sid}-title" {t(title)}</h2>'''
    inner = re.sub(r'(<div class="prose[^"]*">)', lambda m: m.group(1) + heading, inner, count=1)
    return f'''
    <section class="section{' section-alt' if alt else ''}" id="{sid}" aria-labelledby="{sid}-title">
      <div class="container">
{inner}
      </div>
    </section>'''

toc_ids = ["geometrie", "cycle", "mesurer", "nommer", "eclipses", "point-de-vue", "lumiere-cendree", "calcul"]
toc = "\n".join(f'          <li><a href="#{sid}"><span class="toc-num">{i}</span><span {t(f"toc.{i}")}</span></a></li>'
                for i, sid in enumerate(toc_ids, 1))

main = f'''
  <main id="main">
    <section class="section page-intro" aria-labelledby="intro-title">
      <div class="container">
        <p class="eyebrow" {t("intro.eyebrow")}</p>
        <h1 id="intro-title" {t("intro.title")}</h1>
        <p class="lede intro-lede" {t("intro.lede")}</p>
        <nav class="toc" aria-labelledby="toc-title">
          <h2 class="toc-title" id="toc-title" {t("toc.label")}</h2>
          <ol role="list">
{toc}
          </ol>
        </nav>
      </div>
    </section>
''' + section("geometrie", True, "s1.eyebrow", "s1.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {t("s1.p1")}</p>
            <p {t("s1.p2")}</p>
            <p {t("s1.p3")}</p>
          </div>
          <figure class="figure-card demo" aria-labelledby="demo-label">
            <p class="visually-hidden" id="demo-label" {t("demo.label")}</p>
            {orbit_svg}
            <div class="demo-panel js-only">
              <div class="demo-view">
                <svg viewBox="-1.2 -1.2 2.4 2.4" role="img" aria-labelledby="view-title">
                  <title id="view-title" {t("demo.view")}</title>
                  <circle r="1" fill="#2A2E52"/><path id="view-lit" d="" fill="#EFE9DA"/>
                </svg>
                <p class="demo-view-label" {t("demo.view")}</p>
                <p class="demo-phase" id="demo-phase">&nbsp;</p>
              </div>
              <dl class="demo-values" aria-live="polite">
                <div><dt {t("demo.age")}</dt><dd id="demo-age">—</dd></div>
                <div><dt {t("demo.elong")}</dt><dd id="demo-elong">—</dd></div>
                <div><dt {t("demo.angle")}</dt><dd id="demo-angle">—</dd></div>
                <div><dt {t("demo.ill")}</dt><dd id="demo-ill">—</dd></div>
              </dl>
            </div>
            <div class="demo-controls js-only">
              <label for="demo-slider" {t("demo.slider")}</label>
              <input type="range" id="demo-slider" min="0" max="29.53" step="0.01" value="0">
              <div class="demo-buttons">
                <button class="btn btn-gold btn-sm" type="button" id="demo-play"><span {t("demo.play")}</span></button>
                <button class="btn btn-outline btn-sm" type="button" id="demo-today" {t("demo.today")}</button>
              </div>
            </div>
            <noscript><p class="demo-note" {t("demo.noscript")}</p></noscript>
            <figcaption class="demo-note" {t("demo.note")}</figcaption>
          </figure>
        </div>''') + section("cycle", False, "s2.eyebrow", "s2.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {t("s2.p1")}</p>
            <p {t("s2.p2")}</p>
            <div class="formula">
              <p {th("s2.f1Html")}</p>
              <p class="formula-sub" {th("s2.f2Html")}</p>
            </div>
            <p {t("s2.p3")}</p>
          </div>
          <figure class="figure-card">
            {synodic_svg}
            <ol class="fig-legend" role="list">
              <li><span class="fig-num">1</span><span {t("s2.fig.start")}</span></li>
              <li><span class="fig-num">2</span><span {t("s2.fig.sid")}</span></li>
              <li><span class="fig-num">3</span><span {t("s2.fig.syn")}</span></li>
            </ol>
            <figcaption {t("s2.fig.caption")}</figcaption>
          </figure>
        </div>''') + section("mesurer", True, "s3.eyebrow", "s3.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {th("s3.p1Html")}</p>
            <p {th("s3.p2Html")}</p>
            <p {t("s3.p3")}</p>
          </div>
          <div class="aside-col">
            <figure class="figure-card figure-narrow">
              {term_svg}
              <figcaption {t("s3.fig.caption")}</figcaption>
            </figure>
            <div class="formula">
              <p>tan <em>i</em> = <em>R</em> sin ψ / (Δ − <em>R</em> cos ψ)</p>
              <p>k = (1 + cos <em>i</em>) / 2</p>
            </div>
            <p class="aside-note" {t("s3.p4")}</p>
          </div>
        </div>''') + section("nommer", False, "s4.eyebrow", "s4.title", f'''        <div class="prose prose-wide">
          <p {t("s4.p1")}</p>
          <div class="formula"><p {th("s4.fHtml")}</p></div>
          <p {t("s4.p2")}</p>
          <p><a class="text-link" href="index.html#phases"><span {t("s4.link")}</span> <svg class="icon" aria-hidden="true"><use href="#i-right"/></svg></a></p>
        </div>''') + section("eclipses", True, "s5.eyebrow", "s5.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {t("s5.p1")}</p>
            <p {t("s5.p2")}</p>
          </div>
          <figure class="figure-card">
            {eclipse_svg}
            <figcaption {t("s5.fig.caption")}</figcaption>
          </figure>
        </div>''') + section("point-de-vue", False, "s6.eyebrow", "s6.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {t("s6.p1")}</p>
            <p {t("s6.p2")}</p>
          </div>
          <figure class="figure-card">
            <div class="mini-figures">
              {hemi}
            </div>
            <figcaption {t("s6.fig.caption")}</figcaption>
          </figure>
        </div>''') + section("lumiere-cendree", True, "s7.eyebrow", "s7.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {t("s7.p1")}</p>
            <p {t("s7.p2")}</p>
          </div>
          <figure class="figure-card figure-narrow">
            {earthshine_svg}
          </figure>
        </div>''') + section("calcul", False, "s8.eyebrow", "s8.title", f'''        <div class="article-grid">
          <div class="prose">
            <p {t("s8.p1")}</p>
            <div class="cta-row">
              <a class="btn btn-gold" href="index.html#calculateur" {t("s8.cta")}</a>
              <a class="btn btn-outline" href="https://github.com/niriantsoa1304/Moon_Phase_Calculator_Francia">
                <svg class="icon" aria-hidden="true"><use href="#i-github"/></svg><span {tm("cta.source")}</span></a>
            </div>
            <h3 class="sources-title" {t("s8.sources")}</h3>
            <ul class="sources" role="list">
              <li {t("s8.src1")}</li>
              <li><a href="https://www.astropy.org/" {t("s8.src2")}</a></li>
            </ul>
          </div>
          <ol class="steps">
            <li class="step"><span class="step-num" aria-hidden="true">1</span><div><h3 {t("s8.1.title")}</h3><p {t("s8.1.text")}</p></div></li>
            <li class="step"><span class="step-num" aria-hidden="true">2</span><div><h3 {t("s8.2.title")}</h3><p {t("s8.2.text")}</p></div></li>
            <li class="step"><span class="step-num" aria-hidden="true">3</span><div><h3 {t("s8.3.title")}</h3><p {t("s8.3.text")}</p></div></li>
            <li class="step"><span class="step-num" aria-hidden="true">4</span><div><h3 {t("s8.4.title")}</h3><p {t("s8.4.text")}</p></div></li>
          </ol>
        </div>''') + "\n  </main>\n\n"

html = head + "</head>\n" + sprite.replace("<body>", "<body>") + "\n\n" + header + main + footer + "\n</body>\n</html>\n"
(SITE / "physique.html").write_text(html)
print("physique.html :", len(html), "octets")
