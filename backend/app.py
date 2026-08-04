import os
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import jwt
import datetime
from sqlalchemy import or_
from database import init_db, SessionLocal, User, Submission, Assignment, Announcement

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

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

@app.route("/api/auth/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return "", 200

    data = request.json or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password")
    role = data.get("role", "student")

    if not username or not password:
        return jsonify({"status": "error", "message": "Username and password are required"}), 400

    db = SessionLocal()
    existing_user = db.query(User).filter(or_(User.username == username, User.username == email)).first()
    if existing_user:
        db.close()
        return jsonify({"status": "error", "message": "Account with this Username or Email already exists"}), 400

    new_user = User(username=username, password=password, role=role)
    db.add(new_user)
    db.commit()
    db.close()

    return jsonify({"status": "success", "message": "Account created successfully!"})

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return "", 200

    data = request.json or {}
    identifier = (data.get("identifier") or data.get("username") or data.get("email") or "").strip()
    password = data.get("password")

    if not identifier or not password:
        return jsonify({"status": "error", "message": "Missing credentials"}), 400

    db = SessionLocal()
    # Check if identifier matches username OR password directly
    user = db.query(User).filter(User.username == identifier, User.password == password).first()
    db.close()

    if user:
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

    return jsonify({"status": "error", "message": "Invalid username/email or password"}), 401

@app.route("/uploads/<filename>", methods=["GET"])
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
