<script>
// ================= OBJECTS =================
// Each object keeps its source triangles (Z up, mm), a rotation, a per-axis scale and a bed position (centre X/Y).
// `baked` holds rotated+scaled triangles centred on X/Y = 0 with the lowest point at Z = 0.
let objs=[],sel=null,objSeq=0;
const selMat=()=>objs.find(o=>o.id===sel)||null;
function bakeObj(o){const b=o.base,n=b.length,out=new Float32Array(n),e=o.rot.elements,s=o.scale;
  let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(let i=0;i<n;i+=3){const x=b[i],y=b[i+1],z=b[i+2];
    const X=(e[0]*x+e[3]*y+e[6]*z)*s[0],Y=(e[1]*x+e[4]*y+e[7]*z)*s[1],Z=(e[2]*x+e[5]*y+e[8]*z)*s[2];
    out[i]=X;out[i+1]=Y;out[i+2]=Z;
    if(X<mn[0])mn[0]=X;if(X>mx[0])mx[0]=X;if(Y<mn[1])mn[1]=Y;if(Y>mx[1])mx[1]=Y;if(Z<mn[2])mn[2]=Z;if(Z>mx[2])mx[2]=Z}
  const cx=(mn[0]+mx[0])/2,cy=(mn[1]+mx[1])/2;
  for(let i=0;i<n;i+=3){out[i]-=cx;out[i+1]-=cy;out[i+2]-=mn[2]}
  o.baked=out;o.size=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];o.msize=o.size.slice();o.vol=null;buildMesh(o);
  if(o.basePlate){sizeWithBase(o);const sp={...o.basePlate};makeBase(o,sp).then(()=>{refreshObjs();changed()})}}
function buildMesh(o){if(o.piece){if(o.mesh){o.mesh.geometry=o.geo}placeMesh(o);return}const p=o.baked,n=p.length,pos=new Float32Array(n),col=new Float32Array(n);
  for(let i=0;i<n;i+=3){pos[i]=p[i];pos[i+1]=p[i+2];pos[i+2]=-p[i+1]}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.computeVertexNormals();
  const nr=g.attributes.normal.array,ov=$('ovBtn').getAttribute('aria-pressed')==='true',sinT=Math.sin(cfg.supAng*Math.PI/180);
  for(let t=0;t<n;t+=9){const ny=(nr[t+1]+nr[t+4]+nr[t+7])/3,cy=(pos[t+1]+pos[t+4]+pos[t+7])/3,bad=ov&&ny<-sinT&&cy>0.4;
    for(let k=0;k<9;k+=3){col[t+k]=1;col[t+k+1]=bad?.25:1;col[t+k+2]=bad?.3:1}}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  if(!o.mesh){o.mesh=new THREE.Mesh(g,modelMaterial());o.mesh.castShadow=o.mesh.receiveShadow=true;o.mesh.userData.obj=o;scene.add(o.mesh)}
  else{o.mesh.geometry.dispose();o.mesh.geometry=g}
  o.mesh.rotation.set(0,0,0);o.mesh.scale.set(1,1,1);placeMesh(o)}
