from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
import jwt, os

from database import SessionLocal, User, Submission, Assignment, Announcement

TEACHER_PIN = "abbey_teacher_pass_2026"
SECRET_KEY = "MARTINS_PORTAL_GLASSMORPHISM_SECRET"

# --- ABSOLUTE PATH SETUP ---
# Resolves project root directory regardless of where you execute python from
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(
    __name__, 
    template_folder=os.path.join(BASE_DIR, "templates"), 
    static_folder=os.path.join(BASE_DIR, "static")
)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def get_db():
    return SessionLocal()

@app.route("/")
def index():
    return render_template("index.html")

# --- SERVE UPLOADED FILES (ABSOLUTE PATH FIX) ---
@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    # Strip any duplicated folder prefixes from old DB records
    clean_filename = os.path.basename(filename)
    
    file_full_path = os.path.join(app.config["UPLOAD_FOLDER"], clean_filename)
    if not os.path.exists(file_full_path):
        return jsonify({"detail": f"File '{clean_filename}' not found on server storage."}), 404
        
    return send_from_directory(app.config["UPLOAD_FOLDER"], clean_filename, as_attachment=False)

# --- AUTHENTICATION ---
@app.route("/api/register", methods=["POST"])
def register():
    db = get_db()
    try:
        full_name = request.form.get("full_name")
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        role = request.form.get("role")
        teacher_pin = request.form.get("teacher_pin")

        if not email or not password or not full_name:
            return jsonify({"detail": "All fields are required."}), 400

        if db.query(User).filter(User.email == email).first():
            return jsonify({"detail": "Email already registered."}), 400

        if role == "teacher" and teacher_pin != TEACHER_PIN:
            return jsonify({"detail": "Invalid Teacher Registration PIN."}), 403

        safe_password = str(password)[:72]
        hashed_pw = generate_password_hash(safe_password, method="pbkdf2:sha256")

        user = User(full_name=full_name, username=username, email=email, password_hash=hashed_pw, role=role)
        db.add(user)
        db.commit()
        return jsonify({"status": "success", "message": "Account created successfully."}), 200
    except Exception as e:
        print(f"Registration Error: {e}")
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@app.route("/api/login", methods=["POST"])
def login():
    db = get_db()
    try:
        email = request.form.get("email")
        password = request.form.get("password")

        user = db.query(User).filter(User.email == email).first()
        safe_password = str(password)[:72] if password else ""

        if not user or not check_password_hash(user.password_hash, safe_password):
            return jsonify({"detail": "Invalid email or password."}), 401

        token = jwt.encode({"sub": user.email, "role": user.role, "id": user.id}, SECRET_KEY, algorithm="HS256")
        return jsonify({"access_token": token, "role": user.role, "user_name": user.full_name, "user_id": user.id}), 200
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

# --- ASSIGNMENTS & ANNOUNCEMENTS ---
@app.route("/api/assignments", methods=["GET", "POST"])
def assignments():
    db = get_db()
    try:
        if request.method == "POST":
            title = request.form.get("title")
            instructions = request.form.get("instructions")
            due_date_str = request.form.get("due_date")
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d") if due_date_str else datetime.utcnow()

            assign = Assignment(title=title, instructions=instructions, due_date=due_date)
            db.add(assign)
            db.commit()
            return jsonify({"message": "Assignment posted successfully!"}), 200

        items = db.query(Assignment).all()
        return jsonify([{"id": a.id, "title": a.title, "instructions": a.instructions, "due_date": a.due_date.strftime("%Y-%m-%d")} for a in items])
    finally:
        db.close()

@app.route("/api/assignments/<int:assign_id>", methods=["DELETE"])
def delete_assignment(assign_id):
    db = get_db()
    try:
        item = db.query(Assignment).filter(Assignment.id == assign_id).first()
        if item:
            db.delete(item)
            db.commit()
            return jsonify({"message": "Assignment removed successfully!"})
        return jsonify({"detail": "Not found"}), 404
    finally:
        db.close()

@app.route("/api/announcements", methods=["GET", "POST"])
def announcements():
    db = get_db()
    try:
        if request.method == "POST":
            title = request.form.get("title")
            content = request.form.get("content")

            ann = Announcement(title=title, content=content)
            db.add(ann)
            db.commit()
            return jsonify({"message": "Announcement posted successfully!"}), 200

        items = db.query(Announcement).all()
        return jsonify([{"id": a.id, "title": a.title, "content": a.content, "posted_at": a.posted_at.strftime("%Y-%m-%d %H:%M")} for a in items])
    finally:
        db.close()

@app.route("/api/announcements/<int:ann_id>", methods=["DELETE"])
def delete_announcement(ann_id):
    db = get_db()
    try:
        item = db.query(Announcement).filter(Announcement.id == ann_id).first()
        if item:
            db.delete(item)
            db.commit()
            return jsonify({"message": "Announcement deleted successfully!"})
        return jsonify({"detail": "Not found"}), 404
    finally:
        db.close()

# --- STUDENT SUBMISSION ENDPOINT ---
@app.route("/api/submit_assignment", methods=["POST"])
def submit_assignment():
    db = get_db()
    try:
        student_id = request.form.get("student_id")
        assignment_id = request.form.get("assignment_id")

        if "file" not in request.files:
            return jsonify({"detail": "No file uploaded."}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"detail": "No file selected."}), 400

        filename = secure_filename(f"{student_id}_{int(datetime.utcnow().timestamp())}_{file.filename}")
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        submission = Submission(
            assignment_id=int(assignment_id),
            student_id=int(student_id),
            file_name=file.filename,
            file_path=filename
        )
        db.add(submission)
        db.commit()
        return jsonify({"message": "Assignment submitted successfully!"}), 200
    except Exception as e:
        print(f"Submission Error: {e}")
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

# --- ADMIN SUBMISSIONS VIEWER ---
@app.route("/api/admin/submissions", methods=["GET"])
def get_submissions():
    db = get_db()
    try:
        subs = db.query(Submission).all()
        result = []
        for s in subs:
            student = db.query(User).filter(User.id == s.student_id).first()
            assign = db.query(Assignment).filter(Assignment.id == s.assignment_id).first()
            
            clean_filename = os.path.basename(s.file_path)
            
            result.append({
                "submission_id": s.id,
                "student_name": student.full_name if student else "Unknown",
                "student_email": student.email if student else "N/A",
                "assignment_title": assign.title if assign else "General Assignment",
                "file_name": s.file_name,
                "file_path": f"/uploads/{clean_filename}",
                "submitted_at": s.submitted_at.strftime("%Y-%m-%d %H:%M")
            })
        return jsonify(result)
    finally:
        db.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
