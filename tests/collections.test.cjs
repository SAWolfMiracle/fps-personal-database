// Regression checks for mixed workspaces; run with node --test tests/collections.test.cjs.
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
function app(motion){
 let clock=Date.now();class TestDate extends Date{static now(){return clock}}
 const fields=new Map(),store=new Map();
 const element=id=>{if(!fields.has(id))fields.set(id,{id:id,value:'',innerHTML:'',textContent:'',hidden:false,attributes:{},setAttribute(k,v){this.attributes[k]=String(v)},getAttribute(k){return this.attributes[k]},reset(){},focus(){},scrollIntoView(options){this.scrollOptions=options;this.scrollCount=(this.scrollCount||0)+1},appendChild(child){this.child=child;child.parentNode=this},classList:{add(){},remove(){}}});return fields.get(id)};
 const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 let source=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
 source=source.slice(0,source.indexOf('$("deleteFilteredCollectionsBtn").addEventListener'));
 source+=`renderAll=function(){};renderCloudPanel=function(){};refreshCommunityStats=function(){};scheduleCloudSync=function(){};saveAndRender=function(){persist()};showToast=function(msg,label,action){window.undo=action};download=function(blob,name){window.lastDownload={blob,name}};
 window.test={commitPersonal,requestDuplicateCleanup,mergeGuestIntoCurrent,quickDeckAcquire,quickDeckAcquireMany,addThemeCatalog,deckState,deckBookHTML,renderDashboard,renderAnalytics,makeTabs,switchTab,homePreferences,saveHomePreferences,cloudSendEmailOtp,cloudVerifyEmailOtp,pendingOtp:()=>pendingEmailOtp,stubActivation:function(){activateWorkspaceForUser=function(user){activeWorkspace=workspaceForUser(user);loadWorkspace(activeWorkspace)}},setSelection:function(ids){collectionSelection=new Set(ids)},editCollection,collectionGuideHTML,toggleCollectionDetail,renderCollections,exportCollectionCSV,saveInventory,voidInventory,editInventory,resetInventoryForm,openInventory,planBackupImport,applyBackupImport,cloudSync,setCloudUser:function(u){cloudUser=u},importCollectionCatalog,setCatalog:function(c){collectionCatalog=c},migrateRecord,collectionQuantity,collectionStatus,matchRecords,collectionRecords,summary,filtered,saveCollection,saveAcquisition,quickAcquire,editAcquisition,resetAcquisitionForm,deleteAcquisition,pushRecordWithRevision,remoteToLocal,cloudPayload,loadWorkspace,persist,deleteRecord,
 setRecords:function(x){records=x},getRecords:function(){return records},setClient:function(x){cloudClient=x},select:function(id){collectionSelectedId=id},workspace:function(name){loadWorkspace(name)},collectionMatchesGrade,requestBulkDelete,confirmBulkDelete,cancelBulkDelete,filteredCollections};})();`;
 const window={ArcaMotion:motion?{create:()=>motion}:undefined,FPSPersonal:require('../personal-features.js'),FPSDuplicates:require('../collection-duplicates.js'),FPSHome:require('../home-dashboard.js'),FPSInventory:require('../inventory.js'),FPSCatalog:require('../collection-catalog.js'),FPS_CLOUD_CONFIG:{enabled:true,url:'https://example.test',publishableKey:'test-publishable-key'}},context={window,document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(store.failKeyOnce===k){store.failKeyOnce=null;throw Error("one write failed")}if(store.failWrites)throw Error("storage full");store.set(k,v)},removeItem:k=>store.delete(k)},navigator:{onLine:true},setTimeout:()=>0,clearTimeout(){},URL,Blob,console};
 window.FPS_CLOUD_CONFIG.emailMagicLink=true;window.FPS_CLOUD_CONFIG.manualLinking=true;context.Date=TestDate;context.location={origin:'https://example.test',pathname:'/app/'};vm.runInNewContext(source,context);return {api:window.test,window,element,store,advanceTime:ms=>{clock+=ms}};
}
test('bulk filtered deletion includes unrendered matches, keeps matches and other grades, and undo restores inventory histories',()=>{
 const {api,window,element}=app();api.workspace('bulk');
 const items=Array.from({length:30},(_,i)=>api.migrateRecord({id:'red'+i,kind:'collection',game:'三角洲行动',name:'红'+i,catalog_grade:6,acquisitions:[{id:'a'+i,quantity:1,date:'',source:'',cost:null,note:''}],inventory_events:[]}));
 const white=api.migrateRecord({id:'white',kind:'collection',catalog_grade:1,name:'白',game:'三角洲行动'}),match=api.migrateRecord({id:'match',game:'CS2'});
 api.setRecords(items.concat([white,match]));element('collectionFilterGrade').value='6';api.requestBulkDelete('filtered');assert.match(element('deleteConfirmText').textContent,/30 条/);assert.equal(api.getRecords().length,32);
 api.cancelBulkDelete();api.confirmBulkDelete();assert.equal(api.getRecords().length,32);
 api.requestBulkDelete('filtered');api.confirmBulkDelete();assert.deepEqual(Array.from(api.getRecords(),r=>r.id),['white','match']);window.undo();assert.equal(api.getRecords().length,32);assert.equal(api.getRecords()[0].acquisitions[0].quantity,1);
 api.workspace('bulk');assert.equal(api.getRecords().length,32);
});
test('bulk tombstones persist, wait through undo window, and synchronize deletion with the original revision',async()=>{
 const {api,advanceTime}=app();api.workspace('sync_bulk');api.setCloudUser({id:'sync_bulk'});api.setRecords([api.migrateRecord({id:'cloud_item',kind:'collection',name:'云记录',cloud_revision:7,local_dirty:false})]);let calls=[];
 api.setClient({from:()=>({select:()=>({order:()=>({range:async()=>({data:[]})})})}),rpc:async(name,args)=>{calls.push(args);return {data:[{applied:true,current_revision:8}]}}});
 api.requestBulkDelete('collections');api.confirmBulkDelete();api.workspace('sync_bulk');await api.cloudSync({silent:true});assert.equal(calls.length,0);assert.equal(api.getRecords().length,0);
 advanceTime(11000);await api.cloudSync({silent:true});assert.equal(calls.length,1);assert.equal(calls[0].p_id,'cloud_item');assert.equal(calls[0].p_base_revision,7);assert.equal(calls[0].p_deleted,true);assert.equal(calls[0].p_share_community,false);
});
test('bulk deletion confirmation and undo cannot cross workspace switches; failed saves keep all records',()=>{
 const {api,window,store}=app();api.workspace('one');const r=api.migrateRecord({id:'one',kind:'collection',name:'测试'});api.setRecords([r]);api.requestBulkDelete('collections');api.workspace('two');api.setRecords([api.migrateRecord({id:'two',kind:'collection',name:'其他'})]);api.confirmBulkDelete();assert.equal(api.getRecords()[0].id,'two');
 api.requestBulkDelete('all');store.failWrites=true;api.confirmBulkDelete();assert.equal(api.getRecords()[0].id,'two');store.failWrites=false;
 api.requestBulkDelete('collections');api.confirmBulkDelete();assert.equal(api.getRecords().length,0);api.workspace('one');window.undo();assert.equal(api.getRecords().length,0);
});
test('email OTP logs into the current context without copying guest data or storing the code',async()=>{
 const {api,element,store}=app();api.stubActivation();api.workspace('guest');api.setRecords([api.migrateRecord({id:'guest',kind:'collection',name:'访客'})]);api.persist();element('cloudEmail').value='test@example.test';let calls=[];
 api.setClient({auth:{signInWithOtp:async x=>{calls.push(x);return {data:{},error:null}},verifyOtp:async x=>{calls.push(x);return {data:{user:{id:'email_user',email:'test@example.test',is_anonymous:false}}}}}});
 await api.cloudSendEmailOtp();assert.equal(api.pendingOtp().type,'email');element('cloudOtpCode').value='123456';await api.cloudVerifyEmailOtp();assert.equal(calls[1].type,'email');assert.equal(api.getRecords().length,0);api.workspace('guest');assert.equal(api.getRecords()[0].id,'guest');assert.equal(element('cloudOtpCode').value,'');assert.equal([...store.values()].some(x=>x.includes('123456')),false);
});
test('anonymous OTP binding uses email_change and preserves the original user workspace',async()=>{
 const {api,element}=app();api.stubActivation();api.workspace('user_anon');api.setCloudUser({id:'anon',is_anonymous:true});api.setRecords([api.migrateRecord({id:'owned',kind:'collection',name:'原数据'})]);api.persist();element('cloudEmail').value='test@example.test';let args;
 api.setClient({auth:{updateUser:async()=>({data:{},error:null}),verifyOtp:async x=>{args=x;return {data:{user:{id:'anon',is_anonymous:false,email:'test@example.test'}}}}}});await api.cloudSendEmailOtp();element('cloudOtpCode').value='12345678';await api.cloudVerifyEmailOtp();assert.equal(args.type,'email_change');assert.equal(api.getRecords()[0].id,'owned');
});
test('failed OTP remains retryable; resend cooldown and changed identities prevent unwanted requests',async()=>{
 const {api,element}=app();element('cloudEmail').value='test@example.test';let sent=0,verified=0;api.setClient({auth:{signInWithOtp:async()=>{sent++;return {error:null}},verifyOtp:async()=>{verified++;return {error:{message:'expired'}}}}});await api.cloudSendEmailOtp();await api.cloudSendEmailOtp();assert.equal(sent,1);element('cloudOtpCode').value='123456';await api.cloudVerifyEmailOtp();assert.match(element('cloudOtpStatus').textContent,/expired/);assert.ok(api.pendingOtp());api.setCloudUser({id:'other'});await api.cloudVerifyEmailOtp();assert.equal(verified,1);assert.equal(api.pendingOtp(),null);
});
test('selected deletion affects only chosen collections and selection cannot cross workspaces',()=>{
 const {api,window,element}=app();api.workspace('selection');api.setRecords(['a','b','c'].map(id=>api.migrateRecord({id,kind:'collection',name:id})));
 api.setSelection(['b','missing']);api.requestBulkDelete('selected');assert.match(element('deleteConfirmText').textContent,/1 条/);api.confirmBulkDelete();assert.deepEqual(Array.from(api.getRecords(),r=>r.id),['a','c']);window.undo();assert.equal(api.getRecords().length,3);
 api.setSelection(['a']);api.workspace('other');api.setRecords([api.migrateRecord({id:'a',kind:'collection',name:'other'})]);api.requestBulkDelete('selected');api.confirmBulkDelete();assert.equal(api.getRecords().length,1);
});
test('editing and inventory actions reveal collapsed editors without changing item contents',()=>{
 const {api,element}=app();api.setRecords([api.migrateRecord({id:'x',kind:'collection',name:'原名',starting_quantity:3})]);api.editCollection('x');assert.equal(element('collectionEditor').open,true);assert.equal(element('collectionExtras').open,true);assert.equal(element('collectionName').value,'原名');api.openInventory('x',true);assert.equal(element('inventoryEditor').open,true);assert.equal(element('inventoryQuantity').value,3);
});
test('grade filter uses saved grades and catalogue identities without mixing other games or changing records',()=>{
 const {api}=app();api.setCatalog(require('../collection-catalog.json'));
 const red={game:'三角洲行动',name:'自定义名字',catalog_item_id:'orzice:p1518',catalog_grade:6,starting_quantity:2};const before=JSON.stringify(red);
 assert.equal(api.collectionMatchesGrade(red,'6'),true);assert.equal(api.collectionMatchesGrade(red,'1'),false);assert.equal(api.collectionMatchesGrade(red,''),true);
 assert.equal(api.collectionMatchesGrade({game:'三角洲行动',name:'阿萨拉牌-牌盒'},'6'),true);
 assert.equal(api.collectionMatchesGrade({game:'三角洲行动',name:'鼠标'},'1'),true);
 assert.equal(api.collectionMatchesGrade({game:'其他游戏',name:'鼠标'},'1'),false);
 for(const grade of [undefined,0,7,2.5,'invalid'])assert.equal(api.collectionMatchesGrade({game:'其他游戏',name:'自定义',catalog_grade:grade},'unknown'),true);
 assert.equal(JSON.stringify(red),before);
});
test('custom special group survives save, workspace reload, and cloud round trip',()=>{
 const {api,element}=app();api.workspace('user_special');element('collectionName').value='任务藏品';element('collectionGroup').value='赛季专项';element('collectionMethod').value='任务兑换，条件待核实';element('collectionCategory').value='自定义分类';element('collectionTarget').value='3';api.saveCollection({preventDefault(){}});
 const original=api.getRecords()[0];assert.equal(original.collection_group,'赛季专项');assert.equal(original.category,'自定义分类');assert.equal(original.target,3);
 api.workspace('guest');assert.equal(api.getRecords().length,0);api.workspace('user_special');assert.equal(api.getRecords()[0].collection_group,'赛季专项');
 const restored=api.remoteToLocal({id:original.id,revision:1,payload:JSON.parse(JSON.stringify(api.cloudPayload(original)))});assert.equal(restored.collection_group,'赛季专项');assert.equal(restored.obtain_method,'任务兑换，条件待核实');assert.equal(restored.id,original.id);assert.equal(restored.target,3);
});
test('obtain method renders as escaped text without changing inventory',()=>{
 const {api}=app();const record={game:'三角洲行动',name:'自定义',obtain_method:'<img src=x onerror=alert(1)>',starting_quantity:2,acquisitions:[]};const before=JSON.stringify(record);
 const markup=api.collectionGuideHTML(record);assert.match(markup,/&lt;img/);assert.doesNotMatch(markup,/<img/);assert.match(markup,/未独立核实/);assert.match(markup,/出现地图/);assert.match(markup,/具体产出地图待核实/);assert.match(markup,/具体行动难度待核实/);assert.match(markup,/<details class="collection-guide" open>/);assert.equal(JSON.stringify(record),before);
});
test('collection details expand inside the selected item and close without jumping to a list footer',()=>{
 const {api,element}=app();api.setRecords([api.migrateRecord({id:'inline',kind:'collection',game:'三角洲行动',name:'卡片内详情',acquisitions:[]})]);
 api.toggleCollectionDetail('inline');assert.match(element('collectionList').innerHTML,/id="collectionDetailSlot"/);assert.equal(element('collectionDetail').hidden,false);assert.equal(element('collectionDetail').parentNode.id,'collectionDetailSlot');assert.equal(element('collectionDetail').scrollCount||0,0);assert.equal(element('collectionDetailSlot').scrollOptions.block,'nearest');
 api.toggleCollectionDetail('inline');assert.doesNotMatch(element('collectionList').innerHTML,/id="collectionDetailSlot"/);assert.equal(element('collectionDetail').hidden,true);assert.equal(element('collectionDetail').parentNode.id,'collectionDetailParking');
});
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

