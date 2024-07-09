/*!
 * Copyright (c) 2019 National Research Council Canada
 * Copyright (c) 2024 Eddie Antonio Santos
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file
 * This implements the Unicode 12.0 UAX #29 §4.1
 * default word boundary specification.
 *
 * It finds boundaries between words and also other things!
 *
 * See: https://unicode.org/reports/tr29/#Default_Word_Boundaries
 */

import {
  WordBreakProperty,
  WORD_BREAK_PROPERTY,
  extendedPictographic,
  I,
} from "./gen/WordBreakProperty";

const BITS_PER_WORD = 4;
const ENTRIES_PER_WORD = 8;
const NUMBER_OF_CODE_POINTS = 0x110000;

const assert = (() => {
  if (typeof (globalThis as any).require === "function") {
    // If we're in node, use the built-in assert module.
    return (test: boolean) => void (globalThis as any).require("assert").strictEqual(test, true);
  } else if (typeof (globalThis as any) === "object") {
    // If we're in the browser, use the console.assert.
    return (test: boolean) => void (globalThis as any).console.assert(test);
  }
  // Otherwise, just ignore the assertion.
  return (test: boolean) => {};
})();

const DENSE_LOOKUP = createLookupTable();

/**
 * Yields a series of string indices where a word break should
 * occur. That is, there should be a break BEFORE each string
 * index yielded by this generator.
 *
 * @param text Text to find word boundaries in.
 */
