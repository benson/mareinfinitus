import Phaser from 'phaser';
import {GUIDE,PILGRIMS,WORLD} from './data';
import type {FieldEntry,SceneHost} from './types';
import {buildArt,PLACEMENTS} from './art/world.js';
import {Raster,silhouette} from './art/raster.js';
import {buildShadow} from './art/environment.js';
import {INDEX,PALETTE} from './art/palette.js';
import {createExpedition,updateExpedition,interact} from './simulation.js';
import {sandAt,campAt,tideAt,tideDustAt,instrumentAt,tombLightAt,shrikeAt,tombResponseAt} from './atmosphere.js';
import {sunlightAt,shadowPadding} from './lighting.js';
import {ValleyAudio} from './audio';
import {skimmerAt,skimmerDustAt,MAX_FLIGHT_ALTITUDE} from './traffic.js';
import {ENTITIES,assetFor,entityAnchor} from './entities.js';
import {planeAt} from './art/geometry.js';
import {actorOrigin,spriteOrigin,attachmentPoint} from './transforms.js';
import {projectGround,elevationAt,terrainOccludes,TERRAIN_REVISION} from './surface.js';

type Subject={entry:FieldEntry;sprite:Phaser.GameObjects.Image;key:string;actor?:number;uid?:string;parts?:Phaser.GameObjects.Image[];groundX?:number;groundBase?:number;lift?:number;baseZ?:number;visibleMask?:Silhouette;rasterStamp?:string;shadow?:{sprite:Phaser.GameObjects.Image;stamp:string}};
type Silhouette=ReturnType<typeof silhouette>;

export class TimeTombsScene extends Phaser.Scene {
  private readonly host:SceneHost;
  private art=new Map<string,Raster>();
  private masks=new Map<string,Silhouette>();
  private subjects:Subject[]=[];
  private expedition=createExpedition();
  private highlight!:Phaser.GameObjects.Graphics;
  private effects!:Phaser.GameObjects.Graphics;
  private footprints!:Phaser.GameObjects.Graphics;
  private firelight!:Phaser.GameObjects.Graphics;
  private clouds:Phaser.GameObjects.Image[]=[];
  private shadowStamp='';
  private tombLights:Array<{key:string;sprite:Phaser.GameObjects.Image;parts:Phaser.GameObjects.Image[]}>=[];
  private audio?:ValleyAudio;
  private debugPaused=false;
  private tombResponses=new Map<string,number>();
  private skimmerGreeting=-Infinity;
  private echoes:Array<{x:number;y:number;born:number}>=[];
  private hovered:FieldEntry|null=null;
  private guideFocus:FieldEntry|null=null;
  private inspectHeld=false;
  private displayScale=1;
  private wheelReadyAt=0;
  private worldCenter=new Phaser.Math.Vector2(WORLD.focusX,WORLD.focusY);
  private disposers:Array<()=>void>=[];
  private drag:{x:number;y:number;centerX:number;centerY:number;moved:boolean}|null=null;
  private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
  constructor(host:SceneHost){super({key:'TimeTombs'});this.host=host;}

