let html5QrCode;

function startScanner() {

    const reader = document.getElementById("reader");

    reader.innerHTML = `
        <div class="bg-black rounded-xl overflow-hidden p-2">
            <div id="scanner-container"></div>
        </div>
    `;

    html5QrCode = new Html5Qrcode("scanner-container");

    const config = {
        fps: 10,
        qrbox: {
            width: 250,
            height: 120
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };

    Html5Qrcode.getCameras()
        .then(devices => {

            if (devices && devices.length) {

                const cameraId = devices[0].id;

                html5QrCode.start(
                    cameraId,
                    config,
                    onScanSuccess,
                    onScanFailure
                );
            }
        })
        .catch(err => {
            console.error("Camera Error:", err);

            alert(
                "Camera access denied OR HTTPS not enabled."
            );
        });
}

function onScanSuccess(decodedText) {

    console.log("Scanned:", decodedText);

    addProductByBarcode(decodedText);

    stopScanner();
}

function onScanFailure(error) {

    // Silent fail
}

function stopScanner() {

    if (html5QrCode) {

        html5QrCode.stop()
            .then(() => {

                document.getElementById("reader").innerHTML = "";

            })
            .catch(err => console.error(err));
    }
}

function addProductByBarcode(code) {

    let found = false;

    inventoryData.forEach(category => {

        category.products.forEach(product => {

            if (product.barcode === code) {

                addToCart(product);

                found = true;
            }
        });
    });

    if (!found) {

        alert("Product not found");
    }
}