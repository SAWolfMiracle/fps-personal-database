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
 const legacyFive=['零号大坝','长弓溪谷','航天基地','巴克什','潮汐监狱'];
 for(const id of ['orzice:p1457','orzice:p1456','orzice:p1348','orzice:p1489','orzice:p1496','orzice:p1499','orzice:p1500','orzice:p1501','orzice:p1502','orzice:p1503','orzice:p1504','orzice:p187','orzice:p1089','orzice:p1249']){const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id});assert.deepEqual(detail.maps,legacyFive,id);assert.equal(detail.mapChecked,'2026-10-12',id);assert.match(detail.mapNote,/历史|活动已结束/,id)}
 for(const id of ['orzice:p1361','orzice:p1350'])assert.deepEqual(api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id}).maps,['零号大坝','巴克什','航天基地']);
 for(const id of ['orzice:p1488','orzice:p1498'])assert.deepEqual(api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id}).maps,['零号大坝','长弓溪谷','巴克什','航天基地']);
 const mirror=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:p189'});assert.deepEqual(mirror.maps,['零号大坝','长弓溪谷','巴克什','航天基地','AZ-3']);assert.match(mirror.mapNote,/不含潮汐监狱/);assert.equal(mirror.mapChecked,'2026-10-12');
 for(const id of ['orzice:1061','orzice:1054','orzice:1056','orzice:1062','orzice:955','orzice:964','orzice:1199','orzice:1200','orzice:1205','orzice:p1086','orzice:1065']){const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id});assert.deepEqual(detail.maps,['潮汐监狱'],id);assert.equal(detail.mapChecked,'2026-10-12',id)}
 for(const [id,maps] of Object.entries({'orzice:962':['航天基地','长弓溪谷'],'orzice:1064':['航天基地','零号大坝'],'orzice:978':['航天基地','长弓溪谷'],'orzice:1284':['零号大坝','航天基地'],'orzice:1257':['航天基地','零号大坝'],'orzice:1218':['航天基地','长弓溪谷'],'orzice:1207':['航天基地','零号大坝'],'orzice:1203':['航天基地','长弓溪谷'],'orzice:1202':['航天基地','零号大坝'],'orzice:1206':['航天基地','长弓溪谷'],'orzice:1209':['航天基地','零号大坝'],'orzice:1208':['航天基地','零号大坝'],'orzice:900':['航天基地','长弓溪谷'],'orzice:902':['航天基地','长弓溪谷'],'orzice:952':['航天基地','长弓溪谷']})){const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id});assert.deepEqual(detail.maps,maps,id);assert.equal(detail.mapChecked,'2026-10-12',id)}
 for(const id of ['orzice:1217','orzice:1201']){const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id});assert.deepEqual(detail.maps,['所有地图（历史资料）'],id);assert.equal(detail.mapChecked,'2026-10-12',id)}
 for(const id of ['orzice:1204','orzice:p1455']){const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id});assert.equal(detail.maps.length,1,id);assert.equal(detail.mapChecked,'2026-10-12',id)}
 for(const id of ['orzice:1283','orzice:p1338']){const detail=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id});assert.deepEqual(detail.maps,legacyFive,id);assert.equal(detail.mapChecked,'2026-10-12',id)}
 for(const id of ['orzice:p1497','orzice:p1495','orzice:p1494','orzice:p1493','orzice:p1492','orzice:p1491','orzice:p1490'])assert.deepEqual(api.acquisitionDetails({game:'三角洲行动',catalog_item_id:id}).maps,[],id);
 const unknown=api.acquisitionDetails({game:'其他游戏',name:'超声波切割刀'});assert.deepEqual(unknown.maps,[]);assert.deepEqual(unknown.containers,[]);
 const personal=api.acquisitionDetails({game:'三角洲行动',catalog_item_id:'orzice:1225',obtain_method:'我的记录'});assert.deepEqual(personal.maps,[]);assert.deepEqual(personal.containers,[]);assert.equal(personal.description,'我的记录');
 const coverage=api.guideCoverage();assert.equal(coverage.mapsKnown+coverage.mapsPending,534);assert.equal(coverage.difficultiesKnown+coverage.difficultiesPending,534);assert.equal(coverage.mapsKnown,85);assert.ok(coverage.difficultiesKnown>0);
 for(const item of catalog.items){const detail=api.acquisitionDetails({game:catalog.game,catalog_item_id:item.item_id,name:item.name});if(detail.maps.length)assert.ok(detail.mapChecked,item.item_id+' map check date')}
});
