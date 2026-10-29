import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTask } from '../src/validate.mjs';

test('accepts a trimmed task name', () => {
  assert.deepEqual(validateTask('  Read code  '), { ok: true, value: 'Read code' });
});
test('rejects empty and non-text input', () => {
  assert.equal(validateTask('  ').ok, false);
  assert.equal(validateTask(null).ok, false);
});
test('rejects overly long task names', () => {
  assert.equal(validateTask('x'.repeat(81)).ok, false);
});
