import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const datei = readFileSync('dist/Skyfront.html');
const srv = createServer((q,a)=>{a.writeHead(200,{'Content-Type':'text/html'});a.end(datei)}).listen(0);
await new Promise(r=>srv.once('listening',r));
const b = await chromium.launch({args:['--no-sandbox','--disable-gpu','--use-gl=swiftshader']});
const s = await b.newPage({viewport:{width:390,height:844},hasTouch:true});
await s.addInitScript(()=>{try{localStorage.setItem('seen_tut','1');}catch(e){}});
await s.goto(`http://127.0.0.1:${srv.address().port}/`);
await s.waitForFunction(()=>window.__game&&window.__bootStats&&window.__bootStats.totalMs,null,{timeout:90000});
await s.waitForTimeout(1200);

const zaehle = async (stage) => {
  await s.evaluate(async (stage)=>{
    const g=window.__game;
    (g.scene.scenes||[]).forEach(z=>{if(z.scene.key!=='Boot'&&z.scene.isActive())g.scene.stop(z.scene.key)});
    g.scene.start('Game',{stage});
    for(let i=0;i<40;i++){await new Promise(f=>setTimeout(f,250));
      const sz=(g.scene.scenes||[]).find(z=>z.scene.key==='Game'&&z.scene.isActive());
      if(!sz)continue; if(!sz.stageStarted&&sz.startStage)sz.startStage();
      if(sz.player)return;}
  }, stage);
  await s.waitForTimeout(9000);
  return s.evaluate(()=>{
    const g=window.__game;
    const sz=(g.scene.scenes||[]).find(z=>z.scene.key==='Game'&&z.scene.isActive());
    const nach = {};
    const zaehl = (k)=>{ nach[k]=(nach[k]||0)+1 };
    for (const o of sz.children.list) {
      const t = o.type;
      const tex = (o.texture && o.texture.key) || '';
      let name = t;
      if (t === 'Image' || t === 'Sprite') name = t + ':' + (tex.length>28 ? 'gebacken' : tex);
      zaehl(name);
    }
    const grp = (gr) => gr ? gr.getLength()+'/'+gr.countActive(true) : '-';
    return {
      gesamt: sz.children.list.length,
      sichtbar: sz.children.list.filter(o=>o.visible).length,
      nach: Object.entries(nach).sort((a,c)=>c[1]-a[1]).slice(0,16),
      pools: { bullets: grp(sz.bullets), enemyBullets: grp(sz.enemyBullets), enemies: grp(sz.enemies), powerups: grp(sz.powerups) },
      fx: sz.fxActive+'/'+sz.fxPool.length, txt: sz.txtActive+'/'+sz.txtPool.length,
      q: sz.qBudget, fxCap: sz.fxCap, stage: sz.stage,
    };
  });
};
for (const st of [2, 106]) {
  const r = await zaehle(st);
  console.log(`\n=== Sektor ${st} ===  Anzeigeliste ${r.gesamt} (sichtbar ${r.sichtbar})  Q ${r.q.toFixed(2)}  fxCap ${r.fxCap}`);
  console.log('  Pools:', JSON.stringify(r.pools), ' fx', r.fx, ' txt', r.txt);
  for (const [k,v] of r.nach) console.log('   ', String(v).padStart(4), k);
}
await b.close(); srv.close();
