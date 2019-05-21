import test, { Macro } from 'ava';
import { split, findSpans } from '../src';

// Macros
const splitExample: Macro<[string, string[]]> = (t, input, output) => {
  t.deepEqual(split(input), output);
};
splitExample.title = (providedTitle = '', input, _expected) =>
  `split(\`${input}\`)`;


// Tests

// English pangram
test(splitExample, 'The quick (“brown”) fox can’t jump 32.3 feet, right?', [
  'The', 'quick', '(', '“', 'brown', '”', ')', 'fox', 'can’t', 'jump', '32.3', 'feet', ',', 'right', '?'
]);

// Russian pangram
test(splitExample, `В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!`, [
  'В', 'чащах', 'юга', 'жил', 'бы', 'цитрус', '?', 'Да', ',', 'но', 'фальшивый', 'экземпляр', '!'
]);

// TODO: Hebrew example... I don't want to insert RTL text here...

// Plains Cree example
test(splitExample, `ᑕᐻ ᒥᔪ ᑭᓯᑲᐤ ᐊᓄᐦᐨ᙮`, [
  'ᑕᐻ', 'ᒥᔪ ᑭᓯᑲᐤ', 'ᐊᓄᐦᐨ', '᙮'
]);

test('findSpan() example', t => {
  let answer= Array.from(findSpans("Hello, world🌎!"))
  // Coerce to a plain JavaScript objects.
    .map(o => {
      return {
        start: o.start,
        end: o.end,
        length: o.length,
        text: o.text
      };
    });
  t.deepEqual(answer, [
    { start: 0, end: 5, length: 5, text: 'Hello' },
    { start: 5, end: 6, length: 1, text: ',' },
    { start: 6, end: 7, length: 1, text: ' ' },
    { start: 7, end: 12, length: 5, text: 'world' },
    { start: 12, end: 14, length: 2, text: '🌎' },
    { start: 14, end: 15, length: 1, text: '!' }
  ]);
});
