<script>
// ================= SLICE CONTROL =================
let result=null,prev=null,mode='prep',sliceTimer=0,slicingNow=false;
function setStatus(msg,bad,busy){const s=$('status');s.className='status'+(bad?' bad':'');s.innerHTML=(busy?'<i class="spin"></i>':'')+'<span></span>';s.lastChild.textContent=msg}
function changed(){if(typeof recordState==='function')recordState();result=null;slicingNow=false;$('saveBtn').disabled=true;$('mPrev').disabled=true;if(mode==='prev')setMode('prep');clearPreview();clearTimeout(sliceTimer);sliceGen++;$('prog').hidden=true;
  renderResult();renderPrice();renderStats();
  if(!objs.length)return setStatus(tr('مدلی برای برش نیست.'));
  if(objs.some(objOut))return setStatus(tr('مدلی بیرون از محدودهٔ چاپ است؛ آن را جابه‌جا یا کوچک کنید.'),true);
  if($('auto').checked)sliceTimer=setTimeout(runSlice,700);else setStatus(tr('تنظیمات تغییر کرد؛ «برش» را بزنید.'))}
let sliceGen=0;
async function runSlice(){clearTimeout(sliceTimer);if(!objs.length||objs.some(objOut))return changed();
  const gen=++sliceGen,t0=performance.now();$('prog').hidden=false;slicingNow=true;
  const setP=(f,label)=>{$('prog').firstElementChild.style.width=(f*100).toFixed(1)+'%';setStatus(`${tr(label)} · ${fa(Math.round(f*100))}%`,false,true)};
  try{await sliceInner(gen,setP,t0)}finally{if(gen===sliceGen)slicingNow=false}}
async function sliceInner(gen,setP,t0){
  try{const B=await buildToolpaths(gen,setP);setP(.88,'شبیه‌سازی حرکت');await nextFrame();if(gen!==sliceGen)return;
    const sim=simulate(B);setP(.94,'نوشتن G-code');await nextFrame();if(gen!==sliceGen)return;
    const G=writeGcode(B,sim),eBy=new Float64Array(8);for(const L of B.layers)for(const o of L.ops)if(o.k==='E')eBy[o.ty]+=o.e;
    result={B,sim,G,eBy,lines:G.text.split('\n').length-1,bytes:G.text.length,secs:(performance.now()-t0)/1000};
    buildPreview(B);$('prog').hidden=true;setStatus(tr('آماده')+` · ${fa(result.secs,1)} ${tr('ثانیه')}`);$('saveBtn').disabled=false;$('mPrev').disabled=false;
    renderResult();renderPrice();renderStats()}
  catch(e){if(e===ABORT)return;console.error(e);$('prog').hidden=true;setStatus(tr('برش ناموفق بود: ')+(e.message||e),true)}}
$('sliceBtn').onclick=runSlice;
// auto slicing is off until the user turns it on; the choice is remembered
try{$('auto').checked=localStorage.getItem('slicer-auto')==='1'}catch(e){}
$('auto').onchange=()=>{try{localStorage.setItem('slicer-auto',$('auto').checked?'1':'0')}catch(e){}if($('auto').checked&&!result)changed()};

