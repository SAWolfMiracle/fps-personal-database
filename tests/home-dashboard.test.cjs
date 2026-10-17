const test=require('node:test'),assert=require('node:assert/strict'),home=require('../home-dashboard.js');
test('homepage counts duplicate catalog copies as one type without adding quantities',()=>{
 const rows=[{kind:'collection',game:'三角洲',catalog_item_id:'a',name:'A',target:2,n:1},{kind:'collection',game:'三角洲行动',catalog_item_id:'a',name:'A',target:2,n:1},{kind:'collection',game:'CS2',name:'B',target:1,n:0},{kind:'match',name:'match',n:1}];
 assert.deepEqual(home.progress(rows,r=>r.n),{total:2,owned:1,complete:0,missing:['A','B']});rows[1].n=2;assert.equal(home.progress(rows,r=>r.n).complete,1);
});
test('homepage settings preserve explicit hidden modules and sanitize pins',()=>{
 assert.deepEqual(home.settings(null),{matches:true,collections:true,pins:['阿萨拉牌']});assert.deepEqual(home.settings({matches:false,collections:false,pins:['A','A',null,'']}),{matches:false,collections:false,pins:['A']});assert.deepEqual(home.settings({pins:[]}).pins,[]);
});

test('theme membership uses catalog identity and a fixed denominator without adding duplicate quantities',()=>{
 const catalog=require('../collection-catalog.json');for(const t of home.themes){assert.ok(t.items.length>1);assert.equal(new Set(t.items.map(i=>i.id)).size,t.items.length);for(const item of t.items)assert.ok(catalog.items.some(i=>i.item_id===item.id&&i.name===item.name));}
 const items=home.theme('海盗钱币').items;const rows=[{kind:'collection',game:'三角洲',catalog_item_id:items[0].id,name:'重命名',target:2,n:1},{kind:'collection',game:'三角洲行动',catalog_item_id:items[0].id,target:2,n:1},{kind:'collection',game:'其他游戏',name:items[1].name,n:2}];const before=JSON.stringify(rows);let p=home.themeProgress('海盗钱币',rows,r=>r.n);assert.equal(p.total,3);assert.equal(p.complete,0);assert.equal(p.owned,1);rows[1].n=2;p=home.themeProgress('海盗钱币',rows,r=>r.n);assert.equal(p.complete,1);rows[1].n=1;assert.equal(JSON.stringify(rows),before);assert.equal(home.inTheme({...rows[0],collection_group:'普通库存'},'海盗钱币'),false);
});
test('home layout sanitizes stale keys and allows base modules and pins to interleave',()=>{
 const p=home.settings({pins:['A','B'],order:['pin:B','collections','unknown','pin:B','matches']});assert.deepEqual(home.layout(p),['pin:B','collections','matches','recent','pin:A']);assert.deepEqual(home.move(home.layout(p),'matches','pin:B'),['matches','pin:B','collections','recent','pin:A']);assert.deepEqual(home.layout(home.settings({...p,pins:['A']})),['collections','matches','recent','pin:A']);
});
function gesture(){
 let epoch=1,keys=['matches','collections','recent'],task=null,saves=0,fail=false;const events={},previews=[];const row={getAttribute:k=>k==='data-home-module'?'matches':null,classList:{add(){},remove(){}}},target={getAttribute:k=>k==='data-home-module'?'collections':null};target.closest=()=>target;
 const handle={getAttribute:()=> 'matches',closest:s=>s==='[data-home-drag]'?handle:row,hasPointerCapture:()=>false,setPointerCapture(){}};
 const root={ownerDocument:{defaultView:{setTimeout:f=>{task=f;return 1},clearTimeout:()=>{task=null},innerHeight:600,scrollBy(){}},elementFromPoint:()=>target},contains:()=>true,addEventListener:(n,f)=>{events[n]=f},removeEventListener:n=>{delete events[n]},getBoundingClientRect:()=>({top:0,bottom:500})};
 home.bindSort(root,{read:()=>({keys:keys.slice(),epoch}),preview:k=>previews.push(k.slice()),save:k=>{saves++;if(fail)return false;keys=k.slice();return true}});
 const fire=(name,x=50,y=110)=>events[name]({pointerId:7,button:0,target:handle,clientX:x,clientY:y,preventDefault(){}});
 return {fire,hold:()=>{if(task)task()},changeWorkspace:()=>{epoch++},fail:()=>{fail=true},get keys(){return keys},get saves(){return saves},previews};
}
test('long press pointer drag persists order only after hold and drop',()=>{
 const g=gesture();g.fire('pointerdown');g.hold();g.fire('pointermove');assert.equal(g.saves,0);g.fire('pointerup');assert.equal(g.saves,1);assert.deepEqual(g.keys,['collections','matches','recent']);
});
test('scrolling before hold, pointer cancellation and workspace changes do not save a drag',()=>{
 for(const mode of ['scroll','cancel','workspace']){const g=gesture();g.fire('pointerdown');if(mode==='scroll'){g.fire('pointermove',50,150);g.hold()}else{g.hold();g.fire('pointermove');if(mode==='cancel')g.fire('pointercancel');else g.changeWorkspace()}g.fire('pointerup');assert.equal(g.saves,0,mode);assert.deepEqual(g.keys,['matches','collections','recent']);}
});
test('failed drag persistence restores its original presentation',()=>{
 const g=gesture();g.fail();g.fire('pointerdown');g.hold();g.fire('pointermove');g.fire('pointerup');assert.equal(g.saves,1);assert.deepEqual(g.previews.at(-1),['matches','collections','recent']);
});