test('homepage preferences remain independent across account and guest workspaces',()=>{
 const {api,element}=app();api.workspace('guest');api.saveHomePreferences({matches:false,collections:true,pins:['自定义专项']});assert.equal(element('homeMatchSummary').hidden,true);assert.match(element('homePinnedCollections').innerHTML,/自定义专项/);
 api.workspace('user_example');assert.equal(api.homePreferences().matches,true);assert.deepEqual(Array.from(api.homePreferences().pins),['阿萨拉牌']);api.saveHomePreferences({matches:true,collections:false,pins:[]});assert.equal(element('homeCollectionSummary').hidden,true);
 api.workspace('guest');assert.equal(api.homePreferences().matches,false);assert.deepEqual(Array.from(api.homePreferences().pins),['自定义专项']);
});
test('deck quick entry creates only the selected card, increments existing stock, and supports undo',()=>{
 const {api,window}=app();api.workspace('guest');api.quickDeckAcquire('orzice:p1517');assert.equal(api.getRecords().length,1);let r=api.getRecords()[0];assert.equal(r.name,'阿萨拉牌-大王');assert.equal(api.collectionQuantity(r),1);assert.equal(r.acquisitions[0].date,'');window.undo();assert.equal(api.collectionQuantity(r),0);
 api.quickDeckAcquire('orzice:p1517');api.quickDeckAcquire('orzice:p1517');assert.equal(api.getRecords().length,1);assert.equal(api.collectionQuantity(r),2);window.undo();assert.equal(api.collectionQuantity(r),1);assert.equal(api.deckState().filter(x=>x.name!=='阿萨拉牌-牌盒'&&x.quantity>0).length,1);
});
test('deck entry rolls back on storage failure and undo cannot cross workspaces',()=>{
 const {api,window,store}=app();api.workspace('guest');store.failWrites=true;api.quickDeckAcquire('orzice:p1517');assert.equal(api.getRecords().length,0);store.failWrites=false;api.quickDeckAcquire('orzice:p1517');const undo=window.undo;api.workspace('user_other');undo();assert.equal(api.getRecords().length,0);api.workspace('guest');assert.equal(api.collectionQuantity(api.getRecords()[0]),1);
});
test('deck state uses strongest duplicate inventory without counting copies as separate cards',()=>{
 const {api}=app();api.setRecords([api.migrateRecord({id:'a',kind:'collection',game:'三角洲行动',catalog_item_id:'orzice:p1517',starting_quantity:1}),api.migrateRecord({id:'b',kind:'collection',game:'三角洲行动',catalog_item_id:'orzice:p1517',starting_quantity:2})]);let cards=api.deckState();assert.equal(cards.length,55);assert.equal(cards.find(x=>x.id==='orzice:p1517').quantity,2);api.quickDeckAcquire('orzice:p1517');assert.equal(api.getRecords().length,2);assert.equal(api.collectionQuantity(api.getRecords()[1]),3);assert.match(api.deckBookHTML(),/已拥有 1 \/ 54/);
});
test('empty catalog cleanup hides copies, uses tombstones, and can undo without losing inventory',()=>{
 const {api,window}=app();api.workspace('guest');const base={kind:'collection',game:'三角洲行动',catalog_item_id:'orzice:p100',name:'物品',import_source:'catalog',target:1};api.setRecords([api.migrateRecord({...base,id:'blank'}),api.migrateRecord({...base,id:'held',starting_quantity:1})]);assert.equal(api.filteredCollections().length,1);api.requestDuplicateCleanup();api.confirmBulkDelete();assert.deepEqual(Array.from(api.getRecords(),x=>x.id),['held']);assert.equal(api.collectionQuantity(api.getRecords()[0]),1);window.undo();assert.equal(api.getRecords().length,2);
});
test('cleanup confirmation rejects a duplicate that gained history after planning',()=>{
 const {api}=app();const base={kind:'collection',game:'三角洲行动',catalog_item_id:'orzice:p100',name:'物品',import_source:'catalog',target:1};api.setRecords(['a','b'].map(id=>api.migrateRecord({...base,id})));api.requestDuplicateCleanup();api.getRecords()[1].acquisitions.push({id:'new',quantity:1,date:'',source:'',cost:null,note:'',inventory_seq:1});api.confirmBulkDelete();assert.equal(api.getRecords().length,2);
});

