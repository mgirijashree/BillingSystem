/**
 * Inventory Management System
 * Features: Fetch JSON, Dynamic Table, Category Filter, Search, Summary Cards, Charts
 */

// Global variable to store fetched inventory
let inventoryData = [];

// DOM Element Selectors
const tableBody = document.getElementById('inventory-body');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const totalVal = document.getElementById('total-val');
const lowVal = document.getElementById('low-val');

/**
 * 1. Initialize Dashboard
 */
async function init() {
    try {
        const response = await fetch('./grocerylist.json');
        if (!response.ok) throw new Error("Failed to fetch JSON");
        
        inventoryData = await response.json();
        
        // Render UI Components
        renderProductCards(inventoryData);
        populateDropdown(inventoryData);
        updateSummary(inventoryData);

        // INITIALIZE CHARTS (Now that data is actually loaded)
        renderCharts(inventoryData);

        setupEventListeners();
        
    } catch (error) {
        console.error("Critical Error:", error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="11" class="text-center py-10 text-red-500">Error loading data. Check console.</td></tr>`;
        }
    }
}

/**
 * 2. Render Charts Function (Updated for Financial Valuation Property)
 */
function renderCharts(data) {
    // 1. Extract Category Labels
    const labels = data.map(cat => cat.category_name);
    
    // PROPERTY A: Compute Total Valuation per Category: sum of (Price * Stock)
    const financialValues = data.map(cat => {
        return cat.products.reduce((sum, prod) => sum + (prod.price * prod.stock), 0);
    });

    // PROPERTY B: Compute Total Stock Volume Units per Category
    const stockValues = data.map(cat => {
        return cat.products.reduce((sum, prod) => sum + prod.stock, 0);
    });

    const chartColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
        '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
    ];

    // Initialize Pie Chart using Financial Value Property
    new Chart(document.getElementById('stockPieChart'), {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: financialValues,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } },
                tooltip: {
                    callbacks: {
                        // Custom tooltip formatting to append Indian Rupee notation cleanly
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.raw !== undefined) {
                                label += '₹' + context.raw.toLocaleString('en-IN');
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Initialize Bar Chart using Stock Units Volume Property
    new Chart(document.getElementById('stockBarChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Units',
                data: stockValues,
                backgroundColor: '#3b82f6',
                borderRadius: 6,
            }]
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { display: false } }
            }
        }
    });
}
/**
 * 3. Render Table Rows
 */
function renderTable(data) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    data.forEach(category => {
        category.products.forEach(product => {
            const row = document.createElement('tr');
            row.className = "hover:bg-gray-50 border-b border-gray-100 transition-colors";
            row.setAttribute('data-category', category.category_name);
            row.setAttribute('data-name', product.name.toLowerCase());

            const badgeColor = product.stock < 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

            row.innerHTML = `
                <td class="px-4 py-4 font-medium text-gray-700">${product.si_no}</td>
                <td class="px-4 py-4 text-[10px] font-bold text-blue-600 uppercase tracking-tight">${category.category_name}</td>
                <td class="px-4 py-4 font-semibold text-gray-900">${product.name}</td>
                <td class="px-3 py-4 text-gray-600">${product.quantity}</td>
                <td class="px-3 py-4 text-gray-600">${product.unit_type}</td>
                <td class="px-4 py-4 font-bold text-gray-800">₹${product.price}</td>
                <td class="px-4 py-4">
                    <span class="${badgeColor} px-2 py-1 rounded-full text-[11px] font-bold">
                        ${product.stock}
                    </span>
                </td>
                <td class="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">${product.mfg_date}</td>
                <td class="px-4 py-4 text-xs text-gray-400">Warehouse A</td>
                <td class="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">${product.expiry_date}</td>
                <td class="px-4 py-4 text-center whitespace-nowrap">
                    <button class="text-blue-500 hover:text-blue-700 transition mr-2"><i class="bi bi-pencil-square"></i></button>
                    <button class="text-red-500 hover:text-red-700 transition"><i class="bi bi-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });
}

/**
 * 4. Filter Logic
 */
function filterByExpiry() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999);

    if (categoryFilter) categoryFilter.value = 'all';
    if (searchInput) searchInput.value = '';

    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        row.classList.remove("bg-orange-50"); 

        const expiryDateStr = row.cells[9].textContent.trim(); 
        const expiryDate = new Date(expiryDateStr);

        // Check if date is valid and within the next 30 days
        if (!isNaN(expiryDate) && expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
            row.style.display = ""; 
            row.classList.add("bg-orange-50"); 
        } else {
            row.style.display = "none"; 
        }
    });
}

function filterByLowStock() {
    const rows = tableBody.querySelectorAll('tr');
    console.log("Found rows:", rows.length); // If this is 0, the table wasn't loaded yet

    rows.forEach(row => {
        const stockCell = row.cells[6].textContent.trim();
        const stockLevel = parseInt(stockCell);

        if (stockLevel < 20) {
            row.style.display = ""; 
        } else {
            row.style.display = "none";
        }
    });
}


function handleFilters() {
    const selectedCategory = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        const rowCategory = row.getAttribute('data-category');
        const rowName = row.getAttribute('data-name');
        const categoryMatch = (selectedCategory === 'all' || rowCategory === selectedCategory);
        const searchMatch = rowName.includes(searchTerm);
        row.style.display = (categoryMatch && searchMatch) ? "" : "none";
    });
}

