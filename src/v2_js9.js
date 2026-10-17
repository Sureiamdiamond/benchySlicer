<script>
// ================= SCALE GIZMO (Cura-style axis handles) =================
// red = X, green = Y, blue = Z. Drag a handle to stretch along that axis (all axes when "uniform" is on).
const sGizmo=new THREE.Group();sGizmo.visible=false;scene.add(sGizmo);
const SAX=[{ax:0,col:'#e5484d',dir:new THREE.Vector3(1,0,0),cur:'ew-resize'},{ax:1,col:'#30a46c',dir:new THREE.Vector3(0,0,-1),cur:'nwse-resize'},{ax:2,col:'#3e7bfa',dir:new THREE.Vector3(0,1,0),cur:'ns-resize'}];
SAX.forEach(h=>{const mat=new THREE.MeshBasicMaterial({color:h.col,depthTest:false,transparent:true});
  const line=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1,8),mat),cube=new THREE.Mesh(new THREE.BoxGeometry(.11,.11,.11),mat),hit=new THREE.Mesh(new THREE.BoxGeometry(.24,.24,.24),new THREE.MeshBasicMaterial({visible:false}));
  line.position.y=.5;cube.position.y=1;hit.position.y=1;line.renderOrder=cube.renderOrder=11;hit.userData.h=h;
  const g=new THREE.Group();g.add(line,cube,hit);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),h.dir);h.g=g;h.hit=hit;h.mat=mat;sGizmo.add(g)});
function scaleCenter(o){const lift=(o.basePlate?o.basePlate.h:0)+(o.z||0);return new THREE.Vector3(o.px-BED.x/2,lift+(o.msize||o.size)[2]/2,-(o.py-BED.y/2))}
function updateScaleGizmo(){const o=selMat(),show=tool==='scale'&&mode==='prep';$('sclPanel').hidden=!show;const on=show&&!!o&&!o.piece;sGizmo.visible=on;
  if(show)fillScalePanel();if(!on)return;const s=o.msize||o.size,R=Math.max(14,Math.hypot(s[0],s[1],s[2])*.6);sGizmo.position.copy(scaleCenter(o));sGizmo.scale.setScalar(R)}
function fillScalePanel(f){const o=selMat();const dis=!o||o.piece;['sx','sy','sz','spx','spy','spz'].forEach(id=>$(id).disabled=dis);if(!o)return;
  const s=o.msize||o.size,base=o.size0||s;['x','y','z'].forEach((k,i)=>{const v=s[i]*(f?f[i]:1);if(document.activeElement!==$('s'+k))$('s'+k).value=v.toFixed(1);
    if(document.activeElement!==$('sp'+k))$('sp'+k).value=Math.round(o.scale[i]/(o.s0||1)*(f?f[i]:1)*100)})}
function handleHit(e){if(!sGizmo.visible)return null;const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const h=ray.intersectObjects(SAX.map(a=>a.hit),false);return h[0]?h[0].object.userData.h:null}
function axisParam(e,h,c){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  // closest point between the pointer ray and the axis line through the centre
  const d=h.dir,w0=ray.ray.origin.clone().sub(c),a=ray.ray.direction.dot(ray.ray.direction),b=ray.ray.direction.dot(d),cc=d.dot(d),dd=ray.ray.direction.dot(w0),ee=d.dot(w0),den=a*cc-b*b;
  if(Math.abs(den)<1e-6)return null;return (a*ee-b*dd)/den}
function startHandle(e){const h=handleHit(e);if(!h)return null;const o=selMat(),c=scaleCenter(o),t0=axisParam(e,h,c);if(t0==null||Math.abs(t0)<1e-3)return null;
  SAX.forEach(x=>x.mat.opacity=x===h?1:.3);return {kind:'handle',o,h,c,t0,f:[1,1,1]}}
function moveHandle(d,e){const t=axisParam(e,d.h,d.c);if(t==null)return;let k=clamp(t/d.t0,.05,20);
  if($('sclSnap').checked){const cur=d.o.scale[d.h.ax]/(d.o.s0||1)*100,next=Math.round(cur*k/5)*5;k=Math.max(5,next)/cur}
  const uni=$('sclUni').checked;d.f=uni?[k,k,k]:d.h.ax===0?[k,1,1]:d.h.ax===1?[1,k,1]:[1,1,k];
  d.o.mesh.scale.set(d.f[0],d.f[2],d.f[1]);fillScalePanel(d.f);canvas.style.cursor=d.h.cur}
