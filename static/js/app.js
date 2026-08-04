document.addEventListener("DOMContentLoaded", () => {
    // Modal toggle handlers
    document.querySelectorAll("[data-target]").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const modal = document.getElementById(targetId);
            if (modal) modal.style.display = "flex";
        });
    });

    document.querySelectorAll(".btn-close").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".modal-screen").style.display = "none";
        });
    });

    // Handle Registration
    const regForm = document.getElementById("form-register");
    if (regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(regForm);
            const payload = {
                full_name: formData.get("full_name"),
                username: formData.get("username"),
                email: formData.get("email"),
                password: formData.get("password"),
                role: formData.get("role") || "student",
                teacher_pin: formData.get("teacher_pin")
            };

            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok && data.status === "success") {
                    alert("Account created successfully! You can now sign in.");
                    document.getElementById("modal-register").style.display = "none";
                    regForm.reset();
                } else {
                    alert("Registration failed: " + (data.message || "Unknown error"));
                }
            } catch (err) {
                console.error("Register Error:", err);
                alert("Network error. Please check connection and try again.");
            }
        });
    }

    // Handle Login
    const loginForm = document.getElementById("form-login");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const payload = {
                email: formData.get("email"),
                username: formData.get("email"), // fallbacks for backend
                password: formData.get("password")
            };

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok && data.status === "success") {
                    alert("Signed in successfully!");
                    localStorage.setItem("token", data.token);
                    document.getElementById("modal-login").style.display = "none";
                    loginForm.reset();

                    // Open student or admin dashboard
                    if (data.user && (data.user.role === "teacher" || data.user.role === "admin")) {
                        document.getElementById("modal-admin-dashboard").style.display = "flex";
                    } else {
                        document.getElementById("modal-student-dashboard").style.display = "flex";
                    }
                } else {
                    alert("Login failed: " + (data.message || "Invalid credentials"));
                }
            } catch (err) {
                console.error("Login Error:", err);
                alert("Network error. Please check connection and try again.");
            }
        });
    }
});
