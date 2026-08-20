#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generar-blog.py — Convierte los articulos de Soro en paginas HTML estaticas
para miamipiagency.com (sitio estatico, Cloudflare Pages).

Que hace:
  1. Lee los articulos publicados en Soro (feed RSS o items.json).
  2. Crea una pagina real en  <site>/<slug>/index.html  con el diseno del sitio.
  3. Reconstruye <site>/blog/index.html como listado ESTATICO, incluyendo
     tambien los articulos antiguos del sitio (que el widget habia dejado fuera).
  4. Actualiza <site>/sitemap.xml.

Uso:
  python3 generar-blog.py --site "/ruta/a/site" --feed feed.xml
  python3 generar-blog.py --site "/ruta/a/site" --items items.json
  python3 generar-blog.py --site "/ruta/a/site" --feed-url https://app.trysoro.com/api/rss/<ID>

Es idempotente: se puede volver a ejecutar sin duplicar nada.
"""

import argparse
import html
import json
import os
import re
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

SITE_URL = "https://miamipiagency.com"
SITE_NAME = "Miami Private Investigator Agency"
BRAND = "Miami PI Agency"
PHONE = "1-(786) 326-0163"
BLOG_PAGE_SIZE = 16

# Plantilla: un post existente del sitio, del que se reutiliza cabecera/nav/footer.
TEMPLATE_REL = "how-effective-is-skip-tracing/index.html"

# Paginas que NO son articulos de blog aunque vivan en la raiz.
NOT_POSTS = {
    "blog", "category", "faq-items", "wp-content", "wp-includes", "assets",
    "about", "contact-us", "disclaimer", "privacy-policy", "terms-conditions",
    "service-area", "page",
}

CONTENT_ANCHOR_OPEN = "<main id=\"main\" class=\"clearfix width-100\">"
CONTENT_ANCHOR_CLOSE = "</main>"


def clean_generated_text(value):
    """Normaliza saltos de linea y elimina espacios al final de cada linea."""
    return "\n".join(line.rstrip() for line in value.splitlines()) + "\n"

# Mapa palabra-clave -> pagina de servicio, para enlazado interno automatico.
INTERNAL_LINKS = [
    ("skip tracing", "/skip-tracing/"),
    ("forensic accounting", "/forensic-accounting/"),
    ("executive protection", "/executive-protection/"),
    ("due diligence", "/due-diligence/"),
    ("asset search", "/asset-searches/"),
    ("cryptocurrency investigation", "/crypto-currency-investigations/"),
    ("cyber investigation", "/cyber-investigations/"),
    ("digital forensics", "/cyber-investigations/"),
    ("fraud investigation", "/fraud-investigations/"),
    ("missing person", "/missing-persons/"),
    ("child custody", "/child-custody/"),
    ("litigation support", "/litigation-support/"),
    ("bug sweep", "/tscm-bugsweeps/"),
    ("background check", "/background-checks/"),
    ("surveillance", "/surveillance/"),
]


# --------------------------------------------------------------------------
# Lectura de articulos
# --------------------------------------------------------------------------

def slug_from_link(link, fallback):
    seg = [s for s in link.rstrip("/").split("/") if s]
    return seg[-1] if seg else fallback


def parse_feed(xml_text):
    """Convierte el RSS de Soro en una lista de dicts."""
    ns = {"content": "http://purl.org/rss/1.0/modules/content/",
          "media": "http://search.yahoo.com/mrss/"}
    root = ET.fromstring(xml_text.strip())
    items = []
    for it in root.iter("item"):
        def txt(tag, default=""):
            el = it.find(tag)
            return (el.text or default) if el is not None else default

        body = it.find("content:encoded", ns)
        enc = it.find("enclosure")
        med = it.find("media:content", ns)
        image = ""
        if enc is not None:
            image = enc.get("url", "")
        if not image and med is not None:
            image = med.get("url", "")

        link = txt("link")
        pub = txt("pubDate")
        try:
            dt = parsedate_to_datetime(pub) if pub else datetime.now(timezone.utc)
        except Exception:
            dt = datetime.now(timezone.utc)

        items.append({
            "title": txt("title").strip(),
            "slug": slug_from_link(link, txt("guid", "articulo")),
            "description": txt("description").strip(),
            "date": dt.strftime("%Y-%m-%d"),
            "iso": dt.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "image": image,
            "html": (body.text or "") if body is not None else "",
        })
    return items


def load_items(args):
    if args.items:
        with open(args.items, encoding="utf-8") as fh:
            data = json.load(fh)
        for d in data:
            # permite guardar el cuerpo en un fichero aparte
            if d.get("html_file"):
                with open(d["html_file"], encoding="utf-8") as fh:
                    d["html"] = fh.read()
        return data
    if args.feed:
        with open(args.feed, encoding="utf-8") as fh:
            return parse_feed(fh.read())
    if args.feed_url:
        import urllib.request
        req = urllib.request.Request(args.feed_url, headers={"User-Agent": "miamipiagency-generador"})
        return parse_feed(urllib.request.urlopen(req, timeout=45).read().decode("utf-8"))
    sys.exit("Falta --feed, --items o --feed-url")


# --------------------------------------------------------------------------
# Plantilla
# --------------------------------------------------------------------------

HEAD_STRIP = [
    r"<title>.*?</title>",
    r"<meta name=\"description\"[^>]*/?>",
    r"<link rel=\"canonical\"[^>]*/?>",
    r"<meta property=\"og:[^>]*/?>",
    r"<meta name=\"twitter:[^>]*/?>",
    r"<meta property=\"article:[^>]*/?>",
    r"<script type=\"application/ld\+json\"[^>]*>.*?</script>",
]


def split_template(tpl):
    i = tpl.index(CONTENT_ANCHOR_OPEN)
    j = tpl.index(CONTENT_ANCHOR_CLOSE, i)
    return tpl[:i + len(CONTENT_ANCHOR_OPEN)], tpl[j:]


def clean_head(prefix):
    head_end = prefix.index("</head>")
    head, rest = prefix[:head_end], prefix[head_end:]
    for pat in HEAD_STRIP:
        head = re.sub(pat, "", head, flags=re.S | re.I)
    head = re.sub(r"\n{3,}", "\n", head)
    return head, rest


def build_head_meta(item, url):
    t = html.escape(item["title"], quote=True)
    seo_title = html.escape(
        item.get("seo_title") or f'{item["title"]} - {SITE_NAME}', quote=True)
    d = html.escape(item["description"], quote=True)
    img = item.get("image") or f"{SITE_URL}/wp-content/uploads/2021/07/blog-bg.jpg"
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": f"{url}#article",
                "headline": item["title"],
                "description": item["description"],
                "datePublished": item["iso"],
                "dateModified": item["iso"],
                "image": img,
                "inLanguage": "en-US",
                "mainEntityOfPage": {"@id": url},
                "author": {"@type": "Organization", "name": BRAND, "url": SITE_URL},
                "publisher": {"@id": f"{SITE_URL}/#organization"},
            },
            {
                "@type": ["Organization", "LocalBusiness", "ProfessionalService"],
                "@id": f"{SITE_URL}/#organization",
                "name": SITE_NAME,
                "alternateName": BRAND,
                "url": SITE_URL,
                "telephone": PHONE,
                "areaServed": "US",
                "address": {"@type": "PostalAddress", "addressLocality": "Miami",
                            "addressRegion": "FL", "addressCountry": "US"},
                "description": "Professional private investigative services serving Miami and South Florida.",
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{url}#breadcrumb",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL},
                    {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{SITE_URL}/blog/"},
                    {"@type": "ListItem", "position": 3, "name": item["title"]},
                ],
            },
        ],
    }
    return f"""
