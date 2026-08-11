(() => {
"use strict";
const URL="https://lannjcyihlyvvzecefrs.supabase.co";
const KEY="sb_publishable_q1eHMt-EqiUGnjRF1bUt3A_s8beQVaM";
const HISTORY_KEY="workouttimer2_history_v1";
const client=window.supabase.createClient(URL,KEY);
let session=null,user=null,suppress=false,syncTimer=null;
const $=id=>document.getElementById(id);

function getLocal(){try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(x)?x:[]}catch{return[]}}
function setLocal(items){suppress=true;localStorage.setItem(HISTORY_KEY,JSON.stringify(items));suppress=false}
function keyDate(d){const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function toDb(x){return{id:x.id,user_id:user.id,program_id:x.programId||null,program_name:x.programName||"Aktivitet",category:x.category||"Annet",completed_at:x.completedAt||new Date().toISOString(),duration_seconds:x.durationSeconds||0,rating:x.rating||null,effort:x.effort||null,comment:x.comment||null,distance_km:x.distanceKm??null,manual:!!x.manual,work_seconds:x.workSeconds??null,rest_seconds:x.restSeconds??null,rounds:x.rounds??null}}
function fromDb(x){return{id:x.id,programId:x.program_id,programName:x.program_name,category:x.category,completedAt:x.completed_at,dateKey:keyDate(new Date(x.completed_at)),durationSeconds:x.duration_seconds,rating:x.rating,effort:x.effort,comment:x.comment,distanceKm:x.distance_km==null?null:Number(x.distance_km),manual:x.manual,workSeconds:x.work_seconds,restSeconds:x.rest_seconds,rounds:x.rounds}}
function banner(type,text){const b=$("syncBanner"),t=$("syncText"),btn=$("syncNowBtn");if(!b||!t)return;b.classList.remove("online","warn");if(type)b.classList.add(type);t.textContent=text;if(btn)btn.classList.toggle("hidden",!user)}
function authUI(){const out=$("loggedOutPanel"),inside=$("loggedInPanel"),email=$("accountEmail"),title=$("accountTitle");if(!out)return;if(user){out.classList.add("hidden");inside.classList.remove("hidden");email.textContent=user.email||"Innlogget";title.textContent="Min konto";banner("online",`Innlogget som ${user.email}`)}else{out.classList.remove("hidden");inside.classList.add("hidden");title.textContent="Logg inn";banner("","Ikke logget inn · aktiviteter lagres lokalt")}}
function openAccount(){$("accountModal")?.classList.remove("hidden");authUI()}
function closeAccount(){$("accountModal")?.classList.add("hidden");const m=$("authMessage");if(m)m.textContent=""}

async function syncNow(){
 if(!user){openAccount();return}
 banner("","Synkroniserer…");
 try{
   const local=getLocal();
   const {data:cloud,error:readErr}=await client.from("activities").select("*").order("completed_at",{ascending:false});
   if(readErr)throw readErr;
   const cloudItems=(cloud||[]).map(fromDb);
   const merged=new Map();cloudItems.forEach(x=>merged.set(x.id,x));local.forEach(x=>merged.set(x.id,x));
   const all=[...merged.values()].sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt));
   if(all.length){const {error}=await client.from("activities").upsert(all.map(toDb),{onConflict:"id"});if(error)throw error}
   const {data:fresh,error:freshErr}=await client.from("activities").select("*").order("completed_at",{ascending:false});if(freshErr)throw freshErr;
   setLocal((fresh||[]).map(fromDb));
   banner("online",`Synkronisert · ${(fresh||[]).length} aktiviteter`);
   window.dispatchEvent(new CustomEvent("workouttimer2-synced"));
 }catch(err){console.error(err);banner("warn","Databasesynk feilet · lokal lagring er fortsatt aktiv") }
}
function queueSync(){if(!user||suppress)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,350)}
const originalSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){originalSet.call(this,k,v);if(this===localStorage&&k===HISTORY_KEY&&!suppress)queueSync()};

async function login(){const m=$("authMessage");if(m)m.textContent="Logger inn…";const {error}=await client.auth.signInWithPassword({email:$("authEmail").value.trim(),password:$("authPassword").value});if(error){m.textContent=error.message}else m.textContent=""}
async function signup(){const m=$("authMessage");m.textContent="Oppretter bruker…";const {data,error}=await client.auth.signUp({email:$("authEmail").value.trim(),password:$("authPassword").value,options:{emailRedirectTo:"https://ronesse.github.io/WorkoutTimer2/"}});if(error)m.textContent=error.message;else m.textContent=data.session?"Bruker opprettet og innlogget.":"Sjekk e-posten din og bekreft kontoen før du logger inn."}
async function logout(){await client.auth.signOut();closeAccount()}
async function forgot(){const m=$("authMessage"),email=$("authEmail").value.trim();if(!email){m.textContent="Skriv inn e-postadressen først.";return}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:"https://ronesse.github.io/WorkoutTimer2/"});m.textContent=error?error.message:"E-post for passordbytte er sendt."}

function bind(){
 $("accountBtn")?.addEventListener("click",openAccount);$("closeAccountBtn")?.addEventListener("click",closeAccount);
 $("loginBtn")?.addEventListener("click",login);$("signupBtn")?.addEventListener("click",signup);$("logoutBtn")?.addEventListener("click",logout);$("forgotPasswordBtn")?.addEventListener("click",forgot);
 $("syncNowBtn")?.addEventListener("click",syncNow);$("syncAccountBtn")?.addEventListener("click",syncNow);
}
client.auth.onAuthStateChange(async(_event,s)=>{session=s;user=s?.user||null;authUI();if(user){await syncNow();closeAccount()}});
window.WorkoutDB={client,syncNow,getUser:()=>user};
window.addEventListener("DOMContentLoaded",async()=>{bind();const {data}=await client.auth.getSession();session=data.session;user=session?.user||null;authUI();if(user)await syncNow()});
})();
