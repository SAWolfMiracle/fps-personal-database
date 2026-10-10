// Regression checks for mixed workspaces; run with node --test tests/collections.test.cjs.
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
function app(){
 const fields=new Map(),store=new Map();
 const element=id=>{if(!fields.has(id))fields.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,reset(){},scrollIntoView(){},classList:{add(){},remove(){}}});return fields.get(id)};
 const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 let source=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
 source=source.slice(0,source.indexOf('$("collectionForm").addEventListener'));
 source+=`renderAll=function(){};renderCloudPanel=function(){};refreshCommunityStats=function(){};scheduleCloudSync=function(){};saveAndRender=function(){persist()};showToast=function(msg,label,action){window.undo=action};
 window.test={cloudSync,setCloudUser:function(u){cloudUser=u},importCollectionCatalog,setCatalog:function(c){collectionCatalog=c},migrateRecord,collectionQuantity,collectionStatus,matchRecords,collectionRecords,summary,filtered,saveCollection,saveAcquisition,quickAcquire,editAcquisition,resetAcquisitionForm,deleteAcquisition,pushRecordWithRevision,remoteToLocal,cloudPayload,loadWorkspace,persist,deleteRecord,
 setRecords:function(x){records=x},getRecords:function(){return records},setClient:function(x){cloudClient=x},select:function(id){collectionSelectedId=id},workspace:function(name){loadWorkspace(name)}};})();`;
 const window={FPSCatalog:require('../collection-catalog.js'),FPS_CLOUD_CONFIG:{enabled:true,url:'https://example.test',publishableKey:'test-publishable-key'}},context={window,document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},navigator:{onLine:true},setTimeout:()=>0,clearTimeout(){},URL,console};
 vm.runInNewContext(source,context);return {api:window.test,window,element,store};
}
test('old backups stay matches; collection acquisitions survive cloud and JSON round trips',()=>{
 const {api}=app();const legacy=api.migrateRecord({id:'old',game:'CS2',kills:3,deaths:1});
 const item=api.migrateRecord({id:'item',kind:'collection',game:'任意游戏',name:'任务道具',target:3,acquisitions:[{id:'a',quantity:2,date:'2026-10-06',source:'任务',cost:15,note:'首次获取'}]});
 api.setRecords([item,legacy]);assert.equal(api.matchRecords().length,1);assert.equal(api.collectionRecords().length,1);assert.equal(api.summary(api.matchRecords()).games,1);assert.equal(api.summary(api.matchRecords()).k,3);
 const restored=api.remoteToLocal({id:'item',revision:2,payload:JSON.parse(JSON.stringify(api.cloudPayload(item)))});
 assert.equal(restored.acquisitions[0].source,'任务');assert.equal(api.collectionQuantity(restored),2);assert.equal(api.collectionStatus(restored),'已获得');assert.equal(restored.cloud_revision,2);assert.equal(restored.local_dirty,false);
 restored.acquisitions.push({quantity:1});assert.equal(api.collectionStatus(restored),'已集齐');
});
test('collection creation, multiple acquisitions and undo update progress without adding matches',()=>{
 const {api,element,window}=app(),submit={preventDefault(){}};
 element('collectionGame').value='三角洲行动';element('collectionName').value='测试收藏';element('collectionTarget').value='3';element('collectionCategory').value='自定义';
 api.saveCollection(submit);const item=api.getRecords()[0];assert.equal(item.kind,'collection');assert.equal(api.collectionStatus(item),'未获得');
 for(const qty of ['2','1']){element('acquisitionDate').value='2026-10-06';element('acquisitionQuantity').value=qty;element('acquisitionCost').value='12';element('acquisitionSource').value='任务奖励';api.saveAcquisition(submit)}
 assert.equal(api.collectionStatus(item),'已集齐');assert.equal(item.acquisitions.length,2);assert.equal(api.matchRecords().length,0);
 api.deleteAcquisition(item.id,item.acquisitions[1].id);assert.equal(api.collectionQuantity(item),2);window.undo();assert.equal(api.collectionQuantity(item),3);
});
test('collection sync never opts into community; legacy matches preserve opt-in',async()=>{
 const {api}=app();const calls=[];api.setClient({rpc:async(name,args)=>{calls.push(args);return {data:[{applied:true}]}}});
 await api.pushRecordWithRevision(api.migrateRecord({kind:'collection'}),true);await api.pushRecordWithRevision(api.migrateRecord({game:'CS2'}),true);
 assert.equal(calls[0].p_share_community,false);assert.equal(calls[1].p_share_community,true);assert.equal('local_dirty' in calls[0].p_payload,false);
});
test('guest collection stays separate until merge; deletion undo cannot cross workspaces',()=>{
 const {api,window}=app();const item=api.migrateRecord({id:'guest-item',kind:'collection',name:'guest',target:1});api.setRecords([item]);api.persist();api.workspace('user_A');assert.equal(api.getRecords().length,0);api.workspace('guest');assert.equal(api.getRecords()[0].name,'guest');
 api.deleteRecord(item.id);const undo=window.undo;api.workspace('user_A');undo();assert.equal(api.getRecords().length,0);
});
test('invalid quantities and unsafe image URLs are rejected during backup normalization',()=>{
 const {api}=app();const item=api.migrateRecord({kind:'collection',target:0,image:'javascript:alert(1)',acquisitions:[null,{quantity:-1},{quantity:1.5},{quantity:2,cost:-5}]});
 assert.equal(item.target,1);assert.equal(item.image,'');assert.equal(item.acquisitions.length,1);assert.equal(item.acquisitions[0].cost,0);
});
test('screenshot snapshot survives sync with actual acquisitions, unknown assists stay null',()=>{
 const {api}=app();const item=api.migrateRecord({id:'snapshot',kind:'collection',name:'snapshot',import_source:'screenshot',starting_quantity:3,target:5,snapshot_date:'2026-10-07',acquisitions:[{quantity:2,date:'2026-10-07'}]});
 const restored=api.remoteToLocal({id:item.id,revision:1,payload:JSON.parse(JSON.stringify(api.cloudPayload(item)))});
 assert.equal(api.collectionQuantity(restored),5);assert.equal(api.collectionStatus(restored),'已集齐');assert.equal(restored.acquisitions.length,1);assert.equal(restored.snapshot_date,'2026-10-07');
 assert.equal(api.migrateRecord({kind:'match',import_source:'screenshot',assists:null}).assists,null);
});

