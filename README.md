# Emitter [![Build Status][ci-img]][ci-url] [![Coverage Status][cover-img]][cover-url]

## Sample usage

```javascript

var Emitter = require('y-emitter'),
    emitter = new Emitter(),
    target = emitter.target;

target.walk(function* listener(){

  yield this.until('click');
  console.log('click');

  yield this.until('clock');
  console.log('clock');

  this.walk(listener);
});

emitter.give('click'); // click
emitter.give('clock'); // clock
emitter.give('clock');
emitter.give('click'); // click

```

[ci-img]: https://circleci.com/gh/manvalls/y-emitter.svg?style=shield
[ci-url]: https://circleci.com/gh/manvalls/y-emitter
[cover-img]: https://coveralls.io/repos/manvalls/y-emitter/badge.svg?branch=master&service=github
[cover-url]: https://coveralls.io/github/manvalls/y-emitter?branch=master
