from __future__ import annotations

import mimetypes
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'


def page_html(relative: str) -> str:
    html = (WEB / relative).read_text(encoding='utf-8')
    base = 'https://assets.local/' if relative == 'index.html' else 'https://assets.local/pages/'
    storage = """
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
    return html.replace('<head>', f'<head><base href="{base}">{storage}', 1)


def route_assets(route) -> None:
    url = route.request.url
    if url.startswith('https://assets.local/'):
        relative = url.split('https://assets.local/', 1)[1].split('?', 1)[0]
        candidate = (WEB / relative).resolve()
        if candidate.is_file() and WEB.resolve() in candidate.parents:
            route.fulfill(
                status=200,
                body=candidate.read_bytes(),
                content_type=mimetypes.guess_type(str(candidate))[0] or 'application/octet-stream',
            )
        else:
            route.fulfill(status=404, body='')
        return

    route.abort()


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--disable-gpu'],
    )

    page = browser.new_page(viewport={'width': 1366, 'height': 900})
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.route('**/*', route_assets)
    page.set_content(page_html('pages/hall.html'), wait_until='domcontentloaded')
    page.locator('#avalon-page-loader').wait_for(state='hidden', timeout=12000)
    page.locator('#podium .podium-card').first.wait_for(state='visible', timeout=8000)
    page.locator('#podium').scroll_into_view_if_needed()
    page.wait_for_function("() => document.querySelector('#podium')?.closest('.reveal')?.classList.contains('is-visible')")

    effects = page.evaluate("""
      () => ['gold', 'silver', 'bronze'].map(kind => {
        const wrap = document.querySelector(`#podium .podium-card.${kind} .podium-image-wrap`);
        const style = getComputedStyle(wrap, '::after');
        return {
          kind,
          name: style.animationName,
          count: style.animationIterationCount,
          duration: style.animationDuration,
          delay: style.animationDelay
        };
      })
    """)

    assert all(item['name'] == 'hallPatentFlash' for item in effects), effects
    assert all(item['count'] == '1' for item in effects), effects
    delays = [float(item['delay'].rstrip('s')) for item in effects]
    assert delays[0] < delays[1] < delays[2], effects
    assert not errors, errors
    page.close()

    page = browser.new_page(viewport={'width': 1366, 'height': 900})
    page.route('**/*', route_assets)
    page.set_content(page_html('pages/liga.html'), wait_until='domcontentloaded')
    page.locator('#avalon-page-loader').wait_for(state='hidden', timeout=12000)
    trophy_animations = page.evaluate("""
      () => [...document.querySelectorAll('.podium-final-card img, .winner-share-trophy-wrap img')]
        .map(image => getComputedStyle(image).animationName)
    """)
    assert all(name == 'none' for name in trophy_animations), trophy_animations
    page.close()
    browser.close()

print('OK — flash único do Top 3 e troféus da Liga estáticos.', effects)
