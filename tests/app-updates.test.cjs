const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('app-updates.js','utf8');
function fixture(){
 const nodes={},events={},docEvents={};let reloads=0,saves=0,confirms=0,allow=true,fail=false,updates=0;
 function node(){return {hidden:false,disabled:false,setAttribute(){},append(){},appendChild(){}}}
 const doc={getElementById:id=>nodes[id]||(nodes[id]=node()),createElement:node,body:node(),visibilityState:'visible',addEventListener:(k,f)=>docEvents[k]=f};
 const reg={update:async()=>{updates++},addEventListener(){}};
 const controller={postMessage(msg,ports){ports[0].reply({data:{build:'new'}})}};
 const sw={controller,register:async(url,opts)=>{assert.equal(opts.updateViaCache,'none');return reg},addEventListener:(k,f)=>events[k]=f};
 const win={document:doc,navigator:{serviceWorker:sw},addEventListener:(k,f)=>events[k]=f,setTimeout:()=>1,clearTimeout(){},MessageChannel:function(){const p=this.port1={close(){}};this.port2={reply:e=>p.onmessage(e)}},confirm(){confirms++;return allow},location:{reload(){reloads++}}};
 vm.runInNewContext(source,{window:win,Promise,Date});
 const app=win.FPSUpdates.start({window:win,build:'old',beforeReload(){if(fail)throw Error();saves++}});
 return {app,nodes,events,docEvents,setAllow:v=>allow=v,setFail:v=>fail=v,counts:()=>({reloads,saves,confirms,updates})};
}
test('new controller announces update without interrupting the running page',async()=>{
 const f=fixture();await f.app.check(true);f.events.controllerchange();
 assert.equal(f.nodes.checkAppUpdate.textContent,'更新界面');assert.equal(f.counts().reloads,0);
 f.events.online();f.docEvents.visibilitychange();assert.equal(f.counts().confirms,0);
});
test('refresh requires consent and saves the match draft before reload',async()=>{
 const f=fixture();await f.app.check(true);f.setAllow(false);f.app.refresh();assert.equal(f.counts().reloads,0);
 f.setAllow(true);f.setFail(true);f.app.refresh();assert.equal(f.counts().reloads,0);assert.match(f.nodes.appUpdateStatus.textContent,/保存失败/);
 f.setFail(false);f.app.refresh();assert.equal(f.counts().saves,1);assert.equal(f.counts().reloads,1);
});
test('update checks share an in-flight registration',async()=>{
 const f=fixture();await Promise.all([f.app.check(true),f.app.check(true)]);assert.equal(f.counts().updates,1);
});
