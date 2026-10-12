const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const catalog=require('../collection-catalog.json');
const data=require('../collection-guides.js');
const api=require('../collection-catalog.js');
test('acquisition snapshot covers every catalogue identity with check dates',()=>{
 assert.equal(Object.keys(data.entries).length,catalog.items.length);
 for(const item of catalog.items){const fact=data.entries[item.item_id];assert.equal(fact.name,item.name);assert.equal(fact.source,undefined);assert.equal(item.source_item,undefined);assert.equal(fact.checked,'2026-10-11');assert.equal(fact.error,undefined);const guide=api.acquisitionGuide({game:catalog.game,name:'renamed',catalog_item_id:item.item_id});assert.ok(guide.text);assert.doesNotMatch(guide.source||'',/orzice/);assert.equal(guide.checked,'2026-10-11');}
 const coverage=api.guideCoverage();assert.equal(coverage.total,534);assert.equal(coverage.known+coverage.pending,coverage.total);
});
test('browser script order exposes same guide data and unknowns do not invent routes',()=>{
 const context={window:{}};vm.createContext(context);for(const path of ['collection-guides.js','collection-catalog.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8'),context);
 assert.equal(context.window.FPSCatalog.guideCoverage().total,534);
 for(const [id,fact] of Object.entries(data.entries)){if(!fact.guide&&!fact.containers.length&&!fact.exchange.length&&!fact.tradeable&&!fact.explicit_source){const guide=api.acquisitionGuide({game:'三角洲行动',catalog_item_id:id});if(!['orzice:p1628','orzice:p1629','orzice:p1630'].includes(id)){assert.equal(guide.summary,'待核实');assert.match(guide.text,/未找到明确获取途径/);}}}
 assert.equal(api.acquisitionGuide({game:'其他游戏',name:catalog.items[0].name}).summary,'待核实');
});
test('structured acquisition details keep map evidence separate from container evidence',()=>{
 const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:1225'});assert.deepEqual(detail.maps,['航天基地','零号大坝']);assert.deepEqual(detail.difficultyContexts,[]);assert.equal(detail.containers.length,13);assert.match(detail.mapNote,/2025-11-19/);assert.match(detail.difficulty,/未核实/);assert.equal(detail.mapChecked,'2026-10-12');
 const eventItem=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:p1628'});assert.deepEqual(eventItem.maps,['航天基地','AZ-3']);assert.deepEqual(eventItem.difficultyContexts,['航天基地：机密 / 绝密','AZ-3：机密']);
 const rocketFuel=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:p141'});assert.deepEqual(rocketFuel.maps,['航天基地']);assert.deepEqual(rocketFuel.difficultyContexts,[]);assert.match(rocketFuel.mapNote,/仅限/);assert.match(rocketFuel.description,/仅限航天城产出/);
 const satellite=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:p149'});assert.deepEqual(satellite.maps,['航天基地']);
 for(const id of ['orzice:p1120','orzice:p1119','orzice:p1122','orzice:p1121'])assert.deepEqual(api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id}).maps,['零号大坝','长弓溪谷','航天基地','巴克什','潮汐监狱']);
 const flower=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:p1693'});assert.deepEqual(flower.maps,['所有地图（历史资料）','AZ-3']);
 const apple=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:p1329'});assert.deepEqual(apple.maps,['所有地图（历史资料）','零号大坝']);
 const unknown=api.acquisitionDetails({game:'其他游戏',name:'超声波切割刀'});assert.deepEqual(unknown.maps,[]);assert.deepEqual(unknown.containers,[]);
 const personal=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:1225',obtain_method:'我的记录'});assert.deepEqual(personal.maps,[]);assert.deepEqual(personal.containers,[]);assert.equal(personal.description,'我的记录');
 const coverage=api.guideCoverage();assert.equal(coverage.mapsKnown+coverage.mapsPending,534);assert.equal(coverage.difficultiesKnown+coverage.difficultiesPending,534);assert.equal(coverage.mapsKnown,36);assert.ok(coverage.difficultiesKnown>0);
});
