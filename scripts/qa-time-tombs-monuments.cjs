async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:3440,height:1440});await page.reload();await page.waitForFunction(()=>window.__timeTombs?.snapshot);
  await page.evaluate(()=>window.__timeTombs.pause(true));await page.keyboard.press('Home');
  const snapshot=()=>page.evaluate(()=>window.__timeTombs.snapshot()),initial=await snapshot();
  if(initial.pixelScale!==4)throw Error('Ultrawide did not mount at 4x');
  if(Math.abs(initial.viewport.width/4-860)>1||Math.abs(initial.viewport.height/4-360)>1)throw Error('Ultrawide logical window is not 860x360');
  const expected={'TT-01':[190,132],'TT-02':[200,240],'TT-03':[70,228],'TT-04':[42,240],'TT-05':[150,108],'TT-06':[1120,124]};
  for(const [id,size] of Object.entries(expected)){const s=initial.subjects.find(o=>o.id===id);if(!s||s.width!==size[0]||s.height!==size[1])throw Error('Wrong relit dimensions '+id);}
  await page.screenshot({path:'output/playwright/time-tombs-live-ultrawide-4x.png'});
  for(const id of Object.keys(expected)){
    await page.keyboard.press('g');const entry=page.locator('.glossary-entry').filter({has:page.locator('.entry-id',{hasText:id})});await entry.click();await page.keyboard.press('g');await page.mouse.move(8,8);await page.waitForTimeout(30);
    const state=await snapshot(),subject=state.subjects.find(o=>o.id===id),v=state.viewport;
    const hit=await page.evaluate(({id,subject,v,z})=>{for(let y=Math.max(subject.y,v.worldY);y<Math.min(subject.y+subject.height,v.worldY+v.height/z);y+=3)for(let x=Math.max(subject.x,v.worldX);x<Math.min(subject.x+subject.width,v.worldX+v.width/z);x+=3)if(window.__timeTombs.identify(x,y)===id)return{x,y};return null;},{id,subject,v,z:state.pixelScale});
    if(!hit)throw Error('Unpickable relit landmark '+id);
    await page.keyboard.down('Control');await page.mouse.move(v.x+(hit.x-v.worldX)*state.pixelScale,v.y+(hit.y-v.worldY)*state.pixelScale);
    try{await page.waitForFunction(id=>window.__timeTombs.snapshot().hovered===id,id,{timeout:3000});}catch{throw Error(`Hover failed ${id} hit=${JSON.stringify(hit)} view=${JSON.stringify(v)} actual=${(await snapshot()).hovered}`);}finally{await page.keyboard.up('Control');}
  }
  for(const [y,prefix,height] of [[338,'pilgrim-',20],[290,'pilgrim-ramp-',12],[250,'pilgrim-tiny-',7]]){await page.evaluate(y=>window.__timeTombs.placeActor(0,420,y),y);const actor=(await snapshot()).subjects.find(o=>o.id==='TT-20');if(!actor||!actor.key.startsWith(prefix)||actor.height!==height||actor.displayHeight!==height)throw Error('Wrong actor depth sprite at '+y);}
  await page.mouse.move(1700,700);for(const expectedScale of [3,2,1]){await page.mouse.wheel(0,120);await page.waitForTimeout(220);await page.waitForFunction(z=>window.__timeTombs.snapshot().pixelScale===z,expectedScale);}
  if(errors.length)throw Error(errors.join('\n'));return{ultrawide:'860x360 at 4x',landmarks:'six relit subjects pickable',actors:'20/12/7 native depth grids',errors};
}
