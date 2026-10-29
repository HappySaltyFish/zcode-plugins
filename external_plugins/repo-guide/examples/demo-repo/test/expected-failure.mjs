import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTask } from '../src/validate.mjs';

// Deliberately incorrect expectation for demonstrating a real nonzero result.
test('DEMONSTRATION ONLY: an empty task is accepted', () => {
  assert.equal(validateTask('').ok, true);
});
