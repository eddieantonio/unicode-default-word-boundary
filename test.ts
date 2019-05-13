import test from 'ava';

import {splitWords} from './';


test('empty', t => {
  t.deepEqual(splitWords(''), []);
});

test('WB8', t => {
  t.deepEqual(splitWords('42'), ['42']);
});

test('WB9', t => {
  t.deepEqual(splitWords('3a'), ['3a']);
});

test('WB10', t => {
  t.deepEqual(splitWords('A3'), ['A3']);
});

test.skip('simple example', t => {
  t.deepEqual(splitWords('hello'), ['hello']);
});