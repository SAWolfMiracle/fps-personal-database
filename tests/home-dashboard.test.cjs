const test=require('node:test'),assert=require('node:assert/strict'),home=require('../home-dashboard.js');
test('homepage counts duplicate catalog copies as one type without adding quantities',()=>{
 const rows=[{kind:'collection',game:'三角洲',catalog_item_id:'a',name:'A',target:2,n:1},{kind:'collection',game:'三角洲行动',catalog_item_id:'a',name:'A',target:2,n:1},{kind:'collection',game:'CS2',name:'B',target:1,n:0},{kind:'match',name:'match',n:1}];
 assert.deepEqual(home.progress(rows,r=>r.n),{total:2,owned:1,complete:0,missing:['A','B']});rows[1].n=2;assert.equal(home.progress(rows,r=>r.n).complete,1);
});
test('homepage settings preserve explicit hidden modules and sanitize pins',()=>{
 assert.deepEqual(home.settings(null),{matches:true,collections:true,pins:['阿萨拉牌']});assert.deepEqual(home.settings({matches:false,collections:false,pins:['A','A',null,'']}),{matches:false,collections:false,pins:['A']});assert.deepEqual(home.settings({pins:[]}).pins,[]);
});
