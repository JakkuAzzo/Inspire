import type { Page, Route } from '@playwright/test';

export async function applyNetworkMocks(page: Page) {
  // Abort external image requests to reduce noise, allow same-origin assets
  await page.route('**/*', async (route: Route) => {
    const request = route.request();
    const type = request.resourceType();
    const url = request.url();

    try {
      const u = new URL(url);
      const isSameOrigin = /^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
      if (isSameOrigin) {
        return route.continue();
      }
    } catch {
      // If URL parsing fails, continue
      return route.continue();
    }

    if (type === 'image' || /photos\/random|unsplash|picsum|imgflip|piped|youtube|ytimg|googleusercontent/i.test(url)) {
      return route.abort();
    }
    return route.continue();
  });
}
