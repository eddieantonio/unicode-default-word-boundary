#!/usr/bin/env node

/**
 * Generates the TypeScript file for the binary search array data structure of
 * the Word_Break property.
 *
 * For internal use only. Please keep away from children.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const MAX_CODE_POINT = 0x10FFFF;

//////////////////////////////////// Main ////////////////////////////////////

// Ensure this package's major version number is in sync with the Unicode
// major version.
const packageVersion = require('../package.json').version;
const UNICODE_VERSION = packageVersion.split('.')[0] + '.0.0';

// The data files should be in this repository, with names matching the
// Unicode version.
let wordBoundaryFilename = path.join(__dirname, `./WordBreakProperty-${UNICODE_VERSION}.txt.gz`);
let emojiDataFilename = path.join(__dirname, `./emoji-data-${UNICODE_VERSION}.txt.gz`);

let wordBoundaryFile = zlib.gunzipSync(
  fs.readFileSync(wordBoundaryFilename)
).toString('utf8');

// Extract the ranges IN ASCENDING ORDER from the file.
// This will be the big binary search table.
let ranges = readZippedCharacterPropertyFile(wordBoundaryFilename)
  .sort((a, b) => {
    return a.start - b.start;
  });

// The possible Word_Break property assignments.
// If it's unassigned in the file, it should be 'other'.
let categories = new Set(['Other']);
for (let {property} of ranges) {
  categories.add(property);
}
// Also add pseudo-categories of start-of-text and end-of-text:
categories.add('sot');
categories.add('eot');

// Save the output in the gen directory.
let stream = fs.createWriteStream(
  path.join(__dirname, '..', 'gen', 'WordBreakProperty.ts')
);

// Generate the file!
stream.write(`// Automatically generated file. DO NOT MODIFY.
/**
 * Valid values for a word break property.
 */
export type WordBreakProperty =
${
  Array.from(categories).map(x => `  '${x}'`).join(' |\n')
};

export interface WordBreakRange {
  start: number;
  end: number;
  value: WordBreakProperty;
}

export const WORD_BREAK_PROPERTY: WordBreakRange[] = [
${
    ranges.map(({start, end, property}) =>(
    `  {start: 0x${start.toString(16).toUpperCase()}, end: 0x${end.toString(16).toUpperCase()}, value: '${property}'},`
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