function placeMesh(o){o.mesh.position.set(o.px-BED.x/2,(o.basePlate?o.basePlate.h:0)+(o.z||0),-(o.py-BED.y/2))}
const margin=()=>cfg.adh==='brim'?cfg.brimW:cfg.adh==='raft'?cfg.raftMargin:cfg.adh==='skirt'?cfg.skirtDist+cfg.lw*cfg.skirtLoops:0;
function objOut(o){const m=Math.min(margin(),12);return o.px-o.size[0]/2<m-1e-6||o.px+o.size[0]/2>BED.x-m+1e-6||o.py-o.size[1]/2<m-1e-6||o.py+o.size[1]/2>BED.y-m+1e-6||o.size[2]+(o.z||0)>BED.z}
function sceneBounds(){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z=0;for(const o of objs){x0=Math.min(x0,o.px-o.size[0]/2);x1=Math.max(x1,o.px+o.size[0]/2);y0=Math.min(y0,o.py-o.size[1]/2);y1=Math.max(y1,o.py+o.size[1]/2);z=Math.max(z,o.size[2]+(o.z||0))}return {x0,x1,y0,y1,z}}
function refreshObjs(){
  const col=modelCol();
  for(const o of objs){const out=objOut(o),m=o.mesh.material;m.color.set(out?'#8b8f99':col);m.emissive.set(o.id===sel?css('--hot'):out?'#ff2a2a':'#000000');m.emissiveIntensity=o.id===sel?.18:out?.25:0}
  const ul=$('objList');ul.innerHTML='';$('objEmpty').hidden=objs.length>0;
  for(const o of objs){const li=document.createElement('li');li.className=(o.id===sel?'on ':'')+(objOut(o)?'out':'');
    li.innerHTML=`<span class="nm"></span><span class="dm">${o.size.map(v=>v.toFixed(0)).join('×')}</span><button type="button" title="${tr('کپی')}" aria-label="${tr('کپی')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V4h12"/></svg></button><button type="button" title="${tr('حذف')}" aria-label="${tr('حذف')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>`;
    li.querySelector('.nm').textContent=o.name;li.onclick=()=>select(o.id);
    const [bc,bd]=li.querySelectorAll('button');bc.onclick=e=>{e.stopPropagation();duplicate(o,1)};bd.onclick=e=>{e.stopPropagation();removeObj(o)};ul.appendChild(li)}
  const o=selMat();$('tfCard').hidden=!o;
  if(o){$('selName').textContent=o.name;const fv=(id,v)=>{if(document.activeElement!==$(id))$(id).value=v};
    fv('px',o.px.toFixed(1));fv('py',o.py.toFixed(1));fv('dx',o.size[0].toFixed(1));fv('dy',o.size[1].toFixed(1));fv('dz',o.size[2].toFixed(1));fv('sc',Math.round(o.scale[0]*100))}
  const anyOut=objs.some(objOut),fc=$('fitChip');
  fc.className='chip '+(objs.length?(anyOut?'bad':'ok'):'');const inBed=o=>o.px-o.size[0]/2>=-1e-6&&o.px+o.size[0]/2<=BED.x+1e-6&&o.py-o.size[1]/2>=-1e-6&&o.py+o.size[1]/2<=BED.y+1e-6&&o.size[2]<=BED.z;
  fc.textContent=!objs.length?tr('بستر خالی است'):anyOut?(objs.filter(objOut).every(inBed)?`✕ ${tr('خیلی نزدیک لبه؛ اسکرت/بریم این مقدار جا لازم دارد:')} ${fa(Math.min(margin(),12),1)} mm`:tr('✕ مدلی بیرون از محدودهٔ چاپ است')):tr('✓ همه در محدودهٔ چاپ');
  volBox.material.opacity=anyOut?.6:.18;volBox.material.color.set(anyOut?'#ff4040':css('--hot'));
  const tolOn=cfg.keepTol&&objs.some(o=>Math.abs((o.scale[0]+o.scale[1])/2/(o.s0||1)-1)>.005),tc=$('tolChip');tc.hidden=!tolOn;if(tolOn)tc.textContent=`${tr('لقی')} ${fa(cfg.tolGap,2)} mm ${tr('حفظ می‌شود')}`;
  $('pieceNote').hidden=!(selMat()&&selMat().piece);if(typeof updateHelpers==='function')updateHelpers();if(typeof updateGizmo==='function')updateGizmo();
  renderStats();renderObjOverlay()}
function addObject(base,name,opts={}){
  const o={id:++objSeq,file:opts.file||name,name,base,rot:opts.rot?opts.rot.clone():new THREE.Matrix3(),scale:opts.scale?opts.scale.slice():[1,1,1],px:BED.x/2,py:BED.y/2};
  bakeObj(o);
  if(!opts.scale){const [dx,dy,dz]=o.size;
    if(Math.max(dx,dy,dz)<1){o.scale=[25.4,25.4,25.4];bakeObj(o)} // tiny model: exported in inches
    else if(dx>BED.x-10||dy>BED.y-10||dz>BED.z){const s=Math.min((BED.x-10)/dx,(BED.y-10)/dy,BED.z/dz);o.scale=[s,s,s];bakeObj(o);toast(tr('مدل برای جا شدن در بستر کوچک شد.'))}}
  o.s0=o.scale[0];objs.push(o);sel=o.id;
  if(!opts.noArrange&&objs.length>1)arrange();else{placeMesh(o)}
  refreshObjs();return o}
