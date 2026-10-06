const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan}=require('../collection-catalog.js');
const catalog={id:'delta-force-collectibles',game:'三角洲行动',retrieved_at:'2026-10-07',source_url:'https://example.com/catalog',items:[{item_id:'orzice:p100',name:'测试大红',grade:6,category:'工艺藏品'},{item_id:'orzice:p200',name:'测试小金',grade:5,category:'电子物品'}]};
let counter=0;const id=()=>`id-${++counter}`;
test('one click adds every catalog entry as unowned, with no fabricated acquisition history',()=>{
 const result=plan(catalog,[],id);assert.equal(result.added.length,2);assert.equal(result.skipped,0);
 for(const r of result.added){assert.equal(r.kind,'collection');assert.equal(r.target,1);assert.equal(r.starting_quantity,0);assert.deepEqual(r.acquisitions,[]);assert.equal(r.catalog_source,catalog.source_url)}
 assert.equal(plan(catalog,result.added,id).added.length,0);
});
test('existing quantities, customized names and acquisition history are preserved; other games stay separate',()=>{
 const owned={kind:'collection',game:'Delta Force',name:'我的自定义物品名',catalog_item_id:'orzice:p100',starting_quantity:3,acquisitions:[{quantity:2}],note:'保留备注'};
 const existing=[owned,{kind:'collection',game:'三角洲行动',name:'测试小金',acquisitions:[]},{kind:'collection',game:'其他游戏',name:'测试大红'}];const before=JSON.stringify(existing);
 const result=plan(catalog,existing,id);assert.equal(result.skipped,2);assert.equal(result.added.length,0);assert.equal(JSON.stringify(existing),before);
 assert.equal(plan(catalog,[existing[2]],id).added.length,2);
});
test('quality filtering and validation prevent partial bad catalog imports',()=>{
 const result=plan(catalog,[],id,undefined,'6');assert.equal(result.added.length,1);assert.equal(result.added[0].catalog_grade,6);
 assert.throws(()=>plan({...catalog,items:[catalog.items[0],{object_id:'oops'}]},[],id));assert.throws(()=>plan({...catalog,items:[catalog.items[0],catalog.items[0]]},[],id));
});
