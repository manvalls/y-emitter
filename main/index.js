var Resolver = require('y-resolver'),
    walk = require('y-walk'),
    Yielded = Resolver.Yielded,
    Target = require('./Target'),

    resolver = Symbol(),
    nResolver = Symbol(),
    status = Symbol(),
    target = Symbol(),
    emitter = Symbol(),
    queue = Symbol(),
    queuing = Symbol(),
    nQueue = Symbol(),
    nQueuing = Symbol(),
    current = Symbol(),
    nCurrent = Symbol();

class Emitter{

  static get Target(){ return EmittedTarget; }

  static get Hybrid(){ return HybridTarget; }

  constructor(e, t){

    if(e){
      this[emitter] = e;
      this[target] = t;
    }else{
      this[target] = new EmittedTarget();
      this[target][emitter] = this;

      this[queuing] = false;
      this[queue] = [];

      this[nQueuing] = false;
      this[nQueue] = [];
    }

  }

  get target(){ return this[target]; }

  give(event, data){
    if(this[emitter]) return this[emitter].give(event, data);
    give(this.target.giveCall, arguments, this, resolver, queue, queuing, current);
    give(event, data, this, resolver, queue, queuing, current);
  }

  queue(event, data){

    if(this[emitter]) return this[emitter].queue(event, data);

    Yielded.get(
      this.target.until(event).listeners.gt(0)
    ).listen(this.give, [event, data], this);

  }

  set(state, data){
    var yd;

    if(this[emitter]) return this[emitter].set(state, data);
    give(this.target.setCall, arguments, this, resolver, queue, queuing, current);

    yd = Resolver.when(data);

    if(!yd.done){
      yd.listen(this.set, [state, data], this);
      return;
    }

    if(!yd.accepted) return;
    this[target][status].set(state, yd);
    give(state, yd, this, resolver, queue, queuing, current);
  }

  unset(state){
    if(this[emitter]) return this[emitter].unset(state);
    if(!this.target.is(state)) return;
    give(this.target.unsetCall, arguments, this, resolver, queue, queuing, current);

    this.target[status].delete(state);
    give(state, null, this, nResolver, nQueue, nQueuing, nCurrent);
  }

  sun(newState, oldState, newData){
    this.unset(oldState);
    this.set(newState, newData);
  }

  bind(){ return require('./bind').apply(this, arguments); }
  get [Symbol.for('ebjs/label')](){ return 58; }

}

// Emitter helpers

function give(event, data, that, rs, queue, queuing, current){
  var res, yd, q, listened;

  yd = Resolver.when(data);

  if(!yd.done){
    yd.listen(give, [event, yd, that, rs, queue, queuing, current]);
    return;
  }

  if(!yd.accepted) return;

  if(that[queuing]){
    that[queue].push([event, data]);
    return;
  }

  that[queuing] = true;
  that.target[current] = event;
  listened = that.target.listened(event);

  res = that.target[rs].get(event);
  if(res){
    that.target[rs].delete(event);
    res.accept(yd.value);
  }

  delete that.target[current];
  that[queuing] = false;

  if(rs == resolver && typeof event == 'string' && listened && !that.target.listened(event)){
    give(that.target.eventIgnored, event, that, rs, queue, queuing, current);
  }

  q = that[queue];
  that[queue] = [];
  for(let [event, data] of q) give(event, data, that, rs, queue, queuing, current);

}

// Target

class EmittedTarget extends Target{

  constructor(prop){

    super();

    if(prop){
      this[emitter] = this[prop] = new Emitter();
      this[emitter][target] = this;
    }

    this[resolver] = new Map();
    this[nResolver] = new Map();
    this[status] = new Map();

  }

  until(event){
    var yd = this[status].get(event);

    if(yd) return yd;
    return this.untilNext(event);
  }

  untilNot(event){
    var res;

    if(this.isNot(event)) return Resolver.accept();
    if(!this[nResolver].has(event)) this[nResolver].set(event, res = new Resolver());
    else res = this[nResolver].get(event);

    return res.yielded;
  }

  untilNext(event){
    var rs = this[resolver],
        res = rs.get(event);

    if(res) return res.yielded;
    rs.set(event, res = new Resolver());

    if(typeof event == 'string') walk(processYielded, [res.yielded, this, event]);
    return res.yielded;
  }

  listened(event){
    var res = this[resolver].get(event);
    if(!res) return false;
    return res.yielded.listeners.value > 0;
  }

  is(event){
    var yd = this[status].get(event);
    return !!(yd && yd.accepted);
  }

  isNot(event){
    var yd = this[status].get(event);
    return !(yd && yd.accepted);
  }

  events(){
    return filterEvents(this[resolver].keys(), this);
  }

}

// Target Helpers

function* processYielded(yd, target, event){

  while(true){

    yield yd.listeners.gt(0);
    if(!target.listened(event)) return;
    if(target[current] !== event){
      give(target.eventListened, event, target[emitter], resolver, queue, queuing, current);
    }

    yield yd.listeners.is(0);
    if(target.listened(event)) return;
    if(target[current] !== event){
      give(target.eventIgnored, event, target[emitter], resolver, queue, queuing, current);
    }

  }

}

function* filterEvents(events, target){
  var event;
  for(event of events) if(typeof event == 'string' && target.listened(event)) yield event;
}

// Hybrid

class HybridTarget extends Target{

  constructor(e){
    super();
    e = e || new Emitter();
    this[emitter] = e;
    this[target] = e.target;
  }

  until(){ return this[target].until(...arguments); }
  untilNot(){ return this[target].untilNot(...arguments); }
  untilNext(){ return this[target].untilNext(...arguments); }
  listened(){ return this[target].listened(...arguments); }
  is(){ return this[target].is(...arguments); }
  isNot(){ return this[target].isNot(...arguments); }
  events(){ return this[target].events(...arguments); }

  give(){ return this[emitter].give(...arguments); }
  queue(){ return this[emitter].queue(...arguments); }
  set(){ return this[emitter].set(...arguments); }
  unset(){ return this[emitter].unset(...arguments); }
  sun(){ return this[emitter].sun(...arguments); }
  bind(){ return this[emitter].bind(...arguments); }

  get target(){ return this[target]; }
  get [Symbol.for('ebjs/label')](){ return 59; }

}

/*/ exports /*/

module.exports = Emitter;
