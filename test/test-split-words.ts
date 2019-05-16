import test, { ExecutionContext } from 'ava';

import {split} from '../src';

///// Special characters that I don't trust text editors to display properly /////
/////                       in string literals:                              /////
// I'm avoiding placing Hebrew and Latin in the same string literal, because
// VSCode gets VERY confused with bidirectional text ☹️
const ALEPH = 'א';
const COMBINING_HOOK_ABOVE = '\u0309'; // phở real
const COMBINING_HORN = '\u031B'; // phở sure
const SHY = '\u00AD'; // soft-hypen: a word-break *opporunity*, but NOT a word break!
const VIRAMA = '\u094D'; // halant in Hindi. Makes the inherent vowel silent.
const ZWJ = '\u200D';
const EMOJI_PRESENTATION_SELECTOR = '\ufe0f'; // Makes the last thing display as emoji.

/* See: https://unicode.org/reports/tr29/#Word_Boundary_Rules */
test('WB1 & WB2', wordBoundaryRule, '', []);
test('WB3', wordBoundaryRule, 'a\r\nb', ['a', 'b']);
test('WB3a', wordBoundaryRule, '\na', ['a']);
test('WB3b', wordBoundaryRule, 'a\n', ['a']);
test('WB3c', wordBoundaryRuleIndivisible, `🧚${''}🏽${ZWJ}♂${EMOJI_PRESENTATION_SELECTOR}`);
test('WB3d', wordBoundaryRule, 'a \u2009 b', ['a', 'b'])
test('WB4 [Extend]', wordBoundaryRuleIndivisible, `pho${COMBINING_HORN}${COMBINING_HOOK_ABOVE}`);
test('WB4 [Format]', wordBoundaryRuleIndivisible, `Ka${SHY}wen${SHY}non:${SHY}nis`);
test('WB4 [ZWJ]', wordBoundaryRuleIndivisible, `क${VIRAMA}${ZWJ}ष`);
test('WB5', wordBoundaryRuleIndivisible, 'aא')
test('WB6 & WB7', wordBoundaryRuleIndivisible, "ain't")
test('WB7', wordBoundaryRuleIndivisible, "ain't")
test('WB7a', wordBoundaryRuleIndivisible, `${ALEPH}'`);
test('WB7b & WB7c', wordBoundaryRuleIndivisible, `${ALEPH}"${ALEPH}`);
test('WB8', wordBoundaryRuleIndivisible, '42');
test('WB9', wordBoundaryRuleIndivisible, 'A3',);
test('WB10', wordBoundaryRuleIndivisible, '3a',);
test('WB11  && WB12', wordBoundaryRule, '3.2 3,456.789',  ['3.2', '3,456.789']);
test('WB13', wordBoundaryRuleIndivisible, 'エラー',);
test('WB13a & WB13b', wordBoundaryRuleIndivisible, 'ᐁ ᓂᐸᐟ');
// TODO: this one is tough because there can be an aribrary amount of RI indicators.
test.skip('WB15', wordBoundaryRule, '🇨🇦🇰🇭',  ['🇨🇦🇰🇭']);
test('WB99', wordBoundaryRule, '米饼',  ['米', '饼']);

/** Macro to test a word boundary rule. */
function wordBoundaryRule(t: ExecutionContext, input: string, expected: string[]) {
  t.deepEqual(split(input), expected);
}

/** 
 * Same as wordBoundaryRule, but the input should not have any internal word
 * boundaries. i.e., the input is indivisible.
 */
function wordBoundaryRuleIndivisible(t: ExecutionContext, input: string) {
  t.deepEqual(split(input), [input]);
}
