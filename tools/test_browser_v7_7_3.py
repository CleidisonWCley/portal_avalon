#!/usr/bin/env python3
"""Validação visual e funcional da consolidação final do Portal Avalon."""
from __future__ import annotations

import json
import mimetypes
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
EVIDENCE = ROOT / "docs/evidencias/V7.7.3"
EVIDENCE.mkdir(parents=True, exist_ok=True)
CSS = (WEB / "assets/css/styles.css").read_text(encoding="utf-8")
UI_JS = (WEB / "assets/js/ui.js").read_text(encoding="utf-8")

PAGES = [
    "index.html", "pages/hall.html", "pages/oraculo.html",
    "pages/registro.html", "pages/raid.html", "pages/galeria.html", "pages/liga.html",
]
DATA_PATHS = [
    "data/raids/raid_atual.json", "data/raids/raid_anterior.json",
    "data/raids/raid_history.json", "data/raids/raid_manual_overrides.json",
    "data/insignias.json", "data/gallery/eventos.json",
]


def route_local_assets(route) -> None:
    url = route.request.url
    if not url.startswith("https://assets.local/"):
        route.abort(); return
    relative = url.split("https://assets.local/", 1)[1].split("?", 1)[0]
    candidate = (WEB / relative).resolve()
    if candidate.is_file() and WEB.resolve() in candidate.parents:
        route.fulfill(status=200, body=candidate.read_bytes(),
                      content_type=mimetypes.guess_type(str(candidate))[0] or "application/octet-stream")
    else:
        route.fulfill(status=404, body="")


def base_inline_page(relative: str) -> str:
    html = (WEB / relative).read_text(encoding="utf-8")
    html = re.sub(r"<link[^>]*>", "", html)
    html = re.sub(r"<script[^>]*src=[\"'][^\"']+[\"'][^>]*></script>", "", html)
    base = "https://assets.local/" if relative == "index.html" else "https://assets.local/pages/"
    html = html.replace("</head>", f'<base href="{base}"><style>{CSS}.material-symbols-outlined{{font-family:Arial}}</style></head>')
    html = html.replace('class="avalon-page-loader is-visible"', 'class="avalon-page-loader" hidden')
    html = html.replace(' reveal"', ' reveal is-visible"')
    return html


def storage_patch() -> str:
    return """
<script>
const __storage = {};
Object.defineProperty(window, 'localStorage', { configurable: true, value: {
  get length() { return Object.keys(__storage).length; },
  key: index => Object.keys(__storage)[index] ?? null,
  getItem: key => Object.prototype.hasOwnProperty.call(__storage, key) ? __storage[key] : null,
  setItem: (key, value) => { __storage[key] = String(value); },
  removeItem: key => { delete __storage[key]; },
  clear: () => { Object.keys(__storage).forEach(key => delete __storage[key]); }
}});
</script>
"""


def registro_inline_page() -> str:
    html = base_inline_page("pages/registro.html")
    data = {key: json.loads((WEB / key).read_text(encoding="utf-8")) for key in DATA_PATHS}
    data_js = (WEB / "assets/js/data.js").read_text(encoding="utf-8")
    hall_rules = (WEB / "assets/js/hall-rules.js").read_text(encoding="utf-8")
    app_js = (WEB / "assets/js/app.js").read_text(encoding="utf-8")
    fetch_patch = rf"""
<script>
window.__TEST_DATA__ = {json.dumps(data, ensure_ascii=False)};
window.fetch = async function(url) {{
  const key = String(url).replace(/^\.\.\//, '').replace(/^\.\//, '');
  const value = window.__TEST_DATA__[key];
  return {{ ok: Boolean(value), status: value ? 200 : 404, json: async () => value }};
}};
</script>
"""
    scripts = f"{storage_patch()}<script>{data_js}</script>{fetch_patch}<script>{hall_rules}</script><script>{app_js}</script>"
    return html.replace("</body>", f"{scripts}</body>")


def raid_inline_page() -> str:
    html = base_inline_page("pages/raid.html")
    raid_js = (WEB / "assets/js/raid.js").read_text(encoding="utf-8")
    patch = "<script>window.fetch=async()=>({ok:false,status:503,json:async()=>({})});</script>"
    export = "<script>window.__raidTest={raidState,renderResults};</script>"
    return html.replace("</body>", f"{storage_patch()}{patch}<script>{raid_js}</script>{export}</body>")


