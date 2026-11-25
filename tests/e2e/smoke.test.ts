import { expect, test } from '@playwright/test';

test('home renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test('healthz is ok', async ({ request }) => {
	const res = await request.get('/healthz');
	expect(res.status()).toBe(200);
	expect(await res.json()).toEqual({ status: 'ok' });
});
