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

/* ANNOUNCEMENTS LOGIC */
async function loadPublicAnnouncements() {
    try {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        const container = document.getElementById('publicAnnouncements');
        if (!container) return;
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

async function postAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById('annTitle').value.trim();
    const content = document.getElementById('annContent').value.trim();

    try {
        const res = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        if (res.ok) {
            document.getElementById('annTitle').value = '';
            document.getElementById('annContent').value = '';
            loadAdminData();
        } else {
            alert('Failed to post announcement.');
        }
    } catch (err) {
        alert('Server connection error while posting announcement.');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
        const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminData();
        } else {
            alert('Failed to delete announcement.');
        }
    } catch (err) {
        alert('Server connection error.');
    }
}

/* ASSIGNMENTS LOGIC */
async function postAssignment(e) {
    e.preventDefault();
    const title = document.getElementById('assTitle').value.trim();
    const description = document.getElementById('assDesc').value.trim();

    try {
        const res = await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });
        if (res.ok) {
            document.getElementById('assTitle').value = '';
            document.getElementById('assDesc').value = '';
            loadAdminData();
        } else {
            alert('Failed to upload assignment.');
        }
    } catch (err) {
        alert('Server connection error while posting assignment.');
    }
}

async function deleteAssignment(id) {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
        const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminData();
        } else {
            alert('Failed to delete assignment.');
        }
    } catch (err) {
        alert('Server connection error.');
    }
}

/* DASHBOARD DATA LOADERS */
async function loadAdminData() {
    loadPublicAnnouncements();

    // Render Admin Announcements List with Delete buttons
    try {
        const resAnn = await fetch('/api/announcements');
        const annData = await resAnn.json();
        const annContainer = document.getElementById('adminAnnouncements');
        if (annContainer) {
            if (annData.length === 0) {
                annContainer.innerHTML = '<p class="text-muted small">No active announcements.</p>';
            } else {
                annContainer.innerHTML = annData.map(a => `
                    <div class="card card-custom p-3 mb-2 border-red-header d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold text-danger mb-1">${a.title}</h6>
                            <p class="small mb-1 text-secondary">${a.content}</p>
                            <small class="text-muted" style="font-size: 0.75rem;">${a.created_at || ''}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteAnnouncement(${a.id})">
                            <i class="fas fa-trash-alt me-1"></i>Delete
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (err) {}

    // Render Admin Assignments List with Delete buttons
    try {
        const resAss = await fetch('/api/assignments');
        const assData = await resAss.json();
        const assContainer = document.getElementById('adminAssignments');
        if (assContainer) {
            if (assData.length === 0) {
                assContainer.innerHTML = '<p class="text-muted small">No active assignments.</p>';
            } else {
                assContainer.innerHTML = assData.map(a => `
                    <div class="card card-custom p-3 mb-2 border-green-header d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold text-success mb-1">${a.title}</h6>
                            <p class="small mb-1 text-secondary">${a.description || ''}</p>
                            <small class="text-muted" style="font-size: 0.75rem;">${a.created_at || ''}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteAssignment(${a.id})">
                            <i class="fas fa-trash-alt me-1"></i>Delete
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (err) {}
}

async function loadStudentData() {
    loadPublicAnnouncements();

    // Render Student Assignments List
    try {
        const resAss = await fetch('/api/assignments');
        const assData = await resAss.json();
        const assContainer = document.getElementById('studentAssignments');
        if (assContainer) {
            if (assData.length === 0) {
                assContainer.innerHTML = '<p class="text-muted small">No homework assigned yet.</p>';
            } else {
                assContainer.innerHTML = assData.map(a => `
                    <div class="card card-custom p-3 mb-2 border-green-header">
                        <h6 class="fw-bold text-success mb-1">${a.title}</h6>
                        <p class="small mb-1 text-secondary">${a.description || ''}</p>
                        <small class="text-muted" style="font-size: 0.75rem;"><i class="far fa-clock me-1"></i>${a.created_at || ''}</small>
                    </div>
                `).join('');
            }
        }
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', () => {
    loadPublicAnnouncements();
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        setupDashboard(JSON.parse(savedUser));
    }
});
