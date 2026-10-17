const {readFileSync}=require("node:fs");
const {join}=require("node:path");
const {test}=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");

const html=readFileSync(join(__dirname,"../index.html"),"utf8");
const sw=readFileSync(join(__dirname,"../sw.js"),"utf8");

test("initial HTML is not blocked by remote Supabase or optional recognition scripts",()=>{
  assert.doesNotMatch(html,/<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase/);
  assert.doesNotMatch(html,/<script[^>]*src="\.\/(ocr-import|warehouse-import)\.js"/);
  assert.match(html,/renderAll\(\);bindPreview\(\);restoreDraft\(\);bootCloudSdk\(\)/);
  assert.match(html,/lazyTool\("ocrTool","\.\/ocr-import\.js"/);
  assert.match(html,/lazyTool\("warehouseTool","\.\/warehouse-import\.js"/);
});

test("cloud SDK loads asynchronously after local UI and reports errors without blocking",()=>{
  const slice=html.slice(html.indexOf("function bootCloudSdk(){"),html.indexOf("\nasync function initCloud(){"));
  assert.ok(slice.startsWith("function bootCloudSdk(){"));
  let script,initialized=0,message="",badge="";
  const ctx={
    cloudConfigured:()=>true,
    window:{},
    document:{createElement:()=>({}),head:{appendChild:s=>{script=s}}},
    setCloudBadge:(v)=>{badge=v},setCloudMessage:v=>{message=v},
    initCloud:()=>{initialized++}
  };
  vm.runInNewContext(slice+"\nthis.launch=bootCloudSdk;",ctx);
  ctx.launch();
  assert.equal(script.async,true);
  assert.match(script.src,/supabase-js@2\.117\.2/);
  assert.equal(initialized,0);
  script.onload();
  assert.equal(initialized,1);
  script.onerror();
  assert.match(badge,/加载失败/);
  assert.match(message,/本地功能/);
});

test("recognition handlers initialize on first expansion, once, with error recovery",()=>{
  const slice=html.slice(html.indexOf("function lazyTool("),html.indexOf('\nlazyTool("warehouseTool"'));
  let toggle,script,attached=0;
  const status={textContent:""},file={disabled:false};
  const panel={open:false,addEventListener:(name,fn)=>{assert.equal(name,"toggle");toggle=fn}};
  const ctx={
    document:{getElementById:id=>({panel,status,file}[id]),createElement:()=>({}),head:{appendChild:s=>{script=s}}}
  };
  vm.runInNewContext(slice+"\nthis.lazyTool=lazyTool;",ctx);
  ctx.lazyTool("panel","./warehouse-import.js","status","file",()=>{attached++});
  panel.open=true;toggle();
  assert.equal(file.disabled,true);
  assert.equal(attached,0);
  script.onload();
  assert.equal(attached,1);
  assert.equal(file.disabled,false);
  panel.open=false;toggle();panel.open=true;toggle();
  assert.equal(attached,1);
});

function worker(){
  const listeners={},cached=new Map(),requests=[],precache=[];
  const scope="https://example.test/fps/";
  const toKey=req=>typeof req==="string"?new URL(req,scope).href:req.url;
  const cacheApi={
    match:async req=>cached.get(toKey(req)),
    put:async(req,value)=>{cached.set(toKey(req),value)},
    addAll:async list=>{precache.push(...list)}
  };
  const context={
    self:{
      registration:{scope},location:{origin:new URL(scope).origin},
      addEventListener:(event,fn)=>{listeners[event]=fn},
      skipWaiting(){},clients:{claim:async()=>{}}
    },
    caches:{open:async()=>cacheApi,match:cacheApi.match,keys:async()=>[],delete:async()=>true},
    fetch:async req=>{
      requests.push(req.url);
      return {ok:true,source:"network",clone(){return this}};
    },
    URL,Set,Promise,Response
  };
  vm.runInNewContext(sw,context);
  async function dispatch(kind,request){
    let promise;
    listeners[kind]({request,respondWith:p=>{promise=p},waitUntil:p=>{promise=p}});
    return promise===undefined?undefined:await promise;
  }
  return {dispatch,scope,cached,requests,precache};
}

test("service worker install does not download recognition templates or optional tools",async()=>{
  const w=worker();await w.dispatch("install");
  for(const path of ["./warehouse-templates.json","./collection-catalog.json","./warehouse-import.js","./ocr-import.js"]){
    assert.equal(w.precache.includes(path),false,path);
  }
  assert.ok(w.precache.includes("./index.html"));
});

test("cached app shell serves repeat navigation without a network request",async()=>{
  const w=worker();
  const saved={source:"cached"};
  w.cached.set(w.scope,saved);
  const result=await w.dispatch("fetch",{method:"GET",mode:"navigate",url:w.scope});
  assert.equal(result,saved);
  assert.equal(w.requests.length,0);
});

test("optional catalog only downloads on request and is reusable from cache",async()=>{
  const w=worker(),url=w.scope+"warehouse-templates.json";
  assert.equal(w.requests.length,0);
  const first=await w.dispatch("fetch",{method:"GET",mode:"cors",url});
  const second=await w.dispatch("fetch",{method:"GET",mode:"cors",url});
  assert.equal(first,second);
  assert.equal(w.requests.length,1);
});
