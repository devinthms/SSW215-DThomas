# SPEC: ClassNotes, Student Note Capture & Organizer (Sprint 1 Prototype)

## 1. Purpose & Scope
- A single-user note-taking utility for an individual student (Devin Thomas, software engineering student at Stevens Institute of Technology) to rapidly capture unstructured thoughts during a class or study session and use one AI action afterward to organize them into structured notes, key points, questions, and follow-up items.
- Core workflow (Rule of Ones): Capture notes → Save session → Organize with AI → Review organized notes.
- Sprint 1 runs entirely client-side on localhost. The "AI" step is a simulated organizer function in app.js that stands in for the single AI call added in a later sprint.
- Non-Goals: no multiple users, collaboration, or shared workspaces; no lecture recording or transcription; no ongoing AI chat, tutoring, or agents; no backend, database, authentication, or external API calls; no multi-page routing.

## 2. Invariants & Negative Constraints
- All styling MUST reside in `./style.css` (no inline style="..." attributes).
- The page MUST NOT load external CSS frameworks, fonts, or CDNs (no Bootstrap, no Tailwind).
- The layout MUST collapse into a single vertical column on screens narrower than 768px.
- style.css MUST begin with the universal reset: `*, *::before, *::after { box-sizing: border-box; }`.
- Spacing and font sizes MUST use rem. px MAY be used only for borders.
- Styling MUST use class selectors. ID selectors MUST NOT be used for styling.
- All JavaScript MUST live in `./app.js`. index.html MUST NOT contain inline onclick attributes or any <script> block with code inside it.
- app.js MUST be loaded from <head> with `<script src="./app.js" defer></script>`.
- Showing and hiding MUST be done by adding and removing a CSS class. app.js MUST NOT set styles directly through .style.
- Progress and state changes (progress bar, step highlighting, status tags) MUST be done by toggling CSS classes or data-* attributes that style.css reacts to, never by setting .style in app.js.
- Session data MUST be held in a JavaScript array of objects (one object per note session) and MAY be mirrored to localStorage. No network requests of any kind.
- Interactive controls MUST respect boundaries: empty notes cannot be saved, a session cannot be organized before it is saved, and Back cannot go below step 1.

## 3. UI Content & Interface Contract
- Hero header: the app name "ClassNotes", the subtitle "Capture fast in class. Organize once afterward.", and a one-sentence description: "A focused notebook for one student: jot down messy thoughts, save the session, and let one AI action turn them into structured notes."
- Action link: a button labelled "Start a new session" that links to `#workspace`.
- Workspace section with id="workspace" containing the editor, the progress track, and the results.
- Social link: GitHub (https://github.com/devinthms/SSW215-DThomas.git) MUST open in a new tab (target="_blank").
- The page background MUST be a light neutral with dark text and a single accent color; text and controls MUST meet readable contrast.
- The page MUST use semantic landmarks: one <header>, one <nav>, one <main>, one <footer>, and each content group inside its own <section> with a heading.
- There MUST be exactly one <h1>, and heading levels MUST NOT skip (h1 then h2 then h3).
- <nav> MUST contain a link to the workspace section and a link to my GitHub profile.
- Progress track: an ordered list with four steps labelled "Capture", "Save", "Organize", "Review", and a progress bar. The active step MUST get the class "active", completed steps the class "done", and the bar width MUST be driven by a data-step attribute on the editor section (values 1 to 4) styled in style.css.
- Editor: a text input for the session title and a <textarea> with id="notes-input", each with a <label> bound to it ("Session title" and "Raw notes").
- There MUST be an element with id="word-count" that reads "X words" and an element with id="char-limit" that reads "X / 2000". Both MUST update immediately on every keystroke. Notes over 2000 characters MUST NOT be saveable.
- A status tag MUST show "Draft", "Saved", or "Organized" for the open session and MUST be styled through the classes "tag-draft", "tag-saved", and "tag-organized".
- Buttons: "Save session", "Organize with AI", "Back", "Delete", and "New session".
  - "Save session" is disabled while the notes box is empty. Its label becomes "Update session" when editing an existing session.
  - "Organize with AI" MUST have the HTML disabled attribute until the session is saved, and MUST NOT look clickable while disabled.
  - "Back" MUST be disabled at step 1.
  - "Delete" MUST ask for confirmation and remove the session.
- The "Organize with AI" button MUST have four visually distinct states: :hover, :focus-visible, :active, and :disabled. All four state rules MUST live in style.css.
- Saved sessions list: a <ul> inside its own <section> with heading "Sessions". Each saved session MUST be an <li class="session-item"> showing the title, the date, and a status tag. Clicking a card (or pressing Enter on it) reopens it in the editor. When there are no sessions, an empty-state line "No sessions yet. Capture your first notes." MUST show.
- There MUST be an element with id="session-count" that reads "N saved sessions" and updates when a session is added or deleted.
- Results section: four groups, each in its own <article class="result-card"> with a heading: "Structured notes", "Key points", "Questions", "Follow-up items". The results section MUST be hidden with the class "hidden" until the session has been organized, and MUST be shown by removing that class.
- The simulated organizer MUST sort lines into the four groups (lines ending in "?" go to Questions, lines containing words like "review", "need to", or "follow up" go to Follow-up items, lines containing words like "important" or "exam" go to Key points, the rest go to Structured notes). An empty group MUST show "None found".
- Editing the notes of an already organized session MUST clear its old organized output.
- Each result card and session card MUST be created dynamically by app.js (createElement and appendChild), and removing a session MUST remove its card from the DOM.
- style.css MUST define .hidden { display: none; }.
- Each time a session is saved, organized, or deleted, app.js MUST print the session title and the new status to the console with console.log.

## 4. Acceptance Checklist
- [ ] app.js is loaded from <head> with defer, and index.html has no inline onclick and no code inside a <script> tag.
- [ ] Typing in the notes box updates the word count and character count live, without pressing anything.
- [ ] "Save session" and "Organize with AI" are disabled when they should be (empty notes, unsaved session).
- [ ] Saving adds a card to the Sessions list, moves the progress track to step 2, and updates "N saved sessions".
- [ ] "Organize with AI" fills all four result groups, reveals the results section by removing the "hidden" class, and moves the track to step 4.
- [ ] Clicking a saved card reopens it; editing and updating it clears old organized output.
- [ ] "Back" is disabled at step 1; notes over 2000 characters cannot be saved.
- [ ] Deleting a session (after confirming) removes its card and updates the count.
- [ ] app.js contains no .style assignments: showing, hiding, and progress changes are done with classes or data-* attributes.
- [ ] The DevTools Console shows no red errors when the page loads.
- [ ] Saving, organizing, and deleting each print the session title and status in the Console.
- [ ] The layout collapses to a single column below 768px.

## 5. Audit Protocol
- The "Organize with AI" button MUST have four visually distinct states: :hover, :focus-visible, :active, and :disabled.
- A second control, the "Delete" button, MUST look clearly different from the primary action (for example a danger color) and MUST NOT run without confirmation.
- All four button state rules MUST live in style.css.
- Search app.js for ".style" and "innerHTML" and confirm that no .style assignments exist and that user-typed text is only inserted with textContent.
- Inspect the generated code line by line with `git diff --staged` before committing.
