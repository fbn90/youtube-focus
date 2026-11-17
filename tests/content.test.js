import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../settings.js',import.meta.url),'utf8')+'\n'+fs.readFileSync(new URL('../content.js',import.meta.url),'utf8');
function fixture({path='/watch',root=true}={}) {
  const attrs=new Set(),events=new Map(),windowEvents=new Map();let stored,resolve,reject,observer,disconnected=false;
  const element={toggleAttribute:(key,on)=>on?attrs.add(key):attrs.delete(key),removeAttribute:key=>attrs.delete(key)};
  const document={documentElement:root?element:null,addEventListener:(name,fn)=>events.set(name,fn)};
  const location={pathname:path};
  const chrome={storage:{local:{get:()=>new Promise((yes,no)=>{resolve=yes;reject=no})},onChanged:{addListener:fn=>stored=fn}}};
  vm.runInNewContext(source,{document,location,chrome,window:{addEventListener:(name,fn)=>windowEvents.set(name,fn)},MutationObserver:class{constructor(fn){observer=fn}observe(){}disconnect(){disconnected=true}}});
  return {attrs,document,location,events,windowEvents,element,resolve:settings=>resolve(settings),reject:()=>reject(Error('Unavailable')),change:value=>stored({focusEnabled:{newValue:value}},'local'),changeSettings:values=>stored(Object.fromEntries(Object.entries(values).map(([key,newValue])=>[key,{newValue}])), 'local'),observer:()=>observer(),disconnected:()=>disconnected};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('focus enables on watch pages and reverses on a settings change',async()=>{
 const f=fixture();f.resolve({focusEnabled:true});await settle();assert.ok(f.attrs.has('data-youtube-focus'));assert.ok(f.attrs.has('data-youtube-focus-watch'));
 f.change(false);assert.equal(f.attrs.has('data-youtube-focus'),false);f.change(true);assert.ok(f.attrs.has('data-youtube-focus'));
});
test('SPA navigation and browser back only apply the layout on watch pages',async()=>{
 const f=fixture({path:'/results'});f.resolve({focusEnabled:true});await settle();assert.equal(f.attrs.has('data-youtube-focus-watch'),false);
 f.events.get('yt-navigate-start')();f.location.pathname='/watch';f.events.get('yt-navigate-finish')();assert.ok(f.attrs.has('data-youtube-focus-watch'));
 f.location.pathname='/shorts/video';f.windowEvents.get('popstate')();assert.equal(f.attrs.has('data-youtube-focus-watch'),false);
});
test('a late initial setting does not overwrite a newer toggle',async()=>{
 const f=fixture();f.change(false);f.resolve({focusEnabled:true});await settle();assert.equal(f.attrs.has('data-youtube-focus'),false);
});
test('document-start without a root waits once and disconnects its observer',async()=>{
 const f=fixture({root:false});f.resolve({focusEnabled:true});await settle();assert.equal(f.attrs.size,0);
 f.document.documentElement=f.element;f.observer();assert.ok(f.attrs.has('data-youtube-focus'));assert.equal(f.disconnected(),true);
});
test('unavailable storage leaves the original YouTube layout visible',async()=>{
 const f=fixture();f.reject();await settle();assert.equal(f.attrs.has('data-youtube-focus'),false);
});
test('a late failed storage read does not undo a newer user preference',async()=>{
 const f=fixture();f.change(true);f.reject();await settle();assert.ok(f.attrs.has('data-youtube-focus'));
});


test('all options are independent, survive disabling focus, and preserve the previous defaults',async()=>{
 const f=fixture();f.resolve({focusEnabled:true});await settle();
 assert.ok(f.attrs.has('data-youtube-focus-comments'));assert.ok(f.attrs.has('data-youtube-focus-chat'));assert.ok(f.attrs.has('data-youtube-focus-recommendations'));
 assert.equal(f.attrs.has('data-youtube-focus-shorts'),false);
 f.changeSettings({hideComments:false,hideLiveChat:false});
 assert.equal(f.attrs.has('data-youtube-focus-comments'),false);assert.equal(f.attrs.has('data-youtube-focus-chat'),false);assert.ok(f.attrs.has('data-youtube-focus-recommendations'));
 f.change(false);assert.equal(f.attrs.has('data-youtube-focus-recommendations'),false);
 f.change(true);assert.equal(f.attrs.has('data-youtube-focus-comments'),false);assert.ok(f.attrs.has('data-youtube-focus-recommendations'));
});
test('a late settings read retains untouched saved options alongside a newer toggle',async()=>{
 const f=fixture();f.changeSettings({hideComments:false});
 f.resolve({focusEnabled:true,hideComments:true,hideRecommendations:false,hideShorts:true});await settle();
 assert.ok(f.attrs.has('data-youtube-focus'));assert.equal(f.attrs.has('data-youtube-focus-comments'),false);
 assert.equal(f.attrs.has('data-youtube-focus-recommendations'),false);assert.ok(f.attrs.has('data-youtube-focus-shorts'));
});
test('shorts references can be hidden on search pages while watch-only layout stays off',async()=>{
 const f=fixture({path:'/results'});f.resolve({focusEnabled:true,hideShorts:true});await settle();
 assert.ok(f.attrs.has('data-youtube-focus-shorts'));assert.equal(f.attrs.has('data-youtube-focus-watch'),false);
 f.changeSettings({hideShorts:false});assert.equal(f.attrs.has('data-youtube-focus-shorts'),false);
});
