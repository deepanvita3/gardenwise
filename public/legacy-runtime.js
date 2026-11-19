
let plants=[
{id:1,name:"Blueberry bush",variety:"Variety not recorded",type:"Berry",location:"Backyard · sunny bed",emoji:"🫐",art:"blue",status:"Check soil",notes:"Check soil moisture and acidity if growth seems poor."},
{id:2,name:"Hydrangea",variety:"Variety not recorded",type:"Flower",location:"Garden border",emoji:"🌸",art:"pink",status:"Looking good",notes:"Observe leaf condition and soil moisture."},
{id:3,name:"Apple tree",variety:"Variety not recorded",type:"Fruit",location:"Backyard · in ground",emoji:"🍎",art:"",status:"Seasonal check",notes:"Review tree health and local seasonal guidance."},
{id:4,name:"Grape vine",variety:"Variety not recorded",type:"Fruit",location:"Garden trellis",emoji:"🍇",art:"blue",status:"Seasonal check",notes:"Observe vine health and plan seasonal care."},
{id:5,name:"Rosemary",variety:"Variety not recorded",type:"Herb",location:"Patio container",emoji:"🌿",art:"",status:"Looking good",notes:"Check drainage and avoid keeping the soil constantly wet."},
{id:6,name:"Fuchsia",variety:"Variety not recorded",type:"Flower",location:"Shaded patio",emoji:"🌺",art:"pink",status:"Check weather",notes:"Check local frost forecast and container conditions."}
];
plants.find(p=>p.id===3).variety='Honeycrisp';
plants.find(p=>p.id===3).nickname='Apple tree near fence';
plants.push({id:7,name:'Apple tree',variety:'Honeycrisp',nickname:'Apple tree near patio',type:'Fruit',location:'Backyard · patio side',emoji:'🍎',art:'',status:'Seasonal check',notes:'Sample second tree, tracked separately.'});
let editingPlantId=null, deletingPlantId=null, editingGroupKey=null, deletingGroupKey=null;
const expandedGroups=new Set();
let plannerTab="upcoming";
let tasks=[
{id:1,title:"Check blueberry soil moisture",desc:"Feel the soil before watering; avoid following a calendar blindly.",plant:"Blueberry bush",priority:"Suggested"},
{id:2,title:"Inspect hydrangea leaves",desc:"Look for discoloration, spots, or visible pest damage.",plant:"Hydrangea",priority:"Low effort"},
{id:3,title:"Review frost-sensitive plants",desc:"Check your local forecast before deciding whether protection is needed.",plant:"Fuchsia",priority:"Seasonal"}
];
let journal=[
{emoji:"🫐",plant:"Blueberry bush",text:"Sample entry: Checked the soil surface and noted conditions after recent rain.",date:"Oct 25, 2026"},
{emoji:"🌸",plant:"Hydrangea",text:"Sample entry: Took a reference photo to compare foliage later.",date:"Oct 22, 2026"}
];
const plantEmoji={Fruit:"🍎",Berry:"🫐",Flower:"🌸",Vegetable:"🥕",Herb:"🌿",Houseplant:"🪴",Other:"🌱"};
function navigate(page){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('page-'+page).classList.add('active');document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const names={dashboard:'Dashboard',garden:'My Garden',copilot:'AI Copilot',planner:'Garden Planner',journal:'Garden Journal',detail:'Plant Details'};document.getElementById('crumbPage').textContent=names[page];window.scrollTo({top:0,behavior:'smooth'});if(page==='garden')renderPlants();if(page==='journal')renderJournal();if(page==='planner')renderPlanner()}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
function openModal(id){if(id==='journalModal'){populateJournalPlants();if(selectedPlantId!==null&&document.getElementById('page-detail').classList.contains('active'))document.getElementById('journalPlant').value=String(selectedPlantId)}document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open');if(id==='plantModal')resetPlantForm();if(id==='deleteModal'){deletingGroupKey=null;deletingPlantId=null}}
document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';setTimeout(()=>t.style.display='none',2600)}
function groupKey(p){return [p.name.trim().toLowerCase(),(p.variety||'').trim().toLowerCase()].join('::')}
function renderPlants(){
const q=(document.getElementById('plantSearch')?.value||'').toLowerCase(),f=document.getElementById('plantFilter')?.value||'all';
const filtered=plants.filter(p=>(p.name+' '+p.nickname+' '+p.variety+' '+p.location+' '+p.type).toLowerCase().includes(q)&&(f==='all'||p.type===f));
const groups=new Map();for(const p of filtered){const k=groupKey(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
const grid=document.getElementById('plantGrid');
grid.innerHTML=[...groups].map(([key,members])=>{const first=members[0],expanded=expandedGroups.has(key)||!!q;const variety=first.variety&&first.variety!=='Variety not recorded'?' · '+escapeHtml(first.variety):'';
return `<article class="group-card"><div class="group-head"><div class="group-icon">${first.emoji}</div><div class="group-summary"><h3>${escapeHtml(first.name)}${variety}</h3><p>${escapeHtml(first.type)} · ${members.length} individual ${members.length===1?'plant':'plants'}</p></div><span class="group-count">${members.length}</span><div class="group-actions"><button onclick="editGroupById(${first.id})">✎ Edit group</button><button class="danger" onclick="deleteGroupById(${first.id})">Remove group</button></div><button class="group-toggle" onclick="toggleGroupById(${first.id})">${expanded?'Hide':'View'} ${expanded?'−':'+'}</button></div>
${expanded?`<div class="group-members">${members.map((p,i)=>`<div class="group-member"><div><strong>${escapeHtml(p.nickname||p.name+' #'+(i+1))}</strong><p>${escapeHtml(p.location)} · ${escapeHtml(p.status||'Status not recorded')}</p></div><div class="group-actions"><button onclick="plantDetails(${p.id})">Details →</button><button onclick="editPlant(${p.id})">✎ Edit</button><button class="danger" onclick="deletePlant(${p.id})">Remove</button></div></div>`).join('')}</div>`:''}</article>`}).join('')||'<div class="empty">No plants match your search. Try another name or add a plant.</div>';
}
function editGroupById(id){
const p=plants.find(x=>x.id===id);if(!p)return;
editingGroupKey=groupKey(p);
document.getElementById('groupName').value=p.name;
document.getElementById('groupVariety').value=p.variety==='Variety not recorded'?'':(p.variety||'');
document.getElementById('groupType').value=p.type;
openModal('groupEditModal');
}
document.getElementById('groupEditForm').addEventListener('submit',e=>{
e.preventDefault();if(!editingGroupKey)return;
const members=plants.filter(p=>groupKey(p)===editingGroupKey);
if(!members.length)return;
const oldName=members[0].name;
const name=document.getElementById('groupName').value.trim();if(!name)return;
const variety=document.getElementById('groupVariety').value.trim()||'Variety not recorded';
const type=document.getElementById('groupType').value;
for(const p of members){Object.assign(p,{name,variety,type,emoji:plantEmoji[type]||'🌱',art:type==='Flower'?'pink':type==='Berry'?'blue':''})}
if(!plants.some(p=>p.name===oldName)){
tasks.forEach(t=>{if(t.plant===oldName)t.plant=name});
journal.forEach(j=>{if(j.plant===oldName)j.plant=name});
}
expandedGroups.delete(editingGroupKey);expandedGroups.add(groupKey(members[0]));editingGroupKey=null;
closeModal('groupEditModal');renderPlants();renderPlanner();renderJournal();renderDashboardTasks();
if(members.some(p=>p.id===selectedPlantId))renderPlantDetail();showToast(members.length+' plant profiles updated.');
});
function deleteGroupById(id){
const p=plants.find(x=>x.id===id);if(!p)return;
deletingGroupKey=groupKey(p);deletingPlantId=null;
const count=plants.filter(x=>groupKey(x)===deletingGroupKey).length;
document.getElementById('deleteTitle').textContent='Remove entire plant group?';
document.getElementById('deleteDescription').textContent='Remove all '+count+' '+p.name+' plant profiles in this group? Their journal entries will be retained. This cannot be undone in this session.';
document.getElementById('confirmDeleteButton').textContent='Remove '+count+' plants';openModal('deleteModal');
}
function toggleGroupById(id){const p=plants.find(x=>x.id===id);if(!p)return;const key=groupKey(p);if(expandedGroups.has(key))expandedGroups.delete(key);else expandedGroups.add(key);renderPlants()}

let selectedPlantId=null;
function plantDetails(id){selectedPlantId=id;renderPlantDetail();navigate('detail')}
function detailRow(label,value){return `<div class="detail-row"><span>${label}</span><strong>${escapeHtml(value||'Not recorded')}</strong></div>`}
function renderPlantDetail(){
const p=plants.find(x=>x.id===selectedPlantId);
if(!p){navigate('garden');return}
const related=journal.filter(j=>j.plant===p.name);
const relatedTasks=tasks.filter(t=>t.plant===p.name);
document.getElementById('plantDetailContent').innerHTML=`
<div class="detail-hero"><div class="detail-illustration">${p.photo?`<img src="${p.photo}" alt="Plant photo">`:p.emoji}</div>
<div style="min-width:0"><div class="eyebrow">Plant profile · ${escapeHtml(p.type)}</div><h1>${escapeHtml(p.nickname||p.name)}</h1><p>${escapeHtml(p.name)}${p.variety&&p.variety!=='Variety not recorded'?' · '+escapeHtml(p.variety):''}</p><p>${escapeHtml(p.location)}</p>
<div class="detail-actions"><button class="primary" onclick="editPlant(${p.id})">✎ Edit details</button><button class="secondary" onclick="openModal('journalModal')">＋ Add observation</button><button class="secondary" style="color:#a3463c" onclick="deletePlant(${p.id})">Remove</button></div></div></div>
<div class="detail-grid">
<div class="panel"><div class="panel-head"><h3>Growing profile</h3></div>
${detailRow('Nickname',p.nickname)}
${detailRow('Variety',p.variety==='Variety not recorded'?'':p.variety)}
${detailRow('Planting date',p.planted)}
${detailRow('Growing location',p.location)}
${detailRow('Growing setting',p.setting)}
${detailRow('Sun exposure',p.sun)}
${detailRow('Watering notes',p.water)}
${detailRow('Soil / drainage',p.soil)}
${detailRow('Current status',p.status)}
</div>
<div class="panel"><div class="panel-head"><h3>Care notes</h3></div><p style="font-size:13px;color:var(--muted);line-height:1.7">${escapeHtml(p.notes)}</p>
<div class="panel-head" style="margin-top:22px"><h3>Related tasks</h3></div>
${relatedTasks.length?relatedTasks.map(t=>`<div class="task" style="margin-bottom:8px"><div class="task-main"><div class="task-title">${escapeHtml(t.title)}</div><div class="task-desc">${escapeHtml(t.desc)}</div></div><span class="tag ${t.done?'done':''}">${t.done?'Done':t.priority}</span></div>`).join(''):'<p style="font-size:12px;color:var(--muted)">No tasks for this plant yet.</p>'}
<div class="panel-head" style="margin-top:22px"><h3>✓ Completed care history</h3></div>
${relatedTasks.filter(t=>t.done).length?relatedTasks.filter(t=>t.done).map(t=>`<div class="history-item"><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(taskDate(t))}</small></div>`).join(''):'<p style="font-size:12px;color:var(--muted)">No completed care tasks for this plant yet.</p>'}
</div>
<div class="panel" style="grid-column:1/-1"><div class="panel-head"><h3>Plant journal</h3><button class="text-btn" onclick="openModal('journalModal')">＋ New entry</button></div>
${related.length?related.map(j=>`<div class="journal-entry"><div class="journal-emoji">${j.emoji}</div><div><h4>${escapeHtml(j.date)}</h4><p>${escapeHtml(j.text)}</p></div></div>`).join(''):'<p style="font-size:12px;color:var(--muted)">No observations recorded for this plant yet.</p>'}
</div></div>`;
}
function updateStats(){document.getElementById('plantCount').textContent=plants.length;document.getElementById('plantCountHero').textContent=plants.length;document.getElementById('taskCount').textContent=tasks.filter(t=>!t.done).length;document.getElementById('journalCount').textContent=journal.length}
function renderDashboardTasks(){const el=document.getElementById('dashboardTasks');el.innerHTML=tasks.slice(0,4).map(t=>`<div class="task"><input class="check" type="checkbox" ${t.done?'checked':''} onchange="toggleTask(${t.id},this.checked)"><div class="task-main"><div class="task-title" style="${t.done?'text-decoration:line-through;color:#89958b':''}">${escapeHtml(t.title)}</div><div class="task-desc">${escapeHtml(t.desc)}</div></div><span class="tag ${t.priority==='Low effort'?'low':''} ${t.done?'done':''}">${t.done?'Done':t.priority}</span></div>`).join('')}
function setPlannerTab(tab){plannerTab=tab;renderPlanner()}
function taskDate(t){return t.completedAt?new Date(t.completedAt).toLocaleString([],{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Completion date not recorded'}
function toggleTask(id,checked){const t=tasks.find(t=>t.id===id);if(t){t.done=checked;t.completedAt=checked?new Date().toISOString():null}updateStats();renderDashboardTasks();renderPlanner();if(selectedPlantId!==null&&document.getElementById('page-detail').classList.contains('active'))renderPlantDetail();showToast(checked?'Task marked complete.':'Task reopened.')}
function renderPlanner(){
const upcoming=tasks.filter(t=>!t.done),completed=tasks.filter(t=>t.done);
document.getElementById('upcomingCount').textContent='('+upcoming.length+')';document.getElementById('completedCount').textContent='('+completed.length+')';
document.getElementById('upcomingTab').classList.toggle('selected',plannerTab==='upcoming');document.getElementById('completedTab').classList.toggle('selected',plannerTab==='completed');
const el=document.getElementById('plannerList');const items=plannerTab==='completed'?[...completed].sort((a,b)=>(b.completedAt||'').localeCompare(a.completedAt||'')):upcoming;
el.innerHTML=items.map(t=>`<div class="planner-item"><div class="datebox"><strong>${t.done?'✓':'🌿'}</strong><span>${t.done?'Done':'To do'}</span></div><div><h4 style="${t.done?'text-decoration:line-through;color:#89958b':''}">${escapeHtml(t.title)}</h4><p>${escapeHtml(t.desc)} · ${escapeHtml(t.plant)}</p>${t.done?`<div class="completion-date">Completed ${escapeHtml(taskDate(t))}</div>`:''}</div><label class="tag ${t.done?'done':'low'}" style="cursor:pointer"><input type="checkbox" style="vertical-align:middle" ${t.done?'checked':''} onchange="toggleTask(${t.id},this.checked)"> ${t.done?'Reopen':'Mark done'}</label></div>`).join('')||`<div class="empty">${plannerTab==='completed'?'No completed tasks yet. Mark a task done to see it here.':'All caught up! No upcoming tasks.'}</div>`;
}
function renderJournal(){const el=document.getElementById('journalList');document.getElementById('entryCountTag').textContent=journal.length+' entr'+(journal.length===1?'y':'ies');el.innerHTML=journal.length?journal.map(j=>`<div class="journal-entry"><div class="journal-emoji">${j.emoji||'🌱'}</div><div><h4>${escapeHtml(j.plant||'Garden observation')}</h4><p>${escapeHtml(j.text)}</p><div class="journal-date">${escapeHtml(j.date)}</div></div></div>`).join(''):'<div class="empty">Your garden journal is ready. Add your first observation.</div>'}
function populateJournalPlants(){document.getElementById('journalPlant').innerHTML='<option value="">General garden observation</option>'+plants.map(p=>`<option value="${p.id}">${escapeHtml(p.nickname||p.name)}</option>`).join('')}
function editPlant(id){const p=plants.find(x=>x.id===id);if(!p)return;editingPlantId=id;document.getElementById('plantModalTitle').textContent='Edit plant ✎';document.getElementById('plantSaveButton').textContent='Save changes';document.getElementById('newPlantName').value=p.name;document.getElementById('newPlantNickname').value=p.nickname||'';document.getElementById('newPlantType').value=p.type;document.getElementById('newPlantLocation').value=p.location==='Location not recorded'?'':p.location;document.getElementById('newPlantNotes').value=p.notes==='No notes yet.'?'':p.notes;
document.getElementById('newPlantVariety').value=p.variety==='Variety not recorded'?'':(p.variety||'');
document.getElementById('newPlantDate').value=p.planted||'';
document.getElementById('newPlantSun').value=p.sun||'';
document.getElementById('newPlantSetting').value=p.setting||'';
document.getElementById('newPlantWater').value=p.water||'';
document.getElementById('newPlantSoil').value=p.soil||'';
openModal('plantModal')}
function resetPlantForm(){editingPlantId=null;document.getElementById('plantForm').reset();document.getElementById('plantModalTitle').textContent='Add a plant 🌱';document.getElementById('plantSaveButton').textContent='Add plant'}
function deletePlant(id){const p=plants.find(x=>x.id===id);if(!p)return;deletingGroupKey=null;deletingPlantId=id;document.getElementById('deleteTitle').textContent='Remove this plant?';document.getElementById('confirmDeleteButton').textContent='Remove plant';document.getElementById('deleteDescription').textContent='Remove "'+p.name+'" from My Garden? Its journal entries will be kept. This cannot be undone in the current session.';openModal('deleteModal')}
function confirmDeletePlant(){
if(deletingGroupKey!==null){
const removed=plants.filter(p=>groupKey(p)===deletingGroupKey);
const ids=new Set(removed.map(p=>p.id));const names=new Set(removed.map(p=>p.name));
for(let i=plants.length-1;i>=0;i--)if(ids.has(plants[i].id))plants.splice(i,1);
for(const name of names)if(!plants.some(p=>p.name===name))tasks=tasks.filter(t=>t.plant!==name);
expandedGroups.delete(deletingGroupKey);deletingGroupKey=null;closeModal('deleteModal');
updateStats();renderPlants();renderDashboardTasks();renderPlanner();renderJournal();
if(ids.has(selectedPlantId))navigate('garden');showToast(removed.length+' plants removed from My Garden.');return;
}
const i=plants.findIndex(x=>x.id===deletingPlantId);if(i<0)return;const name=plants[i].name;plants.splice(i,1);if(!plants.some(p=>p.name===name))tasks=tasks.filter(t=>t.plant!==name);deletingPlantId=null;closeModal('deleteModal');updateStats();renderPlants();renderDashboardTasks();renderPlanner();showToast(name+' removed from your garden.');if(!plants.some(p=>p.id===selectedPlantId))navigate('garden')}
document.getElementById('plantForm').addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('newPlantName').value.trim();if(!name)return;const type=document.getElementById('newPlantType').value;const location=document.getElementById('newPlantLocation').value.trim()||'Location not recorded';const notes=document.getElementById('newPlantNotes').value.trim()||'No notes yet.';
const extra={nickname:document.getElementById('newPlantNickname').value.trim(),variety:document.getElementById('newPlantVariety').value.trim()||'Variety not recorded',planted:document.getElementById('newPlantDate').value,sun:document.getElementById('newPlantSun').value,setting:document.getElementById('newPlantSetting').value,water:document.getElementById('newPlantWater').value.trim(),soil:document.getElementById('newPlantSoil').value.trim()};
const file=document.getElementById('newPlantPhoto').files[0];
const wasEditing=editingPlantId!==null;
const previousId=editingPlantId;
if(editingPlantId!==null){const p=plants.find(x=>x.id===editingPlantId);if(p){const oldName=p.name;Object.assign(p,{...extra,name,type,location,notes,emoji:plantEmoji[type]||'🌱',art:type==='Flower'?'pink':type==='Berry'?'blue':''});if(!plants.some(other=>other.id!==p.id&&other.name===oldName))tasks.forEach(t=>{if(t.plant===oldName)t.plant=name})}}else{plants.push({...extra,id:Math.max(0,...plants.map(p=>p.id))+1,name,type,location,emoji:plantEmoji[type]||'🌱',art:type==='Flower'?'pink':type==='Berry'?'blue':'',status:'New plant',notes})}const currentPlant=wasEditing?plants.find(x=>x.id===previousId):plants[plants.length-1];
if(file&&currentPlant){const reader=new FileReader();reader.onload=()=>{currentPlant.photo=reader.result;renderPlants();if(selectedPlantId===currentPlant.id)renderPlantDetail();gwScheduleSave()};reader.readAsDataURL(file)}
closeModal('plantModal');resetPlantForm();updateStats();renderPlants();renderPlanner();showToast(name+(wasEditing?' updated.':' added to your garden.'));if(wasEditing&&selectedPlantId===previousId){renderPlantDetail();navigate('detail')}else navigate('garden')});
document.getElementById('journalForm').addEventListener('submit',e=>{e.preventDefault();const id=Number(document.getElementById('journalPlant').value);const p=plants.find(x=>x.id===id);journal.unshift({emoji:p?.emoji||'🌿',plant:p?.name||'Whole garden',text:document.getElementById('journalText').value.trim(),date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})});closeModal('journalModal');e.target.reset();updateStats();renderJournal();showToast('Observation saved in this demo.');if(document.getElementById('page-detail').classList.contains('active'))renderPlantDetail();else navigate('journal')});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function addBubble(text,who){const body=document.getElementById('chatBody');const d=document.createElement('div');d.className='bubble '+who;d.textContent=text;if(who==='bot'){const small=document.createElement('small');small.textContent='GardenWise · sample response';d.appendChild(small)}body.appendChild(d);body.scrollTop=body.scrollHeight}
function responseFor(q){const s=q.toLowerCase();if(s.includes('blueber')||s.includes('yellow'))return "Yellowing leaves can have several causes, including seasonal change, watering stress, and nutrient availability affected by soil pH. First, note whether the yellowing is on old or new leaves and whether the leaf veins remain green. Check soil moisture and, if symptoms persist, consider a soil test before adding fertilizer. I can't diagnose the cause from this description alone.";if(s.includes('winter')||s.includes('frost')||s.includes('autumn'))return "A good first step is to review your local frost forecast and identify which plants are sensitive to cold. Check containers, drainage, and plant condition; avoid major pruning or fertilizing decisions based only on a generic calendar. The right preparation depends on your plant varieties and local conditions. Add your location and plant details for more tailored guidance.";if(s.includes('week')||s.includes('today')||s.includes('what should'))return "Start with observation rather than doing every task on a schedule: (1) check soil moisture for plants with known watering needs, (2) inspect leaves for unusual spots or damage, and (3) review your local forecast for frost or heavy rain. Mark what you actually do in your journal so future recommendations can use that history.";if(s.includes('track')||s.includes('journal'))return "Useful records include plant name and variety (if known), planting date, location and sunlight, watering or feeding actions, visible symptoms, photos taken from a similar angle, and harvest results. You don't need to record everything every day—even a short note when something changes can help you compare seasons.";return "I can help you think through that. To make the advice specific, tell me which plant you're asking about, where it's growing, what you've observed, and roughly when it started. If there's a visible problem, a clear photo of the whole plant plus a close-up can help. This prototype uses example responses; a live version would connect to an AI model and trusted gardening references."}
function sendChat(q){q=q.trim();if(!q)return;addBubble(q,'user');document.getElementById('chatInput').value='';setTimeout(()=>addBubble(responseFor(q),'bot'),280)}
document.getElementById('chatForm').addEventListener('submit',e=>{e.preventDefault();sendChat(document.getElementById('chatInput').value)});
function askPrompt(q){sendChat(q)}

// Weather data comes from Open-Meteo. It is never silently replaced by sample weather.
let liveWeather=null;
const weatherDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
function weatherDescription(code){if(code===0)return 'Clear';if(code<=3)return 'Partly cloudy';if(code<=48)return 'Foggy';if(code<=67)return 'Rain';if(code<=77)return 'Snow';if(code<=82)return 'Showers';return 'Storms / showers'}
function setWeatherStatus(message){document.getElementById('weatherStatus').textContent=message}
async function loadCityWeather(){
const city=document.getElementById('weatherCity').value.trim();
if(!city){setWeatherStatus('Enter a city to load the forecast.');return}
setWeatherStatus('Checking live weather service…');
try{
const geoResp=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:city.split(',')[0].trim(),count:'10',language:'en',format:'json'}));
if(!geoResp.ok)throw Error('Location lookup failed');
const geo=await geoResp.json();
let options=geo.results||[];
const region=city.split(',').slice(1).join(',').trim().toLowerCase();
if(region){const matching=options.filter(o=>[o.admin1,o.country,o.country_code].filter(Boolean).some(v=>v.toLowerCase().includes(region)||region.includes(v.toLowerCase())));if(matching.length)options=matching}
const place=/^lynnwood\s*,?\s*(wa|washington)?$/i.test(city)?{name:'Lynnwood',admin1:'Washington',latitude:47.8209,longitude:-122.3151}:options[0];if(!place)throw Error('City not found. Try a nearby city.');
const query=new URLSearchParams({latitude:String(place.latitude),longitude:String(place.longitude),current:'temperature_2m,weather_code',daily:'precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code',temperature_unit:'fahrenheit',precipitation_unit:'inch',timezone:'auto',forecast_days:'7'});
const resp=await fetch('https://api.open-meteo.com/v1/forecast?'+query);
if(!resp.ok)throw Error('Forecast service unavailable');
const data=await resp.json();if(!data.daily||!data.daily.time?.length)throw Error('No forecast returned');
liveWeather={data,place,loaded:new Date()};
document.getElementById('weatherTemp').textContent=Math.round(data.current.temperature_2m)+' °F';
const loc=[place.name,place.admin1].filter(Boolean).join(', ');
document.getElementById('weatherMeta').textContent=loc+' · '+weatherDescription(data.current.weather_code);
document.getElementById('weatherLabel').textContent=loc+' · '+Math.round(data.current.temperature_2m)+'°F';
document.getElementById('forecastDays').innerHTML=data.daily.time.slice(0,6).map((date,i)=>`<div class="forecast-day"><strong>${weatherDate(date)}</strong><div>${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°</div><div>🌧 ${Number(data.daily.precipitation_sum[i]).toFixed(2)}″</div><div>${data.daily.precipitation_probability_max[i]}% chance</div></div>`).join('');
setWeatherStatus('Live forecast · Open-Meteo · updated '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));
renderWateringAdvice();
}catch(err){liveWeather=null;document.getElementById('weatherTemp').textContent='— °F';document.getElementById('forecastDays').innerHTML='';document.getElementById('weatherLabel').textContent='Weather unavailable';document.getElementById('weatherMeta').textContent='Forecast not available';document.getElementById('wateringAdvice').innerHTML='<p style="font-size:12px">Weather unavailable. Check soil moisture before deciding whether to water.</p>';if(/^lynnwood\s*,?\s*(wa|washington)?$/i.test(city)){showSnapshotWeather();setWeatherStatus('Live refresh unavailable ('+err.message+'). Showing dated forecast snapshot, not live data.')}else setWeatherStatus(err.message+' · Check your connection or try another city.')}
}
function renderWateringAdvice(){
if(!liveWeather)return;
const d=liveWeather.data.daily;
const next48=Number(d.precipitation_sum[0]||0)+Number(d.precipitation_sum[1]||0);
const chance=Math.max(Number(d.precipitation_probability_max[0]||0),Number(d.precipitation_probability_max[1]||0));
const frost=d.temperature_2m_min.slice(0,3).some(t=>t<=32);
document.getElementById('weatherNote').textContent=`Forecast rain today + tomorrow: ${next48.toFixed(2)} in · highest daily precipitation chance: ${chance}%${frost?' · Freezing temperatures possible':''}. Forecast rain does not prove the root zone is wet.`;
const el=document.getElementById('wateringAdvice');
el.innerHTML=plants.map(p=>{
const container=/container|pot|patio/i.test((p.setting||'')+' '+p.location);
const indoor=p.setting==='Indoors'||p.type==='Houseplant';
let status,css,reason;
if(indoor){status='Check soil';css='check';reason='Outdoor rain does not water indoor plants. Check potting mix moisture and drainage.'}
else if(container){status='Check soil';css='check';reason=next48>=.2?'Rain is forecast, but containers may be sheltered or drain quickly. Check the potting mix.':'Containers may dry differently from garden beds. Check potting mix before watering.'}
else if(next48>=.2){status='Likely skip watering';css='hold';reason=`About ${next48.toFixed(2)} in of rain is forecast over two days. If the root zone is moist, hold off; water only if soil is actually dry.`}
else if(chance>=65){status='Wait & check';css='hold';reason='Rain is possible, but the amount forecast is low or uncertain. Check soil moisture before watering.'}
else{status='Check soil';css='check';reason='Little rain is forecast. Water only if the soil at root depth is dry for this plant.'}
if(frost&&!indoor)reason+=' Check frost-sensitive plants and avoid unnecessary late-day watering near freezing weather.';
return `<div class="water-row"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${escapeHtml(p.nickname||p.name)}</b><span class="water-tag ${css}">${status}</span></div><p>${reason}</p><div style="font-size:10px;color:var(--muted)">Based on weather + growing setting; not a soil-moisture measurement.</div></div>`
}).join('')||'<p>No plants added yet.</p>';
}

