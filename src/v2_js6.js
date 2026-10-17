<script>
// ================= PRINTERS =================
const G_MARLIN=`M140 S{bed}
M104 S{nozzle}
G28 ; home all axes
M420 S1 ; load saved bed mesh (ignored if none)
M190 S{bed}
M109 S{nozzle}
M82
G92 E0
G1 Z2.0 F3000
G1 X0.8 Y20 Z0.28 F5000.0 ; purge line
G1 X0.8 Y{purge} Z0.28 F1500.0 E15
G1 X1.2 Y{purge} Z0.28 F5000.0
G1 X1.2 Y20 Z0.28 F1500.0 E30
G92 E0
G1 Z2.0 F3000`;
const G_KLIPPER_CR=`START_PRINT EXTRUDER_TEMP={nozzle} BED_TEMP={bed}
M82
G92 E0`;
const G_KLIPPER=`M140 S{bed}
M104 S{nozzle}
G28
M190 S{bed}
M109 S{nozzle}
M82
G92 E0
G1 Z2.0 F3000
G1 X1 Y20 Z0.28 F5000
G1 X1 Y{purge} Z0.28 F1500 E15
G92 E0
G1 Z2.0 F3000`;
const G_PRUSA=`M140 S{bed}
M104 S{nozzle}
G28 ; home
G29 ; mesh bed leveling
M190 S{bed}
M109 S{nozzle}
M82
G92 E0
G1 Z0.3 F720
G1 X60 Y-3 F1000 ; go outside print area
G1 E8 F1700
G1 X100 E12.5 F1000
G92 E0`;
const E_GENERIC=`G91
G1 E-2 F2700
G1 E-2 Z0.2 F2400
G1 X5 Y5 F3000
G1 Z10
G90
G1 X0 Y{depth} ; present print
M106 S0
M104 S0
M140 S0
M84 X Y E`;
const BAMBU_NOTE='پرینترهای Bambu Lab فایل .gcode.3mf ساخته‌شده در Bambu Studio می‌خواهند. این G-code عمومی است؛ از آن برای تخمین زمان، فیلامنت و قیمت استفاده کنید.';
const PRINTERS=[
  ['Creality','ender3v3se','Ender-3 V3 SE',220,220,250,'marlin',2500,250,START_G,END_G],
  ['Creality','ender3v3ke','Ender-3 V3 KE',220,220,240,'klipper',8000,500,G_KLIPPER_CR,'END_PRINT'],
  ['Creality','ender3s1','Ender-3 S1',220,220,270,'marlin',1000,150,G_MARLIN,E_GENERIC],
  ['Creality','k1c','K1C',220,220,250,'klipper',20000,600,G_KLIPPER_CR,'END_PRINT'],
  ['Creality','k1max','K1 Max',300,300,300,'klipper',20000,600,G_KLIPPER_CR,'END_PRINT'],
  ['Creality','ender3v3','Ender-3 V3',220,220,250,'klipper',20000,600,G_KLIPPER_CR,'END_PRINT'],
  ['Creality','k2plus','K2 Plus',350,350,350,'klipper',30000,600,G_KLIPPER_CR,'END_PRINT'],
  ['Bambu Lab','a1mini','A1 mini',180,180,180,'bambu',10000,500,G_MARLIN,E_GENERIC,BAMBU_NOTE],
  ['Bambu Lab','a1','A1',256,256,256,'bambu',10000,500,G_MARLIN,E_GENERIC,BAMBU_NOTE],
  ['Bambu Lab','p1s','P1S',256,256,256,'bambu',20000,500,G_MARLIN,E_GENERIC,BAMBU_NOTE],
  ['Bambu Lab','x1c','X1 Carbon',256,256,256,'bambu',20000,500,G_MARLIN,E_GENERIC,BAMBU_NOTE],
  ['Bambu Lab','p1p','P1P',256,256,256,'bambu',20000,500,G_MARLIN,E_GENERIC,BAMBU_NOTE],
  ['Bambu Lab','h2d','H2D',350,320,325,'bambu',20000,600,G_MARLIN,E_GENERIC,BAMBU_NOTE],
  ['Elegoo','n4pro','Neptune 4 Pro',225,225,265,'klipper',10000,500,G_KLIPPER,E_GENERIC],
  ['Elegoo','n4max','Neptune 4 Max',420,420,480,'klipper',5000,500,G_KLIPPER,E_GENERIC],
  ['Anycubic','kobra2neo','Kobra 2 Neo',220,220,250,'marlin',2500,250,G_MARLIN,E_GENERIC],
  ['Anycubic','kobra3','Kobra 3',250,250,260,'klipper',10000,500,G_KLIPPER,E_GENERIC],
].map(([brand,id,name,x,y,z,flavor,acc,vmax,startG,endG,note])=>({brand,id,name,x,y,z,flavor,acc,vmax,startG,endG,note}));
function curPrinter(){if(cfg.printer==='custom')return {brand:'',id:'custom',name:cfg.cName||tr('پرینتر سفارشی'),x:cfg.bx,y:cfg.by,z:cfg.bz,flavor:cfg.cFlavor,acc:cfg.cAcc,vmax:cfg.cVmax};
  return PRINTERS.find(p=>p.id===cfg.printer)||PRINTERS[0]}
function buildPrinterSelect(){const sel=$('printerSel');const brands=[...new Set(PRINTERS.map(p=>p.brand))];
  sel.innerHTML=brands.map(b=>`<optgroup label="${b}">${PRINTERS.filter(p=>p.brand===b).map(p=>`<option value="${p.id}">${b} ${p.name}</option>`).join('')}</optgroup>`).join('')+`<option value="custom">${tr('پرینتر سفارشی…')}</option>`;
  sel.value=cfg.printer}
