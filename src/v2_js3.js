<script>
// ================= FILE PARSERS (all units → mm) =================
function parseSTL(buf){const dv=new DataView(buf);
  if(buf.byteLength>=84){const n=dv.getUint32(80,true);if(84+n*50===buf.byteLength){const out=new Float32Array(n*9);
    for(let i=0;i<n;i++){const o=84+i*50+12;for(let k=0;k<9;k++)out[i*9+k]=dv.getFloat32(o+k*4,true)}return out}}
  const txt=new TextDecoder().decode(buf),re=/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g,v=[];let m;
  while((m=re.exec(txt)))v.push(+m[1],+m[2],+m[3]);
  if(!v.length)throw new Error(tr('فایل STL خوانده نشد؛ ممکن است خراب باشد.'));return Float32Array.from(v.slice(0,v.length-v.length%9))}
function parseOBJ(buf){const lines=new TextDecoder().decode(buf).split('\n'),V=[],out=[];
  for(const l of lines){const p=l.trim().split(/\s+/);
    if(p[0]==='v')V.push([+p[1],+p[2],+p[3]]);
    else if(p[0]==='f'){const idx=p.slice(1).map(s=>{const i=parseInt(s);return i<0?V.length+i:i-1});for(let k=1;k<idx.length-1;k++)for(const j of [idx[0],idx[k],idx[k+1]])out.push(...V[j])}}
  if(!out.length)throw new Error(tr('در فایل OBJ هیچ سطحی پیدا نشد.'));
  const f=new Float32Array(out.length);for(let i=0;i<out.length;i+=3){f[i]=out[i];f[i+1]=-out[i+2];f[i+2]=out[i+1]}return f} // OBJ is Y-up
