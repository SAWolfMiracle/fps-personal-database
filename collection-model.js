(function(root){
"use strict";
var DB_NAME="fps_collection_models_v1";
var DB_VERSION=1;
var MAX_UPLOAD_BYTES=100*1024*1024;
var VIEWER_SRC="https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js";
var dbPromise=null;
var viewerPromise=null;

function normalizeURL(value){
  try{
    var url=new URL(String(value||"").trim());
    if(url.protocol!=="https:"||!/\.(glb|gltf)$/i.test(url.pathname))return "";
    return url.href;
  }catch(e){return ""}
}
function catalogItem(catalog,itemID){
  if(!catalog||!Array.isArray(catalog.items))return null;
  return catalog.items.find(function(item){return item&&item.item_id===String(itemID||"")})||null;
}
function catalogModelVariants(catalog,itemID){
  var item=catalogItem(catalog,itemID),variants=item&&Array.isArray(item.model_variants)?item.model_variants:[];
  return variants.filter(function(variant){return variant&&variant.id&&variant.label&&normalizeURL(variant.url)}).map(function(variant){
    return {id:String(variant.id),label:String(variant.label),url:normalizeURL(variant.url)};
  });
}
function catalogModelURL(catalog,itemID,variantID){
  var item=catalogItem(catalog,itemID);
  if(!item)return "";
  if(variantID){
    var variant=catalogModelVariants(catalog,itemID).find(function(entry){return entry.id===String(variantID)});
    return variant?variant.url:"";
  }
  return normalizeURL(item.model_url||"");
}
function validateFile(file){
  if(!file||!file.name||!/\.glb$/i.test(file.name))return {ok:false,message:"只支持 .glb 单文件"};
  if(!Number.isFinite(Number(file.size))||Number(file.size)<1)return {ok:false,message:"模型文件为空或无法读取"};
  if(Number(file.size)>MAX_UPLOAD_BYTES)return {ok:false,message:"本机 GLB 最大支持 100 MB"};
  return {ok:true,message:""};
}
function storageKey(workspace,id){return String(workspace||"guest")+"::"+String(id||"")}
function openDatabase(){
  if(!root.indexedDB)return Promise.reject(Error("当前浏览器不支持本机模型存储"));
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(function(resolve,reject){
    var request=root.indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=function(){
      if(!request.result.objectStoreNames.contains("models"))request.result.createObjectStore("models");
    };
    request.onsuccess=function(){resolve(request.result)};
    request.onerror=function(){reject(request.error||Error("无法打开本机模型存储"))};
  });
  dbPromise.catch(function(){dbPromise=null});
  return dbPromise;
}
function getLocal(key){
  return openDatabase().then(function(db){return new Promise(function(resolve,reject){
    var request=db.transaction("models","readonly").objectStore("models").get(String(key));
    request.onsuccess=function(){resolve(request.result||null)};
    request.onerror=function(){reject(request.error||Error("读取本机模型失败"))};
  })});
}
function saveLocal(key,file){
  var validation=validateFile(file);
  if(!validation.ok)return Promise.reject(Error(validation.message));
  return openDatabase().then(function(db){return new Promise(function(resolve,reject){
    var transaction=db.transaction("models","readwrite");
    transaction.objectStore("models").put({blob:file,name:file.name,size:Number(file.size)},String(key));
    transaction.oncomplete=function(){resolve({name:file.name,size:Number(file.size)})};
    transaction.onerror=function(){reject(transaction.error||Error("保存本机模型失败"))};
    transaction.onabort=function(){reject(transaction.error||Error("保存本机模型失败"))};
  })});
}
function removeLocal(key){
  return openDatabase().then(function(db){return new Promise(function(resolve,reject){
    var transaction=db.transaction("models","readwrite");
    transaction.objectStore("models").delete(String(key));
    transaction.oncomplete=function(){resolve()};
    transaction.onerror=function(){reject(transaction.error||Error("移除本机模型失败"))};
    transaction.onabort=function(){reject(transaction.error||Error("移除本机模型失败"))};
  })});
}
function createObjectURL(blob){
  if(!root.URL||typeof root.URL.createObjectURL!=="function")throw Error("当前浏览器无法读取本机模型");
  return root.URL.createObjectURL(blob);
}
function revokeObjectURL(url){
  if(url&&root.URL&&typeof root.URL.revokeObjectURL==="function")root.URL.revokeObjectURL(url);
}
function loadViewer(){
  if(root.customElements&&root.customElements.get("model-viewer"))return Promise.resolve();
  if(viewerPromise)return viewerPromise;
  viewerPromise=new Promise(function(resolve,reject){
    var script=root.document.createElement("script");
    script.type="module";
    script.src=VIEWER_SRC;
    script.dataset.fpsModelViewer="1";
    script.onload=function(){
      root.customElements.whenDefined("model-viewer").then(resolve,reject);
    };
    script.onerror=function(){reject(Error("3D 查看器加载失败"))};
    root.document.head.appendChild(script);
  }).catch(function(error){viewerPromise=null;throw error});
  return viewerPromise;
}
function mountViewer(container,src,alt,onStatus){
  var safeSrc=normalizeURL(src)||(String(src||"").indexOf("blob:")===0?String(src):"");
  if(!safeSrc)return Promise.reject(Error("模型链接格式无效"));
  return loadViewer().then(function(){
    var viewer=root.document.createElement("model-viewer");
    viewer.setAttribute("src",safeSrc);
    viewer.setAttribute("alt",String(alt||"3D 模型"));
    viewer.setAttribute("camera-controls","");
    viewer.setAttribute("auto-rotate","");
    viewer.setAttribute("interaction-prompt","auto");
    viewer.setAttribute("touch-action","pan-y");
    viewer.setAttribute("shadow-intensity","0.7");
    viewer.setAttribute("crossorigin","anonymous");
    viewer.style.width="100%";
    viewer.style.height="100%";
    viewer.style.minHeight="240px";
    viewer.addEventListener("load",function(){if(onStatus)onStatus("模型已加载 · 拖动旋转，手势缩放")});
    viewer.addEventListener("error",function(){if(onStatus)onStatus("模型文件无法读取；检查文件格式、链接权限和跨域设置")});
    container.innerHTML="";
    container.appendChild(viewer);
    return viewer;
  });
}
var api={
  normalizeURL:normalizeURL,
  catalogModelURL:catalogModelURL,
  catalogModelVariants:catalogModelVariants,
  validateFile:validateFile,
  storageKey:storageKey,
  getLocal:getLocal,
  saveLocal:saveLocal,
  removeLocal:removeLocal,
  createObjectURL:createObjectURL,
  revokeObjectURL:revokeObjectURL,
  mountViewer:mountViewer,
  maxUploadBytes:MAX_UPLOAD_BYTES,
  viewerVersion:"4.3.1"
};
root.FPSCollectionModel=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