function applyPrinter(reset){const p=curPrinter();Object.assign(BED,{x:+p.x||220,y:+p.y||220,z:+p.z||250});
  if(reset){if(p.id!=='custom'){cfg.startG=p.startG.replace(/\{purge\}/g,Math.round(Math.min(145,BED.y-30)));cfg.endG=p.endG}
    const prof=PROFILES[cfg.prof];if(prof)Object.assign(cfg,prof);cfg.acc=Math.min(cfg.acc,p.acc||cfg.acc);
    for(const k of ['vOuter','vInner','vInfill','vSkin','vSupport','vIface','vTravel'])cfg[k]=Math.min(cfg[k],p.vmax||cfg[k]);
    cfg.lw=+(cfg.nozzle||0.4).toFixed(2);saveCfg();syncInputs()}
  {const src=p.brand&&BRAND_IMG[p.brand]?BRAND_IMG[p.brand].src:'';for(const id of ['printerLogo']){$(id).hidden=!src;if(src){$(id).src=src;$(id).alt=p.brand}}}
  $('printerName').textContent=`${p.brand?p.brand+' ':''}${p.name}`;$('bedDims').textContent=`${BED.x}×${BED.y}×${BED.z}`;$('nozName').textContent=(cfg.nozzle||0.4).toFixed(1);$('fwName').textContent=p.flavor==='klipper'?'Klipper':p.flavor==='bambu'?'Bambu':'Marlin';
  $('printerNote').hidden=!p.note;$('printerNote').textContent=p.note?tr(p.note):'';$('customPrinter').hidden=cfg.printer!=='custom';
  plate.geometry.dispose();plate.geometry=new THREE.BoxGeometry(BED.x,4,BED.y);
  volBox.geometry.dispose();volBox.geometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(BED.x,BED.z,BED.y));volBox.position.y=BED.z/2;
  const m=Math.max(BED.x,BED.y)/2+60;Object.assign(key.shadow.camera,{left:-m,right:m,top:m,bottom:-m});key.shadow.camera.updateProjectionMatrix();
  paintPlate();objs.forEach(placeMesh);refreshObjs()}
$('printerSel').onchange=()=>{cfg.printer=$('printerSel').value;applyPrinter(true);defaultView();changed()};
['bx','by','bz','nozzle','cAcc','cVmax','cFlavor','cName'].forEach(k=>{const el=document.querySelector(`[data-k="${k}"]`);if(el)el.addEventListener('change',()=>setTimeout(()=>{applyPrinter(k==='nozzle');changed()},0))});
const printerShort=()=>{const p=curPrinter();return (p.id==='ender3v3se'?'CE3V3SE':p.name.replace(/[^A-Za-z0-9]+/g,'')).slice(0,12)||'PRINT'};

// ================= ACCENT & MODEL COLOUR =================
// page background only — bed, panels and buttons keep their colours
// page background and button colour; the bed and panels keep their colours
const BGS=[['white','#ffffff','#0e1013'],['default','#f4f5f7','#121418'],['sky','#e8f1fb','#0c131c'],['mint','#e7f5ee','#0b1612'],['lavender','#efecfa','#13111c'],['rose','#fbecf0','#1b0f14'],['sand','#f6f0e5','#17130d']];
const ACCS=[['orange','#FF7A2F'],['blue','#4f8cff'],['green','#2fbf71'],['purple','#a77bff'],['pink','#ff5c9a'],['teal','#22b8c7'],['black','#16181d']];
let bgKey='white',accKey='orange';try{bgKey=localStorage.getItem('slicer-bg')||'white';accKey=localStorage.getItem('slicer-acc')||'orange'}catch(e){}
function applyBg(){const b=BGS.find(x=>x[0]===bgKey)||BGS[0],dark=curTheme()==='dark';document.documentElement.style.setProperty('--bg',dark?b[2]:b[1]);
  if(accKey==='orange')delete document.documentElement.dataset.accent;else document.documentElement.dataset.accent=accKey}
function buildAccents(){const sw=(k,st,attr,on)=>`<button type="button" ${attr}="${k}" style="background:${st}" aria-label="${k}" aria-pressed="${on}"></button>`;
  $('accents').innerHTML=`<div class="acch">${tr('پس‌زمینه')}</div><div class="accrow">${BGS.map(([k,l,d])=>sw(k,`linear-gradient(135deg,${l} 50%,${d} 50%)`,'data-bg',bgKey===k)).join('')}</div><div class="acch">${tr('رنگ دکمه‌ها')}</div><div class="accrow">${ACCS.map(([k,c])=>sw(k,c,'data-acc',accKey===k)).join('')}</div>`;
  $('accents').querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{bgKey=b.dataset.bg;try{localStorage.setItem('slicer-bg',bgKey)}catch(e){}buildAccents();applyBg()});
  $('accents').querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{accKey=b.dataset.acc;try{localStorage.setItem('slicer-acc',accKey)}catch(e){}buildAccents();applyBg();applyTheme();refreshObjs()});applyBg()}
$('accBtn').onclick=e=>{e.stopPropagation();const open=$('accents').hidden;$('accents').hidden=!open;$('accBtn').setAttribute('aria-expanded',open)};
document.addEventListener('click',e=>{if(!e.target.closest('.accwrap')){$('accents').hidden=true;$('accBtn').setAttribute('aria-expanded',false)}});

// ================= CAMERA PRESETS =================
const VIEWS={iso:[-0.55,1.05],front:[0,Math.PI/2-.001],back:[Math.PI,Math.PI/2-.001],left:[-Math.PI/2,Math.PI/2-.001],right:[Math.PI/2,Math.PI/2-.001],top:[0,.001],bottom:[0,Math.PI-.001]};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{defaultView();const [th,ph]=VIEWS[b.dataset.view];view.th=th;view.ph=ph;if(b.dataset.view==='bottom'||b.dataset.view==='top')view.ty=objs.length?sceneBounds().z/2:20});

