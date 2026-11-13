const titleInput = document.getElementById("session-title");
const notesInput = document.getElementById("notes-input");
const wordCount = document.getElementById("word-count");
const charLimit = document.getElementById("char-limit");
const backButton = document.getElementById("back-button");
const saveButton = document.getElementById("save-button");
const organizeButton = document.getElementById("organize-button");
const deleteButton = document.getElementById("delete-button");
const newSessionButton = document.getElementById("new-session-button");
const structuredNotes = document.getElementById("structured-notes");
const keyPoints = document.getElementById("key-points");
const questions = document.getElementById("questions");
const followUpItems = document.getElementById("follow-up-items");
const sessionCount = document.getElementById("session-count");
const editor = document.querySelector(".editor");
const progressSteps = document.querySelector(".progress-steps");
const progressBar = document.querySelector(".progress-bar");
const statusTag = document.querySelector(".status-tag");
const resultsSection = document.querySelector(".results");
const sessionsList = document.querySelector(".sessions-list");
const notesForm = document.querySelector(".notes-form");
const startSessionLink = document.querySelector(".hero .button-primary");

const storageKey = "classnotes-sessions";
const sessionLimit = 2000;
const resultFields = {
  structured: structuredNotes,
  keyPoints,
  questions,
  followUp: followUpItems,
};

let sessions = loadSessions();
let currentSessionId = null;
let currentStep = 1;
let organizationTimer = null;

function loadSessions() {
  try {
    const storedSessions = localStorage.getItem(storageKey);
    if (!storedSessions) {
      return [];
    }

    const parsedSessions = JSON.parse(storedSessions);
    if (!Array.isArray(parsedSessions)) {
      throw new TypeError("Saved ClassNotes data must be an array.");
    }

    return parsedSessions.filter(
      (session) =>
        session &&
        typeof session.id === "string" &&
        typeof session.title === "string" &&
        typeof session.raw === "string" &&
        ["saved", "organized"].includes(session.status) &&
        typeof session.updatedAt === "string" &&
        (session.organized === null ||
          (session.organized &&
            ["structured", "keyPoints", "questions", "followUp"].every(
              (key) =>
                Array.isArray(session.organized[key]) &&
                session.organized[key].every((line) => typeof line === "string"),
            ))),
    ).map((session) => ({
      id: session.id,
      title: session.title,
      raw: session.raw,
      status: session.status,
      organized: session.organized ?? null,
      updatedAt: session.updatedAt,
    }));
  } catch (error) {
    console.error("Unable to load saved ClassNotes sessions.", error);
    return [];
  }
}

function persistSessions() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(sessions));
  } catch (error) {
    console.error("Unable to save ClassNotes sessions to local storage.", error);
  }
}

function getCurrentSession() {
  return sessions.find((session) => session.id === currentSessionId) ?? null;
}

function updateCounts() {
  const notes = notesInput.value;
  const words = notes.trim() ? notes.trim().split(/\s+/u).length : 0;

  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  charLimit.textContent = `${notes.length} / ${sessionLimit}`;
  charLimit.classList.toggle("over", notes.length > sessionLimit);
  saveButton.disabled = !notes.trim() || notes.length > sessionLimit;
}

function updateStatus(status) {
  const label = status === "organized" ? "Organized" : status === "saved" ? "Saved" : "Draft";
  statusTag.textContent = label;
  statusTag.classList.remove("tag-draft", "tag-saved", "tag-organized");
  statusTag.classList.add(`tag-${status}`);
}

function setStep(step) {
  currentStep = Math.min(4, Math.max(1, step));
  editor.dataset.step = String(currentStep);
  progressBar.setAttribute("aria-valuenow", String(currentStep));

  progressSteps.querySelectorAll(".step").forEach((stepElement, index) => {
    const stepNumber = index + 1;
    stepElement.classList.toggle("done", stepNumber < currentStep);
    stepElement.classList.toggle("active", stepNumber === currentStep);
  });

  backButton.disabled = currentStep === 1;
}

