var Resolver = require('y-resolver'),
    walk = require('y-walk'),
    {Yielded} = Resolver;

class Target{

  // Default behaviour

  until(){ return new Yielded(); }
  untilNot(){ return new Yielded(); }
  untilNext(){ return new Yielded(); }
  listened(){ return false; }
  is(){ return false; }
  isNot(){ return false; }
  events(){ return []; }

  // Helpers

  walk(func, args, thisArg){ return walk(func, args, thisArg || this); }
  on(){ return require('./watchers/on').apply(this, arguments); }
  once(){ return require('./watchers/once').apply(this, arguments); }

  // Useful symbols

  get eventListened(){ return Symbol.for('y-emitter/eventListened'); }
  get eventIgnored(){ return Symbol.for('y-emitter/eventIgnored'); }
  get setCall(){ return Symbol.for('y-emitter/setCall'); }
  get unsetCall(){ return Symbol.for('y-emitter/unsetCall'); }
  get giveCall(){ return Symbol.for('y-emitter/giveCall'); }

  get [Symbol.for('ebjs/label')](){ return 57; }

}

/*/ exports /*/

module.exports = Target;