function removeObj(o){scene.remove(o.mesh);if(!o.piece)o.mesh.geometry.dispose();objs=objs.filter(x=>x!==o);if(sel===o.id)sel=objs.length?objs[objs.length-1].id:null;refreshObjs();changed()}
function duplicate(o,n){if(o.piece){for(let i=0;i<n;i++){const c={...o,id:++objSeq,mesh:null,baseMesh:null};mountPiece(c)}arrange();sel=o.id;refreshObjs();changed();return}for(let i=0;i<n;i++){const c=addObject(o.base,o.name,{rot:o.rot,scale:o.scale,noArrange:true,file:o.file});c.s0=o.s0;if(o.basePlate){c.basePlate={...o.basePlate};buildBaseMesh(c);sizeWithBase(c);placeMesh(c)}}arrange();sel=o.id;refreshObjs();changed()}
function select(id){sel=id;refreshObjs();if(typeof updateGizmo==='function')updateGizmo()}
// shelf packing: rows from the back-left, then the whole block is centred on the bed
function arrange(){if(!objs.length)return;const gap=6+Math.min(margin(),10),W=BED.x-2*Math.min(margin(),12);
  const list=objs.slice().sort((a,b)=>b.size[1]-a.size[1]);const rows=[];let row={items:[],w:0,h:0};
  for(const o of list){const w=o.size[0];if(row.items.length&&row.w+gap+w>W){rows.push(row);row={items:[],w:0,h:0}}row.w+=(row.items.length?gap:0)+w;row.h=Math.max(row.h,o.size[1]);row.items.push(o)}
  rows.push(row);const totH=rows.reduce((s,r)=>s+r.h,0)+gap*(rows.length-1);let y=BED.y/2+totH/2;
  for(const r of rows){let x=BED.x/2-r.w/2;for(const o of r.items){o.px=x+o.size[0]/2;o.py=y-r.h/2;x+=o.size[0]+gap;placeMesh(o)}y-=r.h+gap}
  refreshObjs();changed()}
const pieceLock=o=>{if(o&&o.piece){toast(tr('قطعه‌های برش‌خورده فقط جابه‌جا می‌شوند؛ مقیاس و چرخش را قبل از برش انجام دهید.'));return true}return false};
function rebake(o){if(o.piece)return refreshObjs();bakeObj(o);if(o.blockers&&o.blockers.length){o.blockers=[];drawBlockers(o)}refreshObjs();changed();if(typeof updateGizmo==='function')updateGizmo()}
function rotateObj(o,R){if(pieceLock(o))return;o.rot=R.clone().multiply(o.rot);rebake(o)}
function layFlatNormal(o,n){ // n: unit normal in rotated, unscaled frame → turn it to face −Z
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(n[0],n[1],n[2]).normalize(),new THREE.Vector3(0,0,-1));
  const m4=new THREE.Matrix4().makeRotationFromQuaternion(q);rotateObj(o,new THREE.Matrix3().setFromMatrix4(m4))}
function triNormal(o,t){const b=o.base,e=o.rot.elements,v=[];for(let k=0;k<3;k++){const x=b[t+k*3],y=b[t+k*3+1],z=b[t+k*3+2];v.push([e[0]*x+e[3]*y+e[6]*z,e[1]*x+e[4]*y+e[7]*z,e[2]*x+e[5]*y+e[8]*z])}
  const u=[v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]],w=[v[2][0]-v[0][0],v[2][1]-v[0][1],v[2][2]-v[0][2]];
  const n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],L=Math.hypot(...n);return L?{n:n.map(c=>c/L),a:L/2}:null}
function autoFlat(o){if(pieceLock(o))return;const bins=new Map();for(let t=0;t<o.base.length;t+=9){const r=triNormal(o,t);if(!r)continue;const k=r.n.map(c=>Math.round(c*40)).join(',');const b=bins.get(k)||{a:0,n:[0,0,0]};b.a+=r.a;for(let i=0;i<3;i++)b.n[i]+=r.n[i]*r.a;bins.set(k,b)}
  let best=null;for(const b of bins.values())if(!best||b.a>best.a)best=b;if(best)layFlatNormal(o,best.n)}