// ================= G-CODE PREVIEW =================
class FB{constructor(){this.a=new Float32Array(1<<14);this.n=0}push(a,b,c,d,e,f){if(this.n+6>this.a.length){const t=new Float32Array(this.a.length*2);t.set(this.a);this.a=t}const A=this.a,n=this.n;A[n]=a;A[n+1]=b;A[n+2]=c;A[n+3]=d;A[n+4]=e;A[n+5]=f;this.n=n+6}}
const prevGroup=new THREE.Group();prevGroup.visible=false;scene.add(prevGroup);
const typeOn=TYPES.map(()=>true);let showTravel=false,showGhost=true;
function clearPreview(){stopPlay();prevGroup.children.slice().forEach(o=>{o.geometry.dispose();o.material.dispose();prevGroup.remove(o)});prev=null;nozzle.visible=false}
function buildPreview(B){clearPreview();const N=B.layers.length,bufs=TYPES.map(()=>new FB()),idx=TYPES.map(()=>new Int32Array(N+1)),trav=new FB(),tidx=new Int32Array(N+1),ends=[];
  let x=null,y=null,z=0;const hx=BED.x/2,hy=BED.y/2;
  B.layers.forEach((L,li)=>{for(let t=0;t<TYPES.length;t++)idx[t][li]=bufs[t].n/6;tidx[li]=trav.n/6;if(!L.spiral)z=L.z;
    for(const o of L.ops){if(o.k==='T'){if(x!==null)trav.push(x-hx,z,hy-y,o.x-hx,z,hy-o.y);x=o.x;y=o.y}
      else if(o.k==='E'){const nz=o.z!=null?o.z:z;bufs[o.ty].push(x-hx,z,hy-y,o.x-hx,nz,hy-o.y);x=o.x;y=o.y;z=nz}}
    ends.push([x,y,z])});
  for(let t=0;t<TYPES.length;t++)idx[t][N]=bufs[t].n/6;tidx[N]=trav.n/6;
  const mk=(buf,col)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(buf.a.subarray(0,buf.n),3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:col}));l.frustumCulled=false;prevGroup.add(l);return l};
  const lines=bufs.map((b,t)=>mk(b,'#fff')),tl=mk(trav,'#6b8cff');tl.material.transparent=true;tl.material.opacity=.45;
  prev={N,idx,tidx,lines,trav:tl,ends,zs:B.layers.map(l=>l.z)};colorPreview();
  const r=$('layer');r.max=N;r.value=N;showLayer()}
function colorPreview(){if(!prev)return;prev.lines.forEach((l,t)=>l.material.color.set(css(TCOL[t])));prev.trav.material.color.set(css('--t-trav'))}
function showLayer(){if(!prev)return;const L=clamp(+$('layer').value,1,prev.N);
  prev.lines.forEach((l,t)=>{l.visible=typeOn[t];l.geometry.setDrawRange(0,prev.idx[t][L]*2)});
  prev.trav.visible=showTravel;prev.trav.geometry.setDrawRange(0,prev.tidx[L]*2);
  $('lNo').textContent=`${fa(L)}/${fa(prev.N)}`;$('lZ').textContent=prev.zs[L-1].toFixed(2)+' mm';
  const e=prev.ends[L-1];if(e&&e[0]!=null&&mode==='prev'&&L<prev.N){nozzle.visible=true;nozzle.position.set(e[0]-BED.x/2,e[2],BED.y/2-e[1])}else nozzle.visible=false}
$('layer').addEventListener('input',()=>{stopPlay();showLayer()});
let playing=0;function stopPlay(){if(playing){cancelAnimationFrame(playing);playing=0}}
$('play').onclick=()=>{if(!prev)return;if(playing){stopPlay();return}const N=prev.N,t0=performance.now(),dur=Math.min(12000,2500+N*15);
  const step=t=>{const f=clamp((t-t0)/dur);$('layer').value=Math.max(1,Math.round(f*N));showLayer();playing=f<1?requestAnimationFrame(step):0};playing=requestAnimationFrame(step)};
function buildLegend2(){const el=$('legend2');
  el.innerHTML=TYPES.map((t,i)=>`<label><input type="checkbox" data-ty="${i}" ${typeOn[i]?'checked':''}><i style="background:var(${TCOL[i]})"></i>${tr(TNAME[i])}</label>`).join('')+
    `<label><input type="checkbox" id="lgTrav" ${showTravel?'checked':''}><i style="background:var(--t-trav)"></i>${tr('حرکت بدون چاپ')}</label><label><input type="checkbox" id="lgGhost" ${showGhost?'checked':''}><i style="background:var(--muted)"></i>${tr('نمایش کم‌رنگ مدل')}</label>`;
  el.querySelectorAll('[data-ty]').forEach(c=>c.onchange=()=>{typeOn[+c.dataset.ty]=c.checked;showLayer()});
  $('lgTrav').onchange=e=>{showTravel=e.target.checked;showLayer()};$('lgGhost').onchange=e=>{showGhost=e.target.checked;setMode(mode)}}
