# SPRINT2: ClassNotes Backend

## Project Recap & API Surface

ClassNotes lets a student capture class notes, save them as a session, organize them into structured notes, key points, questions, and follow-ups, then review the results. The Flask backend validates requests and stores sessions in SQLite so they remain available after the server restarts. The organizer is rule-based and runs locally; it does not call an AI service.

All API responses use JSON except successful deletes, which return an empty `204 No Content` response.

| Method | Endpoint | Request payload | Success response | Other statuses |
|---|---|---|---|---|
| GET | `/api/sessions` | None | `200` — array of sessions, newest first | `500` |
| POST | `/api/sessions` | `{"title":"Biology","raw_notes":"Class notes..."}`. `title` is optional and defaults to `"Untitled session"`; `raw_notes` is required. | `201` — created session, including its integer ID | `400`, `500` |
| GET | `/api/sessions/<id>` | None | `200` — session object | `404`, `500` |
| PUT | `/api/sessions/<id>` | `{"title":"Biology","raw_notes":"Updated notes"}`. `title` is optional; `raw_notes` is required. | `200` — updated session. Changing `raw_notes` clears organized results and resets status to `"saved"`. | `400`, `404`, `500` |
| DELETE | `/api/sessions/<id>` | None | `204` — no response body | `404`, `500` |
| POST | `/api/sessions/<id>/organize` | None | `200` — updated session with organized results | `404`, `500` |

Validation errors return `400` with an `error` message and a `field` name. Missing session IDs return `404`.

## Database Schema

SQLite database file: `backend/notes.db`. The schema is in `backend/schema.sql` and is applied when the Flask app starts.

| Table | Column | SQLite type | Constraints / purpose |
|---|---|---|---|
| `note_sessions` | `id` | INTEGER | Primary key, auto-increment |
| `note_sessions` | `title` | TEXT | Required |
| `note_sessions` | `raw_notes` | TEXT | Required |
| `note_sessions` | `status` | TEXT | Required; defaults to `saved`; limited to `saved` or `organized` |
| `note_sessions` | `organized_json` | TEXT | Nullable JSON text for organized results |
| `note_sessions` | `created_at` | TEXT | Required ISO timestamp |
| `note_sessions` | `updated_at` | TEXT | Required ISO timestamp |

## How to Run & Test

1. Clone the repository and enter the Sprint 2 project folder:

   ```powershell
   git clone https://github.com/devinthms/SSW215-DThomas.git
   Set-Location 'SSW215-DThomas\project\sprint 2'
   ```

2. Create and activate a virtual environment, then install the backend dependency:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r backend\requirements.txt
   ```

   Optional: populate a fresh database with two sample sessions by running `python backend\seed.py` once.

3. Start the server:

   ```powershell
   python backend\app.py
   ```

4. Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in a browser. Create a session, save it, select **Organize Notes**, and review the categorized results. To check persistence, stop the server with Ctrl+C, restart it, and confirm the session is still listed.

## AI Usage Log & Reflection

I used GitHub Copilot in VS Code with prompts to build the Flask routes and validation, connect the frontend to the API with `fetch()`, and replace JSON-file storage with SQLite. One generated folder layout did not match the repository: it put `backend` and `frontend` at the project level and nested both sprint folders under `frontend`. After moving the files into the intended Sprint 2 layout, I corrected the Flask frontend paths and checked that the page and its assets loaded.

I also added an OpenAI organizer and later removed it. When the AI call was unavailable, the rule-based fallback put lines without matching keywords into Structured notes, so the results could look unchanged; its warning appeared in the server console rather than in the page. I kept the local rule-based organizer and renamed the button to “Organize Notes.” I tested creating, reading, updating, organizing, and deleting sessions, plus invalid input and missing IDs: the checks returned `201`, `200`, `204`, `400`, and `404` as expected. I also verified that organized results survived a database connection close and reopen. These checks helped me catch and correct the folder-path mismatch and the confusing organizer fallback behavior.