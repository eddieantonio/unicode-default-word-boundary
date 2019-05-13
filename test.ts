import test from 'ava';

import {splitWords} from './';

// I'm avoiding placing hebrew and latin punctionation, because
const ALEPH = 'א';

test('WB1 & WB2', wordBoundaryRule, '', []);
test('WB3', wordBoundaryRule, 'a\r\nb', ['a', 'b']);
test('WB3a', wordBoundaryRule, '\na', ['a']);
test('WB3b', wordBoundaryRule, 'a\n', ['a']);
// TODO:  test for WB3c
test.skip('WB3d', wordBoundaryRule, 'a \u2009 b', ['a', 'b'])
test('WB5', wordBoundaryRule, 'aא', ['aא'])
test('WB6 && WB7', wordBoundaryRule, "ain't", ["ain't"])
test('WB7', wordBoundaryRule, "ain't", ["ain't"])
test('WB7a', wordBoundaryRule, `${ALEPH}'`, [`${ALEPH}'`]);
test('WB7b && WB7c', wordBoundaryRule, `${ALEPH}"${ALEPH}`, [`${ALEPH}"${ALEPH}`]);
test('WB8', wordBoundaryRule, '42', ['42']);
test('WB9', wordBoundaryRule, '3a',  ['3a']);
test('WB10', wordBoundaryRule, 'A3',  ['A3']);
test('WB11', wordBoundaryRule, '3.2',  ['3.2']);
test('WB12', wordBoundaryRule, '3,456.789',  ['3,456.789']);
test('WB13', wordBoundaryRule, 'エラー',  ['エラー']);
test('WB13a && WB13b', wordBoundaryRule, 'ᐁ ᓂᐸᐟ',  ['ᐁ ᓂᐸᐟ']);
// TODO: this one is tough because there can be an aribrary amount of RI indicators.
test.skip('WB15', wordBoundaryRule, '🇨🇦🇰🇭',  ['🇨🇦🇰🇭']);
test('WB99', wordBoundaryRule, '米饼',  ['米', '饼']);

/** Macro to test a word boundary rule. */
function wordBoundaryRule(t, input: string, expected: string[]) {
  t.deepEqual(splitWords(input), expected);
}