// Exercise the new progress display against real workspace inventory semantics.
test('dashboard ring reports zero, fractional progress and completed goals without changing records',()=>{
 const {api,element}=app();api.setRecords([]);api.renderDashboard();assert.equal(element('homeRingPercent').textContent,'0%');assert.equal(element('homeSuccess').textContent,'—');
 const rows=Array.from({length:534},(_,i)=>api.migrateRecord({id:'ring-'+i,kind:'collection',game:'三角洲行动',name:'收藏'+i,target:1,starting_quantity:i===0?1:0}));
 api.setRecords(rows);const before=JSON.stringify(api.getRecords());api.renderDashboard();assert.equal(element('homeRingPercent').textContent,'0.2%');assert.equal(element('homeCollectionProgress').value,1);assert.match(element('homeCollectionRing').getAttribute('aria-label'),/1 \/ 534/);assert.ok(Math.abs(parseFloat(element('homeRingArc').getAttribute('stroke-dasharray'))-100/534)<1e-9);assert.equal(JSON.stringify(api.getRecords()),before);
 api.setRecords([api.migrateRecord({kind:'collection',name:'达标物品',target:2,starting_quantity:2})]);api.renderDashboard();assert.equal(element('homeRingPercent').textContent,'100%');assert.equal(element('homeRingArc').getAttribute('stroke-dasharray'),'100 100');
 api.setRecords([api.migrateRecord({kind:'collection',name:'未达标物品',target:2,starting_quantity:1})]);api.renderDashboard();assert.equal(element('homeCollected').textContent,1);assert.equal(element('homeRingPercent').textContent,'0%');
});
test('recent match list orders by timestamp, escapes text and preserves missing versus zero profit',()=>{
 const {api,element}=app();api.setRecords([api.migrateRecord({id:'old',ts:100,game:'CS2',map:'旧记录',result:'失败',profit:0,kills:1,deaths:1}),api.migrateRecord({id:'new',ts:200,game:'三角洲行动',map:'<img src=x onerror=alert(1)>',result:'撤离',profit:null,kills:3,deaths:0})]);
 const before=JSON.stringify(api.getRecords());api.renderDashboard();const html=element('recent').innerHTML;assert.ok(html.indexOf('&lt;img')<html.indexOf('旧记录'));assert.doesNotMatch(html,/<img/);assert.match(html,/class="goodtxt">0<\/b>/);assert.equal((html.match(/class="goodtxt"/g)||[]).length,1);assert.equal(element('homeSuccess').textContent,'50%');assert.equal(JSON.stringify(api.getRecords()),before);
});

