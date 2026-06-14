#!/usr/bin/env python3
from __future__ import annotations
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
EVID=ROOT/'docs/evidencias/V7.6'
EVID.mkdir(parents=True,exist_ok=True)
CSS=(WEB/'assets/css/styles.css').read_text(encoding='utf-8')
UI=(WEB/'assets/js/ui.js').read_text(encoding='utf-8')

def inline_page(rel: str) -> str:
    html=(WEB/rel).read_text(encoding='utf-8')
    html=re.sub(r'<link[^>]*>', '', html)
    html=re.sub(r'<script[^>]*src=["\'][^"\']+["\'][^>]*></script>', '', html)
    html=html.replace('</head>', f'<style>{CSS}.material-symbols-outlined{{font-family:Arial}}</style></head>')
    html=html.replace('</body>', f'<script>{UI}</script></body>')
    # ensure enough height for scroll button tests without running page-specific renderers
    html=html.replace('</main>', '<div style="height:1400px" aria-hidden="true"></div></main>')
    return html

def run():
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':1000})

    platform_pages=['index.html','pages/hall.html','pages/oraculo.html','pages/registro.html','pages/raid.html','pages/galeria.html','pages/liga.html']
    for rel in platform_pages:
      errors=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      page.set_content(inline_page(rel),wait_until='domcontentloaded')
      page.wait_for_timeout(120)
      assert page.locator('.page-hero-mascots').count()==1, rel
      content=page.locator('.page-hero-mascots').evaluate("el => getComputedStyle(el,'::after').content")
      assert content not in ('none','normal',''), (rel,content)
      assert not errors, (rel,errors)

    page.set_content(inline_page('pages/registro.html'),wait_until='domcontentloaded');page.wait_for_timeout(150)
    layers=page.evaluate("""() => ({
      platform:getComputedStyle(document.querySelector('.registro-hero-mascots'),'::after').zIndex,
      card:getComputedStyle(document.querySelector('.registro-hero-mascots .page-title-card')).zIndex,
      mascot:getComputedStyle(document.querySelector('.registro-hero-mascot')).zIndex
    })""")
    assert layers=={'platform':'0','card':'2','mascot':'3'}, layers
    page.screenshot(path=str(EVID/'registro_plataforma_global.png'),full_page=False)

    page.set_content(inline_page('pages/hall.html'),wait_until='domcontentloaded');page.wait_for_timeout(150)
    assert page.locator('#comparison-alert').count()==0
    page.evaluate('window.scrollTo(0, document.body.scrollHeight)');page.wait_for_timeout(220)
    assert not page.locator('.site-back-top').evaluate("el => el.classList.contains('hidden')")
    page.screenshot(path=str(EVID/'hall_simplificado_botao_global.png'),full_page=False)

    page.set_content(inline_page('pages/raid.html'),wait_until='domcontentloaded');page.wait_for_timeout(150)
    page.evaluate("""() => AvalonUI.showActionFeedback({title:'Consultando estratégias',message:'Aguarde enquanto o Portal Avalon procura as melhores composições.',type:'loading',persistent:true})""")
    assert page.locator('.action-feedback-card.loading').count()==1
    page.screenshot(path=str(EVID/'raid_feedback_padrao_liga.png'),full_page=False)
    page.evaluate('AvalonUI.closeActionFeedback()');page.wait_for_timeout(280)

    page.set_content(inline_page('pages/liga.html'),wait_until='domcontentloaded');page.wait_for_timeout(150)
    page.evaluate("""() => AvalonUI.showActionFeedback({title:'Liga iniciada',message:'Participantes, modalidade e chaves foram preparados. A primeira fase já está disponível.',type:'success',persistent:true,actions:'<button class="btn btn-primary">Continuar</button>'})""")
    assert page.locator('.action-feedback-actions .btn').count()==1
    page.screenshot(path=str(EVID/'liga_feedback_global.png'),full_page=False)

    mobile=browser.new_page(viewport={'width':390,'height':844})
    mobile.set_content(inline_page('pages/registro.html'),wait_until='domcontentloaded');mobile.wait_for_timeout(150)
    overflow=mobile.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    assert not overflow
    mobile.evaluate('window.scrollTo(0, document.body.scrollHeight)');mobile.wait_for_timeout(220)
    assert mobile.locator('.site-back-top span:last-child').evaluate("el => getComputedStyle(el).display")=='none'
    mobile.close();browser.close()
  print('PASS | plataforma renderizada nas sete abas')
  print('PASS | camadas do Registro: luz 0, card 2 e mascotes 3')
  print('PASS | Hall simplificado e botão global funcionando')
  print('PASS | Raid usa feedback com design da Liga')
  print('PASS | Liga usa o mesmo feedback com ações')
  print('PASS | responsividade sem overflow e botão compacto')
  print('Resultado visual V7.6: 6/6 cenários aprovados.')

if __name__=='__main__': run()
