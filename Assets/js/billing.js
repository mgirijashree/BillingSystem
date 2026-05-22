//Global variables
let inventory = [];
let customers = [];
let cart = [];
let currentCustomer = { name: "Walk-In Customer", number: "N/A" };
let discount = 0;
let gst = 0;
let total = 0;
let prevLoyaltyPoints = 0;
let earnedPoints = 0;
let transactionID = "N/A";
let html5QrCode;

//============Load data============
async function loadData() {

    const savedInventory =
        localStorage.getItem('inventory');

    if (savedInventory) {

        inventory =
            JSON.parse(savedInventory);

    } else {

        const response =
            await fetch('./grocerylist.json');

        inventory =
            await response.json();

        localStorage.setItem(
            'inventory',
            JSON.stringify(inventory)
        );

    }

}


//==============FilterTable=========
document.getElementById('searchInput').addEventListener('input', filterTable);
document.getElementById('categoryFilter').addEventListener('change', filterTable);

function filterTable() {

    const searchTerm =
        document.getElementById('searchInput')
            .value
            .toLowerCase();

    const filtered =
        inventory.filter(product =>

            product.name
                .toLowerCase()
                .includes(searchTerm)

        );

    renderTable(filtered);
}

//===============Populate Filters========
function populateFilters() {

    const categorySelect =
        document.getElementById('categoryFilter');

    categorySelect.innerHTML =
        `<option value="">All Category</option>`;

    const categories = [
        ...new Set(
            inventory.map(
                item => item.category
            )
        )
    ];

    categories.forEach(category => {

        const option =
            document.createElement('option');

        option.value = category;

        option.textContent = category;

        categorySelect.appendChild(option);

    });

}
document.getElementById('stockFilter')
    .addEventListener('change', applyFilters);


function applyFilters() {

    const searchTerm =
        document.getElementById('searchInput')
            .value
            .toLowerCase();

    const categoryFilter =
        document.getElementById('categoryFilter')
            .value;

    const stockFilter =
        document.getElementById('stockFilter')
            .value;

    const filtered = inventory.filter(product => {

        const matchesSearch =
            product.name
                .toLowerCase()
                .includes(searchTerm);

        const matchesCategory =
            categoryFilter === "" ||
            product.category === categoryFilter;

        let matchesStock = true;

        if (stockFilter === "in-stock") {

            matchesStock = product.stock > 0;
        }

        if (stockFilter === "out-of-stock") {

            matchesStock = product.stock === 0;
        }

        return (
            matchesSearch &&
            matchesCategory &&
            matchesStock
        );

    });

    renderTable(filtered);
}



//===============Render Table=========

