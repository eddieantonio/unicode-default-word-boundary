import test from 'ava';

import {split} from '../';

// Sanity checks for the top-level API.

const example = 'Hi! 👋🏽 I am エラー!'

test('.split()', t => {
  t.deepEqual(split(example),   [
    'Hi', '!', '👋🏽', 'I', 'am', 'エラー', '!',
  ]);
});