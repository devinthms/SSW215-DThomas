from flask import Flask, jsonify, render_template, send_from_directory

app = Flask(__name__)

projects_db = [
    {
        "id": 1,
        "title": "Automated Plant Monitoring System",
        "description": "An ESP32-based system that monitors plant conditions and automates watering.",
        "likes": 0,
    },
    {
        "id": 2,
        "title": "Personal Developer Portfolio",
        "description": "A portfolio website showcasing my software engineering projects and experience.",
        "likes": 0,
    },
    {
        "id": 3,
        "title": "Note-Taking Tool",
        "description": "A tool designed to make taking and organizing notes easier while staying focused.",
        "likes": 0,
    },
    #hand-edited by DT
    {
        "id": 4,
        "title": "Student Task Manager",
        "description": "A tool for organizing assignments, tracking deadlines, and managing schoolwork.",
        "likes": 0,
    },
]


@app.route("/")
def index():
    return render_template("index.html", projects=projects_db)


@app.route("/api/projects/<int:project_id>/upvote", methods=["POST"])
def upvote_project(project_id):
    project = next(
        (project for project in projects_db if project["id"] == project_id),
        None,
    )
    if project is None:
        return jsonify(error="Project not found"), 404

    project["likes"] += 1
    return jsonify(likes=project["likes"])


@app.route("/assets/<path:filename>")
def project_assets(filename):
    return send_from_directory(f"{app.static_folder}/assets", filename)


if __name__ == "__main__":
    app.run(debug=True)
