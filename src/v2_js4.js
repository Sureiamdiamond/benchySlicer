<script>
// ================= SLICER ENGINE =================
// Real slicing: mesh → closed outlines per layer → walls (polygon offsets) → top/bottom skin → infill → supports → toolpaths → Marlin G-code.
const SC=1000,CL=ClipperLib,PFT=CL.PolyFillType,CTY=CL.ClipType,JT=CL.JoinType;
const TYPES=['WALL-OUTER','WALL-INNER','SKIN','FILL','SUPPORT','SUPPORT-INTERFACE','SKIRT'];
const TCOL=['--t-outer','--t-inner','--t-skin','--t-fill','--t-sup','--t-iface','--t-skirt'];
const TNAME=['دیوارهٔ بیرونی','دیوارهٔ داخلی','سطح بالا و پایین','پرکننده','ساپورت','رابط ساپورت','اسکرت، بریم، رافت'];
const ABORT={abort:true};
function cOff(paths,d,join=JT.jtMiter){if(!paths||!paths.length)return [];const co=new CL.ClipperOffset(2,40);co.AddPaths(paths,join,CL.EndType.etClosedPolygon);const out=new CL.Paths();co.Execute(out,d*SC);return out}
function cBool(type,a,b){const c=new CL.Clipper();if(a&&a.length)c.AddPaths(a,CL.PolyType.ptSubject,true);if(b&&b.length)c.AddPaths(b,CL.PolyType.ptClip,true);const out=new CL.Paths();c.Execute(type,out,PFT.pftNonZero,PFT.pftNonZero);return out}
const cUnion=(a,b)=>cBool(CTY.ctUnion,a,b),cInter=(a,b)=>(!a.length||!b.length)?[]:cBool(CTY.ctIntersection,a,b),cDiff=(a,b)=>(!a.length)?[]:(!b||!b.length)?a:cBool(CTY.ctDifference,a,b);
function cClipLines(lines,region){if(!lines.length||!region.length)return [];const c=new CL.Clipper();c.AddPaths(lines,CL.PolyType.ptSubject,false);c.AddPaths(region,CL.PolyType.ptClip,true);const pt=new CL.PolyTree();c.Execute(CTY.ctIntersection,pt,PFT.pftNonZero,PFT.pftNonZero);return CL.Clipper.OpenPathsFromPolyTree(pt)}
function cParts(paths){if(!paths.length)return [];const c=new CL.Clipper();c.AddPaths(paths,CL.PolyType.ptSubject,true);const pt=new CL.PolyTree();c.Execute(CTY.ctUnion,pt,PFT.pftNonZero,PFT.pftNonZero);return CL.JS.PolyTreeToExPolygons(pt).map(e=>[e.outer,...e.holes])}
const outerOnly=paths=>paths.filter(p=>CL.Clipper.Orientation(p));
const areaOf=paths=>paths.reduce((s,p)=>s+CL.Clipper.Area(p),0)/(SC*SC);

// horizontal expansion: `off` moves every outline (negative = thinner walls, larger holes); `hole` grows only the holes
function adjustXY(paths,off,hole){if(!paths.length)return paths;let r=Math.abs(off)>1e-4?cOff(paths,off):paths;
  if(Math.abs(hole)>1e-4)r=[].concat(...cParts(r).map(p=>p.length<2?[p[0]]:cDiff([p[0]],cOff(p.slice(1).map(hp=>hp.slice().reverse()),hole))));return r}
// --- mesh → outlines ---
function edgeAt(x1,y1,z1,x2,y2,z2,z,out){if(z1>z2){let t=x1;x1=x2;x2=t;t=y1;y1=y2;y2=t;t=z1;z1=z2;z2=t}const f=(z-z1)/(z2-z1);out.push(x1+f*(x2-x1),y1+f*(y2-y1))}
const KEY=(x,y)=>(Math.round(x*1000)+2000000)*8388608+(Math.round(y*1000)+2000000);
function chain(seg){const m=seg.length/4;if(!m)return [];const start=new Map();
  for(let i=0;i<m;i++){const k=KEY(seg[4*i],seg[4*i+1]),e=start.get(k);if(e===undefined)start.set(k,i);else if(Array.isArray(e))e.push(i);else start.set(k,[e,i])}
  const used=new Uint8Array(m),loops=[];
  const take=k=>{const e=start.get(k);if(e===undefined)return -1;if(Array.isArray(e)){for(const i of e)if(!used[i])return i;return -1}return used[e]?-1:e};
  for(let i=0;i<m;i++){if(used[i])continue;const L=[seg[4*i],seg[4*i+1]],k0=KEY(seg[4*i],seg[4*i+1]);let cur=i;
    for(;;){used[cur]=1;const ex=seg[4*cur+2],ey=seg[4*cur+3],k=KEY(ex,ey);if(k===k0)break;L.push(ex,ey);const nx=take(k);if(nx<0)break;cur=nx}
    if(L.length>=6)loops.push(L)}
  return loops}
