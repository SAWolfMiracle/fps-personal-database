const test=require('node:test'),assert=require('node:assert/strict'),d=require('../collection-duplicates.js');
const item=(id,extra={})=>({id,kind:'collection',game:'三角洲行动',catalog_item_id:'same',import_source:'catalog',target:1,starting_quantity:0,acquisitions:[],inventory_events:[],...extra});
test('empty duplicate catalogs keep one representative and preserve historical records',()=>{
 assert.deepEqual(d.plan([item('a'),item('b')]).remove,['b']);assert.deepEqual(d.plan([item('a'),item('b',{acquisitions:[{quantity:1}]})]).remove,['a']);
 assert.deepEqual(d.plan([item('a',{inventory_events:[{voided:true}]}),item('b',{note:'keep'})]),{remove:[],conflicts:[['a','b']]});
});
test('guest merge skips only empty known catalog duplicates across game aliases',()=>{
 assert.equal(d.skipGuest(item('guest',{game:'Delta Force'}),[item('account')]),true);assert.equal(d.skipGuest(item('guest',{acquisitions:[{quantity:1}]}),[item('account')]),false);assert.equal(d.skipGuest(item('guest',{catalog_item_id:''}),[item('account')]),false);assert.equal(d.skipGuest(item('guest',{game:'other'}),[item('account')]),false);
});
