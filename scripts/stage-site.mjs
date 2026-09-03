import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'output','site');
if(path.relative(root,output)!==path.join('output','site'))throw Error('Unsafe site output');
await fs.rm(output,{recursive:true,force:true});await fs.mkdir(output,{recursive:true});
// Publish runtime only, not source excerpts, experiments, dependencies or native
// build directories. The freshly built Phaser bundle is required, not optional.
for(const file of ['index.html','style.css','app.js','systems','scenes','public','dist/time-tombs/time-tombs.js']){
  const target=path.join(output,file);await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.cp(path.join(root,file),target,{recursive:true});
}
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log('Staged deployable site: '+output);
