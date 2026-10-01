import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const allocator = readFileSync('site/js/italian-pack-experiment.js', 'utf8');
function assign(current, random=0, cookie='', search='') {
 const document={currentScript:{getAttribute:()=>current}};
 Object.defineProperty(document,'cookie',{get:()=>cookie,set:v=>{cookie=v.split(';')[0];}});
 const window={crypto:{getRandomValues:b=>b.fill(random)}};
 let destination;
 vm.runInNewContext(allocator,{window,document,URLSearchParams,Uint8Array,navigator:{userAgent:'test visitor'},location:{hostname:'riccisausage.com',search,hash:'#box',replace:v=>destination=v}});
 return {context:window.RicciItalianPackExperiment,cookie,destination};
}
test('draft designs never allocate or track, including production without preview flag',()=>{
 for(const variant of ['minimal','butcher','table']) {
  const result=assign(variant);
  assert.equal(result.context.preview,true);
  assert.equal(result.context.active,false);
  assert.equal(result.destination,undefined);
  assert.equal(result.cookie,'');
 }
});
test('three live allocations and saved assignments remain unchanged',()=>{
 for(const [n,variant] of ['control','free','grill-pan'].entries()) {
  const result=assign('control',n,'','?utm_source=facebook');
  assert.equal(result.context.variant,variant);
  if(n) assert.match(result.destination,/\?utm_source=facebook#box$/);
  assert.equal(assign(variant,0,result.cookie).context.active,true);
 }
 assert.equal(assign('control',0,'','?preview=1').context.active,false);
});
const videoCode=readFileSync('site/js/pack-videos.js','utf8');
async function players(reduced=false, native=false) {
 const observers=[],items=[],handlers={};
 const element=()=>({setAttribute(){},addEventListener(name,fn){this[name]=fn;},remove(){},appendChild(child){(this.children ||= []).push(child);},classList:{add(){},remove(){}}});
 const boxes=['uvGXhziw7zI','rTCpX1q99A8'].map(id=>({ ...element(),getAttribute:name=>name==='data-youtube-id'?id:(name==='data-video-title'?'Process video':(name==='data-video-src' && native ? '/test.mp4' : null)),querySelector(){return null;},appendChild(child){this.child=child;}}));
 const document={visibilityState:'visible',querySelectorAll:()=>boxes,createElement:(tag)=>{
 if(tag!=='video') return element();
 const video={...element(),calls:[],play(){this.calls.push('play');return Promise.resolve();},pause(){this.calls.push('pause');}};
 items.push(video); return video;
 },head:{appendChild(){}},addEventListener:(name,fn)=>handlers[name]=fn};
 class Player {
  constructor(slot,options){this.options=options;this.calls=[];items.push(this);}
  mute(){this.calls.push('mute');} unMute(){this.calls.push('unmute');} setVolume(){} playVideo(){this.calls.push('play');} pauseVideo(){this.calls.push('pause');} getIframe(){return element();}
 }
 const window={YT:{Player},matchMedia:()=>({matches:reduced}),IntersectionObserver:true};
 class Observer {constructor(fn){this.fn=fn;observers.push(this);} observe(){} unobserve(){}}
 vm.runInNewContext(videoCode,{window,document,location:{origin:'https://riccisausage.com'},IntersectionObserver:Observer,Promise});
 observers[0].fn(boxes.map(target=>({target,isIntersecting:true})));
 await Promise.resolve();
 if(!native) for(const player of items) player.options.events.onReady({target:player});
 const visibility=(index,ratio)=>observers[1].fn([{target:boxes[index],intersectionRatio:ratio}]);
 return {items,boxes,document,handlers,visibility};
}
test('one muted autoplay; centered overlay yields to standard YouTube controls',async()=>{
 const p=await players();
 assert.equal(p.items[0].options.videoId,'uvGXhziw7zI');
 assert.equal(p.items[1].options.videoId,'rTCpX1q99A8');
 assert.equal(p.items[0].options.playerVars.controls,1);
 p.visibility(0,1); p.visibility(1,1);
 assert.ok(!p.items[1].calls.includes('play'));
 assert.equal(p.items[0].calls.at(-1),'play');
 assert.equal(p.boxes[0].child.textContent,'Click to unmute');
 assert.equal(p.boxes[0].child.hidden,false);
 p.boxes[0].child.click();
 assert.ok(p.items[0].calls.includes('unmute'));
 assert.equal(p.boxes[0].child.hidden,true);
 p.boxes[1].child.click();
 assert.ok(p.items[1].calls.includes('unmute'));
 assert.equal(p.boxes[1].child.hidden,true);
 assert.equal(p.items[0].calls.at(-1),'mute');
 p.document.visibilityState='hidden'; p.handlers.visibilitychange();
 assert.equal(p.items[1].calls.at(-1),'mute');
 // Returning to the page must not restart an engaged video automatically.
 const count=p.items[0].calls.filter(call=>call==='play').length;
 p.document.visibilityState='visible'; p.handlers.visibilitychange();
 assert.equal(p.items[0].calls.filter(call=>call==='play').length,count);
});
test('reduced motion and blocked autoplay retain the same unmute overlay',async()=>{
 const p=await players(true); p.visibility(0,1);
 assert.ok(!p.items[0].calls.includes('play'));
 assert.equal(p.boxes[0].child.textContent,'Click to unmute');
 p.boxes[0].child.click();
 assert.equal(p.items[0].calls.at(-1),'play');
 assert.equal(p.boxes[0].child.hidden,true);
 const q=await players(); q.items[0].options.events.onAutoplayBlocked();
 assert.equal(q.boxes[0].child.textContent,'Click to unmute');
 assert.equal(q.boxes[0].child.hidden,false);
});
test('native files reveal regular browser controls on unmute',async()=>{
 const p=await players(false,true);
 assert.equal(p.items[0].src,'/test.mp4');
 assert.equal(p.items[0].controls,false);
 p.visibility(0,1); p.visibility(1,1);
 assert.ok(!p.items[1].calls.includes('play'));
 p.boxes[1].child.click();
 assert.equal(p.items[1].controls,true);
 assert.equal(p.items[1].muted,false);
 assert.equal(p.boxes[1].child.hidden,true);
 assert.equal(p.items[0].calls.at(-1),'pause');
});
