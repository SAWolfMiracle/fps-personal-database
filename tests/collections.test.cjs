// Regression checks for mixed workspaces; run with node --test tests/collections.test.cjs.
const {readFileSync}=require('node:fs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
function app(){
 const fields=new Map(),store=new Map();
 const element=id=>{if(!fields.has(id))fields.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,reset(){},classList:{add(){},remove(){}}});return fields.get(id)};
 const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 let source=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
 source=source.slice(0,source.indexOf('$("collectionForm").addEventListener'));
 source+=`saveAndRender=function(){persist()};showToast=function(msg,label,action){window.undo=action};
 window.test={migrateRecord,collectionQuantity,collectionStatus,matchRecords,collectionRecords,summary,filtered,saveCollection,saveAcquisition,deleteAcquisition,pushRecordWithRevision,remoteToLocal,cloudPayload,loadWorkspace,persist,deleteRecord,
 setRecords:function(x){records=x},getRecords:function(){return records},setClient:function(x){cloudClient=x},select:function(id){collectionSelectedId=id},workspace:function(name){loadWorkspace(name)}};})();`;
 const window={},context={window,document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},navigator:{onLine:true},setTimeout:()=>0,clearTimeout(){},URL,console};
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
