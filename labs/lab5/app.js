const filterInput = document.getElementById("filter-input");
const projectCount = document.getElementById("project-count");
const projectCards = Array.from(document.querySelectorAll(".projects-grid .card"));

function filterProjects() {
  const query = filterInput.value.trim().toLowerCase();
  let visibleCount = 0;

  projectCards.forEach((card) => {
    const cardText = card.textContent.toLowerCase();
    const matches = cardText.includes(query);
    // hand-edited by DT

    card.classList.toggle("is-hidden", !matches);  // hand-edited by DT

    if (matches) {
      visibleCount += 1;
    }
  });

  projectCount.textContent = `Showing ${visibleCount} of ${projectCards.length} projects`;
}

filterInput.addEventListener("input", filterProjects);
