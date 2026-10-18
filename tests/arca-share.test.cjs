const test=require('node:test'),assert=require('node:assert/strict'),share=require('../arca-share.js');
function fixture(native=false){
 let epoch=0,rows=[{id:'item',kind:'collection',name:'藏品',game:'三角洲行动',user_id:'private-id',note:'private note',showcase:{caption:'私人寄语'}}],serial=0,doc;const nodes=new Map(),pending=[],urls=[],revoked=[],downloads=[],shared=[],paint=[];
 function el(id){if(!nodes.has(id))nodes.set(id,{value:'',checked:false,disabled:false,hidden:false,open:false,listeners:{},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},addEventListener(k,fn){this.listeners[k]=fn},focus(){doc.activeElement=this},showModal(){this.open=true},close(){this.open=false;if(this.listeners.close)this.listeners.close()},querySelectorAll:()=>[],getClientRects:()=>[{}]});return nodes.get(id)}
 const ctx={beginPath(){},roundRect(){},fill(){},fillRect(){},createLinearGradient:()=>({addColorStop(){}}),fillText:v=>paint.push(v),measureText:v=>({width:Array.from(v).length*30}),moveTo(){},lineTo(){},closePath(){},stroke(){},drawImage(){}};
 const win={navigator:{canShare:()=>native,share:async data=>shared.push(data)},URL:{createObjectURL:()=>{const u='blob:'+ ++serial;urls.push(u);return u},revokeObjectURL:u=>revoked.push(u)},File:class{constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type}}};
 doc={defaultView:win,activeElement:{isConnected:true,focus(){}},getElementById:el,addEventListener(){},body:{appendChild(){}},createElement:type=>type==='canvas'?{getContext:()=>ctx,toBlob:fn=>pending.push(fn)}:{click(){downloads.push(this.download)},remove(){}}};
 const api=share.mount({document:doc,records:()=>rows,epoch:()=>epoch,quantity:()=>2,toast(){}});
 return {api,el,win,pending,urls,revoked,downloads,shared,paint,async finish(i=0,value=new Blob(['png'],{type:'image/png'})){pending[i](value);await Promise.resolve();await Promise.resolve()},switchAccount(){epoch++;rows=[];api.sync()}};
}
test('share preview defaults to public item fields and download becomes available only after PNG completion',async()=>{
 const f=fixture();f.api.open('item');assert.equal(f.el('shareQuantity').checked,false);assert.equal(f.el('shareCaption').checked,false);assert.equal(f.el('arcaShareDownload').disabled,true);assert.equal(f.shared.length,0);assert.doesNotMatch(f.paint.join(' '),/private|私人寄语|当前收藏/);await f.finish();assert.equal(f.el('arcaShareDownload').disabled,false);f.el('arcaShareDownload').onclick();assert.deepEqual(f.downloads,['Arca-藏品.png']);f.api.close();assert.deepEqual(f.revoked,['blob:1']);
});
test('regenerating invalidates stale PNG callbacks and old previews before changed privacy options apply',async()=>{
 const f=fixture();f.api.open('item');f.el('shareQuantity').checked=true;const newer=f.api.generate();await f.finish(1);await newer;assert.equal(f.el('arcaSharePreview').src,'blob:1');assert.match(f.paint.join(' '),/当前收藏 2 件/);await f.finish(0);assert.equal(f.urls.length,1);assert.equal(f.el('arcaSharePreview').src,'blob:1');
});
test('account switch during generation discards results and cannot export the old account item',async()=>{
 const f=fixture();f.api.open('item');f.switchAccount();await f.finish();assert.equal(f.el('arcaShareDialog').open,false);assert.equal(f.urls.length,0);f.el('arcaShareDownload').onclick();assert.equal(f.downloads.length,0);
});
test('native sharing is invoked only by the share action and exports the prepared PNG file',async()=>{
 const f=fixture(true);f.api.open('item');await f.finish();assert.equal(f.shared.length,0);assert.equal(f.el('arcaShareNative').hidden,false);await f.el('arcaShareNative').onclick();assert.equal(f.shared.length,1);assert.equal(f.shared[0].files[0].name,'Arca-藏品.png');assert.equal(f.shared[0].files[0].type,'image/png');
});
test('PNG errors leave export disabled and report a retryable error',async()=>{
 const f=fixture();f.api.open('item');await f.finish(0,null);assert.equal(f.el('arcaShareDownload').disabled,true);assert.match(f.el('arcaShareStatus').textContent,/生成失败/);
});
test('remote picture loading requests anonymous CORS and image errors are recoverable',async()=>{
 let instance,cleared=0;const win={setTimeout:()=>1,clearTimeout:()=>cleared++,Image:class{constructor(){instance=this}set src(v){this.onerror()}}};await assert.rejects(()=>share.loadPicture('https://example.test/pic.png',win));assert.equal(instance.crossOrigin,'anonymous');assert.equal(instance.referrerPolicy,'no-referrer');assert.equal(cleared,1);
});
