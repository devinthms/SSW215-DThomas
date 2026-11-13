const filterInput = document.getElementById("filter-input");
const projectCount = document.getElementById("project-count");
let projectCards = Array.from(document.querySelectorAll(".projects-grid .card"));
const projectsGrid = document.querySelector(".projects-grid");
const createProjectForm = document.getElementById("create-project-form");
const newTitleInput = document.getElementById("new-title");

function filterProjects() {
  const query = filterInput.value.trim().toLowerCase();
  let visibleCount = 0;
  const visibleTitles = [];

  projectCards.forEach((card) => {
    const cardText = card.textContent.toLowerCase();
    const matches = cardText.includes(query);
    // hand-edited by DT
    card.classList.toggle("hidden", !matches);

    if (matches) {
      visibleCount += 1;
      visibleTitles.push(card.querySelector(".card-title").textContent.trim());
    }
  });

  projectCount.textContent = `Showing ${visibleCount} of ${projectCards.length} projects`;
  console.log(visibleTitles);
}

filterInput.addEventListener("input", filterProjects);
filterProjects();

projectsGrid.addEventListener("click", async (event) => {
  const button = event.target.closest(".upvote-btn");
  if (!button || button.disabled) {
    return;
  }

  const card = button.closest(".card");
  if (!card) {
    return;
  }

  button.disabled = true;
  try {
    const response = await fetch(
      `/api/projects/${card.dataset.projectId}/upvote`,
      { method: "POST" }
    );
    if (!response.ok) {
      throw new Error(`Upvote failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Number.isInteger(data.likes)) {
      throw new Error("Upvote response did not contain a valid likes count");
    }

    card.querySelector(".like-count").textContent = String(data.likes);
  } catch (error) {
    console.error("Unable to upvote project:", error);
  } finally {
    button.disabled = false;
  }
});

createProjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = createProjectForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitleInput.value }),
    });
    if (!response.ok) {
      throw new Error(`Project creation failed with status ${response.status}`);
    }

    const project = await response.json();
    if (
      !Number.isInteger(project.id) ||
      typeof project.title !== "string" ||
      typeof project.description !== "string" ||
      !Number.isInteger(project.likes)
    ) {
      throw new Error("Project creation response did not contain a valid project");
    }

    const card = document.createElement("article");
    card.className = "card";
    card.dataset.projectId = String(project.id);

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = project.title;
    card.append(title);

    const description = document.createElement("p");
    description.textContent = project.description;
    card.append(description);

    const likes = document.createElement("p");
    likes.append("Likes: ");
    const likeCount = document.createElement("span");
    likeCount.className = "like-count";
    likeCount.textContent = String(project.likes);
    likes.append(likeCount);
    card.append(likes);

    const upvoteButton = document.createElement("button");
    upvoteButton.className = "upvote-btn";
    upvoteButton.type = "button";
    upvoteButton.textContent = "Upvote";
    card.append(upvoteButton);

    projectsGrid.append(card);
    projectCards.push(card);
    newTitleInput.value = "";
    filterProjects();
  } catch (error) {
    console.error("Unable to create project:", error);
  } finally {
    submitButton.disabled = false;
  }
});
