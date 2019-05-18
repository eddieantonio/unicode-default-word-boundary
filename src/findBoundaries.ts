/*!
 * Copyright (c) 2019 Eddie Antonio Santos
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

import { WordBreakProperty, WORD_BREAK_PROPERTY, extendedPictographic } from './gen/WordBreakProperty';

/**
 * Return an array of string indicies where a word break should occur. That is,
 * there should be a break BEFORE each index returned.
 */
export function* findBoundaries(text: string): Iterable<number> {
  // WB1 and WB2: no boundaries if given an empty string.
  if (text.length === 0) {
    // There are no boundaries in an empty string.
    return;
  }
  // TODO: rewrite this code where property(char[pos]) == property(right)
  // use a simple while loop, AND advance CODE UNIT BY CODE UNIT (account for
  // surrogate pairs here directly).
  // TODO: Explicitly keep track of the parity of regional flag indicators in order
  // to implement WB15 at all (requires even number of regional flag indicators).
  // TODO: Rewrite this to handle WB4 properly...
  // Maintain a sliding window of four SCALAR VALUES.
  //
  //  - Scalar values? JavaScript strings are not actually a string of 
  //    Unicode code points; some characters are made up of TWO JavaScript indices.
  //    e.g., "💩".length === 2, "💩"[0] === '\uXXXX',   "💩"[1] === '\uXXXX'
  //    Since we don't want to be in the "middle" of a character, make sure
  //    we're always advancing by scalar values, and not indices.
  //  - Four values? Some rules look at what's left of left, and some look at
  //    what's right of right. So keep track of this!
  //let lookbehind_pos = -2; // lookbehind, one scalar value left of left
  //let left_pos = -1;
  let rightPos;
  let lookaheadPos = 0; // lookahead, one scalar value right of right.
  // Before the start of the string is also the start of the string. This doesn't matter much!
  let lookbehind: WordBreakProperty;
  let left: WordBreakProperty = 'sot';
  let right: WordBreakProperty = 'sot';
  let lookahead: WordBreakProperty = wordbreakPropertyAt(0);
  // To make sure we're not splitting emoji flags:
  let consecutiveRegionalIndicators = 0;
  while ( /* N.B., breaks at rule WB2. */true) {
    // Shift all positions, one scalar value to the right.
    rightPos = lookaheadPos;
    lookaheadPos = positionAfter(lookaheadPos);
    // Shift all properties, one scalar value to the right.
    [lookbehind, left, right, lookahead] =
      [left, right, lookahead, wordbreakPropertyAt(lookaheadPos)];

    // Break at the start and end of text, unless the text is empty.
    // WB1: Break at start of text...
    if (left === 'sot') {
      yield rightPos;
      continue;
    }
    // WB2: Break at the end of text...
    if (right === 'eot') {
      console.assert(rightPos === text.length);
      yield rightPos;
      break; // Reached the end of the string. We're done!
    }
    // WB3: Do not break within CRLF:
    if (left === 'CR' && right === 'LF')
      continue;
    // WB3b: Otherwise, break after...
    if (left === 'Newline' || left == 'CR' || left === 'LF') {
      yield rightPos;
      continue;
    }
    // WB3a: ...and before newlines
    if (right === 'Newline' || right === 'CR' || right === 'LF') {
      yield rightPos;
      continue;
    }
    // WB3c: Do not break within emoji ZWJ sequences.
    // XXX: This will never be run on some sequences,
    // since we jump over ZWJ sequences later :c
    if (left === 'ZWJ' && isExtendedPictographicAt(rightPos)) {
      continue;
    }
    // WB3d: Keep horizontal whitespace together
    if (left === 'WSegSpace' && right == 'WSegSpace')
      continue;
    // WB4: Ignore format and extend characters, except after sot, CR, LF, and Newline.
    // See: Section 6.2: https://unicode.org/reports/tr29/#Grapheme_Cluster_and_Format_Rules
    // This is to keep grapheme clusters together!
    // N.B.: The exception has already been handled above!
    while (right === 'Format' || right === 'Extend' || right === 'ZWJ') {
      // Continue advancing in the string, as if these characters do not exist.
      // DO NOT update left and right, however!
      [rightPos, lookaheadPos] = [lookaheadPos, positionAfter(lookaheadPos)];
      [right, lookahead] = [lookahead, wordbreakPropertyAt(lookaheadPos)];
    }
    // In ignoring the characters in the previous loop, we could have fallen of
    // the end of the string, so end the loop prematurely if that happens!
    if (right === 'eot') {
      console.assert(rightPos === text.length);
      yield rightPos;
      break;
    }
    // WB4 (continued): Lookahead must ALSO ignore these format, extend, zwj characters!
    while (lookahead === 'Format' || lookahead === 'Extend' || lookahead === 'ZWJ') {
      // Continue advancing in the string, as if these characters do not exist.
      // DO NOT update left and right, however!
      lookaheadPos = positionAfter(lookaheadPos);
      lookahead = wordbreakPropertyAt(lookaheadPos);
    }
    // WB5: Do not break between most letters.
    if (isAHLetter(left) && isAHLetter(right))
      continue;
    // Do not break across certain punctuation
    // WB6: (Don't break before appostrophies in contractions)
    if (isAHLetter(left) && isAHLetter(lookahead) &&
      (right === 'MidLetter' || isMidNumLetQ(right)))
      continue;
    // WB7: (Don't break after appostrophies in contractions)
    if (isAHLetter(lookbehind) && isAHLetter(right) &&
      (left === 'MidLetter' || isMidNumLetQ(left)))
      continue;
    // WB7a
    if (left === 'Hebrew_Letter' && right === 'Single_Quote')
      continue;
    // WB7b
    if (left === 'Hebrew_Letter' && right === 'Double_Quote' &&
      lookahead === 'Hebrew_Letter')
      continue;
    // WB7c
    if (lookbehind === 'Hebrew_Letter' && left === 'Double_Quote' &&
      right === 'Hebrew_Letter')
      continue;
    // Do not break within sequences of digits, or digits adjacent to letters.
    // e.g., "3a" or "A3"
    // WB8
    if (left === 'Numeric' && right === 'Numeric')
      continue;
    // WB9
    if (isAHLetter(left) && right === 'Numeric')
      continue;
    // WB10
    if (left === 'Numeric' && isAHLetter(right))
      continue;
    // Do not break within sequences, such as 3.2, 3,456.789
    // WB11
    if (lookbehind === 'Numeric' && right === 'Numeric' &&
      (left === 'MidNum' || isMidNumLetQ(left)))
      continue;
    // WB12
    if (left === 'Numeric' && lookahead === 'Numeric' &&
      (right === 'MidNum' || isMidNumLetQ(right)))
      continue;
    // WB13: Do not break between Katakana
    if (left === 'Katakana' && right === 'Katakana')
      continue;
    // Do not break from extenders (e.g., U+202F NARROW NO-BREAK SPACE)
    // WB13a
    if ((isAHLetter(left) ||
      left === 'Numeric' ||
      left === 'Katakana' ||
      left === 'ExtendNumLet') && right === 'ExtendNumLet')
      continue;
    // WB13b
    if ((isAHLetter(right) ||
      right === 'Numeric' ||
      right === 'Katakana') && left === 'ExtendNumLet')
      continue;
    // WB15 & WB16:
    // Do not break within emoji flag sequences. That is, do not break between
    // regional indicator (RI) symbols if there is an odd number of RI
    // characters before the break point.
    if (right === 'Regional_Indicator') {
      // Emoji flags are actually composed of two code points, each being a
      // "regional indicator". These indicators coorespond to Latin letters. Put
      // two of them together, and they spell out an ISO 3166-1-alpha-2 country
      // code. Since these always come in pairs, NEVER split the pairs! So, if
      // we happen to be inside the middle of an odd numbered of
      // Regional_Indicators, DON'T SPLIT!
      consecutiveRegionalIndicators += 1;
      if ((consecutiveRegionalIndicators % 2) == 1)
        continue;
    }
    else {
      consecutiveRegionalIndicators = 0;
    }
    // WB999: Otherwise, break EVERYWHERE (including around ideographs)
    yield rightPos;
  }
  return;

  ///// Internal utility functions /////

  /**
   * Returns the position of the start of the next scalar value. This jumps
   * over surrogate pairs.
   *
   * If asked for the character AFTER the end of the string, this always
   * returns the length of the string.
   */
  function positionAfter(pos: number): number {
    if (pos >= text.length) {
      return text.length;
    }
    else if (isStartOfSurrogatePair(text[pos])) {
      return pos + 2;
    }
    return pos + 1;
  }

  /**
   * Return the value of the Word_Break property at the given string index.
   * @param pos position in the text.
   */
  function wordbreakPropertyAt(pos: number) {
    if (pos < 0) {
      return 'sot'; // Always "start of string" before the string starts!
    }
    else if (pos >= text.length) {
      return 'eot'; // Always "end of string" after the string ends!
    }
    else if (isStartOfSurrogatePair(text[pos])) {
      // Surrogate pairs the next TWO items from the string!
      return property(text[pos] + text[pos + 1]);
    }
    return property(text[pos]);
  }

  function isExtendedPictographicAt(pos: number) {
    return extendedPictographic.test(text.substring(pos, pos + 2));
  }

  // Word_Break rule macros
  // See: https://unicode.org/reports/tr29/#WB_Rule_Macros
  function isAHLetter(prop: WordBreakProperty): boolean {
    return prop === 'ALetter' || prop === 'Hebrew_Letter';
  }

  function isMidNumLetQ(prop: WordBreakProperty): boolean {
    return prop === 'MidNumLet' || prop === 'Single_Quote';
  }
}

