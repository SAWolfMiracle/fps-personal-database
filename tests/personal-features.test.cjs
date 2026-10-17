const test=require('node:test'),assert=require('node:assert/strict'),p=require('../personal-features.js'),home=require('../home-dashboard.js'),duplicates=require('../collection-duplicates.js');
test('exhibits retain source inventory and validate missing selections and limits',()=>{
 const source={id:'a',kind:'collection',name:'收藏',starting_quantity:3,acquisitions:[{quantity:2}]},rows=[source];
 const next=p.exhibit(rows,'a','  故事  ');assert.equal(source.showcase,undefined);assert.equal(next.showcase.caption,'故事');assert.equal(next.starting_quantity,3);assert.equal(next.acquisitions,source.acquisitions);assert.throws(()=>p.exhibit(rows,'gone',''));
 const full=Array.from({length:12},(_,i)=>({id:String(i),kind:'collection',showcase:{enabled:true,order:i}}));assert.throws(()=>p.exhibit(full.concat(source),'a',''),/12/);assert.equal(p.exhibit(full,'0','新寄语').showcase.caption,'新寄语');
});
test('showcase sorting only updates metadata and empty duplicate cleanup preserves exhibits',()=>{
 const a={id:'a',kind:'collection',catalog_item_id:'item',target:1,import_source:'catalog',showcase:{enabled:true,order:0,caption:'好看'}},b={id:'b',kind:'collection',showcase:{enabled:true,order:1}};
 assert.equal(duplicates.empty(a),false);const rows=p.moveExhibit([a,b],'b',-1);assert.deepEqual(p.showcase(rows).map(r=>r.id),['b','a']);assert.equal(a.showcase.order,0);assert.equal(rows[1].showcase.caption,'好看');assert.deepEqual(p.moveExhibit([a,b],'a',-1),[]);
});
test('weapon fields validate and images reject executable and oversized schemes',()=>{
 assert.throws(()=>p.normalizePlan({name:'',weapon:'MCX'}));for(const budget of [-1,Infinity,'no',1e13])assert.throws(()=>p.normalizePlan({name:'配置',weapon:'MCX',budget}));
 const r=p.normalizePlan({name:'配置',weapon:'MCX',budget:'0',code:'a\nb',screenshot:'https://example.test/pic.jpg'});assert.equal(r.budget,0);assert.equal(r.code,'a\nb');assert.equal(p.image('javascript:alert(1)'), '');assert.equal(p.image('data:image/svg+xml;base64,YQ=='),'');assert.ok(p.image('data:image/jpeg;base64,YQ=='));
 assert.equal(p.plans([r,{kind:'collection',name:'MCX'}],'mcx').length,1);
});
test('home exhibition is optional and participates in the existing persisted ordering',()=>{
 const prefs=home.settings({pins:[],showcase:true,order:['showcase','matches']});assert.equal(prefs.showcase,true);assert.deepEqual(home.layout(prefs),['showcase','matches','collections','recent']);assert.ok(!home.layout(home.settings({...prefs,showcase:false})).includes('showcase'));
});
test('screenshot compression revokes temporary URLs on success and read failure',async()=>{
 let revoked=0;const win={URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++},Image:class{constructor(){this.width=2400;this.height=1200}set src(v){this.onload()}},document:{createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,YQ=='})}};
 assert.equal(await p.compress({type:'image/png',size:100},win),'data:image/jpeg;base64,YQ==');assert.equal(revoked,1);win.Image=class{set src(v){this.onerror()}};await assert.rejects(()=>p.compress({type:'image/png',size:100},win));assert.equal(revoked,2);await assert.rejects(()=>p.compress({type:'image/svg+xml',size:100},win));
});
function mounted(){
 const fields=new Map();let rows=[],epoch=0,homeShown=false,toast='';
 function el(id){if(!fields.has(id))fields.set(id,{value:'',innerHTML:'',hidden:false,disabled:false,dataset:{},files:[],attributes:{},setAttribute(k,v){this.attributes[k]=v},listeners:{},addEventListener(k,fn){this.listeners[k]=fn},removeAttribute(k){delete this[k]},focus(){},scrollIntoView(){},reset(){for(const [key,v] of fields)if(key.startsWith(id==='weaponPlanForm'?'weaponPlan':'showcase')&&key!==id)v.value=''}});return fields.get(id)}
 const win={confirm:()=>true,navigator:{clipboard:{writeText:async()=>{}}},prompt(){}};const doc={getElementById:el,defaultView:win};let ids=0;
 const api=p.mount({document:doc,escape:s=>String(s==null?'':s).replaceAll('<','&lt;'),records:()=>rows,epoch:()=>epoch,quantity:r=>r.starting_quantity||0,uid:()=>String(++ids),commit:changes=>{for(const r of changes){const i=rows.findIndex(x=>x.id===r.id),value={...r,updated_at:'stamp'+ids};if(i<0)rows.push(value);else rows[i]=value}api.render();return true},remove:id=>{rows=rows.filter(r=>r.id!==id);api.render();return true},toast:msg=>toast=msg,openCollections(){},homeShown:()=>homeShown,showHome:()=>{homeShown=true;api.render()}});
 const submit=id=>el(id).onsubmit({preventDefault(){}});const click=dataset=>el('personalFeatures').listeners.click({target:{closest:()=>({dataset})}});
 return {api,el,submit,click,win,setRows:r=>rows=r,rows:()=>rows,switchWorkspace(){rows=[];epoch++;api.render()},toast:()=>toast};
}
test('feature forms save and edit plans, preserve drafts on render, and reset when workspace switches',()=>{
 const f=mounted();f.el('weaponPlanName').value='MCX 机密';f.el('weaponPlanWeapon').value='MCX';f.el('weaponPlanCode').value='A\nB';f.submit('weaponPlanForm');assert.equal(f.rows()[0].kind,'weapon_plan');assert.equal(f.rows()[0].code,'A\nB');
 const id=f.rows()[0].id;f.click({planEdit:id});f.el('weaponPlanNote').value='未保存草稿';f.api.render();assert.equal(f.el('weaponPlanNote').value,'未保存草稿');f.submit('weaponPlanForm');assert.equal(f.rows().length,1);assert.equal(f.rows()[0].note,'未保存草稿');f.click({planEdit:id});f.switchWorkspace();assert.equal(f.el('weaponPlanName').value,'');assert.equal(f.rows().length,0);
});
test('exhibit form changes metadata without duplicating inventory; captions are escaped',()=>{
 const f=mounted();f.setRows([{id:'item',kind:'collection',name:'<收藏>',starting_quantity:2}]);f.api.render();f.el('showcaseItem').value='item';f.el('showcaseCaption').value='<故事>';f.submit('showcaseForm');assert.equal(f.rows().length,1);assert.equal(f.rows()[0].starting_quantity,2);assert.match(f.el('homeShowcaseList').innerHTML,/&lt;故事>/);assert.equal(f.el('homeShowcase').hidden,false);f.click({showcaseRemove:'item'});assert.equal(p.showcase(f.rows()).length,0);assert.equal(f.rows().length,1);
});
test('editing a plan rejects unseen remote changes rather than overwriting them',()=>{
 const f=mounted();f.setRows([{id:'plan',kind:'weapon_plan',name:'配置',weapon:'MCX',updated_at:'old'}]);f.click({planEdit:'plan'});f.setRows([{id:'plan',kind:'weapon_plan',name:'远端配置',weapon:'MCX',updated_at:'new'}]);f.submit('weaponPlanForm');assert.equal(f.rows()[0].name,'远端配置');assert.match(f.el('weaponPlanStatus').textContent,/其他位置更新/);
});

test('an image finishing after account switching cannot populate the new editor',async()=>{
 const f=mounted();let img;f.win.URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};f.win.Image=class{constructor(){img=this;this.width=100;this.height=50}set src(v){}};f.win.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,YQ=='})};f.el('weaponPlanFile').files=[{type:'image/png',size:100}];const pending=f.el('weaponPlanFile').onchange();f.switchWorkspace();img.onload();await pending;assert.equal(f.el('weaponPlanPreview').hidden,true);assert.equal(f.el('saveWeaponPlan').disabled,false);assert.equal(f.el('weaponPlanStatus').textContent,'');
});

