/**
 * Inventory Management System
 */

// Global variable to store fetched inventory
let inventoryData = [];

// DOM Element Selectors
const tableBody = document.getElementById('inventory-body');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const totalVal = document.getElementById('total-val');
const lowVal = document.getElementById('low-val');
const expiryVal = document.getElementById('expiry-val');

/**
 * 1. Initialize Dashboard
 */
async function init() {
    try {
        const savedData = localStorage.getItem('myInventory');
        
        if (savedData && savedData !== "[]") {
            inventoryData = JSON.parse(savedData);
        } else {
            const response = await fetch('./grocerylist.json');
            if (!response.ok) throw new Error("Could not find grocerylist.json");
            inventoryData = await response.json();
            localStorage.setItem('myInventory', JSON.stringify(inventoryData));
        }
        
        // Initial Render
        renderTable(inventoryData);
        populateDropdown(inventoryData);
        updateSummary(inventoryData);
        setupEventListeners();
        setupModalValidation();
        setupCardListeners();
        
        
    } catch (error) {
        console.error("Initialization Error:", error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-10 text-red-500">Error: ${error.message}</td></tr>`;
        }
    }
}

/**
 * 2. Render Table Rows
 */
function renderTable(data) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    data.forEach(category => {
        category.products.forEach(product => {
            const row = document.createElement('tr');
            // Added dark:hover and dark:border variants
            row.className = "hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 transition-colors";
            
            row.setAttribute('data-category', category.category_name);
            row.setAttribute('data-name', product.name);

            const invoiceNo = generateInvoiceNumber(product.si_no);
            const badgeColor = product.stock < 20 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

            row.innerHTML = `
                <!-- SI. No -->
                <td class="px-2 py-4 font-medium text-gray-700 dark:text-white">${product.si_no}</td>
                
                <!-- Invoice -->
                <td class="px-2 py-4 font-mono text-xs text-blue-600 dark:text-blue-400">${invoiceNo}</td>
                
                <!-- Barcode -->
                <td class="px-2 py-4 font-medium text-gray-700 dark:text-white">${product.si_no}</td>
    
    <td class="px-2 py-4 font-mono text-xs text-blue-600 dark:text-blue-400">${invoiceNo}</td>
    
    <td class="px-2 py-4 dark:bg-white dark:rounded dark:my-2 dark:inline-block cursor-pointer" 
        onclick="showBarcodeModal('${product.barcode}')">
        <svg class="barcode" 
             jsbarcode-value="${product.barcode}"
             jsbarcode-width="1"
             jsbarcode-height="25"
             jsbarcode-fontsize="10">
        </svg>
    </td>
                
                <!-- Category -->
                <td class="px-2 py-4 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">${category.category_name}</td>
                
                <!-- Product Name -->
                <td class="px-2 py-4 font-semibold text-gray-900 dark:text-white">
                    <div class="line-clamp-2 max-w-[150px] whitespace-normal" title="${product.name}">
                        ${product.name}
                    </div>
                </td>
                
                <!-- Quantity & Unit -->
                <td class="px-3 py-4 text-gray-600 dark:text-gray-200">${product.quantity}</td>
                <td class="px-3 py-4 text-gray-600 dark:text-gray-200">${product.unit_type}</td>
                
                <!-- Price -->
                <td class="px-2 py-4 font-bold text-gray-800 dark:text-white">₹${product.price}</td>
                
                <!-- Stock Badge -->
                <td class="px-2 py-4">
                    <span class="${badgeColor} px-2 py-1 rounded-full text-[11px] font-bold">${product.stock}</span>
                </td>
                
                <!-- Dates & Storage -->
                <td class="px-2 py-4 text-xs text-gray-500 dark:text-gray-300">${product.mfg_date}</td>
                <td class="px-2 py-4 text-xs text-gray-400 dark:text-gray-400">Storage A</td>
                <td class="px-2 py-4 text-xs text-gray-500 dark:text-gray-300">${product.expiry_date}</td>
                
                <!-- Actions -->
                <td class="px-2 py-4 text-center">
                    <button onclick="openEditModal('${product.si_no}')" class="text-blue-500 dark:text-blue-400 mr-2"><i class="bi bi-pencil-square"></i></button>
                    <button onclick="deleteProduct('${product.si_no}')" class="text-red-500 dark:text-red-400"><i class="bi bi-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });

    if (typeof JsBarcode !== 'undefined') {
        JsBarcode(".barcode").init();
    }
}
/**
 * 3. Form Submission (Add & Update)
 */
document.getElementById('edit-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const siNo = document.getElementById('edit-si-no').value;
    const newCatName = document.getElementById('edit-category').value;
    const newName = document.getElementById('edit-name').value.trim();
    const newPrice = parseFloat(document.getElementById('edit-price').value);
    const newStock = parseInt(document.getElementById('edit-stock').value);
    const newQty = document.getElementById('edit-qty').value;
    const newUnit = document.getElementById('edit-unit').value;
    const newMfg = document.getElementById('edit-mfg').value;
    const newExpiry = document.getElementById('edit-expiry').value;

    // Validation Check
    if (!newName || isNaN(newPrice)) {
        alert("Please fill in all required fields.");
        return;
    }

    const productObj = {
        si_no: siNo,
        name: newName,
        price: newPrice,
        stock: newStock,
        unit_type: newUnit,
        quantity: newQty,
        mfg_date: newMfg,
        expiry_date: newExpiry
    };

    const isEdit = document.getElementById('modal-title').textContent.includes("Update");

    // 1. Remove item from current category to avoid duplicates
    inventoryData.forEach(cat => {
        cat.products = cat.products.filter(p => p.si_no !== siNo);
    });

    // 2. Add to target category
    const targetCat = inventoryData.find(cat => cat.category_name === newCatName);
    if (targetCat) {
        targetCat.products.push(productObj);
    } else {
        inventoryData.push({ category_name: newCatName, products: [productObj] });
    }

    // 3. Save and Refresh
    localStorage.setItem('myInventory', JSON.stringify(inventoryData));
    renderTable(inventoryData);
    updateSummary(inventoryData);
    closeModal();
    alert(`Product ${isEdit ? "updated" : "added"} successfully!`);
});

/**
 * 4. UI Helpers
 */
// Function to Open Add Modal
window.openAddModal = function() {
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('edit-form');
    const title = document.getElementById('modal-title');
    
    if (!modal) return;

    // Reset form and set title
    form.reset();
    if (title) title.textContent = "Add New Product";

    // Auto-generate Serial Number
    let productCount = 0;
    inventoryData.forEach(cat => productCount += cat.products.length);
    const nextSi = `HS${(productCount + 1).toString().padStart(3, '0')}`;

    // Fill hidden and display SI No
    document.getElementById('edit-si-no').value = nextSi;
    document.getElementById('display-si-no').value = nextSi;

    // Populate category dropdown in modal (if empty)
    const modalCatDropdown = document.getElementById('edit-category');
    modalCatDropdown.innerHTML = '';
    inventoryData.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category_name;
        opt.textContent = cat.category_name;
        modalCatDropdown.appendChild(opt);
    });

    modal.classList.remove('hidden');
};

// Function to Open Edit Modal
window.openEditModal = function(siNo) {
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('modal-title');
    if (!modal) return;

    let product = null;
    let categoryName = "";
    
    inventoryData.forEach(cat => {
        const found = cat.products.find(p => p.si_no === siNo);
        if (found) { 
            product = found; 
            categoryName = cat.category_name; 
        }
    });

    if (product) {
        if (title) title.textContent = "Update Product";
        
        // Fill Form Data
        document.getElementById('edit-si-no').value = product.si_no;
        document.getElementById('display-si-no').value = product.si_no;
        document.getElementById('edit-name').value = product.name;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-stock').value = product.stock;
        document.getElementById('edit-qty').value = product.quantity || "";
        document.getElementById('edit-unit').value = product.unit_type || "kg";
        document.getElementById('edit-mfg').value = product.mfg_date || "";
        document.getElementById('edit-expiry').value = product.expiry_date || "";

        // Set category dropdown to match current
        const modalCatDropdown = document.getElementById('edit-category');
        modalCatDropdown.innerHTML = '';
        inventoryData.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.category_name;
            opt.textContent = cat.category_name;
            if (cat.category_name === categoryName) opt.selected = true;
            modalCatDropdown.appendChild(opt);
        });

        modal.classList.remove('hidden');
    }
};

// Function to Close Modal
window.closeModal = function() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('hidden');
};

// Ensure deleteProduct is also global
window.deleteProduct = function(siNo) {
    if (confirm("Are you sure you want to delete this product?")) {
        inventoryData.forEach(cat => {
            cat.products = cat.products.filter(p => p.si_no !== siNo);
        });
        localStorage.setItem('myInventory', JSON.stringify(inventoryData));
        renderTable(inventoryData);
        updateSummary(inventoryData);
    }
};
function generateSerialNumber(count) {
    return `HS${(count + 1).toString().padStart(3, '0')}`;
}

function generateInvoiceNumber(siNo) {
    return `INV-${siNo.replace("HS", "")}`;
}

function populateDropdown(data) {
    if (!categoryFilter) return;
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_name;
        option.textContent = cat.category_name;
        categoryFilter.appendChild(option);
    });
}

function updateSummary(data) {
    let total = 0, low = 0, exp = 0;
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    data.forEach(cat => {
        total += cat.products.length;
        cat.products.forEach(p => {
            if (p.stock < 20) low++;
            const expDate = new Date(p.expiry_date);
            if (expDate >= today && expDate <= nextMonth) exp++;
        });
    });

    if (totalVal) totalVal.textContent = total;
    if (lowVal) lowVal.textContent = low;
    if (expiryVal) expiryVal.textContent = exp;
}

// Validation helper
function toggleError(id, show, msg) {
    const err = document.getElementById(`error-${id}`);
    if (err) {
        err.textContent = msg;
        show ? err.classList.remove('hidden') : err.classList.add('hidden');
    }
}

/**
 * 5. Real-Time Modal Validation
 */
function setupModalValidation() {
    const form = document.getElementById('edit-form');
    
    // Validation Rules Configuration
    const validate = {
        name: () => {
            const val = document.getElementById('edit-name').value.trim();
            toggleError('name', val === "", "Product name cannot be empty");
        },
        stock: () => {
            const val = parseInt(document.getElementById('edit-stock').value);
            toggleError('stock', isNaN(val) || val <= 0, "Stock must be greater than 0");
        },
        qty: () => {
            const val = parseFloat(document.getElementById('edit-qty').value);
            // Note: Since 'quantity' is a text input in your HTML, we parse it
            toggleError('qty', isNaN(val) || val <= 0, "Quantity must be greater than 0");
        },
        price: () => {
            const val = parseFloat(document.getElementById('edit-price').value);
            // Note: Since 'quantity' is a text input in your HTML, we parse it
            toggleError('price', isNaN(val) || val <= 0, "Price must be greater than 0");
        },
        mfg: () => {
            const mfgDate = new Date(document.getElementById('edit-mfg').value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
            toggleError('mfg', mfgDate > today, "MFG date cannot be in the future");
        },
        expiry: () => {
            const expDate = new Date(document.getElementById('edit-expiry').value);
            const today = new Date();
            const minExpiry = new Date();
            minExpiry.setDate(today.getDate() + 30); // 30 days from now
            
            toggleError('expiry', expDate < minExpiry, "Expiry must be at least 30 days from today");
        }
    };

    // Attach Listeners for "Immediate" feedback
    document.getElementById('edit-name').addEventListener('input', validate.name);
    document.getElementById('edit-stock').addEventListener('input', validate.stock);
    document.getElementById('edit-qty').addEventListener('input', validate.qty);
    document.getElementById('edit-price').addEventListener('change', validate.price);
    document.getElementById('edit-mfg').addEventListener('change', validate.mfg);
    document.getElementById('edit-expiry').addEventListener('change', validate.expiry);

    // Prevent Form Submission if any validation fails
    form.addEventListener('submit', (e) => {
        // Run all validations once more
        validate.name();
        validate.stock();
        validate.qty();
        validate.mfg();
        validate.expiry();

        const activeErrors = form.querySelectorAll('span[id^="error-"]:not(.hidden)');
        if (activeErrors.length > 0) {
            e.preventDefault();
            e.stopImmediatePropagation(); // Stops the actual save logic
            alert("Please fix the errors before saving.");
        }
    });
}

// Helper to show/hide error messages
function toggleError(id, isError, message) {
    const errorSpan = document.getElementById(`error-${id}`);
    if (errorSpan) {
        errorSpan.textContent = message;
        isError ? errorSpan.classList.remove('hidden') : errorSpan.classList.add('hidden');
        
        // Optional: Red border on input
        const input = document.getElementById(`edit-${id}`);
        if (input) {
            isError ? input.classList.add('border-red-500') : input.classList.remove('border-red-500');
        }
    }
}

function setupEventListeners() {
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilters);
    if (searchInput) searchInput.addEventListener('input', handleFilters);
}

function handleFilters() {
    const cat = categoryFilter.value.toLowerCase();
    const term = searchInput.value.toLowerCase().trim();
    const rows = Array.from(tableBody.querySelectorAll('tr:not(.no-results-row)'));
    let hasVisibleRows = false;

    rows.forEach(row => {
        const rowCat = (row.getAttribute('data-category') || "").toLowerCase();
        
        // Target specific cells for precise searching
        const cells = row.querySelectorAll('td');
        if (cells.length < 9) return; 

        const siNo = cells[0].innerText.toLowerCase();
        const productName = cells[4].innerText.toLowerCase();
        const price = cells[7].innerText.replace('₹', '').toLowerCase();
        const stock = cells[8].innerText.toLowerCase();

        // Check if category matches
        const matchCat = (cat === 'all' || rowCat === cat);
        
        // Check if search term matches Name, SI No, Price, or Stock
        const matchSearch = term === "" || 
                            productName.includes(term) || 
                            siNo.includes(term) || 
                            price.includes(term) || 
                            stock.includes(term);

        if (matchCat && matchSearch) {
            row.style.display = "";
            hasVisibleRows = true;
        } else {
            row.style.display = "none";
        }
    });

    // 2. Handle "No results found" display
    let noResultsRow = tableBody.querySelector('.no-results-row');
    
    if (!hasVisibleRows) {
        if (!noResultsRow) {
            noResultsRow = document.createElement('tr');
            noResultsRow.className = "no-results-row";
            noResultsRow.innerHTML = `
                <td colspan="13" class="text-center py-20 bg-gray-50">
                    <div class="flex flex-col items-center justify-center text-gray-400">
                        <i class="bi bi-search text-4xl mb-2"></i>
                        <p class="text-lg font-semibold">No results found</p>
                        <p class="text-sm">Try adjusting your search or filters</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(noResultsRow);
        }
    } else if (noResultsRow) {
        noResultsRow.remove();
    }
}


/**
 * Opens the Modal and Auto-Populates the ID
 *//**
 * Opens modal and refreshes the internal dropdown
 */
function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const deleteDropdown = document.getElementById('delete-cat-dropdown');
    const statusMsg = document.getElementById('cat-status-msg');
    
    statusMsg.classList.add('hidden');
    document.getElementById('new-cat-name').value = '';

    // Populate the internal delete dropdown
    deleteDropdown.innerHTML = '<option value="" disabled selected>Select category to remove</option>';
    inventoryData.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_name;
        option.textContent = `${cat.category_name} (${cat.products.length} items)`;
        deleteDropdown.appendChild(option);
    });

    modal.classList.remove('hidden');
}

