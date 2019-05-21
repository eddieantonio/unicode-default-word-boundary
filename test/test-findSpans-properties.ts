/**
 * @file
 * 
 * Property-based testing for findSpans().
 */
import { testProp, fc, test } from 'ava-fast-check';
import { findSpans } from '../src';

const MAX_STRING = 32;

// Arbitraries //
/** A full Unicode string can contain ANY Unicode character. */
const fullUnicodeString = fc.fullUnicodeString(1, MAX_STRING);
/**
 * Astral code points e.g., anything larger than U+FFFF are represented by two indices
 * in a JavaScript string. These are weird things like Linear A, and emoji.
 */
const astralCodePoint = fc.integer(0x01_0000, 0x10_FFFF).map(n => String.fromCodePoint(n));
/**
 * A string comprising only of astral code points.
 */
const astralString = fc.stringOf(astralCodePoint);

// Properties //

test('an empty string does not yield spans', t => {
  t.deepEqual(Array.from(findSpans('')), []);
});

testProp("non-empty strings' first span starts at at 0", [fullUnicodeString], s => {
  let it = findSpans(s);
  let span = it.next().value;
  return span && span.start === 0;
});

testProp("non-empty strings' last span ends at string.length", [fullUnicodeString], s => {
  let spans = Array.from(findSpans(s));
  return spans[spans.length - 1].end === s.length;
});

testProp("every span's start is strictly less than its end", [fullUnicodeString], s => {
  return Array.from(findSpans(s)).every(span => {
    return span.start < span.end
  });
});

testProp("every span's end is strictly greater than its start", [fullUnicodeString], s => {
  return Array.from(findSpans(s)).every(span => {
    return span.end > span.start
  });
});

testProp("every span's has a non-zero length", [fullUnicodeString], s => {
  return Array.from(findSpans(s)).every(span => {
    return span.length > 0
  });
});

testProp("every span's length can be derrived from its start and end", [fullUnicodeString], s => {
  return Array.from(findSpans(s)).every(span => {
    return span.length === span.end - span.start
  });
});

testProp("every span's length is equal to the length of its text", [fullUnicodeString], s => {
  return Array.from(findSpans(s)).every(span => {
    return span.text.length === span.length
  });
});


testProp("every span's text is consists of only scalar values", [astralString], s => {
  return Array.from(findSpans(s)).every(span => {
    let text = span.text;
    let result = true;
    for (let index = 0; index < text.length; index++) {
      let val = text[index];
      result = result && (
        // It is a BMP code point
        inRange(val.charCodeAt(0), [0, 0xD7FF]) ||
        inRange(val.charCodeAt(0), [0xE000, 0xFFFF]) ||
        // Or it's a high surrogate followed by a low surrogate
        (isHighSurrogateAt(text, index) && isLowSurrogateAt(text, index + 1)) ||
        // Or it's a low surrogate that follows a high surrogate
        (isLowSurrogateAt(text, index) && isHighSurrogateAt(text, index - 1))
      );
    }
    return result;
  });
});

function isHighSurrogateAt(text: string, index: number): boolean {
  return inRange(text.charCodeAt(index), [0xD800, 0xDBFF])
}

function isLowSurrogateAt(text: string, index: number): boolean {
  return inRange(text.charCodeAt(index), [0xDC00, 0xDFFF])
}

function inRange(value: number | undefined, [min, max]: [number, number]): boolean {
  if (min > max) {
    throw new Error('Swap min and max!');
  }
  if (value === undefined) { 
    throw new RangeError('Could not get character from string');
  }
  return value >= min && value <= max;
}