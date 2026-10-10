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
 source+=`renderAll=function(){};renderCloudPanel=function(){};refreshCommunityStats=function(){};scheduleCloudSync=function(){};saveAndRender=function(){persist()};showToast=function(msg,label,action){window.undo=action};download=function(blob,name){window.lastDownload={blob,name}};
 window.test={exportCollectionCSV,saveInventory,voidInventory,editInventory,resetInventoryForm,openInventory,planBackupImport,applyBackupImport,cloudSync,setCloudUser:function(u){cloudUser=u},importCollectionCatalog,setCatalog:function(c){collectionCatalog=c},migrateRecord,collectionQuantity,collectionStatus,matchRecords,collectionRecords,summary,filtered,saveCollection,saveAcquisition,quickAcquire,editAcquisition,resetAcquisitionForm,deleteAcquisition,pushRecordWithRevision,remoteToLocal,cloudPayload,loadWorkspace,persist,deleteRecord,
 setRecords:function(x){records=x},getRecords:function(){return records},setClient:function(x){cloudClient=x},select:function(id){collectionSelectedId=id},workspace:function(name){loadWorkspace(name)}};})();`;
 const window={FPSInventory:require('../inventory.js'),FPSCatalog:require('../collection-catalog.js'),FPS_CLOUD_CONFIG:{enabled:true,url:'https://example.test',publishableKey:'test-publishable-key'}},context={window,document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(store.failWrites)throw Error("storage full");store.set(k,v)},removeItem:k=>store.delete(k)},navigator:{onLine:true},setTimeout:()=>0,clearTimeout(){},URL,Blob,console};
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
 api.setClient({from:()=>({select:()=>({order:()=>({range:async()=>({data:[]})})})}),rpc:async()=>{if(++pushed===2)throw Error('network interrupted');return {data:[{applied:true,current_revision:1}]}}});
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
 api.setClient({from:()=>({select:()=>({order:()=>({range:async()=>({data:[]})})})}),rpc:async(name,args)=>{savedPayload=JSON.parse(JSON.stringify(args.p_payload));item.acquisitions.push({id:'late',quantity:1,date:'',cost:null});item.local_dirty=true;return {data:[{applied:true,current_revision:1}]}}});
 await api.cloudSync({silent:true});assert.equal(savedPayload.acquisitions.length,0);assert.equal(item.local_dirty,true);assert.equal(item.cloud_revision,1);
 api.setClient({from:()=>({select:()=>({order:()=>({range:async()=>({data:[]})})})}),rpc:async(name,args)=>{savedPayload=args.p_payload;return {data:[{applied:true,current_revision:2}]}}});await api.cloudSync({silent:true});assert.equal(savedPayload.acquisitions.length,1);assert.equal(item.local_dirty,false);
});

