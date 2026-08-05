import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.join(BASE_DIR, '..')

app = Flask(__name__, 
            template_folder=os.path.join(ROOT_DIR, 'templates'),
            static_folder=os.path.join(ROOT_DIR, 'static'))

CORS(app)

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db_connection():
    if DATABASE_URL:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn, 'postgres'
    else:
        DB_PATH = os.path.join(BASE_DIR, 'school.db')
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn, 'sqlite'

def init_db():
    conn, db_type = get_db_connection()
    cursor = conn.cursor()
    
    if db_type == 'postgres':
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(150),
                password VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS assignments (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
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
    cursor.close()
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
        conn, db_type = get_db_connection()
        cursor = conn.cursor()
        if db_type == 'postgres':
            cursor.execute("INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, %s)",
                           (username, email, password, role))
        else:
            cursor.execute("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
                           (username, email, password, role))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Registration successful!'}), 201
    except Exception:
        return jsonify({'error': 'Username already exists or database error!'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid payload'}), 400

    identifier = data.get('identifier')
    password = data.get('password')

    conn, db_type = get_db_connection()
    cursor = conn.cursor()
    if db_type == 'postgres':
        cursor.execute("SELECT id, username, email, role FROM users WHERE (username=%s OR email=%s) AND password=%s",
                       (identifier, identifier, password))
    else:
        cursor.execute("SELECT id, username, email, role FROM users WHERE (username=? OR email=?) AND password=?",
                       (identifier, identifier, password))
    
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user:
        return jsonify({
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials!'}), 401

@app.route('/api/announcements', methods=['GET', 'POST'])
def announcements():
    conn, db_type = get_db_connection()
    cursor = conn.cursor()
    if request.method == 'POST':
        data = request.get_json()
        if db_type == 'postgres':
            cursor.execute("INSERT INTO announcements (title, content) VALUES (%s, %s)",
                           (data.get('title'), data.get('content')))
        else:
            cursor.execute("INSERT INTO announcements (title, content) VALUES (?, ?)",
                           (data.get('title'), data.get('content')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Announcement created!'}), 201

    cursor.execute("SELECT id, title, content, created_at FROM announcements ORDER BY id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    ann_list = []
    for r in rows:
        ann_list.append({
            'id': r['id'],
            'title': r['title'],
            'content': r['content'],
            'created_at': str(r['created_at'])
        })
    return jsonify(ann_list), 200

@app.route('/api/announcements/<int:ann_id>', methods=['DELETE'])
def delete_announcement(ann_id):
    conn, db_type = get_db_connection()
    cursor = conn.cursor()
    if db_type == 'postgres':
        cursor.execute("DELETE FROM announcements WHERE id = %s", (ann_id,))
    else:
        cursor.execute("DELETE FROM announcements WHERE id = ?", (ann_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Announcement deleted!'}), 200

@app.route('/api/assignments', methods=['GET', 'POST'])
def assignments():
    conn, db_type = get_db_connection()
    cursor = conn.cursor()
    if request.method == 'POST':
        data = request.get_json()
        if db_type == 'postgres':
            cursor.execute("INSERT INTO assignments (title, description) VALUES (%s, %s)",
                           (data.get('title'), data.get('description')))
        else:
            cursor.execute("INSERT INTO assignments (title, description) VALUES (?, ?)",
                           (data.get('title'), data.get('description')))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Assignment created!'}), 201

    cursor.execute("SELECT id, title, description, created_at FROM assignments ORDER BY id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    ass_list = []
    for r in rows:
        ass_list.append({
            'id': r['id'],
            'title': r['title'],
            'description': r['description'],
            'created_at': str(r['created_at'])
        })
    return jsonify(ass_list), 200

@app.route('/api/assignments/<int:ass_id>', methods=['DELETE'])
def delete_assignment(ass_id):
    conn, db_type = get_db_connection()
    cursor = conn.cursor()
    if db_type == 'postgres':
        cursor.execute("DELETE FROM assignments WHERE id = %s", (ass_id,))
    else:
        cursor.execute("DELETE FROM assignments WHERE id = ?", (ass_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Assignment deleted!'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
