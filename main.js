var Su = require('u-su'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    
    state = Su(),
    resolver = Su(),
    target = Su(),
    emitter = Su(),
    
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
      res.accept(data);
      this.unset(event + ' listened');
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
    this.unset(event + ' listened');
    
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
      this[emitter].set(event + ' listened');
    }
    
    return res.yielded;
    
  }},
  
  is: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.accepted);
  }},
  
  failed: {value: function(event){
    return !!(this[resolver][event] && this[resolver][event].yielded.rejected);
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

// Auxiliar

Emitter.chain = function(){
  var last = arguments[arguments.length - 1][target],
      i;
  
  arguments[arguments.length - 1][target] = arguments[0][target];
  for(i = 0;i < arguments.length - 2;i++) arguments[i][target] = arguments[i + 1][target];
  arguments[arguments.length - 2][target] = last;
};