  create():void {
    this.art=buildArt();
    for(const [key,r] of this.art) {
      const t=this.textures.createCanvas(key,r.width,r.height);
      if(!t)throw new Error('Cannot create authored texture '+key);
      t.context.putImageData(new ImageData(new Uint8ClampedArray(r.toRGBA()),r.width,r.height),0,0);
      t.refresh();t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      if(!['sky','ground','ridges'].includes(key)&&!key.startsWith('cloud')&&!key.endsWith('-shadow')&&!key.includes('-light-'))this.masks.set(key,silhouette(r));
    }
    this.add.image(WORLD.left,WORLD.top,'sky').setOrigin(0).setDepth(-1000);
    this.clouds=[38,54,-76,-181].map((y,i)=>this.add.image(0,y,i%2?'cloud-alt':'cloud').setOrigin(0).setDepth(-950));
    const initialSun=sunlightAt(this.expedition.time);
    this.addSubject('TT-27','sun-0',initialSun.x,initialSun.y,-920);
    this.addSubject('TT-30','moon',551,42,-920);
    this.add.image(WORLD.left,68,'ridges').setOrigin(0).setDepth(-900);
    this.add.image(WORLD.left,WORLD.groundTop,'ground').setOrigin(0).setDepth(-800);
    for(const p of ENTITIES){
      const key=this.art.has(p.key)?p.key:p.key+'-0',spec=assetFor(key),origin=spriteOrigin(key,{x:p.x,y:p.base});
      this.addSubject(p.id,key,origin.x,origin.y,p.base);
      const subject=this.subjects.at(-1)!;
      Object.assign(subject,{uid:p.uid,groundX:p.x,groundBase:p.base,baseZ:elevationAt(p.x,p.base)});
      if(PLACEMENTS.some(t=>t.uid===p.uid)){
        const parts=spec.planes.map((plane:{row:number},i:number)=>this.add.image(origin.x,origin.y,p.key+'-part-'+i).setOrigin(0).setDepth(p.base-spec.pivot[1]+plane.row));
        subject.sprite.destroy();subject.sprite=parts[0];subject.parts=parts;
        const lights=parts.map((part:Phaser.GameObjects.Image,i:number)=>this.add.image(origin.x,origin.y,p.key+'-light-0-part-'+i).setOrigin(0).setDepth(part.depth+.01).setAlpha(0));
        this.tombLights.push({key:p.key,sprite:lights[0],parts:lights});
      }
    }
    this.addSubject('TT-31','shrike',419,131,151);
    Object.assign(this.subjects.at(-1)!,{uid:'shrike'});this.subjects.at(-1)!.sprite.setVisible(false);
    this.addSubject('TT-33','skimmer-0',-455,120,150);
    Object.assign(this.subjects.at(-1)!,{uid:'skimmer'});this.subjects.at(-1)!.sprite.setVisible(false);
    for(const a of this.expedition.actors){const origin=actorOrigin(a);this.addSubject(PILGRIMS[a.id].id,'pilgrim-'+a.id+'-4',origin.x,origin.y,a.y,a.id);this.subjects.at(-1)!.uid='pilgrim-'+a.id;}
    this.footprints=this.add.graphics().setDepth(-650);
    this.firelight=this.add.graphics().setDepth(-600);
    this.effects=this.add.graphics().setDepth(500);
    this.highlight=this.add.graphics().setDepth(10000);
    this.cameras.main.setBackgroundColor('#000024');
    this.cameras.main.setBounds(WORLD.left,WORLD.top,WORLD.width,WORLD.height);
    this.cameras.main.roundPixels=true;
    // Select once at mount. Resize changes the viewport, never the pixel size.
    this.displayScale=this.host.screensaverMode&&new URLSearchParams(location.search).get('preview')==='1'?1:WORLD.displayScale;
    this.resizeCamera();
    this.cursors=this.input.keyboard?.createCursorKeys();
    if(!this.host.screensaverMode){this.bindInput();this.bindInspectionUi();this.renderGuide();this.bindSceneChrome();}
    this.audio=new ValleyAudio(this.host.screensaverMode);
    this.scale.on(Phaser.Scale.Events.RESIZE,this.resizeCamera,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdown,this);
    const debug={
      snapshot:()=>({renderer:'procedural-raster',pixelScale:this.displayScale,time:this.expedition.time,camera:{x:this.cameras.main.scrollX,y:this.cameras.main.scrollY},viewport:{x:this.cameras.main.x,y:this.cameras.main.y,width:this.cameras.main.width,height:this.cameras.main.height,worldX:this.cameras.main.worldView.x,worldY:this.cameras.main.worldView.y},textureCount:this.art.size,light:sunlightAt(this.expedition.time),shadowStamp:this.shadowStamp,shadowFingerprint:(this.art.get('shadow-crystal')??this.art.get('crystal-shadow'))!.data.reduce((h,v)=>(Math.imul(h,31)+v)>>>0,1),actors:this.expedition.actors.map(a=>({...a})),subjects:this.subjects.map(s=>({id:s.entry.id,key:s.key,x:s.sprite.x,y:s.sprite.y,width:s.sprite.width,height:s.sprite.height})),echoes:this.echoes.map(e=>({...e})),hovered:this.hovered?.id??null}),
      geometry:()=>this.subjects.filter(s=>s.uid).map(s=>({uid:s.uid,key:s.key,x:s.sprite.x,y:s.sprite.y,depth:s.sprite.depth,parts:s.parts?.map(p=>p.depth),shadow:s.shadow?.stamp,shadowDepth:s.shadow?.sprite.depth,mask:s.visibleMask?.mask.reduce((n,v)=>n+v,0)})),
      placeActor:(id:number,x:number,y:number)=>{const a=this.expedition.actors[id];Object.assign(a,{x,y,vx:0,vy:0,frame:4,navigation:null});this.update(0,0);},
      identify:(x:number,y:number)=>this.identify(x,y)?.entry.id??null,
      activity:()=>({tide:tideAt(this.expedition.time),social:this.expedition.social,chore:this.expedition.chore,shrike:shrikeAt(this.expedition.time),skimmer:skimmerAt(this.expedition.time),responses:[...this.tombResponses.keys()],audio:this.audio?.snapshot(),lights:this.tombLights.map(s=>({key:s.key,alpha:s.sprite.alpha}))}),
      pause:(paused:boolean)=>{this.debugPaused=paused;},
      advance:(seconds:number)=>{for(let remaining=Math.min(240,Math.max(0,seconds));remaining>0;remaining-=1/60)updateExpedition(this.expedition,Math.min(remaining,1/60));this.update(0,0);}
    };
    if(this.host.debugMode||new URLSearchParams(location.search).has('debug')){
      (window as unknown as {__timeTombs?:typeof debug}).__timeTombs=debug;
      this.disposers.push(()=>delete (window as unknown as {__timeTombs?:typeof debug}).__timeTombs);
    }
  }
  private addSubject(id:string,key:string,x:number,y:number,depth:number,actor?:number):void {
    const entry=GUIDE.find(e=>e.id===id);if(!entry)throw new Error('Missing guide entry '+id);
    const sprite=this.add.image(Math.round(x),Math.round(y),key).setOrigin(0).setDepth(depth);
    this.subjects.push({entry,sprite,key,actor});
  }
  private resizeCamera():void {
    const camera=this.cameras.main,w=Math.min(this.scale.width,WORLD.width*this.displayScale),h=Math.min(this.scale.height,WORLD.height*this.displayScale);
    // Letterbox beyond finite world bounds, with no stretch, reseed, or rebuild.
    camera.setViewport(Math.floor((this.scale.width-w)/2),Math.floor((this.scale.height-h)/2),w,h);
    camera.setZoom(this.displayScale);
    const halfWidth=w/(2*this.displayScale),halfHeight=h/(2*this.displayScale);
    this.worldCenter.x=Phaser.Math.Clamp(this.worldCenter.x,WORLD.left+halfWidth,WORLD.left+WORLD.width-halfWidth);
    this.worldCenter.y=Phaser.Math.Clamp(this.worldCenter.y,WORLD.top+halfHeight,WORLD.top+WORLD.height-halfHeight);
    camera.centerOn(this.worldCenter.x,this.worldCenter.y);
  }
  update(_time:number,delta:number):void {
    const dt=this.debugPaused?0:Math.min(delta/1000,.25);updateExpedition(this.expedition,dt);const t=this.expedition.time;
    if(this.cursors){
      const dx=Number(this.cursors.right.isDown)-Number(this.cursors.left.isDown),dy=Number(this.cursors.down.isDown)-Number(this.cursors.up.isDown);
      if(dx||dy){this.worldCenter.x+=dx*70*dt;this.worldCenter.y+=dy*70*dt;this.resizeCamera();}
    }
    if(this.host.screensaverMode){this.worldCenter.set(WORLD.focusX+Math.sin(t/210)*150,WORLD.focusY+Math.sin(t/270)*12);this.resizeCamera();}
    const light=sunlightAt(t),shrike=shrikeAt(t);
    for(const s of this.subjects) {
      let key=s.key;
      if(s.actor!==undefined) {
        const a=this.expedition.actors[s.actor];key='pilgrim-'+a.id+'-'+a.frame;
        const origin=actorOrigin(a);
        s.sprite.setPosition(origin.x,origin.y).setFlipX(a.face<0).setDepth(Math.round(a.y));
        Object.assign(s,{groundX:a.x,groundBase:a.y,baseZ:Math.round(a.y)-assetFor(key).pivot[1]-origin.y,lift:0});
      } else if(key.startsWith('tent-'))key=key.slice(0,key.lastIndexOf('-')+1)+Math.floor(this.expedition.clothPhase+s.sprite.x*.03)%4;
      else if(key.startsWith('fire-'))key='fire-'+Math.floor(t*5)%4;
      else if(key.startsWith('instrument'))key=key.split('-')[0]+'-'+instrumentAt(t,entityAnchor(s.uid!,'dial').x).frame;
      else if(key.startsWith('sun-')){key='sun-'+Math.floor(t/4)%2;s.sprite.setPosition(light.x,light.y);}
      else if(key==='shrike'){
        const origin=spriteOrigin(key,{x:shrike.x,y:shrike.base});
        s.sprite.setPosition(origin.x,origin.y).setDepth(shrike.base).setVisible(shrike.active).setAlpha(shrike.alpha);
        Object.assign(s,{groundX:shrike.x,groundBase:shrike.base,baseZ:elevationAt(shrike.x,shrike.base),lift:0});
      }
      else if(key.startsWith('skimmer-')){
        const craft=skimmerAt(t),greeting=t-this.skimmerGreeting;
        key='skimmer-'+(greeting>=0&&greeting<6?2+Math.floor(greeting/.9)%2:craft.frame);
        s.sprite.setPosition(Math.round(craft.x),Math.round(craft.y)).setDepth(craft.depth).setFlipX(craft.direction<0).setVisible(craft.active);
        Object.assign(s,{groundX:craft.groundX,groundBase:craft.groundY,baseZ:0,lift:craft.altitude});
      }
      if(key!==s.key){s.key=key;s.sprite.setTexture(key);}
      if(s.actor!==undefined||s.uid==='shrike'||s.uid==='skimmer')this.updateTerrainOcclusion(s);
    }
    this.updateShadows(light);
    for(const s of this.tombLights){
      const ambient=tombLightAt(t,s.key),born=this.tombResponses.get(s.key),response=tombResponseAt(s.key,born===undefined?-1:t-born);
      if(born!==undefined&&!response.active)this.tombResponses.delete(s.key);
      const illumination=response.active&&response.alpha>ambient.alpha?response:ambient;
      s.parts.forEach((part,i)=>part.setTexture(s.key+'-light-'+illumination.frame+'-part-'+i).setAlpha(illumination.alpha));
    }
    this.audio?.update(t,this.worldCenter);
    this.clouds.forEach((c,i)=>{c.x=Math.round(WORLD.left-c.width+((t*.35+i*384+660)%(WORLD.width+c.width)));});
    this.drawEffects();
    if(!this.host.screensaverMode&&!this.guideFocus)this.refreshHover();
    if(this.guideFocus)this.drawHighlight(this.guideFocus);else if(this.inspectHeld&&this.hovered)this.drawHighlight(this.hovered);
  }
  private upload(key:string,r:Raster):void {
    const texture=(this.textures.exists(key)?this.textures.get(key):this.textures.createCanvas(key,r.width,r.height)) as Phaser.Textures.CanvasTexture;
    texture.context.clearRect(0,0,r.width,r.height);
    texture.context.putImageData(new ImageData(new Uint8ClampedArray(r.toRGBA()),r.width,r.height),0,0);
    texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.NEAREST);this.art.set(key,r);
  }
  private updateTerrainOcclusion(s:Subject):void{
    if(s.groundBase===undefined)return;
    const stamp=[s.key,s.sprite.x,s.sprite.y,s.sprite.flipX,s.groundBase,TERRAIN_REVISION].join('/');
    if(stamp===s.rasterStamp)return;s.rasterStamp=stamp;
    const source=this.art.get(s.key)!,r=source.clone();
    for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
      const wx=s.sprite.x+(s.sprite.flipX?r.width-1-x:x);
      if(terrainOccludes(wx,s.sprite.y+y,s.groundBase))r.set(x,y,255);
    }
    const key='visible-'+s.uid;this.upload(key,r);s.sprite.setTexture(key);s.visibleMask=silhouette(r);
  }
  private updateShadows(light:ReturnType<typeof sunlightAt>):void {
    this.shadowStamp=light.key;
    for(const s of this.subjects){
      if(s.groundBase===undefined||s.key.startsWith('fire-'))continue;
      s.shadow?.sprite.setVisible(s.sprite.visible).setAlpha(s.sprite.alpha*(s.uid==='skimmer'?.35:s.actor!==undefined?.4:1));
      if(!s.sprite.visible)continue;
      const source=this.art.get(s.key)!,spec=assetFor(s.key),maxLift=s.uid==='skimmer'?MAX_FLIGHT_ALTITUDE:0;
      const pad=shadowPadding({height:source.height+maxLift}),pivotX=s.sprite.flipX?source.width-1-spec.pivot[0]:spec.pivot[0];
      const x=Math.round(s.groundX!)-pivotX,y=Math.round(s.groundBase)-spec.pivot[1];
      const stamp=[s.key,light.key,x,y,s.sprite.flipX,Math.round((s.lift??0)*4)/4,s.baseZ,TERRAIN_REVISION].join('/');
      if(stamp===s.shadow?.stamp)continue;
      const key='shadow-'+s.uid,r=buildShadow(source,light,s.key,{x,y,baseZ:s.baseZ??0,lift:Math.round((s.lift??0)*4)/4,maxLift,flip:s.sprite.flipX});
      this.upload(key,r);
      if(!s.shadow)s.shadow={sprite:this.add.image(x-pad,y,key).setOrigin(0).setDepth(-700),stamp};
      s.shadow.stamp=stamp;s.shadow.sprite.setPosition(x-pad,y).setAlpha(s.sprite.alpha*(s.uid==='skimmer'?.35:s.actor!==undefined?.4:1));
    }
  }
  private drawEffects():void {
    const t=this.expedition.time;this.effects.clear();this.footprints.clear();this.firelight.clear();
    const color=(index:number)=>{const c=PALETTE[index];return(c[0]<<16)|(c[1]<<8)|c[2];};
    for(const trace of this.expedition.traces){
      const alpha=Math.max(0,Math.min(.38,(60-t+trace.born)/70));
      const p=projectGround(trace.x,trace.y),footprint=this.art.get('footprint')!;
      this.footprints.fillStyle(color(INDEX.sand[0]),alpha);
      for(let y=0;y<footprint.height;y++)for(let x=0;x<footprint.width;x++)if(footprint.get(x,y)!==255)this.footprints.fillRect(p.x+(trace.face<0?-x:x),p.y+y-1,1,1);
    }
    for(const g of sandAt(t))this.effects.fillStyle(color(INDEX.sand[3]),g.alpha).fillRect(g.x,g.y,1,1);
    for(const g of tideDustAt(t))this.effects.fillStyle(color(INDEX.anomaly[0]),g.alpha).fillRect(g.x,g.y,1,1);
    for(const g of skimmerDustAt(t))this.footprints.fillStyle(color(INDEX.sand[2]),g.alpha).fillRect(g.x,g.y,2,1);
    const camp=campAt(t);
    for(const p of camp.smoke){
      const smoke=this.art.get('smoke-'+p.frame)!;
      this.effects.fillStyle(color(INDEX.ridge[0]),p.alpha);
      for(let y=0;y<smoke.height;y++)for(let x=0;x<smoke.width;x++)if(smoke.get(x,y)!==255)this.effects.fillRect(p.x+x-Math.floor(smoke.width/2),p.y+y,1,1);
    }
    for(const p of camp.embers)this.effects.fillStyle(color(INDEX.fire[2]),p.alpha).fillRect(p.x,p.y,1,1);
    // A small, steady warm pool grounded in the sand; its outline never crawls.
    const fire=attachmentPoint('fire','light');
    for(let y=-5;y<=5;y++)for(let x=-16;x<=16;x++){
      const distance=x*x/256+y*y/25;
      if(distance<1&&(x+y*3)%3!==0)this.firelight.fillStyle(color(INDEX.fire[1]),(1-distance)*(.12+Math.sin(t*1.2)*.015)).fillRect(Math.round(fire.x)+x,Math.round(fire.y)+y,1,1);
    }
    const tide=tideAt(t);
    if(tide.active)for(const trace of this.expedition.traces){
      const proximity=Math.max(0,1-Math.abs(trace.x-tide.x)/14);
      if(proximity>0){
        // The trace itself stays put. A lifted pale impression briefly precedes it.
        const p=projectGround(trace.x,trace.y);
        this.effects.fillStyle(color(INDEX.anomaly[0]),proximity*tide.amount*.4).fillRect(p.x-1,p.y-Math.round(proximity*3),2,1);
      }
    }
    this.echoes=this.echoes.filter(e=>t-e.born<3);
    for(const e of this.echoes)for(let i=0;i<5;i++){const age=t-e.born;this.effects.fillStyle(color(INDEX.anomaly[0]),(1-age/3)*.5).fillRect(Math.round(e.x+(i-2)*age*3),Math.round(e.y+Math.sin(i)*age),1,3);}
  }
  private identify(x:number,y:number):Subject|undefined {
    let best:Subject|undefined,bestDepth=-Infinity;
    for(const s of this.subjects){
      if(!s.sprite.visible||s.sprite.alpha<.08)continue;
      let lx=Math.floor(x-s.sprite.x),ly=Math.floor(y-s.sprite.y);if(s.sprite.flipX)lx=s.sprite.width-1-lx;
      const r=this.art.get(s.key)!,m=s.visibleMask??this.masks.get(s.key)!;
      if(lx<0||ly<0||lx>=r.width||ly>=r.height||!m.mask[ly*r.width+lx])continue;
      const depth=s.parts?s.parts[planeAt(s.key,lx,ly)].depth:s.sprite.depth;
      if(depth>=bestDepth){best=s;bestDepth=depth;}
    }
    return best;
  }
  private refreshHover():void {
    const pointer=this.input.activePointer,camera=this.cameras.main;
    if(pointer.x<camera.x||pointer.y<camera.y||pointer.x>=camera.x+camera.width||pointer.y>=camera.y+camera.height){this.hovered=null;this.hideInspection();return;}
    const world=camera.getWorldPoint(pointer.x,pointer.y),entry=this.identify(world.x,world.y)?.entry??null;
    if(this.hovered!==entry){this.hovered=entry;if(this.inspectHeld&&entry)this.showInspection(entry);else this.hideInspection();}
  }
  private zoomAt(event:WheelEvent):void {
    if(!event.deltaY||this.host.screensaverMode)return;
    event.preventDefault();
    const now=performance.now();if(now<this.wheelReadyAt)return;
    const levels=[1,2,4],index=levels.indexOf(this.displayScale),next=levels[Math.max(0,Math.min(2,index+(event.deltaY<0?1:-1)))];
    if(next===this.displayScale)return;
    this.wheelReadyAt=now+180;this.drag=null;
    const rect=this.host.canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*this.scale.width/rect.width,y=(event.clientY-rect.top)*this.scale.height/rect.height;
    const anchor=this.cameras.main.getWorldPoint(x,y);
    this.displayScale=next;this.resizeCamera();
    const camera=this.cameras.main;
    this.worldCenter.set(anchor.x-(x-camera.x-camera.width/2)/next,anchor.y-(y-camera.y-camera.height/2)/next);this.resizeCamera();
    this.refreshHover();
  }
  private centerEntry(entry:FieldEntry):void {
    this.drag=null;
    const candidates=this.subjects.filter(s=>s.entry.id===entry.id&&s.sprite.visible&&s.sprite.alpha>=.08);
    candidates.sort((a,b)=>Phaser.Math.Distance.Between(a.sprite.x,a.sprite.y,this.worldCenter.x,this.worldCenter.y)-Phaser.Math.Distance.Between(b.sprite.x,b.sprite.y,this.worldCenter.x,this.worldCenter.y));
    const subject=candidates[0];
    if(subject){
      const r=this.art.get(subject.key)!,m=subject.visibleMask??this.masks.get(subject.key)!;
      let left=r.width,right=0,top=r.height,bottom=0;
      for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)if(m.mask[y*r.width+x]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      const cx=(left+right+1)/2;
      this.worldCenter.set(subject.sprite.x+(subject.sprite.flipX?r.width-cx:cx),subject.sprite.y+(top+bottom+1)/2);
    }else if(entry.id==='TT-28'){
      const tide=tideAt(this.expedition.time);this.worldCenter.set(tide.active?tide.x:WORLD.focusX,217);
    }else if(entry.id==='TT-31'){
      const encounter=shrikeAt(this.expedition.time);this.worldCenter.set(encounter.x,encounter.base-15);
    }else if(entry.id==='TT-33')this.worldCenter.set(WORLD.focusX,130);
    else return;
    this.resizeCamera();this.drawHighlight(entry);
  }
  private bindInput():void {
    const wheel=(event:WheelEvent)=>this.zoomAt(event);
    this.host.canvas.addEventListener('wheel',wheel,{passive:false});
    this.disposers.push(()=>this.host.canvas.removeEventListener('wheel',wheel));
    this.input.on(Phaser.Input.Events.POINTER_DOWN,(p:Phaser.Input.Pointer)=>{
      if(p.button===1){p.event.preventDefault();this.recenterCamera();return;}
      if(p.button!==0)return;
      this.drag={x:p.x,y:p.y,centerX:this.worldCenter.x,centerY:this.worldCenter.y,moved:false};
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE,(p:Phaser.Input.Pointer)=>{
      if(this.drag&&p.isDown&&!this.inspectHeld){if(Math.hypot(p.x-this.drag.x,p.y-this.drag.y)>5)this.drag.moved=true;if(this.drag.moved){this.worldCenter.set(this.drag.centerX-(p.x-this.drag.x)/this.displayScale,this.drag.centerY-(p.y-this.drag.y)/this.displayScale);this.resizeCamera();}}
      if(this.inspectHeld&&this.hovered)this.positionTooltip(p.event as PointerEvent);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP,(p:Phaser.Input.Pointer)=>{
      if(p.button===1)return;
      if(this.drag&&!this.drag.moved){
        const world=this.cameras.main.getWorldPoint(p.x,p.y),subject=this.identify(world.x,world.y);
        if(subject?.actor!==undefined)interact(this.expedition,subject.actor);
        else if(subject?.entry.id==='TT-33')this.skimmerGreeting=this.expedition.time;
        else if(subject&&PLACEMENTS.some(p=>p.key===subject.key)){
          if(!this.tombResponses.has(subject.key))this.tombResponses.set(subject.key,this.expedition.time);
        }else this.echoes.push({x:Math.round(world.x),y:Math.round(world.y),born:this.expedition.time});
      }
      this.drag=null;
    });
    this.input.on(Phaser.Input.Events.GAME_OUT,()=>{this.hovered=null;this.drag=null;this.hideInspection();});
  }
  private recenterCamera():void {
    this.drag=null;
    this.worldCenter.set(WORLD.focusX,WORLD.focusY);
    this.resizeCamera();
  }
  private bindInspectionUi():void {
    const down=(e:KeyboardEvent)=>{if(e.key==='Control'){this.inspectHeld=true;this.refreshHover();if(this.hovered)this.showInspection(this.hovered);}};
    const up=(e:KeyboardEvent)=>{if(e.key==='Control'){this.inspectHeld=false;this.hideInspection();}};
    const blur=()=>{this.inspectHeld=false;this.drag=null;this.hideInspection();};
    document.addEventListener('keydown',down);document.addEventListener('keyup',up);window.addEventListener('blur',blur);
    this.disposers.push(()=>document.removeEventListener('keydown',down),()=>document.removeEventListener('keyup',up),()=>window.removeEventListener('blur',blur));
  }
  private showInspection(entry:FieldEntry):void {
    const tooltip=document.querySelector<HTMLElement>('[data-inspection-tooltip]');if(!tooltip)return;tooltip.hidden=false;
    this.setText('[data-inspection-id]',entry.id);this.setText('[data-inspection-name]',entry.name);this.setText('[data-inspection-summary]',entry.summary);
    for(const [selector,value] of [['[data-inspection-excerpt]',entry.excerpt],['[data-inspection-source]',entry.source]]){const el=tooltip.querySelector<HTMLElement>(selector!);if(el){el.hidden=!value;el.textContent=value||'';}}
    // Never silently crop a long passage on a short/mobile viewport. The guide
    // contains the complete text; the hover card falls back to identification.
    if(tooltip.offsetHeight>innerHeight-24){
      const excerpt=tooltip.querySelector<HTMLElement>('[data-inspection-excerpt]');if(excerpt)excerpt.hidden=true;
      this.setText('[data-inspection-source]',(entry.source||'')+' · Read the passage in Guide (G)');
    }
    this.drawHighlight(entry);
    this.positionTooltip(this.input.activePointer.event as PointerEvent);
  }
  private drawHighlight(entry:FieldEntry):void {
    this.highlight.clear().fillStyle(0xdbdb92,.9);
    for(const s of this.subjects.filter(s=>s.entry.id===entry.id)) {
      if(!s.sprite.visible||s.sprite.alpha<.08)continue;
      const r=this.art.get(s.key)!,border=(s.visibleMask??this.masks.get(s.key)!).border;
      for(const [x,y] of border)this.highlight.fillRect(s.sprite.x+(s.sprite.flipX?r.width-1-x:x),s.sprite.y+y,1,1);
    }
  }
  private hideInspection():void {this.highlight?.clear();const t=document.querySelector<HTMLElement>('[data-inspection-tooltip]');if(t)t.hidden=true;}
  private positionTooltip(e:PointerEvent):void {
    const t=document.querySelector<HTMLElement>('[data-inspection-tooltip]');if(!t||!e)return;
    t.style.left=Math.max(12,Math.min(innerWidth-t.offsetWidth-16,e.clientX+18))+'px';t.style.top=Math.max(12,Math.min(innerHeight-t.offsetHeight-16,e.clientY+18))+'px';
  }
  private setText(selector:string,value:string):void {const el=document.querySelector<HTMLElement>(selector);if(el)el.textContent=value;}
  private renderGuide():void {
    const list=document.querySelector<HTMLElement>('[data-glossary-list]');if(!list)return;list.replaceChildren();let group='';
    for(const entry of GUIDE) {
      if(entry.group!==group){group=entry.group;const h=document.createElement('h2');h.className='glossary-group-title';h.textContent=group;list.append(h);}
      const b=document.createElement('button');b.type='button';b.className='glossary-entry';
      for(const [tag,content,css] of [['span',entry.id,'entry-id'],['strong',entry.name,'entry-name'],['span',entry.summary,'entry-summary']]){const el=document.createElement(tag);el.className=css;el.textContent=content;b.append(el);}
      for(const passage of entry.passages||[]){const q=document.createElement('q'),cite=document.createElement('cite');q.className='tomb-book-excerpt';q.textContent=passage.excerpt;cite.className='tomb-book-source';cite.textContent=passage.source;b.append(q,cite);}
      b.addEventListener('click',()=>this.centerEntry(entry));
      b.addEventListener('pointerenter',()=>{this.guideFocus=entry;this.drawHighlight(entry);});
      b.addEventListener('pointerleave',()=>{this.guideFocus=null;this.highlight.clear();});
      b.addEventListener('focus',()=>{this.guideFocus=entry;this.drawHighlight(entry);});
      b.addEventListener('blur',()=>{this.guideFocus=null;this.highlight.clear();});list.append(b);
    }
  }

  private bindSceneChrome(): void {
    const fullscreen=document.querySelector<HTMLButtonElement>('[data-fullscreen]');
    const fullscreenStatus=document.createElement('span');fullscreenStatus.className='sr-only';fullscreenStatus.setAttribute('role','status');this.host.shell.append(fullscreenStatus);
    const syncFullscreen=()=>{fullscreen?.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));this.resizeCamera();};
    const toggleFullscreen=()=>{
      const request=document.fullscreenElement?document.exitFullscreen():this.host.shell.requestFullscreen?.();
      if(!request){fullscreenStatus.textContent='Fullscreen is not available in this browser.';return;}
      void request.catch(()=>{fullscreenStatus.textContent='Fullscreen was blocked. Try opening this page in your browser.';});
    };
    fullscreen?.addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',syncFullscreen);
    this.disposers.push(()=>fullscreen?.removeEventListener('click',toggleFullscreen),()=>document.removeEventListener('fullscreenchange',syncFullscreen),()=>fullscreenStatus.remove());
    const panel = document.querySelector<HTMLElement>("#mare-glossary");
    const toggle = document.querySelector<HTMLButtonElement>("[data-glossary-toggle]");
    const close = document.querySelector<HTMLButtonElement>("[data-glossary-close]");
    const pin = document.querySelector<HTMLButtonElement>("[data-glossary-pin]");
    const header = document.querySelector<HTMLElement>("[data-glossary-drag]");
    const aboutButton = document.querySelector<HTMLButtonElement>("[data-welcome-open]");
    const welcome = document.querySelector<HTMLElement>("[data-welcome]");
    const enter = document.querySelector<HTMLButtonElement>("[data-welcome-enter]");
    if (!panel || !toggle) return;

    const setOpen = (open: boolean) => {
      panel.hidden = !open;
      if(!open){this.guideFocus=null;this.hideInspection();}
      toggle.setAttribute("aria-expanded", String(open));
      toggle.classList.toggle("active", open);
    };
    const onToggle = () => setOpen(panel.hidden !== false);
    const onClose = () => setOpen(false);
    const setAboutOpen = (open: boolean) => {
      if (!welcome) return;
      welcome.hidden = !open;
      aboutButton?.classList.toggle("active", open);
      if (open) requestAnimationFrame(() => enter?.focus());
    };
    const onAbout = () => setAboutOpen(true);
    const onEnter = () => setAboutOpen(false);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.repeat) return;
      if(event.key.toLowerCase()==="f"){event.preventDefault();toggleFullscreen();}
      if (event.key.toLowerCase() === "g") setOpen(panel.hidden !== false);
      if (event.key.toLowerCase() === "a") setAboutOpen(true);
      if (event.key === "Home") this.recenterCamera();
      if (event.key === "Escape") {
        if (welcome && welcome.hidden === false) setAboutOpen(false);
        else if (!panel.hidden) setOpen(false);
      }
    };
    const onPin = () => {
      const pressed = pin?.getAttribute("aria-pressed") !== "true";
      pin?.setAttribute("aria-pressed", String(pressed));
      pin?.classList.toggle("active", pressed);
    };

    toggle.addEventListener("click", onToggle);
    close?.addEventListener("click", onClose);
    pin?.addEventListener("click", onPin);
    aboutButton?.addEventListener("click", onAbout);
    enter?.addEventListener("click", onEnter);
    document.addEventListener("keydown", onKey);
    this.disposers.push(
      () => toggle.removeEventListener("click", onToggle),
      () => close?.removeEventListener("click", onClose),
      () => pin?.removeEventListener("click", onPin),
      () => aboutButton?.removeEventListener("click", onAbout),
      () => enter?.removeEventListener("click", onEnter),
      () => document.removeEventListener("keydown", onKey)
    );

    if (!header) return;
    let drag: { pointerId: number; offsetX: number; offsetY: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("button")) return;
      const bounds = panel.getBoundingClientRect();
      drag = { pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
      header.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const left = Phaser.Math.Clamp(event.clientX - drag.offsetX, 8, Math.max(8, window.innerWidth - panel.offsetWidth - 8));
      const top = Phaser.Math.Clamp(event.clientY - drag.offsetY, 8, Math.max(8, window.innerHeight - panel.offsetHeight - 8));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
    };
    header.addEventListener("pointerdown", onPointerDown);
    header.addEventListener("pointermove", onPointerMove);
    header.addEventListener("pointerup", onPointerUp);
    header.addEventListener("pointercancel", onPointerUp);
    this.disposers.push(
      () => header.removeEventListener("pointerdown", onPointerDown),
      () => header.removeEventListener("pointermove", onPointerMove),
      () => header.removeEventListener("pointerup", onPointerUp),
      () => header.removeEventListener("pointercancel", onPointerUp)
    );
  }


  private shutdown():void {
    this.scale.off(Phaser.Scale.Events.RESIZE,this.resizeCamera,this);
    this.disposers.splice(0).forEach(dispose=>dispose());
    this.audio?.destroy();
    this.hideInspection();
  }
}
