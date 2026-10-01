let currentSubject=0;
async function getJSON(url,opts){const r=await fetch(url,opts);return r.json()}
async function loadSubjects(){
 const data=await getJSON("/api/subjects"); document.getElementById("subjectCount").textContent=data.length+" subjects";
 document.getElementById("subjectsGrid").innerHTML=data.map(s=>`<div class="card"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.description)}</p><button onclick="filterSubject(${s.id})">Open subject</button></div>`).join("");
}
async function loadQuestions(){
 const q=document.getElementById("search").value.trim(); const url="/api/questions?"+new URLSearchParams({q,subject_id:currentSubject||""});
 const data=await getJSON(url); const box=document.getElementById("questionsList");
 box.innerHTML=data.length?data.map(x=>`<article class="question"><h3>${esc(x.question)}</h3><p class="muted">${esc(x.subject_name)}</p><p class="answer"><b>Answer:</b> ${esc(x.answer)}</p></article>`).join(""):"<p class='muted'>No questions found yet.</p>";
}
function filterSubject(id){currentSubject=id;document.getElementById("questions").scrollIntoView({behavior:"smooth"});loadQuestions()}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
document.getElementById("year").textContent=new Date().getFullYear();loadSubjects();loadQuestions();