function smoothGesture(reduce=false){
 const frames=new Map(),timers=new Map(),children=new Set(),scrolls=[],animations=[];let counter=0,epoch=1,keys=['matches','collections','recent'],visual=keys.slice(),saves=0,fail=false;
 const classes=()=>{const values=new Set();return {add:x=>values.add(x),remove:x=>values.delete(x),has:x=>values.has(x)}};
 const row=(key)=>({classList:classes(),style:{},getAttribute:n=>n==='data-home-module'?key:null,closest(){return this},getBoundingClientRect(){const top=100+visual.indexOf(key)*120;return {left:20,top,bottom:top+100,width:300,height:100}},cloneNode(){const ghost={style:{},classList:classes(),removed:[],querySelectorAll:()=>[{removeAttribute:n=>ghost.removed.push('child:'+n)}],removeAttribute:n=>ghost.removed.push(n),setAttribute(){},remove(){children.delete(ghost)},animate(steps,config){animations.push({steps,config});return {finished:Promise.resolve()}}};return ghost}});
 const a=row('matches'),b=row('collections'),handle={getAttribute:()=> 'matches',closest:s=>s==='[data-home-drag]'?handle:a,setPointerCapture(){},hasPointerCapture:()=>false};
 const win={innerHeight:700,matchMedia:()=>({matches:reduce}),setTimeout:f=>{timers.set(++counter,f);return counter},clearTimeout:id=>timers.delete(id),requestAnimationFrame:f=>{frames.set(++counter,f);return counter},cancelAnimationFrame:id=>frames.delete(id),scrollBy:(x,y)=>scrolls.push(y)};
 const events={},root={contains:()=>true,getBoundingClientRect:()=>({top:0,bottom:1000}),ownerDocument:{defaultView:win,body:{appendChild:g=>children.add(g)},elementFromPoint:()=>b},addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]};
 home.bindSort(root,{read:()=>({keys:keys.slice(),epoch}),preview:k=>{visual=k.slice()},save:k=>{saves++;if(fail)return false;keys=k.slice();return true}});
 return {fire:(n,x=50,y=150)=>events[n]({pointerId:3,button:0,target:handle,clientX:x,clientY:y,preventDefault(){}}),hold(){const tasks=[...timers.values()];timers.clear();tasks.forEach(f=>f())},frame(t=16){const jobs=[...frames.values()];frames.clear();jobs.forEach(f=>f(t))},changeWorkspace:()=>epoch++,fail:()=>fail=true,cleanup:()=>root._fpsSortCleanup(),children,frames,scrolls,animations,get keys(){return keys},get visual(){return visual},get saves(){return saves}};
}
test('drag overlay follows the pointer on animation frames and lands without duplicate IDs',async()=>{
 const g=smoothGesture();g.fire('pointerdown');g.hold();assert.equal(g.children.size,1);const ghost=[...g.children][0];assert.ok(ghost.removed.includes('id'));assert.ok(ghost.removed.includes('data-home-module'));assert.ok(ghost.removed.includes('child:id'));assert.equal(ghost.inert,true);
 g.fire('pointermove',60,280);g.frame();assert.match(ghost.style.transform,/translate3d\(10px,130px,0\)/);assert.deepEqual(g.visual,['collections','matches','recent']);g.frame(32);assert.deepEqual(g.visual,['collections','matches','recent']);g.fire('pointerup',60,280);assert.equal(g.saves,1);assert.equal(g.frames.size,0);assert.equal(g.animations[0].config.duration,180);await Promise.resolve();assert.equal(g.children.size,0);
});
test('drag auto-scroll continues between pointer events and cancellation removes transient state',()=>{
 const g=smoothGesture();g.fire('pointerdown');g.hold();g.fire('pointermove',50,670);g.frame(16);g.frame(32);assert.equal(g.scrolls.length,2);assert.ok(g.scrolls.every(n=>n>0));g.fire('pointercancel');assert.equal(g.children.size,0);assert.equal(g.frames.size,0);assert.equal(g.saves,0);assert.deepEqual(g.visual,['matches','collections','recent']);
});
test('failed smooth drops and mid-drag workspace changes restore layout and remove overlays',async()=>{
 const g=smoothGesture();g.fail();g.fire('pointerdown');g.hold();g.fire('pointermove',60,280);g.frame();g.fire('pointerup',60,280);assert.deepEqual(g.visual,['matches','collections','recent']);await Promise.resolve();assert.equal(g.children.size,0);
 const changed=smoothGesture();changed.fire('pointerdown');changed.hold();changed.changeWorkspace();changed.frame();assert.equal(changed.children.size,0);assert.equal(changed.frames.size,0);assert.equal(changed.saves,0);
 const disposed=smoothGesture();disposed.fire('pointerdown');disposed.hold();disposed.cleanup();assert.equal(disposed.children.size,0);assert.equal(disposed.frames.size,0);
});
test('reduced-motion drag keeps direct manipulation but skips lift scaling and landing animation',()=>{
 const g=smoothGesture(true);g.fire('pointerdown');g.hold();const ghost=[...g.children][0];assert.match(ghost.style.transform,/scale\(1\)/);g.fire('pointermove',60,280);g.frame();g.fire('pointerup',60,280);assert.equal(g.animations.length,0);assert.equal(g.children.size,0);assert.equal(g.saves,1);
});
test('order preview animates neighbouring slots while leaving the dragged placeholder unanimated',()=>{
 const fs=require('fs'),vm=require('vm'),html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');const source=html.slice(html.indexOf('function applyHomeOrder('),html.indexOf('\nfunction addThemeCatalog('));const calls=[];
 const make=(key,initial)=>({style:{order:String(initial)},getAttribute:n=>n==='data-home-module'?key:null,getBoundingClientRect(){return {left:0,top:Number(this.style.order)*120,width:300,height:100}},animate(steps,config){calls.push({key,steps,config});return {cancel(){}}}});
 const nodes=[make('matches',0),make('collections',1)],ctx={document:{querySelectorAll:()=>nodes},window:{matchMedia:()=>({matches:false})}};vm.createContext(ctx);vm.runInContext(source,ctx);ctx.applyHomeOrder(['collections','matches'],{animate:true,dragKey:'matches'});assert.equal(calls.length,1);assert.equal(calls[0].key,'collections');assert.match(calls[0].steps[0].transform,/120px/);assert.equal(calls[0].config.duration,210);
});
