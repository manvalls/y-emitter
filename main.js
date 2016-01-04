var define = require('u-proto/define'),
    Resolver = require('y-resolver'),
    Yielded = Resolver.Yielded,
    walk = require('y-walk'),
    Detacher = require('detacher'),

    resolver = Symbol(),
    status = Symbol(),
    target = Symbol(),
    emitter = Symbol(),
    current = Symbol(),

    bag;

// Emitter

function Emitter(){
  this[target] = new Target();
  this[target][emitter] = this;
};

Emitter.prototype[define](bag = {

  get target(){ return this[target]; },

  give: function(event,data){
    if(this.target.is(event)) return this.set(event,data);
    giveIt(this,event,data);
  },

  set: function(event,data){
    this[target][status].set(event,Resolver.accept(data));
    giveIt(this,event,data);
  },

  unset: function(event){
    this[target][status].delete(event);
  },

  sun: function(state1,state2){
    this.unset(state2);
    this.set(state1);
  }

});

function giveIt(em,event,data){
  var tg = em[target],
      rs = tg[resolver],
      res = rs.get(event),
      c;

  if(res){
    rs.delete(event);

    if(typeof event == 'string'){
      c = tg[current];

      c[event] = c[event] || 0;
      c[event]++;

      res.accept(data);

      if(!--c[event]){
        delete c[event];
        if(!rs.has(event)) em.give(tg.eventIgnored,event);
      }

    }else res.accept(data);

  }

}

// Target

function Target(prop){
  if(this[resolver]) return;

  if(prop){
    this[emitter] = this[prop] = Object.create(Emitter.prototype);
    this[emitter][target] = this;
  }

  this[resolver] = new Map();
  this[status] = new Map();
  this[current] = Object.create(null);
}

Target.prototype[define]({

  until: function(event){
    var yd = this[status].get(event);

    if(yd) return yd;
    return this.untilNext(event);
  },

  untilNext: function(event){
    var rs = this[resolver],
        res = rs.get(event);

    if(res) return res.yielded;

    rs.set(event,res = new Resolver());
    if(typeof event == 'string' && !this[current][event])
      this[emitter].give(this.eventListened,event);

    return res.yielded;
  },

  listened: function(event){
    return this[resolver].has(event);
  },

  is: function(event){
    var yd = this[status].get(event);
    return !!(yd && yd.accepted);
  },

  isNot: function(event){
    var yd = this[status].get(event);
    return !(yd && yd.accepted);
  },

  walk: function(generator,args){
    walk(generator,args,this);
  },

  on: function(){
    var event = arguments[0],
        listener = arguments[1],
        dArgs = [],
        d = new Detacher(pauseIt,dArgs);

    arguments[1] = d;
    walk(onLoop,[arguments,event,listener,this,dArgs]);

    return d;
  },

  once: function(){
    var event = arguments[0],
        listener = arguments[1],
        dArgs = [],
        d = new Detacher(pauseIt,dArgs);

    arguments[1] = d;
    walk(onceLoop,[arguments,event,listener,this,dArgs]);

    return d;
  },

  events: function(){
    return strings(this[resolver].keys());
  },

  eventListened: Symbol(),
  eventIgnored: Symbol(),
  ['3asKNsYzcdGduft']: 57

});

// - utils

function pauseIt(w){
  w.pause();
}

function* strings(it){
  for(var v of it) if(typeof v == 'string') yield v;
}

function call(args,listener,tg){
  try{ walk(listener,args,tg); }
  catch(e){ }
}

// -- on

function* onLoop(args,event,listener,tg,dArgs){
  var yd;

  dArgs[0] = this;
  args[0] = yield tg.until(event);
  yd = tg.untilNext(event);

  while(true){
    call(args,listener,tg);
    args[0] = yield yd;
    yd = tg.untilNext(event);
  }

}

// -- once

function* onceLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;
  args[0] = yield tg.until(event);
  call(args,listener,tg);
}

// HybridTarget

function HybridTarget(){
  this[target] = this;
  this[emitter] = this;
  Target.call(this);
}

HybridTarget.prototype = Object.create(Target.prototype);
HybridTarget.prototype[define]('constructor',HybridTarget);
HybridTarget.prototype[define](bag);

/*/ exports /*/

module.exports = Emitter;
Emitter.Target = Target;
Emitter.Hybrid = HybridTarget;
