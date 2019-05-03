import test from 'ava';

import {splitWords} from './';

test('simple example', t => {
  t.deepEqual(splitWords('hello'), ['hello']);
});