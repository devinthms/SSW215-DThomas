const filterInput = document.getElementById("filter-input");
const projectCount = document.getElementById("project-count");
const projectCards = Array.from(document.querySelectorAll(".projects-grid .card"));

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