function renderTable(data) {
    const tbody = document.querySelector("#billingTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // 1. Flatten the data and attach category_name to each product
    let allProducts = [];
    
    // Check if data is the nested category structure
    if (data.length > 0 && data[0].products) {
        data.forEach(cat => {
            // Map products and inject the category name into each one
            const productsWithCategory = cat.products.map(p => ({
                ...p, 
                category_name: cat.category_name // Attaching the parent name
            }));
            allProducts.push(...productsWithCategory);
        });
    } else {
        allProducts = data;
    }

    // 2. Render
    allProducts.forEach(product => {
        const row = `
            <tr class="border-b">
                <td class="p-3">${product.name}</td>
                <td class="p-3">${product.category_name || "N/A"}</td>
                <td class="p-3">${product.stock}</td>
                <td class="p-3">₹${product.price}</td>
                <td class="p-3">
                    <input type="number" id="qty-input-${product.barcode}" 
                           value="0" min="0" readonly class="w-16 p-1 border rounded-lg text-center">
                </td>
                <td class="p-3 flex gap-2">
                    <button onclick="updateCart('${product.barcode}', 1)" class="bg-green-600 text-white px-3 py-1 rounded">+</button>
                    <button onclick="updateCart('${product.barcode}', -1)" class="bg-red-600 text-white px-3 py-1 rounded">-</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}


//============================CART Section============================


function updateCart(barcode, change) {
    // 1. Clean the barcode the same way as the scanner
    const cleanBarcode = String(barcode).replace(/\D/g, '').trim();
    
    // 2. Search nested structure
    let selectedProduct = null;
    for (const category of inventory) {
        const found = category.products.find(p => 
            String(p.barcode).replace(/\D/g, '').trim() === cleanBarcode
        );
        if (found) {
            selectedProduct = found;
            break;
        }
    }

    if (!selectedProduct) {
        showInlineError("Product not found in system");
        return;
    }

    // 3. Find existing item in cart
    let cartItem = cart.find(item => String(item.barcode).replace(/\D/g, '').trim() === cleanBarcode);

    // 4. Cart Logic
    if (change === 1) {
        if (selectedProduct.stock <= 0) {
            showInlineError(`${selectedProduct.name} is out of stock`);
            return;
        }
        
        if (!cartItem) {
            cart.push({ ...selectedProduct, purchaseQuantity: 1 });
            // Alert user success
            console.log("Added to cart:", selectedProduct.name);
        } else {
            if (cartItem.purchaseQuantity >= selectedProduct.stock) {
                showInlineError(`Only ${selectedProduct.stock} available`);
                return;
            }
            cartItem.purchaseQuantity += 1;
        }
    } 
    // ... (rest of your existing logic for -1)

    updateTotals();
    renderCartList();
}

//============CARt reset===========
function resetCart() {
    if (!confirm("Are you sure you want to clear the entire cart?")) return;

    cart = [];
    document.querySelectorAll('input[id^="qty-input-"]').forEach(input => input.value = 0);
    renderCartList();
    updateTotals();
}


function updateTotals() {
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price * item.purchaseQuantity);
    const gst = subtotal * 0.05;
    const total = subtotal + gst;

    // Update Sidebar
    document.getElementById('popupSubtotal').innerText = subtotal.toFixed(2);
    document.getElementById('popupGST').innerText = gst.toFixed(2);
    document.getElementById('popupTotal').innerText = total.toFixed(2);

    // Update Modal Total Display
    const modalTotal = document.getElementById('modalTotal');
    if (modalTotal) {
        modalTotal.innerText = total.toFixed(2);
    }
}


//===============Load Customers======
async function loadCustomers() {
    try {
        const response = await fetch('./customers.json');
        if (!response.ok) throw new Error("Could not load customers");

        customers = await response.json();
        console.log("Customers Loaded:", customers);
    } catch (error) {
        console.error("Error loading customers:", error);
    }
}


function renderCartList() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;

    cartContainer.innerHTML = ""; // Clear current list

    cart.forEach(item => {
        const itemTotal = (item.price * item.purchaseQuantity).toFixed(2);
        const itemRow = `
            <div class="border border-gray-200 rounded-2xl p-4 mb-3 bg-white">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-bold">${item.name}</h3>
                        <p class="text-xs text-gray-500">₹${item.price} x ${item.purchaseQuantity}</p>
                    </div>
                    <p class="font-bold text-blue-600">₹${itemTotal}</p>
                </div>
            </div>
        `;
        cartContainer.insertAdjacentHTML('beforeend', itemRow);
    });
}




// Helper to convert string to element
function createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}





function proceedToCheckout() {
    // Save to storage
    const invoiceData = {
        date: new Date().toISOString(),
        items: cart,
        total: document.getElementById('modalTotal').innerText
    };
    localStorage.setItem('lastInvoice', JSON.stringify(invoiceData));

    // Show Success Modal
    document.getElementById('invoice-modal').classList.add('hidden');
    document.getElementById('paymentModal').classList.add('hidden'); // Close if open
    document.getElementById('successModal').classList.remove('hidden');
}


//===================BArcode Generator=====================
function generateBarcodeImage(barcodeValue) {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeValue, { format: "CODE128" });
    const link = document.createElement('a');
    link.download = `barcode-${barcodeValue}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

//==================Open Pop up===========================
function openInvoicePopup() {
    if (cart.length === 0) return showInlineError("Cart is empty!");

    // 1. Recalculate totals first
    updateTotals();

    // 2. Get the calculated total from your sidebar (which is updated by updateTotals)
    const currentTotal = document.getElementById('popupTotal').innerText;

    // 3. Set that value to your modal's total display
    const modalTotalSpan = document.getElementById('modalTotal');
    if (modalTotalSpan) {
        modalTotalSpan.innerText = currentTotal;
    }

    // 4. Show the modal
    document.getElementById('invoice-modal').classList.remove('hidden');
}

//============Fetch Customer========
function fetchCustomer() {
    const mobileInput = document.getElementById('modalMobileInput').value.trim();
    const errorDiv = document.getElementById('modal-error');
    const infoDiv = document.getElementById('modal-customer-info');

    // 1. Reset states
    errorDiv.classList.add('hidden');
    infoDiv.classList.add('hidden');

    // 2. Validate empty input
    if (mobileInput === "") {
        errorDiv.innerText = "Please enter a mobile number";
        errorDiv.classList.remove('hidden');
        return;
    }

    // 3. Search customer
    const customer = customers.find(c => c.mobile === mobileInput);

    if (customer) {
        infoDiv.classList.remove('hidden');
        document.getElementById('modalCustomerName').innerText = customer.name;
    } else {
        // 4. Handle "Not Found"
        errorDiv.innerText = "Customer details not found";
        errorDiv.classList.remove('hidden');
    }
}

function setWalkInCustomer() {
    document.getElementById('modalMobileInput').value = '';
    document.getElementById('modal-error').classList.add('hidden');
    
    const infoDiv = document.getElementById('modal-customer-info');
    const nameDisplay = document.getElementById('modalCustomerName');
    
    // Explicitly set the text
    nameDisplay.innerText = "Walk-In Customer"; 
    infoDiv.classList.remove('hidden'); 
}



//============Payment Methods=======
let selectedPaymentMethod = "";
// Payment Logic
function selectPayment(method) {
    selectedPaymentMethod = method;
    const total = parseFloat(document.getElementById('modalTotal').innerText) || 0;
    const container = document.getElementById('payment-extra-fields');

    container.innerHTML = ""; // Clear existing fields

    if (method === 'cash') {
        container.innerHTML = `
            <div class="space-y-3">
                <label class="block text-sm font-medium">Cash Given</label>
                <input type="number" id="cashInput" placeholder="Enter amount" class="w-full border rounded-xl p-3" oninput="calculateChange()">
                <p class="text-lg font-bold">Change: <span id="changeDisplay" class="text-gray-700">₹0.00</span></p>
            </div>
        `;
    } else if (method === 'cash-card') {
        // THIS IS WHERE YOUR REQUESTED CODE GOES
        container.innerHTML = `
            <div class="space-y-3">
                <label class="block text-sm font-medium">Cash Amount</label>
                <input type="number" id="cashPart" placeholder="Enter cash amount" 
                       class="w-full border rounded-xl p-3" 
                       oninput="calculateCardBalance(${total})">
                
                <p class="text-lg font-bold">
                    Status: <span id="cardDisplay" class="text-gray-700">₹0.00</span>
                </p>
            </div>
        `;
    }
}

function calculateChange() {
    // 1. Get elements
    const total = parseFloat(document.getElementById('modalTotal').innerText) || 0;
    const cashInput = document.getElementById('cashInput');
    const cash = parseFloat(cashInput.value) || 0;
    const changeDisplay = document.getElementById('changeDisplay');

    // 2. Logic: Compare cash and total
    if (cash < total) {
        // Show error state
        changeDisplay.innerText = "Cash insufficient";
        changeDisplay.classList.add('text-red-600'); // Optional: make text red
        changeDisplay.classList.remove('text-green-600');
    } else {
        // Calculate and show change
        const change = cash - total;
        changeDisplay.innerText = '₹' + change.toFixed(2);
        changeDisplay.classList.remove('text-red-600');
        changeDisplay.classList.add('text-green-600'); // Optional: make text green
    }
}

function calculateCardBalance(total) {
    const cashInput = document.getElementById('cashPart');
    const cash = parseFloat(cashInput.value) || 0;
    const cardDisplay = document.getElementById('cardDisplay');

    if (cash >= total) {
        // Cash covers the total, no card payment needed
        cardDisplay.innerText = "No Card needed.";
        cardDisplay.classList.add('text-green-600');
        cardDisplay.classList.remove('text-red-600');
    } else {
        // Calculate remaining balance to be paid by card
        const cardRemaining = total - cash;
        cardDisplay.innerText = "Pay by card: ₹" + cardRemaining.toFixed(2);
        cardDisplay.classList.remove('text-green-600');
        cardDisplay.classList.add('text-red-600');
    }
}


//===================Validate Payment===================

function validatePayment() {
   // 1. Capture Data from UI
    const nameSpan = document.getElementById('modalCustomerName').innerText;
    currentCustomer.name = nameSpan || "Walk-In Customer";
    currentCustomer.number = document.getElementById('modalMobileInput')?.value || "N/A";
    
    // 2. Capture Totals (ensure these are available)
    total = parseFloat(document.getElementById('modalTotal').innerText) || 0;
    gst = parseFloat(document.getElementById('popupGST').innerText) || 0;
    
    
    // PAYMENT METHOD REQUIRED
    if (!selectedPaymentMethod) {
        showInlineError("Select payment method");
        return;
    }

    // CASH VALIDATION
    if (selectedPaymentMethod === "cash") {
        const cash = parseFloat(document.getElementById('cashInput').value) || 0;
        if (cash < total) {
            showInlineError("Insufficient cash amount");
            return;
        }
    }

    // CASH + CARD VALIDATION
    if (selectedPaymentMethod === "cash-card") {
        const cash = parseFloat(document.getElementById('cashPart').value) || 0;
        if (cash >= total) {
            showInlineError("Cash equals/exceeds total, use Cash method instead.");
            return;
        }
    }

    // IF ALL VALIDATIONS PASS:
    finalizeTransaction();
}



function finalizeTransaction() {
// 1. Calculate totals
    const total = parseFloat(document.getElementById('modalTotal').innerText) || 0;
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.purchaseQuantity), 0);
    const gst = subtotal * 0.05;

    // 2. Calculate Loyalty Points (10 points per ₹1000)
    const earnedPoints = Math.floor(total / 1000) * 10;
    
    // 3. Update Customer Record in Global Array
    if (currentCustomer.number !== "N/A") {
        const customerRecord = customers.find(c => c.mobile === currentCustomer.number);
        if (customerRecord) {
            customerRecord.loyaltyPoints = (customerRecord.loyaltyPoints || 0) + earnedPoints;
            localStorage.setItem('customers', JSON.stringify(customers));
        }
    }

    // 1. Setup metadata
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString();
    const invoiceNumber = "INV-" + Date.now(); // Your unique Bill Number

    // 2. Prepare the transaction object with all required fields
    // We map over cart items to ensure every line item has its specific details
    const transaction = {
        invoiceNumber: invoiceNumber,
        barcodeIdentifier: `INV-${dateStr}-${invoiceNumber}`,
        date: dateStr,
        time: timeStr,
        cashierName: document.getElementById('cashierName')?.value || "Shree",
        customerName: currentCustomer.name, // Ensure these variables exist in your scope
        customerNumber: currentCustomer.number || "N/A",
        
        // Flattened Item Details
        items: cart.map(item => ({
            productId: item.sku || item.id,
            productName: item.name,
            barcode: item.barcode,
            category: item.category || "General",
            quantity: item.purchaseQuantity,
            unitPrice: item.price,
            subtotal: item.price * item.purchaseQuantity
        })),
        
        
        // Transaction Financials
        disc: discount || 0,
        gst: gst || 0,
        total: total,
        paymentMethod: selectedPaymentMethod,
        txnDetails: transactionID || "N/A", // If you have a specific reference ID
        paymentStatus: "Success",
        
        // Loyalty
        loyaltyPointsAvailable: prevLoyaltyPoints || 0,
        loyaltyPointsEarned: earnedPoints || 0
    };

    // 3. Save to Invoices
    let invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    invoices.push(transaction);
    localStorage.setItem('invoices', JSON.stringify(invoices));

    // 4. Deduct from Inventory (Atomic Update)
    cart.forEach(cartItem => {
        let invItem = inventory.find(i => i.barcode === cartItem.barcode);
        if (invItem) {
            invItem.stock = Math.max(0, invItem.stock - cartItem.purchaseQuantity);
        }
    });
    localStorage.setItem('inventory', JSON.stringify(inventory));

    // 5. Cleanup and UI
    renderTable(inventory);
    cart = [];
    renderCartList();
    updateTotals();
    
    document.querySelectorAll('input[id^="qty-input-"]').forEach(input => input.value = 0);
    document.getElementById('invoice-modal').classList.add('hidden');
    document.getElementById('successModal').classList.remove('hidden');
    
    console.log("Full Transaction Data Saved:", transaction);
}



//==================Pdf Invoice=======
function printInvoice() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [80, 200] });

    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const data = invoices[invoices.length - 1]; 

    if (!data) return;

    doc.setFont("courier");
    doc.setFontSize(10);

    let y = 10;
    const line = "------------------------------------------";

    // Header
    doc.text("HAPPY STORE", 40, y, { align: "center" });
    y += 5;
    doc.text(line, 40, y, { align: "center" });
    y += 5;

    // Details
    doc.text(`Invoice No : ${data.invoiceNumber}`, 5, y);
    y += 5;
    doc.text(`Date       : ${data.date}`, 5, y);
    y += 5;
    doc.text(`Customer   : ${data.customerName}`, 5, y);
    y += 5;
    doc.text(line, 40, y, { align: "center" });
    y += 5;

    // Items Header
    doc.text("Item           Qty   Price    Total", 5, y);
    y += 4;
    
    // Items List
    data.items.forEach(item => {
        const name = item.productName.padEnd(12).substring(0, 12);
        const qty = item.quantity.toString().padEnd(6);
        const price = item.unitPrice.toString().padEnd(9);
        const total = (item.unitPrice * item.quantity).toFixed(0);
        
        doc.text(`${name} ${qty} ${price} ${total}`, 5, y);
        y += 5;
    });

    doc.text(line, 40, y, { align: "center" });
    y += 5;

    // Financials