async function sliceMesh(P,mids,check,onP,clean=true){
  const n=P.length/9,zlo=new Float32Array(n),zhi=new Float32Array(n);
  for(let t=0;t<n;t++){const o=t*9;zlo[t]=Math.min(P[o+2],P[o+5],P[o+8]);zhi[t]=Math.max(P[o+2],P[o+5],P[o+8])}
  const order=new Uint32Array(n);for(let i=0;i<n;i++)order[i]=i;order.sort((a,b)=>zlo[a]-zlo[b]);
  const res=new Array(mids.length),pts=[];let ptr=0,active=[];
  for(let li=0;li<mids.length;li++){const z=mids[li];
    while(ptr<n&&zlo[order[ptr]]<=z)active.push(order[ptr++]);
    let w=0;for(const t of active)if(zhi[t]>=z)active[w++]=t;active.length=w;
    const seg=[];
    for(const t of active){const o=t*9,ax=P[o],ay=P[o+1],az=P[o+2],bx=P[o+3],by=P[o+4],bz=P[o+5],cx=P[o+6],cy=P[o+7],cz=P[o+8];
      const sa=az>=z,sb=bz>=z,sc=cz>=z;if(sa===sb&&sb===sc)continue;pts.length=0;
      if(sa!==sb)edgeAt(ax,ay,az,bx,by,bz,z,pts);if(sb!==sc)edgeAt(bx,by,bz,cx,cy,cz,z,pts);if(sc!==sa)edgeAt(cx,cy,cz,ax,ay,az,z,pts);
      if(pts.length!==4)continue;
      const nx=(by-ay)*(cz-az)-(bz-az)*(cy-ay),ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az);
      if((pts[2]-pts[0])*(-ny)+(pts[3]-pts[1])*nx>=0)seg.push(pts[0],pts[1],pts[2],pts[3]);else seg.push(pts[2],pts[3],pts[0],pts[1])}
    const paths=chain(seg).map(l=>{const p=[];for(let i=0;i<l.length;i+=2)p.push({X:Math.round(l[i]*SC),Y:Math.round(l[i+1]*SC)});return p});
    res[li]=paths.length?(clean?CL.Clipper.CleanPolygons(CL.Clipper.SimplifyPolygons(paths,PFT.pftEvenOdd),15):CL.Clipper.SimplifyPolygons(paths,PFT.pftEvenOdd)):[];
    if(shouldYield()){check();onP(li/mids.length);await nextFrame()}}
  return res}

// overhang of layer j: the band of layer j outside layer j−1, kept only where it is wider than the allowed step d
// (a morphological opening, so the whole band is kept and stacked bands leave no gaps); support blockers remove it
function overhangAt(O,j,d,minA,S){const band=cDiff(O[j],O[j-1]);if(!band.length)return [];let ov=cOff(cOff(band,-d/2),d/2+.01);ov=cInter(ov,band);
  if(S.blocks&&S.blocks.length){const z=S.zmid[j],bl=S.blocks.filter(b=>z>=b.z0&&z<=b.z1).map(b=>rectPath(b.x0,b.y0,b.x1,b.y1));if(bl.length)ov=cDiff(ov,bl)}
  return ov.length?cUnion(ov.filter(p=>Math.abs(CL.Clipper.Area(p))>minA)):[]}
// --- supports, computed layer by layer like Cura: overhang = part of a layer not resting on the layer below (within the overhang angle);
// it is carried down until it meets the model (everywhere) and, for "touching build plate", kept only where it reaches the bed ---
async function computeSupports(O,th,S,check){const N=O.length,tan=Math.tan(S.supAng*Math.PI/180),gapL=Math.max(0,Math.round(S.supZ/S.lh)),ifL=S.supIface?Math.max(1,Math.round(S.supIfaceH/S.lh)):0,minA=S.supMinArea*SC*SC;
  const ov=new Array(N).fill(null).map(()=>[]);
  for(let j=1;j<N;j++){if(!O[j].length)continue;ov[j]=overhangAt(O,j,th[j]*tan,minA,S);if(shouldYield()){check();await nextFrame()}}
  const raw=new Array(N).fill(null).map(()=>[]);let acc=[];
  for(let i=N-2;i>=0;i--){const add=i+1+gapL<N?ov[i+1+gapL]:[];if(add.length)acc=cUnion(acc,add);if(acc.length)acc=CL.Clipper.CleanPolygons(cDiff(acc,O[i]),20);raw[i]=acc;if(shouldYield()){check();await nextFrame()}}
  if(S.supWhere==='bed'){let reach=raw[0];for(let i=1;i<N;i++){reach=raw[i].length&&reach.length?cInter(raw[i],cOff(reach,.05)):[];raw[i]=reach}}
  const out=[];
  for(let i=0;i<N;i++){let r=raw[i];if(r.length&&i>0&&gapL>0&&S.supWhere!=='bed')for(let k=1;k<=gapL&&i-k>=0;k++)r=cDiff(r,O[i-k]);
    if(r.length)r=cDiff(r,cOff(O[i],S.supXY));let iface=[],body=r;
    if(r.length&&ifL){let band=[];for(let k=1;k<=ifL;k++){const j=i+k+gapL;if(j<N&&ov[j].length)band=band.concat(ov[j])}if(band.length){iface=cInter(r,cUnion(band));body=cDiff(r,iface)}}
    out.push({body,iface});if(shouldYield()){check();await nextFrame()}}
  return out}
