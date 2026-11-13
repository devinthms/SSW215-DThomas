import json
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///portfolio.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=False, default="")
    likes = db.Column(db.Integer, nullable=False, default=0)
    author_id = db.Column(db.Integer, db.ForeignKey("author.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "likes": self.likes,
            "author": self.author.name,
        }


class Author(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    projects = db.relationship("Project", backref="author")


def init_seed_data():
    if db.session.query(Project.id).first() is not None:
        return

    seed_file = Path(__file__).resolve().with_name("projects_seed.json")
    with seed_file.open(encoding="utf-8") as projects_file:
        seed_projects = json.load(projects_file)

    author = Author(name="Devin Thomas")
    db.session.add(author)
    for project_data in seed_projects:
        db.session.add(
            Project(
                id=project_data["id"],
                title=project_data["title"],
                description=project_data["description"],
                likes=project_data["likes"],
                author=author,
            )
        )

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        raise


Path(app.instance_path).mkdir(parents=True, exist_ok=True)
with app.app_context():
    db.create_all()
    init_seed_data()


@app.route("/")
def index():
    projects = Project.query.order_by(Project.id).all()
    author = Author.query.order_by(Author.id).first()
    return render_template("index.html", projects=projects, author=author)


@app.route("/api/projects")
def get_projects():
    projects = Project.query.order_by(Project.id).all()
    return jsonify([project.to_dict() for project in projects])


@app.route("/api/author")
def get_author():
    author = Author.query.order_by(Author.id).first()
    if author is None:
        return jsonify(error="Author not found"), 404
    return jsonify(author=author.name)


@app.route("/api/projects/<int:project_id>/upvote", methods=["POST"])
def upvote_project(project_id):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify(error="Project not found"), 404

    project.likes += 1
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to upvote project"), 400

    return jsonify(likes=project.likes)


@app.route("/api/projects", methods=["POST"])
def create_project():
    request_data = request.get_json(silent=True)
    if not isinstance(request_data, dict):
        return jsonify(error="A project title is required"), 400

    title = request_data.get("title")
    if not isinstance(title, str) or not title.strip():
        return jsonify(error="A project title is required"), 400

    author = Author.query.order_by(Author.id).first()
    if author is None:
        return jsonify(error="No project author is available"), 400

    project = Project(
        title=title.strip(),
        description="",
        likes=0,
        author=author,
    )
    db.session.add(project)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to create project; the title may already exist"), 400

    return jsonify(project.to_dict()), 201


@app.route("/assets/<path:filename>")
def project_assets(filename):
    return send_from_directory(f"{app.static_folder}/assets", filename)


if __name__ == "__main__":
    app.run(debug=True)
