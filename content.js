(() => {
  const {defaults,normalize}=globalThis.youtubeFocusSettings;
  const flags={hideComments:'data-youtube-focus-comments',hideRecommendations:'data-youtube-focus-recommendations',hideLiveChat:'data-youtube-focus-chat',hideShorts:'data-youtube-focus-shorts'};
  let settings=normalize({focusEnabled:false}),revision=0,rootObserver;
  const changedKeys=new Set();
  function render() {
    const root=document.documentElement;if(!root)return;
    root.toggleAttribute('data-youtube-focus',settings.focusEnabled);
    root.toggleAttribute('data-youtube-focus-watch',location.pathname==='/watch');
    for(const [key,flag] of Object.entries(flags))root.toggleAttribute(flag,settings.focusEnabled&&settings[key]);
    rootObserver?.disconnect();
  }
  if(!document.documentElement) {
    rootObserver=new MutationObserver(render);rootObserver.observe(document,{childList:true});
  }
  document.addEventListener('yt-navigate-start',()=>document.documentElement?.removeAttribute('data-youtube-focus-watch'));
  document.addEventListener('yt-navigate-finish',render);
  window.addEventListener('popstate',render);
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    const relevant=Object.keys(defaults).filter(key=>Object.hasOwn(changes,key));if(!relevant.length)return;
    revision++;for(const key of relevant){changedKeys.add(key);settings[key]=typeof changes[key].newValue==='boolean'?changes[key].newValue:defaults[key]}render();
  });
  const requestedRevision=revision;
  chrome.storage.local.get(defaults).then(value=>{
    const loaded=normalize(value);for(const key of Object.keys(defaults))if(!changedKeys.has(key))settings[key]=loaded[key];render();
  }).catch(()=>{if(revision===requestedRevision){settings=normalize({focusEnabled:false});render()}});
})();
