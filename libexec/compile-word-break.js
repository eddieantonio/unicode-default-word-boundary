/**
 * Generates the TypeScript file for the binary search array data structure.
 * For internal use only. Please keep away from children.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Keep package major version number synced with the Unicode major version.
const packageVersion = require('../package.json').version;
const UNICODE_VERSION = packageVersion.split('.')[0] + '.0.0';
let wordBoundaryFilename = path.join(__dirname, `./WordBreakProperty-${UNICODE_VERSION}.txt.gz`);

let wordBoundaryFile = zlib.gunzipSync(
  fs.readFileSync(wordBoundaryFilename)
).toString('utf8');

// The possible Word_Break property assignments.
// If it's unassigned in the file, it should be 'other'.
let categories = new Set(['Other']);

// Extract the ranges IN ASCENDING ORDER from the file.
// This will be the big binary search table.
let ranges = wordBoundaryFile.split('\n')
  .filter(line => !line.startsWith('#') && line.trim())
  .map(line => {
    let [_, startText, endText, category] = line.match(
      // Parse lines that look like this:
      // 0000             .. 0000               ;   CategoryName
      /^([0-9A-F]{4,6})(?:..([0-9A-F]{4,6}))?\s+;\s+([A-Za-z_]+)/
    );

    let start = parseCodepoint(startText);
    let end = endText !== undefined ? parseCodepoint(endText) : start;

    categories.add(category);

    return { start, end, category };
  })
  .sort((a, b) => {
    return a.start - b.start;
  });

// Generate the file!
process.stdout.write(`// Automatically generated file. DO NOT MODIFY.
/**
 * Valid values for a word break property.
 */
export type WordBreakProperty =
${
  Array.from(categories).map(x => `  '${x}'`).join(' |\n')
};

interface WordBreakRange {
  start: number; 
  end: number;
  value: WordBreakProperty;
}

export const WORD_BREAK_PROPERTY = [
${
    ranges.map(({start, end, category}) =>(
    `  {start: 0x${start.toString(16).toUpperCase()}, end: 0x${end.toString(16).toUpperCase()}, value: '${category}'},`
    )).join('\n')
}
];
`);

function parseCodepoint(hexString) {
  let number = parseInt(hexString, 16);
  if (Number.isNaN(number)) {
    throw new SyntaxError(`Cannot parse codepoint: ${hexString}`);
  }

  if (number < 0 || number > 0x10FFFF) {
    throw new RangeError(`Codepoint out of range: ${number}`);
  }

  return number;
}
