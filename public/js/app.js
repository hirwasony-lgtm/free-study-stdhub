let currentSubject = 0;
let score = 0;
let totalQuestions = 0;
let answeredQuestions = new Set();

const savedScore = localStorage.getItem("studyhub_score");

if (savedScore !== null) {
  score = Number(savedScore);
}

async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  return r.json();
}

async function loadSubjects() {
  const data = await getJSON("/api/subjects");

  document.getElementById("subjectCount").textContent =
    data.length + " subjects";

  document.getElementById("subjectsGrid").innerHTML = data
    .map(
      (s) => `
        <div class="card">
          <h3>${esc(s.name)}</h3>
          <p class="muted">${esc(s.description)}</p>
          <button onclick="filterSubject(${s.id})">
            Open subject
          </button>
        </div>
      `
    )
    .join("");
}

async function loadQuestions() {
  const searchBox = document.getElementById("search");
  const q = searchBox ? searchBox.value.trim() : "";

  const url =
    "/api/questions?" +
    new URLSearchParams({
      q,
      subject_id: currentSubject || "",
    });

  const data = await getJSON(url);

  totalQuestions = data.length;

  const box = document.getElementById("questionsList");

  updateScore();

  if (!data.length) {
    box.innerHTML = "<p class='muted'>No questions found yet.</p>";
    return;
  }

  box.innerHTML = data
    .map(
      (x) => `
        <article class="question">
          <h3>${esc(x.question)}</h3>

          <p class="muted">${esc(x.subject_name)}</p>

          <div class="answer-box">
            <input
              type="text"
              id="answer-${x.id}"
              placeholder="Type your answer here"
              autocomplete="off"
            />

            <button onclick="checkAnswer(${x.id})">
              Check Answer
            </button>
          </div>

          <div id="result-${x.id}" class="result"></div>
        </article>
      `
    )
    .join("");
}

async function checkAnswer(questionId) {
  const input = document.getElementById(`answer-${questionId}`);
  const result = document.getElementById(`result-${questionId}`);

  const userAnswer = input.value.trim();

  if (!userAnswer) {
    result.innerHTML = `
      <p class="wrong">Please enter your answer.</p>
    `;
    return;
  }

  if (answeredQuestions.has(questionId)) {
    result.innerHTML = `
      <p class="muted">You already answered this question.</p>
    `;
    return;
  }

  result.innerHTML = "<p>Checking...</p>";

  try {
    const data = await getJSON(`/api/questions/${questionId}/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer: userAnswer,
      }),
    });

    answeredQuestions.add(questionId);

    if (data.correct) {
      score++;

      localStorage.setItem("studyhub_score", score);

      result.innerHTML = `
        <p class="correct">✅ Correct answer! +1 point</p>
      `;
    } else {
      result.innerHTML = `
        <p class="wrong">❌ Incorrect answer.</p>
        <p class="correct-answer">
          Correct answer: <b>${esc(data.correctAnswer)}</b>
        </p>
      `;
    }

    updateScore();
  } catch (error) {
    result.innerHTML = `
      <p class="wrong">
        Something went wrong. Please try again.
      </p>
    `;
  }
}

function updateScore() {
  let scoreBox = document.getElementById("scoreBox");

  if (!scoreBox) {
    scoreBox = document.createElement("div");
    scoreBox.id = "scoreBox";
    scoreBox.className = "score-box";

    const questionsSection = document.getElementById("questions");

    questionsSection.insertBefore(
      scoreBox,
      document.getElementById("questionsList")
    );
  }

  const progress =
    totalQuestions > 0
      ? Math.round((score / totalQuestions) * 100)
      : 0;

  let message = "";

  if (progress >= 80) {
    message = "🏆 Great job!";
  } else if (progress >= 50) {
    message = "👏 Keep going!";
  } else {
    message = "💪 Keep practicing!";
  }

  scoreBox.innerHTML = `
    <strong>📊 Score: ${score} / ${totalQuestions}</strong>
    <br>
    <span>📈 Progress: ${progress}%</span>
    <br>
    <span>${message}</span>
    <br><br>
    <button onclick="resetProgress()">🔄 Reset Progress</button>
  `;
}

function resetProgress() {
  score = 0;
  answeredQuestions.clear();

  localStorage.removeItem("studyhub_score");

  updateScore();
}

function filterSubject(id) {
  currentSubject = id;

  document
    .getElementById("questions")
    .scrollIntoView({ behavior: "smooth" });

  loadQuestions();
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m]
  );
}

const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

loadSubjects();
loadQuestions();
async function askAI() {
  const input = document.getElementById("aiQuestion");
  const result = document.getElementById("aiResult");

  const question = input.value.trim();

  if (!question) {
    result.innerHTML =
      "<p class='wrong'>Please enter a question.</p>";
    return;
  }

  result.innerHTML =
    "<p>🤔 Thinking...</p>";

  try {
    const response = await getJSON("/api/ask-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question
      })
    });

    if (response.error) {
      result.innerHTML =
        `<p class="wrong">${esc(response.error)}</p>`;
      return;
    }

    result.innerHTML = `
      <div class="ai-answer">
        <h3>💡 Answer</h3>
        <p>${esc(response.answer).replace(/\n/g, "<br>")}</p>
      </div>
    `;

  } catch (error) {
    console.error(error);

    result.innerHTML = `
      <p class="wrong">
        ❌ Unable to connect to AI. Please try again.
      </p>
    `;
  }
}