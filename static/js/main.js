const API_BASE = "";

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
            checkAuthState();
        } else {
            alert(data.message || "Login failed");
        }
    } catch (err) {
        alert("Server network error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById("regUsername").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const role = document.getElementById("regRole").value;

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, role })
        });
        const data = await res.json();

        if (data.status === "success") {
            alert("Account created! Please sign in.");
            showView("loginView");
        } else {
            alert(data.message || "Registration failed");
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

function loadStudentData() {
    fetchAnnouncements("studentAnnouncements");
    fetchAssignments("studentAssignments");
}

function loadAdminData() {
    fetchAnnouncements("adminAnnouncements", true);
    fetchAssignments("adminAssignments", true);
}

// Announcements
async function fetchAnnouncements(targetId, isAdmin = false) {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    try {
        const res = await fetch("/api/announcements");
        const announcements = await res.json();
        
        if (!announcements.length) {
            container.innerHTML = "<p class='text-muted'>No announcements yet.</p>";
            return;
        }

        container.innerHTML = announcements.map(a => `
            <div class="card my-2 p-3">
                <h5 class="mb-1">${a.title}</h5>
                <p class="mb-2">${a.content}</p>
                <small class="text-muted">${new Date(a.created_at).toLocaleDateString()}</small>
                ${isAdmin ? `<button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteAnnouncement(${a.id})">Delete</button>` : ''}
            </div>
        `).join("");
    } catch (err) {
        container.innerHTML = "<p class='text-danger'>Failed to load announcements.</p>";
    }
}

async function postAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById("annTitle").value;
    const content = document.getElementById("annContent").value;

    await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
    });

    document.getElementById("annTitle").value = "";
    document.getElementById("annContent").value = "";
    loadAdminData();
}

async function deleteAnnouncement(id) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    loadAdminData();
}

// Assignments
async function fetchAssignments(targetId, isAdmin = false) {
    const container = document.getElementById(targetId);
    if (!container) return;

    try {
        const res = await fetch("/api/assignments");
        const assignments = await res.json();

        if (!assignments.length) {
            container.innerHTML = "<p class='text-muted'>No assignments posted yet.</p>";
            return;
        }

        container.innerHTML = assignments.map(a => `
            <div class="card my-2 p-3">
                <h5 class="mb-1">${a.title}</h5>
                <p class="mb-2">${a.description || ''}</p>
                ${a.file_path ? `<a href="/uploads/${a.file_path}" target="_blank" class="mb-2 d-inline-block">📁 Download Attachment</a>` : ''}
                ${isAdmin ? `
                    <div><button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteAssignment(${a.id})">Delete Assignment</button></div>
                ` : `
                    <form onsubmit="submitAssignment(event, ${a.id})" class="mt-2">
                        <label class="form-label small">Submit Solution File:</label>
                        <input type="file" required id="file-${a.id}" class="form-control form-control-sm mb-2">
                        <button class="btn btn-sm btn-primary" type="submit">Submit & Notify Admin via WhatsApp</button>
                    </form>
                `}
            </div>
        `).join("");
    } catch (err) {
        container.innerHTML = "<p class='text-danger'>Failed to load assignments.</p>";
    }
}

async function postAssignment(e) {
    e.preventDefault();
    const title = document.getElementById("assTitle").value;
    const description = document.getElementById("assDesc").value;
    const fileInput = document.getElementById("assFile");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (fileInput.files[0]) {
        formData.append("file", fileInput.files[0]);
    }

    await fetch("/api/assignments", {
        method: "POST",
        body: formData
    });

    document.getElementById("assTitle").value = "";
    document.getElementById("assDesc").value = "";
    fileInput.value = "";
    loadAdminData();
}

async function deleteAssignment(id) {
    if (!confirm("Delete this assignment?")) return;
    await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    loadAdminData();
}

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
            const user = JSON.parse(localStorage.getItem("user"));
            const whatsappMsg = encodeURIComponent(`Hello Admin, I (${user.username}) have submitted assignment #${assignmentId}.\nFile: ${data.file_path}`);
            window.open(`https://wa.me/2347042695260?text=${whatsappMsg}`, '_blank');
        } else {
            alert(data.message || "Submission failed");
        }
    } catch (err) {
        alert("Upload error");
    }
}

async function loadPublicConfig() {
    try {
        const res = await fetch("/api/config");
        const config = await res.json();
        const header = document.getElementById("schoolHeader");
        if (header) header.innerText = config.school_name;
    } catch (err) {}
}