test('empty dashboards avoid placeholder metrics and analysis panels; populated workspaces restore them',()=>{
 const {api,element}=app();api.setRecords([]);api.renderDashboard();api.renderAnalytics();assert.equal(element('homeMatchMetrics').hidden,true);assert.equal(element('homeMatchEmpty').hidden,false);assert.equal(element('analyticsContent').hidden,true);assert.equal(element('analyticsEmpty').hidden,false);
 api.setRecords([api.migrateRecord({id:'first',game:'三角洲行动',kills:3,deaths:1,result:'撤离'})]);api.renderDashboard();api.renderAnalytics();assert.equal(element('homeMatchMetrics').hidden,false);assert.equal(element('homeMatchEmpty').hidden,true);assert.equal(element('analyticsContent').hidden,false);assert.equal(element('analyticsEmpty').hidden,true);assert.match(element('anaGames').innerHTML,/三角洲行动/);
});
test('mobile navigation keeps four destinations while match analysis and recording remain accessible',()=>{
 const {api,element}=app();api.makeTabs();const nav=element('mobileNav').innerHTML;assert.equal((nav.match(/data-mobile-nav=/g)||[]).length,4);for(const id of ['dashboard','records','collections','data'])assert.ok(nav.includes('data-tab="'+id+'"'));assert.ok(!nav.includes('data-tab="analytics"'));assert.ok(!nav.includes('data-tab="add"'));const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');assert.equal((html.match(/data-tab="analytics">统计分析/g)||[]).length,2);assert.ok(html.includes('id="analyticsFirstMatch"'));
});

