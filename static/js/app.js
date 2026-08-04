window.addEventListener("DOMContentLoaded", function() {
    console.log("Portal script loaded successfully.");

    // --- MODAL TOGGLERS ---
    // Open Modals
    document.querySelectorAll("[data-target]").forEach(function(btn) {
        btn.onclick = function(e) {
            e.preventDefault();
            var targetId = btn.getAttribute("data-target");
            var modal = document.getElementById(targetId);
            if (modal) {
                modal.style.display = "flex";
            } else {
                console.error("Modal not found:", targetId);
            }
        };
    });

    // Close Modals
    document.querySelectorAll(".btn-close").forEach(function(btn) {
        btn.onclick = function(e) {
            e.preventDefault();
            var modal = btn.closest(".modal-screen");
            if (modal) modal.style.display = "none";
        };
    });

    // Toggle Teacher PIN passkey field in register modal
    var regRoleSelect = document.getElementById("reg-role");
    var pinContainer = document.getElementById("pin-container");
    if (regRoleSelect && pinContainer) {
        regRoleSelect.onchange = function() {
            if (regRoleSelect.value === "teacher") {
                pinContainer.style.display = "block";
            } else {
                pinContainer.style.display = "none";
            }
        };
    }

    // --- FORM SUBMISSIONS ---

    // Handle Registration
    var regForm = document.getElementById("form-register");
    if (regForm) {
        regForm.onsubmit = async function(e) {
            e.preventDefault();
            
            var formData = new FormData(regForm);
            var payload = {
                full_name: formData.get("full_name"),
                username: formData.get("username"),
                email: formData.get("email"),
                password: formData.get("password"),
                role: formData.get("role") || "student",
                teacher_pin: formData.get("teacher_pin")
            };

            try {
                var res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                var data = await res.json();

                if (res.ok && data.status === "success") {
                    alert("Account created successfully! You can now sign in.");
                    var modal = document.getElementById("modal-register");
                    if (modal) modal.style.display = "none";
                    regForm.reset();
                } else {
                    alert("Registration failed: " + (data.message || "Unknown error"));
                }
            } catch (err) {
                console.error("Register Error:", err);
                alert("Network error. Please check backend server connection.");
            }
        };
    }

    // Handle Login
    var loginForm = document.getElementById("form-login");
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault();

            var formData = new FormData(loginForm);
            var payload = {
                email: formData.get("email"),
                username: formData.get("email"),
                password: formData.get("password")
            };

            try {
                var res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                var data = await res.json();

                if (res.ok && data.status === "success") {
                    alert("Signed in successfully!");
                    if (data.token) localStorage.setItem("token", data.token);
                    
                    var modal = document.getElementById("modal-login");
                    if (modal) modal.style.display = "none";
                    loginForm.reset();

                    // Open Dashboard based on role
                    if (data.user && (data.user.role === "teacher" || data.user.role === "admin")) {
                        var adminDash = document.getElementById("modal-admin-dashboard");
                        if (adminDash) adminDash.style.display = "flex";
                    } else {
                        var studentDash = document.getElementById("modal-student-dashboard");
                        if (studentDash) studentDash.style.display = "flex";
                    }
                } else {
                    alert("Login failed: " + (data.message || "Invalid credentials"));
                }
            } catch (err) {
                console.error("Login Error:", err);
                alert("Network error. Please check backend server connection.");
            }
        };
    }
});
