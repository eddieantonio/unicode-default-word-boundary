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

import { findBoundaries, property } from './findBoundaries';
import { WordBreakProperty } from './gen/WordBreakProperty';

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

/**
 * Splits text by its word breaks. Any spans that are composed entirely of
 * whitespace will not be returned. Returns an array of strings.
 *
 * @param text Any valid USVString with words to split.
 */
export function split(text: string): string[] {
  const spans: string[] = [];
  
  const boundaries = findBoundaries(text)
  let prev = boundaries.next().value;
  if(prev === undefined) return [];
  for (const boundary of boundaries) {
    let span = text.substring(prev, boundary);
    prev = boundary;
    if(isNonSpace(span)) spans.push(span);
  }
  return spans;
}

/**
 * Generator that yields every successive span from the the text.
 * @param text Any valid USVString to segment.
 */
export function* findSpans(text: string): IterableIterator<BasicSpan> {
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
 * Returns true when the chunk does not solely consiste of whitespace.
 *
 * @param chunk a chunk of text. Starts and ends at word boundaries.
 */
function isNonSpace(chunk: string): boolean {
  return !Array.from(chunk).map(property).every(wb => (
    wb === WordBreakProperty.CR ||
    wb === WordBreakProperty.LF ||
    wb === WordBreakProperty.Newline ||
    wb === WordBreakProperty.WSegSpace
  ));
}
