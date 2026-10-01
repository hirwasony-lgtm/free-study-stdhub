let subjects=[],questions=[];
const $=id=>document.getElementById(id);
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const data=await r.json();if(!r.ok)throw Error(data.error||"Request failed");return data}
async function check(){const m=await api("/api/me");if(m.loggedIn)showDash();else $("loginBox").hidden=false}
async function login(e){e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({username:$("username").value,password:$("password").value})});showDash()}catch(e){$("loginMsg").textContent=e.message}}
async function showDash(){ $("loginBox").hidden=true;$("dashboard").hidden=false;await refresh()}
async function refresh(){subjects=await api("/api/subjects");questions=await api("/api/questions");renderSubjects();fillSelect();renderAdminQuestions()}
function renderSubjects(){$("adminSubjects").innerHTML=subjects.map(s=>`<div class="admin-row"><span><b>${esc(s.name)}</b><br><small>${esc(s.description)}</small></span><button class="danger" onclick="delSubject(${s.id})">Delete</button></div>`).join("")}
function fillSelect(){$("qSubject").innerHTML=subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}
function renderAdminQuestions(){const f=($("adminSearch")?.value||"").toLowerCase();$("adminQuestions").innerHTML=questions.filter(x=>(x.question+" "+x.answer+" "+x.subject_name).toLowerCase().includes(f)).map(x=>`<div class="admin-row"><div><b>${esc(x.subject_name)}</b><br>${esc(x.question)}<br><span class="muted">${esc(x.answer)}</span></div><button class="danger" onclick="delQuestion(${x.id})">Delete</button></div>`).join("")||"<p class='muted'>No questions.</p>"}
async function addSubject(e){e.preventDefault();try{await api("/api/admin/subjects",{method:"POST",body:JSON.stringify({name:$("subjectName").value,description:$("subjectDesc").value})});e.target.reset();await refresh()}catch(e){alert(e.message)}}
async function addQuestion(e){e.preventDefault();try{await api("/api/admin/questions",{method:"POST",body:JSON.stringify({subject_id:$("qSubject").value,question:$("question").value,answer:$("answer").value})});e.target.reset();$("qMsg").textContent="Question added successfully.";await refresh()}catch(e){$("qMsg").textContent=e.message}}
async function delSubject(id){if(!confirm("Delete this subject and its questions?"))return;await api("/api/admin/subjects/"+id,{method:"DELETE"});await refresh()}
async function delQuestion(id){if(!confirm("Delete this question?"))return;await api("/api/admin/questions/"+id,{method:"DELETE"});await refresh()}
async function logout(){await api("/api/logout",{method:"POST"});location.reload()}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$("loginForm").addEventListener("submit",login);$("subjectForm").addEventListener("submit",addSubject);$("questionForm").addEventListener("submit",addQuestion);check();