// ================= PIECES: SPLIT, CONNECTORS, CROP, BASE =================
// A piece shares its parent's baked mesh and adds masks applied to every sliced layer (parent-local mm):
// {t:'v'} vertical cut along any line with a puzzle/dovetail/key profile, {t:'z'} horizontal cut with pegs,
// {t:'hole'} horizontal dowel hole across a vertical cut, {t:'vhole'} vertical dowel holes, {t:'box'} crop box.
const rectPath=(x0,y0,x1,y1)=>[{X:Math.round(x0*SC),Y:Math.round(y0*SC)},{X:Math.round(x1*SC),Y:Math.round(y0*SC)},{X:Math.round(x1*SC),Y:Math.round(y1*SC)},{X:Math.round(x0*SC),Y:Math.round(y1*SC)}];
const circlePath=(cx,cy,r,n=40)=>{const p=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;p.push({X:Math.round((cx+r*Math.cos(a))*SC),Y:Math.round((cy+r*Math.sin(a))*SC)})}return p};
const uvPath=(C,t,pts)=>pts.map(([u,v])=>({X:Math.round((C[0]-t[1]*u+t[0]*v)*SC),Y:Math.round((C[1]+t[0]*u+t[1]*v)*SC)}));
function tpaths(P,dx,dy){if(!dx&&!dy)return P;const X=Math.round(dx*SC),Y=Math.round(dy*SC);return P.map(p=>p.map(q=>({X:q.X+X,Y:q.Y+Y})))}
function applyMasks(paths,masks,zl,dx,dy){let r=paths;
  for(const m of masks){if(!r.length)return r;
    if(m.t==='v'){const P=tpaths(m.poly,dx,dy);r=m.keep==='in'?cInter(r,P):cDiff(r,P)}
    else if(m.t==='box'){if(zl<m.z0||zl>m.z1)return [];r=cInter(r,tpaths([rectPath(m.x0,m.y0,m.x1,m.y1)],dx,dy))}
    else if(m.t==='z'){if(m.keep==='below'){if(zl<m.c)continue;if(m.pegs.length&&zl<m.c+m.pegH){r=cInter(r,tpaths(m.pegs,dx,dy));continue}return []}
      else{if(zl<m.c)return [];if(m.pegs.length&&zl<m.c+m.pegH)r=cDiff(r,tpaths(m.pegs,dx,dy))}}
    else if(m.t==='hole'){const d=zl-m.zc;if(Math.abs(d)<m.r){const w=Math.sqrt(m.r*m.r-d*d);r=cDiff(r,tpaths([uvPath(m.C,m.dir,[[-m.d,m.v-w],[m.d,m.v-w],[m.d,m.v+w],[-m.d,m.v+w]])],dx,dy))}}
    else if(m.t==='vhole'){if(zl>=m.z0&&zl<=m.z1)r=cDiff(r,tpaths(m.pegs,dx,dy))}}
  return r}
// region on the "in" side of the cut line (u < 0), with connector tabs alternating sides
function cutProfile(C,t,vs,style,size){const BIG=3000;let P=[uvPath(C,t,[[-BIG,-BIG],[0,-BIG],[0,BIG],[-BIG,BIG]])];
  vs.forEach((v,k)=>{const d=k%2?-1:1;let tab=null;
    if(style==='jigsaw'){const nw=size*.42,nl=size*.32,r=size*.36,cu=d*(nl+r*.85),head=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;head.push([cu+r*Math.cos(a),v+r*Math.sin(a)])}
      tab=cUnion([uvPath(C,t,[[-d*.6,v-nw/2],[d*(nl+r*.5),v-nw/2],[d*(nl+r*.5),v+nw/2],[-d*.6,v+nw/2]]),uvPath(C,t,head)])}
    else if(style==='dovetail')tab=cUnion([uvPath(C,t,[[-d*.6,v-size*.28],[d*size*.55,v-size*.48],[d*size*.55,v+size*.48],[-d*.6,v+size*.28]])]);
    else if(style==='key')tab=cUnion([uvPath(C,t,[[-d*.6,v-size*.4],[d*size*.6,v-size*.4],[d*size*.6,v+size*.4],[-d*.6,v+size*.4]])]);
    if(tab)P=d>0?cUnion(P,tab):cDiff(P,tab)});
  return cUnion(P)}
function asPieceSrc(o){return o.piece?o:{file:o.file,piece:true,pb:o.baked,masks:[],off:[0,0],zOff:0,size:o.msize||o.size,px:o.px,py:o.py,name:o.name,rot:o.rot,scale:o.scale,s0:o.s0,base:o.base}}
async function sections(src,zs){const raw=await sliceMesh(src.pb,zs,()=>{},()=>{});return raw.map((p,i)=>applyMasks(p,src.masks,zs[i],0,0))}
// the cut face as intervals along the line for a stack of heights → where connectors fit
async function cutFace(src,C,t,nz=24){const H=src.size[2],zs=[];for(let i=0;i<nz;i++)zs.push(src.zOff+(i+.5)*H/nz);
  const secs=await sections(src,zs),strip=[uvPath(C,t,[[-.05,-3000],[.05,-3000],[.05,3000],[-.05,3000]])];
  return {zs,iv:secs.map(s=>{if(!s.length)return [];return cInter(s,strip).map(p=>{const vs=p.map(q=>(q.X/SC-C[0])*t[0]+(q.Y/SC-C[1])*t[1]);return [Math.min(...vs),Math.max(...vs)]})})}}
function pickSpots(cands,n,minD){if(!cands.length)return [];const cx=cands.reduce((s,p)=>s+p[0],0)/cands.length,cy=cands.reduce((s,p)=>s+p[1],0)/cands.length;
  const ch=[cands.reduce((b,p)=>Math.hypot(p[0]-cx,p[1]-cy)<Math.hypot(b[0]-cx,b[1]-cy)?p:b,cands[0])];
  while(ch.length<n){let best=null,bd=-1;for(const p of cands){const d=Math.min(...ch.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));if(d>bd){bd=d;best=p}}if(bd<minD)break;ch.push(best)}return ch}
async function pegSpots(src,c,r,count){const s=await sections(src,[c-.15,c+.15]);const reg=cInter(s[0],s[1]),E=cOff(reg,-(r+1.5));if(!E.length)return [];
  const bd=CL.JS.BoundsOfPaths(E),pts=[],st=Math.max(1,r/2)*SC;
  for(let x=bd.left;x<=bd.right;x+=st)for(let y=bd.top;y<=bd.bottom;y+=st){let w=0;for(const p of E)if(CL.Clipper.PointInPolygon({X:Math.round(x),Y:Math.round(y)},p))w+=CL.Clipper.Orientation(p)?1:-1;if(w>0)pts.push([x/SC,y/SC])}
  return pickSpots(pts,count||clamp(Math.round(areaOf(reg)/600),1,4),2*r+2)}
