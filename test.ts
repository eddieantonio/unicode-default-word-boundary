import test from 'ava';

import {splitWords} from './';


test('WB1 & WB2', wordBoundaryRule, '', []);
test('WB3', wordBoundaryRule, 'a\r\nb', ['a', 'b']);
test('WB3a', wordBoundaryRule, '\na', ['a']);
test('WB3b', wordBoundaryRule, 'a\n', ['a']);
test('WB8', wordBoundaryRule, '42', ['42']);
test('WB9', wordBoundaryRule, '3a',  ['3a']);
test('WB10', wordBoundaryRule, 'A3',  ['A3']);

/** Macro to test a word boundary rule. */
function wordBoundaryRule(t, input: string, expected: string[]) {
  t.deepEqual(splitWords(input), expected);
}