function endHandle(d){SAX.forEach(x=>x.mat.opacity=1);canvas.style.cursor='';d.o.mesh.scale.set(1,1,1);if(d.f.every(v=>v===1))return;d.o.scale=d.o.scale.map((s,i)=>s*d.f[i]);rebake(d.o)}
canvas.addEventListener('pointermove',e=>{if(ptr.size||tool!=='scale'||e.pointerType!=='mouse')return;const h=handleHit(e);canvas.style.cursor=h?h.cur:''});
// panel inputs: millimetres or percent per axis
['x','y','z'].forEach((k,i)=>{
  $('s'+k).addEventListener('change',()=>{const o=selMat();if(!o||pieceLock(o))return fillScalePanel();const want=parseFloat($('s'+k).value),cur=(o.msize||o.size)[i];if(!(want>0)||!cur)return fillScalePanel();
    const f=want/cur;if($('sclUni').checked)o.scale=o.scale.map(s=>s*f);else o.scale[i]*=f;rebake(o)});
  $('sp'+k).addEventListener('change',()=>{const o=selMat();if(!o||pieceLock(o))return fillScalePanel();const want=parseFloat($('sp'+k).value)/100;if(!(want>0))return fillScalePanel();
    const f=want*(o.s0||1)/o.scale[i];if($('sclUni').checked)o.scale=o.scale.map(s=>s*f);else o.scale[i]*=f;rebake(o)})});
$('sclReset').onclick=()=>{const o=selMat();if(!o||pieceLock(o))return;const s0=o.s0||1;o.scale=[s0,s0,s0];rebake(o)};
$('sclUni').addEventListener('change',()=>{$('lock').checked=$('sclUni').checked});$('lock').addEventListener('change',()=>{$('sclUni').checked=$('lock').checked});

// ================= UNDO =================
// a snapshot of every model is kept after each change; Undo restores the previous one (also Ctrl+Z)
const undoStack=[];let restoring=false;
function snapObjs(){return objs.map(o=>({file:o.file,z:o.z||0,locked:!!o.locked,id:o.id,name:o.name,base:o.base,rot:o.rot.clone(),scale:o.scale.slice(),px:o.px,py:o.py,s0:o.s0,piece:!!o.piece,pb:o.pb,masks:o.masks,off:o.off&&o.off.slice(),zOff:o.zOff,size:o.size.slice(),msize:o.msize&&o.msize.slice(),geo:o.geo,vol:o.vol,basePlate:o.basePlate?{...o.basePlate}:null,blockers:(o.blockers||[]).map(b=>({...b}))}))}
const stateSig=s=>JSON.stringify(s.map(o=>[o.z,o.id,+o.px.toFixed(2),+o.py.toFixed(2),o.scale.map(v=>+v.toFixed(5)),Array.from(o.rot.elements).map(v=>+v.toFixed(4)),(o.masks||[]).length,o.basePlate&&[o.basePlate.shape,o.basePlate.h,o.basePlate.margin],o.blockers.length]));
function recordState(){if(restoring)return;const s=snapObjs(),g=stateSig(s);if(undoStack.length&&undoStack[undoStack.length-1].g===g)return;undoStack.push({s,g,sel});if(undoStack.length>50)undoStack.shift();$('undoBtn').disabled=undoStack.length<2}
function undo(){if(undoStack.length<2)return;undoStack.pop();const top=undoStack[undoStack.length-1];restoring=true;
  objs.forEach(o=>{scene.remove(o.mesh);if(!o.piece)o.mesh.geometry.dispose()});objs=[];
  for(const d of top.s){const o={...d,rot:d.rot.clone(),scale:d.scale.slice(),blockers:d.blockers.map(b=>({...b})),mesh:null,baseMesh:null,blkMeshes:null};
    if(o.piece){o.size=d.size.slice();mountPiece(o)}
    else{const bp=o.basePlate;o.basePlate=null;bakeObj(o);objs.push(o);if(bp){o.basePlate=bp;buildBaseMesh(o);sizeWithBase(o)}placeMesh(o)}
    if(o.blockers.length)drawBlockers(o)}
  sel=objs.some(o=>o.id===top.sel)?top.sel:(objs.length?objs[objs.length-1].id:null);restoring=false;$('undoBtn').disabled=undoStack.length<2;refreshObjs();changed();toast(tr('یک مرحله برگشت.'))}
$('undoBtn').onclick=undo;
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,select')){e.preventDefault();undo()}});
</script>