/**
 * Logic for Adding Category (with Duplicate Check)
 */

function saveCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const addError = document.getElementById('add-error-msg');
    const newName = nameInput.value.trim();

    // Reset UI
    addError.classList.add('hidden');
    document.getElementById('delete-error-msg').classList.add('hidden');

    if (!newName) {
        showError(addError, "Please enter a category name.", "text-orange-600");
        return;
    }

    const exists = inventoryData.some(cat => {
        return cat.category_name && cat.category_name.trim().toLowerCase() === newName.toLowerCase();
    });

    if (exists) {
        showError(addError, `"${newName}" already exists in the list!`, "text-red-600");
        return;
    }

    // Success - Push to data
    inventoryData.push({
        category_id: `CAT-${Date.now()}`,
        category_name: newName,
        products: []
    });

    // Save to LocalStorage so it persists!
    localStorage.setItem('myInventory', JSON.stringify(inventoryData));

    nameInput.value = '';
    // This now triggers the visible success message
    refreshUI(`"${newName}" added successfully!`);
}

/**
 * Logic for Deleting Category
 */
function deleteCategory() {
    const dropdown = document.getElementById('delete-cat-dropdown');
    const delError = document.getElementById('delete-error-msg');
    const selectedName = dropdown.value;

    // Reset UI
    delError.classList.add('hidden');
    document.getElementById('add-error-msg').classList.add('hidden');

    if (!selectedName) {
        showError(delError, "Please select a category to delete.", "text-orange-600");
        return;
    }

    const catIndex = inventoryData.findIndex(cat => cat.category_name === selectedName);
    const category = inventoryData[catIndex];

    if (category.products && category.products.length > 0) {
        showError(delError, `Cannot delete: Clear ${category.products.length} items first.`, "text-red-600");
        return;
    }

    inventoryData.splice(catIndex, 1);
    refreshUI("Deleted successfully!");
}

