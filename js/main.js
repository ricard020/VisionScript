// OCR App Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('VisionScript Initialized');

    // DOM Elements
    const themeToggle = document.getElementById('themeToggle');
    const infoButton = document.getElementById('infoButton');
    const infoModal = document.getElementById('infoModal');
    const closeModal = document.getElementById('closeModal');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const dropZone = document.getElementById('dropZone');
    const emptyState = document.getElementById('emptyState');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const waitingText = document.getElementById('waitingText');
    const extractedText = document.getElementById('extractedText');
    const editableText = document.getElementById('editableText');
    const copyBtn = document.getElementById('copyBtn');
    const copyIcon = document.getElementById('copyIcon');
    const downloadBtn = document.getElementById('downloadBtn');
    const editBtn = document.getElementById('editBtn');
    const clearBtn = document.getElementById('clearBtn');

    let currentImage = null;
    let currentScale = 1;
    let extractedTextContent = '';
    let isEditing = false;

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }

    // Info Modal
    infoButton.addEventListener('click', () => {
        infoModal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        infoModal.classList.add('hidden');
    });

    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.add('hidden');
        }
    });

    // Browse Files
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showError('Por favor selecciona un archivo de imagen válido (JPG, PNG, etc.)');
                fileInput.value = '';
                return;
            }
            loadImage(file);
        }
    });

    // Paste from Clipboard
    pasteBtn.addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        loadImage(blob);
                        return;
                    }
                }
            }
            showError('No se encontró ninguna imagen en el portapapeles');
        } catch (err) {
            console.error('Error al pegar desde el portapapeles:', err);
            showError('No se pudo acceder al portapapeles. Intenta usar Ctrl+V');
        }
    });

    // Ctrl+V Keyboard Shortcut
    document.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                loadImage(blob);
                return;
            }
        }
    });

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-primary/10');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary/10');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-primary/10');

        const file = e.dataTransfer.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showError('Por favor arrastra un archivo de imagen válido (JPG, PNG, etc.)');
                return;
            }
            loadImage(file);
        }
    });

    // Clear All
    clearBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar todo?')) {
            resetApp();
        }
    });


    // Edit Text
    editBtn.addEventListener('click', () => {
        if (!extractedTextContent) {
            showError('No hay texto para editar');
            return;
        }

        isEditing = !isEditing;

        if (isEditing) {
            // Switch to edit mode
            extractedText.classList.add('hidden');
            editableText.classList.remove('hidden');
            editableText.value = extractedTextContent;
            editableText.focus();
            editBtn.querySelector('.material-symbols-outlined').textContent = 'save';
        } else {
            // Save and switch back to read mode
            extractedTextContent = editableText.value;
            extractedText.textContent = extractedTextContent;
            extractedText.classList.remove('hidden');
            editableText.classList.add('hidden');
            editBtn.querySelector('.material-symbols-outlined').textContent = 'edit';
        }
    });

    // Load Image
    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImage = e.target.result;

            // Reset Zoom
            currentScale = 1;
            // Apply default "Fit Width" styles to allow scrolling for tall images
            previewImg.style.width = '100%';
            previewImg.style.height = 'auto'; // Allow height to expand
            previewImg.style.maxWidth = 'none'; // Ensure no conflicting max-width
            previewImg.style.maxHeight = 'none'; // Remove height restriction
            previewImg.style.objectFit = 'contain';

            previewImg.src = currentImage;

            // Show preview, hide empty state
            emptyState.classList.add('hidden');
            imagePreview.classList.remove('hidden');

            // Remove dashed border and pointer cursor
            dropZone.classList.remove('cursor-pointer', 'border-2', 'border-dashed', 'border-primary/30', 'hover:border-primary', 'hover:bg-primary/5');

            // Start OCR
            performOCR(currentImage);
        };
        reader.readAsDataURL(file);
    }

    // Perform OCR
    async function performOCR(imageSrc) {
        try {
            // Reset UI
            waitingText.classList.add('hidden');
            extractedText.classList.add('hidden');
            editableText.classList.add('hidden');
            extractedText.textContent = '';
            isEditing = false;
            editBtn.querySelector('.material-symbols-outlined').textContent = 'edit';
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressText.textContent = 'Inicializando... 0%';

            const worker = await Tesseract.createWorker('spa', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        progressBar.style.width = `${progress}%`;
                        progressText.textContent = `Procesando... ${progress}%`;
                    }
                }
            });

            const { data: { text } } = await worker.recognize(imageSrc);
            await worker.terminate();

            // Display results
            // Display results
            const trimmedText = text.trim();
            extractedTextContent = trimmedText;
            extractedText.textContent = trimmedText;
            extractedText.classList.remove('hidden');
            progressContainer.classList.add('hidden');

            // Update line numbers
            // Disable updateLineNumbers call
            // updateLineNumbers(text);

        } catch (error) {
            console.error('Error en OCR:', error);
            progressContainer.classList.add('hidden');
            waitingText.classList.remove('hidden');
            waitingText.textContent = 'Error al procesar la imagen. Intenta de nuevo.';
        }
    }

    // Update Line Numbers
    // Line Numbers Removed
    /*
    function updateLineNumbers(text) {
        // ... removed
    } 
    */

    // Copy to Clipboard
    // Copy to Clipboard
    copyBtn.addEventListener('click', async () => {
        const textToCopy = isEditing ? editableText.value : extractedTextContent;

        if (!textToCopy) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy);
                showSuccessCopy();
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback:', err);
            // Fallback for mobile/insecure contexts
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;

            // Ensure it's not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    showSuccessCopy();
                } else {
                    showError('No se pudo copiar el texto');
                }
            } catch (fallbackErr) {
                document.body.removeChild(textArea);
                console.error('Fallback copy failed:', fallbackErr);
                showError('No se pudo copiar al portapapeles');
            }
        }
    });

    function showSuccessCopy() {
        // Visual feedback - change icon to check
        const originalIcon = copyIcon.textContent;
        copyIcon.textContent = 'check';
        setTimeout(() => {
            copyIcon.textContent = originalIcon;
        }, 2000);
    }

    // Download as TXT
    downloadBtn.addEventListener('click', () => {
        const textToDownload = isEditing ? editableText.value : extractedTextContent;

        if (!textToDownload) {
            showError('No hay texto para descargar');
            return;
        }

        const blob = new Blob([textToDownload], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visionscript-result-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Reset App
    function resetApp() {
        currentImage = null;
        currentScale = 1;
        extractedTextContent = '';
        isEditing = false;

        // Reset UI
        emptyState.classList.remove('hidden');
        imagePreview.classList.add('hidden');

        // Restore dashed border and pointer cursor
        dropZone.classList.add('cursor-pointer', 'border-2', 'border-dashed', 'border-primary/30', 'hover:border-primary', 'hover:bg-primary/5');
        previewImg.src = '';
        waitingText.classList.remove('hidden');
        waitingText.textContent = 'Esperando entrada...';
        extractedText.classList.add('hidden');
        editableText.classList.add('hidden');
        extractedText.textContent = '';
        editableText.value = '';
        progressContainer.classList.add('hidden');
        editBtn.querySelector('.material-symbols-outlined').textContent = 'edit';
        fileInput.value = '';

        /*
        // Reset line numbers - removed
        const lineNumbers = document.getElementById('lineNumbers');
        lineNumbers.innerHTML = '';
        */
    }

    // Show Error Message
    function showError(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined">error</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
});
