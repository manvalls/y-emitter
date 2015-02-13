var Su = require('u-su'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    
    state = Su(),
    resolver = Su(),
    target = Su(),
    
    bag,
    
    Emitter,
    Target,
    Hybrid;

// Emitter

module.exports = Emitter = function Emitter(Constructor){
  Constructor = Constructor || Target;
  this[target] = new Constructor();
};

Object.defineProperties(Emitter.prototype,bag = {
  
  target: {get: function(){ return this[target]; }},
  
  give: {value: function(event,data){
    var res = this[target][resolver][event];
    
    if(res && !res.yielded.done){
      delete this[target][resolver][event];
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
    
    (this[target][resolver][event] = this[target][resolver][event] || new Resolver()).accept(data);
    
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

Emitter.Target = Target = function Target(){
  this[state] = {};
  this[resolver] = {};
};

Object.defineProperties(Target.prototype,{
  
  walk: {value: function(generator,args){
    walk(generator,args,this);
  }},
  
  until: {value: function(event){
    
    this[resolver][event] = this[resolver][event] || new Resolver();
    return this[resolver][event].yielded;
    
  }},
  
  is: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  failed: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }}
  
});

// Hybrid

Emitter.Hybrid = Hybrid = function HybridTarget(){
  this[target] = this;
  this[state] = {};
  this[resolver] = {};
};

Hybrid.prototype = new Target();
Object.defineProperties(Hybrid.prototype,bag);
