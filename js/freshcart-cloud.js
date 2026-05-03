(function(){
  function settings(){ return window.FRESHCART_FIREBASE || {}; }
  function cleanURL(url){ return String(url||'').trim().replace(/\/+$/,''); }
  function cleanPath(path){ return String(path||'freshcart/config').trim().replace(/^\/+|\/+$/g,'') || 'freshcart/config'; }
  function firebaseEndpoint(){
    var s=settings(), db=cleanURL(s.databaseURL);
    if(!db) return '';
    return db + '/' + cleanPath(s.path) + '.json';
  }
  function useBackend(){ return !(settings().preferFirebaseOnly === true); }
  async function backendLoad(){
    var res = await fetch('/.netlify/functions/config', {cache:'no-store'});
    if(!res.ok) throw new Error('Backend load failed: '+res.status+' '+res.statusText);
    var data = await res.json();
    return data && data.config ? data.config : null;
  }
  async function backendSave(config){
    var res = await fetch('/.netlify/functions/config', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({config:config||{}})
    });
    if(!res.ok){ var t=await res.text().catch(()=>res.statusText); throw new Error('Backend save failed: '+t); }
    var data = await res.json();
    return data.config || config;
  }
  async function firebaseLoad(){
    var url=firebaseEndpoint();
    if(!url) return null;
    var res=await fetch(url+'?ts='+Date.now(), {cache:'no-store'});
    if(!res.ok) throw new Error('Firebase load failed: '+res.status+' '+res.statusText);
    var data=await res.json();
    return data && typeof data==='object' ? data : null;
  }
  async function firebaseSave(config){
    var url=firebaseEndpoint();
    if(!url) throw new Error('Firebase is not configured. Add your Realtime Database URL in data/firebase-config.js');
    var clean=JSON.parse(JSON.stringify(config||{}));
    clean.updatedAt=new Date().toISOString();
    var res=await fetch(url, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(clean)});
    if(!res.ok) throw new Error('Firebase save failed: '+res.status+' '+res.statusText);
    return await res.json();
  }
  function configured(){ return useBackend() || !!firebaseEndpoint(); }
  async function load(){
    if(useBackend()){
      try { var b=await backendLoad(); if(b) return b; } catch(e){ console.warn('FreshCart backend load skipped:', e); }
    }
    return await firebaseLoad();
  }
  async function save(config){
    var clean=JSON.parse(JSON.stringify(config||{})); clean.updatedAt=new Date().toISOString();
    if(useBackend()) return await backendSave(clean);
    return await firebaseSave(clean);
  }
  window.FreshCartCloud={isConfigured:configured,load:load,save:save,endpoint:function(){return useBackend()?'/\.netlify/functions/config':firebaseEndpoint();}};
})();
