import test, { Macro } from 'ava';
import { split } from '../src';

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
