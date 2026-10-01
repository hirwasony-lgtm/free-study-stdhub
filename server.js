const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "studyhub.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      nextSubjectId: 4,
      nextQuestionId: 1,
      admins: [{ id: 1, username: process.env.ADMIN_USERNAME || "admin", password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || "bu++er3ry", 10) }],
      subjects: [
        { id: 1, name: "Mathematics", description: "Mathematics questions, exercises and answers." },
        { id: 2, name: "Computer Science", description: "Computer networks, programming, databases and ICT." },
        { id: 3, name: "Economics", description: "Economics notes, questions and revision materials." }
      ],
      questions: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
let db = loadData();
function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 4 }
}));
app.use(express.static(path.join(__dirname, "public")));

function auth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: "Unauthorized" });
}

app.get("/api/subjects", (req, res) => res.json([...db.subjects].sort((a,b) => a.name.localeCompare(b.name))));

app.get("/api/questions", (req, res) => {
  const subjectId = Number(req.query.subject_id || 0);
  const q = String(req.query.q || "").trim().toLowerCase();
  const rows = db.questions.filter(item => {
    const subject = db.subjects.find(s => s.id === item.subject_id);
    if (subjectId && item.subject_id !== subjectId) return false;
    if (!q) return true;
    return `${item.question} ${item.answer} ${subject ? subject.name : ""}`.toLowerCase().includes(q);
  }).map(item => ({ ...item, subject_name: db.subjects.find(s => s.id === item.subject_id)?.name || "Unknown" }))
    .sort((a,b) => b.id - a.id);
  res.json(rows);
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = db.admins.find(x => x.username === String(username || ""));
  if (!user || !bcrypt.compareSync(String(password || ""), user.password_hash)) return res.status(401).json({ error: "Invalid username or password" });
  req.session.admin = { id: user.id, username: user.username };
  res.json({ ok: true, username: user.username });
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/me", (req, res) => res.json({ loggedIn: !!req.session.admin, username: req.session.admin?.username || null }));

app.post("/api/admin/subjects", auth, (req, res) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  if (!name) return res.status(400).json({ error: "Subject name is required" });
  if (db.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: "Subject already exists" });
  const subject = { id: db.nextSubjectId++, name, description };
  db.subjects.push(subject); save(); res.json(subject);
});
app.put("/api/admin/subjects/:id", auth, (req, res) => {
  const subject = db.subjects.find(s => s.id === Number(req.params.id));
  if (!subject) return res.status(404).json({ error: "Subject not found" });
  subject.name = String(req.body.name || "").trim(); subject.description = String(req.body.description || "").trim(); save(); res.json({ ok: true });
});
app.delete("/api/admin/subjects/:id", auth, (req, res) => {
  const id = Number(req.params.id); db.subjects = db.subjects.filter(s => s.id !== id); db.questions = db.questions.filter(q => q.subject_id !== id); save(); res.json({ ok: true });
});

app.post("/api/admin/questions", auth, (req, res) => {
  const subject_id = Number(req.body.subject_id); const question = String(req.body.question || "").trim(); const answer = String(req.body.answer || "").trim();
  if (!db.subjects.some(s => s.id === subject_id) || !question || !answer) return res.status(400).json({ error: "Subject, question and answer are required" });
  const item = { id: db.nextQuestionId++, subject_id, question, answer }; db.questions.push(item); save(); res.json(item);
});
app.put("/api/admin/questions/:id", auth, (req, res) => {
  const item = db.questions.find(q => q.id === Number(req.params.id)); if (!item) return res.status(404).json({ error: "Question not found" });
  item.subject_id = Number(req.body.subject_id); item.question = String(req.body.question || "").trim(); item.answer = String(req.body.answer || "").trim(); save(); res.json({ ok: true });
});
app.delete("/api/admin/questions/:id", auth, (req, res) => { db.questions = db.questions.filter(q => q.id !== Number(req.params.id)); save(); res.json({ ok: true }); });

app.listen(PORT, () => console.log(`Free Study Std.Hub running at http://localhost:${PORT}`));
