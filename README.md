Unicode Default Word Boundary
=============================

[![Build Status](https://travis-ci.org/eddieantonio/unicode-default-word-boundary.svg?branch=master)](https://travis-ci.org/eddieantonio/unicode-default-word-boundary)
[![npm](https://img.shields.io/npm/v/unicode-default-word-boundary.svg)](https://www.npmjs.com/package/unicode-default-word-boundary)

Implements the [Unicode UAX #29 §4.1 default word boundary
specification][defaultwb], for finding **word breaks** in **multilingual
text**.

Use this to split words in text! Using UAX #29 is a lot smarter than the
`\b` word boundary in JavaScript's regular expressions! Note that
character classes like `\b`, `\w`, `\d` [only work on ASCII
characters][mdnregexp].


Usage
-----

Import the module and use the `split()` function:

```js
const split = require('unicode-default-word-boundary').split;

console.log(split(`The quick (“brown”) fox can’t jump 32.3 feet, right?`));
```

Output:

    [ 'The', 'quick', '(', '“', 'brown', '”', ')', 'fox', 'can’t', 'jump', '32.3', 'feet', ',', 'right', '?' ]


But that's not all! Try it with non-English text, like Russian:

```javascript
split(`В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!`)
```

    [ 'В', 'чащах', 'юга', 'жил', 'бы', 'цитрус', '?', 'Да', ',', 'но', 'фальшивый', 'экземпляр', '!' ]

...Hebrew:

```javascript
split(`איך בלש תפס גמד רוצח עז קטנה?`);
```

    [ 'איך', 'בלש', 'תפס', 'גמד', 'רוצח', 'עז', 'קטנה', '?' ]

...[nêhiyawêwin][]:

```javascript
split(`ᑕᐻ ᒥᔪ ᑭᓯᑲᐤ ᐊᓄᐦᐨ᙮`);
```

    [ 'ᑕᐻ', 'ᒥᔪ ᑭᓯᑲᐤ', 'ᐊᓄᐦᐨ', '᙮' ]

...and many more!

More advanced use cases will want to use the `findSpans()` function.


What doesn't work
-----------------

Languages that do not have obvious word breaks, such as Chinese,
Japanese, Thai, Lao, and Khmer. You'll need to use statistical or
dictionary-based approaches to split words in these languages.


API Documentation
-----------------

There are two exported function: `split()` and `findSpans()`.

### `split(text: string): string[]`

`split()` splits the text at word boundaries, returning an array of all
"words" from the text that contain characters other than whitespace.

See above for examples.


### `findSpans(text: string): Iterable<BasicSpan>`

`findSpans()` is a generator that yields successive _basic spans_ from
the text. A basic span is a chunk of text that is guaranteed to
start at a word boundary and end at the next word boundary. In other
words, basic spans are _indivisible_ in that there are no word
boundaries contained within a basic span.

A basic span has the following properties:

```typescript
interface BasicSpan {
    /** Where the span starts, relative to the input text. */
    start: number;
    /** At what index does the **next** span begin. */
    end: number;
    /** How many characters are in this span. */
    length: number;
    /** The text contained within this span. */
    text: string;
}
```

Note that unlike, `split()`, `findSpans()` **does** yield spans that
contain whitespace.

#### Example

`Array.from(findSpans("Hello, world🌎!"))`

Will yield spans with the following properties:

```javascript
[ { start: 0, end: 5, length: 5, text: 'Hello' },
  { start: 5, end: 6, length: 1, text: ',' },
  { start: 6, end: 7, length: 1, text: ' ' },
  { start: 7, end: 12, length: 5, text: 'world' },
  { start: 12, end: 14, length: 2, text: '🌎' },
  { start: 14, end: 15, length: 1, text: '!' } ]
```

**N.B.**: `findSpans()` may _not_ yield plain JavaScript objects, as
shown above. The objects that `findSpans()` yield will adhere to the
`BasicSpan` interface, however what `findSpans()` actually yields may
differ from simple objects.


Contributing and Maintaining
----------------------------

When maintaining this package, you might notice something strange.
`index.ts` depends on `./src/gen/WordBreakProperty.ts`, but this file
does not exist! It is a **generated** file, created by reading Unicode
property data files, [downloaded from Unicode's website][unicodefiles].
These data files have been compressed and committed to this repository
in `libexec/`:

    libexec/
    ├── WordBreakProperty-12.0.0.txt.gz
    ├── compile-word-break.js
    └── emoji-data-12.0.0.txt.gz

**Note that `compile-word-break.js` actually creates
`./src/gen/WordBreakProperty.ts`!**


### How to generate `./src/gen/WordBreakProperty.ts`

When you have _just_ cloned the repository, this file will be generated
when you run `npm install`:

    npm install

If you want to regenerate it afterwards, you can run the build script:

    npm run build


License
-------

TypeScript implementation © 2019 National Research Council
Canada. MIT Licensed.

The algorithm comes from [UAX #29: Unicode Text Segmentation, an
integral part of the Unicode Standard, version 12.0][uax29].

[defaultwb]: https://unicode.org/reports/tr29/#Default_Word_Boundaries
[mdnregexp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes#Types
[nêhiyawêwin]: https://en.wikipedia.org/wiki/Plains_Cree
[uax29]: https://unicode.org/reports/tr29/
[unicodefiles]: https://unicode.org/reports/tr41/tr41-24.html
