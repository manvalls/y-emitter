var define = require('u-proto/define'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    Detacher = require('detacher'),

    resolver = Symbol(),
    status = Symbol(),
    target = Symbol(),
    emitter = Symbol(),
    current = Symbol(),

    isYd = Resolver.isYd,
    defer = Resolver.defer,

    bag,call;

// Emitter

function Emitter(){
  this[target] = new Target();
  this[target][emitter] = this;
};

Emitter.prototype[define](bag = {

  get target(){ return this[target]; },

  give: function(event,data){
    var tg = this[target],
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

        if(!--c[event]) delete c[event];

        if(!rs.has(event)) this.give(tg.eventIgnored,event);
      }else res.accept(data);

    }

  },

  throw: function(event,error){
    var tg = this[target],
        rs = tg[resolver],
        res = rs.get(event);

    if(res){
      rs.delete(event);
      res.reject(error);

      if(!rs.has(event) && typeof event == 'string') this.give(tg.eventIgnored,event);
    }

  },

  set: function(event,data){
    this[target][status].set(event,Resolver.accept(data));
    this.give(event,data);
  },

  hold: function(event,error){
    this[target][status].set(event,Resolver.reject(error));
    this.throw(event,error);
  },

  unset: function(event){
    this[target][status].delete(event);
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

  hasFailed: function(event){
    var yd = this[status].get(event);
    return !!(yd && yd.rejected);
  },

  hasNotFailed: function(event){
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
  eventIgnored: Symbol()

});

// - utils

function pauseIt(w){
  w.pause();
}

function* strings(it){
  for(var v of it) if(typeof v == 'string') yield v;
}

call = walk.wrap(function*(args,listener,tg){
  var e = args[0];

  try{
    if(e && (e[isYd] || e[defer])) args[0] = yield e;
    walk(listener,args,tg);
  }catch(e){ }

});

// -- on

function* onLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;

  try{
    args[0] = yield tg.until(event);
    call(args,listener,tg);
  }catch(e){}

  while(true){
    try{
      args[0] = yield tg.untilNext(event);
      call(args,listener,tg);
    }catch(e){}
  }

}

function* onErrorLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;

  try{ yield tg.until(event); }
  catch(e){
    args[0] = e;
    call(args,listener,tg);
  }

  while(true){
    try{ yield tg.untilNext(event); }
    catch(e){
      args[0] = e;
      call(args,listener,tg);
    }
  }

}

// -- once

function* onceLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;

  try{
    args[0] = yield tg.until(event);
    call(args,listener,tg);
  }catch(e){
    loop: while(true){
      try{
        args[0] = yield tg.untilNext(event);
        call(args,listener,tg);
        break loop;
      }catch(e){}
    }
  }

}

function* onceErrorLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;

  try{
    yield tg.until(event);

    loop: while(true){
      try{ yield tg.untilNext(event); }
      catch(e){
        args[0] = e;
        call(args,listener,tg);
        break loop;
      }
    }

  }catch(e){
    args[0] = e;
    call(args,listener,tg);
  }

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
