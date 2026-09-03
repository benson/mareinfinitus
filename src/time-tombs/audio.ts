import {PROP_PLACEMENTS,entityAnchor} from './entities.js';
import {attachmentPoint} from './transforms.js';
import {spatialAt} from './acoustics.js';
import {windAt,tideAt,instrumentAt} from './atmosphere.js';

type Voice={gain:GainNode;pan:StereoPannerNode};
// Local synthesis: no downloads or autoplay. Every source is bounded and owned
// by this scene; exiting, hiding, and screensaver mode all remain silent.
export class ValleyAudio {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private wind:Voice|null=null;
  private fire:Voice|null=null;
  private tide:Voice|null=null;
  private clicks:Voice[]=[];
  private tickStamp=-1;
  private updateStamp=-1;
  private enabled=false;
  private sources:Array<AudioScheduledSourceNode>=[];
  private disposers:Array<()=>void>=[];
  private lastMix:unknown=null;
  constructor(private readonly screensaver:boolean){
    const button=document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
    const toggle=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();void this.toggle();};
    const key=(e:KeyboardEvent)=>{
      if(e.key.toLowerCase()!=='m'||e.repeat||(e.target as HTMLElement)?.closest('input,textarea,select,button,[contenteditable="true"]'))return;
      toggle(e);
    };
    // Capture the existing chrome for this scene without modifying Mare audio.
    button?.addEventListener('click',toggle,true);window.addEventListener('keydown',key,true);
    const visibility=()=>{this.applyMute();};document.addEventListener('visibilitychange',visibility);
    this.disposers.push(()=>button?.removeEventListener('click',toggle,true),()=>window.removeEventListener('keydown',key,true),()=>document.removeEventListener('visibilitychange',visibility));
  }
  private voice():Voice{
    const c=this.context!,gain=c.createGain(),pan=c.createStereoPanner();gain.gain.value=0;
    gain.connect(pan).connect(this.master!);return {gain,pan};
  }
  private build():void{
    const c=this.context=new AudioContext();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
    const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=buffer.getChannelData(0);
    let seed=4163;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
    const noise=(frequency:number,q:number,voice:Voice)=>{
      const s=c.createBufferSource(),filter=c.createBiquadFilter();s.buffer=buffer;s.loop=true;
      filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;s.connect(filter).connect(voice.gain);s.start();this.sources.push(s);
    };
    this.wind=this.voice();noise(490,.6,this.wind);
    this.fire=this.voice();noise(1700,.45,this.fire);
    this.tide=this.voice();const hum=c.createOscillator();hum.frequency.value=67;hum.connect(this.tide.gain);hum.start();this.sources.push(hum);
    this.clicks=Array.from({length:PROP_PLACEMENTS.filter(p=>p.key.startsWith('instrument')).length},(_,i)=>{const v=this.voice(),o=c.createOscillator();o.type='sine';o.frequency.value=560+i*87;o.connect(v.gain);o.start();this.sources.push(o);return v;});
  }
  private async toggle():Promise<void>{
    if(this.screensaver)return;
    try{
      if(!this.context)this.build();
      this.enabled=!this.enabled;
      if(this.enabled&&this.context!.state==='suspended')await this.context!.resume();
      this.applyMute();
    }catch{this.enabled=false;this.applyMute();}
    const button=document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
    button?.setAttribute('aria-pressed',String(this.enabled));const label=button?.querySelector('b');if(label)label.textContent=this.enabled?'SOUND ON':'SOUND';
  }
  private applyMute():void{
    if(!this.context||!this.master)return;
    const now=this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(this.enabled&&!document.hidden ? .14 : 0,now,.12);
  }
  update(time:number,listener:{x:number;y:number}):void{
    if(!this.context||!this.enabled||document.hidden)return;
    const stamp=Math.floor(time*8);if(stamp===this.updateStamp)return;this.updateStamp=stamp;
    const c=this.context,now=c.currentTime,tide=tideAt(time);
    const set=(voice:Voice,source:{x:number;y:number},volume:number)=>{
      const mix=spatialAt(source,listener);voice.pan.pan.setTargetAtTime(mix.pan,now,.2);voice.gain.gain.setTargetAtTime(mix.gain*volume,now,.35);return mix;
    };
    const wind=set(this.wind!,{x:260,y:160},.13+windAt(time)*.16);
    const fire=set(this.fire!,attachmentPoint('fire','sound'),.11+Math.sin(time*1.7)*.016);
    set(this.tide!,{x:tide.x,y:217},tide.amount*.042);
    const beat=Math.floor(time/.9);
    if(beat!==this.tickStamp){
      this.tickStamp=beat;const locations=PROP_PLACEMENTS.filter(p=>p.key.startsWith('instrument')).map(p=>entityAnchor(p.uid,'sound'));
      // At most one short, quiet instrument tick per beat, never a pile of cues.
      const i=beat%locations.length,{x,y}=locations[i],strength=instrumentAt(time,x).strength;
      if(strength>.12){const v=this.clicks[i],mix=spatialAt({x,y},listener);v.pan.pan.setValueAtTime(mix.pan,now);v.gain.gain.cancelScheduledValues(now);v.gain.gain.setValueAtTime(0,now);v.gain.gain.linearRampToValueAtTime(.06*mix.gain*strength,now+.006);v.gain.gain.exponentialRampToValueAtTime(.00001,now+.075);}
    }
    this.lastMix={wind,fire,tide:tide.stage};
  }
  snapshot(){return {enabled:this.enabled,state:this.context?.state??'uninitialized',silent:!this.enabled||document.hidden,voices:this.sources.length,mix:this.lastMix};}
  destroy():void{this.disposers.splice(0).forEach(fn=>fn());this.sources.forEach(s=>s.stop());this.sources=[];void this.context?.close();this.context=null;}
}
