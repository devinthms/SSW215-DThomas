from datetime import datetime, timezone

from app import get_db_connection, init_db


def seed_sessions() -> None:
    init_db()
    timestamp = datetime.now(timezone.utc).isoformat()
    sample_sessions = [
        (
            "Biology lecture",
            "What is osmosis?\nImportant exam topic: diffusion\nReview cell membranes",
            timestamp,
            timestamp,
        ),
        (
            "History study",
            "The industrial revolution changed manufacturing.\nNeed to review the timeline.\nWhy did urbanization accelerate?",
            timestamp,
            timestamp,
        ),
    ]

    connection = get_db_connection()
    try:
        connection.executemany(
            """
            INSERT INTO note_sessions (title, raw_notes, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            sample_sessions,
        )
        connection.commit()
    finally:
        connection.close()


if __name__ == "__main__":
    seed_sessions()
