import Phaser from 'phaser';
import {GUIDE,PILGRIMS} from './data';
import type {SceneHost,FieldEntry} from './types';
import {Raster} from './art/raster.js';
import {TRANSPARENT} from './art/palette.js';
import {buildPorcelainArt,DAWN_LAYERS} from './porcelain/art.js';
import {DAWN_WORLD,MONUMENTS,PROPS} from './porcelain/layout.js';
import {createDawnExpedition,updateDawn,interactDawn,actorBand,actorFactor} from './porcelain/simulation.js';
import {C} from './porcelain/palette.js';
import {monumentShadow} from './porcelain/shadows.js';
import {FLOOR_MAP} from './porcelain/maps/landscape.js';

type Item={key:string;image:Phaser.GameObjects.Image;x:number;y:number;factor:number;base:number;id?:string;actor?:number;mirror?:boolean};
const guide:FieldEntry[]=GUIDE.filter(e=>['Time Tombs','Expedition','The pilgrims','The valley'].includes(e.group)||e.id==='TT-28').map(e=>e.id==='TT-07'?{...e,summary:'Warm canvas tents, patched panels, travel cases, and a small fire on a pale stone terrace above the valley.'}:e.id==='TT-05'?{...e,summary:'A green mineral vault, its translucent planes catching the dawn above a narrow, recessed entrance.'}:e);
export class PorcelainScene extends Phaser.Scene {
 private art=new Map<string,Raster>();
 private items:Item[]=[];
 private expedition=createDawnExpedition();
 private pixelScale=1;
 private pan=DAWN_WORLD.anchor;
 private vertical=0;
 private left=0;
 private top=0;
 private hovered:Item|undefined;
 private guideFocus:FieldEntry|null=null;
 private inspectHeld=false;
 private drag:{x:number;y:number;pan:number;vertical:number;moved:boolean}|null=null;
 private disposers:Array<()=>void>=[];
 private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
 private debugPaused=false;
 private wheelAt=0;
 private responses=new Map<string,number>();
 private marks!:Phaser.GameObjects.Graphics;
 private campMarks!:Phaser.GameObjects.Graphics;
 private particles:Array<{image:Phaser.GameObjects.Image;index:number;kind:'smoke'|'dust'}>=[];
 constructor(private readonly host:SceneHost){super({key:'PorcelainDawn'});}
 create():void {
  this.art=buildPorcelainArt();
  for(const [key,r]of this.art){const t=this.textures.createCanvas('dawn-'+key,r.width,r.height);if(!t)throw Error('Texture allocation failed');t.context.putImageData(new ImageData(new Uint8ClampedArray(r.toRGBA()),r.width,r.height),0,0);t.refresh();t.setFilter(Phaser.Textures.FilterMode.NEAREST);}
  for(const x of [-960,0,960]){this.addItem('sky',x,0,.05,-1000);this.addItem('ground',x,0,.9,-950);}
  this.addItem('far',0,0,.35,-900);this.addItem('shelf',0,0,.7,-800);
  for(const p of FLOOR_MAP)this.addItem(p.name,p.x,p.y,actorFactor(p.y+2),p.y>282?282.05:-700);
  for(const m of MONUMENTS){
   const shadow=monumentShadow(this.art.get(m.key)!,m.key);
   this.addItem(m.key+'-shadow',m.x-shadow.pad,m.y,m.factor,m.base-.3);
   this.addItem(m.key,m.x,m.y,m.factor,m.base,m.id);
   this.addItem(m.key+'-drift',m.x-8,m.y,m.factor,m.base+.05);
  }
  this.addItem('camp',0,0,1,282);
  for(const p of PROPS)this.addItem(p.key==='tent'?'tent-'+p.variant+'-0':p.key+'-0',p.x,p.y,1,p.base,p.id);
  for(const a of this.expedition.actors)this.addItem('person-'+a.id+'-4',a.x-6,a.y-18,1,a.y+.1,PILGRIMS[a.id].id,a.id);
  this.addItem('near',0,0,1.2,1000);
  this.marks=this.add.graphics().setDepth(-650);this.campMarks=this.add.graphics().setDepth(282.1);
  for(let n=0;n<8;n++){const kind=n<3?'smoke':'dust';this.particles.push({image:this.add.image(0,0,'dawn-'+kind).setOrigin(0).setDepth(kind==='smoke'?343:281),index:n,kind});}
  this.pixelScale=this.scale.height>=1440&&this.scale.width>=2880?4:this.scale.height>=720&&this.scale.width>=1440?2:1;
  this.pan=Math.max(0,(DAWN_WORLD.width-this.scale.width/this.pixelScale)/2);
  this.cameras.main.setBackgroundColor('#a9d1c4');this.cameras.main.roundPixels=true;
  this.cursors=this.input.keyboard?.createCursorKeys();
  this.resizeCamera();
  if(!this.host.screensaverMode){this.bindInput();this.renderGuide();this.bindSceneChrome();}
  this.scale.on(Phaser.Scale.Events.RESIZE,this.resizeCamera,this);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.scale.off(Phaser.Scale.Events.RESIZE,this.resizeCamera,this);this.disposers.splice(0).forEach(f=>f());this.hideInspection();});
  if(this.host.debugMode||new URLSearchParams(location.search).has('debug')){
   const debug={snapshot:()=>({renderer:'authored-porcelain-tiles',pixelScale:this.pixelScale,time:this.expedition.time,camera:{x:this.pan,y:this.vertical},tide:this.expedition.tide,hovered:this.hovered?.id??null,responses:[...this.responses.keys()],actors:this.expedition.actors.map(a=>({...a})),subjects:this.items.filter(i=>i.id).map(i=>({key:i.key,id:i.id,x:i.x,y:i.y,screenX:i.image.x,screenY:i.image.y,width:i.image.width,height:i.image.height,displayWidth:i.image.displayWidth,displayHeight:i.image.displayHeight,factor:i.factor,depth:i.image.depth}))}),
    pause:(paused:boolean)=>{this.debugPaused=paused;},advance:(seconds:number)=>{for(let i=0;i<Math.min(600,seconds)*60;i++)updateDawn(this.expedition,1/60);this.update(0,0);},identify:(x:number,y:number)=>this.identify(x,y)?.id??null,parallax:()=>DAWN_LAYERS};
   (window as unknown as {__timeTombs?:typeof debug}).__timeTombs=debug;this.disposers.push(()=>delete (window as unknown as {__timeTombs?:typeof debug}).__timeTombs);
  }
  const sound=document.querySelector<HTMLButtonElement>('[data-sound-toggle]');if(sound){const hidden=sound.hidden;sound.hidden=true;this.disposers.push(()=>{sound.hidden=hidden;});}
 }
 private addItem(key:string,x:number,y:number,factor:number,base:number,id?:string,actor?:number):void {
  const image=this.add.image(0,0,'dawn-'+key).setOrigin(0).setDepth(base);this.items.push({key,image,x,y,factor,base,id,actor});
 }
 private screenX(x:number,factor:number):number{return Math.round(this.left+(x-DAWN_WORLD.anchor-(this.pan-DAWN_WORLD.anchor)*factor)*this.pixelScale);}
 private screenY(y:number):number{return Math.round(this.top+(y-this.vertical)*this.pixelScale);}
 private resizeCamera():void {
  const w=this.scale.width,h=this.scale.height;
  this.pan=Math.max(0,Math.min(Math.max(0,DAWN_WORLD.width-w/this.pixelScale),this.pan));
  this.vertical=Math.max(0,Math.min(Math.max(0,DAWN_WORLD.height-h/this.pixelScale),this.vertical));
  this.left=Math.max(0,Math.floor((w-DAWN_WORLD.width*this.pixelScale)/2));this.top=Math.max(0,Math.floor((h-DAWN_WORLD.height*this.pixelScale)/2));
  this.positionItems();
 }
 private positionItems():void {for(const i of this.items)i.image.setPosition(this.screenX(i.x,i.factor),this.screenY(i.y)).setScale(this.pixelScale).setFlipX(!!i.mirror);}
 update(_time:number,delta:number):void {
  if(!this.debugPaused)updateDawn(this.expedition,delta/1000);
  const s=this.expedition,t=s.time;
  for(const [key,until]of this.responses)if(t>until)this.responses.delete(key);
  if(this.host.screensaverMode){this.pan=DAWN_WORLD.anchor+Math.sin(t/80)*36;}
  else if(!this.inspectHeld){const speed=delta/1000*55;if(this.cursors?.left.isDown)this.pan-=speed;if(this.cursors?.right.isDown)this.pan+=speed;if(this.cursors?.up.isDown)this.vertical-=speed;if(this.cursors?.down.isDown)this.vertical+=speed;}
  for(const i of this.items){
   let key=i.key;
   if(i.actor!==undefined){const a=s.actors[i.actor],band=actorBand(a.y);key=band+'-'+a.id+'-'+a.frame;const r=this.art.get(key)!;i.x=a.x-Math.floor(r.width/2);i.y=a.y-(band==='person'?18:r.height-1);i.factor=actorFactor(a.y);i.base=a.y+.1;i.mirror=a.facing<0;}
   else if(i.key.startsWith('tent-'))key=i.key.slice(0,-1)+Math.floor(t*2)%4;
   else if(i.key==='pavilion-0')key='pavilion-'+Math.floor(t*2)%4;
   else if(i.key==='fire-0')key='fire-'+Math.floor(t*5)%4;
   else if(i.key==='instrument-0')key='instrument-'+Math.floor(t*1.2)%4;
   else if(this.art.has(i.key+'-hover')&&(this.responses.has(i.key)||this.guideFocus?.id===i.id||(this.inspectHeld&&this.hovered===i)))key=i.key+'-hover';
   i.image.setTexture('dawn-'+key).setDepth(i.base);
   if(i.actor!==undefined)i.key=key;
  }
  this.resizeCamera();this.drawMarks();this.refreshHover();
  const fire=PROPS.find(p=>p.key==='fire')!;
  for(const p of this.particles){
   const smoke=p.kind==='smoke',age=(t+p.index*(smoke?1.7:2.9))%(smoke?5:15),base=smoke?{x:fire.x+1,y:fire.y-3}:MONUMENTS[(p.index-3)%MONUMENTS.length];
   const wind=s.tide?-1:1;
   p.image.setPosition(this.screenX(base.x+Math.floor(age*(smoke?1:1.5))*wind,smoke?1:(base as typeof MONUMENTS[number]).factor),this.screenY(smoke?base.y-Math.floor(age*2.4):(base as typeof MONUMENTS[number]).base+2-Math.floor(age*.15))).setScale(this.pixelScale).setAlpha(Math.min(1,age)*Math.max(0,1-age/(smoke?5:15))*.45);
  }
 }
 private drawMarks():void {
  this.marks.clear();this.campMarks.clear();const s=this.pixelScale,t=this.expedition.time;
  // Discrete boot marks remain at the historical release point on their plane.
  this.marks.fillStyle(0xa69d82,.55);this.campMarks.fillStyle(0xa69d82,.55);
  for(const p of this.expedition.footprints)(p.y>282?this.campMarks:this.marks).fillRect(this.screenX(p.x+p.side,actorFactor(p.y)),this.screenY(p.y),s,s);
  // Shadow pixels are attached to the current authored foot, including mirroring.
  for(const i of this.items.filter(i=>i.actor!==undefined)){
   const a=this.expedition.actors[i.actor!],r=this.art.get(i.key)!,foot=actorBand(a.y)==='person'?18:r.height-1;
   const marks=a.y>282?this.campMarks:this.marks;marks.fillStyle(0x6e9291,.8);
   for(let x=0;x<r.width;x++)if(r.get(x,foot)!==TRANSPARENT){const xx=i.x+(i.mirror?r.width-1-x:x);marks.fillRect(this.screenX(xx,i.factor),this.screenY(a.y),2*s,s);}
  }
  // Bounded ember trajectories start at the camp fire's named placement.
  const fire=PROPS.find(p=>p.key==='fire')!;
  this.campMarks.fillStyle(0xe4c692,1);
  for(let n=0;n<4;n++){const age=(t+n*.67)%3;if(age<2.1)this.campMarks.fillRect(this.screenX(fire.x+4+Math.floor(age*1.5),1),this.screenY(fire.y+4-Math.floor(age*3)),s,s);}
 }
 private identify(x:number,y:number):Item|undefined {
  for(const i of [...this.items].sort((a,b)=>b.image.depth-a.image.depth)){
   const r=this.art.get(i.key)!;let px=Math.floor((x-i.image.x)/this.pixelScale);const py=Math.floor((y-i.image.y)/this.pixelScale);if(i.mirror)px=r.width-1-px;
   if(r.get(px,py)!==TRANSPARENT){if(i.id)return i;if(['near','camp'].includes(i.key))return undefined;}
  }
  return undefined;
 }
 private refreshHover():void {
  const p=this.input.activePointer;this.hovered=this.identify(p.x,p.y);
  if(!this.inspectHeld||!this.hovered){this.hideInspection();return;}
  const e=guide.find(e=>e.id===this.hovered?.id);if(!e)return;
  const tooltip=document.querySelector<HTMLElement>('[data-inspection-tooltip]');if(!tooltip)return;
  tooltip.hidden=false;for(const [key,value]of [['id',e.id],['name',e.name],['summary',e.summary],['excerpt',e.excerpt||''],['source',e.source||'']]){const el=tooltip.querySelector<HTMLElement>('[data-inspection-'+key+']');if(el){el.textContent=value;el.hidden=!value;}}
  tooltip.style.left=Math.max(12,Math.min(innerWidth-tooltip.offsetWidth-16,p.x+18))+'px';tooltip.style.top=Math.max(12,Math.min(innerHeight-tooltip.offsetHeight-16,p.y+18))+'px';
 }
 private hideInspection():void {const t=document.querySelector<HTMLElement>('[data-inspection-tooltip]');if(t)t.hidden=true;}
 private recenterCamera():void {this.pan=Math.max(0,(DAWN_WORLD.width-this.scale.width/this.pixelScale)/2);this.vertical=0;this.drag=null;this.resizeCamera();}
 private bindInput():void {
  const down=(e:KeyboardEvent)=>{if(e.key==='Control')this.inspectHeld=true;};
  const up=(e:KeyboardEvent)=>{if(e.key==='Control'){this.inspectHeld=false;this.hideInspection();}};
  const clear=()=>{this.inspectHeld=false;this.drag=null;this.guideFocus=null;this.hideInspection();};
  document.addEventListener('keydown',down);document.addEventListener('keyup',up);window.addEventListener('blur',clear);
  this.disposers.push(()=>document.removeEventListener('keydown',down),()=>document.removeEventListener('keyup',up),()=>window.removeEventListener('blur',clear));
  const wheel=(e:WheelEvent)=>{e.preventDefault();if(performance.now()<this.wheelAt)return;this.wheelAt=performance.now()+180;const levels=[1,2,4],index=levels.indexOf(this.pixelScale),next=levels[Math.max(0,Math.min(2,index+(e.deltaY<0?1:-1)))];if(next===this.pixelScale)return;const p=this.input.activePointer,wx=this.pan+(p.x-this.left)/this.pixelScale,wy=this.vertical+(p.y-this.top)/this.pixelScale;this.pixelScale=next;this.pan=wx-p.x/next;this.vertical=wy-p.y/next;this.resizeCamera();};
  this.host.canvas.addEventListener('wheel',wheel,{passive:false});this.disposers.push(()=>this.host.canvas.removeEventListener('wheel',wheel));
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.button===1){this.recenterCamera();return;}if(p.button===0)this.drag={x:p.x,y:p.y,pan:this.pan,vertical:this.vertical,moved:false};});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.drag&&p.isDown&&!this.inspectHeld){if(Math.hypot(p.x-this.drag.x,p.y-this.drag.y)>5)this.drag.moved=true;if(this.drag.moved){this.pan=this.drag.pan-(p.x-this.drag.x)/this.pixelScale;this.vertical=this.drag.vertical-(p.y-this.drag.y)/this.pixelScale;this.resizeCamera();}}});
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(this.drag&&!this.drag.moved){const i=this.identify(p.x,p.y);if(i?.actor!==undefined)interactDawn(this.expedition,i.actor);else if(i&&MONUMENTS.some(m=>m.key===i.key))this.responses.set(i.key,this.expedition.time+3);}this.drag=null;});
  this.input.on('gameout',clear);
 }
 private renderGuide():void {
  const list=document.querySelector<HTMLElement>('[data-glossary-list]');if(!list)return;list.replaceChildren();let group='';
  for(const e of guide){if(group!==e.group){group=e.group;const h=document.createElement('h2');h.className='glossary-group-title';h.textContent=group;list.append(h);}
   const b=document.createElement('button');b.type='button';b.className='glossary-entry';
   for(const [tag,text,cls]of [['span',e.id,'entry-id'],['strong',e.name,'entry-name'],['span',e.summary,'entry-summary']]){const el=document.createElement(tag);el.textContent=text;el.className=cls;b.append(el);}
   for(const p of e.passages||[]){const q=document.createElement('q'),c=document.createElement('cite');q.className='tomb-book-excerpt';q.textContent=p.excerpt;c.className='tomb-book-source';c.textContent=p.source;b.append(q,c);}
   b.addEventListener('pointerenter',()=>{this.guideFocus=e;});b.addEventListener('pointerleave',()=>{this.guideFocus=null;});b.addEventListener('focus',()=>{this.guideFocus=e;});b.addEventListener('blur',()=>{this.guideFocus=null;});
   b.addEventListener('click',()=>{const i=this.items.find(i=>i.id===e.id);if(i){this.pan=DAWN_WORLD.anchor+(i.x+this.art.get(i.key)!.width/2-DAWN_WORLD.anchor-this.scale.width/(2*this.pixelScale))/i.factor;this.vertical=i.y+this.art.get(i.key)!.height/2-this.scale.height/(2*this.pixelScale);this.resizeCamera();}});list.append(b);
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



}
