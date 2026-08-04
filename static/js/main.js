const API_BASE = "";

// Check auth status on page load
document.addEventListener("DOMContentLoaded", () => {
    checkAuthState();
    loadPublicConfig();
});

function checkAuthState() {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");

    if (!token || !userJson) {
        showView("loginView");
        return;
    }

    const user = JSON.parse(userJson);
    if (user.role === "admin" || user.role === "teacher") {
        showView("adminDashboard");
        loadAdminData();
    } else {
        showView("studentDashboard");
        loadStudentData();
    }
}

function showView(viewId) {
    const views = ["loginView", "registerView", "adminDashboard", "studentDashboard"];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === viewId) ? "block" : "none";
    });
}

// Global Auth Handlers
async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById("loginIdentifier").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();

        if (data.status === "success") {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            alert("Login Successful!");
            checkAuthState();
        } else {
            alert(data.message || "Login failed");
        }
    } catch (err) {
        alert("Server network error");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    showView("loginView");
}

// Data Fetching for Student
async function loadStudentData() {
    fetchAnnouncements("studentAnnouncements");
    fetchAssignments("studentAssignments");
}

// Data Fetching for Admin
async function loadAdminData() {
    fetchAnnouncements("adminAnnouncements", true);
    fetchAssignments("adminAssignments", true);
    fetchSubmissions("adminSubmissions");
}

// Announcement Operations
async function fetchAnnouncements(targetId, isAdmin = false) {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    try {
        const res = await fetch("/api/announcements");
        const announcements = await res.json();
        
        if (!announcements.length) {
            container.innerHTML = "<p>No announcements yet.</p>";
            return;
        }

        container.innerHTML = announcements.map(a => `
            <div class="card my-2 p-3">
                <h5>${a.title}</h5>
                <p>${a.content}</p>
                <small class="text-muted">${new Date(a.created_at).toLocaleDateString()}</small>
                ${isAdmin ? `<button class="btn btn-sm btn-danger mt-2" onclick="deleteAnnouncement(${a.id})">Delete</button>` : ''}
            </div>
        `).join("");
    } catch (err) {
        container.innerHTML = "<p>Failed to load announcements.</p>";
    }
}

// Assignment Operations
async function fetchAssignments(targetId, isAdmin = false) {
    const container = document.getElementById(targetId);
    if (!container) return;

    try {
        const res = await fetch("/api/assignments");
        const assignments = await res.json();

        if (!assignments.length) {
            container.innerHTML = "<p>No assignments given yet.</p>";
            return;
        }

        container.innerHTML = assignments.map(a => `
            <div class="card my-2 p-3">
                <h5>${a.title}</h5>
                <p>${a.description || ''}</p>
                ${a.file_path ? `<a href="/uploads/${a.file_path}" target="_blank">Download Attachment</a>` : ''}
                ${isAdmin ? `<button class="btn btn-sm btn-danger mt-2" onclick="deleteAssignment(${a.id})">Delete</button>` : `
                    <form onsubmit="submitAssignment(event, ${a.id})" class="mt-2">
                        <input type="file" required id="file-${a.id}" class="form-control form-control-sm mb-2">
                        <button class="btn btn-sm btn-primary" type="submit">Submit Assignment</button>
                    </form>
                `}
            </div>
        `).join("");
    } catch (err) {
        container.innerHTML = "<p>Failed to load assignments.</p>";
    }
}

// Student Submit Assignment & Redirect to WhatsApp
async function submitAssignment(e, assignmentId) {
    e.preventDefault();
    const fileInput = document.getElementById(`file-${assignmentId}`);
    if (!fileInput.files[0]) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("assignment_id", assignmentId);

    const token = localStorage.getItem("token");

    try {
        const res = await fetch("/api/submissions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();

        if (data.status === "success") {
            alert("Submission uploaded!");
            // Redirect to WhatsApp with submission confirmation
            const user = JSON.parse(localStorage.getItem("user"));
            const whatsappMsg = encodeURIComponent(`Hello Admin, I (${user.username}) have submitted my assignment #${assignmentId}. File path: ${data.file_path}`);
            window.open(`https://wa.me/2347042695260?text=${whatsappMsg}`, '_blank');
        } else {
            alert(data.message || "Submission failed");
        }
    } catch (err) {
        alert("Upload error");
    }
}

// Fetch Admin Config
async function loadPublicConfig() {
    try {
        const res = await fetch("/api/config");
        const config = await res.json();
        const header = document.getElementById("schoolHeader");
        if (header) header.innerText = config.school_name;
    } catch (err) {}
}
