async function startScanner() {
    let html5QrCode = null;
    // 1. Check if it's already running
    if (html5QrCode && html5QrCode.isScanning) return;

    // 2. Ensure DOM is ready (Small delay to prevent race conditions)
    await new Promise(resolve => setTimeout(resolve, 100));

    html5QrCode = new Html5Qrcode("reader");

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 5, qrbox: 250 },
            (decodedText) => {
                handleBarcodeScan(decodedText);
            },
            (errorMessage) => { /* Ignore */ }
        );
    } catch (err) {
        console.error("Camera abort error:", err);
        // Only alert if it's a real failure, not an abort
        if (err.name !== 'AbortError') {
             alert("Camera access was interrupted or denied.");
        }
    }
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById("reader").innerText = "Camera Inactive";
        }).catch(err => console.error("Stop failed:", err));
    }
}