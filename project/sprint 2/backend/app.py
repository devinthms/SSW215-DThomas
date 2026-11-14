import json
import logging
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException


BACKEND_DIR = Path(__file__).resolve().parent
DATABASE_FILE = BACKEND_DIR / "notes.db"
SCHEMA_FILE = BACKEND_DIR / "schema.sql"
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"

Session = dict[str, Any]

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path="",
)


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    connection = get_db_connection()
    try:
        with SCHEMA_FILE.open("r", encoding="utf-8") as schema_file:
            connection.executescript(schema_file.read())
        connection.commit()
    finally:
        connection.close()


def session_from_row(row: sqlite3.Row) -> Session:
    session = {key: row[key] for key in row.keys() if key != "organized_json"}
    organized_json = row["organized_json"]
    session["organized"] = json.loads(organized_json) if organized_json is not None else None
    return session


init_db()


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
    connection = get_db_connection()
    try:
        rows = connection.execute(
            "SELECT * FROM note_sessions ORDER BY created_at DESC, id DESC"
        ).fetchall()
        return jsonify([session_from_row(row) for row in rows])
    finally:
        connection.close()


@app.post("/api/sessions")
def create_session() -> tuple[Response, int] | Response:
    data, error = validated_session_data()
    if error is not None:
        return error

    timestamp = datetime.now(timezone.utc).isoformat()
    connection = get_db_connection()
    try:
        cursor = connection.execute(
            """
            INSERT INTO note_sessions (title, raw_notes, status, organized_json, created_at, updated_at)
            VALUES (?, ?, 'saved', NULL, ?, ?)
            """,
            (data["title"], data["raw_notes"], timestamp, timestamp),
        )
        session_id = cursor.lastrowid
        connection.commit()
        row = connection.execute(
            "SELECT * FROM note_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return jsonify(session_from_row(row)), 201
    finally:
        connection.close()


@app.get("/api/sessions/<int:session_id>")
def get_session(session_id: int) -> Response | tuple[Response, int]:
    connection = get_db_connection()
    try:
        row = connection.execute(
            "SELECT * FROM note_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if row is None:
            return jsonify({"error": "Session not found."}), 404
        return jsonify(session_from_row(row))
    finally:
        connection.close()


@app.put("/api/sessions/<int:session_id>")
def update_session(session_id: int) -> Response | tuple[Response, int]:
    data, error = validated_session_data()
    if error is not None:
        return error

    timestamp = datetime.now(timezone.utc).isoformat()
    connection = get_db_connection()
    try:
        existing = connection.execute(
            "SELECT raw_notes FROM note_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if existing is None:
            return jsonify({"error": "Session not found."}), 404

        if existing["raw_notes"] != data["raw_notes"]:
            cursor = connection.execute(
                """
                UPDATE note_sessions
                SET title = ?, raw_notes = ?, status = 'saved',
                    organized_json = NULL, updated_at = ?
                WHERE id = ?
                """,
                (data["title"], data["raw_notes"], timestamp, session_id),
            )
        else:
            cursor = connection.execute(
                """
                UPDATE note_sessions
                SET title = ?, raw_notes = ?, updated_at = ?
                WHERE id = ?
                """,
                (data["title"], data["raw_notes"], timestamp, session_id),
            )

        if cursor.rowcount == 0:
            return jsonify({"error": "Session not found."}), 404

        connection.commit()
        row = connection.execute(
            "SELECT * FROM note_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return jsonify(session_from_row(row))
    finally:
        connection.close()


@app.delete("/api/sessions/<int:session_id>")
def delete_session(session_id: int) -> tuple[str, int] | tuple[Response, int]:
    connection = get_db_connection()
    try:
        cursor = connection.execute(
            "DELETE FROM note_sessions WHERE id = ?",
            (session_id,),
        )
        if cursor.rowcount == 0:
            return jsonify({"error": "Session not found."}), 404
        connection.commit()
        return "", 204
    finally:
        connection.close()


@app.post("/api/sessions/<int:session_id>/organize")
def organize_session(session_id: int) -> Response | tuple[Response, int]:
    connection = get_db_connection()
    try:
        existing = connection.execute(
            "SELECT raw_notes FROM note_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if existing is None:
            return jsonify({"error": "Session not found."}), 404

        raw_notes = existing["raw_notes"]
        if not isinstance(raw_notes, str):
            app.logger.error("Session %s has invalid raw_notes data.", session_id)
            return jsonify({"error": "Session data is invalid."}), 500

        organized = organize_notes(raw_notes)
        cursor = connection.execute(
            """
            UPDATE note_sessions
            SET organized_json = ?, status = 'organized', updated_at = ?
            WHERE id = ?
            """,
            (
                json.dumps(organized, ensure_ascii=False),
                datetime.now(timezone.utc).isoformat(),
                session_id,
            ),
        )
        if cursor.rowcount == 0:
            return jsonify({"error": "Session not found."}), 404

        connection.commit()
        row = connection.execute(
            "SELECT * FROM note_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return jsonify(session_from_row(row))
    finally:
        connection.close()


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