test('catalog bulk import persists a workspace atomically, preserves progress, and does not cross to guest',()=>{
 const {api,element,store}=app();const catalog=require('../collection-catalog.json');element('catalogGrade').value='';api.setCatalog(catalog);
 api.workspace('user_catalog_test');api.importCollectionCatalog();const count=api.getRecords().length;assert.equal(count,catalog.items.length);
 const item=api.getRecords()[0];item.acquisitions.push({quantity:1});api.importCollectionCatalog();assert.equal(api.getRecords().length,count);assert.equal(api.collectionQuantity(item),1);
 assert.equal(api.matchRecords().length,0);api.workspace('guest');assert.equal(api.getRecords().length,0);api.workspace('user_catalog_test');assert.equal(api.getRecords().length,count);assert.equal(api.getRecords().filter(r=>r.import_source==='catalog').length,count);
});

test('an interrupted bulk sync retains acknowledged revisions on disk for resume',async()=>{
 const {api}=app();api.workspace('user_sync_test');api.setCloudUser({id:'user_sync_test'});api.setRecords([api.migrateRecord({id:'first',kind:'collection',name:'first'}),api.migrateRecord({id:'second',kind:'collection',name:'second'})]);api.persist();let pushed=0;
 api.setClient({from:()=>({select:async()=>({data:[]})}),rpc:async()=>{if(++pushed===2)throw Error('network interrupted');return {data:[{applied:true,current_revision:1}]}}});
 await api.cloudSync({silent:true});api.workspace('user_sync_test');const rows=api.getRecords();assert.equal(rows[0].cloud_revision,1);assert.equal(rows[0].local_dirty,false);assert.equal(rows[1].cloud_revision,0);assert.equal(rows[1].local_dirty,true);
});

