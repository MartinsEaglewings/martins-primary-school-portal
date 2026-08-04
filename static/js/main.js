const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
    checkAuthState();
    loadPublicConfig();
    fetchAnnouncements("publicAnnouncements");
});

function checkAuthState() {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");

    const landingView = document.getElementById("landingView");
    const adminDashboard = document.getElementById("adminDashboard");
    const studentDashboard = document.getElementById("studentDashboard");
    const navAuth = document.getElementById("navAuthButtons");
    const navLogout = document.getElementById("navLogoutButton");
    const userBadge = document.getElementById("userBadge");

    if (!token || !userJson) {
        if (landingView) landingView.style.display = "block";
        if (adminDashboard) adminDashboard.style.display = "none";
        if (studentDashboard) studentDashboard.style.display = "none";
        if (navAuth) navAuth.classList.remove("d-none");
        if (navLogout) navLogout.classList.add("d-none");
        showView("loginView");
        return;
    }

    const user = JSON.parse(userJson);
    if (navAuth) navAuth.classList.add("d-none");
    if (navLogout) navLogout.classList.remove("d-none");
    if (userBadge) userBadge.innerText = `Logged in: ${user.username} (${user.role})`;

    if (landingView) landingView.style.display = "none";

    if (user.role === "admin" || user.role === "teacher") {
        if (adminDashboard) adminDashboard.style.display = "block";
        if (studentDashboard) studentDashboard.style.display = "none";
        loadAdminData();
    } else {
        if (studentDashboard) studentDashboard.style.display = "block";
        if (adminDashboard) adminDashboard.style.display = "none";
        loadStudentData();
    }
}

function showView(viewId) {
    const loginView = document.getElementById("loginView");
    const registerView = document.getElementById("registerView");

    if (viewId === "loginView") {
        if (loginView) loginView.style.display = "block";
        if (registerView) registerView.style.display = "none";
    } else if (viewId === "registerView") {
        if (registerView) registerView.style.display = "block";
        if (loginView) loginView.style.display = "none";
    }
}

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
        alert("Server error during login");
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
        alert("Server error during registration");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    checkAuthState();
}

function loadStudentData() {
    fetchAnnouncements("studentAnnouncements");
    fetchAssignments("studentAssignments");
}

function loadAdminData() {
    fetchAnnouncements("adminAnnouncements", true);
    fetchAssignments("adminAssignments", true);
}

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
            <div class="card card-custom my-2 p-3">
                <h5 class="fw-bold text-dark mb-1">${a.title}</h5>
                <p class="mb-2 text-secondary">${a.content}</p>
                <small class="text-muted"><i class="far fa-calendar-alt me-1"></i>${new Date(a.created_at).toLocaleDateString()}</small>
                ${isAdmin ? `<div class="mt-2"><button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement(${a.id})">Delete</button></div>` : ''}
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
            <div class="card card-custom my-2 p-3">
                <h5 class="fw-bold text-dark mb-1">${a.title}</h5>
                <p class="mb-2 text-secondary">${a.description || ''}</p>
                ${a.file_path ? `<a href="/uploads/${a.file_path}" target="_blank" class="mb-2 d-inline-block text-decoration-none"><i class="fas fa-file-download me-1"></i>Download Attachment</a>` : ''}
                ${isAdmin ? `
                    <div><button class="btn btn-sm btn-outline-danger mt-2" onclick="deleteAssignment(${a.id})">Delete Assignment</button></div>
                ` : `
                    <form onsubmit="submitAssignment(event, ${a.id})" class="mt-2 pt-2 border-top">
                        <label class="form-label small fw-bold">Submit Solution File:</label>
                        <input type="file" required id="file-${a.id}" class="form-control form-control-sm mb-2">
                        <button class="btn btn-sm btn-success fw-bold" type="submit"><i class="fab fa-whatsapp me-1"></i>Submit via WhatsApp</button>
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