// --- tree supports: tips under each overhang descend layer by layer, lean toward neighbours to merge,
// step around the model, thicken as they go down, and end on the bed (or on the model when allowed) ---
async function computeTreeSupports(O,th,S,check){const N=O.length,tan=Math.tan(S.supAng*Math.PI/180),gapL=Math.max(0,Math.round(S.supZ/S.lh)),ifL=S.supIface?Math.max(1,Math.round(S.supIfaceH/S.lh)):0,minA=S.supMinArea*SC*SC;
  const mv=Math.tan(S.treeAngle*Math.PI/180),grow=Math.tan(S.treeGrow*Math.PI/180),tip=Math.max(S.lw,S.treeTip)/2,spacing=Math.max(2.5,tip*5);
  const ov=new Array(N).fill(null).map(()=>[]);
  for(let j=1;j<N;j++){if(!O[j].length)continue;ov[j]=overhangAt(O,j,th[j]*tan,minA,S);if(shouldYield()){check();await nextFrame()}}
  const inside=(P,x,y)=>{let w=0;for(const p of P)if(CL.Clipper.PointInPolygon({X:Math.round(x*SC),Y:Math.round(y*SC)},p))w+=CL.Clipper.Orientation(p)?1:-1;return w>0};
  const nearestOut=(P,x,y)=>{let best=null,bd=Infinity;for(const p of P){const n=p.length;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n],ax=a.X/SC,ay=a.Y/SC,bx=b.X/SC,by=b.Y/SC,dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1,t=clamp(((x-ax)*dx+(y-ay)*dy)/L2),px=ax+t*dx,py=ay+t*dy,d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best=[px,py,d]}}}return best};
  let nodes=[],nid=0;const per=new Array(N),dropped=new Set();
  for(let i=N-2;i>=0;i--){const h=th[i];
    const sj=i+1+gapL+ifL;if(sj<N&&ov[sj].length){const reg=cOff(ov[sj],-tip),bd=reg.length?CL.JS.BoundsOfPaths(reg):null,G=spacing;let added=0;
      if(bd){for(let x=Math.ceil(bd.left/SC/G)*G;x<=bd.right/SC;x+=G)for(let y=Math.ceil(bd.top/SC/G)*G;y<=bd.bottom/SC;y+=G)if(inside(reg,x,y)){nodes.push({x,y,r:tip,tags:[nid++]});added++}}
      if(!added)for(const p of ov[sj]){const b=CL.JS.BoundsOfPaths([p]);if(CL.Clipper.Orientation(p))nodes.push({x:(b.left+b.right)/2/SC,y:(b.top+b.bottom)/2/SC,r:tip,tags:[nid++]})}}
    const coll=O[i].length?cOff(O[i],S.supXY+.5):[],step=mv*h;
    for(const n of nodes){n.r+=h*grow;let tx=0,ty=0,best=Infinity;for(const m of nodes){if(m===n)continue;const d=Math.hypot(m.x-n.x,m.y-n.y);if(d<best&&d<spacing*4){best=d;tx=m.x;ty=m.y}}
      if(best<Infinity){const d=best,s=Math.min(step,d/2);n.x+=(tx-n.x)/d*s;n.y+=(ty-n.y)/d*s}
      if(coll.length&&inside(coll,n.x,n.y)){const q=nearestOut(coll,n.x,n.y);if(q&&q[2]<=step*3+n.r){const d=q[2]||1;n.x=q[0]+(q[0]-n.x)/d*.3;n.y=q[1]+(q[1]-n.y)/d*.3}}}
    // merge neighbours that touch
    const merged=[],used=new Set();for(let a=0;a<nodes.length;a++){if(used.has(a))continue;const n=nodes[a];for(let b=a+1;b<nodes.length;b++){if(used.has(b))continue;const m=nodes[b];
        if(Math.hypot(m.x-n.x,m.y-n.y)<Math.max(n.r,m.r)){const wa=n.r*n.r,wb=m.r*m.r;n.x=(n.x*wa+m.x*wb)/(wa+wb);n.y=(n.y*wa+m.y*wb)/(wa+wb);n.r=Math.min(Math.sqrt(wa+wb),Math.max(n.r,m.r)+.5);n.tags=n.tags.concat(m.tags);used.add(b)}}merged.push(n)}
    nodes=[];for(const n of merged){if(coll.length&&inside(coll,n.x,n.y)){if(S.supWhere==='bed')n.tags.forEach(t=>dropped.add(t));continue}nodes.push(n)}
    per[i]=nodes.map(n=>({x:n.x,y:n.y,r:n.r,tags:n.tags}));if(shouldYield()){check();await nextFrame()}}
  const out=[];
  for(let i=0;i<N;i++){const cs=(per[i]||[]).filter(n=>!n.tags.some(t=>dropped.has(t)));let body=cs.length?cUnion(cs.map(n=>circlePath(n.x,n.y,n.r,18))):[];
    if(body.length)body=cDiff(body,cOff(O[i],S.supXY));let iface=[];
    if(ifL){let band=[];for(let k=1;k<=ifL;k++){const j=i+k+gapL;if(j<N&&ov[j].length)band=band.concat(ov[j])}if(band.length)iface=cDiff(cUnion(band),cOff(O[i],S.supXY))}
    out.push({body,iface})}
  out.tree=true;return out}