test('batch deck acquisition deduplicates selected IDs and undo preserves later acquisitions',()=>{
 const {api,window}=app();api.workspace('guest');assert.equal(api.quickDeckAcquireMany(['orzice:p1517','orzice:p1524','orzice:p1517'],2),true);assert.equal(api.getRecords().length,2);for(const r of api.getRecords()){assert.equal(api.collectionQuantity(r),2);assert.equal(r.acquisitions[0].date,'');assert.equal(r.acquisitions[0].source,'')}const undo=window.undo;const r=api.getRecords()[0];r.acquisitions.push({id:'later',quantity:3,inventory_seq:2,date:'',source:'',note:''});undo();assert.equal(api.collectionQuantity(r),3);assert.equal(r.acquisitions[0].id,'later');assert.equal(api.collectionQuantity(api.getRecords()[1]),0);
});
test('batch deck acquisition rejects invalid IDs or quantities and failed persistence is atomic',()=>{
 const {api,store}=app();api.quickDeckAcquire('orzice:p1517');const before=JSON.stringify(api.getRecords());for(const q of [0,-1,1.5,NaN,1000000001])assert.equal(api.quickDeckAcquireMany(['orzice:p1517'],q),false);assert.equal(api.quickDeckAcquireMany(['orzice:p1517','invalid'],1),false);assert.equal(JSON.stringify(api.getRecords()),before);store.failWrites=true;assert.equal(api.quickDeckAcquireMany(['orzice:p1517','orzice:p1524'],2),false);assert.equal(JSON.stringify(api.getRecords()),before);
});
test('batch undo refuses negative downstream inventory as a whole and cannot cross account sessions',()=>{
 const {api,window}=app();api.workspace('guest');api.quickDeckAcquireMany(['orzice:p1517','orzice:p1524'],1);const undo=window.undo;api.getRecords()[0].inventory_events.push({id:'consume',seq:2,type:'consume',quantity:1,voided:false});const before=JSON.stringify(api.getRecords());undo();assert.equal(JSON.stringify(api.getRecords()),before);api.workspace('other');api.workspace('guest');const restored=JSON.stringify(api.getRecords());undo();assert.equal(JSON.stringify(api.getRecords()),restored);
});
test('theme directory imports are zero-stock, idempotent and included by the theme filter',()=>{
 const {api,element,store}=app();api.addThemeCatalog('海盗钱币');assert.equal(api.getRecords().length,3);assert.ok(api.getRecords().every(r=>api.collectionQuantity(r)===0&&r.acquisitions.length===0));api.addThemeCatalog('海盗钱币');assert.equal(api.getRecords().length,3);element('collectionFilterGroup').value='海盗钱币';assert.equal(api.filteredCollections().length,3);store.failWrites=true;api.addThemeCatalog('建筑图纸');assert.equal(api.getRecords().length,3);
});
test('module orders persist per workspace and drop removed pin identities',()=>{
 const {api}=app();api.workspace('guest');api.saveHomePreferences({pins:['海盗钱币'],order:['pin:海盗钱币','collections','matches','recent']});assert.equal(api.homePreferences().order[0],'pin:海盗钱币');api.workspace('other');assert.equal(api.homePreferences().order,undefined);api.workspace('guest');assert.equal(api.homePreferences().order[0],'pin:海盗钱币');api.saveHomePreferences({...api.homePreferences(),pins:[]});assert.ok(!api.homePreferences().order.includes('pin:海盗钱币'));
});