function pagedClient(read,rpc){return {from:()=>({select:()=>({order:(column,options)=>({range:(from,to)=>read(from,to,column,options)})})}),rpc:rpc||(async()=>({data:[]}))}}
test('old account pull cannot persist into a new workspace, including switch away and back',async()=>{
 for(const back of [false,true]){const {api,store}=app();api.workspace('user_A');api.setCloudUser({id:'A'});
 api.setClient(pagedClient(async()=>{api.workspace('user_B');api.setCloudUser({id:'B'});if(back){api.workspace('user_A');api.setCloudUser({id:'A'})}return {data:[{id:'private-A',payload:{kind:'collection',name:'old response'},revision:1}]}}));
 await api.cloudSync({silent:true});assert.equal(api.getRecords().length,0);assert.equal(store.has('fps_workspace_v2_user_B'),false);assert.equal(store.has('fps_workspace_v2_user_A'),false)}
});
test('old write acknowledgement and remaining batch stop after identity changes',async()=>{
 const {api,store}=app();api.workspace('user_A');api.setCloudUser({id:'A'});api.setRecords(['first','second'].map(id=>api.migrateRecord({id})));api.persist();let writes=0;
 api.setClient(pagedClient(async()=>({data:[]}),async()=>{writes++;api.workspace('user_B');api.setCloudUser({id:'B'});return {data:[{applied:true,current_revision:1}]}}));
 await api.cloudSync({silent:true});assert.equal(writes,1);assert.equal(api.getRecords().length,0);assert.equal(store.has('fps_workspace_v2_user_B'),false);api.workspace('user_A');assert.equal(api.getRecords()[0].local_dirty,true);
});
test('pagination restores 1201 records in stable 500-row pages including tombstones',async()=>{
 const {api}=app();api.workspace('user_pages');api.setCloudUser({id:'pages'});const remote=Array.from({length:1201},(_,i)=>({id:String(i).padStart(5,'0'),payload:{kind:'collection',name:'row '+i},revision:1,deleted_at:i===1000?'2026-10-10':null}));let pages=0;
 api.setClient(pagedClient(async(from,to,column,options)=>{pages++;assert.equal(column,'id');assert.equal(options.ascending,true);assert.equal(to-from,499);return {data:remote.slice(from,to+1)}}));
 await api.cloudSync({silent:true});assert.equal(pages,3);assert.equal(api.getRecords().length,1200);assert.equal(api.getRecords().some(r=>r.id==='01200'),true);assert.equal(api.getRecords().some(r=>r.id==='01000'),false);
});
test('second-page failure leaves the existing workspace unchanged',async()=>{
 const {api}=app();api.workspace('user_page_error');api.setCloudUser({id:'pages'});api.setRecords([api.migrateRecord({id:'local'})]);
 api.setClient(pagedClient(async(from)=>from?{error:Error('page failed')}:{data:Array.from({length:500},(_,i)=>({id:'remote'+i,payload:{},revision:1}))}));await api.cloudSync({silent:true});assert.deepEqual(Array.from(api.getRecords(),r=>r.id),['local']);
});
test('delete during first upload keeps the record deleted and advances its pending revision',async()=>{
 const {api,store}=app();api.workspace('user_delete');api.setCloudUser({id:'delete'});const item=api.migrateRecord({id:'during-write'});api.setRecords([item]);let deletes=0;
 api.setClient(pagedClient(async()=>({data:[]}),async(name,args)=>{if(args.p_deleted){deletes++;return {data:[{applied:true,current_revision:2}]}}api.deleteRecord(item.id);return {data:[{applied:true,current_revision:1}]}}));await api.cloudSync({silent:true});
 assert.equal(api.getRecords().length,0);assert.equal(deletes,0);const tombs=JSON.parse(store.get('fps_cloud_tombstones_v2_user_delete'));assert.equal(tombs[0].cloud_revision,1);
 tombs[0].ready_after=0;store.set('fps_cloud_tombstones_v2_user_delete',JSON.stringify(tombs));api.workspace('user_delete');await api.cloudSync({silent:true});assert.equal(deletes,1);assert.equal(api.getRecords().length,0);
});
test('undo during an in-flight cloud delete retains restored data for a later upload',async()=>{
 const {api,window,store}=app();api.workspace('user_undo');api.setCloudUser({id:'undo'});const item=api.migrateRecord({id:'undo-delete',cloud_revision:1,local_dirty:false});api.setRecords([item]);api.deleteRecord(item.id);const tombs=JSON.parse(store.get('fps_cloud_tombstones_v2_user_undo'));tombs[0].ready_after=0;store.set('fps_cloud_tombstones_v2_user_undo',JSON.stringify(tombs));api.workspace('user_undo');
 api.setClient(pagedClient(async()=>({data:[]}),async()=>{window.undo();return {data:[{applied:true,current_revision:2,current_deleted_at:'2026-10-10'}]}}));await api.cloudSync({silent:true});assert.equal(api.getRecords().length,1);assert.equal(api.getRecords()[0].cloud_revision,2);assert.equal(api.getRecords()[0].local_dirty,true);
});
test('cross-account backup copies reset cloud state and repeated imports skip existing copies',async()=>{
 const {api}=app();api.workspace('user_B');api.setCloudUser({id:'B'});const backup={workspace:'user_A',records:[{id:'A-row',kind:'collection',name:'copy',cloud_revision:99,local_dirty:false,acquisitions:[{id:'acq',quantity:2}]}]};const plan=api.planBackupImport(backup);assert.equal(plan.foreign,true);assert.notEqual(plan.added[0].id,'A-row');assert.equal(plan.added[0].cloud_revision,0);assert.equal(plan.added[0].local_dirty,true);api.applyBackupImport(plan);assert.equal(api.collectionQuantity(api.getRecords()[0]),2);assert.equal(api.planBackupImport(backup).added.length,0);
 let saved;api.setClient(pagedClient(async()=>({data:[]}),async(name,args)=>{saved=args;return {data:[{applied:true,current_revision:1}]}}));await api.cloudSync({silent:true});assert.equal(saved.p_base_revision,0);assert.equal(saved.p_payload.name,'copy');
});
test('same-workspace restore skips live IDs and copies records pending deletion without cancelling deletion',()=>{
 const {api,store}=app();api.workspace('user_restore');api.setRecords([api.migrateRecord({id:'existing',name:'keep'})]);api.deleteRecord('existing');const plan=api.planBackupImport({workspace:'user_restore',records:[{id:'existing',name:'restore',cloud_revision:12}]});assert.notEqual(plan.added[0].id,'existing');api.applyBackupImport(plan);assert.equal(JSON.parse(store.get('fps_cloud_tombstones_v2_user_restore')).length,1);assert.equal(api.planBackupImport({workspace:'user_restore',records:[{id:'existing'}]}).added.length,0);
 const again=api.planBackupImport({workspace:'user_restore',records:[{id:plan.added[0].id,name:'overwrite'}]});assert.equal(again.added.length,0);assert.equal(api.getRecords()[0].name,'restore');
});
test('invalid backups and storage failures do not partially import records',()=>{
 const {api,store}=app();api.setRecords([api.migrateRecord({id:'keep'})]);assert.throws(()=>api.planBackupImport({records:[{id:'good'},null]}));assert.equal(api.getRecords().length,1);const plan=api.planBackupImport({workspace:'other',records:[{id:'new'}]});store.failWrites=true;assert.throws(()=>api.applyBackupImport(plan),/storage full/);assert.equal(api.getRecords().length,1);assert.equal(store.size,0);
});
test('large delete queues retain every tombstone on disk',()=>{
 const {api,store}=app();api.workspace('user_queue');api.setRecords(Array.from({length:1002},(_,i)=>api.migrateRecord({id:'delete'+i})));for(let i=0;i<1002;i++)api.deleteRecord('delete'+i);assert.equal(JSON.parse(store.get('fps_cloud_tombstones_v2_user_queue')).length,1002);
});