// Calculate subtotal directly from the items array
const subtotal = data.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

// Use the values stored in the transaction data object
doc.text(`Subtotal  : ₹${subtotal.toFixed(2)}`, 5, y);
y += 5;
doc.text(`GST (5%)  : ₹${data.gst.toFixed(2)}`, 5, y);
y += 5;
doc.text(`GrandTotal:₹${data.total.toFixed(2)}`, 5, y);
y += 5;

    // Loyalty Points
    if (data.loyaltyPointsEarned > 0) {
        doc.text(`Points Earned : ${data.loyaltyPointsEarned}`, 5, y);
        y += 5;
    }
    
    doc.text(line, 40, y, { align: "center" });
    y += 5;
    doc.text(`Payment : ${data.paymentMethod}`, 5, y);
    y += 5;
    doc.text(`Status  : ${data.paymentStatus}`, 5, y);
    y += 5;
    doc.text(line, 40, y, { align: "center" });
    y += 5;

    // Barcode at bottom
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, data.invoiceNumber, { format: "CODE128", width: 2, height: 40, fontSize: 12 });
    doc.addImage(barcodeCanvas.toDataURL("image/png"), 'PNG', 10, y, 60, 20);
    y += 25;

    doc.text("Thank You Visit Again", 40, y, { align: "center" });

    doc.save(`Invoice_${data.invoiceNumber}.pdf`);
}
//==================ClosePopup========
function closeSuccessPopup() {
    document.getElementById('successModal').classList.add('hidden');
    location.reload(); // Reset bill
}

