// Run through playwright-cli: run-code --filename scripts/qa-time-tombs.cjs
// Start on /?scene=time-tombs&debug=1. Artifacts stay in output/playwright/.
async page => {
  await page.waitForFunction(()=>window.__timeTombs?.snapshot().textureCount>0);
  await page.setViewportSize({width:1440,height:1200});await page.keyboard.press('Home');
  const point = async id => page.evaluate(id => {
    const d=window.__timeTombs,s=d.snapshot(),v=s.viewport,z=s.pixelScale;
    for(const r of s.subjects.filter(r=>r.id===id))for(let y=r.y+1;y<r.y+r.height-1;y++)for(let x=r.x+1;x<r.x+r.width-1;x++){
      const sx=v.x+(x-v.worldX)*z+z/2,sy=v.y+(y-v.worldY)*z+z/2;
      if(sx>v.x&&sx<v.x+v.width&&sy>v.y&&sy<v.y+v.height&&d.identify(x,y)===id)return {x:sx,y:sy};
    }
    throw Error('No visible pixel for '+id);
  },id);
  const crystal=await point('TT-03');
  await page.mouse.move(crystal.x,crystal.y);await page.keyboard.down('Control');
  await page.waitForFunction(()=>window.__timeTombs.snapshot().hovered==='TT-03'&&!document.querySelector('[data-inspection-tooltip]').hidden);
  await page.screenshot({path:'output/playwright/time-tombs-hover.png'});await page.keyboard.up('Control');
  const actor=await point('TT-20');await page.mouse.click(actor.x,actor.y);
  await page.waitForFunction(()=>window.__timeTombs.snapshot().actors[0].heldUntil>window.__timeTombs.snapshot().time+5);
  await page.waitForFunction(()=>window.__timeTombs.snapshot().actors[0].frame===7);
  await page.keyboard.press('g');await page.locator('#mare-glossary').waitFor({state:'visible'});
  await page.getByRole('button').filter({hasText:'TT-03'}).hover();
  await page.screenshot({path:'output/playwright/time-tombs-guide.png'});await page.keyboard.press('Escape');
  await page.keyboard.press('a');await page.locator('[data-welcome]').waitFor({state:'visible'});await page.keyboard.press('Escape');
  const before=await page.evaluate(()=>window.__timeTombs.snapshot());
  await page.setViewportSize({width:2200,height:1800});
  await page.waitForFunction(()=>window.__timeTombs.snapshot().viewport.height===1800);
  const expanded=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(expanded.pixelScale!==4||expanded.viewport.x!==0||expanded.viewport.y!==0||expanded.viewport.width!==2200)throw Error('Larger viewport is not filled at 4x');
  if(expanded.viewport.worldY>=0||expanded.viewport.worldY+1800/4<=270)throw Error('Expanded view did not reveal extra sky and foreground');
  await page.screenshot({path:'output/playwright/time-tombs-expanded.png'});
  await page.setViewportSize({width:760,height:1100});
  await page.waitForFunction(()=>window.__timeTombs.snapshot().viewport.width===760);
  const after=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(before.pixelScale!==after.pixelScale||after.time<before.time||before.textureCount!==after.textureCount)throw Error('Resize rebuilt or rescaled scene');
  for(const r of before.subjects.filter(r=>['TT-01','TT-02','TT-03'].includes(r.id))){const q=after.subjects.find(q=>q.id===r.id);if(q.x!==r.x||q.y!==r.y||q.width!==r.width)throw Error('Landmark moved on resize');}
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');
  const panned=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(panned.viewport.worldX<=after.viewport.worldX)throw Error('Arrow pan failed');
  await page.screenshot({path:'output/playwright/time-tombs-portrait.png'});
  const empty=await page.evaluate(()=>{const s=window.__timeTombs.snapshot(),v=s.viewport;return{x:v.x+v.width*.6,y:v.y+v.height*.96,worldX:v.worldX+v.width*.6/s.pixelScale,worldY:v.worldY+v.height*.96/s.pixelScale};});
  await page.mouse.click(empty.x,empty.y);
  await page.waitForFunction(()=>window.__timeTombs.snapshot().echoes.length>0);
  const echo=await page.evaluate(()=>window.__timeTombs.snapshot().echoes.at(-1));
  if(Math.abs(echo.x-empty.worldX)>1||Math.abs(echo.y-empty.worldY)>1)throw Error('Click echo lost its depth');
  const panStart=await page.evaluate(()=>window.__timeTombs.snapshot().viewport.worldX);
  await page.mouse.move(600,500);await page.mouse.down();await page.mouse.move(460,500,{steps:10});await page.mouse.up();
  const panEnd=await page.evaluate(()=>window.__timeTombs.snapshot().viewport.worldX);
  if(panEnd<=panStart)throw Error('Drag pan failed');
  const topBefore=await page.evaluate(()=>window.__timeTombs.snapshot().viewport.worldY);
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(400);await page.keyboard.up('ArrowDown');
  const topAfter=await page.evaluate(()=>window.__timeTombs.snapshot().viewport.worldY);
  if(topAfter<=topBefore)throw Error('Vertical exploration failed');
  await page.keyboard.press('Home');
  await page.waitForFunction(()=>{const s=window.__timeTombs.snapshot(),v=s.viewport;return Math.abs(v.worldX+v.width/(2*s.pixelScale)-360)<1&&Math.abs(v.worldY+v.height/(2*s.pixelScale)-135)<1;});
  const homeView=await page.evaluate(()=>window.__timeTombs.snapshot().viewport);
  await page.mouse.move(600,500);await page.mouse.down();await page.mouse.move(420,420,{steps:8});await page.mouse.up();
  const beforeMiddle=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(Math.abs(beforeMiddle.viewport.worldX-homeView.worldX)<10)throw Error('Center test did not pan first');
  await page.mouse.click(450,470,{button:'middle'});
  await page.waitForFunction(v=>{const s=window.__timeTombs.snapshot();return Math.abs(s.viewport.worldX-v.worldX)<1&&Math.abs(s.viewport.worldY-v.worldY)<1;},homeView);
  const afterMiddle=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(afterMiddle.echoes.length>beforeMiddle.echoes.length)throw Error('Middle click also spawned an echo');
  if(afterMiddle.actors.some((a,i)=>a.heldUntil>beforeMiddle.actors[i].heldUntil))throw Error('Middle click also triggered a pilgrim');
  const oldShadow=await page.evaluate(()=>window.__timeTombs.snapshot().shadowFingerprint);
  await page.waitForFunction(old=>window.__timeTombs.snapshot().shadowFingerprint!==old,oldShadow,{timeout:20000});
  const lighting=await page.evaluate(()=>window.__timeTombs.snapshot());
  if(lighting.shadowStamp!==lighting.light.key)throw Error('Shadows lost their sun synchronization');
  return {hover:'passed',gesture:'passed',guide:'passed',about:'passed',expandedViewport:'passed',resize:'passed',pan2D:'passed',middleRecenter:'passed',sunShadows:'passed',pixelScale:after.pixelScale,rasters:after.textureCount};
}
