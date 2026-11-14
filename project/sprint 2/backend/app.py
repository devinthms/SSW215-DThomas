import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException


BACKEND_DIR = Path(__file__).resolve().parent
DATA_FILE = BACKEND_DIR / "data.json"
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"

Session = dict[str, Any]

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path="",
)


def load_sessions() -> list[Session]:
    """Load saved sessions, creating the data file the first time."""
    if not DATA_FILE.exists():
        save_sessions([])
        return []

    try:
        with DATA_FILE.open("r", encoding="utf-8") as data_file:
            sessions = json.load(data_file)
    except (json.JSONDecodeError, OSError) as error:
        app.logger.warning("Unable to read session data from %s: %s", DATA_FILE, error)
        return []

    if not isinstance(sessions, list):
        app.logger.warning("Session data in %s must be a JSON list.", DATA_FILE)
        return []

    return [session for session in sessions if isinstance(session, dict)]


def save_sessions(sessions: list[Session]) -> None:
    """Persist the complete session collection as JSON."""
    with DATA_FILE.open("w", encoding="utf-8") as data_file:
        json.dump(sessions, data_file, indent=2, ensure_ascii=False)


def find_session(session_id: int, sessions: list[Session] | None = None) -> Session | None:
    """Find a session by integer ID in the provided or persisted collection."""
    collection = load_sessions() if sessions is None else sessions
    return next(
        (
            session
            for session in collection
            if type(session.get("id")) is int and session.get("id") == session_id
        ),
        None,
    )


def organize_notes(raw_notes: str) -> dict[str, list[str]]:
    """Classify note lines using the keyword rules from the frontend organizer."""
    organized = {
        "structured": [],
        "key": [],
        "questions": [],
        "followups": [],
    }

    for line in (line.strip() for line in re.split(r"\r?\n", raw_notes)):
        if not line:
            continue
        if re.search(r"\?$", line):
            organized["questions"].append(line)
        elif re.search(r"\b(?:review|need\s+to|follow\s+up|due)\b", line, re.IGNORECASE):
            organized["followups"].append(line)
        elif re.search(r"\b(?:important|exam)\b", line, re.IGNORECASE):
            organized["key"].append(line)
        else:
            organized["structured"].append(line)

    return organized


def validation_error(message: str, field: str) -> tuple[Response, int]:
    return jsonify({"error": message, "field": field}), 400


def validated_session_data() -> tuple[dict[str, str] | None, tuple[Response, int] | None]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, validation_error("Request body must be a JSON object.", "body")

    title = data.get("title", "Untitled session")
    if not isinstance(title, str):
        return None, validation_error("Title must be a string.", "title")
    title = title.strip() or "Untitled session"
    if len(title) > 60:
        return None, validation_error("Title must be 60 characters or fewer.", "title")

    raw_notes = data.get("raw_notes")
    if not isinstance(raw_notes, str):
        return None, validation_error("Raw notes are required and must be a string.", "raw_notes")
    raw_notes = raw_notes.strip()
    if not raw_notes:
        return None, validation_error("Raw notes cannot be empty.", "raw_notes")
    if len(raw_notes) > 2000:
        return None, validation_error("Raw notes must be 2000 characters or fewer.", "raw_notes")

    return {"title": title, "raw_notes": raw_notes}, None


@app.get("/")
def frontend_index() -> Response:
    return send_from_directory(str(FRONTEND_DIR), "index.html")


@app.get("/style.css")
def frontend_stylesheet() -> Response:
    return send_from_directory(str(FRONTEND_DIR), "style.css")


@app.get("/app.js")
def frontend_script() -> Response:
    return send_from_directory(str(FRONTEND_DIR), "app.js")


@app.get("/api/sessions")
def list_sessions() -> Response:
    sessions = load_sessions()
    newest_first = sorted(
        sessions,
        key=lambda session: str(session.get("created_at", "")),
        reverse=True,
    )
    return jsonify(newest_first)


@app.post("/api/sessions")
def create_session() -> tuple[Response, int] | Response:
    data, error = validated_session_data()
    if error is not None:
        return error

    sessions = load_sessions()
    existing_ids = [
        session.get("id")
        for session in sessions
        if type(session.get("id")) is int
    ]
    timestamp = datetime.now(timezone.utc).isoformat()
    session = {
        "id": max(existing_ids, default=0) + 1,
        "title": data["title"],
        "raw_notes": data["raw_notes"],
        "status": "saved",
        "organized": None,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    sessions.append(session)
    save_sessions(sessions)
    return jsonify(session), 201


@app.get("/api/sessions/<int:session_id>")
def get_session(session_id: int) -> Response | tuple[Response, int]:
    session = find_session(session_id)
    if session is None:
        return jsonify({"error": "Session not found."}), 404
    return jsonify(session)


@app.put("/api/sessions/<int:session_id>")
def update_session(session_id: int) -> Response | tuple[Response, int]:
    data, error = validated_session_data()
    if error is not None:
        return error

    sessions = load_sessions()
    session = find_session(session_id, sessions)
    if session is None:
        return jsonify({"error": "Session not found."}), 404

    raw_notes_changed = session.get("raw_notes") != data["raw_notes"]
    session["title"] = data["title"]
    session["raw_notes"] = data["raw_notes"]
    if raw_notes_changed:
        session["organized"] = None
        session["status"] = "saved"
    session["updated_at"] = datetime.now(timezone.utc).isoformat()

    save_sessions(sessions)
    return jsonify(session)


@app.delete("/api/sessions/<int:session_id>")
def delete_session(session_id: int) -> tuple[str, int] | tuple[Response, int]:
    sessions = load_sessions()
    session = find_session(session_id, sessions)
    if session is None:
        return jsonify({"error": "Session not found."}), 404

    sessions.remove(session)
    save_sessions(sessions)
    return "", 204


@app.post("/api/sessions/<int:session_id>/organize")
def organize_session(session_id: int) -> Response | tuple[Response, int]:
    sessions = load_sessions()
    session = find_session(session_id, sessions)
    if session is None:
        return jsonify({"error": "Session not found."}), 404

    raw_notes = session.get("raw_notes")
    if not isinstance(raw_notes, str):
        app.logger.error("Session %s has invalid raw_notes data.", session_id)
        return jsonify({"error": "Session data is invalid."}), 500

    session["organized"] = organize_notes(raw_notes)
    session["status"] = "organized"
    session["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_sessions(sessions)
    return jsonify(session)


@app.errorhandler(404)
def handle_not_found(_error: HTTPException) -> tuple[Response, int]:
    return jsonify({"error": "Not found."}), 404


@app.errorhandler(405)
def handle_method_not_allowed(_error: HTTPException) -> tuple[Response, int]:
    return jsonify({"error": "Method not allowed."}), 405


@app.errorhandler(500)
def handle_internal_error(error: HTTPException) -> tuple[Response, int]:
    app.logger.error("Unhandled server error: %s", error)
    return jsonify({"error": "Internal server error."}), 500


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="127.0.0.1", port=5000, debug=False)
