const {test}=require('node:test'),assert=require('node:assert/strict'),inventory=require('../inventory.js');
test('legacy quantities retain baseline and every acquisition without invented dates',()=>{const r={starting_quantity:2,acquisitions:[{quantity:3},{quantity:1}]};assert.equal(inventory.quantity(r),6);assert.equal(inventory.nextSequence(r),1);assert.equal(inventory.validate(r),true)});
test('normalization and validation reject malformed, ambiguous and unsafe ledger values',()=>{
 for(const events of [[{type:'consume',quantity:-1,seq:1}],[{type:'other',quantity:1,seq:1}],[{type:'sale',quantity:1,seq:0}],[{type:'sale',quantity:1,seq:1,date:'2026-02-30'}]])assert.throws(()=>inventory.normalizeEvents(events));
 assert.throws(()=>inventory.validate({starting_quantity:2,acquisitions:[{quantity:1,inventory_seq:1}],inventory_events:[{type:'consume',quantity:1,seq:1}]}));
 assert.throws(()=>inventory.validate({starting_quantity:0,inventory_events:[{type:'consume',quantity:1,seq:1},{type:'correction',quantity:10,seq:2}]}));
 assert.throws(()=>inventory.validate({starting_quantity:Number.MAX_SAFE_INTEGER,acquisitions:[{quantity:1}]}));
});
