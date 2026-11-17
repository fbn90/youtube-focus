const {defaults,normalize}=globalThis.youtubeFocusSettings;
const inputs=[...document.querySelectorAll('[data-setting]')],options=document.getElementById('options'),status=document.getElementById('status');
let settings=normalize({}),revision=0,ready=false,busy=false;
const changedKeys=new Set(),keyRevisions={};
document.getElementById('version').textContent=`Version ${chrome.runtime.getManifest().version}`;
function render(){
  for(const input of inputs){input.checked=settings[input.dataset.setting];input.disabled=!ready||busy||input.dataset.setting!=='focusEnabled'&&!settings.focusEnabled}
  options.disabled=!ready||busy||!settings.focusEnabled;
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  const keys=Object.keys(defaults).filter(key=>Object.hasOwn(changes,key));if(!keys.length)return;
  revision++;for(const key of keys){changedKeys.add(key);keyRevisions[key]=revision;settings[key]=typeof changes[key].newValue==='boolean'?changes[key].newValue:defaults[key]}render();
});
chrome.storage.local.get(defaults).then(value=>{
  const loaded=normalize(value);for(const key of Object.keys(defaults))if(!changedKeys.has(key))settings[key]=loaded[key];
  ready=true;render();status.textContent=settings.focusEnabled?'Focus mode is on.':'Standard YouTube layout.';
}).catch(()=>{status.textContent='Could not load settings. Reopen the popup to try again.'});
for(const input of inputs)input.addEventListener('change',async()=>{
  const key=input.dataset.setting,previous=settings[key],value=input.checked,keyRevision=keyRevisions[key];
  busy=true;settings[key]=value;render();
  try{await chrome.storage.local.set({[key]:value});status.textContent='Saved for your YouTube tabs.'}
  catch{if(keyRevisions[key]===keyRevision)settings[key]=previous;status.textContent='Could not save the change.'}
  finally{busy=false;render()}
});
