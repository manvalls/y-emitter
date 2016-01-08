var t = require('u-test'),
    assert = require('assert'),
    Emitter = require('../main.js');

t('Events',function*(){
  var emitter = new Emitter(),
      target = emitter.target,
      event = Symbol(),
      yd;

  yd = target.until(event);
  emitter.give(event,'bar');
  assert.strictEqual(yield yd,'bar');

  emitter.queue(event,'foo');
  assert.strictEqual(yield target.until(event),'foo');
});

t('States',function*(){
  var emitter = new Emitter.Hybrid(),
      target = emitter,
      yd,yd2;

  emitter.set('foo','bar');
  assert.strictEqual(yield target.until('foo'),'bar');

  emitter.give('foo','foo');
  assert.strictEqual(yield target.until('foo'),'foo');

  emitter.queue('foo','bar');
  assert.strictEqual(yield target.until('foo'),'bar');

  yield target.untilNot('bar');
  yd = target.untilNot('foo');
  yd2 = target.untilNot('foo');

  emitter.sun('bar','foo');
  yield yd;
  yield yd2;

  yield target.walk(function*(){
    assert(this.isNot('foo'));
    assert(!this.is('foo'));
    assert(this.is('bar'));
    assert(!this.isNot('bar'));
    assert.strictEqual(yield this.until('bar'),undefined);
  });

});

t('on',function*(){
  var emitter = new Emitter(),
      target = emitter.target,
      n = 0,
      last,arg,rn,tn,k;

  target.on('foo',function(event,d,a){
    last = event;
    arg = a;
    n++;
  },42);

  Emitter.Target.call(target); // noop

  emitter.set('foo','bar');
  assert.strictEqual(last,'bar');
  assert.strictEqual(yield target.until('foo'),'bar');
  assert.strictEqual(arg,42);
  assert.strictEqual(n,1);

  emitter.give('foo','foo');
  assert.strictEqual(last,'foo');
  assert.strictEqual(yield target.until('foo'),'foo');
  assert.strictEqual(arg,42);
  assert.strictEqual(n,2);

  emitter.unset('foo');
  emitter.unset('foo');
  emitter.give('foo','bar');
  assert.strictEqual(last,'bar');
  assert.strictEqual(arg,42);
  assert.strictEqual(n,3);

  tn = 0;
  target.on('recursive',function(n){
    tn = n;
    if(n < 50) emitter.give('recursive',n + 1);
  });

  target.once('recursive',function(n){
    rn = n;
    k = tn;
  });

  emitter.give('recursive',0);
  assert.strictEqual(tn,50);
  assert.strictEqual(rn,0);
  assert.strictEqual(k,0);

});

t('once',function(){
  var target = new Emitter.Target('emitter'),
      emitter = target.emitter,
      n = 0,
      last,arg;

  target.once('foo',function(event,d,a){
    last = event;
    arg = a;
    n++;
  },42);

  emitter.give('foo','bar');
  assert.strictEqual(last,'bar');
  assert.strictEqual(arg,42);
  assert.strictEqual(n,1);

  emitter.give('foo','foo');
  assert.strictEqual(last,'bar');
  assert.strictEqual(arg,42);
  assert.strictEqual(n,1);
});

t('eventListened / eventIgnored',function(){
  var target = new Emitter.Hybrid(),
      emitter = target,
      listened = false,
      ignored = true,
      event = 'test event',
      called = false,
      el = 0,
      ei = 0,
      d,e;

  target.on(target.eventListened,function(){
    listened = true;
    ignored = false;
    el++;
  });

  target.on(target.eventIgnored,function(){
    listened = false;
    ignored = true;
    ei++;
  });

  assert(!listened);
  assert(ignored);
  assert.strictEqual(el,0);
  assert.strictEqual(ei,0);

  d = target.on(event,function(){ called = true; });
  assert(listened);
  assert(!ignored);
  assert(target.listened(event));
  assert(!target.listened(Symbol()));

  for(e of target.events()) assert.strictEqual(e,event);
  assert.strictEqual(el,1);
  assert.strictEqual(ei,0);

  d.detach();
  assert(!listened);
  assert(ignored);
  assert(!called);
  assert.strictEqual(el,1);
  assert.strictEqual(ei,1);

  el = 0;
  ei = 0;

  target.once(event,function(){
    d = target.once(event,function(){ });
    d.detach();
    target.once(event,function(){ });
    emitter.give(event);
  });

  assert.strictEqual(el,1);
  assert.strictEqual(ei,0);
  emitter.give(event);
  assert.strictEqual(el,1);
  assert.strictEqual(ei,1);
});

t('Bind',function*(){
  var emitter = new Emitter(),
      target = emitter.target,
      emitter2 = new Emitter(),
      target2 = emitter2.target,
      d,yd,test;

  target.on('test',function(){
    test = true;
  });

  d = emitter.bind(target2);
  emitter2.queue('foo','bar');
  target.once(target.eventIgnored,function*(event){
    yield target.until('foo');
  });

  assert.strictEqual(yield target.until('foo'),'bar');
  emitter2.give('test');
  yield target.until('test');
  assert(test);

  emitter2.set('lorem ipsum');
  yield target.until('lorem ipsum');
  emitter2.set('lorem ipsum',42);
  assert.strictEqual(yield target.until('lorem ipsum'),42);
  emitter2.unset('lorem ipsum');
  yield target.untilNot('lorem ipsum');
  emitter2.set('ready');
  yield target.until('ready');

  d.detach();
  emitter2.unset('ready');
  yield target.until('ready');

});

t('Delegation',function*(){
  var src = new Emitter(),
      dst = new Emitter(),
      emitter = new Emitter(dst,src.target),
      target = emitter.target;

  emitter.queue('foo');
  yield dst.target.until('foo');
  emitter.give('bar');
  yield dst.target.until('bar');
  emitter.set('ready');
  assert(dst.target.is('ready'));
  emitter.unset('ready');
  assert(dst.target.isNot('ready'));

  src.queue('foo');
  yield target.until('foo');

});
