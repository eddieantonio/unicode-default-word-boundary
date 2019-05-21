/**
 * Explicit tests for failures that test-findSpans-properties found :/
 */

import test from 'ava';
import { findSpans } from '../src';

test('can find properties beyond the WROD_BREAK_PROPERTY table', t => {
  // Tests for bug caused due to off-by-one error when the search went out of
  // bounds for code points that exceed the maximum range of the table.
  let spans = Array.from(findSpans("\u{E01f0}"));
  t.is(spans.length, 1);
  t.is(spans[0].start, 0);
})