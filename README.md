Unicode Default Word Boundary
=============================

[![Build Status](https://travis-ci.org/eddieantonio/unicode-default-word-boundary.svg?branch=master)](https://travis-ci.org/eddieantonio/unicode-default-word-boundary)

Implements the [Unicode TR29§4.1 default word boundary
specification][defaultwb], for finding **word breaks** in **multilingual
text**.

This is a lot smarter than the `\b` word boundary in JavaScript's
regular expressions! Note that character classes like `\w`, `\d` [only
work on ASCII characters][mdnregexp].

Use this to split words in text!

Usage
-----

Import the module and use the `split()` method:

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


What doesn't work
-----------------

Languages that do not have obvious word breaks, such as Chinese,
Japanese, Thai, Lao, and Khmer. You'll need to use statistical or
dictionary-based approaches to split words in these languages.


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

TypeScript implementation © 2019 Eddie Antonio Santos. MIT Licensed.

The algorithm comes from [UAX #29: Unicode Text Segmentation, an
integral part of the Unicode Standard, version 12.0][uax29].

[defaultwb]: https://unicode.org/reports/tr29/#Default_Word_Boundaries
[mdnregexp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes#Types
[nêhiyawêwin]: https://en.wikipedia.org/wiki/Plains_Cree
[uax29]: https://unicode.org/reports/tr29/
[unicodefiles]: https://unicode.org/reports/tr41/tr41-24.html