export function* findBoundaries(text: string): Generator<number, void, void> {
  // WB1 and WB2: no boundaries if given an empty string.
  if (text.length === 0) {
    // There are no boundaries in an empty string!
    return;
  }

  // This algorithm works by maintaining a sliding window of four SCALAR VALUES.
  //
  //  - Scalar values? JavaScript strings are NOT actually a string of
  //    Unicode code points; some characters are made up of TWO
  //    JavaScript indices. e.g.,
  //        "💩".length === 2;
  //        "💩"[0] === '\uD83D';
  //        "💩"[1] === '\uDCA9';
  //
  //    These characters that are represented by TWO indices are
  //    called "surrogate pairs". Since we don't want to be in the
  //    "middle" of a character, make sure we're always advancing
  //    by scalar values, and NOT indices. That means, we sometimes
  //    need to advance by TWO indices, not just one.
  //  - Four values? Some rules look at what's to the left of
  //    left, and some look at what's to the right of right. So
  //    keep track of this!

  let rightPos: number;
  let lookaheadPos = 0; // lookahead, one scalar value to the right of right.
  // Before the start of the string is also the start of the string.
  let lookbehind: WordBreakProperty;
  let left = WordBreakProperty.sot;
  let right = WordBreakProperty.sot;
  let lookahead = wordbreakPropertyAt(text, 0);
  // Count RIs to make sure we're not splitting emoji flags:
  let nConsecutiveRegionalIndicators = 0;

  do {
    // Shift all positions, one scalar value to the right.
    rightPos = lookaheadPos;
    lookaheadPos = positionAfter(text, lookaheadPos);
    // Shift all properties, one scalar value to the right.
    [lookbehind, left, right, lookahead] = [
      left,
      right,
      lookahead,
      wordbreakPropertyAt(text, lookaheadPos),
    ];

    // Break at the start and end of text, unless the text is empty.
    // WB1: Break at start of text...
    if (left === WordBreakProperty.sot) {
      yield rightPos;
      continue;
    }
    // WB2: Break at the end of text...
    if (right === WordBreakProperty.eot) {
      assert(rightPos === text.length);
      yield rightPos;
      break; // Reached the end of the string. We're done!
    }
    // WB3: Do not break within CRLF:
    if (left === WordBreakProperty.CR && right === WordBreakProperty.LF) continue;
    // WB3b: Otherwise, break after...
    if (
      left === WordBreakProperty.Newline ||
      left == WordBreakProperty.CR ||
      left === WordBreakProperty.LF
    ) {
      yield rightPos;
      continue;
    }
    // WB3a: ...and before newlines
    if (
      right === WordBreakProperty.Newline ||
      right === WordBreakProperty.CR ||
      right === WordBreakProperty.LF
    ) {
      yield rightPos;
      continue;
    }

    // HACK: advance by TWO positions to handle tricky emoji
    // combining sequences, that SHOULD be kept together by
    // WB3c, but are prematurely split by WB4:
    if (
      left === WordBreakProperty.Other &&
      (right === WordBreakProperty.Extend || right === WordBreakProperty.Format) &&
      lookahead === WordBreakProperty.ZWJ
    ) {
      // To ensure this is not split, advance TWO positions forward.
      for (let i = 0; i < 2; i++) {
        [rightPos, lookaheadPos] = [lookaheadPos, positionAfter(text, lookaheadPos)];
      }
      [left, right, lookahead] = [
        lookahead,
        wordbreakPropertyAt(text, rightPos),
        wordbreakPropertyAt(text, lookaheadPos),
      ];
      // N.B. `left` now MUST be ZWJ, setting it up for WB3c proper.
    }

    // WB3c: Do not break within emoji ZWJ sequences.
    if (left === WordBreakProperty.ZWJ && isExtendedPictographicAt(text, rightPos)) continue;

    // WB3d: Keep horizontal whitespace together
    if (left === WordBreakProperty.WSegSpace && right == WordBreakProperty.WSegSpace) continue;

    // WB4: Ignore format and extend characters
    // This is to keep grapheme clusters together!
    // See: Section 6.2: https://unicode.org/reports/tr29/#Grapheme_Cluster_and_Format_Rules
    // N.B.: The rule about "except after sot, CR, LF, and
    // Newline" already been by WB1, WB2, WB3a, and WB3b above.
    while (
      right === WordBreakProperty.Format ||
      right === WordBreakProperty.Extend ||
      right === WordBreakProperty.ZWJ
    ) {
      // Continue advancing in the string, as if these
      // characters do not exist. DO NOT update left and
      // lookbehind however!
      [rightPos, lookaheadPos] = [lookaheadPos, positionAfter(text, lookaheadPos)];
      [right, lookahead] = [lookahead, wordbreakPropertyAt(text, lookaheadPos)];
    }
    // In ignoring the characters in the previous loop, we could
    // have fallen off the end of the string, so end the loop
    // prematurely if that happens!
    if (right === WordBreakProperty.eot) {
      assert(rightPos === text.length);
      yield rightPos;
      break;
    }
    // WB4 (continued): Lookahead must ALSO ignore these format,
    // extend, ZWJ characters!
    while (
      lookahead === WordBreakProperty.Format ||
      lookahead === WordBreakProperty.Extend ||
      lookahead === WordBreakProperty.ZWJ
    ) {
      // Continue advancing in the string, as if these
      // characters do not exist. DO NOT update left and right,
      // however!
      lookaheadPos = positionAfter(text, lookaheadPos);
      lookahead = wordbreakPropertyAt(text, lookaheadPos);
    }

    // WB5: Do not break between most letters.
    if (isAHLetter(left) && isAHLetter(right)) continue;
    // Do not break across certain punctuation
    // WB6: (Don't break before apostrophes in contractions)
    if (
      isAHLetter(left) &&
      isAHLetter(lookahead) &&
      (right === WordBreakProperty.MidLetter || isMidNumLetQ(right))
    )
      continue;
    // WB7: (Don't break after apostrophes in contractions)
    if (
      isAHLetter(lookbehind) &&
      isAHLetter(right) &&
      (left === WordBreakProperty.MidLetter || isMidNumLetQ(left))
    )
      continue;
    // WB7a
    if (left === WordBreakProperty.Hebrew_Letter && right === WordBreakProperty.Single_Quote)
      continue;
    // WB7b
    if (
      left === WordBreakProperty.Hebrew_Letter &&
      right === WordBreakProperty.Double_Quote &&
      lookahead === WordBreakProperty.Hebrew_Letter
    )
      continue;
    // WB7c
    if (
      lookbehind === WordBreakProperty.Hebrew_Letter &&
      left === WordBreakProperty.Double_Quote &&
      right === WordBreakProperty.Hebrew_Letter
    )
      continue;
    // Do not break within sequences of digits, or digits adjacent to letters.
    // e.g., "3a" or "A3"
    // WB8
    if (left === WordBreakProperty.Numeric && right === WordBreakProperty.Numeric) continue;
    // WB9
    if (isAHLetter(left) && right === WordBreakProperty.Numeric) continue;
    // WB10
    if (left === WordBreakProperty.Numeric && isAHLetter(right)) continue;
    // Do not break within sequences, such as 3.2, 3,456.789
    // WB11
    if (
      lookbehind === WordBreakProperty.Numeric &&
      right === WordBreakProperty.Numeric &&
      (left === WordBreakProperty.MidNum || isMidNumLetQ(left))
    )
      continue;
    // WB12
    if (
      left === WordBreakProperty.Numeric &&
      lookahead === WordBreakProperty.Numeric &&
      (right === WordBreakProperty.MidNum || isMidNumLetQ(right))
    )
      continue;
    // WB13: Do not break between Katakana
    if (left === WordBreakProperty.Katakana && right === WordBreakProperty.Katakana) continue;
    // Do not break from extenders (e.g., U+202F NARROW NO-BREAK SPACE)
    // WB13a
    if (
      (isAHLetter(left) ||
        left === WordBreakProperty.Numeric ||
        left === WordBreakProperty.Katakana ||
        left === WordBreakProperty.ExtendNumLet) &&
      right === WordBreakProperty.ExtendNumLet
    )
      continue;
    // WB13b
    if (
      (isAHLetter(right) ||
        right === WordBreakProperty.Numeric ||
        right === WordBreakProperty.Katakana) &&
      left === WordBreakProperty.ExtendNumLet
    )
      continue;

    // WB15 & WB16:
    // Do not break within emoji flag sequences. That is, do not break between
    // regional indicator (RI) symbols if there is an odd number of RI
    // characters before the break point.
    if (right === WordBreakProperty.Regional_Indicator) {
      // Emoji flags are actually composed of TWO scalar values, each being a
      // "regional indicator". These indicators correspond to Latin letters. Put
      // two of them together, and they spell out an ISO 3166-1-alpha-2 country
      // code. Since these always come in pairs, NEVER split the pairs! So, if
      // we happen to be inside the middle of an odd numbered of
      // Regional_Indicators, DON'T SPLIT IT!
      nConsecutiveRegionalIndicators += 1;
      if (nConsecutiveRegionalIndicators % 2 == 1) {
        continue;
      }
    } else {
      nConsecutiveRegionalIndicators = 0;
    }
    // WB999: Otherwise, break EVERYWHERE (including around ideographs)
    yield rightPos;
  } while (rightPos < text.length);
}

