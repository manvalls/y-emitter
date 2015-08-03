var define = require('u-proto/define'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    Detacher = require('detacher'),

    resolver = Symbol(),
    nextResolver = Symbol(),
    target = Symbol(),

    bag;

// Emitter

function Emitter(Constructor){
  Constructor = Constructor || Target;
  this[target] = new Constructor();
};

Emitter.prototype[define](bag = {

  get target(){ return this[target]; },

  give: function(event,data,lock){
    var res = this[target][resolver].get(event);

    if(res && !res.yielded.done){
      this[target][resolver].delete(event);
      res.accept(data,lock);
    }

  },

  throw: function(event,error,lock){
    var res = this[target][resolver].get(event);

    if(res && !res.yielded.done){
      this[target][resolver].delete(event);
      res.reject(error,lock);
    }

  },

  set: function(event,data,lock){
    var res = this[target][resolver].get(event);

    if(res) res.accept(data,lock);
    else{
      res = new Resolver();
      res.accept(data,lock);
      this[target][resolver].set(event,res);
    }

  },

  hold: function(event,error,lock){
    var res = this[target][resolver].get(event);

    if(res) res.reject(error,lock);
    else{
      res = new Resolver();
      res.reject(error,lock);
      this[target][resolver].set(event,res);
    }

  },

  unset: function(event){
    var res = this[target][resolver].get(event);

    if(res && res.yielded.done){
      this[target][resolver].set(event,this[target][nextResolver].get(event));
      this[target][nextResolver].delete(event);
    }

  },

  sun: function(state1,state2){
    this.unset(state2);
    this.set(state1);
  }

});

// Target

function Target(prop){
  if(this[resolver]) return;

  if(prop){
    this[prop] = Object.create(Emitter.prototype);
    this[prop][target] = this;
  }

  this[resolver] = new Map();
  this[nextResolver] = new Map();
}

Target.prototype[define]({

  until: function(event){
    var res;

    res = this[resolver].get(event);
    if(res) return res.yielded;

    this[resolver].set(event,res = new Resolver());
    return res.yielded;
  },

  untilNext: function(event){
    var res;

    res = this[resolver].get(event);
    if(!(res && res.yielded.done)) return this.until(event);

    res = this[nextResolver].get(event);
    if(res) return res.yielded;

    this[nextResolver].set(event,res = new Resolver());
    return res.yielded;
  },

  listened: function(event){
    var n = 0,
        res;

    res = this[resolver].get(event);
    if(res) n += res.yielded.listeners.value;

    res = this[nextResolver].get(event);
    if(res) n += res.yielded.listeners.value;

    return n > 0;
  },

  is: function(event){
    var res = this[resolver].get(event);
    return !!(res && res.yielded.accepted);
  },

  isNot: function(event){
    var res = this[resolver].get(event);
    return !(res && res.yielded.accepted);
  },

  hasFailed: function(event){
    var res = this[resolver].get(event);
    return !!(res && res.yielded.rejected);
  },

  hasNotFailed: function(event){
    var res = this[resolver].get(event);
    return !(res && res.yielded.rejected);
  },

  walk: function(generator,args){
    walk(generator,args,this);
  },

  on: function(){
    var event = arguments[0],
        listener = arguments[1],
        d = new Detacher();

    arguments[1] = d;
    walk(onLoop,[d,arguments,event,listener],this);

    return d;
  },

  once: function(){
    var event = arguments[0],
        listener = arguments[1],
        d = new Detacher();

    arguments[1] = d;
    walk(onceLoop,[d,arguments,event,listener],this);

    return d;
  },

  events: function(){
    return this[resolver].keys();
  }

});

// - on

function* onLoop(d,args,event,listener){

  args[0] = yield this.until(event);
  while(d.active){
    walk(listener,args,this);
    args[0] = yield this.untilNext(event);
  }

}

// - once

function* onceLoop(d,args,event,listener){
  args[0] = yield this.until(event);
  if(d.active) walk(listener,args,this);
}

// HybridTarget

function HybridTarget(){
  this[target] = this;
  Target.call(this);
}

HybridTarget.prototype = Object.create(Target.prototype);
HybridTarget.prototype[define]('constructor',HybridTarget);
HybridTarget.prototype[define](bag);

// utils

function chain(){
  var last = arguments[arguments.length - 1][target],
      i;

  arguments[arguments.length - 1][target] = arguments[0][target];
  for(i = 0;i < arguments.length - 2;i++) arguments[i][target] = arguments[i + 1][target];
  arguments[arguments.length - 2][target] = last;
}

/*/ exports /*/

module.exports = Emitter;
Emitter.Target = Target;
Emitter.Hybrid = HybridTarget;
Emitter.chain = chain;