// --- fill patterns (scaled coordinates) ---
function hatch(bd,ang,s,phase=0){const a=ang*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),S=s*SC,ph=phase*SC;
  const cx=(bd.left+bd.right)/2,cy=(bd.top+bd.bottom)/2,R=Math.hypot(bd.right-bd.left,bd.bottom-bd.top)/2+S;
  const dc=-cx*sa+cy*ca,tc=cx*ca+cy*sa,k0=Math.floor((dc-R-ph)/S),k1=Math.ceil((dc+R-ph)/S),lines=[];
  for(let k=k0;k<=k1;k++){const d=k*S+ph,bx=-sa*d,by=ca*d;lines.push([{X:Math.round(bx+ca*(tc-R)),Y:Math.round(by+sa*(tc-R))},{X:Math.round(bx+ca*(tc+R)),Y:Math.round(by+sa*(tc+R))}])}
  return lines}
function waves(bd,alongX,s,z){const S=s*SC,amp=S/2.6,lam=2*S,ph=z/(2*s)*Math.PI*2,lines=[];
  const [u0,u1,v0,v1]=alongX?[bd.left,bd.right,bd.top,bd.bottom]:[bd.top,bd.bottom,bd.left,bd.right],step=S/4;
  for(let k=Math.floor(v0/S)-1;k<=Math.ceil(v1/S)+1;k++){const p=[];for(let u=u0-step;u<=u1+step;u+=step){const v=k*S+amp*Math.sin(u/lam*2*Math.PI+ph+(k%2)*Math.PI);p.push(alongX?{X:Math.round(u),Y:Math.round(v)}:{X:Math.round(v),Y:Math.round(u)})}lines.push(p)}
  return lines}
function fillSets(kind,region,lw,dens,li,z){ // → [{ang,lines}] clipped to region
  if(!region.length||dens<=0)return [];const bd=CL.JS.BoundsOfPaths(region),d=Math.min(1,dens);let sets;
  if(d>=0.99||kind==='skin')sets=[{ang:li%2?135:45,lines:hatch(bd,li%2?135:45,lw)}];
  else if(kind==='lines')sets=[{ang:li%2?135:45,lines:hatch(bd,li%2?135:45,lw/d)}];
  else if(kind==='grid')sets=[45,135].map(a=>({ang:a,lines:hatch(bd,a,2*lw/d)}));
  else if(kind==='triangles')sets=[0,60,120].map(a=>({ang:a,lines:hatch(bd,a,3*lw/d)}));
  else if(kind==='cubic')sets=[0,60,120].map((a,i)=>({ang:a,lines:hatch(bd,a,3*lw/d,(z*1.2247*(i===1?-1:1))%(3*lw/d))}));
  else if(kind==='gyroid'){const ax=li%2===0;sets=[{ang:ax?0:90,lines:waves(bd,ax,1.15*lw/d,z)}]}
  else if(kind==='support-lines'||kind==='support-zigzag')sets=[{ang:90,lines:hatch(bd,90,lw/d)}];
  else if(kind==='support-grid')sets=[0,90].map(a=>({ang:a,lines:hatch(bd,a,2*lw/d)}));
  else if(kind==='iface-grid')sets=[0,90].map(a=>({ang:a,lines:hatch(bd,a,2*lw/d)}));
  else if(kind==='iface-lines')sets=[{ang:li%2?0:90,lines:hatch(bd,li%2?0:90,lw/d)}];
  const minL=lw*SC*.8;
  return sets.map(s=>({ang:s.ang,lines:cClipLines(s.lines,region).filter(p=>{let L=0;for(let i=1;i<p.length;i++)L+=Math.hypot(p[i].X-p[i-1].X,p[i].Y-p[i-1].Y);return L>=minL})}))}