/**
 * Returns the position of the start of the next scalar value. This jumps
 * over surrogate pairs.
 *
 * If asked for the character AFTER the end of the string, this always
 * returns the length of the string.
 */
function positionAfter(text: string, pos: number): number {
  if (pos >= text.length) {
    return text.length;
  } else if (isStartOfSurrogatePair(text[pos])) {
    return pos + 2;
  }
  return pos + 1;
}

/**
 * Return the value of the Word_Break property at the given string index.
 */
function wordbreakPropertyAt(text: string, pos: number) {
  if (pos < 0) {
    return WordBreakProperty.sot; // Always "start of string" before the string starts!
  } else if (pos >= text.length) {
    return WordBreakProperty.eot; // Always "end of string" after the string ends!
  } else if (isStartOfSurrogatePair(text[pos])) {
    // Surrogate pairs the next TWO items from the string!
    return property(text[pos] + text[pos + 1]);
  }
  return property(text[pos]);
}

function isExtendedPictographicAt(text: String, pos: number) {
  return extendedPictographic.test(text.substring(pos, pos + 2));
}

// Word_Break rule macros
// See: https://unicode.org/reports/tr29/#WB_Rule_Macros
function isAHLetter(prop: WordBreakProperty): boolean {
  return prop === WordBreakProperty.ALetter || prop === WordBreakProperty.Hebrew_Letter;
}

function isMidNumLetQ(prop: WordBreakProperty): boolean {
  return prop === WordBreakProperty.MidNumLet || prop === WordBreakProperty.Single_Quote;
}

function isStartOfSurrogatePair(character: string) {
  let codeUnit = character.charCodeAt(0);
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff;
}

/**
 * Return the Word_Break property value for a character.
 * Note that
 * @param character a scalar value
 */
export function property(character: string): WordBreakProperty {
  // This MUST be a scalar value.
  assert(character.length === 1 || character.length === 2);

  if (character == "\u000A") return WordBreakProperty.LF;
  if (character == "\u000D") return WordBreakProperty.CR;
  if (character == `"`) return WordBreakProperty.Double_Quote;
  if (character == "'") return WordBreakProperty.Single_Quote;
  if (character == "\u200d") return WordBreakProperty.ZWJ;

  let codepoint = character.codePointAt(0) as number;
  return lookupProperty(codepoint);
}

/**
 * @returns The WordBreakProperty for the given code point.
 */
