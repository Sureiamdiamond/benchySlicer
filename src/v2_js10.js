<script>
// ================= MOVE PANEL (Cura-style) =================
function fillMovePanel(){const show=tool==='move'&&mode==='prep';$('movPanel').hidden=!show;if(!show)return;const o=selMat();
  ['mx','my','mz','movLock'].forEach(id=>$(id).disabled=!o);$('mz').disabled=!o||$('movDrop').checked;if(!o)return;
  const f=(id,v)=>{if(document.activeElement!==$(id))$(id).value=v};f('mx',o.px.toFixed(1));f('my',o.py.toFixed(1));f('mz',(o.z||0).toFixed(1));$('movLock').checked=!!o.locked}
$('mx').addEventListener('change',()=>{const o=selMat(),v=parseFloat($('mx').value);if(!o||!isFinite(v)||o.locked)return fillMovePanel();o.px=v;placeMesh(o);refreshObjs();changed()});
$('my').addEventListener('change',()=>{const o=selMat(),v=parseFloat($('my').value);if(!o||!isFinite(v)||o.locked)return fillMovePanel();o.py=v;placeMesh(o);refreshObjs();changed()});
$('mz').addEventListener('change',()=>{const o=selMat(),v=parseFloat($('mz').value);if(!o||!isFinite(v)||o.locked||$('movDrop').checked)return fillMovePanel();o.z=Math.max(0,v);placeMesh(o);refreshObjs();changed();
  if(o.z>0&&!cfg.sup)toast(tr('مدل در هوا است؛ برای چاپ آن ساپورت را روشن کنید.'))});
$('movLock').addEventListener('change',()=>{const o=selMat();if(!o)return;o.locked=$('movLock').checked;toast(tr(o.locked?'مدل قفل شد و با موس جابه‌جا نمی‌شود.':'قفل مدل باز شد.'))});
try{$('movDrop').checked=localStorage.getItem('slicer-drop')!=='0'}catch(e){}
$('movDrop').addEventListener('change',()=>{try{localStorage.setItem('slicer-drop',$('movDrop').checked?'1':'0')}catch(e){}if($('movDrop').checked&&objs.some(o=>o.z)){objs.forEach(o=>{o.z=0;placeMesh(o)});refreshObjs();changed()}fillMovePanel()});

// ================= PROFILE MENU =================
$('profMore').onclick=e=>{e.stopPropagation();const open=$('profMenu').hidden;$('profMenu').hidden=!open;$('profMore').setAttribute('aria-expanded',open)};
document.addEventListener('click',e=>{if(!e.target.closest('.more'))$('profMenu').hidden=true});
$('profMenu').addEventListener('click',()=>setTimeout(()=>$('profMenu').hidden=true,0));

