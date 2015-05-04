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
    
    bag,any,
    
    Emitter,
    Target,
    Hybrid;

// Emitter

module.exports = Emitter = function Emitter(Constructor){
  Constructor = Constructor || Target;
  this[target] = new Constructor();
  this[target][emitter] = this;
};

function give(event,data,that){
  var res,e;
  
  if(e = that[target][syn][event]) give(e,data,that);
  
  res = that[target][resolver][event];
  if(res && !res.yielded.done){
    delete that[target][resolver][event];
    res.accept(data);
  }
  
}

function giveError(event,error,that){
  var res,e;
  
  if(e = that[target][syn][event]) giveError(e,error,that);
  
  res = that[target][resolver][event];
  if(res && !res.yielded.done){
    delete that[target][resolver][event];
    res.reject(error);
  }
  
}

function _set(event,data,that){
  var e;
  
  if(e = that[target][syn][event]) _set(e,data,that);
  (that[target][resolver][event] = that[target][resolver][event] || new Resolver()).accept(data);
}

function _setError(event,error,that){
  var e;
  
  if(e = that[target][syn][event]) _setError(e,error,that);
  (that[target][resolver][event] = that[target][resolver][event] || new Resolver()).reject(error);
}

function unset(event,that){
  var res,e;
  
  if(e = that[target][syn][event]) unset(e,that);
  
  res = that[target][resolver][event];
  if(res && res.yielded.done){
    that[target][resolver][event] = that[target][nextResolver][event];
    delete that[target][nextResolver][event];
  }
  
}

Object.defineProperties(Emitter.prototype,bag = {
  
  target: {get: function(){ return this[target]; }},
  
  give: {value: function(event,data){
    if(this[target].isReserved(event)) return;
    
    give(event,data,this);
    give(this[target].any.give,[event,data],this);
  }},
  
  giveError: {value: function(event,error){
    if(this[target].isReserved(event)) return;
    
    giveError(event,error,this);
    give(this[target].any.giveError,[event,error],this);
  }},
  
  set: {value: function(event,data){
    if(this[target].isReserved(event)) return;
    
    _set(event,data,this);
    give(this[target].any.set,[event,data],this);
  }},
  
  setError: {value: function(event,error){
    if(this[target].isReserved(event)) return;
    
    _setError(event,error,this);
    give(this[target].any.setError,[event,error],this);
  }},
  
  unset: {value: function(event){
    var res;
    
    if(this[target].isReserved(event)) return;
    
    unset(event,this);
    give(this[target].any.unset,[event],this);
  }},
  
  sun: {value: function(state1,state2){
    this.unset(state2);
    this.set(state1);
  }},
  
  syn: {value: function(from,to){
    var fr,tr;
    
    if(this[target].isReserved(from)) return;
    if(this[target].isReserved(to)) return;
    
    this[target][syn][from] = to;
    give(this[target].any.syn,[from,to],this);
  }},
  
  unsyn: {value: function(from){
    if(this[target].isReserved(from)) return;
    
    delete this[target][syn][from];
    give(this[target].any.unsyn,[from],this);
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

(function(){
  var keys,i,j;
  
  any = {
    until: Su(),
    give: Su(),
    giveError: Su(),
    set: Su(),
    setError: Su(),
    unset: Su(),
    syn: Su(),
    unsyn: Su()
  };
  
  Object.freeze(any);
  
  keys = Object.keys(any);
  for(j = 0;j < keys.length;j++){
    i = keys[j];
    reserved[any[i]] = true;
  }
  
})();

function until(that,event,prop){
  var res;
  
  res = that[prop][event];
  if(res) return res.yielded;
  
  res = that[prop][event] = new Resolver();
  if(event != that.any.until) give(that.any.until,[event],that[emitter]);
  
  return res.yielded;
}

Object.defineProperties(Target.prototype,{
  
  walk: {value: function(generator,args){
    walk(generator,args,this);
  }},
  
  until: {value: function(event){
    return until(this,event,resolver);
  }},
  
  untilNext: {value: function(event){
    if(this[resolver][event] && this[resolver][event].yielded.accepted) return until(this,event,nextResolver);
    return until(this,event,resolver);
  }},
  
  listeners: {value: function(event){
    var res;
    
    if(res = this[resolver][event]) return res.yielded.listeners.value;
    
    return 0;
  }},
  
  is: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  isNot: {value: function(event){
    return !(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  hasFailed: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.rejected);
  }},
  
  hasNotFailed: {value: function(event){
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
  
  any: {value: any},
  
  isReserved: {value: function(event){
    return !!reserved[event];
  }}
  
});

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