// best orientation: try candidate "down" directions and score support area, height and bed contact
function bestOrient(o){const b=orientSearch(o);if(b)layFlatNormal(o,b.d);return b}
function orientSearch(o){if(o.piece)return null;const b=o.base,e=o.rot.elements,n=b.length/9,V=new Float32Array(b.length),Nn=new Float32Array(n*3),Ar=new Float32Array(n);let A=0;
  for(let i=0;i<b.length;i+=3){const x=b[i],y=b[i+1],z=b[i+2];V[i]=e[0]*x+e[3]*y+e[6]*z;V[i+1]=e[1]*x+e[4]*y+e[7]*z;V[i+2]=e[2]*x+e[5]*y+e[8]*z}
  const bins=new Map();
  for(let t=0;t<n;t++){const o9=t*9,ux=V[o9+3]-V[o9],uy=V[o9+4]-V[o9+1],uz=V[o9+5]-V[o9+2],vx=V[o9+6]-V[o9],vy=V[o9+7]-V[o9+1],vz=V[o9+8]-V[o9+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,L=Math.hypot(nx,ny,nz);if(!L)continue;Nn[t*3]=nx/L;Nn[t*3+1]=ny/L;Nn[t*3+2]=nz/L;Ar[t]=L/2;A+=L/2;
    const k=Math.round(nx/L*20)+','+Math.round(ny/L*20)+','+Math.round(nz/L*20),bb=bins.get(k)||{a:0,n:[0,0,0]};bb.a+=L/2;bb.n[0]+=nx/2;bb.n[1]+=ny/2;bb.n[2]+=nz/2;bins.set(k,bb)}
  const cand=[[0,0,-1]];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)cand.push([x,y,z]);
  [...bins.values()].sort((p,q)=>q.a-p.a).slice(0,16).forEach(bb=>cand.push(bb.n));
  const sinT=Math.sin(cfg.supAng*Math.PI/180),s=(o.scale[0]+o.scale[1]+o.scale[2])/3;let best=null;
  for(const c of cand){const L=Math.hypot(...c);const d=[c[0]/L,c[1]/L,c[2]/L];let mn=1e9,mx=-1e9;
    for(let i=0;i<V.length;i+=3){const z=-(d[0]*V[i]+d[1]*V[i+1]+d[2]*V[i+2]);if(z<mn)mn=z;if(z>mx)mx=z}
    let ov=0,base=0;
    for(let t=0;t<n;t++){const nz=-(d[0]*Nn[t*3]+d[1]*Nn[t*3+1]+d[2]*Nn[t*3+2]);if(nz>=-sinT)continue;const o9=t*9;
      const zt=Math.min(-(d[0]*V[o9]+d[1]*V[o9+1]+d[2]*V[o9+2]),-(d[0]*V[o9+3]+d[1]*V[o9+4]+d[2]*V[o9+5]),-(d[0]*V[o9+6]+d[1]*V[o9+7]+d[2]*V[o9+8]))-mn;
      if(zt*s<0.3){if(nz<-0.995)base+=Ar[t]}else ov+=Ar[t]*(-nz)}
    const h=(mx-mn),diag=Math.cbrt(A),score=ov/A+0.12*h/(diag*2)-0.3*Math.min(base/A,0.3)+(base/A<0.005?0.08:0);
    if(!best||score<best.score-1e-9)best={score,d,ov:ov*s*s}}
  return best}
