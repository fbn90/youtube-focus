(() => {
  const defaults=Object.freeze({focusEnabled:true,hideComments:true,hideRecommendations:true,hideLiveChat:true,hideShorts:false});
  const normalize=value=>Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,typeof value?.[key]==='boolean'?value[key]:fallback]));
  globalThis.youtubeFocusSettings={defaults,normalize};
})();
