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

const sessionLimit = 2000;
const resultFields = {
  structured: structuredNotes,
  keyPoints,
  questions,
  followUp: followUpItems,
};

const messageArea = document.createElement("p");
messageArea.id = "message-area";
messageArea.classList.add("message-area", "hidden");
messageArea.setAttribute("role", "status");
notesForm.parentNode.insertBefore(messageArea, notesForm);

let sessions = [];
let currentSessionId = null;
let currentStep = 1;
let requestInFlight = false;

function showMessage(message, isError = false) {
  messageArea.textContent = message;
  messageArea.classList.toggle("error", isError);
  messageArea.classList.remove("hidden");
}

function clearMessage() {
  messageArea.textContent = "";
  messageArea.classList.remove("error");
  messageArea.classList.add("hidden");
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    showMessage("Cannot reach the server", true);
    throw error;
  }

  console.log(`API ${path}: ${response.status}`);

  let data;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch (error) {
      showMessage("The server returned an invalid response.", true);
      throw error;
    }
  } else {
    data = null;
  }

  return { status: response.status, data };
}

function sessionFromApi(session) {
  const organized = session.organized;
  return {
    id: session.id,
    title: session.title,
    raw: session.raw_notes,
    status: session.status,
    organized: organized
      ? {
          structured: organized.structured,
          keyPoints: organized.key,
          questions: organized.questions,
          followUp: organized.followups,
        }
      : null,
    updatedAt: session.updated_at,
  };
}

async function loadSessions() {
  try {
    const { status, data } = await api("/api/sessions");
    if (status === 200 && Array.isArray(data)) {
      sessions = data.map(sessionFromApi);
      renderSessions();
      return;
    }
    showMessage(data?.error ?? "Unable to load sessions.", true);
  } catch {
    return;
  }
}

function getCurrentSession() {
  return sessions.find((session) => String(session.id) === String(currentSessionId)) ?? null;
}

function updateButtonStates() {
  const session = getCurrentSession();
  backButton.disabled = requestInFlight || currentStep === 1;
  saveButton.disabled =
    requestInFlight || !notesInput.value.trim() || notesInput.value.length > sessionLimit;
  organizeButton.disabled = requestInFlight || !session || !isUnchanged(session);
  deleteButton.disabled = requestInFlight || !session;
  newSessionButton.disabled = requestInFlight;
  titleInput.disabled = requestInFlight;
  notesInput.disabled = requestInFlight;
}

function setRequestInFlight(isInFlight) {
  requestInFlight = isInFlight;
  updateButtonStates();
}

function updateCounts() {
  const notes = notesInput.value;
  const words = notes.trim() ? notes.trim().split(/\s+/u).length : 0;

  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  charLimit.textContent = `${notes.length} / ${sessionLimit}`;
  charLimit.classList.toggle("over", notes.length > sessionLimit);
  updateButtonStates();
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

  updateButtonStates();
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
  card.classList.toggle("active", String(session.id) === String(currentSessionId));
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
  updateButtonStates();
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
  currentSessionId = null;
  titleInput.value = "";
  notesInput.value = "";
  saveButton.textContent = "Save session";
  updateButtonStates();
  updateStatus("draft");
  clearResults();
  setStep(1);
  updateCounts();
  renderSessions();
  notesInput.focus();
}

