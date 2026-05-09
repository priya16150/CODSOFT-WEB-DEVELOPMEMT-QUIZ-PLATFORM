const USERS_KEY = "quiz_users";
const QUIZZES_KEY = "quiz_quizzes";
const SESSION_KEY = "quiz_current_user";

function initData() {
    if (!localStorage.getItem(USERS_KEY)) {
        const defaultUsers = [
            { username: "alice", email: "alice@quiz.com", password: "123" }
        ];
        localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
    if (!localStorage.getItem(QUIZZES_KEY)) {
        const sampleQuiz = {
            id: "sample1",
            title: "🏃 Fitness & Sports",
            description: "Based on physical activity habits",
            questions: [
                {
                    text: "Have you practiced sport or physical activity outside work for at least 30 min during the last month?",
                    options: ["3 times or more per week", "1 or 2 times per week", "Less than 4 times per month", "I don’t practise sport"],
                    correct: 0
                },
                {
                    text: "Which is a moderate-intensity exercise?",
                    options: ["Brisk walking", "Sleeping", "Video games", "Driving"],
                    correct: 0
                }
            ],
            createdBy: "alice"
        };
        localStorage.setItem(QUIZZES_KEY, JSON.stringify([sampleQuiz]));
    }
}

function registerUser(username, email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY));
    if (users.find(u => u.username === username)) return false;
    users.push({ username, email, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
}

function loginUser(username, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY));
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, email: user.email }));
        return true;
    }
    return false;
}

function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
}

function getCurrentUser() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
}

function requireAuth() {
    if (!getCurrentUser()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function getAllQuizzes() {
    return JSON.parse(localStorage.getItem(QUIZZES_KEY)) || [];
}

function saveQuiz(quiz) {
    const quizzes = getAllQuizzes();
    quizzes.push(quiz);
    localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

function getQuizById(id) {
    return getAllQuizzes().find(q => q.id === id);
}
if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value;
        if (loginUser(username, password)) {
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("loginError").innerText = "Invalid username or password";
        }
    });
}

if (document.getElementById("registerForm")) {
    document.getElementById("registerForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        if (registerUser(username, email, password)) {
            alert("Registration successful! Please login.");
            window.location.href = "login.html";
        } else {
            document.getElementById("regError").innerText = "Username already exists";
        }
    });
}

if (window.location.pathname.includes("dashboard.html")) {
    if (!requireAuth()) return;
    const user = getCurrentUser();
    document.getElementById("userNameDisplay").innerHTML = `👤 ${user.username}`;
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
}

if (window.location.pathname.includes("take-quiz.html")) {
    if (!requireAuth()) return;
    const quizzes = getAllQuizzes();
    const container = document.getElementById("quizListContainer");
    if (quizzes.length === 0) {
        container.innerHTML = "<div class='card'>No quizzes available. <a href='create-quiz.html'>Create one now</a></div>";
    } else {
        container.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card">
                <h3>${escapeHtml(quiz.title)}</h3>
                <p>${escapeHtml(quiz.description || "No description")}</p>
                <small>${quiz.questions.length} questions · by ${escapeHtml(quiz.createdBy)}</small>
                <div style="margin-top:12px">
                    <button class="btn btn-primary start-quiz-btn" data-id="${quiz.id}">▶ Start Quiz</button>
                </div>
            </div>
        `).join('');
        document.querySelectorAll(".start-quiz-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const quizId = btn.getAttribute("data-id");
                localStorage.setItem("activeQuizId", quizId);
                localStorage.removeItem("quizUserAnswers");
                localStorage.removeItem("quizCurrentIndex");
                window.location.href = "attempt-quiz.html";
            });
        });
    }
}


if (window.location.pathname.includes("attempt-quiz.html")) {
    if (!requireAuth()) return;
    const quizId = localStorage.getItem("activeQuizId");
    if (!quizId) { window.location.href = "take-quiz.html"; }
    const quiz = getQuizById(quizId);
    if (!quiz) { window.location.href = "take-quiz.html"; }
    
    let userAnswers = JSON.parse(localStorage.getItem("quizUserAnswers")) || new Array(quiz.questions.length).fill(-1);
    let currentIndex = parseInt(localStorage.getItem("quizCurrentIndex")) || 0;
    
    function saveProgress() {
        localStorage.setItem("quizUserAnswers", JSON.stringify(userAnswers));
        localStorage.setItem("quizCurrentIndex", currentIndex);
    }
    
    function renderQuestion() {
        const q = quiz.questions[currentIndex];
        const selected = userAnswers[currentIndex];
        const html = `
            <div class="card">
                <h2>📖 ${escapeHtml(quiz.title)}</h2>
                <p><strong>Question ${currentIndex+1} of ${quiz.questions.length}</strong></p>
                <p style="font-size:1.2rem; margin:1rem 0">${escapeHtml(q.text)}</p>
                <div>
                    ${q.options.map((opt, idx) => `
                        <label class="option-label">
                            <input type="radio" name="quizOption" value="${idx}" ${selected === idx ? 'checked' : ''}>
                            ${escapeHtml(opt)}
                        </label>
                    `).join('')}
                </div>
                <div style="margin-top:1.5rem">
                    <button id="submitAnswerBtn" class="btn btn-primary">${currentIndex+1 === quiz.questions.length ? "Finish Quiz" : "Next Question"}</button>
                    <button id="cancelQuizBtn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        document.getElementById("quizArea").innerHTML = html;
        
        document.getElementById("submitAnswerBtn").addEventListener("click", () => {
            const selectedRadio = document.querySelector('input[name="quizOption"]:checked');
            if (!selectedRadio) { alert("Please select an answer"); return; }
            const answerIdx = parseInt(selectedRadio.value);
            userAnswers[currentIndex] = answerIdx;
            saveProgress();
            if (currentIndex + 1 < quiz.questions.length) {
                currentIndex++;
                saveProgress();
                renderQuestion();
            } else {
                let score = 0;
                const details = [];
                quiz.questions.forEach((q, idx) => {
                    const isCorrect = (userAnswers[idx] === q.correct);
                    if (isCorrect) score++;
                    details.push({
                        questionText: q.text,
                        userAnswer: userAnswers[idx] !== -1 ? q.options[userAnswers[idx]] : "Not answered",
                        correctAnswer: q.options[q.correct],
                        isCorrect
                    });
                });
                const resultData = {
                    quizTitle: quiz.title,
                    score: score,
                    total: quiz.questions.length,
                    details: details
                };
                localStorage.setItem("quizResult", JSON.stringify(resultData));
                localStorage.removeItem("activeQuizId");
                localStorage.removeItem("quizUserAnswers");
                localStorage.removeItem("quizCurrentIndex");
                window.location.href = "results.html";
            }
        });
        
        document.getElementById("cancelQuizBtn").addEventListener("click", () => {
            localStorage.removeItem("activeQuizId");
            localStorage.removeItem("quizUserAnswers");
            localStorage.removeItem("quizCurrentIndex");
            window.location.href = "take-quiz.html";
        });
    }
    renderQuestion();
}