function stockEntry(app,type,quantity,date='',note=''){const {element,api}=app;element('inventoryType').value=type;element('inventoryQuantity').value=String(quantity);element('inventoryDate').value=date;element('inventoryNote').value=note;api.saveInventory({preventDefault(){}})}
test('inventory ledger supports all reductions, transfer-in, absolute correction and later acquisitions',()=>{
 const a=app(),{api}=a,item=api.migrateRecord({id:'inventory',kind:'collection',name:'stock',starting_quantity:10});api.setRecords([item]);api.select(item.id);
 for(const type of ['sale','consume','loss','transfer_out'])stockEntry(a,type,1);assert.equal(api.collectionQuantity(item),6);stockEntry(a,'transfer_in',2);assert.equal(api.collectionQuantity(item),8);
 stockEntry(a,'correction',3);assert.equal(api.collectionQuantity(item),3);api.quickAcquire(item.id);assert.equal(api.collectionQuantity(item),4);assert.equal(item.acquisitions.length,1);assert.equal(item.inventory_events.length,6);assert.equal(item.inventory_events[5].date,'');assert.equal(api.matchRecords().length,0);
});
test('correction zero and zero-stock status preserve acquisition history',()=>{
 const a=app(),{api}=a,item=api.migrateRecord({id:'zero',kind:'collection',acquisitions:[{id:'old',quantity:2}]});api.setRecords([item]);api.select(item.id);stockEntry(a,'correction',0);assert.equal(api.collectionQuantity(item),0);assert.equal(api.collectionStatus(item),'当前无库存');assert.equal(item.acquisitions.length,1);assert.equal(item.acquisitions[0].quantity,2);
 api.quickAcquire(item.id);assert.equal(api.collectionQuantity(item),1);assert.equal(item.acquisitions.length,2);
});
test('optional dates never reorder ledger; backfilling older acquisition does not override a later stocktake',()=>{
 const a=app(),{api,element}=a,item=api.migrateRecord({id:'dates',kind:'collection',acquisitions:[{id:'old',quantity:5,date:''}]});api.setRecords([item]);api.select(item.id);stockEntry(a,'correction',2,'2026-01-01');
 api.editAcquisition(item.id,'old');element('acquisitionDate').value='2026-10-11';element('acquisitionQuantity').value='6';element('acquisitionCost').value='';api.saveAcquisition({preventDefault(){}});assert.equal(api.collectionQuantity(item),2);assert.equal(item.acquisitions[0].quantity,6);api.quickAcquire(item.id);assert.equal(api.collectionQuantity(item),3);
});
test('negative stock, fractional amounts, missing correction targets and bad dates never mutate history',()=>{
 const a=app(),{api}=a,item=api.migrateRecord({id:'guard',kind:'collection',starting_quantity:1});api.setRecords([item]);api.select(item.id);
 for(const [type,q,date] of [['consume',2,''],['sale',.5,''],['correction','',''],['loss',-1,''],['correction',1,'2026-02-30'],['unknown',1,'']])stockEntry(a,type,q,date);
 assert.equal(item.inventory_events.length,0);assert.equal(api.collectionQuantity(item),1);
});
test('undo keeps a voided movement in history and cannot cross workspaces',()=>{
 const a=app(),{api,window}=a,item=api.migrateRecord({id:'undo-stock',kind:'collection',starting_quantity:5});api.setRecords([item]);api.select(item.id);stockEntry(a,'sale',2);assert.equal(api.collectionQuantity(item),3);window.undo();assert.equal(api.collectionQuantity(item),5);assert.equal(item.inventory_events[0].voided,true);window.undo();assert.equal(api.collectionQuantity(item),3);
 stockEntry(a,'consume',1);const undo=window.undo;api.workspace('user_other_stock');undo();assert.equal(api.getRecords().length,0);api.workspace('guest');assert.equal(api.collectionQuantity(api.getRecords()[0]),2);
});
test('editing movement preserves sequence and undo restores the original movement',()=>{
 const a=app(),{api,window}=a,item=api.migrateRecord({id:'edit-stock',kind:'collection',starting_quantity:5});api.setRecords([item]);api.select(item.id);stockEntry(a,'sale',1);const id=item.inventory_events[0].id;api.editInventory(item.id,id);stockEntry(a,'sale',2,'2026-10-11','补充备注');assert.equal(api.collectionQuantity(item),3);assert.equal(item.inventory_events.length,1);assert.equal(item.inventory_events[0].seq,1);window.undo();assert.equal(api.collectionQuantity(item),4);assert.equal(item.inventory_events[0].quantity,1);assert.equal(item.inventory_events[0].voided,false);
});
test('removing acquisitions or earlier corrections cannot make later consumption negative',()=>{
 const a=app(),{api,window}=a,item=api.migrateRecord({id:'dependencies',kind:'collection'});api.setRecords([item]);api.select(item.id);api.quickAcquire(item.id);const acquisitionUndo=window.undo;stockEntry(a,'consume',1);api.deleteAcquisition(item.id,item.acquisitions[0].id);assert.equal(item.acquisitions.length,1);acquisitionUndo();assert.equal(item.acquisitions.length,1);
 stockEntry(a,'correction',2);const correction=item.inventory_events[1].id;stockEntry(a,'consume',2);api.voidInventory(item.id,correction);assert.equal(item.inventory_events[1].voided,false);assert.equal(api.collectionQuantity(item),0);
});
test('inventory history survives cloud and backup round trips without opting into community',async()=>{
 const a=app(),{api}=a,item=api.migrateRecord({id:'roundtrip-stock',kind:'collection',starting_quantity:4});api.setRecords([item]);api.select(item.id);stockEntry(a,'sale',1);stockEntry(a,'correction',5);api.quickAcquire(item.id);
 const restored=api.remoteToLocal({id:item.id,revision:3,payload:JSON.parse(JSON.stringify(api.cloudPayload(item)))});assert.equal(api.collectionQuantity(restored),6);assert.equal(restored.inventory_events.length,2);assert.equal(restored.acquisitions[0].inventory_seq,3);
 const plan=api.planBackupImport({workspace:'user_foreign',records:[restored]});assert.equal(api.collectionQuantity(plan.added[0]),6);let shared;api.setClient({rpc:async(name,args)=>{shared=args.p_share_community;return {data:[{applied:true}]}}});await api.pushRecordWithRevision(restored,true);assert.equal(shared,false);
});
test('storage failure leaves stock and movement history intact',()=>{
 const a=app(),{api,store}=a,item=api.migrateRecord({id:'quota-stock',kind:'collection',starting_quantity:5});api.setRecords([item]);api.select(item.id);store.failWrites=true;stockEntry(a,'consume',2);assert.equal(api.collectionQuantity(item),5);assert.equal(item.inventory_events.length,0);
});
test('editing acquisition quantity is rejected when it would invalidate an existing sale',()=>{
 const a=app(),{api,element}=a,item=api.migrateRecord({id:'edit-dependency',kind:'collection',acquisitions:[{id:'original',quantity:2}]});api.setRecords([item]);api.select(item.id);stockEntry(a,'sale',2);api.editAcquisition(item.id,'original');element('acquisitionQuantity').value='1';api.saveAcquisition({preventDefault(){}});assert.equal(item.acquisitions[0].quantity,2);assert.equal(api.collectionQuantity(item),0);
});
test('CSV export includes movement type, before/after balances, optional date and cancelled history',async()=>{
 const a=app(),{api,window}=a,item=api.migrateRecord({id:'csv-stock',kind:'collection',name:'CSV',starting_quantity:4});api.setRecords([item]);api.select(item.id);stockEntry(a,'sale',1,'','价格后补');stockEntry(a,'correction',2);window.undo();api.exportCollectionCSV();const csv=await window.lastDownload.blob.text();assert.match(csv,/变动前库存/);assert.match(csv,/出售/);assert.match(csv,/校正/);assert.match(csv,/已撤销/);assert.match(csv,/价格后补/);assert.equal(api.collectionQuantity(item),3);
});
