const filterInput = document.getElementById("filter-input");
const projectCount = document.getElementById("project-count");
const projectCards = Array.from(document.querySelectorAll(".projects-grid .card"));
const projectsGrid = document.querySelector(".projects-grid");

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
