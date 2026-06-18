from __future__ import annotations
import json, mimetypes, re, time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
PAGES=['index.html','pages/hall.html','pages/oraculo.html','pages/registro.html','pages/galeria.html','pages/liga.html','pages/raid.html']

def html_for(rel):
    text=(WEB/rel).read_text(encoding='utf-8')
    base='https://assets.local/' if rel=='index.html' else 'https://assets.local/pages/'
    text=text.replace('<head>','<head><base href="'+base+'"><script>const __s={};Object.defineProperty(window,"localStorage",{configurable:true,value:{get length(){return Object.keys(__s).length},key:i=>Object.keys(__s)[i]??null,getItem:k=>Object.prototype.hasOwnProperty.call(__s,k)?__s[k]:null,setItem:(k,v)=>{__s[k]=String(v)},removeItem:k=>{delete __s[k]},clear:()=>Object.keys(__s).forEach(k=>delete __s[k])}});</script>',1)
    return text

def handler(route, delayed_json=None, failed_json=None, raid_payload=None):
    url=route.request.url
    if url.startswith('https://assets.local/'):
        relative=url.split('https://assets.local/',1)[1].split('?',1)[0]
        if failed_json and relative.endswith(failed_json):
            route.fulfill(status=503, body='{}', content_type='application/json'); return
        if delayed_json and relative.endswith(delayed_json):
            time.sleep(.8)
        candidate=(WEB/relative).resolve()
        if candidate.is_file() and WEB.resolve() in candidate.parents:
            route.fulfill(status=200,body=candidate.read_bytes(),content_type=mimetypes.guess_type(str(candidate))[0] or 'application/octet-stream')
        else: route.fulfill(status=404,body='')
    elif url.startswith('https://avalon-raid-api.cleidisonlima20.workers.dev'):
        payload=raid_payload or {'list':[{'boss':'goblin','element':['fire']}]}
        route.fulfill(status=200,body=json.dumps(payload),content_type='application/json')
    else:
        route.abort()

def setup(page, **kwargs):
    page.route('**/*',lambda route: handler(route,**kwargs))

def no_overflow(page):
    return page.evaluate("() => ({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    results=[]
    for rel in PAGES:
        page=browser.new_page(viewport={'width':1366,'height':900})
        errors=[]; req=[]
        page.on('pageerror',lambda e,errors=errors:errors.append(str(e)))
        page.on('request',lambda r,req=req:req.append(r.url))
        setup(page)
        page.set_content(html_for(rel),wait_until='domcontentloaded')
        try: page.locator('#avalon-page-loader').wait_for(state='hidden',timeout=12000)
        except PlaywrightTimeout: raise AssertionError((rel,'loader stuck',page.locator('#avalon-page-loader').inner_text()))
        page.wait_for_timeout(250)
        ov=no_overflow(page); assert ov['sw']<=ov['cw']+2,(rel,ov)
        # Firebase network failures are caught; no JS page errors.
        assert not errors,(rel,errors)
        crit=page.evaluate("() => [...document.querySelectorAll('img[data-avalon-critical-image]')].map(i=>({c:i.complete,w:i.naturalWidth}))")
        assert crit and all(x['c'] and x['w']>0 for x in crit),(rel,crit)
        jsons=[u.split('https://assets.local/')[-1] for u in req if u.endswith('.json')]
        results.append((rel,jsons))
        if rel.endswith('liga.html'):
            assert page.locator('#league-mode-grid').evaluate('el=>el.children.length')>0
        page.close()
    deps=dict(results)
    assert deps['pages/galeria.html']==['data/gallery/eventos.json'],deps['pages/galeria.html']
    assert not any('eventos.json' in x for x in deps['pages/hall.html']),deps['pages/hall.html']

    for rel in ['pages/registro.html','pages/liga.html','pages/raid.html']:
        for width in [1366,1093,911,781,683,390,320]:
            page=browser.new_page(viewport={'width':width,'height':900}); setup(page)
            page.set_content(html_for(rel),wait_until='domcontentloaded')
            page.locator('#avalon-page-loader').wait_for(state='hidden',timeout=12000)
            page.wait_for_timeout(180)
            ov=no_overflow(page); assert ov['sw']<=ov['cw']+2,(rel,width,ov)
            if rel.endswith('registro.html'):
                display=page.locator('.battle-table').evaluate('el=>getComputedStyle(el).display')
                assert display==('block' if width<=980 else 'table'),(width,display)
            page.close()

    page=browser.new_page(viewport={'width':390,'height':844}); setup(page,delayed_json='data/gallery/eventos.json')
    started=time.perf_counter()
    page.set_content(html_for('pages/galeria.html'),wait_until='domcontentloaded')
    page.locator('#avalon-page-loader').wait_for(state='hidden',timeout=6000)
    elapsed=time.perf_counter()-started
    assert elapsed>=0.7, elapsed
    assert page.locator('.gallery-card').count()>0
    page.close()

    page=browser.new_page(viewport={'width':390,'height':844}); setup(page,failed_json='data/gallery/eventos.json')
    page.set_content(html_for('pages/galeria.html'),wait_until='domcontentloaded')
    page.locator('#avalon-page-loader').wait_for(state='hidden',timeout=16000)
    assert page.locator('#gallery-empty').count()==1
    page.close()
    browser.close()
print('OK — navegador, loader, dependências e zoom aprovados.', results)
