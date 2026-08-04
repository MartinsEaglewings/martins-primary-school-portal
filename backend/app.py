import os
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import jwt
import datetime
from database import init_db, SessionLocal, User, Submission, Assignment, Announcement

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

app = Flask(
    __name__,
    template_folder=os.path.join(PROJECT_ROOT, "templates"),
    static_folder=os.path.join(PROJECT_ROOT, "static"),
    static_url_path="/static"
)
CORS(app)

SECRET_KEY = "priceless_grace_secret_key"
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize SQLite database tables
init_db()

# Official Contact Details for Priceless Grace Academy
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
    return f"<h1>Welcome to {SCHOOL_NAME}</h1><p>Address: {SCHOOL_ADDRESS}</p><p>Contact: {PHONE_NUMBER} | {SCHOOL_EMAIL}</p>"

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify({
        "school_name": SCHOOL_NAME,
        "school_address": SCHOOL_ADDRESS,
        "phone_number": PHONE_NUMBER,
        "whatsapp_number": WHATSAPP_NUMBER,
        "email": SCHOOL_EMAIL
    })

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")
    
    db = SessionLocal()
    user = db.query(User).filter(User.username == username, User.password == password).first()
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
    return jsonify({"status": "error", "message": "Invalid username or password"}), 401

@app.route("/api/announcements", methods=["GET"])
def get_announcements():
    db = SessionLocal()
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    res = [{"id": a.id, "title": a.title, "content": a.content, "date": a.created_at.strftime("%Y-%m-%d")} for a in announcements]
    db.close()
    return jsonify(res)

@app.route("/api/assignments", methods=["GET"])
def get_assignments():
    db = SessionLocal()
    assignments = db.query(Assignment).order_by(Assignment.created_at.desc()).all()
    res = [{
        "id": a.id,
        "title": a.title,
        "subject": a.subject,
        "class_level": a.class_level,
        "due_date": a.due_date,
        "description": a.description
    } for a in assignments]
    db.close()
    return jsonify(res)

@app.route("/api/submit_homework", methods=["POST"])
def submit_homework():
    student_name = request.form.get("student_name")
    subject = request.form.get("subject")
    class_level = request.form.get("class_level")
    file = request.files.get("file")
    
    if not student_name or not file:
        return jsonify({"status": "error", "message": "Missing student details or homework file"}), 400
        
    filename = f"{int(datetime.datetime.now().timestamp())}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    file_url = f"{request.host_url}uploads/{filename}"
    
    db = SessionLocal()
    submission = Submission(
        student_name=student_name,
        subject=subject,
        class_level=class_level,
        file_url=file_url
    )
    db.add(submission)
    db.commit()
    db.close()

    message = f"Hello {SCHOOL_NAME} Admin,%0A%0AStudent *{student_name}* ({class_level}) submitted homework for *{subject}*.%0AFile link: {file_url}"
    whatsapp_link = f"https://wa.me/{WHATSAPP_NUMBER}?text={message}"

    return jsonify({
        "status": "success",
        "message": "Submission uploaded successfully",
        "file_url": file_url,
        "whatsapp_link": whatsapp_link
    })

@app.route("/uploads/<filename>", methods=["GET"])
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