function clearOrganizationTimer() {
  if (organizationTimer !== null) {
    window.clearTimeout(organizationTimer);
    organizationTimer = null;
  }
}

function clearResults() {
  Object.values(resultFields).forEach((field) => {
    field.textContent = "None found";
  });
  resultsSection.classList.add("hidden");
}

function fillResults(organized) {
  Object.entries(resultFields).forEach(([key, field]) => {
    const lines = organized[key];
    field.textContent = lines.length ? lines.join("\n") : "None found";
  });
  resultsSection.classList.remove("hidden");
}

function updateSessionCard(card, session, title, date, tag) {
  title.textContent = session.title;
  date.textContent = new Date(session.updatedAt).toLocaleDateString();
  tag.textContent = session.status === "organized" ? "Organized" : "Saved";
  tag.classList.remove("tag-draft", "tag-saved", "tag-organized");
  tag.classList.add(`tag-${session.status}`);
  card.classList.toggle("active", session.id === currentSessionId);
}

function createSessionCard(session) {
  const card = document.createElement("li");
  card.classList.add("session-item");
  card.dataset.sessionId = session.id;
  card.tabIndex = 0;

  const title = document.createElement("h3");
  card.appendChild(title);

  const date = document.createElement("p");
  card.appendChild(date);

  const tag = document.createElement("span");
  tag.classList.add("status-tag");
  card.appendChild(tag);

  updateSessionCard(card, session, title, date, tag);
  return card;
}

function renderSessions() {
  sessionsList.replaceChildren();
  sessionCount.textContent = `${sessions.length} saved ${sessions.length === 1 ? "session" : "sessions"}`;

  if (sessions.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.classList.add("empty-state");
    emptyState.textContent = "No sessions yet. Capture your first notes.";
    sessionsList.appendChild(emptyState);
    return;
  }

  sessions.forEach((session) => {
    sessionsList.appendChild(createSessionCard(session));
  });
}

function renderCurrentSession() {
  const session = getCurrentSession();
  const organized = session?.organized ?? null;

  titleInput.value = session?.title ?? "";
  notesInput.value = session?.raw ?? "";
  updateCounts();
  saveButton.textContent = session ? "Update session" : "Save session";
  deleteButton.disabled = !session;
  organizeButton.disabled = !session || !isUnchanged(session);
  updateStatus(session?.status ?? "draft");

  if (organized && session?.status === "organized") {
    fillResults(organized);
    setStep(4);
  } else {
    clearResults();
    setStep(session ? 2 : 1);
  }
  renderSessions();
}

function isUnchanged(session) {
  return titleInput.value.trim() === session.title && notesInput.value === session.raw;
}

function resetEditor() {
  clearOrganizationTimer();
  currentSessionId = null;
  titleInput.value = "";
  notesInput.value = "";
  saveButton.textContent = "Save session";
  deleteButton.disabled = true;
  organizeButton.disabled = true;
  updateStatus("draft");
  clearResults();
  setStep(1);
  updateCounts();
  renderSessions();
  notesInput.focus();
}

function handleEditorChange() {
  clearOrganizationTimer();
  updateCounts();

  const session = getCurrentSession();
  if (!session) {
    organizeButton.disabled = true;
    return;
  }

  const unchanged = isUnchanged(session);
  organizeButton.disabled = !unchanged;
  if (!unchanged) {
    setStep(2);
    updateStatus("draft");
    clearResults();
  } else {
    updateStatus(session.status);
    if (session.organized && session.status === "organized") {
      fillResults(session.organized);
    }
  }
  renderSessions();
}

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function saveSession() {
  const raw = notesInput.value;
  if (!raw.trim() || raw.length > sessionLimit) {
    updateCounts();
    return;
  }

  const title = titleInput.value.trim() || "Untitled session";
  titleInput.value = title;
  const timestamp = new Date().toISOString();
  let session = getCurrentSession();

  if (session) {
    session.title = title;
    session.raw = raw;
    session.status = "saved";
    session.organized = null;
    session.updatedAt = timestamp;
  } else {
    session = {
      id: createSessionId(),
      title,
      raw,
      status: "saved",
      organized: null,
      updatedAt: timestamp,
    };
    sessions.push(session);
    currentSessionId = session.id;
  }

  persistSessions();
  clearResults();
  updateStatus("saved");
  saveButton.textContent = "Update session";
  deleteButton.disabled = false;
  organizeButton.disabled = false;
  setStep(2);
  renderSessions();
  console.log(`Session "${session.title}" status: ${session.status}`);
}

