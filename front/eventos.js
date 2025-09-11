document.addEventListener("DOMContentLoaded", () => {
    // --- Referencias a elementos del DOM ---
    const video = document.getElementById('video-stream');
    const canvas = document.getElementById('canvas');
    const processedImage = document.getElementById('processed-image');
    const salirButton = document.getElementById('salir');
    const loginUrl = "ingreso.html";
    const statusText = document.getElementById('status-text');
    const loader = document.getElementById('loader');

    // Flag para evitar múltiples peticiones simultáneas
    let isProcessing = false;

 
    // --- Función para escanear y enviar al servidor ---
    async function escanear() {
        if (isProcessing) return;
        isProcessing = true;

        if (loader) loader.classList.remove('hidden');
        if (statusText) statusText.textContent = "Escaneando...";

        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("file", blob, "captured-image.jpg");

            try {
                const response = await fetch("http://127.0.0.1:8000/process_image", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) throw new Error("Error en la respuesta del servidor");

                const data = await response.json();
                const resultFilename = data.result_filename;

                processedImage.src = `http://127.0.0.1:8000/result/${resultFilename}?t=${new Date().getTime()}`;
  
                if (statusText) statusText.textContent = "Escaneo completo.";
            } catch (error) {
                console.error("Error al procesar la imagen:", error);
                const errorPlaceholderUrl = `https://placehold.co/600x400/dc2626/ffffff?text=Error...`;
                if (processedImage) processedImage.src = errorPlaceholderUrl;
                if (statusText) statusText.textContent = "Error de conexión";
            } finally {
                if (loader) loader.classList.add('hidden');
                isProcessing = false;
            }
        }, 'image/jpeg');
    }

    // --- Inicializar cámara y escaneo en tiempo real ---
    if (video) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                setInterval(escanear, 1500); // Escanear cada 1.5 segundos
            })
            .catch(err => {
                console.error("Error al acceder a la cámara:", err);
                if (statusText) {
                    statusText.textContent = "Error: No se pudo acceder a la cámara.";
                    statusText.classList.add('text-red-500');
                }
            });
    }

    // --- Botón salir ---
    if (salirButton) {
        salirButton.addEventListener("click", () => {
            const stream = video.srcObject;
            if (stream) {
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            }
            window.location.href = loginUrl;
        });
    }

    // --- Función para registrar usuario ---
    async function registrarUsuario(form, mensaje) {
        const formData = new FormData(form);
        const usuario = {
            nombre: formData.get("nombre"),
            email: formData.get("email"), // 👈 usa "email" consistente con Pydantic
            password: formData.get("password"),
            edad: parseInt(formData.get("edad"))
        };

        try {
            const response = await fetch("http://127.0.0.1:8000/usuarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(usuario)
            });

            if (response.ok) {
                const data = await response.json();
                mensaje.textContent = `Usuario ${data.nombre} registrado con éxito!`;
                mensaje.style.color = "green";
                form.reset();
            } else {
                const error = await response.json();
                mensaje.textContent = `Error: ${error.detail}`;
                mensaje.style.color = "red";
            }
        } catch (err) {
            console.error("Error al conectar con el servidor:", err);
            mensaje.textContent = "No se pudo conectar al servidor.";
            mensaje.style.color = "red";
        }
    }

    // --- Función para login de usuario ---
    async function loginUsuario(form, mensaje) {
        const formData = new FormData(form);
        const loginData = {
            username: formData.get("username"),
            password: formData.get("password")
        };

        try {
            const response = await fetch("http://127.0.0.1:8000/ingreso", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();
            console.log("Respuesta de FastAPI:", data);

            if (response.ok) {
                window.location.href = "principal.html";
            } else {
                mensaje.textContent = data.detail || "Usuario no encontrado";
            }
        } catch (err) {
            console.error("Error de conexión:", err);
            mensaje.textContent = "No se pudo conectar con el servidor";
        }
    }

    // --- Eventos de formularios ---
    const registroForm = document.getElementById("registroForm");
    const registroMensaje = document.getElementById("mensaje");
    if (registroForm) {
        registroForm.addEventListener("submit", (e) => {
            e.preventDefault();
            registrarUsuario(registroForm, registroMensaje);
        });
    }

    const loginForm = document.getElementById("loginForm");
    const loginMensaje = document.getElementById("loginMensaje");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            loginUsuario(loginForm, loginMensaje);
        });
    }
});