// ================= INTERACTION =================
let tool='move';
document.querySelectorAll('#rail [data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
function setTool(t){tool=t;document.querySelectorAll('#rail [data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));
  $('tip').firstElementChild.textContent={move:tr('روی مدل کلیک کنید و بکشید تا جابه‌جا شود. روی فضای خالی بکشید تا دید بچرخد.'),scale:tr('دستگیره‌های رنگی را بکشید تا مدل در همان محور بزرگ یا کوچک شود (قرمز X، سبز Y، آبی Z). اندازه و درصد دقیق در پنل کنار ابزار است.'),rotate:tr('یکی از حلقه‌ها را بگیرید و بچرخانید: قرمز X، سبز Y، آبی Z. زاویهٔ دقیق را در پنل کنار ابزار وارد کنید.'),block:tr('روی جایی از مدل بزنید که ساپورت نمی‌خواهید؛ یک جعبهٔ قرمز گذاشته می‌شود.'),face:tr('روی سطحی از مدل کلیک کنید تا آن سطح روی بستر بخوابد.'),cut:tr('در نمای بالا، روی مدل از یک طرف به طرف دیگر بکشید تا خط برش رسم شود.')}[t];
  if(t==='cut'){defaultView();view.th=0;view.ph=.001}
  if(typeof updateGizmo==='function')updateGizmo()}
$('pickFace').onclick=()=>setTool('face');
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),bedPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function pick(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  if(mode!=='prep')return null;const hits=ray.intersectObjects(objs.map(o=>o.mesh),true);return hits[0]||null}
function bedPoint(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(bedPlane,p)?p:null}
const ptr=new Map();let pinch0=0,drag=null;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});
  if(ptr.size===2){drag=null;const [a,b]=[...ptr.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);return}
  if(e.button!==0)return;if(tool==='cut'&&mode==='prep'){drag=startCut(e);return}
  if(tool==='rotate'&&mode==='prep'){const d=startRing(e);if(d){drag=d;return}}
  if(tool==='block'&&mode==='prep'){blockerClick(e);drag=null;return}
  if(tool==='scale'&&mode==='prep'){const d=startHandle(e);if(d){drag=d;return}}
  const h=pick(e);if(!h){drag={kind:'orbit'};return}
  const o=h.object.userData.obj;select(o.id);stopPlay();
  if(o.locked&&tool!=='block'){drag={kind:'orbit'};return}
  if(tool==='face'){if(pieceLock(o)||h.object!==o.mesh){drag=null;return}const r=triNormal(o,h.faceIndex*9);if(r){layFlatNormal(o,r.n);setTool('move')}drag=null;return}
  if(tool==='move'){const p=bedPoint(e);drag={kind:'move',o,dx:p?o.px-(p.x+BED.x/2):0,dy:p?o.py-(BED.y/2-p.z):0}}
  if(tool==='scale'&&!pieceLock(o))drag={kind:'scale',o,f:1};
  if(tool==='rotate'){drag={kind:'orbit'};updateGizmo()}});
canvas.addEventListener('pointermove',e=>{
  if(!ptr.has(e.pointerId)){canvas.classList.toggle('over',!!(mode==='prep'&&e.pointerType==='mouse'&&pick(e)));return}
  const p=ptr.get(e.pointerId),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===2){const [a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;if(pinch0)view.r=clamp(view.r*pinch0/d,60,1400);pinch0=d;
    if(ptr.mid){const k=view.r/canvas.clientHeight*.8,ddx=mx-ptr.mid[0],ddy=my-ptr.mid[1],c=Math.cos(view.th),s=Math.sin(view.th);view.tx-=(ddx*c)*k;view.tz-=(-ddx*s)*k;view.ty=clamp(view.ty+ddy*k,0,BED.z)}ptr.mid=[mx,my];return}
  if(!drag)return;
  if(drag.kind==='cut'){moveCut(drag,e);return}
  if(drag.kind==='ring'){moveRing(drag,e);return}
  if(drag.kind==='handle'){moveHandle(drag,e);return}
  if(drag.kind==='orbit'){view.th-=dx*.006;view.ph=clamp(view.ph-dy*.006,.08,1.52)}
  else if(drag.kind==='move'){const q=bedPoint(e);if(q){const o=drag.o;o.px=q.x+BED.x/2+drag.dx;o.py=BED.y/2-q.z+drag.dy;placeMesh(o);refreshObjs()}}
  else if(drag.kind==='scale'){drag.f=clamp(Math.exp(-(e.clientY-p.y0)*.005),.05,20);drag.o.mesh.scale.setScalar(drag.f);fillScalePanel([drag.f,drag.f,drag.f]);canvas.style.cursor='ns-resize'}
  else if(drag.kind==='rotate'){let a=(e.clientX-p.x0)*.012;if(!e.shiftKey)a=Math.round(a/(Math.PI/12))*(Math.PI/12);drag.a=a;drag.o.mesh.rotation.y=a}});
