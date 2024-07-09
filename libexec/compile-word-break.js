#!/usr/bin/env node

/**
 * Generates the TypeScript file for data required for the word boundary
 * function:
 *
 *  - a sorted array to facilitate binary search of the Word_Break property.
 *  - a regular expression that matches characters that have Extended_Pictographic=Yes.
 *  - a regular expression that matches whether a span is made of solely whitespace
 *
 * For internal use only. Please keep away from children.
 *
 * The generated file is saved to ../src/gen/WordBreakProperty.ts
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const MAX_CODE_POINT = 0x10FFFF;

// Where to get the data:
//  - http://www.unicode.org/reports/tr51/#emoji_data
//  - https://www.unicode.org/reports/tr41/tr41-26.html#Props0

//////////////////////////////////// Main ////////////////////////////////////

const genDirectory = path.join(__dirname, '..', 'src', 'gen');
const generatedFilename = path.join(genDirectory, 'WordBreakProperty.ts');

// Ensure this package's major version number is in sync with the Unicode
// major version.
const packageVersion = require('../package.json').version;
const UNICODE_VERSION = (() => {
  const [major, minor, patch] = packageVersion.split('.')
  return `${major}.${minor}.0`;
})();

// The data files should be in this repository, with names matching the
// Unicode version.
let wordBoundaryFilename = path.join(__dirname, `./WordBreakProperty-${UNICODE_VERSION}.txt.gz`);
let emojiDataFilename = path.join(__dirname, `./emoji-data-${UNICODE_VERSION}.txt.gz`);

///////////////////////////// Word_Boundary file /////////////////////////////

// Extract the ranges IN ASCENDING ORDER from the file.
// This will be the big binary search table.
let ranges = readZippedCharacterPropertyFile(wordBoundaryFilename)
  .sort((a, b) => {
    return a.start - b.start;
  });

// The list of ranges are initially sparse — having gaps between assigned
// ranges. Fill in those gaps:
ranges = makeDense(ranges);
ensureDense(ranges);

// The possible Word_Break property assignments.
let categories = new Set();
for (let {property} of ranges) {
  categories.add(property);
}
// Also add pseudo-categories of start-of-text and end-of-text:
categories.add('sot');
categories.add('eot');

///////////////////////// Extended_Pictographic=Yes //////////////////////////

let extendedPictographicCodePoints = readZippedCharacterPropertyFile(emojiDataFilename)
  .filter(({property}) => property === 'Extended_Pictographic');

// Try generating the regular expression both in a way that is
// backwards-compatbile and one that only works in ES6+.
let extendedPictographicRegExp;
let compatibleRegexp = utf16AlternativesStrategy();
let es6Regexp = unicodeRangeStrategy();

// Choose the shortest regular expression.
// In my experience, the ES6 regexp is an order of magnitude smaller!
if (es6Regexp.length < compatibleRegexp.length) {
  extendedPictographicRegExp = es6Regexp;
  console.warn(`Using ES6 regexp [${es6Regexp.length} chars]`);
} else {
  extendedPictographicRegExp = compatibleRegexp;
  console.warn(`Using compatibility regexp [${compatibleRegexp.length} chars]`);
}

////////////////////////////// Whitespace regex //////////////////////////////
let whitespaceRanges = ranges.filter(
  ({ property }) =>
    property === "CR" ||
    property === "LF" ||
    property === "Newline" ||
    property === "WSegSpace"
);
let whitespaceRegExp = createRegExp(whitespaceRanges);

//////////////////////// Creating the generated file /////////////////////////

// Save the output in the gen/ directory.
let stream = fs.createWriteStream(generatedFilename);

// Generate the file!
stream.write(`// Automatically generated file. DO NOT MODIFY.
/**
 * Valid values for a word break property.
 */
export const enum WordBreakProperty {
${ /* Create enum values for each word break property */
  Array.from(categories)
    .map(x => `  ${x}`)
    .join(',\n')
}
};

export const extendedPictographic = ${extendedPictographicRegExp};
export const IS_WHITE_SPACE = ${whitespaceRegExp};

/**
 * Constants for indexing values in WORD_BREAK_PROPERTY.
 */
export const enum I {
  Start = 0,
  Value = 1
}

