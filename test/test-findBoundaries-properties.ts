/**
 * @file
 *
 * Property-based testing for findSpans().
 */
import { testProp, fc, test } from "ava-fast-check";
import { findBoundaries } from "../src";

const MAX_STRING = 32;

// Arbitraries //
/** A full Unicode string can contain ANY Unicode character. */
const fullUnicodeString = fc.fullUnicodeString(1, MAX_STRING);
/**
 * Astral code points e.g., anything larger than U+FFFF are represented by two indices
 * in a JavaScript string. These are weird things like Linear A, and emoji.
 */
const astralCodePoint = fc.integer(0x01_0000, 0x10_ffff).map((n) => String.fromCodePoint(n));
/**
 * A string comprising only of astral code points.
 */
const astralString = fc.stringOf(astralCodePoint);

// Properties //

test("an empty string does not yield spans", (t) => {
  // test that findBoundaries does not yield any items:
  t.deepEqual(Array.from(findBoundaries("")), []);
});

testProp("non-empty strings' first span starts at at 0", [fullUnicodeString], (s) => {
  const arr = Array.from(findBoundaries(s));
  return arr.length > 0 && arr[0] === 0;
});

testProp("non-empty strings' last span ends at string.length", [fullUnicodeString], (s) => {
  let spans = Array.from(findBoundaries(s));
  return spans[spans.length - 1] === s.length;
});

testProp("every pair of boundaries is in strictly increasing order", [fullUnicodeString], (s) => {
  return Array.from(pairs(findBoundaries(s))).every(([a, b]) => a < b);
});

testProp("every pair of boundaries has a non-zero gap", [fullUnicodeString], (s) => {
  return Array.from(pairs(findBoundaries(s))).every(([a, b]) => b - a > 0);
});

testProp("between each pair of boundaries is only scalar values", [astralString], (s) => {
  return Array.from(pairs(findBoundaries(s))).every(([start, end]) => {
    let text = s.slice(start, end);
    let result = true;
    for (let index = 0; index < text.length; index++) {
      let val = text[index];
      result =
        result &&
        // It is a BMP code point
        (inRange(val.charCodeAt(0), [0, 0xd7ff]) ||
          inRange(val.charCodeAt(0), [0xe000, 0xffff]) ||
          // Or it's a high surrogate followed by a low surrogate
          (isHighSurrogateAt(text, index) && isLowSurrogateAt(text, index + 1)) ||
          // Or it's a low surrogate that follows a high surrogate
          (isLowSurrogateAt(text, index) && isHighSurrogateAt(text, index - 1)));
    }
    return result;
  });
});

function isHighSurrogateAt(text: string, index: number): boolean {
  return inRange(text.charCodeAt(index), [0xd800, 0xdbff]);
}

function isLowSurrogateAt(text: string, index: number): boolean {
  return inRange(text.charCodeAt(index), [0xdc00, 0xdfff]);
}

function inRange(value: number | undefined, [min, max]: [number, number]): boolean {
  if (min > max) {
    throw new Error("Swap min and max!");
  }
  if (value === undefined) {
    throw new RangeError("Could not get character from string");
  }
  return value >= min && value <= max;
}

/**
 * Yields contiguous pairs from a generator.
 */
function* pairs<T>(iterator: Iterator<T>): Generator<[T, T], void, void> {
  let previous = iterator.next();
  let current = iterator.next();

  while (!previous.done && !current.done) {
    yield [previous.value, current.value];
    previous = current;
    current = iterator.next();
  }
}