function endDrag(e){ptr.delete(e.pointerId);pinch0=0;ptr.mid=null;if(!drag)return;const d=drag;drag=null;
  if(d.kind==='cut')return endCut(d);
  if(d.kind==='ring')return endRing(d);
  if(d.kind==='handle')return endHandle(d);
  if(d.kind==='move')changed();
  if(d.kind==='scale'){canvas.style.cursor='';if(d.f!==1){d.o.scale=d.o.scale.map(s=>s*d.f);rebake(d.o)}}
  if(d.kind==='rotate'&&d.a){const c=Math.cos(d.a),s=Math.sin(d.a);rotateObj(d.o,new THREE.Matrix3().set(c,-s,0,s,c,0,0,0,1))}}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('wheel',e=>{e.preventDefault();view.r=clamp(view.r*Math.exp(e.deltaY*.0012),60,1400)},{passive:false});
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select'))return;const o=selMat();if(!o)return;
  if(e.key==='Delete'||e.key==='Backspace'){removeObj(o);e.preventDefault()}});
$('viewBtn').onclick=()=>defaultView();
$('ovBtn').onclick=()=>{const b=$('ovBtn'),on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);objs.forEach(buildMesh)};

// transform panel
['px','py'].forEach((id,ax)=>$(id).addEventListener('change',()=>{const o=selMat(),v=parseFloat($(id).value);if(!o||!isFinite(v))return refreshObjs();if(ax)o.py=v;else o.px=v;placeMesh(o);refreshObjs();changed()}));
['dx','dy','dz'].forEach((id,ax)=>$(id).addEventListener('change',()=>{const o=selMat();if(!o)return;if(pieceLock(o))return refreshObjs();const want=parseFloat($(id).value),cur=o.size[ax];
  if(!(want>0)||!cur)return refreshObjs();const f=want/cur;if($('lock').checked)o.scale=o.scale.map(s=>s*f);else o.scale[ax]*=f;rebake(o)}));
$('sc').addEventListener('change',()=>{const o=selMat(),v=parseFloat($('sc').value);if(!o||!(v>0)||pieceLock(o))return refreshObjs();const f=v/100/o.scale[0];o.scale=o.scale.map(s=>s*f);rebake(o)});
document.querySelectorAll('[data-rot]').forEach(b=>b.onclick=()=>{const o=selMat();if(!o)return;const ax=b.dataset.rot,R=new THREE.Matrix3(),s=o.scale;
  if(ax==='x'){R.set(1,0,0,0,0,-1,0,1,0);o.scale=[s[0],s[2],s[1]]}
  if(ax==='y'){R.set(0,0,1,0,1,0,-1,0,0);o.scale=[s[2],s[1],s[0]]}
  if(ax==='z'){R.set(0,-1,0,1,0,0,0,0,1);o.scale=[s[1],s[0],s[2]]}
  rotateObj(o,R)});
$('layFlat').onclick=()=>{const o=selMat();if(o)autoFlat(o)};
$('multiply').onclick=()=>{const o=selMat();if(!o)return;const n=clamp(Math.round(+$('copies').value)||1,1,50);duplicate(o,n);if(objs.some(objOut))toast(tr('همهٔ نسخه‌ها در بستر جا نشدند؛ مدل‌های قرمز را کم یا کوچک کنید.'))};
$('fitBed').onclick=()=>{const o=selMat();if(!o||pieceLock(o))return;const m=2*Math.min(margin(),12)+2,f=Math.min((BED.x-m)/o.size[0],(BED.y-m)/o.size[1],BED.z/o.size[2]);o.scale=o.scale.map(s=>s*f);o.px=BED.x/2;o.py=BED.y/2;rebake(o)};
$('dropBed').onclick=()=>{const o=selMat();if(!o)return;o.px=BED.x/2;o.py=BED.y/2;placeMesh(o);refreshObjs();changed()};
$('resetTf').onclick=()=>{const o=selMat();if(!o||pieceLock(o))return;o.rot=new THREE.Matrix3();o.scale=[1,1,1];rebake(o)};
$('arrange').onclick=arrange;
$('bestOri').onclick=()=>{const o=selMat();if(!o)return;const r=bestOrient(o);if(r)toast(tr('بهترین جهت انتخاب شد.'))};
$('bestAll').onclick=()=>{if(!objs.length)return;objs.filter(o=>!o.piece).forEach(o=>bestOrient(o));arrange();defaultView();toast(tr('همهٔ مدل‌ها در بهترین جهت چیده شدند.'))};
$('clearAll').onclick=()=>{objs.forEach(o=>{scene.remove(o.mesh);if(!o.piece)o.mesh.geometry.dispose()});objs=[];sel=null;refreshObjs();changed()};
</script>