async function parse3MF(buf){ // returns [{pos,name}] — one entry per build item so plates with several parts stay separate
  if(typeof JSZip==='undefined')throw new Error(tr('کتابخانهٔ باز کردن 3MF بارگذاری نشد؛ اتصال اینترنت را بررسی کنید.'));
  const zip=await JSZip.loadAsync(buf),docs={},keys=Object.keys(zip.files);
  const getDoc=async p=>{p=p.replace(/^\//,'');if(docs[p])return docs[p];const k=keys.find(x=>x.toLowerCase()===p.toLowerCase());if(!k)return null;
    return docs[p]=new DOMParser().parseFromString(await zip.file(k).async('string'),'application/xml')};
  let root=null;const rels=await getDoc('_rels/.rels');
  if(rels)for(const r of rels.getElementsByTagNameNS('*','Relationship'))if(/3dmodel$/.test(r.getAttribute('Type')||''))root=r.getAttribute('Target');
  root=(root||keys.find(k=>/\.model$/i.test(k))||'').replace(/^\//,'');
  const rootDoc=await getDoc(root);if(!rootDoc)throw new Error(tr('مدل داخل فایل 3MF پیدا نشد.'));
  const UNIT={micron:.001,millimeter:1,centimeter:10,inch:25.4,foot:304.8,meter:1000};
  const unitOf=doc=>UNIT[doc.documentElement.getAttribute('unit')||'millimeter']||1;
  const attr=(el,name)=>{for(const a of el.attributes)if(a.localName===name)return a.value;return null};
  const tf=s=>{const m=new THREE.Matrix4();if(!s)return m;const v=s.trim().split(/\s+/).map(Number);
    m.set(v[0],v[3],v[6],v[9],v[1],v[4],v[7],v[10],v[2],v[5],v[8],v[11],0,0,0,1);return m};
  const tmp=new THREE.Vector3();
  async function emit(path,id,M,depth,chunks){if(depth>8)return;const doc=await getDoc(path);if(!doc)return;const u=unitOf(doc);
    const obj=[...doc.getElementsByTagNameNS('*','object')].find(o=>o.getAttribute('id')===id);if(!obj)return;
    const meshEl=[...obj.children].find(c=>c.localName==='mesh');
    if(meshEl){const vEls=meshEl.getElementsByTagNameNS('*','vertex'),V=new Float64Array(vEls.length*3);
      for(let i=0;i<vEls.length;i++){const e=vEls[i];tmp.set(+e.getAttribute('x')*u,+e.getAttribute('y')*u,+e.getAttribute('z')*u).applyMatrix4(M);V[i*3]=tmp.x;V[i*3+1]=tmp.y;V[i*3+2]=tmp.z}
      const tEls=meshEl.getElementsByTagNameNS('*','triangle'),out=new Float32Array(tEls.length*9);
      for(let i=0;i<tEls.length;i++){const e=tEls[i],ids=[+e.getAttribute('v1'),+e.getAttribute('v2'),+e.getAttribute('v3')];
        for(let k=0;k<3;k++){out[i*9+k*3]=V[ids[k]*3];out[i*9+k*3+1]=V[ids[k]*3+1];out[i*9+k*3+2]=V[ids[k]*3+2]}}
      chunks.push(out)}
    for(const c of obj.getElementsByTagNameNS('*','component'))await emit(attr(c,'path')||path,c.getAttribute('objectid'),M.clone().multiply(tf(c.getAttribute('transform'))),depth+1,chunks)}
  const merge=ch=>{const n=ch.reduce((s,c)=>s+c.length,0),out=new Float32Array(n);let o=0;for(const c of ch){out.set(c,o);o+=c.length}return out};
  const res=[],items=rootDoc.getElementsByTagNameNS('*','item');
  if(items.length){for(const it of items){if(it.getAttribute('printable')==='0')continue;const ch=[];await emit(attr(it,'path')||root,it.getAttribute('objectid'),tf(it.getAttribute('transform')),0,ch);if(ch.length)res.push(merge(ch))}}
  else{const ch=[];for(const o of rootDoc.getElementsByTagNameNS('*','object'))await emit(root,o.getAttribute('id'),new THREE.Matrix4(),0,ch);if(ch.length)res.push(merge(ch))}
  if(!res.length)throw new Error(tr('در فایل 3MF مش قابل چاپی پیدا نشد.'));return res}

async function loadFiles(files){const before=objSeq;showErr('');$('busy').hidden=false;$('busyT').textContent=tr('در حال خواندن فایل…');
  for(const f of files.filter(f=>/\.curaprofile$/i.test(f.name)))await importCuraProfile(f);files=files.filter(f=>!/\.curaprofile$/i.test(f.name));
  for(const f of files){try{const buf=await f.arrayBuffer(),ext=f.name.split('.').pop().toLowerCase(),nm=f.name.replace(/\.[^.]+$/,'');
      if(ext==='3mf'){const parts=await parse3MF(buf);parts.forEach((p,i)=>addObject(p,parts.length>1?`${nm} (${i+1})`:nm,{noArrange:true,file:f.name}))}
      else if(ext==='stl')addObject(parseSTL(buf),nm,{noArrange:true,file:f.name});
      else if(ext==='obj')addObject(parseOBJ(buf),nm,{noArrange:true,file:f.name});
      else throw new Error(tr('فقط فایل‌های STL، 3MF و OBJ پشتیبانی می‌شوند.'))}
    catch(e){showErr(`${f.name}: ${e.message||tr('خواندن فایل ناموفق بود.')}`)}}
  $('busy').hidden=true;if(objs.length>1)arrange();defaultView();refreshObjs();changed();
  const fresh=objs.filter(o=>o.id>before&&!o.piece);if(fresh.length){const big=fresh.reduce((a,b)=>a.size[0]*a.size[1]*a.size[2]>b.size[0]*b.size[1]*b.size[2]?a:b);sel=big.id;refreshObjs();showSuggestions(big)}}
function showErr(m){$('err').hidden=!m;$('err').textContent=m}

// ================= SAMPLES =================
function geoToZup(g){g=g.index?g.toNonIndexed():g;const p=g.attributes.position.array,f=new Float32Array(p.length);
  for(let i=0;i<p.length;i+=3){f[i]=p[i];f[i+1]=-p[i+2];f[i+2]=p[i+1]}return f}
const SAMPLES={
  vase(){const pts=[[0,0],[28,0],[30,2],[34,18],[38,40],[36,62],[26,82],[21,96],[23,108],[26,112],[25,114],[0,114]].map(([r,y])=>new THREE.Vector2(r,y));
    return [geoToZup(new THREE.LatheGeometry(pts,96)),tr('نمونه — گلدان')]},
  cube(){return [geoToZup(new THREE.BoxGeometry(20,20,20)),tr('نمونه — XYZ cube 20mm')]},
  knot(){return [geoToZup(new THREE.TorusKnotGeometry(28,9,220,28)),tr('نمونه — گره')]},
};
$('file').addEventListener('change',e=>{const fs=[...e.target.files];if(fs.length)loadFiles(fs);e.target.value=''});
let dragN=0;
addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();dragN++;$('dropmask').hidden=false}});
addEventListener('dragleave',()=>{if(--dragN<=0){dragN=0;$('dropmask').hidden=true}});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dragN=0;$('dropmask').hidden=true;const fs=[...e.dataTransfer.files];if(fs.length)loadFiles(fs)});

