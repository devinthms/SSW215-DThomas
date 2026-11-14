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

I used an AI coding assistant with prompts to scaffold Flask session routes and validation, connect the existing frontend to the API with `fetch()`, port the organizer's keyword rules, and migrate JSON-file persistence to SQLite. I reviewed the generated changes against the actual repository layout and API contract: for example, I corrected a frontend path assumption after the folders moved and mapped the frontend's `raw` field and organizer result names to the backend's `raw_notes`, `key`, and `followups` fields. I tested the API responses rather than relying on generated code; the checks confirmed `201` for creation, `200` for retrieval/update/organization, `204` for deletion, and `400`/`404` for invalid input and missing sessions. I did not find an incorrect status code that needed to remain in the final implementation.

The JSON-file prototype required loading and rewriting the whole collection for each change and assigning IDs in application code, which made concurrent updates and consistency harder to manage. SQLite now assigns primary keys and handles the CRUD operations through parameterized queries, while its database file preserves sessions across server restarts. The organizer output remains JSON text in the relational row and is converted back to the same API response shape.
