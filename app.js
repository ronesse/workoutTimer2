(() => {
"use strict";

const PRESETS=[
{id:"kettlebell",name:"Kettlebell 60/30",category:"Kettlebell",icon:"🏋️",description:"20 runder · 30 min",work:60,rest:30,rounds:20,workWarning:10,restWarning:5,exercises:["Kettlebell swing","Goblet squat","Push press","Utfall","Renegade row"]},
{id:"tabata",name:"Tabata 20/10",category:"Kondisjon",icon:"🔥",description:"8 runder · 4 min",work:20,rest:10,rounds:8,workWarning:5,restWarning:3,exercises:[]},
{id:"emom",name:"EMOM 10",category:"Styrke",icon:"⏱️",description:"45/15 · 10 runder",work:45,rest:15,rounds:10,workWarning:10,restWarning:5,exercises:[]},
{id:"volleyball",name:"Volleyball sirkel",category:"Volleyball",icon:"🏐",description:"8 øvelser · 40/20",work:40,rest:20,rounds:8,workWarning:10,restWarning:5,exercises:["Serve","Mottak","Blokkbevegelse","Forsvar","Angrepstilløp","Kjerne","Hopp","Skulderkontroll"]},
{id:"strength",name:"Styrke 45/15",category:"Styrke",icon:"💪",description:"12 runder · 12 min",work:45,rest:15,rounds:12,workWarning:10,restWarning:5,exercises:[]}
];

const $=id=>document.getElementById(id);
const e={};
["backBtn","settingsBtn","pageTitle","homeScreen","timerScreen","customScreen","historyScreen","calendarScreen","statsScreen","presetGrid","customWorkoutBtn","manualFromHomeBtn","homeMonthCount","homeMonthMinutes","homeStreak","spotifyHomeBtn","spotifyTimerBtn","installBtn","timerCard","roundText","totalText","exerciseText","phaseText","messageText","timeText","nextText","progressBar","startPauseBtn","skipBtn","resetBtn","customName","customCategory","customWork","customRest","customRounds","customWorkWarning","customRestWarning","customExercises","saveCustomBtn","cancelCustomBtn","manualActivityBtn","exportBtn","storageStatus","historyCategoryFilter","historyPeriodFilter","historyList","historyEmpty","prevMonthBtn","nextMonthBtn","calendarTitle","calendarGrid","calendarDayDetails","statSessions","statMinutes","statStreak","statRating","categoryChart","monthlyChart","topPrograms","settingsPanel","closeSettingsBtn","overlay","beepToggle","voiceToggle","vibrateToggle","wakeToggle","spotifyUrl","saveSpotifyBtn","exportSettingsBtn","importFile","testSoundBtn","saveWorkoutModal","saveSummary","effortSelect","ratingStars","workoutComment","saveWorkoutBtn","discardWorkoutBtn","manualActivityModal","manualDateTime","manualName","manualCategory","manualHours","manualMinutes","manualDistance","manualEffort","manualRatingStars","manualComment","saveManualActivityBtn","cancelManualActivityBtn"].forEach(id=>e[id]=$(id));

const HISTORY_KEY="workouttimer2_history_v1";
const SETTINGS_KEY="workouttimer2_settings_v1";
const CUSTOM_KEY="workouttimer2_custom_v1";

let workout=PRESETS[0],running=false,finished=false,phase="work",round=1,remaining=workout.work,elapsed=0,timerHandle=null,nextTickAt=0,audioContext=null,wakeLock=null,saveRating=4,manualRating=4,currentCalendar=new Date(),selectedDate=null,deferredInstallPrompt=null,editingId=null;

function getHistory(){try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function setHistory(items){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(items));return true}catch(err){alert("Kunne ikke lagre aktiviteten lokalt.");return false}}
function localDateKey(d){const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function fmtTime(sec){sec=Math.max(0,Math.ceil(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`}
function totalDuration(w=workout){return w.rounds*(w.work+w.rest)}
function phaseDuration(){return phase==="work"?workout.work:workout.rest}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function formatDate(iso){return new Intl.DateTimeFormat("nb-NO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(iso))}
function currentExercise(r=round){return workout.exercises?.length?workout.exercises[(r-1)%workout.exercises.length]:""}

function renderPresets(){e.presetGrid.innerHTML="";PRESETS.forEach(p=>{const b=document.createElement("button");b.className="preset-card";b.innerHTML=`<span class="card-icon">${p.icon}</span><span><strong>${p.name}</strong><small>${p.description}</small></span>`;b.onclick=()=>selectWorkout(p);e.presetGrid.appendChild(b)})}
function showScreen(name){
  ["home","timer","custom","history","calendar","stats"].forEach(n=>e[n+"Screen"].classList.toggle("hidden",n!==name));
  e.backBtn.classList.toggle("hidden",!["timer","custom"].includes(name));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===name));
  e.pageTitle.textContent=name==="timer"?workout.name:({home:"WorkoutTimer2",history:"Historikk",calendar:"Kalender",stats:"Statistikk",custom:"Egen økt"}[name]||"WorkoutTimer2");
  if(name==="home")renderHome();
  if(name==="history")renderHistory();
  if(name==="calendar")renderCalendar();
  if(name==="stats")renderStats();
}
function selectWorkout(p){workout=JSON.parse(JSON.stringify(p));resetTimer();showScreen("timer")}

function renderTimer(){
  const total=totalDuration(),pct=phaseDuration()?((phaseDuration()-remaining)/phaseDuration())*100:100;
  e.roundText.textContent=`Runde ${Math.min(round,workout.rounds)} av ${workout.rounds}`;
  e.totalText.textContent=`${fmtTime(total-elapsed)} igjen`;
  e.timeText.textContent=Math.max(0,Math.ceil(remaining));
  e.progressBar.style.width=`${Math.min(100,Math.max(0,pct))}%`;
  const ex=currentExercise();e.exerciseText.textContent=ex;e.exerciseText.classList.toggle("hidden",!ex);
  e.timerCard.className="timer-card";
  if(finished){e.timerCard.classList.add("finished");e.phaseText.textContent="FERDIG!";e.messageText.textContent="Sterkt gjennomført 💪";e.timeText.textContent="✓";e.nextText.textContent=`${fmtTime(total)} fullført`;e.totalText.textContent="0:00 igjen";e.progressBar.style.width="100%";e.startPauseBtn.textContent="▶ Start på nytt";return}
  if(!running&&elapsed===0){e.phaseText.textContent="KLAR";e.messageText.textContent="Trykk start når du er klar";e.nextText.textContent=workout.rest?`Neste: Hvile ${workout.rest} sek`:"Ingen pause";e.startPauseBtn.textContent="▶ Start";return}
  if(phase==="work"){const warning=remaining<=workout.workWarning;e.timerCard.classList.add(warning?"work-warning":"work");e.phaseText.textContent=warning?"HOLD UT!":"ARBEID";e.messageText.textContent=warning?"Hold ut!":(ex||"Jobb kontrollert");e.nextText.textContent=workout.rest?`Neste: Hvile ${workout.rest} sek`:"Neste runde"}
  else{const warning=remaining<=workout.restWarning;e.timerCard.classList.add(warning?"rest-warning":"rest");e.phaseText.textContent=warning?"GJØR KLAR!":"HVILE";e.messageText.textContent=warning?"Gjør klar!":"Pust og hent deg inn";e.nextText.textContent=round===workout.rounds?"Neste: Ferdig":`Neste: ${currentExercise(round+1)||"Arbeid"}`}
  e.startPauseBtn.textContent=running?"⏸ Pause":"▶ Fortsett";
}

function getAudio(){if(!audioContext){const C=window.AudioContext||window.webkitAudioContext;if(C)audioContext=new C()}return audioContext}
function beep(freq=880,d=.14,count=1){if(!e.beepToggle.checked)return;const c=getAudio();if(!c)return;if(c.state==="suspended")c.resume();for(let i=0;i<count;i++){const st=c.currentTime+i*(d+.08),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(.35,st+.01);g.gain.exponentialRampToValueAtTime(.0001,st+d);o.connect(g);g.connect(c.destination);o.start(st);o.stop(st+d+.02)}}
function speak(t){if(!e.voiceToggle.checked||!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang="nb-NO";u.rate=1.02;const v=speechSynthesis.getVoices().find(x=>/^nb|^no/i.test(x.lang)||/Norwegian|Norsk/i.test(x.name));if(v)u.voice=v;speechSynthesis.speak(u)}
function cue(t,opt={}){beep(opt.freq||880,.15,opt.count||1);speak(t);if(e.vibrateToggle.checked&&navigator.vibrate)navigator.vibrate(opt.pattern||[180])}
async function requestWake(){if(!e.wakeToggle.checked||!("wakeLock"in navigator))return;try{wakeLock=await navigator.wakeLock.request("screen")}catch{}}
async function releaseWake(){try{if(wakeLock)await wakeLock.release()}catch{}wakeLock=null}
function threshold(prev,now){if(phase==="work"&&prev>workout.workWarning&&now<=workout.workWarning&&workout.workWarning>0)cue("Hold ut!",{freq:980});if(phase==="rest"&&prev>workout.restWarning&&now<=workout.restWarning&&workout.restWarning>0)cue("Gjør klar!",{freq:980});if(now<=3&&now>0&&Math.ceil(prev)!==Math.ceil(now))beep(1200,.08)}
function advance(){if(phase==="work"&&workout.rest>0){phase="rest";remaining=workout.rest;cue("Hvile",{freq:620,count:2,pattern:[180,80,180]})}else{if(round>=workout.rounds){finishWorkout();return}round++;phase="work";remaining=workout.work;const ex=currentExercise();cue(ex?`Arbeid. ${ex}`:"Arbeid",{freq:900,count:2})}}
function tick(){if(!running||finished)return;const prev=remaining;remaining--;elapsed++;threshold(prev,remaining);if(remaining<=0)advance();renderTimer()}
function scheduler(){if(!running)return;const now=performance.now();while(now>=nextTickAt&&running){tick();nextTickAt+=1000}timerHandle=setTimeout(scheduler,Math.max(20,nextTickAt-performance.now()))}
function startTimer(){if(finished)resetTimer();running=true;getAudio();requestWake();if(elapsed===0){const ex=currentExercise();cue(ex?`Arbeid. ${ex}`:"Arbeid",{freq:900,count:2})}nextTickAt=performance.now()+1000;scheduler();renderTimer()}
function pauseTimer(){running=false;clearTimeout(timerHandle);releaseWake();renderTimer()}
function resetTimer(){running=false;finished=false;phase="work";round=1;remaining=workout.work;elapsed=0;clearTimeout(timerHandle);releaseWake();if("speechSynthesis"in window)speechSynthesis.cancel();renderTimer()}
function skipPhase(){if(finished)return;advance();renderTimer()}
function finishWorkout(){running=false;finished=true;remaining=0;elapsed=totalDuration();clearTimeout(timerHandle);releaseWake();cue("Økten er ferdig. Bra jobbet!",{freq:1040,count:3,pattern:[250,100,250,100,350]});renderTimer();setTimeout(openSaveWorkoutModal,600)}

function renderStars(container,value){container.querySelectorAll("button").forEach(b=>{const n=Number(b.dataset.rating);b.textContent=n<=value?"★":"☆";b.classList.toggle("selected",n===value)})}
function openSaveWorkoutModal(){saveRating=4;e.workoutComment.value="";e.effortSelect.value="Bra";e.saveSummary.textContent=`${workout.name} · ${Math.round(totalDuration()/60)} minutter`;renderStars(e.ratingStars,saveRating);e.saveWorkoutModal.classList.remove("hidden")}
function saveCompletedWorkout(){
  const d=new Date(),item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),programId:workout.id,programName:workout.name,category:workout.category||"Annet",completedAt:d.toISOString(),dateKey:localDateKey(d),durationSeconds:totalDuration(),rating:saveRating,effort:e.effortSelect.value,comment:e.workoutComment.value.trim(),distanceKm:null,manual:false};
  const items=getHistory();items.unshift(item);if(!setHistory(items))return;e.saveWorkoutModal.classList.add("hidden");renderHome();showScreen("history");
}

function toLocalDateTimeValue(d){const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function openManualModal(item=null){
  editingId=item?.id||null;manualRating=item?.rating||4;
  const d=item?new Date(item.completedAt):new Date();
  e.manualDateTime.value=toLocalDateTimeValue(d);
  e.manualName.value=item?.programName||"";
  e.manualCategory.value=item?.category||"Annet";
  const mins=item?Math.round(item.durationSeconds/60):60;
  e.manualHours.value=Math.floor(mins/60);e.manualMinutes.value=mins%60;
  e.manualDistance.value=item?.distanceKm??"";
  e.manualEffort.value=item?.effort||"Bra";
  e.manualComment.value=item?.comment||"";
  renderStars(e.manualRatingStars,manualRating);
  e.saveManualActivityBtn.textContent=item?"Lagre endringer":"Lagre aktivitet";
  e.manualActivityModal.classList.remove("hidden");
}
function saveManualActivity(){
  const name=e.manualName.value.trim(),mins=(Number(e.manualHours.value)||0)*60+(Number(e.manualMinutes.value)||0);
  if(!name){alert("Skriv inn aktivitet.");return}
  if(!e.manualDateTime.value){alert("Velg dato og klokkeslett.");return}
  if(mins<=0){alert("Registrer varighet.");return}
  const d=new Date(e.manualDateTime.value),dist=e.manualDistance.value.trim()===""?null:Number(e.manualDistance.value);
  let items=getHistory();
  const item={id:editingId|| (crypto.randomUUID?crypto.randomUUID():String(Date.now())),programId:"manual",programName:name,category:e.manualCategory.value,completedAt:d.toISOString(),dateKey:localDateKey(d),durationSeconds:mins*60,rating:manualRating,effort:e.manualEffort.value,comment:e.manualComment.value.trim(),distanceKm:Number.isFinite(dist)?dist:null,manual:true};
  if(editingId)items=items.map(x=>x.id===editingId?item:x);else items.unshift(item);
  items.sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt));
  if(!setHistory(items))return;
  e.manualActivityModal.classList.add("hidden");editingId=null;renderHome();showScreen("history");
}

function renderStorageStatus(){try{localStorage.setItem("_wt2_test","1");localStorage.removeItem("_wt2_test");e.storageStatus.textContent=`💾 Lokal lagring aktiv · ${getHistory().length} lagrede aktiviteter`;e.storageStatus.classList.remove("error")}catch{e.storageStatus.textContent="⚠️ Lokal lagring er blokkert i nettleseren.";e.storageStatus.classList.add("error")}}
function renderHistory(){
  renderStorageStatus();
  let items=getHistory(),cat=e.historyCategoryFilter.value,period=e.historyPeriodFilter.value,now=new Date();
  if(cat)items=items.filter(x=>x.category===cat);
  if(period==="month")items=items.filter(x=>{const d=new Date(x.completedAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
  if(period==="year")items=items.filter(x=>new Date(x.completedAt).getFullYear()===now.getFullYear());
  e.historyList.innerHTML="";e.historyEmpty.classList.toggle("hidden",items.length>0);
  items.forEach(x=>{
    const div=document.createElement("article");div.className="history-item";
    div.innerHTML=`<div class="history-top"><div><div class="history-title">${esc(x.programName)}</div><div class="history-meta">${formatDate(x.completedAt)} · ${Math.round(x.durationSeconds/60)} min · ${esc(x.category)}${x.distanceKm!=null?` · ${x.distanceKm} km`:""}${x.manual?" · manuelt":""}</div></div><div>${"★".repeat(x.rating||0)}${"☆".repeat(5-(x.rating||0))}</div></div><div class="history-meta">${esc(x.effort||"")}</div>${x.comment?`<p class="history-comment">${esc(x.comment)}</p>`:""}<div class="history-actions"><button class="edit-btn" data-id="${x.id}">Rediger</button><button class="delete-btn" data-id="${x.id}">Slett</button></div>`;
    e.historyList.appendChild(div)
  });
  e.historyList.querySelectorAll(".delete-btn").forEach(b=>b.onclick=()=>{if(confirm("Slette denne aktiviteten?")){setHistory(getHistory().filter(x=>x.id!==b.dataset.id));renderHistory();renderHome()}});
  e.historyList.querySelectorAll(".edit-btn").forEach(b=>b.onclick=()=>{const item=getHistory().find(x=>x.id===b.dataset.id);if(item)openManualModal(item)});
}

function streaks(items){
  const dates=[...new Set(items.map(x=>x.dateKey))].sort();if(!dates.length)return{current:0,longest:0};
  let longest=1,run=1;for(let i=1;i<dates.length;i++){const a=new Date(dates[i-1]+"T12:00"),b=new Date(dates[i]+"T12:00");if((b-a)/86400000===1){run++;longest=Math.max(longest,run)}else run=1}
  let current=0,d=new Date();for(let i=0;i<3650;i++){const key=localDateKey(d);if(dates.includes(key)){current++;d.setDate(d.getDate()-1)}else if(current===0){d.setDate(d.getDate()-1);if(dates.includes(localDateKey(d)))continue;break}else break}
  return{current,longest};
}
function renderHome(){const items=getHistory(),now=new Date(),month=items.filter(x=>{const d=new Date(x.completedAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});e.homeMonthCount.textContent=month.length;e.homeMonthMinutes.textContent=Math.round(month.reduce((s,x)=>s+x.durationSeconds,0)/60);e.homeStreak.textContent=streaks(items).current}

function renderCalendar(){
  const y=currentCalendar.getFullYear(),m=currentCalendar.getMonth(),items=getHistory();
  e.calendarTitle.textContent=new Intl.DateTimeFormat("nb-NO",{month:"long",year:"numeric"}).format(currentCalendar);
  e.calendarGrid.innerHTML="";
  const first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),prevDays=new Date(y,m,0).getDate();
  for(let i=0;i<42;i++){let day,dm=m,out=false;if(i<start){day=prevDays-start+i+1;dm=m-1;out=true}else if(i>=start+days){day=i-start-days+1;dm=m+1;out=true}else day=i-start+1;const d=new Date(y,dm,day),key=localDateKey(d),count=items.filter(x=>x.dateKey===key).length,b=document.createElement("button");b.className="calendar-day"+(out?" outside":"")+(key===localDateKey(new Date())?" today":"")+(selectedDate===key?" selected":"");b.innerHTML=`<span>${day}</span>${count?`<span class="day-count">${count}</span>`:""}`;b.onclick=()=>{selectedDate=key;renderCalendar();renderCalendarDetails(key)};e.calendarGrid.appendChild(b)}
  if(selectedDate)renderCalendarDetails(selectedDate);else e.calendarDayDetails.innerHTML="";
}
function renderCalendarDetails(key){const items=getHistory().filter(x=>x.dateKey===key);e.calendarDayDetails.innerHTML=`<h3>${new Intl.DateTimeFormat("nb-NO",{dateStyle:"full"}).format(new Date(key+"T12:00"))}</h3>`+(items.length?items.map(x=>`<div class="history-item"><div class="history-title">${esc(x.programName)}</div><div class="history-meta">${Math.round(x.durationSeconds/60)} min${x.distanceKm!=null?` · ${x.distanceKm} km`:""} · ${"★".repeat(x.rating||0)} · ${esc(x.effort||"")}</div>${x.comment?`<p class="history-comment">${esc(x.comment)}</p>`:""}</div>`).join(""):`<div class="empty-state">Ingen aktiviteter denne dagen.</div>`)}

function countBy(items,fn){return items.reduce((o,x)=>{const k=fn(x)||"Annet";o[k]=(o[k]||0)+1;return o},{})}
function renderBars(container,obj){const entries=Object.entries(obj),max=Math.max(1,...entries.map(x=>x[1]));container.innerHTML=entries.length?entries.map(([k,v])=>`<div class="bar-row"><span class="bar-label">${esc(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><span class="bar-value">${v}</span></div>`).join(""):`<div class="empty-state">Ingen data ennå.</div>`}
function renderStats(){const items=getHistory(),ratings=items.filter(x=>x.rating).map(x=>x.rating);e.statSessions.textContent=items.length;e.statMinutes.textContent=Math.round(items.reduce((s,x)=>s+x.durationSeconds,0)/60);e.statStreak.textContent=streaks(items).longest;e.statRating.textContent=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1):"–";renderBars(e.categoryChart,countBy(items,x=>x.category));const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;months.push([new Intl.DateTimeFormat("nb-NO",{month:"short"}).format(d),items.filter(x=>x.dateKey.startsWith(key)).length])}renderBars(e.monthlyChart,Object.fromEntries(months));const top=Object.entries(countBy(items,x=>x.programName)).sort((a,b)=>b[1]-a[1]).slice(0,5);e.topPrograms.innerHTML=top.length?top.map(([n,c])=>`<div class="top-program"><span>${esc(n)}</span><strong>${c}</strong></div>`).join(""):`<div class="empty-state">Ingen data ennå.</div>`}

function buildCustom(){const w={id:"custom",name:e.customName.value.trim()||"Min økt",category:e.customCategory.value,icon:"⭐",description:"Egendefinert",work:Number(e.customWork.value),rest:Number(e.customRest.value),rounds:Number(e.customRounds.value),workWarning:Number(e.customWorkWarning.value),restWarning:Number(e.customRestWarning.value),exercises:e.customExercises.value.split(/\n+/).map(x=>x.trim()).filter(Boolean)};if(w.work<5||w.rounds<1){alert("Kontroller arbeidstid og antall runder.");return}localStorage.setItem(CUSTOM_KEY,JSON.stringify(w));selectWorkout(w)}
function loadCustom(){try{const w=JSON.parse(localStorage.getItem(CUSTOM_KEY)||"null");if(!w)return;e.customName.value=w.name;e.customCategory.value=w.category||"Annet";e.customWork.value=w.work;e.customRest.value=w.rest;e.customRounds.value=w.rounds;e.customWorkWarning.value=w.workWarning;e.customRestWarning.value=w.restWarning;e.customExercises.value=(w.exercises||[]).join("\n")}catch{}}

function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify({beep:e.beepToggle.checked,voice:e.voiceToggle.checked,vibrate:e.vibrateToggle.checked,wake:e.wakeToggle.checked,spotify:e.spotifyUrl.value.trim()}))}
function loadSettings(){try{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");["beep","voice","vibrate","wake"].forEach(k=>{if(typeof s[k]==="boolean")e[k+"Toggle"].checked=s[k]});if(s.spotify)e.spotifyUrl.value=s.spotify}catch{}updateSpotify()}
function updateSpotify(){const u=e.spotifyUrl.value.trim()||"https://open.spotify.com/";e.spotifyHomeBtn.href=u;e.spotifyTimerBtn.href=u}
function openSettings(){e.settingsPanel.classList.remove("hidden");e.overlay.classList.remove("hidden")}
function closeSettings(){e.settingsPanel.classList.add("hidden");e.overlay.classList.add("hidden")}
function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),history:getHistory(),settings:JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"),custom:JSON.parse(localStorage.getItem(CUSTOM_KEY)||"null")},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`WorkoutTimer2-backup-${localDateKey(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importData(file){try{const data=JSON.parse(await file.text());if(!Array.isArray(data.history))throw new Error();if(!confirm(`Importere ${data.history.length} aktiviteter? Eksisterende historikk blir erstattet.`))return;setHistory(data.history);if(data.settings)localStorage.setItem(SETTINGS_KEY,JSON.stringify(data.settings));if(data.custom)localStorage.setItem(CUSTOM_KEY,JSON.stringify(data.custom));loadSettings();loadCustom();renderHome();alert("Data er importert.")}catch{alert("Kunne ikke lese sikkerhetskopien.")}}

document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
e.backBtn.onclick=()=>{pauseTimer();showScreen("home")};
e.customWorkoutBtn.onclick=()=>showScreen("custom");
e.manualFromHomeBtn.onclick=()=>openManualModal();
e.manualActivityBtn.onclick=()=>openManualModal();
e.cancelCustomBtn.onclick=()=>showScreen("home");
e.saveCustomBtn.onclick=buildCustom;
e.startPauseBtn.onclick=()=>running?pauseTimer():startTimer();
e.skipBtn.onclick=skipPhase;
e.resetBtn.onclick=resetTimer;
e.settingsBtn.onclick=openSettings;
e.closeSettingsBtn.onclick=closeSettings;
e.overlay.onclick=closeSettings;
["beepToggle","voiceToggle","vibrateToggle","wakeToggle"].forEach(id=>e[id].onchange=saveSettings);
e.saveSpotifyBtn.onclick=()=>{saveSettings();updateSpotify();alert("Spotify-lenken er lagret.")};
e.testSoundBtn.onclick=()=>cue("Arbeid. Hold ut. Gjør klar.",{freq:880,count:2});
e.ratingStars.querySelectorAll("button").forEach(b=>b.onclick=()=>{saveRating=Number(b.dataset.rating);renderStars(e.ratingStars,saveRating)});
e.manualRatingStars.querySelectorAll("button").forEach(b=>b.onclick=()=>{manualRating=Number(b.dataset.rating);renderStars(e.manualRatingStars,manualRating)});
e.saveWorkoutBtn.onclick=saveCompletedWorkout;
e.discardWorkoutBtn.onclick=()=>{e.saveWorkoutModal.classList.add("hidden");showScreen("home")};
e.saveManualActivityBtn.onclick=saveManualActivity;
e.cancelManualActivityBtn.onclick=()=>{e.manualActivityModal.classList.add("hidden");editingId=null};
e.historyCategoryFilter.onchange=renderHistory;
e.historyPeriodFilter.onchange=renderHistory;
e.exportBtn.onclick=exportData;
e.exportSettingsBtn.onclick=exportData;
e.importFile.onchange=ev=>{if(ev.target.files[0])importData(ev.target.files[0])};
e.prevMonthBtn.onclick=()=>{currentCalendar.setMonth(currentCalendar.getMonth()-1);selectedDate=null;renderCalendar()};
e.nextMonthBtn.onclick=()=>{currentCalendar.setMonth(currentCalendar.getMonth()+1);selectedDate=null;renderCalendar()};
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&running)requestWake()});
window.addEventListener("beforeinstallprompt",ev=>{ev.preventDefault();deferredInstallPrompt=ev;e.installBtn.classList.remove("hidden")});
e.installBtn.onclick=async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;e.installBtn.classList.add("hidden")};

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

renderPresets();
loadSettings();
loadCustom();
renderHome();
renderTimer();
showScreen("home");
})();