//==========ErrorLogic===========
function showInlineError(message) {
    const modal = document.getElementById('invoice-modal');
    const modalError = document.getElementById('modal-error-container');
    const cartError = document.getElementById('cart-error-container');

    // Check if the invoice modal is actually visible
    const isModalOpen = modal && !modal.classList.contains('hidden');

    // If modal is open, use modal error container; otherwise use cart container
    const target = (isModalOpen && modalError) ? modalError : cartError;

    if (target) {
        target.innerText = message;
        target.classList.remove('hidden');

        // Hide after 3 seconds
        setTimeout(() => {
            target.classList.add('hidden');
        }, 3000);
    } else {
        alert(message);
    }
}





function handleBarcodeScan(decodedText) {
    alert("Product added to cart");
    const scannedBarcode = String(decodedText).replace(/\D/g, '').trim();
    console.log("Cleaned barcode:", scannedBarcode);
    
    let foundProduct = null;

    for (const category of inventory) {
        const product = category.products.find(p => {
            const dbBarcode = String(p.barcode).replace(/\D/g, '').trim();
            return dbBarcode === scannedBarcode;
        });
        if (product) {
            foundProduct = product;
            break;
        }
    }
    
    if (foundProduct) {
        console.log("Found match:", foundProduct.name);
        updateCart(foundProduct.barcode, 1);
        stopScanner();
    } else {
        console.error("No product found matching:", scannedBarcode);
        showInlineError("Product not found: " + scannedBarcode);
        stopScanner();
    }
}

















//============Inititialize==========
async function init() {
    await loadData();
    await loadCustomers();
    populateFilters();
    renderTable(inventory || []);
}

init();