// ================= TOOLPATH BUILDER =================
async function buildToolpaths(gen,onP){
  const S={...cfg};if(S.vase){S.walls=1;S.top=0;S.inf=0;S.sup=false}
  const mat=MATS[S.mat],lw=S.lw,h=S.lh,h0=S.lh0;
  const chk=()=>{if(gen!==sliceGen)throw ABORT};
  const shift=objs.map(o=>{const bh=(o.basePlate?o.basePlate.h:0)+(o.z||0);return o.piece?[o.px-o.off[0],o.py-o.off[1],o.zOff-bh]:[o.px,o.py,-bh]});
  const meshes=objs.map((o,k)=>{const b=o.piece?o.pb:o.baked,[dx,dy,dz]=shift[k],p=new Float32Array(b.length);for(let i=0;i<b.length;i+=3){p[i]=b[i]+dx;p[i+1]=b[i+1]+dy;p[i+2]=b[i+2]-dz}return p});
  const zmax=Math.max(...objs.map(o=>o.size[2]+(o.z||0)));
  const zs=[h0],th=[h0];while(zs[zs.length-1]<zmax-1e-4){zs.push(zs[zs.length-1]+h);th.push(h)}
  const N=zs.length,mids=zs.map((z,i)=>z-th[i]/2);
  // pass 1: outlines of every object, unioned per layer
  const per=[];for(let k=0;k<meshes.length;k++){per.push(await sliceMesh(meshes[k],mids,chk,f=>onP(.02+.33*(k+f)/meshes.length,'برش لایه‌ها')))}
  for(let k=0;k<per.length;k++){const o=objs[k];if(o.masks&&o.masks.length){const [dx,dy,dz]=shift[k];per[k]=per[k].map((p,i)=>applyMasks(p,o.masks,mids[i]+dz,dx,dy))}
    if(o.basePlate){const bp=o.basePlate,[dx,dy]=shift[k];const zl=o.z||0;per[k]=per[k].map((p,i)=>mids[i]>=zl&&mids[i]-zl<bp.h?cUnion(p,tpaths(baseLayer(bp,mids[i]-zl),dx,dy)):p)}}
  for(let k=0;k<per.length;k++){const o=objs[k],s=(o.scale[0]+o.scale[1])/2/(o.s0||1),delta=S.keepTol?S.tolGap*(1-s)/2:0,off=S.xyOff-delta;
    if(Math.abs(off)>1e-4||Math.abs(S.holeOff)>1e-4)per[k]=per[k].map(p=>adjustXY(p,off,S.holeOff))}
  const O=new Array(N);for(let i=0;i<N;i++)O[i]=per.length===1?per[0][i]:cUnion([].concat(...per.map(p=>p[i])));
  onP(.36,'محاسبهٔ ساپورت');await nextFrame();if(gen!==sliceGen)throw ABORT;
  if(S.noHoles)for(let i=0;i<N;i++)O[i]=outerOnly(O[i]);
  S.zmid=mids;S.blocks=[];objs.forEach(o=>(o.blockers||[]).forEach(b=>{const lift=(o.basePlate?o.basePlate.h:0)+(o.z||0);S.blocks.push({x0:o.px+b.dx-b.s/2,x1:o.px+b.dx+b.s/2,y0:o.py+b.dy-b.s/2,y1:o.py+b.dy+b.s/2,z0:b.z+lift-b.s/2,z1:b.z+lift+b.s/2})}));
  const SUP=S.sup?(S.supType==='tree'?await computeTreeSupports(O,th,S,chk):await computeSupports(O,th,S,chk)):null;
  // raft
  const raft=S.adh==='raft';const RAFT=[{h:.3,w:.8,sp:2.4,ang:0,v:15},{h:.27,w:lw,sp:1.0,ang:90,v:20},{h:.2,w:lw,sp:lw,ang:45,v:30},{h:.2,w:lw,sp:lw,ang:135,v:30}];
  const raftTop=raft?RAFT.reduce((s,r)=>s+r.h,0)+S.raftGap:0;let flowMul=1;
  const layers=[];let cx=0,cy=0,retr=false,curPart=-1,ops=null,curZ=0;
  const T=(x,y,part=-1)=>{const d=Math.hypot(x-cx,y-cy);if(d<1e-3){curPart=part;return}
    if(S.retract&&!retr&&d>S.retMin&&!(S.comb&&part>=0&&part===curPart)){ops.push({k:'R'});retr=true}
    ops.push({k:'T',x,y});cx=x;cy=y;curPart=part};
  const E=(x,y,w,hh,v,ty,z)=>{if(retr){ops.push({k:'U'});retr=false}const d=Math.hypot(x-cx,y-cy);if(d<1e-4)return;
    const op={k:'E',x,y,e:d*w*hh/FIL_AREA*S.flow/100*flowMul,v,ty};if(z!=null)op.z=z;ops.push(op);cx=x;cy=y};
  const cap=(v,w,hh)=>Math.min(v,mat.vmax,mat.flow/(w*hh));
  const seamStart=(p,li)=>{const n=p.length;if(S.seam==='rand')return (li*7919+n*104729)%n;let best=0,bv=-Infinity;
    for(let i=0;i<n;i++){const v=S.seam==='back'?p[i].Y-Math.abs(p[i].X-cx*SC)*.05:-Math.hypot(p[i].X-cx*SC,p[i].Y-cy*SC);if(v>bv){bv=v;best=i}}return best};
  let fz=12345;const frand=()=>(fz=(fz*16807)%2147483647)/2147483647;
  const fuzz=p=>{const out=[],n=p.length,step=S.fuzzyD*SC,T=S.fuzzyT*SC;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n],L=Math.hypot(b.X-a.X,b.Y-a.Y),k=Math.max(1,Math.round(L/step)),nx=-(b.Y-a.Y)/(L||1),ny=(b.X-a.X)/(L||1);
    for(let s=0;s<k;s++){const f=s/k,o=(frand()*2-1)*T;out.push({X:Math.round(a.X+(b.X-a.X)*f+nx*o),Y:Math.round(a.Y+(b.Y-a.Y)*f+ny*o)})}}return out};
  const loop=(p,w,hh,v,ty,part,li)=>{if(ty===0&&S.fuzzy)p=fuzz(p);const n=p.length;if(n<2)return;const s=seamStart(p,li);T(p[s].X/SC,p[s].Y/SC,part);for(let j=1;j<=n;j++){const q=p[(s+j)%n];E(q.X/SC,q.Y/SC,w,hh,v,ty)}};
  const loops=(paths,w,hh,v,ty,part,li)=>{const left=paths.filter(p=>p.length>2);while(left.length){let bi=0,bd=Infinity;
    for(let i=0;i<left.length;i++){const p=left[i][0],d=Math.hypot(p.X/SC-cx,p.Y/SC-cy);if(d<bd){bd=d;bi=i}}loop(left.splice(bi,1)[0],w,hh,v,ty,part,li)}};
  const lines=(sets,w,hh,v,ty,part)=>{for(const s of sets){const a=s.ang*Math.PI/180,nx=-Math.sin(a),ny=Math.cos(a),tx=Math.cos(a),ty2=Math.sin(a);
    const it=s.lines.map(p=>{const f=p[0],l=p[p.length-1],mx=(f.X+l.X)/2,my=(f.Y+l.Y)/2;return {p,d:Math.round((mx*nx+my*ny)/(lw*SC*.5)),t:mx*tx+my*ty2}});
    it.sort((u,q)=>u.d-q.d||u.t-q.t);
    for(const {p} of it){const f=p[0],l=p[p.length-1],rev=Math.hypot(l.X/SC-cx,l.Y/SC-cy)<Math.hypot(f.X/SC-cx,f.Y/SC-cy);const q=rev?p.slice().reverse():p;
      T(q[0].X/SC,q[0].Y/SC,part);for(let i=1;i<q.length;i++)E(q[i].X/SC,q[i].Y/SC,w,hh,v,ty)}}};
  const newLayer=(z,hh,first,label)=>{ops=[];curZ=z;layers.push({z,h:hh,first,ops,label});curPart=-1;return ops};
  // raft layers
  if(raft){const base=cOff(outerOnly(O[0]),S.raftMargin,JT.jtRound);let z=0;
    RAFT.forEach((r,i)=>{z+=r.h;newLayer(z,r.h,i===0,'raft');if(i===0)loops(base,r.w,r.h,cap(r.v,r.w,r.h),6,-1,i);
      const reg=cOff(base,-r.w/2);lines([{ang:r.ang,lines:cClipLines(hatch(CL.JS.BoundsOfPaths(reg),r.ang,r.sp),reg)}],r.w,r.h,cap(r.v,r.w,r.h),6,-1)})}
  const interAll=(a,b)=>{let r=null;for(let k=a;k<=b;k++){r=r===null?O[k]:cInter(r,O[k]);if(!r.length)break}return r||[]};
  for(let li=0;li<N;li++){
    const hh=th[li],first=li===0&&!raft,z=zs[li]+raftTop;newLayer(z,hh,first,'');
    const slow=raft?0:S.slowLayers;const sp=v=>cap(li<slow?S.vFirst+(v-S.vFirst)*li/slow:(first?S.vFirst:v),lw,hh);flowMul=li===0&&!raft?S.flow0/100:1;
    if(S.retract&&S.retLayer&&li>0&&!retr){ops.push({k:'R'});retr=true}
    // first-layer adhesion
    if(li===0&&!raft&&(S.adh==='skirt'||S.adh==='brim')){let base=O[0];if(SUP)base=cUnion(base,cUnion(SUP[0].body,SUP[0].iface));
      const outer=outerOnly(cUnion(base));
      if(S.adh==='brim'){const n=Math.max(1,Math.round(S.brimW/lw));for(let k=n-1;k>=0;k--)loops(outerOnly(cOff(outer,lw/2+k*lw,JT.jtRound)),lw,hh,cap(S.vFirst,lw,hh),6,-1,li)}
      else for(let k=S.skirtLoops-1;k>=0;k--)loops(outerOnly(cOff(outer,S.skirtDist+lw/2+k*lw,JT.jtRound)),lw,hh,cap(S.vFirst,lw,hh),6,-1,li)}
    // supports
    if(SUP){const {body,iface}=SUP[li];
      if(body.length){if(SUP.tree){loops(cOff(body,-lw/2),lw,hh,sp(S.vSupport),4,-2,li);const inner=cOff(body,-lw*1.5);if(inner.length)lines(fillSets('support-'+S.supPat,inner,lw,S.supDens/100,li,z),lw,hh,sp(S.vSupport),4,-2)}
        else lines(fillSets('support-'+S.supPat,cOff(body,-lw/2),lw,S.supDens/100,li,z),lw,hh,sp(S.vSupport),4,-2)}
      if(iface.length)lines(fillSets('iface-'+S.supIfPat,cOff(iface,-lw/2),lw,S.supIfDens/100,li,z),lw,hh,sp(S.vIface),5,-3)}
    // skin coverage from the layers above and below
    const cA=S.top?(li+S.top>=N?[]:interAll(li+1,li+S.top)):null,cB=S.bottom?(li-S.bottom<0?[]:interAll(li-S.bottom,li-1)):null;
    const cover=cA===null?cB:cB===null?cA:cInter(cA,cB);
    const parts=cParts(O[li]).map(p=>{const b=CL.JS.BoundsOfPaths([p[0]]);return {p,cx:(b.left+b.right)/2/SC,cy:(b.top+b.bottom)/2/SC,a:CL.Clipper.Area(p[0])}});
    if(S.vase&&li>=S.bottom){ // spiralize: one continuous outer wall rising through the layer
      const big=parts.sort((a,b)=>b.a-a.a)[0];if(big){const w=cOff([big.p[0]],-lw/2).sort((a,b)=>Math.abs(CL.Clipper.Area(b))-Math.abs(CL.Clipper.Area(a)))[0];
        if(w&&w.length>2){layers[layers.length-1].spiral=true;const s=seamStart(w,li),z0=z-hh;let L=0;const n=w.length;
          for(let j=1;j<=n;j++){const a=w[(s+j-1)%n],b=w[(s+j)%n];L+=Math.hypot(b.X-a.X,b.Y-a.Y)}
          T(w[s].X/SC,w[s].Y/SC,0);let acc=0;for(let j=1;j<=n;j++){const a=w[(s+j-1)%n],b=w[(s+j)%n];acc+=Math.hypot(b.X-a.X,b.Y-a.Y);E(b.X/SC,b.Y/SC,lw,hh,sp(S.vOuter),0,z0+hh*acc/L)}}}
    }else{
      const left=parts.slice();let pid=0;
      while(left.length){let bi=0,bd=Infinity;for(let i=0;i<left.length;i++){const d=Math.hypot(left[i].cx-cx,left[i].cy-cy);if(d<bd){bd=d;bi=i}}
        const part=left.splice(bi,1)[0],pp=part.p;pid++;
        const walls=[];for(let k=0;k<S.walls;k++){const w=cOff(pp,-(lw/2+k*lw));if(!w.length)break;walls.push(w)}
        const order=S.wallOrder==='outer'?walls.map((w,k)=>k):walls.map((w,k)=>walls.length-1-k);
        for(const k of order)loops(walls[k],lw,hh,sp(k===0?S.vOuter:S.vInner),k===0?0:1,pid,li);
        const R=cOff(pp,-(walls.length*lw));if(!R.length)continue;
        const sparse=cover===null?R:cInter(R,cover),skin=cover===null?[]:cDiff(R,sparse);
        if(skin.length)lines(fillSets('skin',cOff(skin,-lw*(.5-S.skinOverlap/100)),lw,1,li,z),lw,hh,sp(S.vSkin),2,pid);
        if(sparse.length&&S.inf>0)lines(fillSets(S.inf>=99?'skin':S.infPat,cOff(sparse,-lw*(.5-S.infOverlap/100)),lw,S.inf/100,li,z),lw,hh,sp(S.vInfill),3,pid);
        // ironing: a low-flow pass over skin that is exposed to the air above
        if(S.ironing&&skin.length){const up=li+1<N?cDiff(skin,O[li+1]):skin,reg=cOff(up,-lw*.5);
          if(reg.length&&areaOf(reg)>1){const fl=flowMul;flowMul=S.ironFlow/100;lines([{ang:li%2?45:135,lines:cClipLines(hatch(CL.JS.BoundsOfPaths(reg),li%2?45:135,S.ironSpacing),reg)}],lw,hh,cap(S.ironSpeed,lw,hh),2,pid);flowMul=fl}}}}
    if(shouldYield()){if(gen!==sliceGen)throw ABORT;onP(.38+.47*li/N,'ساخت مسیرها');await nextFrame()}}
  if(retr)ops.push({k:'U'});
  return {layers,S,N,raftTop,zmax}}

