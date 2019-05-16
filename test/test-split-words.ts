import test, { ExecutionContext } from 'ava';

import {split} from '../src';

// Special characters that I don't trust text editors to display properly in
// string literals!

// I'm avoiding placing Hebrew and Latin in the same string literal, because
// VSCode gets VERY confused with bidirectional text ☹️
const ALEPH = 'א';
const ZWJ = '\u200D';
const VIRAMA = '\u094D';
const COMBINING_HORN = '\u031B';
const COMBINING_HOOK_ABOVE = '\u0309';
const SHY = '\u00AD';

/* See: https://unicode.org/reports/tr29/#Word_Boundary_Rules */
test('WB1 & WB2', wordBoundaryRule, '', []);
test('WB3', wordBoundaryRule, 'a\r\nb', ['a', 'b']);
test('WB3a', wordBoundaryRule, '\na', ['a']);
test('WB3b', wordBoundaryRule, 'a\n', ['a']);
// TODO: test for WB3c
test('WB3d', wordBoundaryRule, 'a \u2009 b', ['a', 'b'])
test('WB4 [Extend]', wordBoundaryRule,
  `pho${COMBINING_HORN}${COMBINING_HOOK_ABOVE}`,
  [`pho${COMBINING_HORN}${COMBINING_HOOK_ABOVE}`]);
test('WB4 [Format]', wordBoundaryRule,
  `Ka${SHY}wen${SHY}non:${SHY}nis`,
  [`Ka${SHY}wen${SHY}non:${SHY}nis`]);
test('WB4 [ZWJ]', wordBoundaryRule, `क${VIRAMA}${ZWJ}ष`, ['क्‍ष']);
test('WB5', wordBoundaryRule, 'aא', ['aא'])
test('WB6 & WB7', wordBoundaryRule, "ain't", ["ain't"])
test('WB7', wordBoundaryRule, "ain't", ["ain't"])
test('WB7a', wordBoundaryRule, `${ALEPH}'`, [`${ALEPH}'`]);
test('WB7b & WB7c', wordBoundaryRule, `${ALEPH}"${ALEPH}`, [`${ALEPH}"${ALEPH}`]);
test('WB8', wordBoundaryRule, '42', ['42']);
test('WB9', wordBoundaryRule, 'A3',  ['A3']);
test('WB10', wordBoundaryRule, '3a',  ['3a']);
test('WB11  && WB12', wordBoundaryRule, '3.2 3,456.789',  ['3.2', '3,456.789']);
test('WB13', wordBoundaryRule, 'エラー',  ['エラー']);
test('WB13a & WB13b', wordBoundaryRule, 'ᐁ ᓂᐸᐟ',  ['ᐁ ᓂᐸᐟ']);
// TODO: this one is tough because there can be an aribrary amount of RI indicators.
test.skip('WB15', wordBoundaryRule, '🇨🇦🇰🇭',  ['🇨🇦🇰🇭']);
test('WB99', wordBoundaryRule, '米饼',  ['米', '饼']);

/** Macro to test a word boundary rule. */
function wordBoundaryRule(t: ExecutionContext, input: string, expected: string[]) {
  t.deepEqual(split(input), expected);
}