test('weapon plans survive migration, cloud payload and backup without entering match or collection totals',async()=>{
 const {api}=app();api.workspace('personal');const r=api.migrateRecord({id:'plan',kind:'weapon_plan',name:'机密 MCX',weapon:'MCX',game:'三角洲行动',budget:270000,loadout:[{slot:'弹药',name:'蓝弹',quantity:120,unit_price:100}],code:'code\nline',note:'50 米',screenshot:'data:image/jpeg;base64,YWJj'});
 api.setRecords([r,api.migrateRecord({id:'match',kind:'match',kills:2}),api.migrateRecord({id:'item',kind:'collection',showcase:{enabled:true,caption:'喜欢它',order:1}})]);api.persist();api.workspace('other');assert.equal(api.getRecords().length,0);api.workspace('personal');assert.equal(api.matchRecords().length,1);assert.equal(api.collectionRecords().length,1);
 const copy=api.remoteToLocal({id:r.id,revision:3,payload:api.cloudPayload(r)});assert.equal(copy.kind,'weapon_plan');assert.equal(copy.code,'code\nline');assert.equal(copy.screenshot,r.screenshot);assert.equal(copy.budget,270000);assert.equal(copy.loadout[0].quantity,120);assert.equal(copy.loadout[0].unit_price,100);
 const backup=api.planBackupImport({workspace:'foreign',records:JSON.parse(JSON.stringify(api.getRecords()))});api.applyBackupImport(backup);assert.equal(api.getRecords().filter(r=>r.kind==='weapon_plan').length,2);assert.ok(api.collectionRecords().every(r=>r.showcase.caption==='喜欢它'));
 let sent;api.setClient({rpc:async(name,args)=>{sent=args;return {data:[{}]}}});await api.pushRecordWithRevision(r,true);assert.equal(sent.p_share_community,false);
});
test('personal writes preserve revisions and roll back on quota failure; plan deletion uses tombstones',()=>{
 const {api,store}=app();api.workspace('personal');const item=api.migrateRecord({id:'item',kind:'collection',starting_quantity:2,cloud_revision:4,acquisitions:[]});api.setRecords([item]);api.persist();
 assert.equal(api.commitPersonal([Object.assign({},item,{showcase:{enabled:true,caption:'故事',order:0}})]),true);assert.equal(api.collectionQuantity(api.collectionRecords()[0]),2);assert.equal(api.collectionRecords()[0].cloud_revision,4);
 store.failWrites=true;assert.equal(api.commitPersonal([{id:'plan',kind:'weapon_plan',name:'test',weapon:'MCX'}]),false);assert.equal(api.getRecords().length,1);store.failWrites=false;
 assert.equal(api.commitPersonal([{id:'plan',kind:'weapon_plan',name:'test',weapon:'MCX'}]),true);assert.equal(api.commitPersonal([],'item'),false);assert.equal(api.collectionRecords().length,1);assert.equal(api.commitPersonal([],'plan'),true);assert.equal(api.getRecords().length,1);assert.equal(JSON.parse(store.get('fps_cloud_tombstones_v2_personal'))[0].id,'plan');
});
test('incomplete imported weapon plans stay plans and sanitize invalid fields',()=>{
 const {api}=app();const r=api.migrateRecord({kind:'weapon_plan',budget:-3,screenshot:'javascript:alert(1)',loadout:[{name:'旧装备',quantity:-1,unit_price:-3}]});assert.equal(r.loadout[0].quantity,1);assert.equal(r.loadout[0].unit_price,null);assert.equal(r.kind,'weapon_plan');assert.equal(r.budget,null);assert.equal(r.screenshot,'');assert.ok(r.name);
});