function setMode(m){mode=m;$('mPrep').setAttribute('aria-pressed',m==='prep');$('mPrev').setAttribute('aria-pressed',m==='prev');
  const pv=m==='prev';prevGroup.visible=pv;$('layerbar').hidden=!pv;$('legend2').hidden=!pv;$('rail').hidden=pv;$('tip').hidden=pv;
  for(const o of objs){o.mesh.visible=!pv||showGhost;o.mesh.material.opacity=pv?.1:1;o.mesh.material.depthWrite=!pv;o.mesh.castShadow=!pv}
  if(pv)showLayer();else{nozzle.visible=false;stopPlay()}updateHelpers();updateGizmo();renderObjOverlay()}
$('mPrep').onclick=()=>setMode('prep');$('mPrev').onclick=()=>{if(prev)setMode('prev')};

// ================= RESULT, PRICE, STATS =================
function fmtTime(s){const m=Math.max(1,Math.round(s/60)),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60,u=x=>`<small>${tr(x)}</small>`;
  return (d?`${fa(d)} ${u('روز')} `:'')+(d||h?`${fa(h)} ${u('ساعت')} `:'')+`${fa(mm)} ${u('دقیقه')}`}
const GROUPS=[['دیواره‌ها',[0,1],'--t-outer'],['سطح بالا و پایین',[2],'--t-skin'],['پرکننده',[3],'--t-fill'],['ساپورت',[4,5],'--t-sup'],['چسبندگی به بستر',[6],'--t-skirt'],['حرکت و رتراکشن',[7],'--t-trav']];
const timeK=()=>cfg.kf||1;
function grams(){return result?result.G.eTot*FIL_AREA/1000*MATS[result.B.S.mat].rho:0}
function renderResult(){const has=!!result;$('result').hidden=!has;$('gmeta').textContent='';if(!has)return;
  const tot=result.sim.total*timeK();$('tTime').innerHTML=fmtTime(tot);
  $('fLen').innerHTML=`${fa(result.G.eTot/1000,2)} <small>${tr('متر')}</small>`;$('fW').innerHTML=`${fa(grams(),1)} <small>${tr('گرم')}</small>`;
  const bt=result.sim.byT,sum=bt.reduce((s,v)=>s+v,0)||1,rho=MATS[result.B.S.mat].rho;
  const rows=GROUPS.map(([n,ids,c])=>({n,c,t:ids.reduce((s,i)=>s+bt[i],0),g:ids.reduce((s,i)=>s+(result.eBy[i]||0),0)*FIL_AREA/1000*rho})).filter(r=>r.t>0.5);
  $('stack').innerHTML=rows.map(r=>`<i style="width:${r.t/sum*100}%;background:var(${r.c})"></i>`).join('');
  $('legend').innerHTML=rows.map(r=>{const m=Math.round(r.t*timeK()/60);return `<span class="n"><i style="background:var(${r.c})"></i>${tr(r.n)}${r.g>0.05?` <span class="hint" style="margin:0">· ${fa(r.g,1)} ${tr('گرم')}</span>`:''}</span><span class="t">${m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+'m'}</span><span class="p">${fa(r.t/sum*100)}%</span>`}).join('');
  $('gmeta').textContent=`${fa(result.B.layers.length)} ${lang==='en'?'layers':'لایه'} · ${fa(result.lines)} ${tr('خط')} · ${fa(result.bytes/1048576,1)} MB`}