SAMPLE_TEAM = {
    "boss": "Goblin Chief", "element": "fire", "label": "Teste Mobile", "player": "Avalon",
    "dmg": 123.45, "feverDmg": 25.1, "season": "Atual", "lastUpdate": "2026-06-16",
    "heroes": ["Hero A", "Hero B", "Hero C", "Hero D"],
    "heroesAtr": ["", "", "", ""], "weaponsAtr": ["", "", "", ""],
    "access": ["Mirror", "Mirror", "Mirror", "Mirror"],
    "cards": ["Skill Damage - Crit", "Atk - Def", "Crit - Atk", "HP - Def"],
    "chains": {"Padrão": {"1": "Hero A > Hero B", "2": "Hero C > Hero D"}},
    "infos": "Observação extensa para validar quebra de linha e largura segura no celular.", "video": "",
}


def motion_inline_page() -> str:
    safe_ui = UI_JS.replace("</script>", "<\\/script>")
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>{CSS}</style></head>
<body><div id="avalon-page-loader" class="avalon-page-loader is-visible" role="status">
<span class="avalon-page-loader__spinner"></span><span class="avalon-page-loader__text">Carregando...</span></div>
<main class="page-shell"><section id="motion-section" class="section-block page-title-stage reveal">
<div class="page-hero-mascots salao-hero-mascots"><div class="page-hero-mascot left cley"><span>Cley</span></div>
<div class="page-title-card"><h1>Portal Avalon</h1></div><div class="page-hero-mascot right olimpio"><span>Olimpio</span></div></div>
</section></main><script>{safe_ui}</script></body></html>"""


def assert_no_overflow(page, label: str) -> None:
    values = page.evaluate("() => ({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})")
    assert values["scroll"] <= values["client"] + 1, (label, values)


def run() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox", "--disable-gpu"])

        # Loader remains animated; mascots remain static; reveal starts after loader.
        for width, height in [(390, 844), (768, 1024), (1366, 768)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.set_content(motion_inline_page(), wait_until="domcontentloaded")
            page.wait_for_timeout(60)
            during = page.evaluate("""() => ({
              loaderHidden:document.querySelector('#avalon-page-loader').hidden,
              spinnerAnimation:getComputedStyle(document.querySelector('.avalon-page-loader__spinner')).animationName,
              revealVisible:document.querySelector('#motion-section').classList.contains('is-visible'),
              opacity:getComputedStyle(document.querySelector('#motion-section')).opacity
            })""")
            assert not during["loaderHidden"] and during["spinnerAnimation"] == "avalonLoaderSpin", (width, during)
            assert not during["revealVisible"] and during["opacity"] == "0", (width, during)
            page.wait_for_timeout(520)
            after = page.evaluate("""() => ({
              loaderHidden:document.querySelector('#avalon-page-loader').hidden,
              revealVisible:document.querySelector('#motion-section').classList.contains('is-visible'),
              opacity:getComputedStyle(document.querySelector('#motion-section')).opacity,
              mascotAnimation:getComputedStyle(document.querySelector('.page-hero-mascot')).animationName,
              mascotTransform:getComputedStyle(document.querySelector('.page-hero-mascot')).transform
            })""")
            assert after["loaderHidden"] and after["revealVisible"] and float(after["opacity"]) > 0, (width, after)
            assert after["mascotAnimation"] == "none", (width, after)
            transform_a = after["mascotTransform"]
            page.wait_for_timeout(260)
            transform_b = page.locator('.page-hero-mascot').first.evaluate("el=>getComputedStyle(el).transform")
            assert transform_a == transform_b, (width, transform_a, transform_b)
            page.close()

        # Seven page headers: visible mascots and no horizontal overflow.
        for width, height in [(320, 568), (390, 844), (720, 900), (768, 1024), (1366, 768)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.route("https://assets.local/**", route_local_assets)
            for relative in PAGES:
                page.set_content(base_inline_page(relative), wait_until="domcontentloaded")
                page.wait_for_timeout(80)
                metrics = page.evaluate("""() => [...document.querySelectorAll('.page-hero-mascot')].map(el=>{
                  const img=el.querySelector('img'); const r=img.getBoundingClientRect(); const s=getComputedStyle(el);
                  return {display:s.display,animation:s.animationName,width:r.width,height:r.height,left:r.left,right:r.right};
                })""")
                assert len(metrics) == 2, (relative, width, metrics)
                assert all(m["display"] != "none" and m["animation"] == "none" and m["width"] > 0 and m["height"] > 0 for m in metrics), (relative, width, metrics)
                assert all(m["left"] >= -1 and m["right"] <= width + 1 for m in metrics), (relative, width, metrics)
                assert_no_overflow(page, f"{relative}@{width}")
            page.close()

        # Registro mobile cards and desktop table.
        for width, height in [(320,568),(390,844),(430,932),(720,900)]:
            page=browser.new_page(viewport={"width":width,"height":height}); page.route("https://assets.local/**", route_local_assets)
            page.set_content(registro_inline_page(), wait_until="domcontentloaded"); page.wait_for_timeout(900)
            m=page.evaluate("""() => {const t=document.querySelector('.battle-table'),w=document.querySelector('.table-wrap'),r=document.querySelector('.registro-member-card');return {rows:document.querySelectorAll('.registro-member-card').length,labels:r?[...r.querySelectorAll('td')].map(c=>c.dataset.label):[],display:r?getComputedStyle(r).display:'',tw:t.getBoundingClientRect().width,ww:w.getBoundingClientRect().width,sw:w.scrollWidth};}""")
            assert m["rows"]>=1 and m["display"]=="grid" and len(m["labels"])==10 and all(m["labels"]), (width,m)
            assert m["tw"]<=m["ww"]+1 and m["sw"]<=m["ww"]+1, (width,m); assert_no_overflow(page,f"registro@{width}")
            if width==390: page.screenshot(path=str(EVIDENCE/'registro_mobile_cards_390.png'), full_page=True)
            page.close()
        page=browser.new_page(viewport={"width":1366,"height":768}); page.route("https://assets.local/**", route_local_assets)
        page.set_content(registro_inline_page(), wait_until="domcontentloaded"); page.wait_for_timeout(900)
        m=page.evaluate("""() => ({table:getComputedStyle(document.querySelector('.battle-table')).display,head:getComputedStyle(document.querySelector('.battle-table thead')).display,sticky:getComputedStyle(document.querySelector('.sticky-rank')).position})""")
        assert m=={"table":"table","head":"table-header-group","sticky":"sticky"},m; page.close()

        # Raid mobile four heroes and desktop four columns.
        for width,height in [(320,568),(390,844),(430,932),(720,900)]:
            page=browser.new_page(viewport={"width":width,"height":height}); page.route("https://assets.local/**", route_local_assets)
            page.set_content(raid_inline_page(), wait_until="domcontentloaded"); page.wait_for_timeout(220)
            page.evaluate("team=>{window.__raidTest.raidState.selectedBoss='goblin';window.__raidTest.raidState.selectedElement='fire';window.__raidTest.renderResults([team]);}",SAMPLE_TEAM); page.wait_for_timeout(180)
            m=page.evaluate("""() => {const c=document.querySelector('.raid-team-card'),h=[...document.querySelectorAll('.raid-hero-slot')],s=document.querySelector('#raid-results-section');return {heroes:h.length,hidden:s.classList.contains('hidden'),opacity:getComputedStyle(s).opacity,left:c.getBoundingClientRect().left,right:c.getBoundingClientRect().right};}""")
            assert m["heroes"]==4 and not m["hidden"] and m["opacity"]=="1" and m["left"]>=-1 and m["right"]<=width+1,(width,m); assert_no_overflow(page,f"raid@{width}")
            if width==390: page.screenshot(path=str(EVIDENCE/'raid_mobile_times_390.png'), full_page=True)
            page.close()
        page=browser.new_page(viewport={"width":1366,"height":900}); page.route("https://assets.local/**", route_local_assets)
        page.set_content(raid_inline_page(), wait_until="domcontentloaded"); page.wait_for_timeout(220)
        page.evaluate("team=>{window.__raidTest.raidState.selectedBoss='goblin';window.__raidTest.raidState.selectedElement='fire';window.__raidTest.renderResults([team]);}",SAMPLE_TEAM)
        columns=page.locator('.raid-heroes-grid').evaluate("el=>getComputedStyle(el).gridTemplateColumns")
        assert len(columns.split())==4,columns; page.close(); browser.close()

    print('PASS | loader animado e reveal sincronizado')
    print('PASS | mascotes estáticos em desktop, tablet e celular')
    print('PASS | cabeçalhos sem overflow nas sete páginas')
    print('PASS | Registro mobile e desktop preservados')
    print('PASS | Raid mobile e desktop preservadas')
    print('Resultado visual: 5/5 grupos aprovados.')

if __name__ == '__main__':
    run()
