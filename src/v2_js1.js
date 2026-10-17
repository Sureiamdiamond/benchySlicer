<script>
const $=id=>document.getElementById(id);
const fa=(n,d=0)=>Number(n).toLocaleString(lang==='en'?'en-US':'fa-IR',{maximumFractionDigits:d,minimumFractionDigits:d});
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
// yield to the UI through a MessageChannel (setTimeout gets throttled in background tabs)
const _ch=new MessageChannel(),_q=[];_ch.port1.onmessage=()=>{const f=_q.shift();if(f)f()};
const nextFrame=()=>new Promise(r=>{_q.push(r);_ch.port2.postMessage(0)});
let _lastYield=0;const shouldYield=()=>{const t=performance.now();if(t-_lastYield>40){_lastYield=t;return true}return false};
function toast(msg,ms=3200){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,ms)}

// ================= PRINTER, MATERIALS, PROFILES =================
const BED={x:220,y:220,z:250};
const FIL_AREA=Math.PI*0.875*0.875;
const MATS={
  pla:{n:'PLA',rho:1.24,flow:15,vmax:Infinity,col:'#FF7A2F',tNoz:200,tBed:60,fan:100},
  plap:{n:'PLA+',rho:1.23,flow:14,vmax:Infinity,col:'#f2f0ec',tNoz:215,tBed:60,fan:100},
  petg:{n:'PETG',rho:1.27,flow:10,vmax:Infinity,col:'#3aa0ff',tNoz:235,tBed:75,fan:40},
  abs:{n:'ABS',rho:1.04,flow:12,vmax:Infinity,col:'#ffd23f',tNoz:245,tBed:100,fan:0},
  tpu:{n:'TPU',rho:1.21,flow:3.6,vmax:30,col:'#3ccf91',tNoz:225,tBed:50,fan:60},
};
// speeds mm/s. "cura" mirrors Cura's Creality defaults (speed_print 50, walls & top/bottom 25, first layer 20, accel 500, jerk 8).
const PROFILES={
  cura:{n:'Cura پیش‌فرض',vOuter:25,vInner:25,vInfill:50,vSkin:25,vSupport:25,vIface:25,vFirst:20,vTravel:150,vTravel0:100,acc:500,jerk:8},
  mid:{n:'متوسط',vOuter:60,vInner:90,vInfill:120,vSkin:60,vSupport:80,vIface:60,vFirst:30,vTravel:200,vTravel0:120,acc:1500,jerk:8},
  fast:{n:'سریع',vOuter:100,vInner:150,vInfill:200,vSkin:120,vSupport:150,vIface:100,vFirst:50,vTravel:250,vTravel0:150,acc:2500,jerk:10},
};
const QUALITY=[[0.12,'فوق‌العاده'],[0.16,'دقیق'],[0.2,'استاندارد'],[0.28,'سریع']];
const START_G=`; Ender-3 V3 SE start
M220 S100 ; reset feedrate
M221 S100 ; reset flowrate
M140 S{bed}
M104 S{nozzle}
G28 ; home all axes
M420 S1 ; load saved bed mesh
M190 S{bed}
M109 S{nozzle}
M82
G92 E0
G1 Z2.0 F3000
G1 X0.8 Y20 Z0.28 F5000.0 ; purge line
G1 X0.8 Y145.0 Z0.28 F1500.0 E15
G1 X1.2 Y145.0 Z0.28 F5000.0
G1 X1.2 Y20 Z0.28 F1500.0 E30
G92 E0
G1 Z2.0 F3000`;
const END_G=`G91 ; relative positioning
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
const DEF={mat:'pla',prof:'cura',lh:0.2,lh0:0.2,lw:0.4,walls:2,wallOrder:'inner',seam:'back',top:4,bottom:4,inf:20,infPat:'cubic',
  tNoz:200,tBed:60,flow:100,...PROFILES.cura,
  retract:true,retDist:0.8,retSpeed:40,retMin:1.5,comb:true,zhop:0,
  fan:100,fanLayer:3,minLayerTime:10,minSpeed:10,
  sup:false,supType:'normal',supWhere:'all',supAng:45,supPat:'zigzag',supDens:20,supZ:0.2,supXY:0.8,supIface:true,supIfaceH:0.8,supIfDens:33,supIfPat:'grid',supMinArea:1.5,treeAngle:40,treeTip:0.8,treeGrow:5,
  ironing:false,ironFlow:10,ironSpacing:0.1,ironSpeed:30,fuzzy:false,fuzzyT:0.3,fuzzyD:0.8,slowLayers:2,tNoz0:0,tBed0:0,flow0:100,infOverlap:10,skinOverlap:5,noHoles:false,raftGap:0.3,retLayer:false,fan0:0,
  printer:'ender3v3se',bx:220,by:220,bz:250,nozzle:0.4,cAcc:2500,cVmax:250,cFlavor:'marlin',cName:'',col:'',xyOff:0,holeOff:0,keepTol:true,tolGap:0.2,adh:'skirt',skirtLoops:3,skirtDist:5,brimW:8,raftMargin:3,vase:false,startG:START_G,endG:END_G,
  priceK:1200,elecK:2,wearK:15,laborPct:20,setupK:0,packK:10,fail:10,profit:40,tax:0,round:5000,kf:1};
let cfg={...DEF};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('slicer-cfg2')||'{}'))}catch(e){}
const saveCfg=()=>{try{localStorage.setItem('slicer-cfg2',JSON.stringify(cfg))}catch(e){}};

// ================= THEME =================
function curTheme(){const t=document.documentElement.dataset.theme;if(t)return t;return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}
try{const t=localStorage.getItem('slicer-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
$('themeBtn').onclick=()=>{const t=curTheme()==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('slicer-theme',t)}catch(e){}applyTheme()};
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>applyTheme());

// ================= THREE SCENE =================
// three.js frame: X = printer X − 110, Y = printer Z (up), Z = −(printer Y − 110). Units are millimetres.
const canvas=$('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,1,4000);
const hemi=new THREE.HemisphereLight('#dfe6ff','#2a1a10',.6);scene.add(hemi);
const key=new THREE.DirectionalLight('#ffffff',1.0);key.position.set(160,320,220);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:10,far:900});key.shadow.bias=-0.0005;scene.add(key);
const rim=new THREE.DirectionalLight('#ff9a5a',.35);rim.position.set(-200,120,-180);scene.add(rim);
const toThree=(x,y,z)=>[x-BED.x/2,z,-(y-BED.y/2)];

const LOGO_IMG=document.querySelector('.brand img');
function tinted(img,color){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return c}
const plateCanvas=document.createElement('canvas');plateCanvas.width=plateCanvas.height=2048;
const plateTex=new THREE.CanvasTexture(plateCanvas);plateTex.encoding=THREE.sRGBEncoding;plateTex.anisotropy=8;
function paintPlate(){const g=plateCanvas.getContext('2d'),S=2048,light=css('--engrave')==='light',px=S/BED.x,py=S/BED.y;
  g.fillStyle=css('--plate')||'#2a2b2f';g.fillRect(0,0,S,S);
  let r=7;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
  for(let i=0;i<(light?0:60000);i++){g.fillStyle=light?`rgba(120,105,85,${rnd()*.08})`:`rgba(${200+rnd()*55},${180+rnd()*40},120,${rnd()*.06})`;g.fillRect(rnd()*S,rnd()*S,3,3)}
  for(let mm=0;mm<=BED.x;mm+=10){const p=mm*px,major=mm%50===0;g.strokeStyle=css(major?'--plategrid2':'--plategrid');g.lineWidth=(major?4:2.5)*(light?1.6:1);g.beginPath();g.moveTo(p,0);g.lineTo(p,S);g.stroke()}
  for(let mm=0;mm<=BED.y;mm+=10){const p=S-mm*py,major=mm%50===0;g.strokeStyle=css(major?'--plategrid2':'--plategrid');g.lineWidth=(major?4:2.5)*(light?1.6:1);g.beginPath();g.moveTo(0,p);g.lineTo(S,p);g.stroke()}
  const mg=typeof margin==='function'?Math.min(margin(),12):0;if(mg>0){g.fillStyle=light?'rgba(90,80,70,.16)':'rgba(0,0,0,.35)';const mx=mg*px,my=mg*py;g.fillRect(0,0,S,my);g.fillRect(0,S-my,S,my);g.fillRect(0,0,mx,S);g.fillRect(S-mx,0,mx,S)}
  const pn=typeof curPrinter==='function'?curPrinter().name:'Ender-3 V3 SE';
  g.fillStyle=css('--hot');g.globalAlpha=light?.75:.6;g.font=`bold ${Math.round(54*Math.min(1,220/BED.x))*1}px monospace`;g.save();g.scale(1,BED.x/BED.y);g.fillText(`${pn} · ${BED.x} × ${BED.y}`,60,(S-50)*BED.y/BED.x);g.restore();g.globalAlpha=1;
  if(LOGO_IMG.complete&&LOGO_IMG.naturalWidth){const w=560*220/BED.x*0.6,h=w*LOGO_IMG.naturalHeight/LOGO_IMG.naturalWidth*BED.x/BED.y,x0=S-w-70,y0=S-h-120;
    g.globalAlpha=light?.6:.85;g.drawImage(tinted(LOGO_IMG,light?'#868d98':'#000000'),x0+4,y0+4,w,h);
    g.globalAlpha=light?.9:.5;g.drawImage(tinted(LOGO_IMG,light?'#ffffff':'#b4b7bf'),x0-2,y0-2,w,h);
    g.globalAlpha=light?.95:.75;g.drawImage(tinted(LOGO_IMG,light?'#d2d7dd':'#4a4c53'),x0,y0,w,h);g.globalAlpha=1;
    // printer brand wordmark, engraved beside the Benchy Print logo and smaller than it
    const pr=typeof curPrinter==='function'?curPrinter():null,bimg=pr&&BRAND_IMG[pr.brand];
    if(bimg&&bimg.complete&&bimg.naturalWidth){ // official brand logo, engraved beside Benchy Print and smaller
      let bh=h*.52,bw=bh*bimg.naturalWidth/bimg.naturalHeight*BED.y/BED.x;if(bw>w*.95){bh*=w*.95/bw;bw=w*.95}const bx=x0-40-bw,by=y0+h-bh;
      g.globalAlpha=light?.6:.85;g.drawImage(tinted(bimg,light?'#868d98':'#000000'),bx+4,by+4,bw,bh);
      g.globalAlpha=light?.9:.5;g.drawImage(tinted(bimg,light?'#ffffff':'#b4b7bf'),bx-2,by-2,bw,bh);
      g.globalAlpha=light?.95:.75;g.drawImage(tinted(bimg,light?'#d2d7dd':'#4a4c53'),bx,by,bw,bh);g.globalAlpha=1}
    else if(pr&&pr.id==='custom'&&cfg.cName){const mark=cfg.cName,fs=Math.round(h*.3*BED.y/BED.x),cy=(y0+h*.62)*BED.y/BED.x;g.save();g.scale(1,BED.x/BED.y);g.font=`900 ${fs}px "Vazirmatn",Arial,sans-serif`;g.textAlign='right';g.textBaseline='middle';
      const tx=x0-40;const pass=(c,a2,dx,dy)=>{g.globalAlpha=a2;g.fillStyle=c;g.fillText(mark,tx+dx,cy+dy)};
      pass(light?'#868d98':'#000000',light?.6:.85,4,4);pass(light?'#ffffff':'#b4b7bf',light?.9:.5,-2,-2);pass(light?'#d2d7dd':'#4a4c53',light?.95:.75,0,0);g.restore();g.globalAlpha=1}}
  plateTex.needsUpdate=true}
const BRAND_IMG={};for(const [k,src] of Object.entries(__BRANDS__)){const im=new Image();im.onload=()=>paintPlate();im.src=src;BRAND_IMG[k]=im}
if(!LOGO_IMG.complete)LOGO_IMG.addEventListener('load',paintPlate);
const plateSide=new THREE.MeshStandardMaterial({color:'#1a1b1f',roughness:.6});
const plate=new THREE.Mesh(new THREE.BoxGeometry(BED.x,4,BED.y),[plateSide,plateSide,new THREE.MeshStandardMaterial({map:plateTex,roughness:.85,metalness:.1}),plateSide,plateSide,plateSide]);
plate.position.y=-2;plate.receiveShadow=true;scene.add(plate);
const volBox=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BED.x,BED.z,BED.y)),new THREE.LineBasicMaterial({color:'#FF7A2F',transparent:true,opacity:.18}));
volBox.position.y=BED.z/2;scene.add(volBox);
const nozzle=new THREE.Group();{
  const m=new THREE.MeshStandardMaterial({color:'#b9bec7',metalness:.8,roughness:.3}),brass=new THREE.MeshStandardMaterial({color:'#d4a72c',metalness:.9,roughness:.25});
  const block=new THREE.Mesh(new THREE.BoxGeometry(16,10,20),m);block.position.y=14;
  const tip=new THREE.Mesh(new THREE.ConeGeometry(3.4,8,24),brass);tip.rotation.x=Math.PI;tip.position.y=4;
  const sink=new THREE.Mesh(new THREE.CylinderGeometry(7,7,18,24),new THREE.MeshStandardMaterial({color:'#5d6470',metalness:.6,roughness:.4}));sink.position.y=28;
  const glow=new THREE.PointLight('#ff7a2f',1.2,40);glow.position.y=1;nozzle.add(block,tip,sink,glow)}
nozzle.visible=false;scene.add(nozzle);
const uLH={value:0.2};
const modelCol=()=>cfg.col||MATS[cfg.mat].col;
function modelMaterial(){const m=new THREE.MeshStandardMaterial({color:modelCol(),roughness:.5,metalness:.05,vertexColors:true,transparent:true,opacity:1});
  m.onBeforeCompile=sh=>{sh.uniforms.uLH=uLH;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vWY;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWY=(modelMatrix*vec4(transformed,1.0)).y;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vWY;uniform float uLH;').replace('#include <color_fragment>','#include <color_fragment>\nfloat lay=fract(vWY/uLH);diffuseColor.rgb*=0.82+0.18*smoothstep(0.0,0.35,lay)*smoothstep(1.0,0.65,lay);')};
  return m}

// orbit camera
const view={th:-0.55,ph:1.05,r:420,tx:0,ty:40,tz:0};
function placeCam(){const s=Math.sin(view.ph);camera.position.set(view.tx+view.r*s*Math.sin(view.th),view.ty+view.r*Math.cos(view.ph),view.tz+view.r*s*Math.cos(view.th));camera.lookAt(view.tx,view.ty,view.tz)}
function defaultView(){let h=40,span=60;if(objs.length){const b=sceneBounds();h=b.z;span=Math.max(b.x1-b.x0,b.y1-b.y0,h)}
  Object.assign(view,{th:-0.55,ph:1.05,r:clamp(span*3+170,240,Math.max(760,Math.max(BED.x,BED.y)*2.6)),tx:0,ty:Math.min(h*.45,120),tz:0})}
function applyTheme(){const dark=curTheme()==='dark';if(typeof applyBg==='function')applyBg();$('themeTxt').textContent=tr(dark?'تیره':'روشن');
  const sc=css('--scene');scene.background=new THREE.Color(sc);scene.fog=new THREE.Fog(sc,900,2200);
  plateSide.color.set(dark?'#1a1b1f':'#d5d8de');plate.material[2].color.set(dark?'#ffffff':'#c4c8cf');hemi.intensity=dark?.6:.85;paintPlate();if(prev)colorPreview();if(objs.length)refreshObjs()}
function resize(){const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(canvas.parentElement);
</script>