function slabGeo(L,z0s,z1s,ox,oy,zb){const pos=[],V=(x,y,z)=>pos.push(x/SC-ox,z-zb,-(y/SC-oy));
  const cap=(paths,z,up)=>{for(const part of cParts(paths)){const cont=part[0].map(q=>new THREE.Vector2(q.X,q.Y)),holes=part.slice(1).map(h=>h.map(q=>new THREE.Vector2(q.X,q.Y))),all=cont.concat(...holes);
    let tris;try{tris=THREE.ShapeUtils.triangulateShape(cont,holes)}catch(e){continue}
    for(const [a,b2,c] of tris){const A=all[a],B=all[b2],Cc=all[c],ccw=(B.x-A.x)*(Cc.y-A.y)-(B.y-A.y)*(Cc.x-A.x)>0;
      if(ccw===up){V(A.x,A.y,z);V(B.x,B.y,z);V(Cc.x,Cc.y,z)}else{V(A.x,A.y,z);V(Cc.x,Cc.y,z);V(B.x,B.y,z)}}}};
  const ne=L.map(p=>p.length>0),first=ne.indexOf(true),last=ne.lastIndexOf(true);
  for(let k=first;k>=0&&k<=last;k++){const ps=L[k];if(!ps.length)continue;const z0=z0s[k],z1=z1s[k];
    for(const p of ps){const n=p.length;for(let j=0;j<n;j++){const a=p[j],c=p[(j+1)%n];V(a.X,a.Y,z0);V(c.X,c.Y,z0);V(c.X,c.Y,z1);V(a.X,a.Y,z0);V(c.X,c.Y,z1);V(a.X,a.Y,z1)}}
    cap(k===last||!L[k+1].length?ps:cDiff(ps,L[k+1]),z1,true);cap(k===first||!L[k-1].length?ps:cDiff(ps,L[k-1]),z0,false)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
  g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1),3));return g}
async function buildPieceGeo(o){const b=o.pb;let H=0;for(let i=2;i<b.length;i+=3)if(b[i]>H)H=b[i];
  let zLo=0,zHi=H;for(const m of o.masks){if(m.t==='z'){if(m.keep==='above')zLo=Math.max(zLo,m.c);else zHi=Math.min(zHi,m.c+(m.pegs.length?m.pegH:0))}if(m.t==='box'){zLo=Math.max(zLo,m.z0);zHi=Math.min(zHi,m.z1)}}
  if(zHi-zLo<0.2)return false;
  const dz=Math.max(0.25,(zHi-zLo)/180),mids=[];for(let z=zLo+dz/2;z<zHi;z+=dz)mids.push(z);
  const raw=await sliceMesh(b,mids,()=>{},()=>{}),L=raw.map((p,i)=>applyMasks(p,o.masks,mids[i],0,0));
  let x0=1e12,x1=-1e12,y0=1e12,y1=-1e12,vol=0,any=false;
  L.forEach(ps=>{if(!ps.length)return;any=true;vol+=areaOf(ps)*dz;for(const p of ps)for(const q of p){if(q.X<x0)x0=q.X;if(q.X>x1)x1=q.X;if(q.Y<y0)y0=q.Y;if(q.Y>y1)y1=q.Y}});
  if(!any)return false;
  o.off=[(x0+x1)/2/SC,(y0+y1)/2/SC];o.zOff=zLo;o.msize=[(x1-x0)/SC,(y1-y0)/SC,zHi-zLo];o.size=o.msize.slice();o.vol=vol;
  o.geo=slabGeo(L,mids.map(m=>Math.max(zLo,m-dz/2)),mids.map(m=>Math.min(zHi,m+dz/2)),o.off[0],o.off[1],zLo);return true}
function pieceFrom(src,masks,name){return {id:++objSeq,file:src.file,piece:true,pb:src.pb,masks,name,px:src.px,py:src.py,rot:src.rot,scale:src.scale.slice(),s0:src.s0,base:src.base,off:[0,0],zOff:0,size:[1,1,1]}}
function mountPiece(o){o.mesh=new THREE.Mesh(o.geo,modelMaterial());o.mesh.castShadow=o.mesh.receiveShadow=true;o.mesh.userData.obj=o;scene.add(o.mesh);if(o.basePlate)buildBaseMesh(o);placeMesh(o);objs.push(o)}
function dropObj(o){scene.remove(o.mesh);if(!o.piece)o.mesh.geometry.dispose();objs=objs.filter(x=>x!==o)}
function addPins(n,r,len){for(let i=0;i<n;i++)addObject(geoToZup(new THREE.CylinderGeometry(r,r,len,40)),tr('پین اتصال'),{noArrange:true,scale:[1,1,1]})}
function vcut(o,src){ // cut line in the piece's local frame: point C and unit direction t
  if(SPL.axis==='line'&&SPL.line){const dx=o.px-src.off[0],dy=o.py-src.off[1],L=SPL.line,C=[L.x0-dx,L.y0-dy],tx=L.x1-L.x0,ty=L.y1-L.y0,l=Math.hypot(tx,ty)||1;return {C,t:[tx/l,ty/l]}}
  const f=SPL.pos/100;if(SPL.axis==='y')return {C:[src.off[0],src.off[1]-src.size[1]/2+f*src.size[1]],t:[1,0]};
  return {C:[src.off[0]-src.size[0]/2+f*src.size[0],src.off[1]],t:[0,1]}}