// ================= MOTION SIMULATION =================
// Trapezoid profile per move, junction speed limited by jerk, look-ahead with backward/forward passes (like Marlin's planner).
function simLayer(L,S,mul){const a=S.acc,J=S.jerk,vt=L.first?S.vTravel0:S.vTravel;let x=null,y=null,t=0;const byT=new Float64Array(8);
  const seg=[];const flush=()=>{const n=seg.length;if(!n)return;const ent=new Float64Array(n+1);
    for(let i=0;i<n;i++){if(i===0){ent[0]=0;continue}const p=seg[i-1],q=seg[i],cos=p.ux*q.ux+p.uy*q.uy,s2=Math.sqrt(Math.max(0,(1-cos)/2));ent[i]=Math.min(p.v,q.v,s2<1e-6?Infinity:J/(2*s2))}
    ent[n]=0;for(let i=n-1;i>=0;i--)ent[i]=Math.min(ent[i],Math.sqrt(ent[i+1]*ent[i+1]+2*a*seg[i].L));
    for(let i=0;i<n;i++)ent[i+1]=Math.min(ent[i+1],Math.sqrt(ent[i]*ent[i]+2*a*seg[i].L));
    for(let i=0;i<n;i++){const s=seg[i],v0=ent[i],v1=ent[i+1],vm=s.v,da=(vm*vm-v0*v0)/(2*a),dd=(vm*vm-v1*v1)/(2*a);let dt;
      if(da+dd<=s.L)dt=(vm-v0)/a+(vm-v1)/a+(s.L-da-dd)/vm;else{const vp=Math.sqrt(Math.max(0,(2*a*s.L+v0*v0+v1*v1)/2));dt=Math.max(0,(vp-v0)/a)+Math.max(0,(vp-v1)/a)}
      t+=dt;byT[s.ty]+=dt}seg.length=0};
  for(const o of L.ops){
    if(o.k==='R'||o.k==='U'){flush();const dt=S.retDist/S.retSpeed+(S.zhop>0?S.zhop/10:0);t+=dt;byT[7]+=dt;continue}
    if(o.k==='T'||o.k==='E'){if(x!==null){const dx=o.x-x,dy=o.y-y,Ld=Math.hypot(dx,dy);if(Ld>1e-6){const v=o.k==='T'?vt:Math.max(Math.min(o.v,S.minSpeed),o.v*mul);seg.push({L:Ld,v,ux:dx/Ld,uy:dy/Ld,ty:o.k==='T'?7:o.ty})}}x=o.x;y=o.y}}
  flush();const dz=L.h/10;t+=dz;byT[7]+=dz;return {t,byT,end:[x,y]}}
