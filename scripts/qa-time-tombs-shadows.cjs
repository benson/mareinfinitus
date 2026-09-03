// Focused renderer review: fresh bundle, fixed camera and three sun positions.
// Run with playwright-cli on /?scene=time-tombs&debug=1.
async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.waitForFunction(()=>window.__timeTombs?.snapshot);
  await page.evaluate(()=>window.__timeTombs.pause(true));
  await page.setViewportSize({width:2880,height:1300});await page.keyboard.press('Home');
  const samples=[];
  for(const time of [0,1300,5000]){
    await page.evaluate(time=>{
      const d=window.__timeTombs;
      while(d.snapshot().time<time-.001)d.advance(Math.min(240,time-d.snapshot().time));
    },time);
    await page.waitForTimeout(80);
    const state=await page.evaluate(()=>window.__timeTombs.snapshot());
    if(state.pixelScale!==4)throw Error('Shadow QA needs native 4x pixels');
    samples.push({time:state.time,light:state.light,shadow:state.shadowFingerprint});
    await page.screenshot({path:'output/playwright/time-tombs-shadow-'+time+'.png'});
  }
  if(new Set(samples.map(s=>s.shadow)).size!==3)throw Error('Cast shadows did not follow sun');
  if(errors.length)throw Error(errors.join('\n'));
  return {samples,pageErrors:errors};
}
