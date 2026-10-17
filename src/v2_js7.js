<script>
// ================= ROTATE GIZMO (Cura-style rings) =================
// red ring = printer X, green = printer Y, blue = printer Z. Drag a ring to rotate around that axis; snaps to 15° unless "snap" is off.
const C3=new THREE.Matrix4().set(1,0,0,0, 0,0,1,0, 0,-1,0,0, 0,0,0,1),C3i=C3.clone().invert(); // printer → three.js frame
const gizmo=new THREE.Group();gizmo.visible=false;scene.add(gizmo);
const RING=[{ax:'x',col:'#e5484d',axis:new THREE.Vector3(1,0,0)},{ax:'y',col:'#30a46c',axis:new THREE.Vector3(0,0,-1)},{ax:'z',col:'#3e7bfa',axis:new THREE.Vector3(0,1,0)}];
RING.forEach(r=>{const vis=new THREE.Mesh(new THREE.TorusGeometry(1,.012,8,96),new THREE.MeshBasicMaterial({color:r.col,depthTest:false,transparent:true}));
  const hit=new THREE.Mesh(new THREE.TorusGeometry(1,.06,6,48),new THREE.MeshBasicMaterial({visible:false}));
  const g=new THREE.Group();g.add(vis,hit);if(r.ax==='x')g.rotation.y=Math.PI/2;else if(r.ax==='z')g.rotation.x=Math.PI/2;
  vis.renderOrder=10;hit.userData.ring=r;r.g=g;r.vis=vis;r.hit=hit;gizmo.add(g)});
function gizmoCenter(o){const lift=(o.basePlate?o.basePlate.h:0)+(o.z||0);return new THREE.Vector3(o.px-BED.x/2,lift+(o.msize||o.size)[2]/2,-(o.py-BED.y/2))}
function updateGizmo(){if(typeof updateScaleGizmo==='function')updateScaleGizmo();if(typeof fillMovePanel==='function')fillMovePanel();const o=selMat(),on=!!o&&tool==='rotate'&&mode==='prep'&&!o.piece;gizmo.visible=on;$('rotPanel').hidden=!(tool==='rotate'&&mode==='prep');if(!on)return;
  const s=o.size,R=Math.max(12,Math.hypot(s[0],s[1],s[2])*.55);gizmo.position.copy(gizmoCenter(o));gizmo.scale.setScalar(R)}
function ringHit(e){if(!gizmo.visible)return null;const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const h=ray.intersectObjects(RING.map(r=>r.hit),false);return h[0]?h[0].object.userData.ring:null}
function ringAngle(e,ring,center){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(ring.axis,center),p=new THREE.Vector3();if(!ray.ray.intersectPlane(pl,p))return null;
  const v=p.sub(center),u=new THREE.Vector3().crossVectors(ring.axis,Math.abs(ring.axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),w=new THREE.Vector3().crossVectors(ring.axis,u);
  return Math.atan2(v.dot(w),v.dot(u))}
function startRing(e){const ring=ringHit(e);if(!ring)return null;const o=selMat(),c=gizmoCenter(o),a0=ringAngle(e,ring,c);if(a0==null)return null;
  ring.vis.material.opacity=1;RING.forEach(r=>{if(r!==ring)r.vis.material.opacity=.25});return {kind:'ring',o,ring,c,a0,a:0,pos0:o.mesh.position.clone()}}
function moveRing(d,e){const a1=ringAngle(e,d.ring,d.c);if(a1==null)return;let a=a1-d.a0;a=Math.atan2(Math.sin(a),Math.cos(a));
  if($('rotSnap').checked&&!e.shiftKey)a=Math.round(a/(Math.PI/12))*(Math.PI/12);d.a=a;
  const q=new THREE.Quaternion().setFromAxisAngle(d.ring.axis,a),piv=d.c.clone().sub(d.pos0);d.o.mesh.quaternion.copy(q);d.o.mesh.position.copy(d.pos0).add(piv).sub(piv.clone().applyQuaternion(q));
  $('tip').firstElementChild.textContent=`${d.ring.ax.toUpperCase()} ${fa(Math.round(a*180/Math.PI))}°`}
function endRing(d){RING.forEach(r=>r.vis.material.opacity=1);d.o.mesh.quaternion.identity();placeMesh(d.o);if(!d.a){setTool('rotate');return}
  rotateAbout(d.o,d.ring.ax,d.a);setTool('rotate')}
function rotateAbout(o,ax,a){const ring=RING.find(r=>r.ax===ax),M3=new THREE.Matrix4().makeRotationAxis(ring.axis,a),Mp=C3i.clone().multiply(M3).multiply(C3);
  rotateObj(o,new THREE.Matrix3().setFromMatrix4(Mp));updateGizmo()}
['x','y','z'].forEach(ax=>$('rot'+ax.toUpperCase()).addEventListener('change',()=>{const o=selMat(),el=$('rot'+ax.toUpperCase()),v=+el.value;el.value=0;if(!o||!v||pieceLock(o))return;rotateAbout(o,ax,v*Math.PI/180)}));
$('rotReset').onclick=()=>$('resetTf').click();$('rotFlat').onclick=()=>$('layFlat').click();$('rotFace').onclick=()=>setTool('face');$('rotBest').onclick=()=>$('bestOri').click();

// ================= SUPPORT BLOCKERS =================
// a box on the model where no support is generated (stored on the object, so it moves with it)
const blkMat=new THREE.MeshBasicMaterial({color:'#e5484d',transparent:true,opacity:.35,depthWrite:false});
function drawBlockers(o){(o.blkMeshes||[]).forEach(m=>{o.mesh.remove(m);m.geometry.dispose()});o.blkMeshes=[];
  const c=o.piece?o.off:[0,0];for(const b of o.blockers||[]){const m=new THREE.Mesh(new THREE.BoxGeometry(b.s,b.s,b.s),blkMat);m.position.set(b.dx,b.z,-b.dy);m.userData.blocker=b;m.userData.obj=o;
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:'#e5484d'}));m.add(e);o.mesh.add(m);o.blkMeshes.push(m)}}
function blockerClick(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects(objs.map(o=>o.mesh),true);if(!hits.length)return;const h=hits[0],ob=h.object.userData.obj;if(!ob)return;
  if(h.object.userData.blocker){ob.blockers=ob.blockers.filter(b=>b!==h.object.userData.blocker);drawBlockers(ob);changed();return}
  const lp=ob.mesh.worldToLocal(h.point.clone()),s=clamp(+$('blkSize').value||10,2,80);ob.blockers=(ob.blockers||[]).concat([{dx:lp.x,dy:-lp.z,z:lp.y,s}]);sel=ob.id;drawBlockers(ob);refreshObjs();changed();
  toast(tr('مسدودکننده اضافه شد؛ برای حذف دوباره روی آن بزنید.'))}
$('blkClear').onclick=()=>{const o=selMat();if(!o)return;o.blockers=[];drawBlockers(o);changed()};
// one-tap "less support": tree supports, steeper allowed overhang, lighter infill of the support
$('lessSup').onclick=()=>{Object.assign(cfg,{sup:true,supType:'tree',supAng:55,supDens:10,supIfaceH:0.6});onCfg('supType',true);toast(tr('حالت کم‌ساپورت: درختی، زاویهٔ ۵۵°، تراکم ۱۰٪.'))};
</script>
