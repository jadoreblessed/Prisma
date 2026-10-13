import assert from 'node:assert/strict';
import test from 'node:test';
import { baseUnits } from '../scripts/check-kamino-action.ts';

test('token amounts use exact integers, never floating point rounding', () => {
  assert.equal(baseUnits('0.000001', 6), '1');
  assert.equal(baseUnits('123.456789', 6), '123456789');
  assert.throws(() => baseUnits('0.0000001', 6));
  assert.throws(() => baseUnits('0', 6));
  assert.throws(() => baseUnits('1e9', 6));
  assert.throws(() => baseUnits('18446744073709551616', 0));
});