// ================= SETTINGS UI =================
const CATS=[
 ['کیفیت',[['lh','ارتفاع لایه','mm',{min:.06,max:.32,step:.02}],['lh0','ارتفاع لایهٔ اول','mm',{min:.1,max:.4,step:.02}],['lw','عرض خط','mm',{min:.2,max:1,step:.01}]]],
 ['دیواره‌ها',[['walls','تعداد دیواره','',{min:1,max:10,step:1}],['wallOrder','ترتیب چاپ دیواره‌ها','',{opts:{inner:'داخل ← بیرون',outer:'بیرون ← داخل'}}],['seam','محل درز (Z seam)','',{opts:{back:'پشت، هم‌راستا',short:'کوتاه‌ترین',rand:'تصادفی'}}]]],
 ['بالا و پایین',[['top','لایه‌های بالا','',{min:0,max:20,step:1}],['bottom','لایه‌های پایین','',{min:0,max:20,step:1}]]],
 ['پرکننده (Infill)',[['inf','تراکم','%',{min:0,max:100,step:5}],['infPat','الگو','',{opts:{cubic:'مکعبی (Cubic)',grid:'شبکه (Grid)',lines:'خطی (Lines)',triangles:'مثلثی',gyroid:'ژیروئید'}}],['infOverlap','هم‌پوشانی پرکننده با دیواره','%',{min:0,max:50,step:1}],['skinOverlap','هم‌پوشانی سطح با دیواره','%',{min:0,max:50,step:1}]]],
 ['متریال',[['mat','فیلامنت','',{opts:Object.fromEntries(Object.entries(MATS).map(([k,m])=>[k,m.n]))}],['tNoz','دمای نازل','°C',{min:170,max:300,step:5}],['tNoz0','دمای نازل لایهٔ اول (۰ = همان)','°C',{min:0,max:300,step:5}],['tBed','دمای بستر','°C',{min:0,max:110,step:5}],['tBed0','دمای بستر لایهٔ اول (۰ = همان)','°C',{min:0,max:120,step:5}],['flow','جریان (Flow)','%',{min:80,max:120,step:1}],['flow0','جریان لایهٔ اول','%',{min:80,max:150,step:1}]]],
 ['سرعت',[['vOuter','دیوارهٔ بیرونی','mm/s'],['vInner','دیوارهٔ داخلی','mm/s'],['vInfill','پرکننده','mm/s'],['vSkin','بالا و پایین','mm/s'],['vSupport','ساپورت','mm/s'],['vIface','رابط ساپورت','mm/s'],['vFirst','لایهٔ اول','mm/s'],['vTravel','جابه‌جایی','mm/s'],['vTravel0','جابه‌جایی لایهٔ اول','mm/s'],['slowLayers','تعداد لایه‌های آهسته','',{min:0,max:10,step:1}],['acc','شتاب','mm/s²',{step:100}],['jerk','جرک','mm/s']]],
 ['حرکت و رتراکشن',[['retract','رتراکشن','',{bool:1}],['retDist','طول رتراکشن','mm',{step:.1}],['retSpeed','سرعت رتراکشن','mm/s'],['retMin','حداقل مسافت برای رتراکشن','mm',{step:.5}],['comb','کامبینگ (داخل قطعه بدون رتراکشن)','',{bool:1}],['zhop','Z-hop هنگام رتراکشن (۰ = خاموش)','mm',{step:.1}],['retLayer','رتراکشن در تعویض لایه','',{bool:1}]]],
 ['خنک‌کاری',[['fan0','فن لایهٔ اول','%',{min:0,max:100,step:5}],['fan','سرعت فن','%',{min:0,max:100,step:5}],['fanLayer','فن کامل از لایهٔ','',{min:1,max:10,step:1}],['minLayerTime','حداقل زمان هر لایه','s',{step:1}],['minSpeed','حداقل سرعت','mm/s']]],
 ['ساپورت',[['sup','ساپورت','',{bool:1}],['supType','نوع ساپورت','',{opts:{normal:'معمولی',tree:'درختی'}}],['supWhere','محل','',{opts:{all:'همه‌جا',bed:'فقط از روی بستر'}}],['supAng','زاویهٔ اورهنگ','°',{min:20,max:80,step:5}],['supPat','الگوی ساپورت','',{opts:{zigzag:'زیگزاگ',lines:'خطی',grid:'شبکه'}}],['supDens','تراکم ساپورت','%',{min:5,max:60,step:5}],['supZ','فاصلهٔ Z','mm',{step:.05}],['supXY','فاصلهٔ XY','mm',{step:.1}],['supMinArea','حداقل مساحت ساپورت','mm²',{step:.5}],['supIface','لایهٔ رابط (Interface)','',{bool:1}],['supIfaceH','ضخامت رابط','mm',{step:.1}],['supIfDens','تراکم رابط','%',{min:10,max:100,step:5}],['supIfPat','الگوی رابط','',{opts:{grid:'شبکه',lines:'خطی'}}],['treeAngle','زاویهٔ شاخه (درختی)','°',{min:10,max:70,step:5}],['treeTip','قطر نوک شاخه (درختی)','mm',{step:.1}],['treeGrow','زاویهٔ ضخیم شدن شاخه (درختی)','°',{min:0,max:20,step:1}]]],
 ['ابعاد و تلرانس',[['xyOff','انبساط افقی (Horizontal expansion)','mm',{step:.01}],['holeOff','انبساط افقی سوراخ‌ها','mm',{step:.01}],['keepTol','حفظ لقی قطعات هنگام تغییر مقیاس','',{bool:1}],['tolGap','لقی طراحی‌شده','mm',{step:.05}]]],
 ['چسبندگی به بستر',[['adh','نوع','',{opts:{none:'هیچ',skirt:'اسکرت',brim:'بریم',raft:'رافت'}}],['skirtLoops','تعداد خطوط اسکرت','',{min:1,max:10,step:1}],['skirtDist','فاصلهٔ اسکرت','mm',{step:1}],['brimW','عرض بریم','mm',{step:1}],['raftMargin','حاشیهٔ رافت','mm',{step:1}],['raftGap','فاصلهٔ هوایی رافت','mm',{step:.05}]]],
 ['حالت‌های ویژه',[['vase','حالت گلدان (Spiralize)','',{bool:1}],['noHoles','حذف همهٔ سوراخ‌ها','',{bool:1}],['ironing','اتو کردن سطح بالا (Ironing)','',{bool:1}],['ironFlow','جریان اتو','%',{min:1,max:50,step:1}],['ironSpacing','فاصلهٔ خطوط اتو','mm',{step:.05}],['ironSpeed','سرعت اتو','mm/s',{step:5}],['fuzzy','سطح زبر (Fuzzy skin)','',{bool:1}],['fuzzyT','ضخامت زبری','mm',{step:.05}],['fuzzyD','تراکم نقاط زبری','mm',{step:.1}]]],
 ['پرینتر و G-code',[['startG','G-code شروع','',{area:1}],['endG','G-code پایان','',{area:1}]]],
];
const PRICE_KEYS=new Set(['col','priceK','elecK','wearK','laborPct','setupK','packK','fail','profit','tax','round','kf']);
function buildCustom(){const pan=$('panCus');let h='';
  for(const [title,fields] of CATS){h+=`<details class="cat"><summary>${tr(title)}</summary>`;
    for(const [k,label,unit,o={}] of fields){const id='c_'+k;
      if(o.bool)h+=`<label class="chk" style="margin:7px 0"><input type="checkbox" id="${id}" data-k="${k}"> ${tr(label)}</label>`;
      else if(o.opts)h+=`<div class="row"><label for="${id}">${tr(label)}</label><select id="${id}" data-k="${k}">${Object.entries(o.opts).map(([v,t])=>`<option value="${v}">${tr(t)}</option>`).join('')}</select></div>`;
      else if(o.area)h+=`<div class="row" style="display:block"><label for="${id}">${tr(label)}</label><textarea id="${id}" data-k="${k}" spellcheck="false"></textarea></div>`;
      else h+=`<div class="row"><label for="${id}">${tr(label)}</label><span><input class="num" type="number" id="${id}" data-k="${k}" ${o.min!=null?`min="${o.min}"`:''} ${o.max!=null?`max="${o.max}"`:''} step="${o.step||1}"> <span class="hint">${unit}</span></span></div>`}
    h+='</details>'}
  h+=`<div class="tools"><button class="btn sm" type="button" id="resetCfg">${tr('بازگشت به تنظیمات پیش‌فرض Cura')}</button></div><p class="hint">${tr('{nozzle}، {bed} و {depth} در G-code شروع و پایان با مقدار تنظیمات جایگزین می‌شوند.')}</p>`;
  pan.innerHTML=h;$('resetCfg').onclick=()=>{const keep={};PRICE_KEYS.forEach(k=>keep[k]=cfg[k]);cfg={...DEF,...keep};onCfg(null,true)}}