// ================= SUGGESTED SETTINGS FOR A NEW MODEL =================
// Reads the geometry in its current orientation: overhang area (support), bed contact vs height (adhesion),
// flat vs organic surfaces and size (layer height, walls, infill), and whether another orientation needs less support.
function analyseModel(o){const p=o.baked,n=p.length/9,sinT=Math.sin(45*Math.PI/180);let A=0,ov=0,ovFlat=0,flat=0,contact=0;
  for(let t=0;t<n;t++){const k=t*9,ux=p[k+3]-p[k],uy=p[k+4]-p[k+1],uz=p[k+5]-p[k+2],vx=p[k+6]-p[k],vy=p[k+7]-p[k+1],vz=p[k+8]-p[k+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,L=Math.hypot(nx,ny,nz);if(!L)continue;const a=L/2,z=Math.min(p[k+2],p[k+5],p[k+8]),cz=nz/L;A+=a;
    if(Math.max(Math.abs(nx),Math.abs(ny),Math.abs(nz))/L>.985)flat+=a;
    if(cz<-.985&&z<.3)contact+=a;else if(cz<-sinT&&z>.3){ov+=a*(-cz);if(cz<-.985)ovFlat+=a}}
  const [sx,sy,sz]=o.size,foot=sx*sy||1,maxD=Math.max(sx,sy,sz),flatR=flat/A,ovR=ov/A,contactR=contact/foot,tall=sz/Math.sqrt(Math.max(contact,1));
  return {A,ov,ovR,ovFlatR:ov?ovFlat/ov:0,flatR,contact,contactR,tall,sx,sy,sz,maxD,tris:n,mech:flatR>.55,organic:flatR<.25}}
function suggest(o){const m=analyseModel(o),out=[],facts=[];
  facts.push(`${o.size.map(v=>v.toFixed(0)).join('×')} mm`,`${tr(m.mech?'قطعهٔ فنی (سطح‌های صاف)':m.organic?'فیگور یا مدل ارگانیک':'ترکیبی')}`,`${tr('اورهنگ')} ${fa(m.ovR*100,0)}%`,`${tr('سطح تماس با بستر')} ${fa(m.contact/100,1)} cm²`);
  // orientation: compare against the best candidate
  const before=m.ov;let bestGain=0;{const save={rot:o.rot.clone(),scale:o.scale.slice()},r=bestOrientScore(o);if(r&&before>0)bestGain=1-r.ov/Math.max(before,1e-6)}
  if(bestGain>.3&&before>50)out.push({id:'orient',on:true,t:'چرخاندن به بهترین جهت',d:`${tr('در جهت دیگری حدود')} ${fa(bestGain*100,0)}% ${tr('ساپورت کمتری لازم است.')}`,apply:()=>bestOrient(o)});
  // support
  const needSup=m.ov>40&&m.ovR>.02;
  if(needSup){const tree=m.organic||m.ovFlatR<.5;out.push({id:'sup',on:true,t:`${tr('ساپورت')} ${tr(tree?'درختی':'معمولی')}`,d:tr(tree?'اورهنگ‌ها پراکنده و منحنی‌اند؛ ساپورت درختی کمتر مصرف می‌کند و راحت‌تر جدا می‌شود.':'زیر مدل سطح‌های صاف و بزرگ معلق هست؛ ساپورت معمولی آن‌ها را بهتر نگه می‌دارد.'),apply:()=>Object.assign(cfg,{sup:true,supType:tree?'tree':'normal',supWhere:'all'})})}
  else out.push({id:'nosup',on:true,t:'بدون ساپورت',d:tr('اورهنگ قابل‌توجهی ندارد؛ بدون ساپورت چاپ می‌شود.'),apply:()=>Object.assign(cfg,{sup:false})});
  // adhesion
  if(m.contactR<.12||m.tall>4||(cfg.mat==='abs'))out.push({id:'brim',on:true,t:'بریم ۸ میلی‌متر',d:tr(m.contactR<.12?'سطح تماس با بستر کم است؛ بریم جلوی کنده شدن را می‌گیرد.':m.tall>4?'مدل نسبت به کفش بلند است؛ بریم پایداری‌اش را بیشتر می‌کند.':'ABS جمع می‌شود؛ بریم جلوی بلند شدن گوشه‌ها را می‌گیرد.'),apply:()=>Object.assign(cfg,{adh:'brim',brimW:8})});
  else out.push({id:'skirt',on:true,t:'اسکرت',d:tr('کف مدل پهن است؛ اسکرت برای آماده کردن نازل کافی است.'),apply:()=>Object.assign(cfg,{adh:'skirt'})});
  // layer height
  let lh=.2,why='اندازه و جزئیات مدل با لایهٔ ۰٫۲ متعادل است.';
  if(m.maxD<35){lh=.12;why='مدل کوچک است؛ لایهٔ نازک جزئیات را نگه می‌دارد.'}
  else if(m.organic&&m.maxD<120){lh=.16;why='مدل ارگانیک است؛ لایهٔ ۰٫۱۶ پله‌پله شدن سطح‌های منحنی را کم می‌کند.'}
  else if(m.mech&&m.sz>120){lh=.28;why='قطعهٔ فنی بلند با سطح‌های صاف است؛ لایهٔ ۰٫۲۸ زمان را کم می‌کند بی‌آنکه کیفیت دیواره‌ها افت کند.'}
  out.push({id:'lh',on:Math.abs(lh-cfg.lh)>1e-6,t:`${tr('ارتفاع لایه')} ${fa(lh,2)} mm`,d:tr(why),apply:()=>Object.assign(cfg,{lh,supZ:lh})});
  // walls and infill
  const walls=m.mech?3:(m.maxD<35?3:2),inf=m.mech?25:15,pat=m.mech?'grid':(m.organic?'gyroid':'cubic');
  out.push({id:'inf',on:true,t:`${fa(walls)} ${tr('دیواره')} · ${fa(inf)}% ${tr('پرکننده')} ${pat==='gyroid'?tr('ژیروئید'):pat==='grid'?tr('شبکه'):tr('مکعبی')}`,
    d:tr(m.mech?'قطعهٔ فنی است؛ دیوارهٔ بیشتر و پرکنندهٔ ۲۵٪ استحکام لازم را می‌دهد.':m.organic?'فیگور است؛ پرکنندهٔ کم با ژیروئید سبک و کافی است و دیوارهٔ دوتایی سطح را خوب نگه می‌دارد.':'برای استفادهٔ عمومی، پرکنندهٔ ۱۵٪ مکعبی تعادل خوبی بین وزن و استحکام دارد.'),apply:()=>Object.assign(cfg,{walls,inf,infPat:pat})});
  // clearance: filled in after an async check (see showSuggestions)
  // fit
  if(objOut(o)&&(o.size[0]>BED.x||o.size[1]>BED.y||o.size[2]>BED.z))out.push({id:'fit',on:true,t:'جا کردن در بستر',d:tr('مدل از حجم چاپ بزرگ‌تر است؛ کوچک می‌شود. اگر اندازهٔ اصلی را می‌خواهید، این را بردارید و از «تقسیم خودکار» استفاده کنید.'),apply:()=>$('fitBed').click()});
  return {facts,out}}
function bestOrientScore(o){return orientSearch(o)}
async function showSuggestions(o){const {facts,out}=suggest(o),box=$('suggest');
  const gap=await detectClearance(o);if(gap!=null)out.push({id:'tol',on:true,t:`${tr('حفظ لقی اتصال')} ${fa(gap,2)} mm`,d:tr('این مدل قطعه‌های جفت‌شونده دارد. اگر مقیاس را عوض کنید، فاصلهٔ بین آن‌ها همین مقدار می‌ماند تا اتصال‌ها سفت یا لق نشوند.'),apply:()=>Object.assign(cfg,{keepTol:true,tolGap:gap})});
  box.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="sgT"><h3 id="sgT">${tr('تنظیمات پیشنهادی برای این مدل')}</h3><p class="hint" style="margin:0">${tr('از روی شکل مدل حساب شده است. هر مورد را که نمی‌خواهید بردارید.')}</p>
    <div class="facts">${facts.map(f=>`<span>${f}</span>`).join('')}</div>
    ${out.map((s,i)=>`<label class="sugg"><input type="checkbox" data-si="${i}" ${s.on?'checked':''}><span><b>${tr(s.t)}</b><span>${s.d}</span></span></label>`).join('')}
    <div class="saverow"><button class="btn" type="button" id="sgNo">${tr('نه، ممنون')}</button><button class="btn pri" type="button" id="sgYes">${tr('اعمال تنظیمات')}</button></div></div>`;
  box.hidden=false;$('sgNo').onclick=()=>box.hidden=true;
  $('sgYes').onclick=()=>{box.querySelectorAll('[data-si]').forEach(c=>{if(c.checked)out[+c.dataset.si].apply()});box.hidden=true;saveCfg();syncInputs();buildMesh&&objs.forEach(x=>!x.piece&&buildMesh(x));refreshObjs();changed();toast(tr('تنظیمات پیشنهادی اعمال شد.'))}}
$('suggest').addEventListener('click',e=>{if(e.target===$('suggest'))$('suggest').hidden=true});
addEventListener('keydown',e=>{if(e.key==='Escape')$('suggest').hidden=true});

// ================= OBJECT LIST ON THE BED (like Cura) =================
function renderObjOverlay(){const box=$('objOv');if(!box)return;box.hidden=!objs.length||mode!=='prep';if(box.hidden)return;
  const files=[...new Set(objs.map(o=>o.file||o.name))];
  $('objOvList').innerHTML=files.map(f=>`<div class="ovfile">${svg('box')}<span></span></div>`+objs.filter(o=>(o.file||o.name)===f).map(o=>`<button type="button" class="ovobj${o.id===sel?' on':''}${objOut(o)?' out':''}" data-oid="${o.id}"><span></span><i>${o.size.map(v=>v.toFixed(0)).join('×')}</i></button>`).join('')).join('');
  const fe=$('objOvList').querySelectorAll('.ovfile span');files.forEach((f,i)=>fe[i].textContent=f);
  $('objOvList').querySelectorAll('.ovobj').forEach(b=>{const o=objs.find(x=>x.id===+b.dataset.oid);b.firstElementChild.textContent=o.name;b.onclick=()=>select(o.id)});
  $('objOvHead').lastElementChild.textContent=`${fa(objs.length)}`}
$('objOvHead').onclick=()=>{const c=$('objOv').classList.toggle('closed');try{localStorage.setItem('slicer-ov',c?'0':'1')}catch(e){}};
try{if(localStorage.getItem('slicer-ov')==='0')$('objOv').classList.add('closed')}catch(e){}

// ================= CURA PROFILES (.curaprofile) =================
// A .curaprofile is a zip of INI files; their [values] sections hold Cura setting ids. Formulas (values starting with "=") are skipped.
function parseIni(txt){const out={};let sec='';for(const raw of txt.split(/\r?\n/)){const l=raw.trim();if(!l||l[0]===';'||l[0]==='#')continue;const m=l.match(/^\[(.+)\]$/);if(m){sec=m[1].trim();out[sec]=out[sec]||{};continue}
  const i=l.indexOf('=');if(i<0||!sec)continue;out[sec][l.slice(0,i).trim()]=l.slice(i+1).trim()}return out}
function curaToCfg(V){const num=k=>{const v=V[k];if(v==null||String(v).startsWith('='))return undefined;const n=parseFloat(v);return isFinite(n)?n:undefined};
  const bool=k=>{const v=V[k];if(v==null||String(v).startsWith('='))return undefined;return /^(true|1)$/i.test(v)};const str=k=>{const v=V[k];return v==null||String(v).startsWith('=')?undefined:String(v).replace(/^["']|["']$/g,'')};
  const c={},set=(k,v)=>{if(v!==undefined&&v!==null&&!(typeof v==='number'&&!isFinite(v)))c[k]=v};
  set('lh',num('layer_height'));set('lh0',num('layer_height_0'));set('lw',num('line_width')??num('wall_line_width'));
  set('walls',num('wall_line_count')??(num('wall_thickness')!=null?Math.max(1,Math.round(num('wall_thickness')/(num('line_width')??cfg.lw))):undefined));
  const lhv=num('layer_height')??cfg.lh,tbt=num('top_bottom_thickness'),tt=num('top_thickness')??tbt,bt=num('bottom_thickness')??tbt;
  set('top',num('top_layers')??(tt!=null?Math.round(tt/lhv):undefined));set('bottom',num('bottom_layers')??(bt!=null?Math.round(bt/lhv):undefined));
  set('inf',num('infill_sparse_density'));const ip=str('infill_pattern');if(ip)set('infPat',{grid:'grid',lines:'lines',zigzag:'lines',triangles:'triangles',trihexagon:'triangles',cubic:'cubic',cubicsubdiv:'cubic',tetrahedral:'cubic',quarter_cubic:'cubic',gyroid:'gyroid',lightning:'cubic',concentric:'lines',cross:'grid',cross_3d:'grid'}[ip]||'cubic');
  set('infOverlap',num('infill_overlap'));set('skinOverlap',num('skin_overlap'));
  set('tNoz',num('material_print_temperature'));set('tNoz0',num('material_print_temperature_layer_0'));set('tBed',num('material_bed_temperature'));set('tBed0',num('material_bed_temperature_layer_0'));
  set('flow',num('material_flow'));set('flow0',num('material_flow_layer_0'));
  const sp=num('speed_print');set('vInfill',num('speed_infill')??sp);set('vOuter',num('speed_wall_0')??num('speed_wall')??(sp!=null?sp/2:undefined));set('vInner',num('speed_wall_x')??num('speed_wall')??(sp!=null?sp/2:undefined));
  set('vSkin',num('speed_topbottom')??(sp!=null?sp/2:undefined));set('vSupport',num('speed_support')??num('speed_support_infill'));set('vIface',num('speed_support_interface'));
  set('vFirst',num('speed_layer_0')??num('speed_print_layer_0'));set('vTravel',num('speed_travel'));set('vTravel0',num('speed_travel_layer_0'));set('slowLayers',num('speed_slowdown_layers'));
  set('acc',num('acceleration_print'));set('jerk',num('jerk_print'));
  set('retract',bool('retraction_enable'));set('retDist',num('retraction_amount'));set('retSpeed',num('retraction_retract_speed')??num('retraction_speed'));set('retMin',num('retraction_min_travel'));
  const cb=str('retraction_combing');if(cb)set('comb',cb!=='off');set('retLayer',bool('retract_at_layer_change'));const hop=bool('retraction_hop_enabled');if(hop!==undefined)set('zhop',hop?(num('retraction_hop')??0.2):0);
  set('fan',num('cool_fan_speed'));set('fan0',num('cool_fan_speed_0'));set('fanLayer',num('cool_fan_full_layer'));set('minLayerTime',num('cool_min_layer_time'));set('minSpeed',num('cool_min_speed'));
  set('sup',bool('support_enable'));const st=str('support_structure');if(st)set('supType',st==='tree'?'tree':'normal');const sw=str('support_type');if(sw)set('supWhere',sw==='buildplate'?'bed':'all');
  set('supAng',num('support_angle'));set('supDens',num('support_infill_rate'));const spat=str('support_pattern');if(spat)set('supPat',['lines','grid','zigzag'].includes(spat)?spat:'zigzag');
  set('supZ',num('support_top_distance')??num('support_z_distance'));set('supXY',num('support_xy_distance'));set('supMinArea',num('minimum_support_area'));
  set('supIface',bool('support_interface_enable')??bool('support_roof_enable'));set('supIfaceH',num('support_interface_height')??num('support_roof_height'));set('supIfDens',num('support_interface_density')??num('support_roof_density'));
  const ifp=str('support_interface_pattern')??str('support_roof_pattern');if(ifp)set('supIfPat',ifp==='lines'||ifp==='zigzag'?'lines':'grid');
  set('treeAngle',num('support_tree_angle'));set('treeTip',num('support_tree_tip_diameter'));set('treeGrow',num('support_tree_branch_diameter_angle'));
  const ad=str('adhesion_type');if(ad)set('adh',['skirt','brim','raft','none'].includes(ad)?ad:'skirt');set('skirtLoops',num('skirt_line_count'));set('skirtDist',num('skirt_gap'));set('brimW',num('brim_width'));set('raftMargin',num('raft_margin'));set('raftGap',num('raft_airgap'));
  set('vase',bool('magic_spiralize'));set('ironing',bool('ironing_enabled'));set('ironFlow',num('ironing_flow'));set('ironSpacing',num('ironing_line_spacing'));set('ironSpeed',num('speed_ironing'));
  set('fuzzy',bool('magic_fuzzy_skin_enabled'));set('fuzzyT',num('magic_fuzzy_skin_thickness'));set('fuzzyD',num('magic_fuzzy_skin_point_dist'));
  set('xyOff',num('xy_offset'));set('holeOff',num('hole_xy_offset'));set('noHoles',bool('meshfix_union_all_remove_holes'));
  const oi=bool('outer_inset_first');if(oi!==undefined)set('wallOrder',oi?'outer':'inner');const zs=str('z_seam_type');if(zs)set('seam',{back:'back',shortest:'short',random:'rand',sharpest_corner:'back'}[zs]||'back');
  for(const k of Object.keys(c))if(!(k in DEF))delete c[k];
  return c}
async function importCuraProfile(file){try{const buf=await file.arrayBuffer();let texts=[];
    if(/\.curaprofile$/i.test(file.name)){const zip=await JSZip.loadAsync(buf);for(const k of Object.keys(zip.files))if(!zip.files[k].dir)texts.push(await zip.file(k).async('string'))}
    else texts.push(new TextDecoder().decode(buf));
    let V={},name='',skipped=0,total=0;
    for(const t of texts){const ini=parseIni(t);if(ini.general&&ini.general.name&&!name)name=ini.general.name;const vals=ini.values||{};for(const [k,v] of Object.entries(vals)){total++;if(String(v).startsWith('='))skipped++;if(!(k in V)||!String(v).startsWith('='))V[k]=v}}
    if(!total)throw new Error('empty');
    const c=curaToCfg(V),n=Object.keys(c).length;if(!n)throw new Error('none');
    const pname=`Cura · ${name||file.name.replace(/\.[^.]+$/,'')}`,p=getProfiles();p[pname]={...pickCfg(),...c};setProfiles(p);buildProfilesUI();$('profSel').value=pname;loadProfile(p[pname]);
    toast(`${tr('پروفایل Cura وارد شد')}: ${fa(n)} ${tr('تنظیم')}${skipped?` · ${fa(skipped)} ${tr('فرمول نادیده گرفته شد')}`:''}`,5000)}
  catch(e){console.error(e);toast(tr('این فایل پروفایل Cura خوانده نشد.'))}}
$('curaImport').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importCuraProfile(f)};

// ================= CLEARANCE DETECTION =================
// Slices the model (at its original size) at several heights and closes the outlines with growing offsets:
// the first offset that joins two separate bodies — a pin inside a hole, two puzzle pieces side by side — gives the designed gap.
async function detectClearance(o){const src=o.piece?{pb:o.pb,masks:o.masks,zOff:o.zOff,size:o.msize||o.size}:{pb:o.baked,masks:[],zOff:0,size:o.msize||o.size};
  const k=((o.scale[0]+o.scale[1])/2)/(o.s0||1),H=src.size[2],zs=[];for(let i=1;i<=9;i++)zs.push(src.zOff+H*i/10);
  const raw=await sliceMesh(src.pb,zs,()=>{},()=>{},false),secs=raw.map((p,i)=>src.masks.length?applyMasks(p,src.masks,zs[i],0,0):p);
  // smallest distance between two separate bodies in the same slice (vertex → edge), measured at the current size
  let best=Infinity;const segD=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1,t=clamp(((px-ax)*dx+(py-ay)*dy)/L);return Math.hypot(ax+t*dx-px,ay+t*dy-py)};
  for(const s of secs){if(!s.length)continue;const parts=cParts(s);if(parts.length<2||parts.length>60)continue;
    const pts=parts.map(pp=>{const all=[].concat(...pp),st=Math.max(1,Math.ceil(all.length/500));return all.filter((_,i)=>i%st===0).map(q=>[q.X/SC,q.Y/SC])});
    const box=parts.map(pp=>CL.JS.BoundsOfPaths(pp));
    for(let a1=0;a1<parts.length;a1++)for(let b1=0;b1<parts.length;b1++){if(a1===b1)continue;const A=box[a1],B=box[b1],lim=1.3*SC;
      if(A.left>B.right+lim||B.left>A.right+lim||A.top>B.bottom+lim||B.top>A.bottom+lim)continue;
      for(const [px,py] of pts[a1])for(const path of parts[b1]){const n=path.length;for(let i=0;i<n;i++){const u=path[i],v=path[(i+1)%n];const d=segD(px,py,u.X/SC,u.Y/SC,v.X/SC,v.Y/SC);if(d<best)best=d}}}}
  best=best/k;if(!(best>=.03&&best<=1.2))best=Infinity;
  return isFinite(best)?Math.round(best*20)/20:null}
function tolDefault(){const base={pla:.2,plap:.2,petg:.25,abs:.25,tpu:.3}[cfg.mat]||.2;return +(base+((cfg.nozzle||.4)>=.6?.05:0)).toFixed(2)}
function setTolHint(msg){document.querySelectorAll('.tolhint').forEach(p=>p.textContent=msg)}
async function autoTol(silent){const list=sel?[selMat()]:objs;if(!list.length||!list[0]){if(!silent)toast(tr('اول مدل را اضافه کنید.'));return null}
  let found=null;for(const o of list){const g=await detectClearance(o);if(g!=null)found=found==null?g:Math.min(found,g)}
  if(found!=null){cfg.tolGap=found;cfg.keepTol=true;setTolHint(`${tr('در خود مدل فاصلهٔ اتصال')} ${fa(found,2)} mm ${tr('پیدا شد و همین تنظیم شد. با تغییر مقیاس، این فاصله ثابت می‌ماند.')}`)}
  else{const d=tolDefault();cfg.tolGap=d;cfg.keepTol=true;setTolHint(`${tr('در این مدل دو قطعهٔ جفت‌شونده کنار هم پیدا نشد. مقدار استاندارد برای')} ${MATS[cfg.mat].n} ${tr('و این نازل:')} ${fa(d,2)} mm. ${tr('راهنما: ۰٫۱ جذب‌شونده و سفت، ۰٫۲ کشویی و روان، ۰٫۳ تا ۰٫۴ آزاد و لق.')}`)}
  saveCfg();syncInputs();refreshObjs();changed();return found}
document.querySelectorAll('[data-tol=auto]').forEach(btn=>btn.onclick=()=>{btn.disabled=true;autoTol().finally(()=>btn.disabled=false)});
setTolHint(tr('لقی هر طرف یعنی فاصلهٔ بین سطح پین و دیوارهٔ سوراخ (یا بین دو قطعهٔ پازل). وقتی هر دو قطعه با یک نسبت کوچک یا بزرگ شوند، همین فاصله حفظ می‌شود.'));
</script>
