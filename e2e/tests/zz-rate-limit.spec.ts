import { expect, test } from './support/fixtures';

// Named zz-* so it runs last: it deliberately exhausts the contact-form rate limit
// (CONTACT_RATE_LIMIT=20 per minute in the test stack) and would starve other contact tests.
test('contact endpoint is rate limited against spam', async ({ api }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 30; i += 1) {
    const res = await api.request.post('/api/contact', { data: { name: 'Spam', email: 'spam@example.com', message: `spam ${i}` } });
    statuses.push(res.status());
  }
  expect(statuses).toContain(429);
  expect(statuses.filter((status) => status === 201).length).toBeLessThanOrEqual(20);
});
