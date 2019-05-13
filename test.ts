import test from 'ava';

import {splitWords} from './';


test('empty', wordBoundaryRule, '', []);

test('WB8', wordBoundaryRule, '42', ['42']);
test('WB9', wordBoundaryRule, '3a',  ['3a']);
test('WB10', wordBoundaryRule, 'A3',  ['A3']);

/** Macro to test a word boundary rule. */
function wordBoundaryRule(t, input: string, expected: string[]) {
  t.deepEqual(splitWords(input), expected);
}