function organizeNotes(raw) {
  const organized = {
    structured: [],
    keyPoints: [],
    questions: [],
    followUp: [],
  };

  raw.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    if (/\?$/u.test(line)) {
      organized.questions.push(line);
    } else if (/\b(?:review|need\s+to|follow\s+up|due)\b/iu.test(line)) {
      organized.followUp.push(line);
    } else if (/\b(?:important|exam)\b/iu.test(line)) {
      organized.keyPoints.push(line);
    } else {
      organized.structured.push(line);
    }
  });

  return organized;
}

function organizeSession() {
  const session = getCurrentSession();
  if (!session || !isUnchanged(session)) {
    organizeButton.disabled = true;
    return;
  }

  clearOrganizationTimer();
  organizeButton.disabled = true;
  setStep(3);
  organizationTimer = window.setTimeout(() => {
    organizationTimer = null;
    const currentSession = getCurrentSession();
    if (!currentSession || !isUnchanged(currentSession)) {
      setStep(currentSession ? 2 : 1);
      organizeButton.disabled = !currentSession || !isUnchanged(currentSession);
      return;
    }

    currentSession.organized = organizeNotes(currentSession.raw);
    currentSession.status = "organized";
    currentSession.updatedAt = new Date().toISOString();
    persistSessions();
    fillResults(currentSession.organized);
    updateStatus("organized");
    organizeButton.disabled = false;
    setStep(4);
    renderSessions();
    console.log(`Session "${currentSession.title}" status: ${currentSession.status}`);
  }, 700);
}

function deleteSession() {
  const session = getCurrentSession();
  if (!session || !window.confirm(`Delete "${session.title}"? This cannot be undone.`)) {
    return;
  }

  clearOrganizationTimer();
  sessions = sessions.filter((item) => item.id !== session.id);
  persistSessions();
  console.log(`Session "${session.title}" status: deleted`);
  resetEditor();
}

function openSession(sessionId) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }

  clearOrganizationTimer();
  currentSessionId = session.id;
  renderCurrentSession();
}

notesInput.addEventListener("input", handleEditorChange);
titleInput.addEventListener("input", handleEditorChange);
notesForm.addEventListener("submit", (event) => event.preventDefault());
saveButton.addEventListener("click", saveSession);
organizeButton.addEventListener("click", organizeSession);
backButton.addEventListener("click", () => {
  clearOrganizationTimer();
  setStep(currentStep - 1);
  const session = getCurrentSession();
  organizeButton.disabled = !session || !isUnchanged(session);
});
deleteButton.addEventListener("click", deleteSession);
newSessionButton.addEventListener("click", resetEditor);
startSessionLink.addEventListener("click", (event) => {
  event.preventDefault();
  resetEditor();
  document.getElementById("workspace").scrollIntoView();
  notesInput.focus();
});

sessionsList.addEventListener("click", (event) => {
  const card = event.target.closest("li");
  if (card && sessionsList.contains(card) && card.dataset.sessionId) {
    openSession(card.dataset.sessionId);
  }
});

sessionsList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  const card = event.target.closest("li");
  if (card && sessionsList.contains(card) && card.dataset.sessionId) {
    event.preventDefault();
    openSession(card.dataset.sessionId);
  }
});

updateCounts();
resetEditor();
