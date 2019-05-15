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

// See: https://unicode.org/reports/tr29/#Default_Word_Boundaries

import {WordBreakProperty, WORD_BREAK_PROPERTY} from '../gen/WordBreakProperty';

/**
 * Splits text by its word breaks. Any chunks that are just whitespace will not
 * be returned.
 *
 * @param text Any valid USVString.
 */
export function split(text: string): string[] {
  let spans = Array.from(findSpans(text));
  return spans.map(span => span.text).filter(isNonSpace);
}

/**
 * A span of text that is guarenteed to be between two word boundaries. There
 * can be no boundaries bisecting this span -- i.e., this span is indivisible,
 * as far as word boundaries are concerned.
 * 
 * If you're familiar with the concept of *basic block* from compiler
 * construction and static program analysis, this is a similar concept.
 */
export interface BasicSpan {
  // invariant: start < end
  readonly start: number;
  // invariant: end > start
  readonly end: number;
  // invariant: length > 0
  // invariant: length === end - start
  readonly length: number;
  // invariant: text.length === length
  // invariant: each character is a BMP UTF-16 code unit, or is a high surrogate
  // UTF-16 code unit followed by a low surrogate code unit.
  readonly text: string;
}

// Internal functions

function* findSpans(text: string): Iterable<BasicSpan> {
  // TODO: don't throw the boundaries into an array.
  let boundaries = Array.from(findBoundaries(text));
  
  if (boundaries.length == 0) {
    return;
  }

  // All non-empty strings have at least TWO boundaries at the start and end of
  // the string.
  console.assert(boundaries.length >= 2);
  
  for (let i = 0; i < boundaries.length - 1; i++) {
    let start = boundaries[i];
    let end = boundaries[i + 1];
    yield new LazySpan(text, start, end);
  }
}
  
/**
 * A span that does not cut out the substring until it absolutely has to!
 */
class LazySpan implements BasicSpan {
  private _source: string;
  readonly start: number;
  readonly end: number;
  constructor(source: string, start: number, end: number) {
    this._source = source;
    this.start = start;
    this.end = end;
  }

  get text(): string {
    return this._source.substring(this.start, this.end);
  }

  get length(): number {
    return this.end - this.start;
  }
}

/**
 * Return an array of string indicies where a word break should occur. That is,
 * there should be a break BEFORE each index returned.
 */
function* findBoundaries(text: string): Iterable<number> {
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

  do {
    // Shift all positions, one scalar value to the right.
    rightPos = lookaheadPos;
    lookaheadPos = positionAfter(lookaheadPos);
    // Shift all properties.
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
      break; // we're done!
    }

    // WB3: Do not break within CRLF:
    if (left === 'CR' && right === 'LF')
      continue;

    // WB3b: Otherwise, break after...
    if (left === 'Newline' || left == 'CR' || left === 'LF')  {
      yield rightPos;
      continue;
    }
    // WB3a: ...and before newlines
    if (right === 'Newline' || right === 'CR' || right === 'LF') {
      yield rightPos;
      continue;
    }

    // TODO: WB3c: ZWJ × \p{Extended_Pictographic}
    // TODO: test for this.
    
    // WB3d: Keep horizontal whitespace together
    if (left === 'WSegSpace' && right == 'WSegSpace')
      continue;

    // WB4: Ignore format and extend characters, except after sot, CR, LF, and Newline.
    // See: Section 6.2: https://unicode.org/reports/tr29/#Grapheme_Cluster_and_Format_Rules
    // This also has the effect of: Any × (Format | Extend | ZWJ)
    // Handled by skipToNext() and skipTwice()

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
    /*
    // WB7a
    if (left === 'Hebrew_Letter' && right === 'Single_Quote')
      continue;
    // WB7b
    if (left === 'Hebrew_Letter' && right === 'Double_Quote' &&
        lookahead === 'Hebrew_Letter')
      continue;
    // WB7b
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

    // TODO: WB15 and WB16: Do not break between an odd number of regional flag indicators.
    */

    // WB999: Otherwise, break EVERYWHERE (including around ideographs)
    yield rightPos;

  } while (rightPos < text.length);


  // Utility functions:

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
    } else if (isStartOfSurrogatePair(text[pos])) {
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
    } else if (pos >= text.length) {
      return 'eot'; // Always "end of string" after the string ends!
    } else if (isStartOfSurrogatePair(text[pos])) {
      // Surrogate pairs the next TWO items from the string!
      return property(text[pos] + text[pos + 1]);
    }
    return property(text[pos]);
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
function property(character: string): WordBreakProperty {
  // This MUST be a scalar value.
  console.assert(character.length === 1 || character.length === 2);
  // TODO: remove dependence on character.codepointAt()?
  let codepoint = character.codePointAt(0) as number;
  return searchForProperty(codepoint, 0, WORD_BREAK_PROPERTY.length);
}

// See: https://github.com/eddieantonio/ocreval/blob/master/src/word.c
// See: https://github.com/eddieantonio/ocreval/blob/master/libexec/generate_word_break.py
// See: https://github.com/eddieantonio/ocreval/blob/master/src/word_break_property.h

function searchForProperty(codepoint: number, left: number, right: number): WordBreakProperty {
  // All items that are not found in the array are assigned the 'Other' property.
  if (right < left) {
    return 'Other';
  }

  let midpoint = left + ~~((right - left) / 2);
  let candidate = WORD_BREAK_PROPERTY[midpoint];

  if (codepoint < candidate.start) {
    return searchForProperty(codepoint, left, midpoint - 1);
  } else if (codepoint > candidate.end) {
    return searchForProperty(codepoint, midpoint + 1, right);
  } else {
    // We found it!
    console.assert(candidate.start <= codepoint);
    console.assert(codepoint <= candidate.end);
    return candidate.value;
  }
}

// Word_Break rule macros
// See: https://unicode.org/reports/tr29/#WB_Rule_Macros
function isAHLetter(prop: WordBreakProperty): boolean {
  return prop === 'ALetter' || prop === 'Hebrew_Letter';
}

function isMidNumLetQ(prop: WordBreakProperty): boolean {
  return prop === 'MidNumLet' || prop === 'Single_Quote';
}

/*
function isExtendOrFormat(prop: WordBreakProperty): boolean {
  return prop === 'Extend' || prop === 'Format';
}
*/

/**
 * Returns true when the chunk does not solely consiste of whitespace.
 * 
 * @param chunk a chunk of text. Starts and ends at word boundaries.
 */
function isNonSpace(chunk: string): boolean {
  return !Array.from(chunk).map(property).every(wb => (
    wb === 'CR' || wb === 'LF' || wb === 'Newline' || wb === 'WSegSpace'
  ));
}