/**
 * Helper to display errors specifically
 */
function showError(element, text, colorClass) {
    element.textContent = text;
    element.className = `text-xs mt-2 font-medium ${colorClass}`;
    element.classList.remove('hidden');
}

/**
 * 1. Update refreshUI to handle the success message
 */
function refreshUI(msg) {
    // 1. Update the main page filters/dropdowns
    populateDropdown(inventoryData);
    if (window.renderCharts) renderCharts(inventoryData);
    
    // 2. Re-populate the modal dropdown (This usually resets the UI)
    openCategoryModal(); 
    
    // 3. NOW display the success message specifically in the 'add' error slot
    if (msg) {
        const addError = document.getElementById('add-error-msg');
        showError(addError, msg, "text-green-600 bg-green-50 p-2 rounded-lg border border-green-100");
        
        // Optional: Hide it after 3 seconds so the modal looks clean again
        setTimeout(() => {
            addError.classList.add('hidden');
        }, 3000);
    }
}
function showStatus(text, colorClass) {
    const msg = document.getElementById('cat-status-msg');
    msg.textContent = text;
    msg.className = `mt-4 text-sm font-medium ${colorClass}`;
    msg.classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

/**
 * Sorting Logic
 */
function handleSort() {
    const sortType = document.getElementById('sort-filter').value;
    
    // 1. Flatten the data so we can sort all products across categories
    let flatData = [];
    inventoryData.forEach(cat => {
        cat.products.forEach(prod => {
            // Keep category name reference for the table row
            flatData.push({ ...prod, category_name: cat.category_name });
        });
    });

    // 2. Perform Sort
    flatData.sort((a, b) => {
        switch (sortType) {
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'stock-asc': return a.stock - b.stock;
            case 'name-asc': return a.name.localeCompare(b.name);
            case 'sino-asc': return a.si_no.localeCompare(b.si_no, undefined, {numeric: true});
            case 'expiry-asc': return new Date(a.expiry_date) - new Date(b.expiry_date);
            case 'mfg-asc': return new Date(a.mfg_date) - new Date(b.mfg_date);
            default: return 0;
        }
    });

    // 3. Render the Sorted Table
    renderSortedTable(flatData);
}

/**
 * Modified Render function for flattened data
 */
function renderSortedTable(flatData) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    flatData.forEach(product => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 border-b border-gray-100 transition-colors";
        row.setAttribute('data-category', product.category_name);
        row.setAttribute('data-name', product.name);

        const invoiceNo = `INV-${product.si_no.replace("HS", "")}`;
        const badgeColor = product.stock < 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

        row.innerHTML = `
            <td class="px-2 py-4 font-medium text-gray-700">${product.si_no}</td>
            <td class="px-2 py-4 font-mono text-xs text-blue-600">${invoiceNo}</td>
            <td class="px-2 py-4">
                <svg class="barcode" jsbarcode-value="${product.si_no}" jsbarcode-width="1" jsbarcode-height="25" jsbarcode-fontsize="10"></svg>
            </td>
            <td class="px-2 py-4 text-[10px] font-bold text-blue-600 uppercase">${product.category_name}</td>
            <td class="px-2 py-4 font-semibold text-gray-900">${product.name}</td>
            <td class="px-3 py-4 text-gray-600">${product.quantity}</td>
            <td class="px-3 py-4 text-gray-600">${product.unit_type}</td>
            <td class="px-2 py-4 font-bold text-gray-800">₹${product.price}</td>
            <td class="px-2 py-4">
                <span class="${badgeColor} px-2 py-1 rounded-full text-[11px] font-bold">${product.stock}</span>
            </td>
            <td class="px-2 py-4 text-xs text-gray-500">${product.mfg_date}</td>
            <td class="px-2 py-4 text-xs text-gray-400">Storage A</td>
            <td class="px-2 py-4 text-xs text-gray-500">${product.expiry_date}</td>
            <td class="px-2 py-4 text-center">
                <button onclick="openEditModal('${product.si_no}')" class="text-blue-500 mr-2"><i class="bi bi-pencil-square"></i></button>
                <button onclick="deleteProduct('${product.si_no}')" class="text-red-500"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (typeof JsBarcode !== 'undefined') JsBarcode(".barcode").init();
}

/**
 * Setup Card Click Listeners
 */
function setupCardListeners() {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    // 1. Total Products Card - Show everything
    document.getElementById('card-total').addEventListener('click', () => {
        renderTable(inventoryData);
    });

    // 2. Low Stock Card - Filter stock < 20
    document.getElementById('card-low').addEventListener('click', () => {
        const filtered = inventoryData.map(cat => ({
            ...cat,
            products: cat.products.filter(p => p.stock < 20)
        })).filter(cat => cat.products.length > 0);
        
        renderTable(filtered);
    });

    // 3. Expiry Card - Filter items expiring within 30 days
    document.getElementById('card-expiry').addEventListener('click', () => {
        const filtered = inventoryData.map(cat => ({
            ...cat,
            products: cat.products.filter(p => {
                const expDate = new Date(p.expiry_date);
                return expDate >= today && expDate <= nextMonth;
            })
        })).filter(cat => cat.products.length > 0);
        
        renderTable(filtered);
    });
}

/**
 * Generates and downloads a CSV report of currently filtered items
 */
function downloadFilteredReport() {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    
    // 1. Filter rows that are currently visible (display is not 'none')
    const visibleRows = rows.filter(row => row.style.display !== 'none');

    if (visibleRows.length === 0) {
        alert("No items found to export.");
        return;
    }

    // 2. Define Headers
    const headers = ["SI No", "Invoice No", "Category", "Product", "Qty", "Unit", "Price", "Stock", "MFG", "Expiry"];
    
    // 3. Map visible data into CSV format
    const csvContent = [
        headers.join(","), // Header row
        ...visibleRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            return [
                cells[0].innerText, // SI
                cells[1].innerText, // Invoice
                cells[3].innerText, // Category
                cells[4].innerText, // Name
                cells[5].innerText, // Qty
                cells[6].innerText, // Unit
                cells[7].innerText.replace('₹', ''), // Price
                cells[8].innerText, // Stock
                cells[9].innerText, // MFG
                cells[11].innerText // Expiry
            ].map(val => `"${val}"`).join(","); // Wrap in quotes to handle commas
        })
    ].join("\n");

    // 4. Create a Blob and trigger the download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Report_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// Open Modal and display the barcode
window.showBarcodeModal = function(barcodeValue) {
    const modal = document.getElementById('barcode-modal');
    const container = document.getElementById('modal-barcode-container');
    
    // Clear previous
    container.innerHTML = `<svg id="barcode-popup"></svg>`;
    
    // Render the barcode using the same library
    JsBarcode("#barcode-popup", barcodeValue, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 50,
        displayValue: true
    });
    
    modal.classList.remove('hidden');
};

// Close Modal
window.closeBarcodeModal = function() {
    document.getElementById('barcode-modal').classList.add('hidden');
};

// Download logic
window.downloadBarcode = function() {
    const svg = document.getElementById('barcode-popup');
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "barcode.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', () => {
            const menuBtn = document.getElementById('mobile-menu-btn');
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebar-backdrop');

            if (menuBtn && sidebar && backdrop) {
                function toggleSidebar() {
                    sidebar.classList.toggle('-translate-x-full');
                    backdrop.classList.toggle('hidden');
                }

                menuBtn.addEventListener('click', toggleSidebar);
                backdrop.addEventListener('click', toggleSidebar);
            } else {
                console.error("Sidebar elements missing from DOM.");
            }
        });



document.addEventListener('DOMContentLoaded', init);