function showSnapshotWeather(){
const rows=[
['2026-10-27',53,45,100],['2026-10-28',53,43,85],['2026-10-29',54,42,55],
['2026-10-30',50,36,84],['2026-10-31',54,39,55],['2026-11-01',51,38,25],['2026-11-02',52,42,11]
];
document.getElementById('weatherTemp').textContent='53 °F';
document.getElementById('weatherMeta').textContent='Lynnwood, WA · forecast snapshot from Oct 27, 2026';
document.getElementById('weatherLabel').textContent='Lynnwood · snapshot';
document.getElementById('forecastDays').innerHTML=rows.slice(0,6).map(r=>`<div class="forecast-day"><strong>${weatherDate(r[0])}</strong><div>${r[1]}° / ${r[2]}°</div><div>🌧 ${r[3]}% chance</div></div>`).join('');
document.getElementById('weatherNote').textContent='Snapshot issued October 27, 2026. Rain probability is not rainfall amount. Verify current forecast before making watering decisions.';
document.getElementById('wateringAdvice').innerHTML=plants.map(p=>`<div class="water-row"><b>${escapeHtml(p.nickname||p.name)}</b><div style="margin-top:7px"><span class="water-tag check">Check soil first</span></div><p>Showers were forecast during this period. Check soil at root depth and the current weather before watering; container plants may be sheltered.</p></div>`).join('');
setWeatherStatus('Dated forecast snapshot · attempting live update…');
}
renderDashboardTasks();renderPlants();renderPlanner();renderJournal();updateStats();
showSnapshotWeather();
loadCityWeather();

