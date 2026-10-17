<script>
// ================= GUIDE: help drawer for every part of the page + 2-second hover tips =================
const IC={
 upload:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
 box:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
 move:'<path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>',
 scale:'<rect x="3" y="11" width="10" height="10" rx="1"/><path d="M13 11l8-8M15 3h6v6"/>',
 rotate:'<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
 flat:'<path d="M3 20h18"/><path d="M6 16l6-10 6 10z"/>',
 cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
 block:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 20L20 4"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 overhang:'<path d="M4 20V8h10l6 6"/><path d="M14 8v-4"/>',
 printer:'<rect x="5" y="3" width="14" height="6" rx="1"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17v4h10v-4"/>',
 sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
 layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
 support:'<path d="M4 6h16"/><path d="M7 6v14M12 6v14M17 6v14"/>',
 tol:'<path d="M4 12h6M14 12h6"/><path d="M10 8v8M14 8v8"/>',
 slice:'<path d="M3 7h18M3 12h18M3 17h18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 save:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
 price:'<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/>',
 cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2-8H6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
 crop:'<path d="M6 2v16h16"/><path d="M2 6h16v16"/>',
 base:'<ellipse cx="12" cy="17" rx="9" ry="3"/><path d="M8 15V7h8v8"/>',
 play:'<path d="M7 4v16l13-8z"/>',
 views:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 check:'<path d="M5 12l5 5 9-10"/>',
};
const svg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]||IC.info}</svg>`;
// [group, selector, icon, [fa title, en title], [fa text, en text]]
const GUIDE=[
 ['top','#undoBtn','rotate',['بازگشت','Undo'],['آخرین تغییر روی مدل‌ها را برمی‌گرداند: جابه‌جایی، مقیاس، چرخش، حذف، افزودن، برش، کراپ، پایه و مسدودکننده. هر بار یک مرحله؛ میانبر Ctrl+Z.','Reverts the last change to the models: move, scale, rotate, delete, add, cut, crop, base and blockers. One step per press; shortcut Ctrl+Z.']],
 ['top','#themeBtn','sun',['تم روشن و تیره','Light / dark theme'],['بین حالت روشن و تیرهٔ صفحه جابه‌جا می‌شود. انتخاب شما در مرورگر می‌ماند.','Switches the page between light and dark. Your choice is remembered in this browser.']],
 ['top','#langBtn','globe',['زبان','Language'],['صفحه را فارسی یا انگلیسی می‌کند؛ جهت صفحه هم راست‌چین یا چپ‌چین می‌شود.','Switches the page between Persian and English, including right-to-left or left-to-right layout.']],
 ['top','.accwrap','palette',['رنگ پس‌زمینه','Background colour'],['فقط رنگ پس‌زمینهٔ صفحه را عوض می‌کند. بستر، پنل‌ها و دکمه‌ها همان رنگ قبلی را نگه می‌دارند.','Changes only the page background. The bed, panels and buttons keep their colours.']],
 ['top','.printer','printer',['پرینتر فعلی','Current printer'],['نام پرینتر، ابعاد بستر، قطر نازل و نوع فریمور را نشان می‌دهد. برای عوض کردنش به «تنظیمات پرینت ← پرینتر» بروید.','Shows the printer name, bed size, nozzle and firmware. Change it under "Print settings → Printer".']],
 ['models','#cModels .drop','upload',['افزودن مدل','Add models'],['فایل STL، 3MF یا OBJ را انتخاب کنید یا روی صفحه بیندازید. چند فایل را می‌شود با هم آورد. فایل‌ها فقط روی دستگاه خودتان پردازش می‌شوند.','Pick STL, 3MF or OBJ files or drop them on the page. Several at once is fine. Files are processed only on your device.']],
 ['models','#objList','list',['فهرست مدل‌ها','Model list'],['روی هر مدل بزنید تا انتخاب شود. با دکمهٔ کپی یک نسخهٔ دیگر می‌سازید و با سطل حذفش می‌کنید. مدل قرمز یعنی بیرون از محدودهٔ چاپ است.','Tap a model to select it. The copy button duplicates it and the bin deletes it. A red model is outside the print area.']],
 ['models','#bestAll','check',['جهت و چینش بهینهٔ همه','Best orientation & layout'],['همهٔ مدل‌ها را در جهتی می‌گذارد که کمترین ساپورت را بخواهند و بعد مرتب روی بستر می‌چیند.','Turns every model to the orientation that needs the least support, then arranges them on the bed.']],
 ['models','#arrange','views',['چیدمان خودکار','Auto arrange'],['مدل‌ها را بدون تغییر جهت، با فاصلهٔ مناسب کنار هم روی بستر می‌چیند.','Places the models side by side on the bed with safe spacing, without rotating them.']],
 ['models','#cSlice','slice',['برش و G-code','Slice & G-code'],['با هر تغییر، مدل خودکار برش می‌خورد (اگر «برش خودکار» روشن باشد). زمان پرینت، طول و وزن فیلامنت و سهم هر بخش از زمان اینجا دیده می‌شود.','With "Auto slice" on, every change re-slices automatically. Print time, filament length and weight, and the time per feature appear here.']],
 ['models','#saveBtn','save',['ذخیرهٔ G-code','Save G-code'],['فایل G-code آماده را ذخیره می‌کند تا روی کارت حافظه بریزید. اسم فایل انگلیسی است تا روی صفحهٔ پرینتر درست دیده شود.','Saves the finished G-code for the memory card. The file name is ASCII so the printer screen can show it.']],
 ['models','#cPrice','price',['قیمت سفارش','Order price'],['از زمان و وزن واقعی برش، هزینهٔ فیلامنت، برق، استهلاک، دستمزد (درصد)، آماده‌سازی، بسته‌بندی، ضریب خرابی، سود و مالیات را حساب می‌کند. مبلغ‌ها به هزار تومان وارد می‌شوند.','Uses the sliced time and weight to price filament, electricity, wear, labour (percent), setup, packaging, failure margin, profit and tax. Amounts are entered in thousand Toman.']],
 ['models','.orderbtn','cart',['سفارش چاپ','Order a print'],['صفحهٔ اینستاگرام BenchyPrint را باز می‌کند تا مدل را برای چاپ بفرستید.','Opens the BenchyPrint Instagram page so you can send the model for printing.']],
 ['models','#cStats','info',['مشخصات','Details'],['تعداد مدل‌ها، محدودهٔ اشغال‌شده، حجم، تعداد مثلث‌ها، تعداد لایه و دماها را نشان می‌دهد.','Shows model count, occupied area, volume, triangle count, layer count and temperatures.']],
 ['stage','.mode','eye',['آماده‌سازی و پیش‌نمایش','Prepare & preview'],['در «آماده‌سازی» مدل‌ها را می‌چینید. «پیش‌نمایش G-code» مسیر واقعی نازل را با رنگ هر بخش و اسلایدر لایه نشان می‌دهد.','In Prepare you arrange the models. G-code preview shows the real nozzle paths coloured by feature, with a layer slider.']],
 ['stage','#objOv','list',['فهرست مدل‌ها روی بستر','Object list on the bed'],['اسم هر فایل واردشده و مدل‌های داخلش را نشان می‌دهد؛ روی هر مدل بزنید تا انتخاب شود. با زدن عنوان، فهرست جمع یا باز می‌شود.','Shows each imported file and the models inside it; tap a model to select it. Tap the title to collapse or expand the list.']],
 ['stage','.views','views',['نماها','Views'],['دوربین را به نمای سه‌بعدی، جلو، پشت، بالا، پایین، چپ یا راست می‌برد.','Moves the camera to the 3D, front, back, top, bottom, left or right view.']],
 ['stage','#fitChip','check',['وضعیت محدودهٔ چاپ','Print area status'],['سبز یعنی همهٔ مدل‌ها جا می‌شوند. قرمز یعنی مدلی بیرون از بستر است یا برای اسکرت و بریم به لبه خیلی نزدیک است؛ حاشیهٔ لازم روی بستر سایه خورده است.','Green means everything fits. Red means a model is off the bed or too close to the edge for the skirt or brim; the needed border is shaded on the bed.']],
 ['stage','[data-tool=move]','move',['جابه‌جایی','Move'],['روی مدل بزنید و بکشید تا روی بستر جابه‌جا شود. در پنل کنار ابزار X، Y و Z دقیق را بنویسید؛ «قفل کردن مدل» جلوی جابه‌جایی تصادفی را می‌گیرد و با برداشتن «چسباندن مدل به بستر» می‌توانید مدل را در ارتفاع بگذارید. روی فضای خالی بکشید تا دید بچرخد.','Drag a model to move it. The side panel takes exact X, Y and Z; "Lock model" prevents accidental moves, and unticking "Drop model to bed" lets you raise the model. Drag empty space to orbit.']],
 ['stage','[data-tool=scale]','scale',['مقیاس','Scale'],['سه دستگیره روی مدل می‌آید: قرمز X، سبز Y و آبی Z. هر دستگیره را بکشید تا مدل در همان جهت کش بیاید؛ با «مقیاس یکنواخت» همهٔ جهت‌ها با هم عوض می‌شوند. پنل کنار ابزار اندازه به میلی‌متر و درصد را نشان می‌دهد و می‌شود عدد دقیق نوشت.','Three handles appear: red X, green Y, blue Z. Drag one to stretch the model that way; with "Uniform scaling" all axes change together. The side panel shows and edits size in mm and percent.']],
 ['stage','[data-tool=rotate]','rotate',['چرخش','Rotate'],['سه حلقه دور مدل ظاهر می‌شود: قرمز X، سبز Y و آبی Z. حلقه را بکشید؛ پله‌ها ۱۵ درجه‌اند. پنل کنار ابزار زاویهٔ دقیق، خواباندن و بهترین جهت دارد.','Three rings appear: red X, green Y, blue Z. Drag a ring; steps are 15°. The side panel has exact angles, lay flat and best orientation.']],
 ['stage','[data-tool=face]','flat',['خواباندن روی سطح','Lay flat on face'],['روی هر سطح مدل بزنید تا همان سطح کف بستر قرار بگیرد.','Tap any face of the model to put that face on the bed.']],
 ['stage','[data-tool=block]','block',['مسدودکنندهٔ ساپورت','Support blocker'],['روی جایی از مدل بزنید تا جعبهٔ قرمزی گذاشته شود؛ داخل آن ساپورت ساخته نمی‌شود. برای حذف دوباره روی جعبه بزنید.','Tap the model to place a red box where no support is generated. Tap the box again to remove it.']],
 ['stage','[data-tool=cut]','cut',['خط برش','Cut line'],['وقتی «برش و تقسیم مدل» روشن باشد ظاهر می‌شود. دید به بالا می‌رود و روی مدل خط می‌کشید تا از همان‌جا برش بخورد.','Appears when "Cut & split model" is on. The view switches to top and you draw where to cut.']],
 ['stage','#ovBtn','overhang',['نمایش اورهنگ','Show overhangs'],['سطح‌هایی که شیبشان از زاویهٔ اورهنگ بیشتر است و ساپورت لازم دارند قرمز می‌شوند.','Faces steeper than the overhang angle, which need support, turn red.']],
 ['stage','#layerbar','play',['لایه‌ها در پیش‌نمایش','Layers in preview'],['با اسلایدر تا هر لایه جلو و عقب بروید؛ دکمهٔ پخش چاپ را لایه به لایه نشان می‌دهد. کنار صفحه می‌توانید هر نوع مسیر را خاموش یا روشن کنید.','Scrub to any layer with the slider; Play shows the print layer by layer. The side list turns each path type on or off.']],
 ['settings','#printerSel','printer',['پرینتر','Printer'],['پرینتر را از فهرست برندها انتخاب کنید یا «پرینتر سفارشی» را بزنید و ابعاد بستر، نازل، فریمور، شتاب و سرعت را خودتان وارد کنید.','Choose a printer by brand, or pick "Custom printer" and enter bed size, nozzle, firmware, acceleration and speed.']],
 ['settings','#profSel','sliders',['پروفایل تنظیمات','Settings profile'],['تنظیمات فعلی را با یک اسم ذخیره کنید، بعداً بارگذاری کنید یا به‌صورت فایل خروجی بگیرید و وارد کنید.','Save the current settings under a name, load them later, or export and import them as a file.']],
 ['settings','#panRec','layers',['تنظیمات پیشنهادی','Recommended settings'],['مهم‌ترین گزینه‌ها: کیفیت (ارتفاع لایه)، پروفایل سرعت، فیلامنت و رنگ مدل، درصد پرکننده، ساپورت، چسبندگی به بستر و حفظ لقی قطعات.','The key options: quality (layer height), speed profile, filament and model colour, infill, support, bed adhesion and part clearance.']],
 ['settings','#tabCus','sliders',['تنظیمات سفارشی','Custom settings'],['همهٔ تنظیمات Cura به تفکیک دسته: کیفیت، دیواره‌ها، بالا و پایین، پرکننده، متریال، سرعت، رتراکشن، خنک‌کاری، ساپورت، ابعاد و تلرانس، چسبندگی، حالت‌های ویژه و G-code.','Every Cura-style setting by group: quality, walls, top/bottom, infill, material, speed, retraction, cooling, support, dimensions and tolerance, adhesion, special modes and G-code.']],
 ['settings','#rSupOpts','support',['ساپورت','Support'],['معمولی یا درختی، فقط از روی بستر یا همه‌جا. «کم کردن ساپورت» تنظیمات را برای مصرف کمتر عوض می‌کند و اندازهٔ مسدودکننده همین‌جاست.','Normal or tree, touching the bed or everywhere. "Less support" switches to lighter settings, and the blocker size is set here.']],
 ['settings','#tfCard','box',['مدل انتخاب‌شده','Selected model'],['موقعیت روی بستر، ابعاد، مقیاس، حفظ تناسب، حفظ لقی سوراخ و پازل، چرخش ۹۰ درجه، بهترین جهت، تکثیر و بازنشانی.','Position, size, scale, proportions, hole and puzzle clearance, 90° turns, best orientation, multiply and reset.']],
 ['settings','#cutOn','cut',['برش و کانکتور','Cut & connectors'],['کلید را روشن کنید تا بتوانید مدل را در X، Y، افقی یا با خط دلخواه برش بزنید. کانکتور پازلی، دم‌چلچله، زبانه، پین یا دوبل اضافه می‌شود و مدل بزرگ را خودکار تقسیم می‌کند.','Turn it on to cut along X, Y, horizontally or along a drawn line. Adds puzzle, dovetail, key, peg or dowel connectors and can auto-split large models.']],
 ['settings','#spTabs [data-v=crop]','crop',['کراپ','Crop'],['با سه اسلایدر یک جعبه می‌سازید؛ فقط بخشی از مدل که داخل جعبه است می‌ماند.','Three sliders define a box; only the part of the model inside it is kept.']],
 ['settings','#spTabs [data-v=base]','base',['پایه برای فیگور','Figure base'],['زیر مدل پایهٔ دایره، چهارگوش، شش‌ضلعی یا هم‌شکل خود مدل می‌گذارد؛ ارتفاع، حاشیه و پخ لبه را تعیین کنید.','Adds a round, rectangular, hexagonal or outline-shaped base under the model, with height, margin and chamfer.']],
];
const GROUPS_G={top:['بالای صفحه','Top bar'],models:['مدل‌ها و خروجی','Models & output'],stage:['بستر و ابزارها','Bed & tools'],settings:['تنظیمات و برش','Settings & cutting']};
const L=a=>lang==='en'?a[1]:a[0];
function buildGuide(){const box=$('help');let h=`<div class="hhead"><h3>${lang==='en'?'Guide':'راهنما'}</h3><button class="btn sm" type="button" id="helpClose">${lang==='en'?'Close':'بستن'}</button></div><p class="hint" style="margin:0 0 6px">${lang==='en'?'Tap an item to see where it is. Hover over any part of the page for 2 seconds to see its tip.':'روی هر مورد بزنید تا جایش را روی صفحه ببینید. روی هر بخش صفحه ۲ ثانیه نگه دارید تا توضیحش بیاید.'}</p>`;
  for(const g of Object.keys(GROUPS_G)){h+=`<div class="hgrp">${L(GROUPS_G[g])}</div>`;GUIDE.forEach((it,i)=>{if(it[0]!==g)return;h+=`<button type="button" class="hitem" data-gi="${i}"><span class="hic">${svg(it[2])}</span><span><b>${L(it[3])}</b><span>${L(it[4])}</span></span></button>`})}
  box.innerHTML=h;$('helpClose').onclick=()=>toggleHelp(false);
  box.querySelectorAll('.hitem').forEach(b=>b.onclick=()=>showPart(+b.dataset.gi));
  GUIDE.forEach((it,i)=>document.querySelectorAll(it[1]).forEach(el=>el.dataset.guide=i))}
function toggleHelp(on){$('help').hidden=!on;$('helpBtn').setAttribute('aria-pressed',on);$('helpTop').setAttribute('aria-pressed',on)}
function showPart(i){const it=GUIDE[i],el=document.querySelector(it[1]);toggleHelp(false);if(!el)return;
  if(it[0]==='stage'&&mode!=='prep'&&!el.closest('#layerbar'))setMode('prep');
  if(it[1]==='#layerbar'&&prev)setMode('prev');
  if(it[1].startsWith('#spTabs')||it[1]==='#cutOn'){$('splitCard').open=true;if(it[1].includes('crop'))spTab('crop');else if(it[1].includes('base'))spTab('base');else spTab('split')}
  if(it[1]==='#tabCus')$('tabCus').click();if(it[1]==='#panRec'||it[1]==='#rSupOpts'){$('tabRec').click();if(it[1]==='#rSupOpts'){cfg.sup=true;onCfg('sup',true)}}
  const card=el.closest('details');if(card&&!card.open)card.open=true;
  const tgt=el.hidden?el.closest(':not([hidden])'):el;tgt.scrollIntoView({behavior:'smooth',block:'center'});
  tgt.classList.remove('spot');void tgt.offsetWidth;tgt.classList.add('spot');setTimeout(()=>tgt.classList.remove('spot'),2600);showTip(i,tgt,true)}
// hover tips: after 2 s over any guided element
let tipTimer=0,tipEl=null;
function showTip(i,el,sticky){const it=GUIDE[i],t=$('gtip');t.innerHTML=`<span class="hic">${svg(it[2])}</span><span><b>${L(it[3])}</b><span>${L(it[4])}</span></span>`;t.hidden=false;
  const r=el.getBoundingClientRect(),w=Math.min(300,innerWidth-24);t.style.width=w+'px';let x=r.left+r.width/2-w/2;x=clamp(x,12,innerWidth-w-12);let y=r.bottom+10;t.style.left=x+'px';t.style.top=y+'px';
  const th=t.getBoundingClientRect().height;if(y+th>innerHeight-12){y=Math.max(12,r.top-th-10);t.style.top=y+'px'}
  clearTimeout(showTip.h);if(sticky)showTip.h=setTimeout(()=>t.hidden=true,4000)}
document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const el=e.target.closest('[data-guide]');if(el===tipEl)return;tipEl=el;clearTimeout(tipTimer);$('gtip').hidden=true;
  if(el)tipTimer=setTimeout(()=>{if(tipEl===el)showTip(+el.dataset.guide,el)},2000)});
document.addEventListener('pointerdown',()=>{clearTimeout(tipTimer);$('gtip').hidden=true});
$('helpBtn').onclick=()=>toggleHelp($('help').hidden);$('helpTop').onclick=()=>toggleHelp($('help').hidden);
</script>
