var Su = require('u-su'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    
    state = Su(),
    resolver = Su(),
    target = Su(),
    emitter = Su(),
    
    active = Su(),
    
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
    var res = this[target][resolver][event];
    
    if(res && !res.yielded.done){
      delete this[target][resolver][event];
      this.unset(event + ' listened');
      res.accept(data);
    }
    
  }},
  
  throw: {value: function(event,error){
    var res = this[target][resolver][event];
    
    if(res && !res.yielded.done){
      delete this[target][resolver][event];
      res.reject(error);
    }
    
  }},
  
  set: {value: function(event,data){
    var res = this[target][resolver][event] = this[target][resolver][event] || new Resolver();
    
    this.unset(event + ' listened');
    res.accept(data);
  }},
  
  setError: {value: function(event,error){
    
    (this[target][resolver][event] = this[target][resolver][event] || new Resolver()).reject(error);
    
  }},
  
  unset: {value: function(event){
    var res = this[target][resolver][event];
    
    if(res && res.yielded.done) delete this[target][resolver][event];
  }}
  
});

// Target

Emitter.Target = Target = function Target(prop){
  if(this[emitter]) return;
  
  if(prop){
    this[emitter] = this[prop] = Object.create(Emitter.prototype);
    this[emitter][target] = this;
  }
  
  this[state] = {};
  this[resolver] = {};
};

Object.defineProperties(Target.prototype,{
  
  walk: {value: function(generator,args){
    walk(generator,args,this);
  }},
  
  until: {value: function(event){
    var res = this[resolver][event];
    
    if(!res){
      res = this[resolver][event] = new Resolver();
      walk(setListened,[event,this[emitter],res.yielded]);
    }
    
    return res.yielded;
    
  }},
  
  is: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  failed: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.rejected);
  }},
  
  on: {value: walk.wrap(function*(){
    var event = arguments[0],
        listener = arguments[1];
    
    listener[active] = listener[active] || {};
    
    if(listener[active][event] != null){
      listener[active][event] = true;
      return;
    }
    
    listener[active][event] = true;
    
    arguments[1] = event;
    arguments[0] = yield this.until(event);
    
    while(listener[active][event]){
      walk(listener,arguments,this);
      arguments[0] = yield this.until(event);
    }
    
    delete listener[active][event];
    
  })},
  
  once: {value: walk.wrap(function*(){
    var event = arguments[0],
        listener = arguments[1];
    
    listener[active] = listener[active] || {};
    
    if(listener[active][event] != null){
      listener[active][event] = true;
      return;
    }
    
    listener[active][event] = true;
    
    arguments[1] = event;
    arguments[0] = yield this.until(event);
    
    if(listener[active][event]) walk(listener,arguments,this);
    delete listener[active][event];
    
  })},
  
  detach: {value: function(event,listener){
    if(!(listener[active] && listener[active][event])) return;
    listener[active][event] = false;
  }}
  
});

// Hybrid

Emitter.Hybrid = Hybrid = function HybridTarget(){
  this[target] = this;
  this[emitter] = this;
  
  this[state] = {};
  this[resolver] = {};
};

Hybrid.prototype = new Target();
Hybrid.prototype.constructor = Hybrid;

Object.defineProperties(Hybrid.prototype,bag);

// Auxiliar

function* setListened(event,emitter,yd){
  yield walk.before(yd);
  emitter.set(event + ' listened');
}

Emitter.chain = function(){
  var last = arguments[arguments.length - 1][target],
      i;
  
  arguments[arguments.length - 1][target] = arguments[0][target];
  for(i = 0;i < arguments.length - 2;i++) arguments[i][target] = arguments[i + 1][target];
  arguments[arguments.length - 2][target] = last;
};