test('top launchers are the only disclosure controls and toggle one panel at a time without losing input',()=>{
 const f=mounted();assert.equal(f.el('showcaseEditor').hidden,true);assert.equal(f.el('weaponFolder').hidden,true);assert.doesNotMatch(f.el('personalFeatures').innerHTML,/<summary>(个人收藏展柜|武器方案夹)<\/summary>/);
 f.click({personalOpen:'showcaseEditor'});assert.equal(f.el('showcaseEditor').hidden,false);assert.equal(f.el('showcaseLauncher').attributes['aria-expanded'],'true');
 f.el('showcaseCaption').value='未保存寄语';f.click({personalOpen:'showcaseEditor'});assert.equal(f.el('showcaseEditor').hidden,true);assert.equal(f.el('showcaseLauncher').attributes['aria-expanded'],'false');
 f.click({personalOpen:'weaponFolder'});assert.equal(f.el('weaponFolder').hidden,false);f.click({personalOpen:'showcaseEditor'});assert.equal(f.el('weaponFolder').hidden,true);assert.equal(f.el('showcaseCaption').value,'未保存寄语');
 f.switchWorkspace();assert.equal(f.el('showcaseEditor').hidden,true);assert.equal(f.el('weaponFolder').hidden,true);f.el('homeManageShowcase').onclick();assert.equal(f.el('showcaseEditor').hidden,false);
});
