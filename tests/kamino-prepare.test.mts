import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { units } from '../api/kamino-prepare.ts';

test('preparation preserves smallest token units and rejects rounding', () => {
  assert.equal(units('0.000001', 6), '1');
  assert.equal(units('123.456789', 6), '123456789');
  assert.throws(() => units('0.0000001', 6));
  assert.throws(() => units('0', 6));
  assert.throws(() => units('18446744073709551616', 0));
});

test('transaction endpoint rejects missing action and GET before network calls', async () => {
  const responses: Array<{ status: number; body: any }> = [];
  const response = { statusCode: 0, setHeader() {}, end(text: string) {
    responses.push({ status: this.statusCode, body: JSON.parse(text) });
  } };
  await handler({ method: 'GET' }, response);
  await handler({ method: 'POST', body: { action: 'transfer', asset: 'NVDA', amount: '1', wallet: 'x' } }, response);
  assert.deepEqual(responses.map(item => [item.status, item.body.error]), [
    [405, 'method_not_allowed'], [400, 'invalid_request'],
  ]);
});
