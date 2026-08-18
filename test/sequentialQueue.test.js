const { createSequentialQueue } = require('../src/ws/sequentialQueue');

describe('createSequentialQueue', () => {
  it('runs tasks sequentially even when handlers overlap', async () => {
    const enqueue = createSequentialQueue();
    const order = [];

    enqueue(async () => {
      order.push('a-start');
      await new Promise((r) => {
        setTimeout(r, 30);
      });
      order.push('a-end');
    });

    enqueue(async () => {
      order.push('b-start');
      await new Promise((r) => {
        setTimeout(r, 10);
      });
      order.push('b-end');
    });

    enqueue(async () => {
      order.push('c');
    });

    await new Promise((r) => {
      setTimeout(r, 100);
    });

    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end', 'c']);
  });
});