async function splitObj(o){const src=asPieceSrc(o),{style,size,count,tol}=SPL;let mA=[],mB=[],pins=null,sep;
  if(SPL.axis==='z'){const c=src.zOff+SPL.pos/100*src.size[2],r=size/2;sep='z';
    let spots=style==='flat'?[]:await pegSpots(src,c,r,count);
    if(style==='pegs'||style==='sqpeg'){const shape=([x,y])=>style==='pegs'?circlePath(x,y,r):rectPath(x-r,y-r,x+r,y+r),pegs=spots.map(shape);
      mA=[{t:'z',c,keep:'below',pegs,pegH:size}];mB=[{t:'z',c,keep:'above',pegs:pegs.length?cOff(pegs,tol,JT.jtRound):[],pegH:size+.4}]}
    else{mA=[{t:'z',c,keep:'below',pegs:[],pegH:0}];mB=[{t:'z',c,keep:'above',pegs:[],pegH:0}];
      if(style==='dowel'&&spots.length){const holes=spots.map(([x,y])=>circlePath(x,y,r+tol/2)),d=size*1.5;mA.push({t:'vhole',pegs:holes,z0:c-d,z1:c+1});mB.push({t:'vhole',pegs:holes,z0:c-1,z1:c+d});pins=[spots.length,r,2*d-1]}}}
  else{const {C,t}=vcut(o,src),face=await cutFace(src,C,t),r=size/2;sep=[-t[1],t[0]];
    // span along the line covered by material on most heights
    const all=face.iv.flat();if(!all.length)return null;const lo=Math.min(...all.map(i=>i[0])),hi=Math.max(...all.map(i=>i[1]));
    const cover=v=>face.iv.filter(iv=>iv.some(([a,b])=>v>=a+r&&v<=b-r)).length/face.iv.length;
    const good=[];for(let v=lo;v<=hi;v+=Math.max(.5,size/4))if(cover(v)>.5)good.push(v);
    const n=count||Math.max(1,Math.floor(((good.length?good[good.length-1]-good[0]:0))/(size*2.6))+1);
    let vs=[];if(good.length){const g0=good[0],g1=good[good.length-1];for(let k=0;k<n;k++){const target=g0+(k+.5)*(g1-g0)/n;vs.push(good.reduce((b,v)=>Math.abs(v-target)<Math.abs(b-target)?v:b,good[0]))}}
    if(style==='dowel'){const cands=[];face.zs.forEach((z,i)=>{for(const [a,b] of face.iv[i])for(let v=a+r+1.5;v<=b-r-1.5;v+=Math.max(.5,r/2)){const ok=face.zs.every((z2,j)=>Math.abs(z2-z)>r+1.5||face.iv[j].some(([a2,b2])=>v>=a2+r+1&&v<=b2-r-1));if(ok)cands.push([v,z])}});
      const spots=pickSpots(cands,count||clamp(Math.round(cands.length/60),1,4),2*r+3),d=size*1.5,P=cutProfile(C,t,[],'flat',size);
      mA=[{t:'v',poly:P,keep:'in'}];mB=[{t:'v',poly:P,keep:'out'}];
      for(const [v,z] of spots){const h={t:'hole',C,dir:t,v,zc:z,r:r+tol/2,d};mA.push(h);mB.push(h)}if(spots.length)pins=[spots.length,r,2*d-1]}
    else{const P=cutProfile(C,t,style==='flat'?[]:vs,style,size),g=style==='flat'?0:tol/2;mA=[{t:'v',poly:g?cOff(P,-g,JT.jtRound):P,keep:'in'}];mB=[{t:'v',poly:g?cOff(P,g,JT.jtRound):P,keep:'out'}]}}
  const A=pieceFrom(src,[...src.masks,...mA],o.name+' A'),B=pieceFrom(src,[...src.masks,...mB],o.name+' B');
  const okA=await buildPieceGeo(A),okB=await buildPieceGeo(B);if(!okA||!okB)return null;
  for(const P of [A,B]){P.px=o.px+(P.off[0]-src.off[0]);P.py=o.py+(P.off[1]-src.off[1])}
  if(sep==='z'){B.px=A.px+A.size[0]/2+B.size[0]/2+8;B.py=A.py}else{A.px-=sep[0]*5;A.py-=sep[1]*5;B.px+=sep[0]*5;B.py+=sep[1]*5}
  dropObj(o);mountPiece(A);mountPiece(B);sel=A.id;if(pins)addPins(...pins);return [A,B]}
async function cropObj(o,f){const src=asPieceSrc(o),x0=src.off[0]-src.size[0]/2,y0=src.off[1]-src.size[1]/2;
  const m={t:'box',x0:x0+f.x0*src.size[0],x1:x0+f.x1*src.size[0],y0:y0+f.y0*src.size[1],y1:y0+f.y1*src.size[1],z0:src.zOff+f.z0*src.size[2],z1:src.zOff+f.z1*src.size[2]};
  const P=pieceFrom(src,[...src.masks,m],o.name+' ✂');if(!await buildPieceGeo(P))return null;
  P.px=o.px+(P.off[0]-src.off[0]);P.py=o.py+(P.off[1]-src.off[1]);dropObj(o);mountPiece(P);sel=P.id;return P}
async function splitToFit(o){const m=2*Math.min(margin(),12)+4;let todo=[o],guard=0;const keep={...SPL};
  while(todo.length&&guard++<40){const p=todo.shift();const ax=p.size[0]>BED.x-m?'x':p.size[1]>BED.y-m?'y':p.size[2]>BED.z?'z':null;if(!ax)continue;
    Object.assign(SPL,{axis:ax,pos:50,style:ax==='z'?'pegs':(['flat','dovetail','key'].includes(keep.style)?keep.style:'jigsaw'),count:0});sel=p.id;const r=await splitObj(p);if(r)todo.push(...r)}
  Object.assign(SPL,keep);arrange();defaultView()}

// ---- base (pedestal) for figures: a slab under the model, printed as part of the same object ----
async function makeBase(o,spec){const src=asPieceSrc(o),z0=src.zOff,H=src.size[2],secs=await sections(src,[z0+.2,z0+Math.min(2,H*.3)]),reg=cUnion(secs[0],secs[1]),pts=[];
  for(const p of reg)for(const q of p)pts.push([q.X/SC,q.Y/SC]);if(!pts.length)return false;
  const hull=(()=>{const P=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o2,a,b)=>(a[0]-o2[0])*(b[1]-o2[1])-(a[1]-o2[1])*(b[0]-o2[0]),lo=[],hi=[];for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}for(let i=P.length-1;i>=0;i--){const p=P[i];while(hi.length>=2&&cr(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p)}return lo.slice(0,-1).concat(hi.slice(0,-1))})();
  const [cx,cy]=src.off,R=Math.max(...hull.map(([x,y])=>Math.hypot(x-cx,y-cy)))+spec.margin,m=spec.margin;let poly;
  if(spec.shape==='circle')poly=[circlePath(cx,cy,R,120)];
  else if(spec.shape==='hex'){const Rh=R/Math.cos(Math.PI/6);poly=[[0,1,2,3,4,5].map(i=>{const a=Math.PI/6+i*Math.PI/3;return {X:Math.round((cx+Rh*Math.cos(a))*SC),Y:Math.round((cy+Rh*Math.sin(a))*SC)}})]}
  else if(spec.shape==='rect'){const xs=hull.map(p=>p[0]),ys=hull.map(p=>p[1]),cr=Math.min(6,m);poly=cOff([rectPath(Math.min(...xs)-m+cr,Math.min(...ys)-m+cr,Math.max(...xs)+m-cr,Math.max(...ys)+m-cr)],cr,JT.jtRound)}
  else poly=cOff([hull.map(([x,y])=>({X:Math.round(x*SC),Y:Math.round(y*SC)}))],m,JT.jtRound);
  o.basePlate={...spec,poly};buildBaseMesh(o);sizeWithBase(o);placeMesh(o);return true}
