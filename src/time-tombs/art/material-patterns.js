// Generated once with crypto.randomBytes, then kept as an authored seed tape.
// Repeated letters, mirrored triplets and repeated pairs suggest wear, seams
// and forks. They choose bounded material motifs, never silhouettes or identity.
export const MATERIAL_TAPE=
 'AHGDHBDBBAEADHBDEAHCFBCCGBHDEHBHHFEEAABDGBHADADFBHBCGHCHABHFABBDFBDACHDDDADGHHBCBBCDEFBADFFDDHAHGHCHAGGCBADHGHCFBFCCFHFBGAFFAEECDBFBGBFFEEAGBCBAAGACBCBDGAEGFGCDFGBDABCFFCBBGABAHBGACCFGHBHCGBCBDGBDGCHHGBEFCCDCHGACCDCCBDBEBEDCBHAFHBGBDGGAFDECBFGAFFDCFFHGFFECEEFHABADHAEFCFAAHCBHDDGBEGBAHBHAEHFDCDBDDEGHABFGHDGDEAEBEEEGGBAAHHEBFGDDFGFHABACEAHAAAFAGCCEDHABDAFBDADEACGBHGDCEAHBGACHEGFHEFCFEFCHACHBCCDDFBDHACGAGDAFHGCECEDFHEDDDDHEBGGDGFEGACBHCAAHEHDABABACFAAEEGDADDDBFABDCACFDEFCEEBGEGGFGDDADGDAGFBACCFGEFCCBCFFDFEAFFBHCBADBDDEEBDADDCCACEGDAEEFHHDHFAFFHBFCBFEBFFAFDEGDFAGAGHDECBEGECACCGEFHGGCGAEAFAHGGECADGGCBGCEDAHGBGGAHFBBADDGFDEAFBADACEACHEGBBCCFEFBBAEBBFHEGCHFBHGECBEFCFBAEGHDGBHEGFAEDHBAAABBGCHHADCFDEACHEAGFCGAABHFFGHCACDCGFGCCGCGAHCBCCEFDGCCHDEFHHDBBBFHCGCBCCBHBBHGGF';

export function findPatterns(tape){
  const patterns=[];
  for(let i=0;i<tape.length;i++){
    let end=i+1;
    while(tape[end]===tape[i]&&end<tape.length)end++;
    if(end-i>=2&&tape[i-1]!==tape[i])patterns.push({kind:'run',at:i,length:end-i});
    if(i+2<tape.length&&tape[i]===tape[i+2]&&tape[i]!==tape[i+1])patterns.push({kind:'mirror',at:i,length:3});
    if(i+3<tape.length&&tape.slice(i,i+2)===tape.slice(i+2,i+4)&&tape[i]!==tape[i+1])patterns.push({kind:'echo',at:i,length:4});
  }
  return patterns.map(p=>Object.freeze({...p,value:tape.charCodeAt(p.at)-65,turn:(tape.charCodeAt(p.at+1)%2?1:-1)}));
}
function hash(label){let h=2166136261;for(const c of label)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function patternSampler(tape=MATERIAL_TAPE){
  const patterns=findPatterns(tape);
  if(!patterns.length)throw new Error('Material tape needs at least one repeated or mirrored pattern');
  return (label,index=0)=>patterns[hash(label+':'+index)%patterns.length];
}
export const patternAt=patternSampler();