$('rMat').innerHTML=Object.entries(MATS).map(([k,m])=>`<option value="${k}">${m.n}</option>`).join('');
function syncInputs(){
  document.querySelectorAll('[data-k]').forEach(el=>{if(el===document.activeElement&&el.tagName!=='SELECT')return;const v=cfg[el.dataset.k];
    if(el.type==='checkbox')el.checked=!!v;else if(el.type==='color')el.value=v||modelCol();else el.value=v});
  $('rInfO').textContent=cfg.inf+'%';$('rAdh').checked=cfg.adh!=='none';$('rSupOpts').hidden=!cfg.sup;$('rAdhOpts').hidden=cfg.adh==='none';
  document.querySelectorAll('#qSeg button').forEach(b=>b.setAttribute('aria-pressed',Math.abs(+b.dataset.v-cfg.lh)<1e-6));
  document.querySelectorAll('#vSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===cfg.prof));
  document.querySelectorAll('#rSupWhere button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===cfg.supWhere));
  document.querySelectorAll('#rSupType button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===cfg.supType));
  document.querySelectorAll('#rAdhType button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===cfg.adh));
  uLH.value=cfg.lh}
function onCfg(k,reslice){saveCfg();syncInputs();
  if(k==='mat'){const m=MATS[cfg.mat];Object.assign(cfg,{tNoz:m.tNoz,tBed:m.tBed,fan:m.fan});syncInputs();saveCfg()}
  if(k==='supAng'&&$('ovBtn').getAttribute('aria-pressed')==='true')objs.forEach(buildMesh);
  if(k==='adh'||k==='brimW'||k==='skirtDist'||k==='raftMargin'||k==='skirtLoops'||k==='mat'||k==='col'||k==='keepTol'||k==='tolGap')refreshObjs();
  if(['adh','brimW','skirtDist','raftMargin','skirtLoops'].includes(k))paintPlate();
  if(k==='mat'){cfg.col='';saveCfg();syncInputs();objs.forEach(o=>o.mesh.material.color.set(modelCol()))}
  if(k==='col')objs.forEach(o=>o.mesh.material.color.set(modelCol()));
  if(reslice)changed();else{renderResult();renderPrice()}}
document.addEventListener('change',e=>{const el=e.target.closest('[data-k]');if(!el)return;const k=el.dataset.k;
  let v=el.type==='checkbox'?el.checked:el.type==='number'||el.type==='range'?parseFloat(el.value):el.value;
  if(el.type==='number'&&!isFinite(v))return syncInputs();
  if(k==='round'||k==='nozzle')v=+v;cfg[k]=v;if(PROFILES[cfg.prof]&&['vOuter','vInner','vInfill','vSkin','vSupport','vIface','vFirst','vTravel','vTravel0','acc','jerk'].includes(k))cfg.prof='custom';
  onCfg(k,!PRICE_KEYS.has(k))});
$('rInf').addEventListener('input',()=>{$('rInfO').textContent=$('rInf').value+'%'});
$('qSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.lh=+b.dataset.v;cfg.supZ=cfg.lh;onCfg('lh',true)};
$('vSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.prof=b.dataset.v;Object.assign(cfg,PROFILES[cfg.prof]);onCfg('prof',true)};
$('rSupWhere').onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.supWhere=b.dataset.v;onCfg('supWhere',true)};
$('rAdhType').onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.adh=b.dataset.v;onCfg('adh',true)};
$('rAdh').onchange=()=>{cfg.adh=$('rAdh').checked?'brim':'none';onCfg('adh',true)};
$('tabRec').onclick=()=>{$('tabRec').setAttribute('aria-selected',true);$('tabCus').setAttribute('aria-selected',false);$('panRec').hidden=false;$('panCus').hidden=true};
$('tabCus').onclick=()=>{$('tabCus').setAttribute('aria-selected',true);$('tabRec').setAttribute('aria-selected',false);$('panCus').hidden=false;$('panRec').hidden=true};
</script>