<title>{seo_title}</title>
<meta name="description" content="{d}" />
<link rel="canonical" href="{url}" />
<meta property="og:locale" content="en_US" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="{SITE_NAME}" />
<meta property="og:title" content="{t}" />
<meta property="og:description" content="{d}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{html.escape(img, quote=True)}" />
<meta property="article:published_time" content="{item['iso']}" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
"""


ARTICLE_CSS = """
<style>
.soro-article{max-width:820px;margin:0 auto}
.soro-article p{font-size:1.05rem;line-height:1.85;margin:0 0 1.35em}
.soro-article h2{margin:2.2em 0 .7em;line-height:1.25}
.soro-article h3{margin:1.9em 0 .6em;line-height:1.3}
.soro-article ul,.soro-article ol{margin:0 0 1.35em 1.2em;line-height:1.8}
.soro-article li{margin-bottom:.5em}
.soro-article a{text-decoration:underline;text-underline-offset:2px}
.soro-hero-img{width:100%;height:auto;border-radius:14px;margin:0 0 2.4em;display:block}
.soro-meta{font-size:.92rem;opacity:.7;margin:0 0 2em}
.soro-cta{margin:3em 0 0;padding:32px 34px;border-radius:14px;background:#0a1733;color:#fff}
.soro-cta h2{margin:0 0 .5em;color:#fff;font-size:1.45rem}
.soro-cta p{color:#dbe3f2;margin:0 0 1.2em;font-size:1rem}
.soro-cta a.soro-btn{display:inline-block;background:#c9a227;color:#0a1733;font-weight:700;
  padding:13px 26px;border-radius:8px;text-decoration:none}
.soro-cta small{display:block;margin-top:1.2em;color:#9fb0cf;font-size:.82rem;line-height:1.6}
@media(max-width:850px){.soro-article p{font-size:1rem}.soro-cta{padding:24px}}
</style>
"""


def add_internal_links(body_html, own_slug):
    """Enlaza la primera aparicion de cada servicio, sin tocar enlaces existentes."""
    parts = re.split(r"(<a\b.*?</a>|<h[1-6]\b.*?</h[1-6]>)", body_html, flags=re.S | re.I)
    used = set()
    for kw, target in INTERNAL_LINKS:
        if target.strip("/") == own_slug:
            continue
        for idx, chunk in enumerate(parts):
            if idx % 2 == 1 or kw in used:
                continue
            m = re.search(r"(?<![\w-])(" + re.escape(kw) + r"s?)(?![\w-])", chunk, re.I)
            if not m:
                continue
            parts[idx] = (chunk[:m.start()] +
                          f'<a href="{target}">{m.group(1)}</a>' +
                          chunk[m.end():])
            used.add(kw)
            break
    return "".join(parts)


def render_article(prefix, suffix, item, autolink=True):
    url = f"{SITE_URL}/{item['slug']}/"
    head, rest = clean_head(prefix)
    header_image = item.get("header_image", "")
    header_css = ""
    if header_image:
        header_css = """
<style>
.fusion-page-title-bar{position:relative;overflow:hidden;isolation:isolate}
.fusion-page-title-bar>.soro-header-img{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:center 54%;z-index:0}
.fusion-page-title-bar:after{content:"";position:absolute;inset:0;z-index:1;
  background:linear-gradient(90deg,rgba(5,13,46,.54),rgba(5,13,46,.38),rgba(5,13,46,.56))}
.fusion-page-title-bar>.fusion-fullwidth{position:relative;z-index:2;background:transparent!important}
</style>
"""
    head += build_head_meta(item, url) + ARTICLE_CSS + header_css
    if header_image:
        image_width = int(item.get("image_width", 1672))
        image_height = int(item.get("image_height", 935))
        if image_width <= 0 or image_height <= 0:
            raise ValueError("image_width and image_height must be positive integers")
        header_tag = re.compile(r'(<section class="fusion-page-title-bar[^"]*">)', re.I)
        header_img = (f'<img class="soro-header-img" src="{html.escape(header_image, quote=True)}" '
                      f'alt="{html.escape(item["title"], quote=True)}" '
                      f'width="{image_width}" height="{image_height}" '
                      f'loading="eager" fetchpriority="high" />')
        rest = header_tag.sub(lambda m: m.group(1) + header_img, rest, count=1)
    rest = re.sub(
        r'(<h1 class="fusion-title-heading[^"]*"[^>]*>).*?(</h1>)',
        lambda m: m.group(1) + html.escape(item["title"]) + m.group(2),
        rest, count=1, flags=re.S)

    body = item["html"]
    if autolink:
        body = add_internal_links(body, item["slug"])

    hero = ""
    if item.get("image") and not header_image:
        image_width = int(item.get("image_width", 1200))
        image_height = int(item.get("image_height", 675))
        if image_width <= 0 or image_height <= 0:
            raise ValueError("image_width and image_height must be positive integers")
        hero = (f'<img class="soro-hero-img" src="{html.escape(item["image"], quote=True)}" '
                f'alt="{html.escape(item["title"], quote=True)}" '
                f'width="{image_width}" height="{image_height}" loading="eager" />')

    pretty = datetime.strptime(item["date"], "%Y-%m-%d").strftime("%B %d, %Y")
    cta = f"""
<div class="soro-cta">
  <h2>Discuss your matter confidentially</h2>
  <p>Professional private investigative services in Miami and South Florida. Consultations by appointment only.</p>
  <a class="soro-btn" href="/contact-us/">Request a consultation</a>
  <small>Field work outside Florida is performed by investigators licensed in that state.
  This article is general information, not legal advice.</small>
</div>"""

    content = f"""
<div class="fusion-row" style="max-width:100%;">
<section id="content" style="width: 100%;">
<div class="post type-post status-publish format-standard hentry">
<div class="post-content">
<div class="fusion-fullwidth fullwidth-box fusion-flex-container nonhundred-percent-fullwidth non-hundred-percent-height-scrolling" style="--awb-margin-top:70px;--awb-margin-bottom:80px;--awb-flex-wrap:wrap;">
<div class="fusion-builder-row fusion-row fusion-flex-align-items-flex-start fusion-flex-justify-content-center fusion-flex-content-wrap" style="max-width:1372.8px;">
<div class="fusion-layout-column fusion_builder_column fusion_builder_column_1_1 1_1 fusion-flex-column" style="--awb-width-large:100%;--awb-spacing-right-large:1.92%;--awb-spacing-left-large:1.92%;--awb-width-small:100%;">
<div class="fusion-column-wrapper fusion-flex-justify-content-flex-start fusion-content-layout-column">
<article class="fusion-text soro-article">
{hero}
<p class="soro-meta">{pretty} &middot; {BRAND}</p>
{body}
{cta}
</article>
</div></div></div></div>
</div></div>
</section>
</div>
"""
    return head + rest + content + suffix


# --------------------------------------------------------------------------
# Listado del blog
# --------------------------------------------------------------------------

def scan_legacy_posts(site):
    out = []
    for d in sorted(os.listdir(site)):
        p = os.path.join(site, d, "index.html")
        if (not os.path.isdir(os.path.join(site, d)) or d.startswith("_")
                or d in NOT_POSTS or not os.path.exists(p)):
            continue
        h = open(p, encoding="utf-8", errors="ignore").read()
        if not re.search(r"\bpost type-post\b", h):
            continue
        t = re.search(r"<title>(.*?)</title>", h, re.S)
        de = re.search(r'<meta name="description" content="(.*?)"', h, re.S)
        da = re.search(r'article:published_time" content="([\d\-]{10})', h)
        im = re.search(r'og:image" content="(.*?)"', h)
        title = html.unescape((t.group(1) if t else d).split(" - Miami Private")[0].split(" | Miami PI")[0]).strip()
        out.append({
            "slug": d,
            "title": title,
            "description": html.unescape(de.group(1)) if de else "",
            "date": da.group(1) if da else "2021-01-01",
            "image": im.group(1) if im else "",
            "legacy": True,
        })
    return out


def card(post):
    img = post.get("image") or f"{SITE_URL}/wp-content/uploads/2021/07/blog-bg.jpg"
    pretty = datetime.strptime(post["date"], "%Y-%m-%d").strftime("%B %d, %Y")
    desc = html.escape(post["description"][:190], quote=True)
    return f"""      <a class="mpa-card" href="/{post['slug']}/">
        <span class="mpa-card-img"><img src="{html.escape(img, quote=True)}" alt="{html.escape(post['title'], quote=True)}" loading="lazy" width="640" height="400" /></span>
        <span class="mpa-card-body">
          <span class="mpa-card-date">{pretty}</span>
          <span class="mpa-card-title">{html.escape(post['title'])}</span>
          <span class="mpa-card-desc">{desc}</span>
          <span class="mpa-card-more">Read article &rarr;</span>
        </span>
      </a>"""


LIST_CSS = """
<style>
.mpa-list{max-width:1180px;margin:0 auto;padding:70px 20px 90px}
.mpa-list h2.mpa-sec{font-size:1.25rem;letter-spacing:.08em;text-transform:uppercase;
  opacity:.65;margin:0 0 26px;font-weight:600}
.mpa-list h2.mpa-sec + .mpa-grid{margin-bottom:70px}
.mpa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:30px}
.mpa-card{display:flex;flex-direction:column;background:#fff;border:1px solid #e6eaf2;
  border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;
  transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.mpa-card:hover{transform:translateY(-4px);box-shadow:0 14px 32px rgba(10,23,51,.13);border-color:#c9a227}
.mpa-card-img{display:block;aspect-ratio:16/10;background:#0a1733;overflow:hidden}
.mpa-card-img img{width:100%;height:100%;object-fit:cover;display:block}
.mpa-card-body{display:flex;flex-direction:column;padding:22px 24px 26px;flex:1}
.mpa-card-date{font-size:.8rem;letter-spacing:.05em;text-transform:uppercase;opacity:.6;margin-bottom:10px}
.mpa-card-title{font-size:1.16rem;font-weight:700;line-height:1.35;color:#0a1733;margin-bottom:10px}
.mpa-card-desc{font-size:.95rem;line-height:1.65;opacity:.8;flex:1}
.mpa-card-more{margin-top:16px;font-weight:600;color:#c9a227;font-size:.95rem}
.mpa-pagination{display:flex;justify-content:space-between;gap:20px;margin-top:42px}
.mpa-pagination a{color:#0a1733;font-weight:700;text-decoration:none}
.mpa-pagination a[rel="next"]{margin-left:auto}
.mpa-pagination a:hover{text-decoration:underline;text-underline-offset:3px}
@media(max-width:640px){.mpa-list{padding:44px 16px 60px}.mpa-grid{gap:22px}}
</style>
"""


def render_blog_index(prefix, suffix, posts, page_path, page_number, total_pages):
    url = f"{SITE_URL}/{page_path}"
    head, rest = clean_head(prefix)
    page_suffix = "" if page_number == 1 else f" - Page {page_number}"
    meta = {
        "title": "Blog", "iso": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
        "description": ("Insights on private investigations, surveillance, asset searches, "
                        "cyber investigations and legal evidence from Miami PI Agency."),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "image": "",
    }
    head += f"""
<title>Insights and Expertise: The {SITE_NAME} Blog{page_suffix}</title>
<meta name="description" content="{meta['description']}" />
<link rel="canonical" href="{url}" />
<meta property="og:locale" content="en_US" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{SITE_NAME}" />
<meta property="og:title" content="Insights and Expertise: The {SITE_NAME} Blog{page_suffix}" />
<meta property="og:description" content="{meta['description']}" />
<meta property="og:url" content="{url}" />
<meta name="twitter:card" content="summary_large_image" />
""" + LIST_CSS

    rest = re.sub(
        r'(<h1 class="fusion-title-heading[^"]*"[^>]*>).*?(</h1>)',
        r'\1Miami PI Agency Blog\2',
        rest, count=1, flags=re.S)

    heading = "Latest" if page_number == 1 else "More articles"
    cards = (f'    <h2 class="mpa-sec">{heading}</h2>\n    <div class="mpa-grid">\n'
             + "\n".join(card(post) for post in posts) + "\n    </div>")

    pagination_links = []
    if page_number > 1:
        newer_path = "/blog/" if page_number == 2 else f"/blog/page/{page_number - 1}/"
        pagination_links.append(f'<a rel="prev" href="{newer_path}">&larr; Newer articles</a>')
    if page_number < total_pages:
        pagination_links.append(
            f'<a rel="next" href="/blog/page/{page_number + 1}/">Older articles &rarr;</a>')
    pagination = ('    <nav class="mpa-pagination" aria-label="Blog pagination">'
                  + "".join(pagination_links) + "</nav>" if pagination_links else "")

    content = f"""
<div class="fusion-row" style="max-width:100%;">
<section id="content" class="full-width">
<div class="post page type-page status-publish hentry">
<div class="post-content">
    <div class="mpa-list">
{cards}
{pagination}
  </div>
</div></div>
</section>
</div>
"""
    return head + rest + content + suffix


# --------------------------------------------------------------------------
# Sitemap
# --------------------------------------------------------------------------

def update_sitemap(site, posts):
    path = os.path.join(site, "sitemap.xml")
    if not os.path.exists(path):
        print("  ! sitemap.xml no encontrado, se omite")
        return 0
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    tree = ET.parse(path)
    root = tree.getroot()
    existing = {}
    for node in root.findall("sm:url", ns):
        loc = node.findtext("sm:loc", default="", namespaces=ns).strip()
        if loc:
            existing[loc] = {child.tag.rsplit("}", 1)[-1]: (child.text or "")
                              for child in node if child.tag.rsplit("}", 1)[-1] != "loc"}

    expected = {}
    for current, dirs, files in os.walk(site):
        dirs[:] = [name for name in dirs if not name.startswith((".", "_"))]
        if "index.html" not in files:
            continue
        rel = os.path.relpath(os.path.join(current, "index.html"), site).replace(os.sep, "/")
        source = open(os.path.join(current, "index.html"), encoding="utf-8").read()
        robots = re.findall(r"<meta\b[^>]*\bname=[\"']robots[\"'][^>]*\bcontent=[\"']([^\"']*)",
                            source, flags=re.I)
        if any(re.search(r"(?:^|[\s,])(noindex|none)(?:$|[\s,])", value, flags=re.I)
               for value in robots):
            continue
        url_path = "" if rel == "index.html" else rel[:-len("/index.html")]
        expected[f"{SITE_URL}/{url_path + '/' if url_path else ''}"] = rel

    removed = len(existing) - len(set(existing) & set(expected))
    added = len(set(expected) - set(existing))
    root.clear()
    root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    for loc in sorted(expected):
        node = ET.SubElement(root, "url")
        ET.SubElement(node, "loc").text = loc
        for key, value in existing.get(loc, {}).items():
            ET.SubElement(node, key).text = value
        if loc not in existing:
            ET.SubElement(node, "priority").text = "1.0" if loc == f"{SITE_URL}/" else "0.8"
    tree.write(path, encoding="utf-8", xml_declaration=True)
    return added - removed


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True, help="ruta a la carpeta 'site'")
    ap.add_argument("--feed", help="fichero feed.xml de Soro")
    ap.add_argument("--items", help="fichero items.json")
    ap.add_argument("--feed-url", help="URL del feed RSS de Soro")
    ap.add_argument("--legacy", help="JSON con los posts antiguos (si no, se escanean del sitio)")
    ap.add_argument("--no-autolink", action="store_true", help="no anadir enlaces internos")
    ap.add_argument("--skip-index", action="store_true", help="no regenerar blog/index.html")
    args = ap.parse_args()

    site = os.path.abspath(args.site)
    tpl_path = os.path.join(site, TEMPLATE_REL)
    if not os.path.exists(tpl_path):
        sys.exit(f"No encuentro la plantilla: {tpl_path}")
    tpl = open(tpl_path, encoding="utf-8").read().replace("\r\n", "\n").replace("\r", "\n")
    prefix, suffix = split_template(tpl)

    items = load_items(args)
    print(f"Articulos de Soro encontrados: {len(items)}")
    if not items:
        # Feed vacio o caido: no tocar nada, para no borrar el listado existente.
        print("El feed no devolvio articulos. No se modifica nada.")
        return

    for it in items:
        out_dir = os.path.join(site, it["slug"])
        os.makedirs(out_dir, exist_ok=True)
        page = clean_generated_text(
            render_article(prefix, suffix, it, autolink=not args.no_autolink))
        open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8", newline="").write(page)
        print(f"  + /{it['slug']}/  ({len(page)//1024} KB)")

    if not args.skip_index:
        soro_slugs = {i["slug"] for i in items}
        if args.legacy:
            with open(args.legacy, encoding="utf-8") as fh:
                found = json.load(fh)
        else:
            found = scan_legacy_posts(site)
        legacy = [p for p in found if p["slug"] not in soro_slugs]
        all_posts = sorted(
            items + legacy, key=lambda post: (post["date"], post["slug"]), reverse=True)
        total_pages = max(1, (len(all_posts) + BLOG_PAGE_SIZE - 1) // BLOG_PAGE_SIZE)
        for page_number in range(1, total_pages + 1):
            page_path = "blog/" if page_number == 1 else f"blog/page/{page_number}/"
            output_path = os.path.join(site, page_path, "index.html")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            start = (page_number - 1) * BLOG_PAGE_SIZE
            page_posts = all_posts[start:start + BLOG_PAGE_SIZE]
            idx = render_blog_index(
                prefix, suffix, page_posts, page_path, page_number, total_pages)
            if page_number != 1:
                # Las plantillas exportadas usan rutas relativas pensadas para
                # paginas de primer nivel. La base mantiene CSS, JS e imagenes
                # correctos también dentro de /blog/page/2/.
                idx = idx.replace("<head>", '<head>\n<base href="/" />', 1)
                idx = clean_generated_text(idx)
            open(output_path, "w", encoding="utf-8", newline="").write(idx)
            print(f"  + /{page_path}  ({len(page_posts)} articulos, pagina {page_number}/{total_pages})")

    n = update_sitemap(site, items)
    print(f"  + sitemap.xml ({n} URLs nuevas)")
    print("Listo.")


if __name__ == "__main__":
    main()
