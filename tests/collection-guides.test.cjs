const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const catalog=require('../collection-catalog.json');
const data=require('../collection-guides.js');
const api=require('../collection-catalog.js');
test('acquisition snapshot covers every catalogue identity with traceable sources',()=>{
 assert.equal(Object.keys(data.entries).length,catalog.items.length);
 for(const item of catalog.items){const fact=data.entries[item.item_id];assert.equal(fact.name,item.name);assert.equal(fact.source,item.source_item);assert.equal(fact.checked,'2026-10-11');assert.equal(fact.error,undefined);const guide=api.acquisitionGuide({game:catalog.game,name:'renamed',catalog_item_id:item.item_id});assert.ok(guide.text);assert.match(guide.source,/^https:\/\//);assert.equal(guide.checked,'2026-10-11');}
 const coverage=api.guideCoverage();assert.equal(coverage.total,534);assert.equal(coverage.known+coverage.pending,coverage.total);
});
test('browser script order exposes same guide data and unknowns do not invent routes',()=>{
 const context={window:{}};vm.createContext(context);for(const path of ['collection-guides.js','collection-catalog.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8'),context);
 assert.equal(context.window.FPSCatalog.guideCoverage().total,534);
 for(const [id,fact] of Object.entries(data.entries)){if(!fact.guide&&!fact.containers.length&&!fact.exchange.length&&!fact.tradeable&&!fact.explicit_source){const guide=api.acquisitionGuide({game:'三角洲行动',catalog_item_id:id});if(!['orzice:p1628','orzice:p1629','orzice:p1630'].includes(id)){assert.equal(guide.summary,'待核实');assert.match(guide.text,/未找到明确获取途径/);}}}
 assert.equal(api.acquisitionGuide({game:'其他游戏',name:catalog.items[0].name}).summary,'待核实');
});
