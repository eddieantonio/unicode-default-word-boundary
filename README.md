Unicode Default Word Boundary
=============================

[![Build Status](https://travis-ci.org/eddieantonio/unicode-default-word-boundary.svg?branch=master)](https://travis-ci.org/eddieantonio/unicode-default-word-boundary)

Implements the [Unicode TR29§4.1 default word boundary
specification][defaultwb], for use finding **word breaks** in
**multilingual text**.

This is a lot smarter than the `\b` word boundary in JavaScript's
regular expressions! Note that character classes like `\w`, `\d`, and
friends [only work on ASCII characters][mdnregexp].


Usage
-----

Import the module and use the `splitWords()` method:

```js
const splitWords = require('unicode-default-word-boundary').splitWords;

console.log(splitWords(`The quick (“brown”) fox can’t jump 32.3 feet, right?`));
```

Output:

    [ 'The', 'quick', '(', '“', 'brown', '”', ')', 'fox', 'can’t', 'jump', '32.3', 'feet', 'right', '?' ]


But that's not all! Try it with non-English text, like Russian:

```javascript
splitWords(`В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!`)
```

    [ 'В', 'чащах', 'юга', 'жил', 'бы', 'цитрус', '?', 'Да', 'но', 'фальшивый', 'экземпляр', '!' ]

...Hebrew:

```javascript
splitWords(`איך בלש תפס גמד רוצח עז קטנה?`);
```

    [ 'איך', 'בלש', 'תפס', 'גמד', 'רוצח', 'עז', 'קטנה', '?' ]

...[nêhiyawêwin][]:

```javascript
splitWords(`ᑕᐻ ᒥᔪ ᑭᓯᑲᐤ ᐊᓄᐦᐨ᙮`);
```

    [ 'ᑕᐻ', 'ᒥᔪ ᑭᓯᑲᐤ', 'ᐊᓄᐦᐨ', '᙮' ]

...and many more!


What doesn't work
-----------------

Languages that do not have obvious word breaks, such as Chinese,
Japanese, Thai, Lao, and Khmer. You'll need to use statistical or
dictionary-based approaches to split words in these languages.

License
-------

TypeScript implementation © 2019 Eddie Antonio Santos. MIT Licensed. The
algorithm comes from [UAX #29: Unicode Text Segmentation, an integral
part of the Unicode Standard, version 12.0][uax29].

[uax29]: https://unicode.org/reports/tr29/
[mdnregexp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Character_Classes#Types
[defaultwb]: https://unicode.org/reports/tr29/#Default_Word_Boundaries