function setupEventListeners() {
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilters);
    if (searchInput) searchInput.addEventListener('input', handleFilters);
    
    // 1. Total Products Card - Show everything
    const totalCard = document.getElementById('total-val').parentElement;
    if (totalCard) {
        totalCard.classList.add('cursor-pointer', 'hover:shadow-md', 'transition-shadow');
        totalCard.addEventListener('click', () => {
            // Reset filters and show all rows
            if (categoryFilter) categoryFilter.value = 'all';
            if (searchInput) searchInput.value = '';
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach(row => row.style.display = "");
        });
    }

    // 2. Low Stock Card - Filter items < 20
    const lowStockCard = document.getElementById('low-val').parentElement;
    if (lowStockCard) {
        lowStockCard.classList.add('cursor-pointer', 'hover:shadow-md', 'transition-shadow');
        lowStockCard.addEventListener('click', filterByLowStock);
    }

    // 3. Expiry Card (Already existing in your code)
    const expiryCard = document.getElementById('expiry-card');
    if (expiryCard) {
        expiryCard.addEventListener('click', filterByExpiry);
    }
}

/**
 * 5. Update UI Helpers
 */
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
    let totalItems = 0;
    let lowStockCount = 0;
    let expiringCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999); // End of the 30th day

    data.forEach(cat => {
        totalItems += cat.products.length;
        cat.products.forEach(product => {
            if (product.stock < 20) lowStockCount++;

            const expiryDate = new Date(product.expiry_date);
            // Include today and everything up to the end of day 30
            if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
                expiringCount++;
            }
        });
    });

    if (totalVal) totalVal.textContent = totalItems;
    if (lowVal) lowVal.textContent = lowStockCount;
    const expiryVal = document.getElementById('expiry-val');
    if (expiryVal) expiryVal.textContent = expiringCount;
}

function renderProductCards(data) {
    const lowContainer = document.getElementById('low-stock-container');
    const expiryContainer = document.getElementById('expiring-container');
    const recentContainer = document.getElementById('recent-container');

    // Safety check: ensure containers exist
    if (!lowContainer || !expiryContainer || !recentContainer) return;

    // 1. Clear previous content
    lowContainer.innerHTML = '';
    expiryContainer.innerHTML = '';
    recentContainer.innerHTML = '';

    // 2. SAME LOGIC AS TOP CARDS: Define the 30-day window
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (Midnight)

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999); // End of the 30th day

    data.forEach(category => {
        category.products.forEach(product => {
            const expiryDate = new Date(product.expiry_date);
            
            // Define the shared card styles
            const baseClass = "p-3 border rounded-lg transition-all hover:shadow-sm";
            
            // --- LOGIC 1: LOW STOCK ---
            if (product.stock < 20) {
                const lowCardHTML = `
                    <div class="${baseClass} border-red-100 bg-red-50/50 hover:border-red-300">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-gray-800 text-sm">${product.name}</h4>
                            <span class="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">${product.si_no}</span>
                        </div>
                        <div class="flex justify-between mt-2 items-center">
                            <p class="text-[11px] text-gray-500 italic">${category.category_name}</p>
                            <p class="text-sm font-bold text-red-600">Stock: ${product.stock}</p>
                        </div>
                    </div>
                `;
                lowContainer.insertAdjacentHTML('beforeend', lowCardHTML);
            }

            // --- LOGIC 2: EXPIRY (EXACT TOP CARD MATCH) ---
            // Only include if date is between today (00:00) and 30 days from now (23:59)
            if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
                const expiryCardHTML = `
                    <div class="${baseClass} border-orange-100 bg-orange-50/50 hover:border-orange-300">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-gray-800 text-sm">${product.name}</h4>
                            <span class="text-[10px] font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">${product.si_no}</span>
                        </div>
                        <div class="mt-2">
                            <p class="text-[11px] font-bold text-orange-700">⌛ Expires: ${product.expiry_date}</p>
                            <div class="flex justify-between items-center mt-1">
                                <p class="text-[10px] text-gray-500">${category.category_name}</p>
                                <p class="text-[10px] font-semibold text-gray-700">Stock: ${product.stock}</p>
                            </div>
                        </div>
                    </div>
                `;
                expiryContainer.insertAdjacentHTML('beforeend', expiryCardHTML);
            }

            // --- LOGIC 3: RECENT ADDITIONS (ALL PRODUCTS) ---
            const generalCardHTML = `
                <div class="${baseClass} border-gray-100 bg-white hover:border-blue-200">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-gray-800 text-sm">${product.name}</h4>
                        <span class="text-[10px] font-bold text-gray-400">${product.si_no}</span>
                    </div>
                    <p class="text-[11px] text-gray-400 mt-1">${category.category_name}</p>
                </div>
            `;
            recentContainer.insertAdjacentHTML('beforeend', generalCardHTML);
        });
    });

    // 3. FINAL SYNC: Ensure the badges show exactly what the containers hold
    const lowBadge = document.getElementById('low-count-badge');
    const expiryBadge = document.getElementById('expiry-count-badge');
    const recentBadge = document.getElementById('recent-additions-count-badge');


    if (lowBadge) lowBadge.textContent = lowContainer.children.length;
    if (expiryBadge) expiryBadge.textContent = expiryContainer.children.length;
    if (recentBadge) recentBadge.textContent = recentContainer.children.length;
}


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