/* Supabase public client key is safe in browser; authorization is enforced by RLS. */
const gwClient = window.supabase?.createClient('https://jnoodefltigmqgleeppr.supabase.co','sb_publishable_bBLvtMRFqYaFl2ymoDBQAQ_4ZpmmMQP',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let gwUser=null,gwReady=false,gwBusy=false,gwSaveTimer=null,gwSavedSnapshot='',gwMode='signin',gwLoadGeneration=0;
const gwGate=document.getElementById('gwAuthGate'),gwMessage=document.getElementById('gwAuthMsg');
const gwStatus=document.getElementById('gwSaveStatus');
function gwSnapshot(){return JSON.stringify({plants,tasks,journal})}
function gwRefresh(){selectedPlantId=null;expandedGroups.clear();updateStats();renderDashboardTasks();renderPlants();renderPlanner();renderJournal();navigate('dashboard')}
async function gwLoad(user){
  const generation=++gwLoadGeneration;gwReady=false;gwUser=user;gwGate.style.display='flex';
  gwMessage.textContent='Loading your private garden…';
  const {data,error}=await gwClient.from('garden_state').select('plants,tasks,journal').eq('user_id',user.id).maybeSingle();
  if(generation!==gwLoadGeneration)return;
  if(error){gwMessage.textContent='Could not load your garden: '+error.message;return}
  plants=Array.isArray(data?.plants)?data.plants:[];
  tasks=Array.isArray(data?.tasks)?data.tasks:[];
  journal=Array.isArray(data?.journal)?data.journal:[];
  gwSavedSnapshot=gwSnapshot();gwReady=true;
  document.getElementById('gwAccountEmail').textContent=user.email||'Signed in';
  document.getElementById('gwAccount').hidden=false;
  gwStatus.textContent=' · Saved';
  gwGate.style.display='none';gwRefresh();
}
async function gwSave(){
  if(!gwReady||!gwUser||gwBusy)return;
  const snapshot=gwSnapshot();if(snapshot===gwSavedSnapshot)return;
  gwBusy=true;gwStatus.textContent=' · Saving…';
  const currentUser=gwUser.id;
  const state=JSON.parse(snapshot);
  const {error}=await gwClient.from('garden_state').upsert({user_id:currentUser,...state,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  gwBusy=false;
  if(error){gwStatus.textContent=' · Save failed: '+error.message;return}
  gwSavedSnapshot=snapshot;gwStatus.textContent=' · Saved';
  if(gwReady&&gwUser?.id===currentUser&&gwSnapshot()!==snapshot)gwScheduleSave();
}
function gwScheduleSave(){if(!gwReady)return;clearTimeout(gwSaveTimer);gwSaveTimer=setTimeout(gwSave,700)}
document.addEventListener('click',e=>{if(e.target.closest('#gwAuthGate,#gwAccount'))return;setTimeout(gwScheduleSave,0)},true);
document.addEventListener('submit',e=>{if(e.target.id==='gwAuthForm')return;setTimeout(gwScheduleSave,100)},true);
document.addEventListener('change',e=>{if(e.target.closest('#gwAuthGate'))return;setTimeout(gwScheduleSave,100)},true);
document.addEventListener('load',e=>{if(e.target.tagName==='IMG')gwScheduleSave()},true);
const gwPassword=document.getElementById('gwPassword'),gwPasswordToggle=document.getElementById('gwPasswordToggle');
function gwSetPasswordVisible(visible){gwPassword.type=visible?'text':'password';gwPasswordToggle.textContent=visible?'Hide':'Show';gwPasswordToggle.setAttribute('aria-label',visible?'Hide password':'Show password');gwPasswordToggle.setAttribute('aria-pressed',String(visible))}
gwPasswordToggle.onclick=()=>gwSetPasswordVisible(gwPassword.type==='password');
document.getElementById('gwAuthSwitch').onclick=()=>{
  gwMode=gwMode==='signin'?'signup':'signin';gwSetPasswordVisible(false);gwPassword.autocomplete=gwMode==='signup'?'new-password':'current-password';
  document.getElementById('gwAuthSubmit').textContent=gwMode==='signin'?'Sign in':'Create account';
  document.getElementById('gwAuthSwitch').textContent=gwMode==='signin'?'Create an account':'Already have an account? Sign in';
  gwMessage.textContent='';
};
document.getElementById('gwAuthForm').onsubmit=async e=>{
  e.preventDefault();if(!gwClient){gwMessage.textContent='Supabase library failed to load. Check your internet connection.';return}
  const email=document.getElementById('gwEmail').value.trim(),password=document.getElementById('gwPassword').value;
  const btn=document.getElementById('gwAuthSubmit');btn.disabled=true;gwMessage.textContent='Please wait…';
  try{
    const result=gwMode==='signup'
      ?await gwClient.auth.signUp({email,password,options:{emailRedirectTo:'https://deepanvita3.github.io/gardenwise/'}})
      :await gwClient.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(result.data.session){gwPassword.value='';gwSetPasswordVisible(false);await gwLoad(result.data.user)}
    else gwMessage.textContent='Check your email for a confirmation link, then return here and sign in.';
  }catch(err){gwMessage.textContent=err.message||'Authentication failed'}
  finally{btn.disabled=false}
};
document.getElementById('gwSignOut').onclick=async()=>{
  if(!gwClient)return;
  clearTimeout(gwSaveTimer);
  await gwSave();
  const {error}=await gwClient.auth.signOut();
  if(error){gwStatus.textContent=' · Sign-out failed: '+error.message;return}
  gwUser=null;gwReady=false;gwLoadGeneration++;gwSavedSnapshot='';
  plants=[];tasks=[];journal=[];gwRefresh();
  document.getElementById('gwAccount').hidden=true;gwGate.style.display='flex';gwMessage.textContent='';
};
async function gwBoot(){
 if(!gwClient){gwMessage.textContent='Unable to load Supabase. Check your connection and refresh.';return}
 const form=document.getElementById('gwAuthForm');
 form.hidden=true;gwMessage.textContent='Restoring your session…';
 try{
  const {data,error}=await gwClient.auth.getSession();
  if(error)throw error;
  if(data.session){
   const verified=await gwClient.auth.getUser();
   if(verified.error)throw verified.error;
   if(verified.data.user)await gwLoad(verified.data.user);
  }else gwMessage.textContent='Sign in or create an account to get started.';
 }catch(err){gwMessage.textContent='Could not restore your session. Refresh to retry, or sign in again. '+(err.message||'');}
 finally{form.hidden=false}
 gwClient.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){gwReady=false;gwUser=null;gwLoadGeneration++;clearTimeout(gwSaveTimer);plants=[];tasks=[];journal=[];gwRefresh();gwGate.style.display='flex';document.getElementById('gwAccount').hidden=true;gwPassword.value='';gwSetPasswordVisible(false)}
  if(event==='SIGNED_IN'&&session?.user&&(!gwUser||gwUser.id!==session.user.id))setTimeout(()=>{if(!gwUser||gwUser.id!==session.user.id)gwLoad(session.user)},0);
 });
}
gwBoot();