test('name-only creation and empty acquisition fields use defaults without fabricating dates or costs',()=>{
 const {api,element}=app(),submit={preventDefault(){}};element('collectionName').value='仅名称';api.saveCollection(submit);
 const item=api.getRecords()[0];assert.equal(item.game,'未分类游戏');assert.equal(item.target,1);
 api.saveAcquisition(submit);assert.equal(item.acquisitions.length,1);assert.equal(item.acquisitions[0].quantity,1);assert.equal(item.acquisitions[0].date,'');assert.equal(item.acquisitions[0].cost,null);
 const restored=api.remoteToLocal({id:item.id,revision:1,payload:JSON.parse(JSON.stringify(api.cloudPayload(item)))});assert.equal(restored.acquisitions[0].date,'');assert.equal(restored.acquisitions[0].cost,null);
});
test('one-click acquisition supports exact undo; backfill edits original entry without duplicating progress',()=>{
 const {api,element,window}=app(),submit={preventDefault(){}};const item=api.migrateRecord({id:'quick',kind:'collection',name:'一键'});api.setRecords([item]);api.quickAcquire(item.id);
 assert.equal(api.collectionQuantity(item),1);const a=item.acquisitions[0],undo=window.undo;assert.equal(a.date,'');assert.equal(a.cost,null);
 api.editAcquisition(item.id,a.id);element('acquisitionDate').value='2026-10-10';element('acquisitionCost').value='0';element('acquisitionNote').value='后补';api.saveAcquisition(submit);
 assert.equal(item.acquisitions.length,1);assert.equal(item.acquisitions[0].id,a.id);assert.equal(api.collectionQuantity(item),1);assert.equal(a.date,'2026-10-10');assert.equal(a.cost,0);
 undo();assert.equal(api.collectionQuantity(item),0);
 api.quickAcquire(item.id);const guardedUndo=window.undo;api.workspace('user_other');guardedUndo();assert.equal(api.getRecords().length,0);api.workspace('guest');assert.equal(api.collectionQuantity(api.getRecords()[0]),1);
});
test('invalid optional details and missing edited entries never create an extra acquisition',()=>{
 const {api,element}=app(),submit={preventDefault(){}};const item=api.migrateRecord({id:'invalid',kind:'collection',name:'检查'});api.setRecords([item]);api.select(item.id);
 element('acquisitionDate').value='2026-02-30';api.saveAcquisition(submit);assert.equal(item.acquisitions.length,0);
 element('acquisitionDate').value='';element('acquisitionQuantity').value='-1';api.saveAcquisition(submit);assert.equal(item.acquisitions.length,0);
 api.quickAcquire(item.id);api.editAcquisition(item.id,item.acquisitions[0].id);item.acquisitions=[];api.saveAcquisition(submit);assert.equal(item.acquisitions.length,0);
});

test('edits during an in-flight cloud write stay dirty and are sent on the next sync',async()=>{
 const {api}=app();api.workspace('user_inflight');api.setCloudUser({id:'user_inflight'});const item=api.migrateRecord({id:'inflight',kind:'collection',name:'同步中修改'});api.setRecords([item]);let savedPayload;
 api.setClient({from:()=>({select:async()=>({data:[]})}),rpc:async(name,args)=>{savedPayload=JSON.parse(JSON.stringify(args.p_payload));item.acquisitions.push({id:'late',quantity:1,date:'',cost:null});item.local_dirty=true;return {data:[{applied:true,current_revision:1}]}}});
 await api.cloudSync({silent:true});assert.equal(savedPayload.acquisitions.length,0);assert.equal(item.local_dirty,true);assert.equal(item.cloud_revision,1);
 api.setClient({from:()=>({select:async()=>({data:[]})}),rpc:async(name,args)=>{savedPayload=args.p_payload;return {data:[{applied:true,current_revision:2}]}}});await api.cloudSync({silent:true});assert.equal(savedPayload.acquisitions.length,1);assert.equal(item.local_dirty,false);
});