function simulate(B){const S=B.S;let total=0;const byT=new Float64Array(8);let prevEnd=null;
  for(const L of B.layers){if(prevEnd&&L.ops.length){const f=L.ops.find(o=>o.k==='T'||o.k==='E');if(f)L.ops.unshift({k:'T',x:prevEnd[0],y:prevEnd[1],virt:1})}
    let r=simLayer(L,S,1);L.mul=1;
    if(r.t<S.minLayerTime&&!L.spiral){const te=r.byT.slice(0,7).reduce((s,v)=>s+v,0),other=r.t-te,need=S.minLayerTime-other;if(te>0&&need>te){L.mul=te/need;r=simLayer(L,S,L.mul)}}
    if(L.ops[0]&&L.ops[0].virt)L.ops.shift();L.t=r.t;total+=r.t;for(let i=0;i<8;i++)byT[i]+=r.byT[i];prevEnd=r.end}
  return {total,byT}}

// ================= G-CODE WRITER =================
function writeGcode(B,sim,name){const S=B.S,out=[],k=cfg.kf||1;let F=0,E=0,fanCur=-1,type=-1,z=0;
  const fz=v=>(Math.round(v*1000)/1000).toString(),fe=v=>(Math.round(v*100000)/100000).toString();
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const L of B.layers)for(const o of L.ops)if(o.k==='E'){if(o.x<x0)x0=o.x;if(o.x>x1)x1=o.x;if(o.y<y0)y0=o.y;if(o.y>y1)y1=o.y}
  let eTot=0;for(const L of B.layers)for(const o of L.ops)if(o.k==='E')eTot+=o.e;
  const sub=s=>s.replace(/\{purge\}/g,Math.round(Math.min(145,BED.y-30))).replace(/\{nozzle\}/g,S.tNoz0||S.tNoz).replace(/\{bed\}/g,S.tBed0||S.tBed).replace(/\{depth\}/g,BED.y).replace(/\{width\}/g,BED.x);
  out.push(';FLAVOR:Marlin',`;TIME:${Math.round(sim.total*k)}`,`;Filament used: ${(eTot/1000).toFixed(5)}m`,`;Layer height: ${S.lh}`,
    `;MINX:${fz(x0)}`,`;MINY:${fz(y0)}`,';MINZ:0.2',`;MAXX:${fz(x1)}`,`;MAXY:${fz(y1)}`,`;MAXZ:${fz(B.layers.length?B.layers[B.layers.length-1].z:0)}`,
    `;TARGET_MACHINE.NAME:${(curPrinter().brand+' '+curPrinter().name).trim()}`,';Generated with Benchy Print web slicer',`;Material: ${MATS[S.mat].n} ${S.tNoz}/${S.tBed}°C · infill ${S.inf}% ${S.infPat} · walls ${S.walls}`,
    sub(S.startG),'M83 ; relative extrusion','G92 E0','M106 S0',`;LAYER_COUNT:${B.layers.length}`);
  B.layers.forEach((L,li)=>{out.push(`;LAYER:${li}`);
    if(li===1&&((S.tNoz0&&S.tNoz0!==S.tNoz)||(S.tBed0&&S.tBed0!==S.tBed)))out.push(`M104 S${S.tNoz}`,`M140 S${S.tBed}`);
    const fanTarget=li===0?Math.round(255*S.fan0/100):Math.round(255*S.fan/100*Math.min(1,li/Math.max(1,S.fanLayer)));if(fanTarget!==fanCur){out.push(fanTarget?`M106 S${fanTarget}`:'M106 S0');fanCur=fanTarget}
    const vt=(L.first?S.vTravel0:S.vTravel)*60;
    if(!L.spiral){out.push(`G0 F600 Z${fz(L.z)}`);F=600;z=L.z}
    for(const o of L.ops){
      if(o.k==='T'){out.push(`G0${F!==vt?` F${vt}`:''} X${fz(o.x)} Y${fz(o.y)}`);F=vt}
      else if(o.k==='E'){if(o.ty!==type){out.push(`;TYPE:${TYPES[o.ty]}`);type=o.ty}const v=Math.round(Math.max(Math.min(o.v,S.minSpeed),o.v*(L.mul||1))*60);
        out.push(`G1${F!==v?` F${v}`:''} X${fz(o.x)} Y${fz(o.y)}${o.z!=null?` Z${fz(o.z)}`:''} E${fe(o.e)}`);F=v;E+=o.e;if(o.z!=null)z=o.z}
      else if(o.k==='R'){out.push(`G1 F${S.retSpeed*60} E-${S.retDist}`);F=S.retSpeed*60;if(S.zhop>0){out.push(`G0 F600 Z${fz(z+S.zhop)}`);F=600}}
      else if(o.k==='U'){if(S.zhop>0){out.push(`G0 F600 Z${fz(z)}`);F=600}out.push(`G1 F${S.retSpeed*60} E${S.retDist}`);F=S.retSpeed*60}}
    out.push(`;TIME_ELAPSED:${Math.round(B.layers.slice(0,li+1).reduce((s,q)=>s+q.t,0)*k)}`)});
  out.push(sub(S.endG),';End of Gcode');
  return {text:out.join('\n')+'\n',eTot}}
</script>
