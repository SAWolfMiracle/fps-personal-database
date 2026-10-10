/* Screenshot import: OCR stays in the browser; only confirmed records are saved. */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FPSOCR=api})(typeof window==='object'?window:this,function(){
'use strict';
function parse(text){
 text=String(text||'');var lines=text.replace(/\r/g,'').split('\n').map(function(s){return s.trim()}).filter(Boolean),out={};
 var labels={game:'游戏|Game',map:'地图|Map',weapon:'武器|Weapon',name:'物品名称|物品名|名称|Item(?: name)?',category:'分类|Category',quantity:'持有数量|当前数量|数量|Quantity|Count',kills:'击杀(?:数)?|Kills?',deaths:'死亡(?:数)?|Deaths?',assists:'助攻(?:数)?|Assists?',profit:'净收益|利润|Profit',cost:'花费|成本|Cost'};
 Object.keys(labels).forEach(function(key){
  var values=[];lines.forEach(function(line){var m=line.match(new RegExp('^(?:'+labels[key]+')\\s*[:：]\\s*(.+)$','i'));if(m)values.push(m[1].trim())});
  values=Array.from(new Set(values));if(values.length!==1)return;
  var value=values[0];if(['quantity','kills','deaths','assists','profit','cost'].indexOf(key)>=0){var number=value.replace(/[,，\s]/g,'');if(!/^-?\d+(\.\d+)?$/.test(number))return;var n=Number(number);if(!Number.isFinite(n)||(['quantity','kills','deaths','assists'].indexOf(key)>=0&&(!Number.isSafeInteger(n)||n<0))||(key==='cost'&&n<0))return;out[key]=n}else out[key]=value;
 });
 if(!out.game){var games=['三角洲行动','彩虹六号：围攻','Ready or Not','Counter-Strike 2','VALORANT','Escape from Tarkov','Apex Legends','PUBG'];var matches=games.filter(function(g){return text.indexOf(g)>=0});if(matches.length===1)out.game=matches[0];else if(/\bDelta Force\b/i.test(text))out.game='三角洲行动'}
 var states=[];if(/撤离成功/.test(text))states.push('撤离');if(/撤离失败|阵亡/.test(text))states.push('阵亡');if(/(?:^|\n)\s*(?:结果\s*[:：]\s*)?胜利\s*(?:\n|$)/.test(text))states.push('胜利');if(/(?:^|\n)\s*(?:结果\s*[:：]\s*)?失败\s*(?:\n|$)/.test(text))states.push('失败');if(states.length===1)out.result=states[0];
 return out;
}
var libraryPromise;
function loadLibrary(){
 if(window.Tesseract)return Promise.resolve(window.Tesseract);
 if(!libraryPromise)libraryPromise=new Promise(function(resolve,reject){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';s.onload=function(){if(window.Tesseract)resolve(window.Tesseract);else{libraryPromise=null;s.remove();reject(Error('识别引擎未加载'))}};s.onerror=function(){libraryPromise=null;s.remove();reject(Error('识别引擎下载失败，请检查网络后重试'))};document.head.appendChild(s)});
 return libraryPromise;
}
function mount(options){
 var $=function(id){return document.getElementById(id)},worker=null,busy=false,epoch=0,image=null,blobURL='',hash='',saved=false;
 var fieldNames=['game','result','map','weapon','kills','deaths','assists','profit','cost','name','category','quantity','target','note'];
 function status(message){$('ocrStatus').textContent=message}
 function setBusy(value){busy=value;['ocrRun','ocrParse','ocrSave','ocrType','ocrFile','ocrInvert'].forEach(function(id){$(id).disabled=value});$('ocrCancel').hidden=!value}
 function clearFields(){fieldNames.forEach(function(key){$('ocr_'+key).value=''});$('ocr_target').value='1'}
 function clear(){epoch++;if(worker){worker.terminate().catch(function(){});worker=null}setBusy(false);if(blobURL)URL.revokeObjectURL(blobURL);blobURL='';image=null;hash='';saved=false;$('ocrFile').value='';$('ocrPreview').removeAttribute('src');$('ocrPreview').hidden=true;$('ocrText').value='';$('ocrReview').hidden=true;clearFields();status('选择一张结算或物品截图开始。')}
 function typeChanged(){var isCollection=$('ocrType').value==='collection';document.querySelector('label[for="ocr_game"]').textContent=isCollection?'游戏（选填）':'游戏（必填）';document.querySelectorAll('[data-ocr-kind]').forEach(function(e){e.hidden=e.dataset.ocrKind!==(isCollection?'collection':'match')});$('ocrReview').hidden=true;clearFields();saved=false}
 function parseReview(){clearFields();var data=parse($('ocrText').value);Object.keys(data).forEach(function(key){if($('ocr_'+key))$('ocr_'+key).value=data[key]});$('ocrReview').hidden=false;status('已提取有明确标签的字段。未识别或有冲突的字段留空，请对照原图核对。')}
 $('ocrFile').addEventListener('change',async function(){
  clearFields();$('ocrReview').hidden=true;$('ocrText').value='';image=null;hash='';saved=false;if(blobURL)URL.revokeObjectURL(blobURL);blobURL='';$('ocrPreview').removeAttribute('src');$('ocrPreview').hidden=true;var ticket=++epoch;var file=this.files[0];if(!file)return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>20*1024*1024){status('请选择不超过 20 MB 的 PNG、JPEG 或 WebP 图片。');return}
  try{var bytes=await file.arrayBuffer();var digest=await crypto.subtle.digest('SHA-256',bytes);if(ticket!==epoch)return;hash=Array.from(new Uint8Array(digest)).map(function(v){return v.toString(16).padStart(2,'0')}).join('');
   if(blobURL)URL.revokeObjectURL(blobURL);blobURL=URL.createObjectURL(file);var loaded=new Image();loaded.src=blobURL;await loaded.decode();if(ticket!==epoch)return;
   if(loaded.naturalWidth*loaded.naturalHeight>40000000){status('图片尺寸过大，请先裁剪需要识别的区域。');return}image=loaded;$('ocrPreview').src=blobURL;$('ocrPreview').hidden=false;status('图片已就绪。建议只保留一局结算或一件物品，文字尽量清晰。');
  }catch(e){if(ticket===epoch)status('图片无法读取，请换一张图片重试。')}
 });
 $('ocrType').addEventListener('change',typeChanged);
 $('ocrParse').addEventListener('click',parseReview);
 $('ocrCancel').addEventListener('click',clear);
 $('ocrReset').addEventListener('click',clear);
 $('ocrRun').addEventListener('click',async function(){
  if(busy)return;if(!image){status('请先选择有效截图。');return}var ticket=epoch;setBusy(true);$('ocrReview').hidden=true;status('正在加载中英文识别模型，首次使用可能较慢…');
  try{var engine=await loadLibrary();if(ticket!==epoch)return;
   var created=await engine.createWorker(['chi_sim','eng'],1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',logger:function(m){if(ticket===epoch)status(m.status==='recognizing text'?'正在识别 '+Math.round((m.progress||0)*100)+'%':'正在准备识别模型…')}});
   if(ticket!==epoch){await created.terminate();return}worker=created;await worker.setParameters({tessedit_pageseg_mode:engine.PSM.SPARSE_TEXT});
   var canvas=document.createElement('canvas'),scale=Math.min(1,3200/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);var ctx=canvas.getContext('2d');if($('ocrInvert').checked)ctx.filter='invert(1)';ctx.drawImage(image,0,0,canvas.width,canvas.height);
   var result=await worker.recognize(canvas);if(ticket!==epoch)return;$('ocrText').value=result.data.text||'';parseReview();if(!$('ocrText').value.trim())status('没有识别到文字，请裁剪、换清晰截图，或尝试“深色背景反色”。');
  }catch(e){if(ticket===epoch)status('识别失败，请检查网络或更换截图后重试。也可手动粘贴已识别文字进行核对。')}
  finally{if(ticket===epoch){if(worker){await worker.terminate().catch(function(){});worker=null}setBusy(false)}}
 });
 $('ocrForm').addEventListener('submit',function(e){
  e.preventDefault();if(busy||saved)return;var type=$('ocrType').value,game=$('ocr_game').value.trim()||(type==='collection'?'未分类游戏':'');if(!game){status('请填写游戏名称。');return}
  var data={kind:type,game:game,note:$('ocr_note').value.trim(),import_source:'screenshot',import_hash:hash,imported_at:new Date().toISOString()};
  if(type==='collection'){
   var name=$('ocr_name').value.trim(),quantity=Number($('ocr_quantity').value),target=Number($('ocr_target').value||1);
   if(!name||$('ocr_quantity').value===''||!Number.isSafeInteger(quantity)||quantity<0||!Number.isSafeInteger(target)||target<1){status('请核对物品名称、当前数量和目标数量。');return}
   Object.assign(data,{name:name,category:$('ocr_category').value.trim()||'其他',target:target,starting_quantity:quantity,snapshot_date:new Date().toLocaleDateString('sv-SE'),acquisitions:[]});
  }else{
   var kills=Number($('ocr_kills').value),deaths=Number($('ocr_deaths').value),result=$('ocr_result').value;
   if(!result||$('ocr_kills').value===''||$('ocr_deaths').value===''||!Number.isSafeInteger(kills)||kills<0||!Number.isSafeInteger(deaths)||deaths<0){status('请核对结果、击杀和死亡数量；缺失字段不能自动当作 0。');return}
   var assists=$('ocr_assists').value===''?null:Number($('ocr_assists').value);if(assists!==null&&(!Number.isSafeInteger(assists)||assists<0)){status('助攻需为非负整数。');return}
   Object.assign(data,{result:result,kills:kills,deaths:deaths,assists:assists,map:$('ocr_map').value.trim()||'未填写',weapon:$('ocr_weapon').value.trim()||'未填写'});
   ['cost','profit'].forEach(function(key){data[key]=$('ocr_'+key).value===''?null:Number($('ocr_'+key).value)});
   if((data.cost!==null&&(!Number.isFinite(data.cost)||data.cost<0))||(data.profit!==null&&!Number.isFinite(data.profit))){status('请核对花费与净收益。');return}
  }
  if(options.onSave(data)!==false){saved=true;$('ocrReview').hidden=true;status('已保存到当前工作区。联网且已登录时会按现有设置同步。')}
 });
 typeChanged();return {clear:clear};
}
return {parse:parse,mount:mount};
});
