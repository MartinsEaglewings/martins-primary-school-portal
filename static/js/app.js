// Global target WhatsApp phone number (+234 format)
const ADMIN_PHONE_NUMBER = "2349068053574";

document.addEventListener('DOMContentLoaded', () => {
    initModalHandlers();
    initFormHandlers();
    checkExistingSession();
});

// --- MODAL CONTROLLER ---
function initModalHandlers() {
    // Open modal triggers
    document.querySelectorAll('[data-target]').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            openModal(targetId);
        });
    });

    // Close buttons inside modals
    document.querySelectorAll('.btn-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal-screen');
            if (modal) closeModal(modal.id);
        });
    });

    // Toggle Teacher PIN field during registration
    const roleSelect = document.getElementById('reg-role');
    const pinContainer = document.getElementById('pin-container');
    if (roleSelect && pinContainer) {
        roleSelect.addEventListener('change', (e) => {
            pinContainer.style.display = e.target.value === 'teacher' ? 'block' : 'none';
        });
    }
}

function openModal(modalId) {
    // Close any existing active modals first
    document.querySelectorAll('.modal-screen.active').forEach(m => m.classList.remove('active'));
    
    const targetModal = document.getElementById(modalId);
    if (targetModal) {
        targetModal.classList.add('active');
        
        // Auto-fetch data depending on opened dashboard
        if (modalId === 'modal-student-dashboard') {
            loadStudentDashboardData();
        } else if (modalId === 'modal-admin-dashboard') {
            loadAdminDashboardData();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// --- SESSION CHECK ---
function checkExistingSession() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const userName = localStorage.getItem('userName');

    if (token && role) {
        if (role === 'teacher') {
            openModal('modal-admin-dashboard');
        } else {
            const welcomeTitle = document.getElementById('student-welcome-title');
            if (welcomeTitle && userName) welcomeTitle.innerText = `🎓 Welcome, ${userName}`;
            openModal('modal-student-dashboard');
        }
    }
}

// --- FORM SUBMISSIONS & API ---
function initFormHandlers() {
    // Register Form
    const regForm = document.getElementById('form-register');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(regForm);
            try {
                const res = await fetch('/api/register', { method: 'POST', body: formData });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message || 'Account registered successfully!');
                    regForm.reset();
                    openModal('modal-login');
                } else {
                    alert(data.detail || 'Registration failed.');
                }
            } catch (err) {
                alert('Network error during registration.');
            }
        });
    }

    // Login Form
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            try {
                const res = await fetch('/api/login', { method: 'POST', body: formData });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('userName', data.user_name);
                    localStorage.setItem('userId', data.user_id);
                    
                    loginForm.reset();
                    if (data.role === 'teacher') {
                        openModal('modal-admin-dashboard');
                    } else {
                        const welcomeTitle = document.getElementById('student-welcome-title');
                        if (welcomeTitle) welcomeTitle.innerText = `🎓 Welcome, ${data.user_name}`;
                        openModal('modal-student-dashboard');
                    }
                } else {
                    alert(data.detail || 'Login failed.');
                }
            } catch (err) {
                alert('Network error during login.');
            }
        });
    }

    // Student Submit Homework Form
    const submitAssignmentForm = document.getElementById('form-submit-assignment');
    if (submitAssignmentForm) {
        submitAssignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentId = localStorage.getItem('userId');
            if (!studentId) {
                alert('Session expired. Please log in again.');
                return;
            }

            const formData = new FormData(submitAssignmentForm);
            formData.append('student_id', studentId);

            try {
                const res = await fetch('/api/submit_assignment', { method: 'POST', body: formData });
                const data = await res.json();
                if (res.ok) {
                    alert('Homework submitted successfully!');
                    submitAssignmentForm.reset();
                } else {
                    alert(data.detail || 'Failed to submit homework.');
                }
            } catch (err) {
                alert('Network error during submission.');
            }
        });
    }

    // Teacher Post Assignment
    const postAssignForm = document.getElementById('form-post-assignment');
    if (postAssignForm) {
        postAssignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(postAssignForm);
            try {
                const res = await fetch('/api/assignments', { method: 'POST', body: formData });
                if (res.ok) {
                    postAssignForm.reset();
                    loadAdminDashboardData();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // Teacher Post Announcement
    const postAnnForm = document.getElementById('form-post-announcement');
    if (postAnnForm) {
        postAnnForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(postAnnForm);
            try {
                const res = await fetch('/api/announcements', { method: 'POST', body: formData });
                if (res.ok) {
                    postAnnForm.reset();
                    loadAdminDashboardData();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
}

// --- STUDENT DASHBOARD DATA ---
async function loadStudentDashboardData() {
    // Fetch Announcements
    try {
        const res = await fetch('/api/announcements');
        const items = await res.json();
        const container = document.getElementById('student-announcement-list');
        if (container) {
            container.innerHTML = items.length ? '' : '<p style="color:#cbd5e1;">No announcements posted.</p>';
            items.forEach(ann => {
                container.innerHTML += `
                    <div class="item-row">
                        <div class="item-info">
                            <strong>${ann.title}</strong>
                            <span>${ann.content}</span>
                        </div>
                        <small style="color:#cbd5e1;">${ann.posted_at}</small>
                    </div>`;
            });
        }
    } catch (err) { console.error(err); }

    // Fetch Assignments
    try {
        const res = await fetch('/api/assignments');
        const items = await res.json();
        const container = document.getElementById('student-assignment-list');
        const select = document.getElementById('student-assignment-select');

        if (container) {
            container.innerHTML = items.length ? '' : '<p style="color:#cbd5e1;">No active homework tasks.</p>';
            if (select) select.innerHTML = '';

            items.forEach(assign => {
                container.innerHTML += `
                    <div class="item-row">
                        <div class="item-info">
                            <strong>${assign.title}</strong>
                            <span>${assign.instructions}</span>
                        </div>
                        <small style="color:#f59e0b;">Due: ${assign.due_date}</small>
                    </div>`;

                if (select) {
                    select.innerHTML += `<option value="${assign.id}">${assign.title}</option>`;
                }
            });
        }
    } catch (err) { console.error(err); }
}

// --- ADMIN DASHBOARD DATA & WHATSAPP DISPATCH ---
async function loadAdminDashboardData() {
    // Admin Assignments List
    try {
        const res = await fetch('/api/assignments');
        const items = await res.json();
        const container = document.getElementById('admin-assignment-list');
        if (container) {
            container.innerHTML = items.length ? '' : '<p style="color:#cbd5e1;">No assignments created.</p>';
            items.forEach(assign => {
                container.innerHTML += `
                    <div class="item-row">
                        <div class="item-info">
                            <strong>${assign.title}</strong>
                            <span>Due: ${assign.due_date}</span>
                        </div>
                        <button class="btn-danger" onclick="deleteAssignment(${assign.id})">Delete</button>
                    </div>`;
            });
        }
    } catch (err) { console.error(err); }

    // Admin Announcements List
    try {
        const res = await fetch('/api/announcements');
        const items = await res.json();
        const container = document.getElementById('admin-announcement-list');
        if (container) {
            container.innerHTML = items.length ? '' : '<p style="color:#cbd5e1;">No announcements created.</p>';
            items.forEach(ann => {
                container.innerHTML += `
                    <div class="item-row">
                        <div class="item-info">
                            <strong>${ann.title}</strong>
                            <span>${ann.content}</span>
                        </div>
                        <button class="btn-danger" onclick="deleteAnnouncement(${ann.id})">Delete</button>
                    </div>`;
            });
        }
    } catch (err) { console.error(err); }

    // Admin Submissions & WhatsApp Button Generation
    loadAdminSubmissions();
}

async function loadAdminSubmissions() {
    try {
        const res = await fetch('/api/admin/submissions');
        const submissions = await res.json();
        const tableBody = document.getElementById('admin-submissions-table');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (submissions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#cbd5e1;">No student submissions found.</td></tr>`;
            return;
        }

        submissions.forEach(sub => {
            const hostUrl = window.location.origin;
            const fullFileUrl = `${hostUrl}${sub.file_path}`;

            // Pre-formatted WhatsApp Message Content
            const waText = encodeURIComponent(
                `*🏫 MARTINS PRIMARY SCHOOL - HOMEWORK SUBMISSION*\n\n` +
                `👤 *Student Name:* ${sub.student_name}\n` +
                `📧 *Email:* ${sub.student_email}\n` +
                `📚 *Assignment:* ${sub.assignment_title}\n` +
                `⏰ *Submitted At:* ${sub.submitted_at}\n\n` +
                `📁 *View File Attachment:* ${fullFileUrl}`
            );

            const waLink = `https://wa.me/${ADMIN_PHONE_NUMBER}?text=${waText}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${sub.student_name}</strong></td>
                <td>${sub.student_email}</td>
                <td>${sub.assignment_title}</td>
                <td>${sub.submitted_at}</td>
                <td>
                    <a href="${sub.file_path}" target="_blank" class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem; text-decoration: none; display: inline-block;">👁️ View File</a>
                </td>
                <td>
                    <a href="${waLink}" target="_blank" class="btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; text-decoration: none; display: inline-block; background: #25D366; border: none; color: white;">📱 WhatsApp</a>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading submissions:", err);
    }
}

// Helper Deletion Functions
async function deleteAssignment(id) {
    if (confirm("Delete this assignment?")) {
        await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
        loadAdminDashboardData();
    }
}

async function deleteAnnouncement(id) {
    if (confirm("Delete this announcement?")) {
        await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
        loadAdminDashboardData();
    }
}
