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

import {WordBreakProperty, WORD_BREAK_PROPERTY} from './gen/WordBreakProperty';

export function splitWords(text: string): string[] {
  let boundaries = findBoundaries(text);
  let words = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    words.push(
      text.substr(boundaries[i], boundaries[i + 1])
    );
  }

  return words;
}

// Internal functions

function findBoundaries(text: string): number[] {
  // WB1 and WB2: no boundaries if given an empty string.
  if (text.length === 0) {
    return [];
  }

  let left: WordBreakProperty = 'sot';
  let right: WordBreakProperty;
  let lookahead: WordBreakProperty;
  let lookbehind: WordBreakProperty;

  // WB1: Break at the start of text
  let boundaries = [0];
  
  let codepoints = Array.from(text);
  let len = codepoints.length;

  // Now, let's find the next break!
  let pos = 0;
  while (pos < codepoints.length) {
    // This function will ALWAYS increment `pos`,
    // hence the while loop will eventually 
    determineNextBreak();
  }

  /// XXX: THERE WILL BE ISSUES WITH NON-BMP CODE POINTS!

  function determineNextBreak() {
    // Advance the position!!
    pos = skipToNext(pos);
    lookbehind = left;
    left = property(codepoints[pos]);
    right = property(codepoints[skipToNext(pos)]);
    lookahead = property(codepoints[skipTwice(pos)])

    // WB3: Do not break within CRLF:
    if (left === 'CR' && right === 'LF')
      return;

    // WB3b: Otherwise, break before...
    if (right === 'Newline' || right == 'CR' || right === 'LF') 
      return breakHere();
    // WB3a: ...and after newlines
    if (left === 'Newline' || left === 'CR' || left === 'LF') 
      return breakHere();
    
    // TODO: WB3c: ZWJ × \p{Extended_Pictographic}
    // TODO: test for this.
    
    // WB3d: Keep horizontal whitespace together
    if (left === 'WSegSpace' && right == 'WSegSpace')
      return;

    // WB4: Ignore format and extend characters, except after sot, CR, LF, and Newline.
    // See: Section 6.2: https://unicode.org/reports/tr29/#Grapheme_Cluster_and_Format_Rules
    // This also has the effect of: Any × (Format | Extend | ZWJ)
    // Handled by skipToNext() and skipTwice()

    // WB5: Do not break between most letters.
    if (isAHLetter(left) && isAHLetter(right))
      return;

    // Do not break across certain punctuation
    // WB6: (Don't break before appostrophies in contractions)
    if (isAHLetter(left) && isAHLetter(lookahead) &&
        (right === 'MidLetter' || isMidNumLetQ(right)))
      return;
    // WB7: (Don't break after appostrophies in contractions)
    if (isAHLetter(lookbehind) && isAHLetter(right) &&
        (left === 'MidLetter' || isMidNumLetQ(left)))
      return;
    // WB7a
    if (left === 'Hebrew_Letter' && right === 'Single_Quote')
      return;
    // WB7b
    if (left === 'Hebrew_Letter' && right === 'Double_Quote' &&
        lookahead === 'Hebrew_Letter')
      return;
    // WB7b
    if (lookbehind === 'Hebrew_Letter' && left === 'Double_Quote' &&
        right === 'Hebrew_Letter')
      return;
    
    // Do not break within sequences of digits, or digits adjacent to letters.
    // e.g., "3a" or "A3"
  }

  // XXX: TEMP: will be handled by rule above.
  boundaries.push(text.length);

  return boundaries;

  // Macro to push the current position as a word break position.
  function breakHere() {
    boundaries.push(pos);
  }

  /**
   * WB4: Returns the next character, skipping Extend and Format characters.
   */
  function skipToNext(pos: number) {
    // WB4: Skip over Extend and Format Characters.
    if (pos >= len)
      return len;
    
    do {
      pos++;
    } while (
      codepoints[pos] !== undefined &&
      isExtendOrFormat(property(codepoints[pos]))
    );
  }

  function skipTwice(pos) {
    return skipToNext(skipToNext(pos));
  }
}

/**
 * Return the Word_Break property value for a character.
 * Note that 
 * @param character 
 */
function property(character: string | undefined): WordBreakProperty {
  // Assume that undefined means we've gone off the end of the array.
  if (character === undefined)
    return 'eot';

  let codepoint = character.codePointAt(0);
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

function isExtendOrFormat(prop: WordBreakProperty): boolean {
  return prop === 'Extend' || prop === 'Format';
}