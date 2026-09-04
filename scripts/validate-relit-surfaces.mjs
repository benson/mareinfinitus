import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const art=path.join(root,'src','time-tombs','art');
const builders=fs.readdirSync(art).filter(name=>name.endsWith('-relit.js')).sort();
const violations=[];
for(const name of builders){
  const source=fs.readFileSync(path.join(art,name),'utf8');
  for(const token of ['dither(', 'prng('])if(source.includes(token))violations.push(`${name}: contains ${token}`);
}
if(violations.length){
  console.error('Relit surface gate failed. Monument builders must use authored masks and solid shade bands:');
  for(const violation of violations)console.error(`- ${violation}`);
  process.exit(1);
}
console.log(`Relit surface validation passed: ${builders.length} builders use no dither or PRNG.`);