function baseLayer(bp,z){return z>bp.h?[]:bp.ch>0&&z>bp.h-bp.ch?cOff(bp.poly,-(z-(bp.h-bp.ch))):bp.poly}
function sizeWithBase(o){if(!o.msize)o.msize=o.size.slice();const s=o.msize.slice();if(o.basePlate){const b=CL.JS.BoundsOfPaths(o.basePlate.poly),c=o.piece?o.off:[0,0];
    s[0]=Math.max(s[0],2*Math.max(Math.abs(b.left/SC-c[0]),Math.abs(b.right/SC-c[0])));s[1]=Math.max(s[1],2*Math.max(Math.abs(b.top/SC-c[1]),Math.abs(b.bottom/SC-c[1])));s[2]+=o.basePlate.h}o.size=s}
function buildBaseMesh(o){if(o.baseMesh){o.mesh.remove(o.baseMesh);o.baseMesh.geometry.dispose();o.baseMesh=null}const bp=o.basePlate;if(!bp)return;
  const steps=bp.ch>0?6:1,z0s=[],z1s=[],L=[];const hb=bp.h-bp.ch;
  if(bp.ch>0){z0s.push(0);z1s.push(hb);L.push(bp.poly);for(let i=0;i<steps;i++){const a=hb+i*bp.ch/steps,b=hb+(i+1)*bp.ch/steps;z0s.push(a);z1s.push(b);L.push(cOff(bp.poly,-(a+b)/2+hb))}}
  else{z0s.push(0);z1s.push(bp.h);L.push(bp.poly)}
  const c=o.piece?o.off:[0,0],g=slabGeo(L,z0s,z1s,c[0],c[1],0);o.baseMesh=new THREE.Mesh(g,o.mesh.material);o.baseMesh.castShadow=o.baseMesh.receiveShadow=true;o.baseMesh.userData.obj=o;o.baseMesh.position.y=-bp.h;o.mesh.add(o.baseMesh)}
function removeBase(o){if(!o.basePlate)return;o.basePlate=null;if(o.baseMesh){o.mesh.remove(o.baseMesh);o.baseMesh.geometry.dispose();o.baseMesh=null}sizeWithBase(o);placeMesh(o)}

// ---- cut-line tool: drag on the bed (top view) to draw where to cut ----
let cutLine=null;const cutMat=new THREE.LineBasicMaterial({color:'#ff3b3b'});
function planeHit(e,h){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-h),p)?p:null}
function startCut(e){const o=selMat(),h=o?o.size[2]/2:0,p=planeHit(e,h);if(!p)return null;return {kind:'cut',h,x0:p.x+BED.x/2,y0:BED.y/2-p.z,x1:p.x+BED.x/2,y1:BED.y/2-p.z}}
function moveCut(d,e){const p=planeHit(e,d.h);if(!p)return;d.x1=p.x+BED.x/2;d.y1=BED.y/2-p.z;
  if(cutLine){scene.remove(cutLine);cutLine.geometry.dispose()}cutLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(d.x0-BED.x/2,d.h,BED.y/2-d.y0),new THREE.Vector3(d.x1-BED.x/2,d.h,BED.y/2-d.y1)]),cutMat);scene.add(cutLine)}
function endCut(d){if(cutLine){scene.remove(cutLine);cutLine.geometry.dispose();cutLine=null}if(Math.hypot(d.x1-d.x0,d.y1-d.y0)<3)return;
  SPL.line={x0:d.x0,y0:d.y0,x1:d.x1,y1:d.y1};SPL.axis='line';$('splitCard').open=true;spTab('split');buildSplitUI();setTool('move');toast(tr('خط برش ثبت شد؛ نوع اتصال را انتخاب کنید و «برش» را بزنید.'))}

