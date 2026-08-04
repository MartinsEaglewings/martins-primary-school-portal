import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import jwt
import datetime
from sqlalchemy import or_, func
from database import init_db, SessionLocal, User, Submission, Assignment, Announcement

app = Flask(
    __name__,
    template_folder=os.path.join(PROJECT_ROOT, "templates"),
    static_folder=os.path.join(PROJECT_ROOT, "static"),
    static_url_path="/static"
)

CORS(app, resources={r"/api/*": {"origins": "*"}})

SECRET_KEY = "priceless_grace_secret_key"
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

init_db()

SCHOOL_NAME = "Priceless Grace Academy"
SCHOOL_ADDRESS = "Winners, Atan, Ogun state"
PHONE_NUMBER = "07042695260"
WHATSAPP_NUMBER = "2347042695260"
SCHOOL_EMAIL = "pricelessgraceacademy@gmail.com"

@app.route("/")
def serve_index():
    template_path = os.path.join(app.template_folder, "index.html")
    if os.path.exists(template_path):
        return render_template("index.html")
    return f"<h1>Welcome to {SCHOOL_NAME}</h1><p>Address: {SCHOOL_ADDRESS}</p>"

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify({
        "school_name": SCHOOL_NAME,
        "school_address": SCHOOL_ADDRESS,
        "phone_number": PHONE_NUMBER,
        "whatsapp_number": WHATSAPP_NUMBER,
        "email": SCHOOL_EMAIL
    })

# Auth Routes
@app.route("/api/auth/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return "", 200

    data = request.json or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "student")

    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password are required"}), 400

    db = SessionLocal()
    try:
        if hasattr(User, 'email'):
            existing_user = db.query(User).filter(
                or_(
                    func.lower(User.username) == username.lower(),
                    func.lower(User.email) == email.lower() if email else False
                )
            ).first()
        else:
            existing_user = db.query(User).filter(func.lower(User.username) == username.lower()).first()

        if existing_user:
            return jsonify({"status": "error", "message": "Account already exists"}), 400

        if hasattr(User, 'email'):
            new_user = User(username=username, email=email, password=password, role=role)
        else:
            new_user = User(username=username, password=password, role=role)

        db.add(new_user)
        db.commit()
        return jsonify({"status": "success", "message": "Account created!"})
    except Exception as e:
        db.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        db.close()

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return "", 200

    data = request.json or {}
    identifier = (data.get("identifier") or data.get("username") or data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    db = SessionLocal()
    try:
        if hasattr(User, 'email'):
            user = db.query(User).filter(
                or_(
                    func.lower(User.username) == identifier.lower(),
                    func.lower(User.email) == identifier.lower()
                )
            ).first()
        else:
            user = db.query(User).filter(func.lower(User.username) == identifier.lower()).first()

        if not user or user.password != password:
            return jsonify({"status": "error", "message": "Invalid username or password"}), 401

        token = jwt.encode({
            "user_id": user.id,
            "role": user.role,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "status": "success",
            "token": token,
            "user": {"id": user.id, "username": user.username, "role": user.role}
        })
    finally:
        db.close()

# Announcements Endpoints
@app.route("/api/announcements", methods=["GET", "POST"])
def manage_announcements():
    db = SessionLocal()
    if request.method == "POST":
        data = request.json or {}
        new_item = Announcement(title=data.get("title"), content=data.get("content"))
        db.add(new_item)
        db.commit()
        db.close()
        return jsonify({"status": "success"})
    
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    result = [{"id": a.id, "title": a.title, "content": a.content, "created_at": a.created_at.isoformat()} for a in announcements]
    db.close()
    return jsonify(result)

# Assignments Endpoints
@app.route("/api/assignments", methods=["GET", "POST"])
def manage_assignments():
    db = SessionLocal()
    if request.method == "POST":
        title = request.form.get("title")
        description = request.form.get("description")
        file = request.files.get("file")
        filename = None
        if file:
            filename = file.filename
            file.save(os.path.join(UPLOAD_FOLDER, filename))
            
        new_item = Assignment(title=title, description=description, file_path=filename)
        db.add(new_item)
        db.commit()
        db.close()
        return jsonify({"status": "success"})
        
    assignments = db.query(Assignment).order_by(Assignment.created_at.desc()).all()
    result = [{"id": a.id, "title": a.title, "description": a.description, "file_path": a.file_path} for a in assignments]
    db.close()
    return jsonify(result)

# Submissions Endpoint
@app.route("/api/submissions", methods=["POST"])
def submit_assignment():
    file = request.files.get("file")
    assignment_id = request.form.get("assignment_id")
    
    if file:
        filename = f"sub_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        
        db = SessionLocal()
        sub = Submission(assignment_id=assignment_id, student_id=1, file_path=filename)
        db.add(sub)
        db.commit()
        db.close()
        return jsonify({"status": "success", "file_path": filename})
    return jsonify({"status": "error", "message": "No file uploaded"}), 400

@app.route("/uploads/<filename>", methods=["GET"])
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
