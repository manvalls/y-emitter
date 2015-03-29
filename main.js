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
    args[0] = yield this.until(event);
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
  
  this[active] = Su();
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
  
  listeners: {value: function(event){
    var res;
    
    if(res = this[resolver][event]) return res.yielded.listeners;
    return 0;
  }},
  
  is: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  failed: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.rejected);
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
  }}
  
});

// Hybrid

Emitter.Hybrid = Hybrid = function HybridTarget(){
  this[target] = this;
  this[emitter] = this;
  
  this[active] = Su();
  this[state] = {};
  this[resolver] = {};
};

Hybrid.prototype = new Target();
Hybrid.prototype.constructor = Hybrid;

Object.defineProperties(Hybrid.prototype,bag);

// Auxiliar

function* setListened(event,emitter,yd){
  yield yd.before();
  emitter.set(event + ' listened');
}

Emitter.chain = function(){
  var last = arguments[arguments.length - 1][target],
      i;
  
  arguments[arguments.length - 1][target] = arguments[0][target];
  for(i = 0;i < arguments.length - 2;i++) arguments[i][target] = arguments[i + 1][target];
  arguments[arguments.length - 2][target] = last;
};

