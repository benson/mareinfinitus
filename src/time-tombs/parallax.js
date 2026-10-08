// Six horizontal scrolling bands. The accepted 860px window begins at x=140.
export const PARALLAX_ANCHOR=140;
export const LAYERS={sky:.05,far:.35,shelf:.7,floor:.9,camp:1,near:1.2};
export function layerWidth(viewport,factor,world=1120){return Math.ceil(viewport+(world-viewport)*factor);}
export function layerX(worldX,factor){return worldX-Math.round((1-factor)*PARALLAX_ANCHOR);}
export function pickX(cameraWorldX,scrollX,factor){return cameraWorldX-(1-factor)*scrollX;}
export function actorFactor(y){return y<270?LAYERS.shelf:y<315?LAYERS.floor:LAYERS.camp;}
export function subjectFactor(key,y=360){
 if(key==='moon'||key.startsWith('sun-'))return LAYERS.sky;
 if(key==='caves')return LAYERS.far;
 if(['sphinx','jade','obelisk','crystal','palace'].includes(key)||key.startsWith('windstone'))return LAYERS.shelf;
 if(key.startsWith('pilgrim'))return actorFactor(y);
 return LAYERS.camp;
}

