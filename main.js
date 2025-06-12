// ----- CONSTANTS -----
const packages = {
  "24": { weekly: 2, total: 24, duration: 40, days: ["Saturday","Wednesday"] },
  "36": { weekly: 3, total: 36, duration: 40, days: ["Saturday","Monday","Thursday"] },
  "48": { weekly: 4, total: 48, duration: 40, days: ["Saturday","Monday","Wednesday","Friday"] },
  "psychology": { weekly: 1, total: 0, duration: 60, days: ["Saturday"] },
  "iq": { weekly: 1, total: 0, duration: 120, days: ["Saturday"] }
};
const timeSlots = [
  { start: "13:00", end: "15:00" },
  { start: "15:20", end: "17:20" },
  { start: "17:40", end: "19:20" },
  { start: "19:40", end: "21:20" }
];
// ----- STATE -----
let children = {}, specialists = {}, appointments = {};

// ----- UTILS -----
function $(s){ return document.querySelector(s); }
function showTab(name){
  document.querySelectorAll('.tab-content').forEach(sec=>sec.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelectorAll('.tabs button').forEach(btn=>btn.classList.remove('active'));
  document.querySelector(`.tabs button[data-tab="${name}"]`).classList.add('active');
}
// قراءة البيانات من Firebase
async function loadData(){
  let snapChildren = await db.ref('children').once('value');
  let snapSpecs    = await db.ref('specialists').once('value');
  let snapAppts    = await db.ref('appointments').once('value');
  children    = snapChildren.val()    || {};
  specialists = snapSpecs.val()       || {};
  appointments= snapAppts.val()       || {};
  renderAll();
}

// كتابة البيانات إلى Firebase
function saveToDB(path, data){
  return db.ref(path).set(data);
}

// ----- RENDER -----
function renderAll(){
  renderChildren();
  renderSpecs();
  renderAppts();
  renderReports();
}

// 1. جدول الأطفال
function renderChildren(){
  let tbody = $('#tblChildren tbody');
  tbody.innerHTML = '';
  Object.entries(children).forEach(([id, c], i)=>{
    let pkg = packages[c.package];
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${c.name}</td>
      <td>${c.package}</td>
      <td>${c.startDate}</td>
      <td>${pkg.total}</td>
      <td>${c.remaining}</td>
      <td>${c.status}</td>
      <td>
        <button onclick="editChild('${id}')">تعديل</button>
        <button onclick="deleteChild('${id}')">حذف</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
// 2. جدول الأخصائيين
function renderSpecs(){
  let tbody = $('#tblSpecs tbody');
  tbody.innerHTML = '';
  Object.entries(specialists).forEach(([id,s],i)=>{
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${s.name}</td>
      <td>${s.email}</td>
      <td>${s.section}</td>
      <td>${s.workingDays.join(', ')}</td>
      <td>
        <button onclick="editSpec('${id}')">تعديل</button>
        <button onclick="deleteSpec('${id}')">حذف</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
// 3. جدول المواعيد
function renderAppts(){
  let tbody = $('#tblAppts tbody');
  tbody.innerHTML = '';
  Object.entries(appointments).forEach(([id,a],i)=>{
    let child = children[a.childId]||{name:'–'};
    let spec  = specialists[a.specId]||{name:'–'};
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${child.name}</td>
      <td>${a.date}</td>
      <td>${a.time}</td>
      <td>${a.section}</td>
      <td>${spec.name}</td>
      <td>${a.type}</td>
      <td>${a.status}</td>
      <td>
        ${a.status==='scheduled'? `<button onclick="markAbsent('${id}')">غاب</button>` : ''}
        <button onclick="editAppt('${id}')">تعديل</button>
        <button onclick="deleteAppt('${id}')">حذف</button>
        ${a.status==='absent'? `<button onclick="makeupAppt('${id}')">تعويض</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
}
// 4. التقارير
function renderReports(){
  let endList = Object.values(children)
    .filter(c=>c.status==='active' && c.remaining<=packages[c.package].weekly)
    .map(c=>`${c.name} (${c.remaining} جلسة متبقية)`);
  $('#reportEnding').innerHTML = `<h3>أطفال على وشك انتهاء الاشتراك ≤ جلسة/أسبوع</h3>
    <ul>${endList.map(x=>`<li>${x}</li>`).join('')}</ul>`;

  let pausedList = Object.values(children)
    .filter(c=>c.status==='paused')
    .map(c=>c.name);
  $('#reportPaused').innerHTML = `<h3>أطفال متوقفون مؤقتًا</h3>
    <ul>${pausedList.map(x=>`<li>${x}</li>`).join('')}</ul>`;
}

// ----- CRUD CHILD -----
function editChild(id){
  openModal('child', id);
}
function deleteChild(id){
  if(!confirm('هل تريد حذف هذا الطفل؟')) return;
  delete children[id];
  saveToDB('children', children).then(loadData);
}
function addOrUpdateChild(id, data){
  if(!id) id = db.ref('children').push().key;
  children[id] = data;
  saveToDB('children', children).then(loadData);
}

// ----- CRUD SPEC -----
function editSpec(id){
  openModal('spec', id);
}
function deleteSpec(id){
  if(!confirm('هل تريد حذف هذا الأخصائي؟')) return;
  delete specialists[id];
  saveToDB('specialists', specialists).then(loadData);
}
function addOrUpdateSpec(id, data){
  if(!id) id = db.ref('specialists').push().key;
  specialists[id] = data;
  saveToDB('specialists', specialists).then(loadData);
}

// ----- CRUD APPT -----
function editAppt(id){
  openModal('appt', id);
}
function deleteAppt(id){
  if(!confirm('هل تريد حذف هذا الموعد؟')) return;
  let a = appointments[id];
  if(a.type==='regular') {
    children[a.childId].remaining++;
    saveToDB('children', children);
  }
  delete appointments[id];
  saveToDB('appointments', appointments).then(loadData);
}
function markAbsent(id){
  appointments[id].status = 'absent';
  children[ appointments[id].childId ].remaining++;
  saveToDB('children', children);
  saveToDB('appointments', appointments).then(loadData);
}
function makeupAppt(id){
  let a = appointments[id];
  autoScheduleChild(a.childId, {type:'makeup'});
}

// ----- AUTO SCHEDULING -----
async function autoScheduleChild(childId, opts={type:'regular'}){
  let c = children[childId];
  let pkg = packages[c.package];
  let count = pkg.weekly;
  let days = pkg.days;
  for(let d of days){
    if(count<=0) break;
    for(let slot of timeSlots){
      if(count<=0) break;
      // أخصائي متاح
      let specEntry = Object.entries(specialists)
        .find(([i,s])=>s.section===c.package || s.section==='speech' && c.package==='speech');
      if(!specEntry) continue;
      let [specId,s] = specEntry;
      let dateStr = nextDateByDay(d);
      // تحقق من عدم وجود موعد في نفس التاريخ/الوقت
      let clash = Object.values(appointments)
        .some(a=>a.specId===specId && a.date===dateStr && a.time===slot.start);
      if(clash) continue;
      // إنشاء الموعد
      let id = db.ref('appointments').push().key;
      appointments[id] = {
        childId, specId, section:c.package,
        date: dateStr, time: slot.start,
        type: opts.type, status: 'scheduled'
      };
      children[childId].remaining--;
      count--;
      await saveToDB('appointments', appointments);
      await saveToDB('children', children);
    }
  }
  loadData();
}
// يحسب تاريخ الأسبوع القادم لليوم النصّي (كل يوم مذكور بالإنجليزية)
function nextDateByDay(day){
  let weekdays = {Sunday:0, Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6};
  let today = new Date(), target = weekdays[day];
  let diff = (target - today.getDay() + 7) % 7 || 7;
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate()+diff);
  return d.toISOString().split('T')[0];
}

// دالة جدولة لجميع الأطفال دفعة واحدة
function autoScheduleAll(){
  Object.keys(children).forEach(id=>{
    if(children[id].status==='active')
      autoScheduleChild(id);
  });
}

// ----- MODAL LOGIC -----
let modalMode, modalId;
function openModal(type, id=null){
  modalMode = type; modalId = id;
  let form = $('#modalForm');
  form.innerHTML = '';
  if(type==='child'){
    $('#modalTitle').textContent = id?'تعديل طفل':'إضافة طفل جديد';
    let data = id?children[id]:{name:'',package:'24',startDate:'',remaining:0,status:'active'};
    form.innerHTML = `
      <label>اسم الطفل:<input name="name" value="${data.name}" /></label>
      <label>بكيج:
        <select name="package">
          ${Object.keys(packages).map(k=>`<option ${k===data.package?'selected':''} value="${k}">${k}</option>`).join('')}
        </select>
      </label>
      <label>تاريخ البدء:<input type="date" name="startDate" value="${data.startDate}" /></label>
      <label>حالة:
        <select name="status">
          <option ${data.status==='active'?'selected':''} value="active">نشط</option>
          <option ${data.status==='paused'?'selected':''} value="paused">متوقف</option>
        </select>
      </label>`;
  }
  if(type==='spec'){
    $('#modalTitle').textContent = id?'تعديل أخصائي':'إضافة أخصائي جديد';
    let d = id?specialists[id]:{name:'',email:'',section:'speech',workingDays:[]};
    form.innerHTML = `
      <label>اسم:<input name="name" value="${d.name}" /></label>
      <label>بريد:<input name="email"value="${d.email}" /></label>
      <label>القسم:
        <select name="section">
          <option value="speech">تخاطب</option>
          <option value="behavior">تعديل سلوك</option>
          <option value="skills">تنمية مهارات</option>
          <option value="psychology">جلسة نفسية</option>
          <option value="iq">اختبار ذكاء</option>
        </select>
      </label>
      <label>أيام العمل (مثال: Saturday,Monday):
        <input name="workingDays" value="${d.workingDays.join(',')}" />
      </label>`;
  }
  if(type==='appt'){
    $('#modalTitle').textContent = id?'تعديل موعد':'إضافة موعد جديد';
    let d = id?appointments[id]:{childId:'',date:'',time:'',section:'speech',specId:'',type:'regular',status:'scheduled'};
    form.innerHTML = `
      <label>اختر الطفل:
        <select name="childId">
          ${Object.entries(children).map(([cid,ch])=>`<option ${cid===d.childId?'selected':''} value="${cid}">${ch.name}</option>`).join('')}
        </select>
      </label>
      <label>القسم:
        <select name="section">
          ${Object.keys(packages).map(k=>`<option ${k===d.section?'selected':''} value="${k}">${k}</option>`).join('')}
        </select>
      </label>
      <label>التاريخ:<input type="date" name="date" value="${d.date}" /></label>
      <label>الوقت:
        <select name="time">
          ${timeSlots.map(s=>`<option ${s.start===d.time?'selected':''} value="${s.start}">${s.start}</option>`).join('')}
        </select>
      </label>
      <label>الأخصائي:<input name="specId" value="${d.specId}" /></label>
      <label>النوع:
        <select name="type">
          <option ${d.type==='regular'?'selected':''} value="regular">عادي</option>
          <option ${d.type==='makeup'?'selected':''} value="makeup">تعويض</option>
        </select>
      </label>`;
  }
  $('#modal').classList.remove('hidden');
}
$('#modalCancel').onclick = ()=>$('#modal').classList.add('hidden');
$('#modalSave').onclick = e=>{
  e.preventDefault();
  let fm = $('#modalForm');
  let data = Object.fromEntries(new FormData(fm).entries());
  if(modalMode==='child'){
    let initRem = packages[data.package].total;
    data.remaining = modalId? children[modalId].remaining : initRem;
    addOrUpdateChild(modalId, data);
  }
  if(modalMode==='spec'){
    data.workingDays = data.workingDays.split(',').map(s=>s.trim());
    addOrUpdateSpec(modalId, data);
  }
  if(modalMode==='appt'){
    addOrUpdateAppt(modalId, data);
  }
  $('#modal').classList.add('hidden');
};

// الدالة لحفظ/تعديل موعد من المودال
function addOrUpdateAppt(id,data){
  // تحويل remaining للأطفال حسب النوع والحالة
  if(!id && data.type==='regular'){ // جديد عادي
    children[data.childId].remaining--;
    saveToDB('children', children);
  }
  if(!id) id = db.ref('appointments').push().key;
  appointments[id] = {...data, status:'scheduled'};
  saveToDB('appointments', appointments).then(loadData);
}

// ----- INIT -----
document.querySelectorAll('.tabs button')
  .forEach(btn=>btn.onclick=_=>showTab(btn.dataset.tab));
$('#btnAddChild').onclick = ()=>openModal('child');
$('#btnAddSpec').onclick  = ()=>openModal('spec');
$('#btnAutoScheduleAll').onclick = autoScheduleAll;

loadData();
