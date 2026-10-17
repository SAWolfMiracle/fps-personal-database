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
