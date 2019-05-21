/**
 * @file
 * 
 * Property-based testing for findSpans().
 */
import { testProp, fc, test } from 'ava-fast-check';
import { findSpans } from '../src';

const MAX_STRING = 32;
const fullUnicodeString = fc.fullUnicodeString(1, MAX_STRING);

test('an empty string does not yield spans', t => {
  t.deepEqual(Array.from(findSpans('')), []);
});

testProp("non-empty string's first span starts at at 0", [fullUnicodeString], s => {
  let it = findSpans(s);
  let span = it.next().value;
  return span && span.start === 0;
});