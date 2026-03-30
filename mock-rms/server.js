import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());
const receivedEvents = new Map();
let failMode = false;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/mock/fail', (req, res) => {
  failMode = Boolean(req.body?.enabled);
  res.json({ failMode });
});

app.post('/webhook', (req, res) => {
  const idempotencyKey = req.header('x-idempotency-key') ?? 'missing';
  const signature = req.header('x-westface-signature') ?? 'missing';

  console.log('\n--- mock-rms webhook received ---');
  console.log('idempotency:', idempotencyKey);
  console.log('signature:', signature);
  console.log('payload:', JSON.stringify(req.body));

  if (failMode) {
    return res.status(503).json({ status: 'temporary_failure' });
  }

  if (receivedEvents.has(idempotencyKey)) {
    return res.status(200).json({ status: 'duplicate_ignored' });
  }

  receivedEvents.set(idempotencyKey, req.body);
  return res
    .status(200)
    .json({ status: 'ok', receivedAt: new Date().toISOString() });
});

app.get('/mock/events', (_req, res) => {
  const events = Array.from(receivedEvents.entries()).map(
    ([key, payload]) => ({
      idempotencyKey: key,
      payload,
    }),
  );
  res.json({ count: events.length, events });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`mock-rms listening on ${port}`);
});
