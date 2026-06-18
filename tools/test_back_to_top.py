from __future__ import annotations

import mimetypes
import time
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

    if url.startswith('https://avalon-raid-api.cleidisonlima20.workers.dev'):
        route.fulfill(status=200, body='{"list":[]}', content_type='application/json')
        return

    route.abort()


def prepare(page, relative: str) -> None:
    page.route('**/*', route_assets)
    page.set_content(page_html(relative), wait_until='domcontentloaded')
    page.locator('#avalon-page-loader').wait_for(state='hidden', timeout=12000)
    page.evaluate("""
      () => {
        const spacer = document.createElement('div');
        spacer.id = 'back-top-test-spacer';
        spacer.style.height = '12000px';
        spacer.style.width = '1px';
        document.body.appendChild(spacer);
      }
    """)


def wait_button_visible(page) -> None:
    page.wait_for_function("""
      () => {
        const button = document.querySelector('.site-back-top');
        return button && !button.classList.contains('hidden');
      }
    """, timeout=3000)


def run_case(page, start_y: int, max_ms: float) -> float:
    page.evaluate('(y) => window.scrollTo(0, y)', start_y)
    wait_button_visible(page)
    started = time.perf_counter()
    page.locator('.site-back-top').click()
    page.wait_for_function("""
      () => window.scrollY <= 1 && !document.documentElement.classList.contains('avalon-returning-top')
    """, timeout=2500)
    elapsed = (time.perf_counter() - started) * 1000
    assert elapsed <= max_ms, (start_y, elapsed, max_ms)
    assert page.evaluate('() => window.scrollY') <= 1
    return elapsed


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--disable-gpu'],
    )

    results = []
    for width, relative in [(390, 'pages/registro.html'), (1366, 'pages/hall.html')]:
        page = browser.new_page(viewport={'width': width, 'height': 844})
        errors = []
        page.on('pageerror', lambda exc, errors=errors: errors.append(str(exc)))
        prepare(page, relative)

        scroll_behavior = page.evaluate("() => getComputedStyle(document.documentElement).scrollBehavior")
        assert scroll_behavior == 'auto', (relative, scroll_behavior)

        short_ms = run_case(page, 900, 900)
        long_ms = run_case(page, 7000, 650)

        page.evaluate('() => window.scrollTo(0, 900)')
        wait_button_visible(page)
        page.locator('.site-back-top').click()
        page.wait_for_timeout(70)
        page.evaluate("() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120 }))")
        page.wait_for_function("() => !document.documentElement.classList.contains('avalon-returning-top')")
        cancelled_y = page.evaluate('() => window.scrollY')
        assert 1 < cancelled_y < 900, (relative, cancelled_y)

        assert not errors, (relative, errors)
        results.append({
            'page': relative,
            'width': width,
            'short_ms': round(short_ms, 1),
            'long_ms': round(long_ms, 1),
            'cancelled_y': cancelled_y,
        })
        page.close()

    browser.close()

print('OK — retorno ao topo controlado e estável.', results)