test('personal commit restores persisted records if tombstone write fails after the records write',()=>{
 const {api,store}=app();api.workspace('partial');api.setRecords([api.migrateRecord({id:'p',kind:'weapon_plan',name:'原方案',weapon:'MCX'})]);api.persist();const before=store.get('fps_workspace_v2_partial');store.failKeyOnce='fps_cloud_tombstones_v2_partial';assert.equal(api.commitPersonal([],'p'),false);assert.equal(store.get('fps_workspace_v2_partial'),before);assert.equal(api.getRecords()[0].name,'原方案');assert.deepEqual(JSON.parse(store.get('fps_cloud_tombstones_v2_partial')),[]);
});

test('collection feedback is silent on initial load and account switches but responds to new progress',()=>{
 const pulses=[],{api}=app({pulse:n=>pulses.push(n.id)});api.workspace('one');api.setRecords([api.migrateRecord({id:'a',kind:'collection',name:'A',starting_quantity:0,target:1})]);api.renderDashboard();assert.equal(pulses.length,0);api.setRecords([api.migrateRecord({id:'a',kind:'collection',name:'A',starting_quantity:1,target:1})]);api.renderDashboard();assert.deepEqual(pulses,['homeCollected','homeCollectionRing']);pulses.length=0;api.workspace('two');api.setRecords([api.migrateRecord({id:'b',kind:'collection',name:'B',starting_quantity:2,target:1})]);api.renderDashboard();assert.equal(pulses.length,0);
});