function renderPrice(){const pcs=objs.length;$('pcs').textContent=pcs?`${fa(pcs)} ${tr('قطعه')}`:'';const bill=$('bill');
  if(!result){bill.innerHTML=`<dt style="grid-column:1/-1;color:var(--muted)">${tr('بعد از برش محاسبه می‌شود.')}</dt>`;$('finalP').textContent='—';$('perPiece').textContent='';return}
  const hrs=result.sim.total*timeK()/3600,g=grams(),K=1000;
  const mat=g/1000*cfg.priceK*K,elec=hrs*cfg.elecK*K,mach=hrs*cfg.wearK*K,labor=(mat+elec+mach)*cfg.laborPct/100,setup=cfg.setupK*K,pack=cfg.packK*K;
  const fail=(mat+elec+mach)*cfg.fail/100,cost=mat+elec+mach+labor+setup+pack+fail,profit=cost*cfg.profit/100,tax=(cost+profit)*cfg.tax/100;
  const R=cfg.round||1000,final=Math.ceil((cost+profit+tax)/R)*R,T=v=>`${fa(Math.round(v))} ${tr('ت')}`;
  const rows=[['فیلامنت',`${fa(g,1)} ${tr('گرم')}`,mat],['برق',`${fa(hrs,1)} ${tr('ساعت')}`,elec],['استهلاک دستگاه',`${fa(hrs,1)} ${tr('ساعت')}`,mach],['دستمزد',`${fa(cfg.laborPct)}%`,labor],['آماده‌سازی سفارش','',setup],['بسته‌بندی','',pack],['ذخیرهٔ خرابی',`${fa(cfg.fail)}%`,fail]];
  bill.innerHTML=rows.filter(r=>r[2]>0).map(([n,s,v])=>`<dt>${tr(n)}${s?` <span class="hint" style="margin:0">(${s})</span>`:''}</dt><dd>${T(v)}</dd>`).join('')+
    `<div class="sep"></div><dt>${tr('بهای تمام‌شده')}</dt><dd>${T(cost)}</dd><dt>${tr('سود')} (${fa(cfg.profit)}%)</dt><dd>${T(profit)}</dd>`+(tax>0?`<dt>${tr('مالیات')} (${fa(cfg.tax)}%)</dt><dd>${T(tax)}</dd>`:'');
  $('finalP').textContent=`${fa(final)} ${tr('تومان')}`;$('perPiece').textContent=pcs>1?`${tr('هر قطعه حدود')} ${fa(Math.ceil(final/pcs/R)*R)} ${tr('تومان')}`:''}
function objVolume(o){if(o.vol!=null)return o.vol;const p=o.baked;let v=0;for(let t=0;t<p.length;t+=9){const ax=p[t],ay=p[t+1],az=p[t+2],bx=p[t+3],by=p[t+4],bz=p[t+5],cx=p[t+6],cy=p[t+7],cz=p[t+8];v+=(ax*(by*cz-bz*cy)-ay*(bx*cz-bz*cx)+az*(bx*cy-by*cx))/6}return o.vol=Math.abs(v)}
function renderStats(){const b=objs.length?sceneBounds():null;
  const rows=[['تعداد مدل',`${objs.length}`],['محدودهٔ مدل‌ها',b?`${(b.x1-b.x0).toFixed(1)} × ${(b.y1-b.y0).toFixed(1)} × ${b.z.toFixed(1)} mm`:'—'],
    ['حجم مدل‌ها',objs.length?`${(objs.reduce((s,o)=>s+objVolume(o),0)/1000).toFixed(2)} cm³`:'—'],['مثلث‌ها',objs.reduce((s,o)=>s+o.base.length/9,0).toLocaleString('en-US')],
    ['تعداد لایه',result?`${result.B.layers.length}`:'—'],['دمای نازل / بستر',`${cfg.tNoz} / ${cfg.tBed} °C`],['جریان حداکثر',`${MATS[cfg.mat].flow} mm³/s`]];
  $('stats').innerHTML=rows.map(([k,v])=>`<dt>${tr(k)}</dt><dd>${v}</dd>`).join('')}

