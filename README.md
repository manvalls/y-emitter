# Emitter

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
