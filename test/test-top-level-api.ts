import test from 'ava';

import {split, findSpans} from '../';

// Sanity checks for the top-level API.

const example = 'Hi! 👋🏽 I am エラー!'
const exampleSpans = [
    { start:  0, end:  2, length: 2, text: 'Hi' },
    { start:  2, end:  3, length: 1, text: '!' },
    { start:  3, end:  4, length: 1, text: ' '},
    { start:  4, end:  8, length: 4, text: '👋🏽'},
    { start:  8, end:  9, length: 1, text: ' '},
    { start:  9, end: 10, length: 1, text: 'I'},
    { start: 10, end: 11, length: 1, text: ' '},
    { start: 11, end: 13, length: 2, text: 'am'},
    { start: 13, end: 14, length: 1, text: ' '},
    { start: 14, end: 17, length: 3, text: 'エラー'},
    { start: 17, end: 18, length: 1, text: '!'},
];

test('split()', t => {
  t.deepEqual(split(example), [
    'Hi', '!', '👋🏽', 'I', 'am', 'エラー', '!',
  ]);
});

test('findSpans()', t => {
  t.plan(4 * exampleSpans.length);
  let count = 0;
  for (let {start, end, length, text} of findSpans(example)) {
    t.is(start, exampleSpans[count].start);
    t.is(end, exampleSpans[count].end);
    t.is(text, exampleSpans[count].text);
    t.is(length, exampleSpans[count].length);
    count++;
  }
});