// ---- split / crop / base panel ----
const SPL={axis:'x',pos:50,line:null,style:'jigsaw',size:8,count:0,tol:0.2,crop:{x0:0,x1:1,y0:0,y1:1,z0:0,z1:1},base:{shape:'circle',h:3,margin:5,ch:1}};
const STYLES={xy:[['flat','صاف'],['jigsaw','پازلی'],['dovetail','دم‌چلچله'],['key','زبانهٔ چهارگوش'],['dowel','دوبل (پین جدا)']],z:[['flat','صاف'],['pegs','پین گرد'],['sqpeg','پین چهارگوش'],['dowel','دوبل (پین جدا)']]};
function buildSplitUI(){const ax=SPL.axis==='z'?'z':'xy';if(!STYLES[ax].some(s=>s[0]===SPL.style))SPL.style=STYLES[ax][1][0];
  $('spStyle').innerHTML=STYLES[ax].map(([k,n])=>`<button type="button" data-v="${k}" aria-pressed="${SPL.style===k}">${tr(n)}</button>`).join('');
  document.querySelectorAll('#spAxis button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===SPL.axis));
  $('spPosRow').hidden=SPL.axis==='line';$('spLineRow').hidden=SPL.axis!=='line';$('spLineTxt').textContent=SPL.line?tr('خط رسم شده است.'):tr('هنوز خطی رسم نشده.');
  $('spPosO').textContent=SPL.pos+'%';$('spSizeL').textContent=tr(SPL.style==='dowel'||SPL.style==='pegs'?'قطر پین':'اندازهٔ زبانه');
  $('spOpts').hidden=SPL.style==='flat';
  document.querySelectorAll('#bsShape button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===SPL.base.shape));updateHelpers()}
function spTab(v){document.querySelectorAll('#spTabs button').forEach(x=>x.setAttribute('aria-selected',x.dataset.v===v));$('spSplit').hidden=v!=='split';$('spCrop').hidden=v!=='crop';$('spBase').hidden=v!=='base';updateHelpers()}
$('spTabs').onclick=e=>{const b=e.target.closest('button');if(b)spTab(b.dataset.v)};
$('spAxis').onclick=e=>{const b=e.target.closest('button');if(!b)return;SPL.axis=b.dataset.v;buildSplitUI()};
$('spStyle').onclick=e=>{const b=e.target.closest('button');if(!b)return;SPL.style=b.dataset.v;buildSplitUI()};
$('spDraw').onclick=()=>{setTool('cut')};
$('spPos').oninput=()=>{SPL.pos=+$('spPos').value;buildSplitUI()};
$('spSize').onchange=()=>{SPL.size=clamp(+$('spSize').value||8,2,40);updateHelpers()};
$('spCount').onchange=()=>{SPL.count=clamp(Math.round(+$('spCount').value)||0,0,12);updateHelpers()};
$('spTol').onchange=()=>{SPL.tol=clamp(+$('spTol').value||0,0,1)};
async function busyRun(label,fn){$('busy').hidden=false;$('busyT').textContent=tr(label);await nextFrame();try{await fn()}catch(e){console.error(e);toast(tr('عملیات ناموفق بود.'))}finally{$('busy').hidden=true;refreshObjs();updateHelpers();changed()}}
$('doSplit').onclick=()=>{const o=selMat();if(!o||!cutOn)return;if(SPL.axis==='line'&&!SPL.line)return toast(tr('اول با ابزار قیچی روی بستر خط بکشید.'));
  busyRun('در حال برش مدل…',async()=>{const r=await splitObj(o);toast(r?tr('مدل به دو قطعه تقسیم شد.'):tr('این برش قطعه‌ای نساخت؛ محل برش را عوض کنید.'));if(r&&objs.some(objOut))arrange()})};
$('splitFit').onclick=()=>{const o=selMat();if(!o)return;busyRun('در حال تقسیم برای جا شدن…',async()=>{if(!o.piece&&o.s0){o.scale=[o.s0,o.s0,o.s0];bakeObj(o)}await splitToFit(o);toast(tr('مدل به قطعه‌های قابل چاپ تقسیم شد.'))})};
['cx0','cx1','cy0','cy1','cz0','cz1'].forEach(id=>$(id).addEventListener('input',()=>{const k=id.slice(1),v=+$(id).value/100,C=SPL.crop;
  if(k.endsWith('0'))C[k]=Math.min(v,C[k[0]+'1']-.02);else C[k]=Math.max(v,C[k[0]+'0']+.02);$(id).value=Math.round(C[k]*100);updateHelpers()}));
$('doCrop').onclick=()=>{const o=selMat();if(!o)return;busyRun('در حال کراپ…',async()=>{const r=await cropObj(o,SPL.crop);toast(r?tr('بخش انتخاب‌شده جدا شد.'):tr('داخل جعبه چیزی از مدل نیست.'));SPL.crop={x0:0,x1:1,y0:0,y1:1,z0:0,z1:1};['cx0','cy0','cz0'].forEach(i=>$(i).value=0);['cx1','cy1','cz1'].forEach(i=>$(i).value=100)})};
$('bsShape').onclick=e=>{const b=e.target.closest('button');if(!b)return;SPL.base.shape=b.dataset.v;buildSplitUI()};
['bsH','bsM','bsC'].forEach(id=>$(id).addEventListener('change',()=>{SPL.base.h=clamp(+$('bsH').value||3,.6,30);SPL.base.margin=clamp(+$('bsM').value||0,0,60);SPL.base.ch=clamp(+$('bsC').value||0,0,SPL.base.h-.4)}));
$('doBase').onclick=()=>{const o=selMat();if(!o)return;busyRun('در حال ساخت پایه…',async()=>{const ok=await makeBase(o,{...SPL.base});toast(ok?tr('پایه اضافه شد.'):tr('کف مدل پیدا نشد.'))})};
$('noBase').onclick=()=>{const o=selMat();if(!o||!o.basePlate)return;removeBase(o);refreshObjs();changed()};
$('splitCard').addEventListener('toggle',updateHelpers);
// cutting is off until the user switches it on
let cutOn=false;try{cutOn=localStorage.getItem('slicer-cut')==='1'}catch(e){}
function applyCut(){$('cutOn').checked=cutOn;$('spSplitBody').hidden=!cutOn;$('spOff').hidden=cutOn;document.querySelector('#rail [data-tool=cut]').hidden=!cutOn;if(!cutOn&&tool==='cut')setTool('move');updateHelpers()}
$('cutOn').onchange=()=>{cutOn=$('cutOn').checked;try{localStorage.setItem('slicer-cut',cutOn?'1':'0')}catch(e){}if(cutOn){$('splitCard').open=true;spTab('split')}applyCut()};
// scene helpers: translucent cut plane with the connector profile, or the crop box
const helper=new THREE.Group();scene.add(helper);
const hpMat=new THREE.MeshBasicMaterial({color:'#FF7A2F',transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false});
const hlMat=new THREE.LineBasicMaterial({color:'#FF7A2F'});
function updateHelpers(){helper.children.slice().forEach(c=>{c.geometry.dispose();helper.remove(c)});const o=selMat();
  if(!o||!$('splitCard').open||mode!=='prep'||$('spBase').hidden===false)return;hpMat.color.set(css('--hot'));hlMat.color.set(css('--hot'));
  const src=asPieceSrc(o),sx=src.size[0],sy=src.size[1],sz=src.size[2],cx=o.px,cy=o.py,pad=4,lift=o.basePlate?o.basePlate.h:0,T=(x,y,z)=>new THREE.Vector3(x-BED.x/2,z,BED.y/2-y);
  if(!$('spSplit').hidden){if(!cutOn)return;
    if(SPL.axis==='z'){const g=new THREE.PlaneGeometry(sx+pad*2,sy+pad*2);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,hpMat);m.position.copy(T(cx,cy,lift+SPL.pos/100*sz));helper.add(m);return}
    if(SPL.axis==='line'&&!SPL.line)return;
    const {C,t}=vcut(o,src),dx=o.px-src.off[0],dy=o.py-src.off[1],R=Math.hypot(sx,sy)/2+pad,v0=(src.off[0]-C[0])*t[0]+(src.off[1]-C[1])*t[1];
    const a=[C[0]+t[0]*(v0-R)+dx,C[1]+t[1]*(v0-R)+dy],b=[C[0]+t[0]*(v0+R)+dx,C[1]+t[1]*(v0+R)+dy];
    const g=new THREE.BufferGeometry().setFromPoints([T(a[0],a[1],lift-pad),T(b[0],b[1],lift-pad),T(b[0],b[1],lift+sz+pad),T(a[0],a[1],lift-pad),T(b[0],b[1],lift+sz+pad),T(a[0],a[1],lift+sz+pad)]);
    helper.add(new THREE.Mesh(g,hpMat));
    if(['jigsaw','dovetail','key'].includes(SPL.style)){const n=SPL.count||Math.max(1,Math.floor(2*R*.8/(SPL.size*2.6))),vs=[];for(let k=0;k<n;k++)vs.push(v0-R*.8+(k+.5)*1.6*R/n);
      const P=cutProfile(C,t,vs,SPL.style,SPL.size),pts=[];for(const p of P)for(const q of p){const x=q.X/SC,y=q.Y/SC,u=-(x-C[0])*t[1]+(y-C[1])*t[0],v=(x-C[0])*t[0]+(y-C[1])*t[1];if(Math.abs(u)<SPL.size*1.5&&Math.abs(v-v0)<R)pts.push(T(x+dx,y+dy,lift+sz+.6))}
      if(pts.length>1)helper.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),hlMat))}}
  else if(!$('spCrop').hidden){const C=SPL.crop,x0=cx-sx/2+C.x0*sx,x1=cx-sx/2+C.x1*sx,y0=cy-sy/2+C.y0*sy,y1=cy-sy/2+C.y1*sy,z0=lift+C.z0*sz,z1=lift+C.z1*sz;
    const g=new THREE.BoxGeometry(x1-x0,z1-z0,y1-y0),b=new THREE.Mesh(g,hpMat);b.position.copy(T((x0+x1)/2,(y0+y1)/2,(z0+z1)/2));helper.add(b);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),hlMat);e.position.copy(b.position);helper.add(e)}}