function handleEditorChange() {
  updateCounts();

  const session = getCurrentSession();
  if (!session) {
    return;
  }

  const unchanged = isUnchanged(session);
  organizeButton.disabled = requestInFlight || !unchanged;
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

async function saveSession() {
  const raw = notesInput.value;
  if (!raw.trim() || raw.length > sessionLimit || requestInFlight) {
    updateCounts();
    return;
  }

  const title = titleInput.value.trim() || "Untitled session";
  titleInput.value = title;
  const existingSession = getCurrentSession();
  const isEditing = existingSession !== null;
  const path = isEditing ? `/api/sessions/${existingSession.id}` : "/api/sessions";
  const method = isEditing ? "PUT" : "POST";

  clearMessage();
  setRequestInFlight(true);
  try {
    const { status, data } = await api(path, {
      method,
      body: JSON.stringify({ title, raw_notes: raw }),
    });

    if (status === 400) {
      showMessage(data?.error ?? "Unable to save session.", true);
      return;
    }

    let savedSession;
    if (status === 201 && !isEditing) {
      savedSession = sessionFromApi(data);
      sessions.push(savedSession);
      currentSessionId = savedSession.id;
    } else if (status === 200 && isEditing) {
      savedSession = sessionFromApi(data);
      sessions = sessions.map((session) =>
        String(session.id) === String(savedSession.id) ? savedSession : session,
      );
      currentSessionId = savedSession.id;
    } else {
      showMessage(data?.error ?? "Unable to save session.", true);
      return;
    }

    titleInput.value = savedSession.title;
    notesInput.value = savedSession.raw;
    saveButton.textContent = "Update session";
    updateStatus(savedSession.status);
    if (savedSession.status === "organized" && savedSession.organized) {
      fillResults(savedSession.organized);
      setStep(4);
    } else {
      clearResults();
      setStep(2);
    }
    renderSessions();
    console.log(`Session "${savedSession.title}" status: ${savedSession.status}`);
  } catch {
    return;
  } finally {
    setRequestInFlight(false);
  }
}

async function organizeSession() {
  const session = getCurrentSession();
  if (!session || !isUnchanged(session) || requestInFlight) {
    updateButtonStates();
    return;
  }

  clearMessage();
  setRequestInFlight(true);
  setStep(3);
  organizeButton.textContent = "Organizing...";

  try {
    const { status, data } = await api(`/api/sessions/${session.id}/organize`, {
      method: "POST",
    });

    if (status === 200) {
      const organizedSession = sessionFromApi(data);
      sessions = sessions.map((item) =>
        String(item.id) === String(organizedSession.id) ? organizedSession : item,
      );
      fillResults(organizedSession.organized);
      updateStatus(organizedSession.status);
      setStep(4);
      renderSessions();
      console.log(`Session "${organizedSession.title}" status: ${organizedSession.status}`);
    } else {
      showMessage(data?.error ?? "Unable to organize this session.", true);
    }
  } catch {
    return;
  } finally {
    organizeButton.textContent = "Organize Notes";
    setRequestInFlight(false);
  }
}

async function deleteSession() {
  const session = getCurrentSession();
  if (!session || requestInFlight || !window.confirm(`Delete "${session.title}"? This cannot be undone.`)) {
    return;
  }

  clearMessage();
  setRequestInFlight(true);
  try {
    const { status, data } = await api(`/api/sessions/${session.id}`, {
      method: "DELETE",
    });

    if (status === 204) {
      sessions = sessions.filter((item) => String(item.id) !== String(session.id));
      console.log(`Session "${session.title}" status: deleted`);
      resetEditor();
    } else if (status === 404) {
      showMessage(data?.error ?? "Session not found.", true);
      await loadSessions();
      if (!sessions.some((item) => String(item.id) === String(session.id))) {
        resetEditor();
      }
    } else {
      showMessage(data?.error ?? "Unable to delete this session.", true);
    }
  } catch {
    return;
  } finally {
    setRequestInFlight(false);
  }
}

function openSession(sessionId) {
  const session = sessions.find((item) => String(item.id) === String(sessionId));
  if (!session) {
    return;
  }

  currentSessionId = session.id;
  renderCurrentSession();
}

notesInput.addEventListener("input", handleEditorChange);
titleInput.addEventListener("input", handleEditorChange);
notesForm.addEventListener("submit", (event) => event.preventDefault());
saveButton.addEventListener("click", saveSession);
organizeButton.addEventListener("click", organizeSession);
backButton.addEventListener("click", () => {
  setStep(currentStep - 1);
  const session = getCurrentSession();
  organizeButton.disabled = requestInFlight || !session || !isUnchanged(session);
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
setRequestInFlight(true);
loadSessions().finally(() => setRequestInFlight(false));
