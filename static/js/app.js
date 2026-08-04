document.addEventListener("submit", function(e) {
    var form = e.target;

    // Handle Registration Form
    if (form && form.id === "form-register") {
        e.preventDefault();
        var formData = new FormData(form);
        var payload = {
            username: formData.get("username") || formData.get("email"),
            email: formData.get("email"),
            password: formData.get("password"),
            role: formData.get("role") || "student"
        };

        fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.status === "success") {
                alert("Account created successfully! You can now sign in.");
                var m = document.getElementById("modal-register");
                if (m) m.style.display = "none";
                form.reset();
            } else {
                alert("Registration failed: " + (data.message || "Error"));
            }
        })
        .catch(function(err) {
            console.error(err);
            alert("Network Error: Backend unreachable. Ensure server is running.");
        });
    }

    // Handle Login Form
    if (form && form.id === "form-login") {
        e.preventDefault();
        var formData = new FormData(form);
        var payload = {
            username: formData.get("email"),
            email: formData.get("email"),
            password: formData.get("password")
        };

        fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.status === "success") {
                alert("Signed in successfully!");
                var m = document.getElementById("modal-login");
                if (m) m.style.display = "none";
                form.reset();

                if (data.user && (data.user.role === "teacher" || data.user.role === "admin")) {
                    openModal("modal-admin-dashboard");
                } else {
                    openModal("modal-student-dashboard");
                }
            } else {
                alert("Login failed: " + (data.message || "Invalid credentials"));
            }
        })
        .catch(function(err) {
            console.error(err);
            alert("Network Error: Backend unreachable.");
        });
    }
});
