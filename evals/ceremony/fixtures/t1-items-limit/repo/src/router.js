const ITEMS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `item-${String(i + 1).padStart(2, '0')}`,
}));

export function handleRequest(method, path, query = {}) {
  if (method === 'GET' && path === '/health') {
    return { status: 200, body: { ok: true } };
  }
  if (method === 'GET' && path === '/items') {
    return { status: 200, body: { items: ITEMS } };
  }
  return { status: 404, body: { error: 'not found' } };
}