function isStartOfSurrogatePair(character: string) {
  let code_unit = character.charCodeAt(0);
  return code_unit >= 0xD800 && code_unit <= 0xDBFF;
}

/**
 * Return the Word_Break property value for a character.
 * Note that
 * @param character a scalar value
 */
export function property(character: string): WordBreakProperty {
  // This MUST be a scalar value.
  console.assert(character.length === 1 || character.length === 2);
  // TODO: remove dependence on character.codepointAt()?
  let codepoint = character.codePointAt(0) as number;
  return searchForProperty(codepoint, 0, WORD_BREAK_PROPERTY.length);
}

function searchForProperty(codepoint: number, left: number, right: number): WordBreakProperty {
  // All items that are not found in the array are assigned the 'Other' property.
  if (right < left) {
    return 'Other';
  }
  let midpoint = left + ~~((right - left) / 2);
  let candidate = WORD_BREAK_PROPERTY[midpoint];
  if (codepoint < candidate.start) {
    return searchForProperty(codepoint, left, midpoint - 1);
  }
  else if (codepoint > candidate.end) {
    return searchForProperty(codepoint, midpoint + 1, right);
  }
  else {
    // We found it!
    console.assert(candidate.start <= codepoint);
    console.assert(codepoint <= candidate.end);
    return candidate.value;
  }
}
