/* Keep installed apps current without interrupting forms or clearing user data. */
(function(root){
  "use strict";
  root.FPSUpdates={start:function(options){
    var win=options.window||window,doc=win.document,sw=win.navigator.serviceWorker;
    var button=doc.getElementById("checkAppUpdate"),status=doc.getElementById("appUpdateStatus");
    var reg=null,busy=null,lastCheck=0,available=false;
    var notice=doc.createElement("aside");
    notice.className="app-update-notice";notice.hidden=true;notice.setAttribute("aria-label","应用更新");
    var message=doc.createElement("span");message.textContent="新界面已就绪";
    var apply=doc.createElement("button");apply.type="button";apply.textContent="更新界面";
    notice.append(message,apply);doc.body.appendChild(notice);
    function say(text){status.textContent=text}
    function ready(){available=true;notice.hidden=false;button.textContent="更新界面";say("新版本已就绪，保存编辑后即可更新")}
    function identify(){
      if(!sw||!sw.controller)return;
      var channel=new win.MessageChannel();
      var timer=win.setTimeout(function(){channel.port1.close()},3000);
      channel.port1.onmessage=function(event){
        win.clearTimeout(timer);channel.port1.close();
        if(event.data&&event.data.build&&event.data.build!==options.build)ready();
      };
      sw.controller.postMessage({type:"GET_BUILD"},[channel.port2]);
    }
    function watch(worker){
      if(!worker)return;
      worker.addEventListener("statechange",function(){
        if(worker.state==="activated")identify();
        if(worker.state==="installed"&&sw.controller)say("正在准备新版本…");
      });
    }
    function refresh(){
      if(!win.confirm("更新会重新打开页面。请先保存物品编辑和截图导入内容；已保存的记录、登录与主页布局会保留。现在更新？"))return;
      try{options.beforeReload()}catch(err){say("草稿保存失败，暂未刷新。请先保存记录后重试。");return}
      win.location.reload();
    }
    function check(force){
      if(available)return Promise.resolve();
      if(busy)return busy;
      if(!force&&Date.now()-lastCheck<60000)return Promise.resolve();
      lastCheck=Date.now();button.disabled=true;say("正在检查更新…");
      busy=Promise.resolve().then(function(){
        if(!sw)throw new Error("unsupported");
        return reg||sw.register("./sw.js",{updateViaCache:"none"});
      }).then(function(value){
        if(!reg){reg=value;reg.addEventListener("updatefound",function(){watch(reg.installing)});watch(reg.installing)}
        return reg.update();
      }).then(function(){
        identify();
        if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});
        if(!available)say(reg.installing?"正在下载新版本，准备好后会提示":"检查完成；也可点“重新载入”刷新当前界面");
      }).catch(function(){say("暂时无法检查更新，请联网后重试")}).finally(function(){
        button.disabled=false;busy=null;
      });
      return busy;
    }
    button.onclick=function(){if(available)refresh();else check(true)};apply.onclick=refresh;
    doc.getElementById("reloadApp").onclick=refresh;
    if(sw){
      sw.addEventListener("controllerchange",identify);
      doc.addEventListener("visibilitychange",function(){if(doc.visibilityState==="visible"){identify();check(false)}});
      win.addEventListener("pageshow",function(){identify();check(false)});
      win.addEventListener("online",function(){check(true)});
      check(false);
    }else say("当前浏览器不支持离线更新，可使用重新载入");
    return {check:check,refresh:refresh};
  }};
})(typeof window!=="undefined"?window:globalThis);
