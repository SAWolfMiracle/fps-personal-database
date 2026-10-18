const test=require('node:test'),assert=require('node:assert/strict'),kit=require('../arca-kit.js');
test('packing totals use quantity times price, preserve zero and distinguish missing prices',()=>{
 const rows=kit.normalizeLoadout([{slot:'武器',name:'MCX',quantity:1,unit_price:270000},{slot:'弹药',name:'蓝弹',quantity:120,unit_price:100},{name:'护甲',quantity:1,unit_price:''},{name:'药品',quantity:2,unit_price:0}]);
 assert.deepEqual(kit.summary(rows),{items:4,total:282000,missing:1,complete:false});assert.deepEqual(kit.summary([{name:'test',quantity:3,unit_price:.1}]),{items:1,total:.3,missing:0,complete:true});assert.equal(kit.summary([]).complete,false);
});
test('packing rejects unsafe quantities, invalid prices, excessive rows and overflow without mutating input',()=>{
 for(const quantity of [-1,0,1.5,Infinity,1000001])assert.throws(()=>kit.normalizeLoadout([{name:'a',quantity,unit_price:1}]));for(const unit_price of [-1,NaN,Infinity,.001])assert.throws(()=>kit.normalizeLoadout([{name:'a',quantity:1,unit_price}]));assert.throws(()=>kit.normalizeLoadout(Array(31).fill({name:'a'})));assert.throws(()=>kit.normalizeLoadout([{name:'a',quantity:2,unit_price:1e12}]));const rows=[{name:'a',quantity:'3',unit_price:'0.20'}];kit.normalizeLoadout(rows);assert.equal(rows[0].quantity,'3');
});
test('old and malformed imported loadouts remain readable while uncertain prices are marked missing',()=>{
 assert.deepEqual(kit.restoreLoadout(undefined),[]);const restored=kit.restoreLoadout([{name:'MCX',quantity:-4,unit_price:-2},null,{name:'弹药',quantity:100,unit_price:2}]);assert.deepEqual(restored,[{name:'MCX',slot:'其他',quantity:1,unit_price:null},{name:'弹药',slot:'其他',quantity:100,unit_price:2}]);
});
test('comparison requires two records and only computes complete same-game budget differences',()=>{
 const a={id:'a',game:'三角洲行动',budget:270000,loadout:[{name:'a',quantity:1,unit_price:300000}]},b={id:'b',game:'三角洲行动',budget:400000,loadout:[{name:'b',quantity:1,unit_price:450000}]};let c=kit.compare(a,b);assert.equal(c.budgetDelta,130000);assert.equal(c.loadoutDelta,150000);assert.throws(()=>kit.compare(a,a));c=kit.compare(a,{...b,game:'CS2'});assert.equal(c.budgetDelta,null);assert.equal(c.loadoutDelta,null);assert.equal(c.sameGame,false);assert.equal(kit.compare(a,{...b,loadout:[{name:'b',unit_price:null}]}).loadoutDelta,null);assert.equal(kit.compare(a,{...b,budget:null}).budgetDelta,null);
});
test('share cards include only opted-in fields and never include account, notes, sources or logs',()=>{
 const r={name:'收藏',game:'三角洲行动',image:'https://example.test/pic.png',email:'private@example.test',user_id:'secret',note:'private note',showcase:{caption:'私人寄语'},acquisitions:[{date:'2026-10-18',source:'private source'},{date:'2026-10-01'},{date:'2026-02-30'}]};assert.deepEqual(kit.shareData(r,{},5),{name:'收藏',game:'三角洲行动'});const chosen=kit.shareData(r,{quantity:true,date:true,caption:true,picture:true},0);assert.equal(chosen.quantity,0);assert.equal(chosen.date,'2026-10-01');assert.equal(chosen.caption,'私人寄语');assert.equal(chosen.image,r.image);assert.doesNotMatch(JSON.stringify(chosen),/secret|private|user_id|source|acquisitions|email/);assert.ok(!kit.shareData({...r,image:'javascript:alert(1)'},{picture:true},1).image);
});
test('image wrapping bounds long names and filenames cannot create path components',()=>{
 const ctx={measureText:s=>({width:Array.from(s).length*10})};const lines=kit.wrap(ctx,'一'.repeat(100),50,3);assert.equal(lines.length,3);assert.ok(lines[2].endsWith('…'));assert.ok(lines.every(s=>ctx.measureText(s).width<=50));assert.equal(kit.filename('../a/b:c'),'Arca-.._a_b_c.png');
});