</script>
<script>
// ================= FILE SAVE (artifact viewer → downloads capability, website → normal download) =================
async function saveFile(name,text,zipIt){let dl=null;try{if(window.claude&&typeof window.claude.use==='function')dl=await window.claude.use('downloads')}catch(e){}
  if(dl){try{let data=text,fn=name;if(zipIt){const z=new JSZip();z.file(name,text);data=await z.generateAsync({type:'blob',compression:'DEFLATE'});fn=name+'.zip'}
      await dl.save({filename:fn,data});return 'saved'}catch(e){return e&&e.code==='declined'?'declined':'failed'}}
  if(window.claude)return 'failed';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);return 'direct'}

// ================= CONFIG PROFILES =================
const PROF_SKIP=new Set([...PRICE_KEYS]);
const getProfiles=()=>{try{return JSON.parse(localStorage.getItem('slicer-profiles')||'{}')}catch(e){return {}}};
const setProfiles=p=>{try{localStorage.setItem('slicer-profiles',JSON.stringify(p))}catch(e){}};
const pickCfg=()=>Object.fromEntries(Object.entries(cfg).filter(([k])=>!PROF_SKIP.has(k)));
const escH=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function buildProfilesUI(){const p=getProfiles(),names=Object.keys(p);$('profSel').innerHTML=`<option value="">${tr('پروفایل‌های ذخیره‌شده')} (${fa(names.length)})</option>`+names.map(n=>`<option value="${escH(n)}">${escH(n)}</option>`).join('')}
function loadProfile(data){const keep={};PROF_SKIP.forEach(k=>keep[k]=cfg[k]);cfg={...DEF,...data,...keep};saveCfg();buildPrinterSelect();applyPrinter(false);syncInputs();objs.forEach(o=>o.mesh.material.color.set(modelCol()));changed()}
$('profSave').onclick=()=>{const n=$('profName').value.trim()||`${curPrinter().name} · ${cfg.lh}mm · ${MATS[cfg.mat].n}`;const p=getProfiles();p[n]=pickCfg();setProfiles(p);buildProfilesUI();$('profSel').value=n;$('profName').value='';toast(tr('پروفایل ذخیره شد.'))};
$('profSel').onchange=()=>{const n=$('profSel').value;if(!n)return;const p=getProfiles()[n];if(p){loadProfile(p);toast(tr('پروفایل بارگذاری شد.'))}};
$('profDel').onclick=()=>{const n=$('profSel').value;if(!n)return;const p=getProfiles();delete p[n];setProfiles(p);buildProfilesUI();toast(tr('پروفایل حذف شد.'))};
$('profExport').onclick=async()=>{const n=$('profSel').value,all=getProfiles(),data=n?{[n]:all[n]}:(Object.keys(all).length?all:{[tr('تنظیمات فعلی')]:pickCfg()});
  const r=await saveFile('benchy-slicer-profiles.json',JSON.stringify({benchySlicer:1,profiles:data},null,2),false);toast(r==='declined'?tr('ذخیره لغو شد.'):r==='failed'?tr('ذخیره در این نما ممکن نشد. فایل HTML را روی سیستم باز کنید.'):tr('فایل پروفایل ذخیره شد.'))};
$('profImport').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const j=JSON.parse(await f.text()),inc=j.profiles||{[f.name.replace(/\.json$/i,'')]:j};const p=getProfiles();let n=0;
    for(const [k,v] of Object.entries(inc))if(v&&typeof v==='object'){p[k]=Object.fromEntries(Object.entries(v).filter(([kk])=>kk in DEF&&!PROF_SKIP.has(kk)));n++}
    setProfiles(p);buildProfilesUI();toast(`${fa(n)} ${tr('پروفایل وارد شد.')}`)}catch(err){toast(tr('فایل پروفایل معتبر نیست.'))}};
</script>
