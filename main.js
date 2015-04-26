var Su = require('u-su'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    
    state = Su(),
    resolver = Su(),
    nextResolver = Su(),
    target = Su(),
    emitter = Su(),
    syn = Su(),
    active = Su(),
    
    reserved = {},
    
    bag,
    
    Emitter,
    Target,
    Hybrid;

// Emitter

module.exports = Emitter = function Emitter(Constructor){
  Constructor = Constructor || Target;
  this[target] = new Constructor();
  this[target][emitter] = this;
};

Object.defineProperties(Emitter.prototype,bag = {
  
  target: {get: function(){ return this[target]; }},
  
  give: {value: function(event,data){
    var res;
    
    event = this[target].compute(event);
    res = this[target][resolver][event];
    
    if(res && !res.yielded.done){
      delete this[target][resolver][event];
      res.accept(data);
    }
    
    if(!this[target].isReserved(event)) this.give(this[target].any,arguments);
  }},
  
  throw: {value: function(event,error){
    var res;
    
    event = this[target].compute(event);
    res = this[target][resolver][event];
    
    if(res && !res.yielded.done){
      delete this[target][resolver][event];
      res.reject(error);
    }
    
    this.give(this[target].anyThrow,arguments);
  }},
  
  set: {value: function(event,data){
    event = this[target].compute(event);
    (this[target][resolver][event] = this[target][resolver][event] || new Resolver()).accept(data);
    
    this.give(this[target].anySet,arguments);
  }},
  
  setError: {value: function(event,error){
    event = this[target].compute(event);
    (this[target][resolver][event] = this[target][resolver][event] || new Resolver()).reject(error);
    
    this.give(this[target].anySetError,arguments);
  }},
  
  unset: {value: function(event){
    var res;
    
    event = this[target].compute(event);
    res = this[target][resolver][event];
    
    if(res && res.yielded.done){
      this[target][resolver][event] = this[target][nextResolver][event];
      delete this[target][nextResolver][event];
    }
    
    this.give(this[target].anyUnset,arguments);
  }},
  
  sun: {value: function(state1,state2){
    this.unset(state2);
    this.set(state1);
  }},
  
  syn: {value: function(from,to){
    this[target][syn][from] = to;
    this.give(this[target].anySyn,arguments);
  }},
  
  unsyn: {value: function(from){
    delete this[target][syn][from];
    this.give(this[target].anyUnsyn,arguments);
  }}
  
});

// Target

function Cbc(){
  this[active] = true;
}

Object.defineProperty(Cbc.prototype,'detach',{value: function(){
  this[active] = false;
}});

function* callOn(cbc,args,event,listener){
  
  args[0] = yield this.until(event);
  while(cbc[active]){
    walk(listener,args,this);
    args[0] = yield this.untilNext(event);
  }
  
}

function* callOnce(cbc,args,event,listener){
  
  args[0] = yield this.until(event);
  if(cbc[active]) walk(listener,args,this);
  
}

Emitter.Target = Target = function Target(prop){
  if(this[emitter]) return;
  
  if(prop){
    this[emitter] = this[prop] = Object.create(Emitter.prototype);
    this[emitter][target] = this;
  }
  
  this[syn] = {};
  this[state] = {};
  this[resolver] = {};
  this[nextResolver] = {};
};

Object.defineProperties(Target.prototype,{
  
  compute: {value: function(event){
    while(this[syn].hasOwnProperty(event)) event = this[syn][event];
    return event;
  }},
  
  walk: {value: function(generator,args){
    walk(generator,args,this);
  }},
  
  until: {value: function(event){
    var res;
    
    event = this.compute(event);
    
    res = this[resolver][event];
    if(res) return res.yielded;
    
    res = this[resolver][event] = new Resolver();
    this[emitter].give(this.event,event);
    
    return res.yielded;
  }},
  
  untilNext: {value: function(event){
    var res;
    
    if(this.isNot(event)) return this.until(event);
    event = this.compute(event);
    
    res = this[nextResolver][event];
    if(res) return res.yielded;
    
    res = this[nextResolver][event] = new Resolver();
    this[emitter].give(this.event,event);
    
    return res.yielded;
  }},
  
  listeners: {value: function(event){
    var res;
    
    event = this.compute(event);
    if(res = this[resolver][event]) return res.yielded.listeners.value;
    
    return 0;
  }},
  
  is: {value: function(event){
    event = this.compute(event);
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  isNot: {value: function(event){
    event = this.compute(event);
    return !(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  hasFailed: {value: function(event){
    event = this.compute(event);
    return !!(this[resolver][event] && this[resolver][event].yielded.rejected);
  }},
  
  hasNotFailed: {value: function(event){
    event = this.compute(event);
    return !(this[resolver][event] && this[resolver][event].yielded.rejected);
  }},
  
  on: {value: function(){
    var event = arguments[0],
        listener = arguments[1],
        cbc = new Cbc();
    
    arguments[1] = cbc;
    walk(callOn,[cbc,arguments,event,listener],this);
    
    return cbc;
  }},
  
  once: {value: function(){
    var event = arguments[0],
        listener = arguments[1],
        cbc = new Cbc();
    
    arguments[1] = cbc;
    walk(callOnce,[cbc,arguments,event,listener],this);
    
    return cbc;
  }},
  
  event: {value: Su()},
  any: {value: Su()},
  anySet: {value: Su()},
  anySetError: {value: Su()},
  anyUnset: {value: Su()},
  anyThrow: {value: Su()},
  anySyn: {value: Su()},
  anyUnsyn: {value: Su()},
  
  isReserved: {value: function(event){
    return !!reserved[event];
  }}
  
});

reserved[Target.prototype.any] = true;
reserved[Target.prototype.anySet] = true;
reserved[Target.prototype.anySetError] = true;
reserved[Target.prototype.anyUnset] = true;
reserved[Target.prototype.anyThrow] = true;
reserved[Target.prototype.anySyn] = true;
reserved[Target.prototype.anyUnsyn] = true;
reserved[Target.prototype.event] = true;

// Hybrid

Emitter.Hybrid = Hybrid = function HybridTarget(){
  this[target] = this;
  this[emitter] = this;
  
  this[syn] = {};
  this[state] = {};
  this[resolver] = {};
  this[nextResolver] = {};
};

Hybrid.prototype = new Target();
Hybrid.prototype.constructor = Hybrid;

Object.defineProperties(Hybrid.prototype,bag);

// Auxiliar

Emitter.chain = function(){
  var last = arguments[arguments.length - 1][target],
      i;
  
  arguments[arguments.length - 1][target] = arguments[0][target];
  for(i = 0;i < arguments.length - 2;i++) arguments[i][target] = arguments[i + 1][target];
  arguments[arguments.length - 2][target] = last;
};

