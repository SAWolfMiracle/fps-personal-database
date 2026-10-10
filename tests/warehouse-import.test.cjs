process.env.TZ='Asia/Shanghai';
const {test}=require('node:test'),assert=require('node:assert/strict'),api=require('../warehouse-import.js'),catalog=require('../collection-catalog.json'),fixtures=require('./fixtures/warehouse-crops.json');
const templates=require('../warehouse-templates.json').items.map(t=>({...t,feature:Array.from(Buffer.from(t.feature,'base64'))}));
const stamp='2026-10-11T00:00:00.000Z',item=catalog.items.find(i=>i.name==='万足金条');
test('real warehouse crop ranks gold first and exposes ambiguous shared storage icons',()=>{
 const gold=fixtures.samples.find(r=>r.name==='金条');const result=api.rank(api.descriptor(Buffer.from(gold.pixels,'base64'),96,96),templates,3);assert.equal(result[0].item_id,item.item_id);
 const storage=fixtures.samples.find(r=>r.name==='量子存储'),r=api.rank(api.descriptor(Buffer.from(storage.pixels,'base64'),96,96),templates,3);assert.ok(r.some(t=>catalog.items.find(i=>i.item_id===t.item_id).name==='量子存储'));assert.equal(new Set(r.map(t=>t.item_id)).size,3);
});
test('blank crops and oversized or invalid grids never create confident matches',()=>{
 assert.equal(api.descriptor(new Uint8Array(40*40*4),40,40),null);assert.deepEqual(api.rank(null,templates),[]);assert.equal(api.grid({x:1,y:2,w:80,h:80},8,8).length,64);assert.throws(()=>api.grid({x:0,y:0,w:1,h:1},20,20));assert.throws(()=>api.grid({x:-1,y:0,w:10,h:10},1,1));
});
test('review is opt-in, aggregates identical items, and does not manufacture acquisition history',()=>{
 assert.throws(()=>api.plan(catalog,[{checked:false,item_id:item.item_id,quantity:1}],[],'hash',()=> 'new',stamp));
 const result=api.plan(catalog,[{checked:true,item_id:item.item_id,quantity:1},{checked:true,item_id:item.item_id,quantity:2}],[],'hash',()=> 'new',stamp);assert.equal(result.added.length,1);assert.equal(result.added[0].starting_quantity,3);assert.deepEqual(result.added[0].acquisitions,[]);assert.equal(result.added[0].import_source,'warehouse');assert.equal(result.added[0].snapshot_date,'2026-10-11');
 assert.throws(()=>api.plan(catalog,[{checked:true,item_id:item.item_id,quantity:0}],[],'hash',()=> 'new',stamp));assert.throws(()=>api.plan(catalog,[{checked:true,item_id:'unknown',quantity:1}],[],'hash',()=> 'new',stamp));
});
test('snapshot updates only unowned catalog records and preserves owned history, duplicates and other games',()=>{
 const r={id:'existing',kind:'collection',game:catalog.game,name:item.name,catalog_item_id:item.item_id,target:2,starting_quantity:0,acquisitions:[],cloud_revision:3,note:'自定义'};const review=[{checked:true,item_id:item.item_id,quantity:1}];
 const updated=api.plan(catalog,review,[r],'hash',()=> 'new',stamp);assert.equal(updated.updated[0].id,'existing');assert.equal(updated.updated[0].cloud_revision,3);assert.equal(updated.updated[0].note,'自定义');assert.equal(r.starting_quantity,0);
 for(const owned of [{...r,starting_quantity:1},{...r,acquisitions:[{quantity:1}]},{...r,import_hash:'hash'},{...r,inventory_events:[{type:'correction',quantity:0,seq:1}]}]){assert.equal(api.plan(catalog,review,[owned],'hash',()=> 'new',stamp).skipped.length,1)}
 assert.equal(api.plan(catalog,review,[{...r,game:'其他游戏'}],'hash',()=> 'new',stamp).added.length,1);
});

