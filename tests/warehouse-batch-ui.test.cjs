const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto').webcrypto;
function mounted(){
 const fields=new Map(),urls=new Set();let counter=0,lastReview;const pixels=Buffer.from(require('./fixtures/warehouse-crops.json').samples.find(r=>r.name==='金条').pixels,'base64');
 const context2d={drawImage(){},strokeRect(){},getImageData:()=>({data:pixels})};
 function element(id){if(!fields.has(id))fields.set(id,{value:id==='warehouseCols'||id==='warehouseRows'?'1':'',checked:true,innerHTML:'',textContent:'',hidden:false,files:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn},getContext:()=>context2d,toDataURL:()=> 'data:image/jpeg;base64,TEST',getBoundingClientRect:()=>({left:0,top:0,width:96,height:96}),setPointerCapture(){}});return fields.get(id)}
 const document={getElementById:element,createElement:()=>element('crop'),querySelectorAll:()=>[]};class Image{constructor(){this.naturalWidth=96;this.naturalHeight=96}async decode(){}}
 const catalog=require('../collection-catalog.json'),templates=require('../warehouse-templates.json');const sandbox={window:{},document,Image,URL:{createObjectURL(){const u='blob:'+ ++counter;urls.add(u);return u},revokeObjectURL(u){urls.delete(u)}},crypto,setTimeout:fn=>{fn();return 0},fetch:async url=>({ok:true,json:async()=>url.includes('templates')?templates:catalog}),atob:s=>Buffer.from(s,'base64').toString('binary')};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../warehouse-import.js'),'utf8'),sandbox);
 const mount=sandbox.window.FPSWarehouse.mount({onSave:(c,review)=>{lastReview=JSON.parse(JSON.stringify(review));return false}});
 const file=(name,byte)=>({name,type:'image/png',size:1,arrayBuffer:async()=>new Uint8Array([byte]).buffer});
 async function add(files){const f=element('warehouseFile');f.files=files;await f.listeners.change.call(f)}
 return {mount,element,urls,file,add,review:()=>lastReview};
}
test('batch UI preserves candidates and per-page grid settings, ignores byte-identical files and clears all resources',async()=>{
 const m=mounted();await m.add([m.file('first.png',1),m.file('second.png',2),m.file('duplicate.png',1)]);assert.match(m.element('warehouseBatchInfo').textContent,/2 张图片/);assert.equal(m.urls.size,2);assert.match(m.element('warehouseStatus').textContent,/跳过完全相同图片 1 张/);
 m.element('warehouseCols').value='1';m.element('warehouseRows').value='1';await m.element('warehouseScan').onclick();m.element('warehousePages').value='1';await m.element('warehousePages').onchange.call(m.element('warehousePages'));m.element('warehouseCols').value='2';m.element('warehouseRows').value='1';await m.element('warehouseScan').onclick();assert.match(m.element('warehouseBatchInfo').textContent,/3 个候选/);
 m.element('warehouseSave').onclick();const review=m.review();assert.equal(review.length,3);assert.equal(new Set(review.map(r=>r.source_id)).size,2);assert.equal(review.every(r=>r.checked===false),true);assert.equal(new Set(review.map(r=>r.source_hash)).size,2);
 m.element('warehousePages').value='0';await m.element('warehousePages').onchange.call(m.element('warehousePages'));assert.equal(m.element('warehouseCols').value,1);m.element('warehouseClearReview').onclick();assert.match(m.element('warehouseBatchInfo').textContent,/2 个候选/);m.mount.clear();assert.equal(m.urls.size,0);assert.equal(m.element('warehouseReview').innerHTML,'');assert.equal(m.element('warehouseSave').disabled,true);
});
test('workspace clear cancels a pending file read without retaining old image or candidates',async()=>{
 const m=mounted();let resume;const f=m.file('pending.png',3);f.arrayBuffer=()=>new Promise(r=>resume=r);const promise=m.add([f]);m.mount.clear();resume(new Uint8Array([3]).buffer);await promise;assert.equal(m.urls.size,0);assert.match(m.element('warehouseBatchInfo').textContent,/0 张图片/);assert.equal(m.element('warehouseReview').innerHTML,'');
});
