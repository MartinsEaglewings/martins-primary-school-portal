const REQUIRED_TEACHER_PIN = "abbey_teacher_pass_2026";

function showView(viewId) {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('registerView').style.display = 'none';
    
    if (viewId === 'loginView' || viewId === 'registerView') {
        document.getElementById(viewId).style.display = 'block';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const adminPin = document.getElementById('regAdminPin').value.trim();

    if (role === 'admin' && adminPin !== REQUIRED_TEACHER_PIN) {
        alert("Invalid Teacher Security Passcode! Access Denied.");
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Registration Successful! Please Sign In.');
            showView('loginView');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        alert('Server Connection Error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setupDashboard(data.user);
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        alert('Server Connection Error');
    }
}

function setupDashboard(user) {
    document.getElementById('landingHero').style.display = 'none';
    document.getElementById('landingView').style.display = 'none';
    document.getElementById('navAuthButtons').classList.add('d-none');
    document.getElementById('navLogoutButton').classList.remove('d-none');
    document.getElementById('userBadge').innerText = `${user.username} (${user.role.toUpperCase()})`;

    if (user.role === 'admin') {
        document.getElementById('adminDashboard').style.display = 'block';
        loadAdminData();
    } else {
        document.getElementById('studentDashboard').style.display = 'block';
        loadStudentData();
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.reload();
}

async function loadPublicAnnouncements() {
    try {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        const container = document.getElementById('publicAnnouncements');
        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No public announcements yet.</p>';
            return;
        }
        container.innerHTML = data.map(a => `
            <div class="card card-custom p-3 mb-3 border-green-header">
                <h5 class="fw-bold text-success mb-1">${a.title}</h5>
                <p class="mb-1 text-secondary">${a.content}</p>
                <small class="text-muted"><i class="far fa-clock me-1"></i>${a.created_at || ''}</small>
            </div>
        `).join('');
    } catch (err) {}
}

async function loadAdminData() {
    loadPublicAnnouncements();
}

async function loadStudentData() {
    loadPublicAnnouncements();
}

document.addEventListener('DOMContentLoaded', () => {
    loadPublicAnnouncements();
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        setupDashboard(JSON.parse(savedUser));
    }
});