test('all eight real crops include the expected item among the three review candidates',()=>{for(const r of fixtures.samples){const expected=r.name==='金条'?'万足金条':r.name;const result=api.rank(api.descriptor(Buffer.from(r.pixels,'base64'),96,96),templates,3);assert.ok(result.some(t=>catalog.items.find(i=>i.item_id===t.item_id).name===expected),expected)}});

test('snapshot date uses client calendar day instead of the UTC date',()=>{const result=api.plan(catalog,[{checked:true,item_id:item.item_id,quantity:1}],[],'tz',()=> 'new','2026-10-10T19:45:00.000Z');assert.equal(result.added[0].snapshot_date,'2026-10-11')});
test('overlapping checked crops are rejected before counts can be duplicated',()=>{const row={checked:true,item_id:item.item_id,quantity:1,box:{x:0,y:0,w:100,h:100}};assert.throws(()=>api.plan(catalog,[row,{...row,box:{x:2,y:2,w:100,h:100}}],[],'overlap',()=> 'new',stamp),/重叠/)});

function multiRow(id,source,extra={}){return {id,source_id:source,source_hash:'hash-'+source,item_id:item.item_id,quantity:2,checked:true,box:{x:0,y:0,w:100,h:100},...extra}}
test('cross-image identical coordinates are allowed but same-item overlap decisions are required',()=>{
 const rows=[multiRow('a','image-a'),multiRow('b','image-b')];assert.throws(()=>api.plan(catalog,rows,[],'batch',()=> 'new',stamp),/逐项确认/);
 rows.forEach(r=>r.overlap_review='unique');const result=api.plan(catalog,rows,[],'batch',()=> 'new',stamp);assert.equal(result.added[0].starting_quantity,4);assert.equal(result.duplicates,0);assert.deepEqual(result.added[0].import_hashes,['hash-image-a','hash-image-b']);
});
test('confirmed duplicates across three images count exactly once including duplicate chains',()=>{
 const rows=[multiRow('a','image-a',{overlap_review:'unique'}),multiRow('b','image-b',{duplicate_of:'a'}),multiRow('c','image-c',{duplicate_of:'b'})];const result=api.plan(catalog,rows,[],'batch',()=> 'new',stamp);assert.equal(result.added[0].starting_quantity,2);assert.equal(result.duplicates,2);assert.equal(result.added[0].import_hashes.length,3);
});
test('unchecked references, cycles, different quantities, same-image and different-item duplicates are rejected',()=>{
 const base=multiRow('a','image-a',{overlap_review:'unique'}),dupe=multiRow('b','image-b',{duplicate_of:'a'});
 for(const rows of [[{...base,checked:false},dupe],[{...base,overlap_review:'',duplicate_of:'b'},dupe],[base,{...dupe,quantity:3}],[base,{...dupe,source_id:'image-a'}],[base,{...dupe,item_id:catalog.items.find(i=>i.item_id!==item.item_id).item_id}],[base,{...dupe,overlap_review:'unique'}]])assert.throws(()=>api.plan(catalog,rows,[],'batch',()=> 'new',stamp));
});
test('separate same-item stacks remain independent while a repeated viewport stack is merged',()=>{
 const rows=[multiRow('a','image-a',{overlap_review:'unique'}),multiRow('b','image-a',{overlap_review:'unique',quantity:3,box:{x:120,y:0,w:100,h:100}}),multiRow('c','image-b',{duplicate_of:'a'})];const result=api.plan(catalog,rows,[],'batch',()=> 'new',stamp);assert.equal(result.added[0].starting_quantity,5);assert.equal(result.duplicates,1);
});
test('per-image provenance blocks reimport even with a different batch identifier',()=>{
 const rows=[multiRow('a','image-a',{overlap_review:'unique'}),multiRow('b','image-b',{duplicate_of:'a'})],record={id:'old',kind:'collection',game:catalog.game,catalog_item_id:item.item_id,starting_quantity:0,acquisitions:[],inventory_events:[],import_hashes:['hash-image-b']};const result=api.plan(catalog,rows,[record],'different-batch',()=> 'new',stamp);assert.equal(result.skipped.length,1);assert.equal(result.updated.length,0);
});
