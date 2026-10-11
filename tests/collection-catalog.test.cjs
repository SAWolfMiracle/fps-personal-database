const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan}=require('../collection-catalog.js');
const {group,deckProgress}=require('../collection-catalog.js');
const inventory=require('../inventory.js');
const {acquisitionGuide}=require('../collection-catalog.js');
test('official model acquisition routes respect the announced Shanghai time window and stable identities',()=>{
 const record={game:'Delta Force',catalog_item_id:'orzice:p1628',name:'自定义德小兰',starting_quantity:4,acquisitions:[{quantity:2}]};const before=JSON.stringify(record);
 let guide=acquisitionGuide(record,Date.parse('2026-10-15T23:59:59+08:00'));assert.equal(guide.status,'尚未开放');assert.match(guide.text,/嘉奖箱/);assert.match(guide.text,/概率/);assert.match(guide.source,/steamcommunity/);
 assert.equal(acquisitionGuide(record,Date.parse('2026-10-16T00:00:00+08:00')).status,'公告开放期内；以游戏内为准');
 assert.equal(acquisitionGuide(record,Date.parse('2027-01-21T02:00:00+08:00')).status,'活动已结束；历史途径');
 guide=acquisitionGuide({game:'三角洲行动',name:'德小兰·灰鲭鲨模型'});assert.match(guide.summary,/组装/);assert.match(guide.text,/不会自动合成或扣除/);assert.equal(JSON.stringify(record),before);
});
test('manual acquisition guidance is labelled unverified and unrelated games never receive Delta Force guides',()=>{
 const guide=acquisitionGuide({game:'三角洲行动',name:'德小兰',obtain_method:'朋友赠送'});assert.equal(guide.summary,'个人补充');assert.equal(guide.status,'未独立核实');assert.equal(guide.text,'朋友赠送');assert.equal(guide.source,'');
 assert.equal(acquisitionGuide({game:'其他游戏',name:'德小兰'}).status,'待核实');assert.equal(acquisitionGuide({game:'三角洲行动',name:'不存在的物品'}).status,'待核实');
});
test('special collections distinguish cards, box, ordinary poker and other games without mutating records',()=>{
 const records=plan(require('../collection-catalog.json'),[],()=>String(++counter)).added;
 const before=JSON.stringify(records);assert.equal(records.filter(r=>group(r)==='阿萨拉牌').length,55);
 assert.equal(group({game:'三角洲行动',name:'扑克牌-大王'}),'');assert.equal(group({game:'三角洲行动',name:'阿萨拉新闻周刊'}),'');assert.equal(group({game:'其他游戏',name:'阿萨拉牌-大王'}),'');
 assert.equal(group({game:'Delta Force',catalog_item_id:'orzice:p1517',name:'我的大王'}),'阿萨拉牌');
 assert.equal(group({...records.find(r=>r.catalog_item_id==='orzice:p1517'),collection_group:'普通库存'}),'');
 assert.equal(group({collection_group:'赛季任务'}),'赛季任务');assert.equal(JSON.stringify(records),before);
});
test('deck progress counts distinct current holdings, keeps box separate and lists all missing cards',()=>{
 const records=plan(require('../collection-catalog.json'),[],()=>String(++counter)).added;
 let progress=deckProgress(records,inventory.quantity);assert.equal(progress.owned,0);assert.equal(progress.missing.length,54);assert.equal(progress.box,false);
 for(const r of records)if(group(r)==='阿萨拉牌')r.starting_quantity=3;
 progress=deckProgress(records,inventory.quantity);assert.equal(progress.owned,54);assert.equal(progress.missing.length,0);assert.equal(progress.box,true);
 const king=records.find(r=>r.catalog_item_id==='orzice:p1517');records.push({...king,id:'duplicate',starting_quantity:100});assert.equal(deckProgress(records,inventory.quantity).owned,54);
 for(const r of records)if(r.catalog_item_id==='orzice:p1517')r.inventory_events=[{id:'sale',seq:1,type:'sale',quantity:r.starting_quantity,date:'',note:''}];
 progress=deckProgress(records,inventory.quantity);assert.equal(progress.owned,53);assert.deepEqual(progress.missing,['阿萨拉牌-大王']);
});
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