// ================= SAVE =================
$('saveBtn').onclick=async()=>{if(!result)return;const base=((objs[0]?objs[0].name:'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'model').slice(0,40),nm=`${printerShort()}_${base}.gcode`;
  const r=await saveFile(nm,result.G.text,true);
  toast(r==='saved'?tr('ذخیره شد. فایل .gcode داخل zip را روی کارت حافظه بریزید.'):r==='direct'?tr('G-code ذخیره شد.'):r==='declined'?tr('ذخیره لغو شد.'):tr('ذخیره در این نما ممکن نشد. فایل HTML را روی سیستم باز کنید.'))};

// ================= LANGUAGE =================
function translateDom(){document.documentElement.lang=lang;document.documentElement.dir=lang==='en'?'ltr':'rtl';
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){if(n.parentElement.closest('script,style'))continue;if(n.__fa==null){if(!/[؀-ۿ]/.test(n.nodeValue))continue;n.__fa=n.nodeValue}
    const k=n.__fa.trim(),en=EN[k];n.nodeValue=lang==='en'&&en?n.__fa.replace(k,en):n.__fa}
  document.querySelectorAll('[title],[aria-label],[data-label],[placeholder]').forEach(el=>{for(const a of ['title','aria-label','data-label','placeholder']){const v=el.getAttribute(a);if(v==null)continue;const key='__fa_'+a;
    if(el[key]==null){if(!/[؀-ۿ]/.test(v))continue;el[key]=v}el.setAttribute(a,lang==='en'&&EN[el[key]]?EN[el[key]]:el[key])}});
  $('langBtn').textContent=lang==='en'?'فا':'EN'}
function buildSegs(){$('qSeg').innerHTML=QUALITY.map(([v,n])=>`<button type="button" data-v="${v}"><span class="mono">${v.toFixed(2)}</span><br>${tr(n)}</button>`).join('');
  $('vSeg').innerHTML=Object.entries(PROFILES).map(([k,p])=>`<button type="button" data-v="${k}">${tr(p.n)}</button>`).join('')}
function applyLang(){if(typeof buildGuide==='function')buildGuide();buildSegs();buildCustom();buildPrinterSelect();buildSplitUI();buildProfilesUI();translateDom();syncInputs();setTool(tool);buildLegend2();refreshObjs();renderResult();renderPrice();renderStats();applyTheme();
  if(result)setStatus(tr('آماده')+` · ${fa(result.secs,1)} ${tr('ثانیه')}`);else if(!slicingNow)setStatus(objs.length?tr('تنظیمات تغییر کرد؛ «برش» را بزنید.'):tr('مدلی برای برش نیست.'))}
$('langBtn').onclick=()=>{lang=lang==='en'?'fa':'en';try{localStorage.setItem('slicer-lang',lang)}catch(e){}applyLang()};

// ================= PANELS: remember which cards are collapsed =================
(function(){let st={};try{st=JSON.parse(localStorage.getItem('slicer-cards')||'{}')}catch(e){}
  document.querySelectorAll('details.card').forEach((d,i)=>{const k=d.id||'card'+i;if(k in st)d.open=st[k];
    d.addEventListener('toggle',()=>{st[k]=d.open;try{localStorage.setItem('slicer-cards',JSON.stringify(st))}catch(e){}})})})();
$('rSupType').onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.supType=b.dataset.v;onCfg('supType',true)};

// ================= BOOT =================
buildAccents();applyCut();applyPrinter(false);applyLang();resize();
defaultView();changed();

// while slicing, draw at most 4 frames a second so weak GPUs leave the CPU to the slicer
// seen from below, the bed turns see-through so the model stays visible
let _below=null;function bedSeeThrough(){const below=camera.position.y<-1;if(below===_below)return;_below=below;
  for(const m of plate.material){m.transparent=below;m.opacity=below?.18:1;m.depthWrite=!below;m.needsUpdate=true}}
let _lastDraw=0;(function loop(t){if(!slicingNow||t-_lastDraw>250){_lastDraw=t;placeCam();bedSeeThrough();renderer.render(scene,camera)}requestAnimationFrame(loop)})(0);
</script>
