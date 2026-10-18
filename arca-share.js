(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./arca-kit.js'));else root.ArcaShare=factory(root.ArcaKit)})(typeof window==='object'?window:this,function(Kit){
'use strict';
function loadPicture(url,win){return new Promise(function(resolve,reject){var img=new win.Image(),timer=win.setTimeout(function(){img.src='';finish(Error('图片加载超时'))},6000);function finish(error){win.clearTimeout(timer);img.onload=null;img.onerror=null;if(error)reject(error);else resolve(img)}img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';img.onload=function(){if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>50000000)finish(Error('图片尺寸不适合导出'));else finish()};img.onerror=function(){finish(Error('图片源不允许导出'))};img.src=url})}
function png(canvas){return new Promise(function(resolve,reject){try{canvas.toBlob(function(blob){if(blob)resolve(blob);else reject(Error('图片生成失败'))},'image/png')}catch(e){reject(e)}})}
function mount(o){
 var doc=o.document||document,win=doc.defaultView||window,$=function(id){return doc.getElementById(id)},opened=false,itemId='',epoch=-1,token=0,blob=null,previewURL='',returnFocus=null;
 $('arcaShareMount').innerHTML='<dialog class="arca-share-dialog" id="arcaShareDialog" aria-labelledby="arcaShareTitle"><div class="share-dialog-heading"><h2 id="arcaShareTitle">收藏分享卡</h2><button class="btn ghost" id="arcaShareClose" type="button" aria-label="关闭分享卡">关闭</button></div><p class="muted" id="arcaShareItemName"></p><div id="arcaShareOptions" class="share-options"><label><input id="sharePicture" type="checkbox" checked> 显示物品图片</label><label><input id="shareQuantity" type="checkbox"> 显示库存数量</label><label><input id="shareDate" type="checkbox"> 显示获取日期</label><label><input id="shareCaption" type="checkbox"> 显示展柜寄语</label></div><p class="muted share-help">只导出当前收藏及勾选内容。可长按预览图保存。</p><p id="arcaShareStatus" class="muted" role="status"></p><img id="arcaSharePreview" class="share-card-preview" alt="收藏分享卡预览" hidden><div class="share-actions"><button class="btn primary" id="arcaShareDownload" type="button" disabled>下载 PNG</button><button class="btn" id="arcaShareNative" type="button" disabled hidden>系统分享</button></div></dialog>';
 var dialog=$('arcaShareDialog');
 function record(){return o.records().find(function(r){return r.id===itemId&&r.kind==='collection'})}
 function current(t){return opened&&epoch===o.epoch()&&t===token&&!!record()}
 function discard(){blob=null;$('arcaShareDownload').disabled=true;$('arcaShareNative').disabled=true;$('arcaSharePreview').hidden=true;$('arcaSharePreview').removeAttribute('src');if(previewURL){win.URL.revokeObjectURL(previewURL);previewURL=''}}
 function cleanup(){if(!opened)return;opened=false;token++;discard();if(returnFocus&&returnFocus.isConnected&&returnFocus.focus&&epoch===o.epoch())returnFocus.focus();returnFocus=null}
 function close(){cleanup();if(dialog.open&&dialog.close)dialog.close();else dialog.removeAttribute('open')}
 async function generate(){
  var t=++token,r=record();discard();if(!r||epoch!==o.epoch()){close();return}
  var data=Kit.shareData(r,{picture:$('sharePicture').checked,quantity:$('shareQuantity').checked,date:$('shareDate').checked,caption:$('shareCaption').checked},o.quantity(r)),picture=null,warning='';$('arcaShareStatus').textContent='正在生成预览…';
  try{
   if(data.image){try{picture=await loadPicture(data.image,win)}catch(e){warning='物品图片无法导出，已使用图形占位。'}if(!current(t))return}
   var canvas=doc.createElement('canvas');Kit.drawCard(canvas,data,picture);var result;try{result=await png(canvas)}catch(e){if(!picture)throw e;Kit.drawCard(canvas,data,null);result=await png(canvas);warning='图片源限制导出，已使用图形占位。'}
   if(!current(t))return;blob=result;previewURL=win.URL.createObjectURL(blob);$('arcaSharePreview').src=previewURL;$('arcaSharePreview').hidden=false;$('arcaShareDownload').disabled=false;
   var nativeSupported=false;try{var file=win.File?new win.File([blob],Kit.filename(r.name),{type:'image/png'}):null;nativeSupported=!!(file&&win.navigator.share&&win.navigator.canShare&&win.navigator.canShare({files:[file]}))}catch(ignore){}$('arcaShareNative').hidden=!nativeSupported;$('arcaShareNative').disabled=false;$('arcaShareStatus').textContent=warning||'预览已生成，可以下载或分享。';
  }catch(e){if(current(t))$('arcaShareStatus').textContent='生成失败：'+(e.message||'请重试')}
 }
 function open(id){var r=o.records().find(function(x){return x.id===id&&x.kind==='collection'});if(!r){o.toast('物品已不存在');return}if(opened)close();returnFocus=doc.activeElement;itemId=id;epoch=o.epoch();opened=true;$('arcaShareItemName').textContent=r.name;$('sharePicture').checked=true;['shareQuantity','shareDate','shareCaption'].forEach(function(id){$(id).checked=false});$('arcaShareNative').hidden=true;if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');$('arcaShareClose').focus();generate()}
 doc.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-collection-share]');if(b)open(b.getAttribute('data-collection-share'))});
 $('arcaShareClose').onclick=close;dialog.addEventListener('cancel',function(e){e.preventDefault();close()});dialog.addEventListener('close',function(){if(!dialog.open)cleanup()});
 dialog.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();return}if(e.key==='Tab'){var list=Array.from(dialog.querySelectorAll('button,input,[tabindex="0"]')).filter(function(n){return !n.disabled&&n.getClientRects().length});if(!list.length)return;var first=list[0],last=list[list.length-1];if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus()}}});
 $('arcaShareOptions').addEventListener('change',generate);
 $('arcaShareDownload').onclick=function(){if(!blob||!current(token))return;var a=doc.createElement('a');a.href=previewURL;a.download=Kit.filename(record().name);doc.body.appendChild(a);a.click();a.remove()};
 $('arcaShareNative').onclick=async function(){if(!blob||!current(token))return;var t=token;try{var file=new win.File([blob],Kit.filename(record().name),{type:'image/png'});await win.navigator.share({files:[file],title:'Arca 收藏分享卡'})}catch(e){if(current(t)&&e.name!=='AbortError')$('arcaShareStatus').textContent='系统分享未完成，可使用下载 PNG 或长按预览图保存。'}};
 return {open:open,close:close,generate:generate,sync:function(){if(opened&&(epoch!==o.epoch()||!record()))close()}};
}
return {mount:mount,loadPicture:loadPicture,png:png};
});
