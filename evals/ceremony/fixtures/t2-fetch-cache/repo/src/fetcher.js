// createFetcher(transport) returns { get(url, cb) }.
// transport(url, cb) must call cb(err, body). The default transport is an
// in-memory canned responder (no network); tests inject their own transport.
export function createFetcher(transport = cannedTransport) {
  return {
    get(url, cb) {
      transport(url, (err, body) => {
        if (err) return cb(err);
        cb(null, body);
      });
    },
  };
}

function cannedTransport(url, cb) {
  const body = JSON.stringify({ url, canned: true });
  process.nextTick(() => cb(null, body));
}
