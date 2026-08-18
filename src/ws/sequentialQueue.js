/**
 * Ensures async handlers run one after another (per WebSocket connection).
 */
function createSequentialQueue() {
  let tail = Promise.resolve();

  return function enqueue(fn) {
    tail = tail
      .then(() => fn())
      .catch((err) => {
        console.error('WS queue error:', err);
      });
    return tail;
  };
}

module.exports = { createSequentialQueue };