function lookupProperty(codepoint: number): WordBreakProperty {
  // This uses the dense lookup table to find the property.  Each word in the
  // table contains the properties for six contiguous code points.  A word in
  // the lookup table looks like this:
  //
  //   |    | 29–25 | 24–20 | 19–15 | 15–10 | 9 – 5 | 4 – 0 |
  //   | 00 |  w[5] |  w[4] |  w[3] |  w[2] |  w[1] |  w[0] |
  //
  // Where w[i] is the word break property for the i-th code point in the word.
  // Unfortunately, we don't ACTUALLY have the array w[0]...w[5], but we can
  // use bitwise operations to shift it out!
  //
  // To find the word that contains the property for a given code point, we divide
  // the code point by 6 (the number of code points per word), then use the
  // remainder as the index WITHIN the word to find the property.  To access the
  // i-th property, we left shift the word by i * 5 bits and mask off the lower
  // 5 bits.

  const wordIndex = codepoint >> 3;
  const i = codepoint & 0b111;
  const word = DENSE_LOOKUP[wordIndex];
  return (word >> (i * BITS_PER_WORD)) & 0xf;

  // For example, say we want to find the word break property for code point U+0388.
  //
  // Dividing by 6 gives us a word index of 0x0388 / 6 = 150.
  // The remainder is 0x0388 % 6 = 4.
  //
  // DENSE_LOOKUP[150] is:
  //
  //   |    | 29–25 | 24–20 | 19–15 | 15–10 | 9 – 5 | 4 – 0 |
  //   | 00 |  w[5] |  w[4] |  w[3] |  w[2] |  w[1] |  w[0] |
  //   | 00 | 01011 | 01011 | 01010 | 01011 | 00000 | 00000 |
  //
  // We want w[4], so we shift the word 4 * 5 = 20 bits to the right:
  //
  //   |    | 29–25 | 24–20 | 19–15 | 15–10 | 9 – 5 | 4 – 0 |
  //   | 00 | 00000 | 00000 | 00000 | 00000 |  w[5] |  w[4] |
  //   | 00 | 00000 | 00000 | 00000 | 00000 | 01011 | 01011 |
  //
  // Then we need to keep ONLY the lower 5 bits, so we bitwise AND with
  // 0b11111:
  //
  //         0101101011
  //      &       11111
  //      -------------
  //      =       01011
  //
  // 0b01011 is our word break property.
}

/**
 * Creates a dense lookup table from the ranges in WORD_BREAK_PROPERTY.
 *
 * The lookup table divides the Unicode code space into 32-bit words, with each
 * containing the word break property for six code points, each represented by 5 bits.
 *
 * As of Unicode 15.1.0, there are 18 distinct word break properties (plus the
 * psuedo-properties sot and eot), meaning that 5 bits are required to represent
 * a single code point.
 *
 * Here's how each 32-bit word is divided:
 *
 *     |    | 29–25 | 24–20 | 19–15 | 15–10 | 9 – 5 | 4 – 0 |
 *     | 00 | fffff | eeeee | ddddd | ccccc | bbbbb | aaaaa |
 *
 * Where:
 *  - aaaaa is the word break property for the first code point in the entry
 *  - bbbbb is the word break property for the second code point in the entry
 *  - ...
 *  - fffff is the word break property for the sixth code point in the entry
 *  - The top 2 bits are unused.
 *
 * See `lookupProperty()` for how to use this table.
 *
 * The result is a Uint32Array with a length of 0x110000 / 6 = 185,686 entries,
 * or 742,744 bytes (just over 726 KiB).
 */
function createLookupTable(): Uint32Array {
  const lut = new Uint32Array(Math.ceil(NUMBER_OF_CODE_POINTS / ENTRIES_PER_WORD));

  let wordIndex = 0;
  let entryIndex = 0;
  let currentWord = 0;

  // Do all but the LAST range:
  for (let i = 0; i < WORD_BREAK_PROPERTY.length - 1; i++) {
    const [start, wbProperty] = WORD_BREAK_PROPERTY[i];
    // Get end from the NEXT entry in WORD_BREAK_PROPERTY
    const end = WORD_BREAK_PROPERTY[i + 1][I.Start];

    for (let codePoint = start; codePoint < end; codePoint++) {
      currentWord |= Math.min(wbProperty, 0xf) << (BITS_PER_WORD * entryIndex);
      entryIndex++;

      if (entryIndex === ENTRIES_PER_WORD) {
        lut[wordIndex] = currentWord;

        // Reset for the next entry:
        currentWord = 0;
        wordIndex++;
        entryIndex = 0;
      }
    }
  }

  // Finish up the last entry.
  if (entryIndex !== 0) {
    lut[wordIndex] = currentWord;
    wordIndex++;
    entryIndex = 0;
  }

  // Uint32Array is initialized to zero, so we don't need to do anything special
  // for the last entry, AS LON AS the last range in WORD_BREAK_PROPERTY is zero
  // ('Other')
  assert(WORD_BREAK_PROPERTY[WORD_BREAK_PROPERTY.length - 1][I.Value] === 0);

  return lut;
}
