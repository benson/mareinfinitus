// Real-renderer contract tests, using the scene's debug-only pose probe.
async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.waitForFunction(()=>window.__timeTombs?.geometry);
  await page.evaluate(()=>window.__timeTombs.pause(true));
  await page.setViewportSize({width:2880,height:1300});await page.keyboard.press('Home');
  const result=await page.evaluate(()=>{
    const d=window.__timeTombs,geometry=d.geometry();
    const palace=geometry.find(s=>s.uid==='palace'),sphinx=geometry.find(s=>s.uid==='sphinx');
    if(new Set(palace.parts).size!==3||new Set(sphinx.parts).size!==3)throw Error('Landmark still has one depth');
    if(geometry.some(s=>s.shadow&&s.shadowDepth!==-700))throw Error('Shadow can paint over an actor');
    // Sphinx body grounds at 201; its forward stairs at 207. An actor at 204
    // must be in front of the body but behind those stairs, in the same frame.
    d.placeActor(0,106,204);
    const s=d.snapshot(),actor=s.subjects.find(s=>s.id==='TT-20'),body=d.identify(106,197),stairs=d.identify(106,203);
    return {parts:palace.parts,actor,body,stairs};
  });
  // Inspect the resolved pixels, not only the metadata's own comparison.
  if(result.body!=='TT-20'||result.stairs!=='TT-01')throw Error('Part/pick crossing disagrees: '+JSON.stringify(result));
  await page.screenshot({path:'output/playwright/time-tombs-part-crossing.png'});
  const terrain=await page.evaluate(()=>{
    const d=window.__timeTombs,samples=[];
    for(const y of [263,272,287]){d.placeActor(0,510,y);samples.push(d.geometry().find(s=>s.uid==='pilgrim-0'));}
    return samples.map(s=>({y:s.y,mask:s.mask,depth:s.depth}));
  });
  if(new Set(terrain.map(s=>s.mask)).size<2)throw Error('Terrain does not occlude a crossing actor');
  await page.screenshot({path:'output/playwright/time-tombs-terrain-crossing.png'});
  // Restore a fresh deterministic story before checking independent sun/frame clocks.
  await page.reload();await page.waitForFunction(()=>window.__timeTombs?.geometry);
  await page.evaluate(()=>window.__timeTombs.pause(true));
  const frameCheck=await page.evaluate(()=>{
    const d=window.__timeTombs;d.advance(54);
    const before=d.geometry(),light=d.snapshot().light.key;d.advance(.8);
    const after=d.geometry(),next=d.snapshot().light.key;
    const changed=after.filter(s=>s.uid.startsWith('instrument')&&s.key!==before.find(b=>b.uid===s.uid).key);
    if(light!==next)throw Error('Frame-only invalidation fixture changed its sun');
    if(!changed.length)throw Error('No prop frame crossed');
    if(changed.some(s=>!s.shadow.startsWith(s.key+'/')))throw Error('Shadow retained frame zero');
    return {light,next,changed:changed.map(s=>s.uid)};
  });
  const before=await page.evaluate(()=>window.__timeTombs.snapshot());
  await page.setViewportSize({width:1024,height:700});
  const after=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(JSON.stringify(before.actors)!==JSON.stringify(after.actors)||before.time!==after.time||before.pixelScale!==after.pixelScale)throw Error('Resize changed simulation');
  if(errors.length)throw Error(errors.join('\n'));
  return {partCrossing:result,terrain,frameCheck,resize:'passed',pageErrors:errors};
}
