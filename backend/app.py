import os
import sqlite3
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.join(BASE_DIR, '..')
DB_PATH = os.path.join(BASE_DIR, 'school.db')

app = Flask(__name__, 
            template_folder=os.path.join(ROOT_DIR, 'templates'),
            static_folder=os.path.join(ROOT_DIR, 'static'))

CORS(app)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid payload'}), 400

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
                       (username, email, password, role))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Registration successful!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists!'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid payload'}), 400

    identifier = data.get('identifier')
    password = data.get('password')

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role FROM users WHERE (username=? OR email=?) AND password=?",
                   (identifier, identifier, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            'user': {
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'role': user[3]
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials!'}), 401

# --- ANNOUNCEMENTS API ---
@app.route('/api/announcements', methods=['GET', 'POST'])
def announcements():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if request.method == 'POST':
        data = request.get_json()
        cursor.execute("INSERT INTO announcements (title, content) VALUES (?, ?)",
                       (data.get('title'), data.get('content')))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Announcement created!'}), 201

    cursor.execute("SELECT id, title, content, created_at FROM announcements ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return jsonify([{'id': r[0], 'title': r[1], 'content': r[2], 'created_at': r[3]} for r in rows]), 200

@app.route('/api/announcements/<int:ann_id>', methods=['DELETE'])
def delete_announcement(ann_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM announcements WHERE id = ?", (ann_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Announcement deleted!'}), 200

# --- ASSIGNMENTS API ---
@app.route('/api/assignments', methods=['GET', 'POST'])
def assignments():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if request.method == 'POST':
        data = request.get_json()
        cursor.execute("INSERT INTO assignments (title, description) VALUES (?, ?)",
                       (data.get('title'), data.get('description')))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Assignment created!'}), 201

    cursor.execute("SELECT id, title, description, created_at FROM assignments ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return jsonify([{'id': r[0], 'title': r[1], 'description': r[2], 'created_at': r[3]} for r in rows]), 200

@app.route('/api/assignments/<int:ass_id>', methods=['DELETE'])
def delete_assignment(ass_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assignments WHERE id = ?", (ass_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Assignment deleted!'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