if (window.location.pathname.includes("results.html")) {
    if (!requireAuth()) return;
    const resultRaw = localStorage.getItem("quizResult");
    if (!resultRaw) { window.location.href = "take-quiz.html"; }
    const result = JSON.parse(resultRaw);
    const percentage = Math.round((result.score / result.total) * 100);
    let detailsHtml = "";
    result.details.forEach((det, i) => {
        detailsHtml += `
            <div style="border-left: 4px solid ${det.isCorrect ? '#2e7d64' : '#c44536'}; padding-left: 12px; margin-bottom: 20px;">
                <p><strong>Q${i+1}:</strong> ${escapeHtml(det.questionText)}</p>
                <p>📌 Your answer: ${escapeHtml(det.userAnswer)}</p>
                <p>✅ Correct: ${escapeHtml(det.correctAnswer)}</p>
                <span style="color:${det.isCorrect ? 'green' : 'red'}">${det.isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
            </div>
        `;
    });
    document.getElementById("resultsContainer").innerHTML = `
        <h2>🏆 Quiz Results: ${escapeHtml(result.quizTitle)}</h2>
        <div style="background:#f0f7ff; padding:1rem; border-radius:1rem; margin:1rem 0">
            <strong>Score: ${result.score} / ${result.total} (${percentage}%)</strong>
        </div>
        <hr>
        ${detailsHtml}
    `;
    localStorage.removeItem("quizResult");
}

if (window.location.pathname.includes("create-quiz.html")) {
    if (!requireAuth()) return;
    let questionCounter = 0;
    const questionsContainer = document.getElementById("questionsContainer");
    
    function addQuestionBlock(text = "", options = ["","","",""], correctIdx = 0) {
        const block = document.createElement("div");
        block.className = "question-block";
        block.setAttribute("data-qid", questionCounter++);
        block.innerHTML = `
            <h4>Question ${questionCounter}</h4>
            <input type="text" class="q-text" placeholder="Question text" value="${escapeHtml(text)}">
            <label>Options (4 choices)</label>
            ${options.map((opt, i) => `<input type="text" class="opt-${i}" placeholder="Option ${i+1}" value="${escapeHtml(opt)}">`).join('')}
            <label>Correct answer:</label>
            <select class="correct-select">
                ${options.map((_, i) => `<option value="${i}" ${correctIdx === i ? 'selected' : ''}>Option ${i+1}</option>`).join('')}
            </select>
            <button type="button" class="remove-question-btn btn-small btn-danger">Remove</button>
        `;
        const removeBtn = block.querySelector(".remove-question-btn");
        removeBtn.addEventListener("click", () => block.remove());
        questionsContainer.appendChild(block);
    }
    
    addQuestionBlock();
    
    document.getElementById("addQuestionBtn").addEventListener("click", () => addQuestionBlock());
    
    document.getElementById("createQuizForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("quizTitle").value.trim();
        if (!title) { alert("Quiz title required"); return; }
        const description = document.getElementById("quizDesc").value.trim();
        const blocks = document.querySelectorAll(".question-block");
        const questions = [];
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const qText = block.querySelector(".q-text").value.trim();
            if (!qText) { alert(`Question ${i+1} text missing`); return; }
            const opts = [];
            for (let j = 0; j < 4; j++) {
                let optVal = block.querySelector(`.opt-${j}`).value.trim();
                if (!optVal && j < 2) { alert(`Option ${j+1} for question ${i+1} missing`); return; }
                opts.push(optVal || "");
            }
            const correct = parseInt(block.querySelector(".correct-select").value);
            if (isNaN(correct) || !opts[correct]) { alert(`Correct answer missing for Q${i+1}`); return; }
            questions.push({ text: qText, options: opts, correct });
        }
        const newQuiz = {
            id: Date.now().toString(),
            title: title,
            description: description,
            questions: questions,
            createdBy: getCurrentUser().username
        };
        saveQuiz(newQuiz);
        alert("Quiz created successfully!");
        window.location.href = "dashboard.html";
    });
}


function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

initData();