export const WORD_BREAK_PROPERTY: [number, WordBreakProperty][] = [
${
    ranges.map(({start, property}) => (`  [` +
      `/*start*/ 0x${start.toString(16).toUpperCase()}, ` +
      `WordBreakProperty.${property}],`
    )).join('\n')
}
];
`);

/**
 * Reads a Unicode character property file.
 *
 * Character property files are composed of comment lines, empty lines, and
 * property lines.  Comments lines begin with '#' and should be ignored, as
 * well as empty lines.
 *
 * Property lines have a code point or a code point range, followed by a
 * semi-colon, followed by the property text. e.g.,
 *
 *    1F600         ; Emoji                #  6.1  [1] (😀)        grinning face
 *    26C4..26C5    ; Emoji_Presentation   #  5.2  [2] (⛄..⛅)    snowman without snow..sun behind butt
 *
 * This will read the file at the given filename, and return an ordered array
 * or property lines, with attributes:
 *
 *  {start: number, end: number, property: string}
 *
 * If the property specifies a single code point (i.e., not a range of code
 * points), then end === start.
 */
function readZippedCharacterPropertyFile(filename) {
  let textContents = zlib.gunzipSync(
    fs.readFileSync(filename)
  ).toString('utf8');

  return textContents.split('\n')
    .filter(line => !line.startsWith('#') && line.trim())
    .map(line => {
      let [_, startText, endText, property] = line.match(
        // Parse lines that look like this:
        // 0000             .. 0000               ;   CategoryName
        /^([0-9A-F]{4,6})(?:..([0-9A-F]{4,6}))?\s+;\s+([A-Za-z_]+)/
      );

      let start = parseCodepoint(startText);
      let end = endText !== undefined ? parseCodepoint(endText) : start;

      return { start, end, property };
    });
}

/**
 * Parses a code point, expressed as a 4 or 6 digit hexadecimal string.
 * Does some bounds checking in order to determine if the string is in fact a
 * valid code point.
 */
function parseCodepoint(hexString) {
  let number = parseInt(hexString, 16);
  if (Number.isNaN(number)) {
    throw new SyntaxError(`Cannot parse codepoint: ${hexString}`);
  }

  if (number < 0 || number > MAX_CODE_POINT) {
    throw new RangeError(`Codepoint out of range: ${number}`);
  }

  return number;
}

function toUnicodeEscape(codePoint) {
  let isBMP = codePoint <= 0xFFFF;
  let simpleConversion = codePoint.toString(16).toUpperCase();

  let padding = (isBMP ? 4 : 6) - simpleConversion.length;
  let digits = '0'.repeat(padding) + simpleConversion;

  if (isBMP) {
    return '\\u' + digits;
  } else {
    return `\\u{${digits}}`;
  }
}

function utf16AlternativesStrategy() {
  let codePoints = [];
  for (let {start, end} of extendedPictographicCodePoints) {
    for (let current = start; current <= end; current ++) {
      codePoints.push(current);
    }
  }

  let alternatives = codePoints.map(codePointToUTF16Escape);
  return `/^(?:${alternatives.join('|')})/`;
}

function createRegExp(ranges) {
  let regexp = "";
  for (let {start, end} of ranges) {
    if (start === end) {
      regexp += toUnicodeEscape(start);
    } else {
      regexp += toUnicodeEscape(start) + "-" + toUnicodeEscape(end);
    }
  }
  return `/^[${regexp}]+$/`;
}

function codePointToUTF16Escape(codePoint) {
  // Scalar values remain the same
  if (codePoint <= 0xFFFF) {
    return toUnicodeEscape(codePoint);
  }

  const LOWEST_TEN_BITS_MASK = 0x03FF;
  let astralBits = codePoint - 0x10000;

  let highSurrogate = 0xD800 + (astralBits >>> 10);
  let lowSurrogate = 0xDC00 + (astralBits & LOWEST_TEN_BITS_MASK);

  console.assert(highSurrogate <= 0xDBFF);
  console.assert(lowSurrogate <= 0xDFFF);
  console.assert(String.fromCharCode(highSurrogate) + String.fromCharCode(lowSurrogate) ===
                 String.fromCodePoint(codePoint));
  return codePointToUTF16Escape(highSurrogate) + codePointToUTF16Escape(lowSurrogate);
}

function unicodeRangeStrategy() {
  let regexp = '';
  for (let {start, end} of extendedPictographicCodePoints) {
    if (start === end) {
      regexp += toUnicodeEscape(start);
    } else {
      regexp += toUnicodeEscape(start) + '-' + toUnicodeEscape(end);
    }
  }
  return `/^[${regexp}]/u`;
}

function makeDense(ranges) {
  return joinSameAdjacentProperties(fillInGaps(ranges));
}

function ensureDense(ranges) {
  let lastEnd = -1;
  let lastProperty = 'sot';
  for (let range of ranges) {
    let {start, end, property} = range

    if (lastEnd + 1 !== start) {
      throw new Error(`Non-adjacent range: ${JSON.stringify(range)}`);
    }

    if (lastProperty === property) {
      throw new Error(`adjacent ranges have same property: ${JSON.stringify(range)}`);
    }

    lastEnd = end;
    lastProperty = property;
  }
}


function joinSameAdjacentProperties(ranges) {
  console.assert(ranges.length > 1);

  let conjoinedRanges = [];
  conjoinedRanges.push(ranges.shift());

  for (let range of ranges) {
    let lastRange = conjoinedRanges[conjoinedRanges.length - 1];
    if (range.property === lastRange.property) {
      lastRange.end = range.end;
    } else {
      conjoinedRanges.push(range);
    }
  }

  return conjoinedRanges;
}

function fillInGaps(ranges) {
  console.assert(ranges.length > 1);

  let denseRanges = [];
  let nextUnaccountedCodepoint = 0x0000;

  for (let range of ranges) {
    if (range.start > nextUnaccountedCodepoint) {
      // Need to create a range BEFORE the next start of ranges
      denseRanges.push({
        start: nextUnaccountedCodepoint,
        end: range.start - 1,
        // If it's unassigned in the file, it should be 'Other'.
        property: 'Other',
      });
    }

    denseRanges.push(range);
    nextUnaccountedCodepoint = range.end + 1;
  }

  // Create the last range (till the end)
  if (nextUnaccountedCodepoint < MAX_CODE_POINT) {
    denseRanges.push({
      start: nextUnaccountedCodepoint,
      end: MAX_CODE_POINT,
      property: 'Other',
    })
  }

  return denseRanges;
}
