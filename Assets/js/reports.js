//Global variable
let revenueChartInstance = null;
let invoiceChartInstance = null;
let currentDataView = [];

function renderReports() {
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const tbody = document.getElementById('invoiceTableBody');
    

    
    // Get filter values
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const dateQuery = document.getElementById('dateFilter')?.value || "";
    const paymentQuery = document.getElementById('paymentFilter')?.value.toLowerCase() || "";

    // Apply Filters
    const filteredInvoices = invoices.filter(inv => {
        // Use updated keys: customerName and invoiceNumber
        const customer = inv.customerName || "";
        const id = inv.invoiceNumber || "";
        
        const matchesSearch = customer.toLowerCase().includes(searchQuery) || 
                              id.toLowerCase().includes(searchQuery);
        
        // Date match: assumes inv.date is a string
        const matchesDate = dateQuery ? inv.date === dateQuery : true;
        
        // Payment match
        const matchesPayment = paymentQuery ? inv.paymentMethod.toLowerCase() === paymentQuery : true;
        
        return matchesSearch && matchesDate && matchesPayment;
    });
currentDataView = filteredInvoices;
    // Render Table
    tbody.innerHTML = "";
    filteredInvoices.forEach(inv => {
        tbody.innerHTML += `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3 font-mono">${inv.invoiceNumber || 'N/A'}</td>
            <td class="p-3">${inv.date || ''}</td>
            <td class="p-3">${inv.customerName || 'Walk-In'}</td>
            <td class="p-3 capitalize">${inv.paymentMethod || '-'}</td>
            <td class="p-3">₹${(inv.gst || 0).toFixed(2)}</td>
            <td class="p-3 font-bold">₹${(inv.total || 0).toFixed(2)}</td>
            <td class="p-3 text-green-600 font-bold">+${inv.loyaltyPointsEarned || 0}</td>
        </tr>`;
    });
    // Destroy old charts before re-rendering
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    if (weeklyPieInstance) weeklyPieInstance.destroy();
    
    // 2. Render Charts
    renderCharts(filteredInvoices);

    // 3. Update the new Stats
    updateDashboardStats(filteredInvoices);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedInvoices = localStorage.getItem('invoices');
    if (!savedInvoices) {
        console.warn("No invoices found in localStorage!");
        return;
    }
    renderReports();
   
});


//Render charts============
let monthlyChartInstance = null;
let weeklyPieInstance = null;

function renderCharts(invoices) {

    // LAST 6 MONTHS
    const last6Months =
        Array.from(
            { length: 6 },
            (_, i) => {

                const d = new Date();

                d.setMonth(
                    d.getMonth() - (5 - i)
                );

                return {

                    year: d.getFullYear(),

                    month: d.getMonth(),

                    label:
                        d.toLocaleString(
                            'default',
                            { month: 'short' }
                        )

                };

            }
        );

    // MONTHLY REVENUE
    const monthlyRevenueData =
        last6Months.map(m =>

            invoices
                .filter(i => {

                    const d =
                        new Date(i.date);

                    return (
                        d.getFullYear() === m.year &&
                        d.getMonth() === m.month
                    );

                })

                .reduce(
                    (sum, i) =>
                        sum + (parseFloat(i.total) || 0),
                    0
                )

        );

    // LAST 7 DAYS
    const last7Days =
        Array.from(
            { length: 7 },
            (_, i) => {

                const d = new Date();

                d.setDate(
                    d.getDate() - (6 - i)
                );

                return {

                    dateStr:
                        d.toISOString().split('T')[0],

                    label:
                        d.toLocaleDateString(
                            'en-GB',
                            { weekday: 'short' }
                        )

                };

            }
        );

    // WEEKLY REVENUE
    const weeklyRevenueData =
        last7Days.map(d =>

            invoices
                .filter(i =>
                    i.date === d.dateStr
                )

                .reduce(
                    (sum, i) =>
                        sum + (parseFloat(i.total) || 0),
                    0
                )

        );

    // DESTROY OLD CHARTS
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    if (weeklyPieInstance) {
        weeklyPieInstance.destroy();
    }

    // BAR CHART
    const barCanvas =
        document.getElementById(
            'monthlyBarChart'
        );

    if (barCanvas) {

        const barCtx =
            barCanvas.getContext('2d');

        monthlyChartInstance =
            new Chart(barCtx, {

                type: 'bar',

                data: {

                    labels:
                        last6Months.map(
                            m => m.label
                        ),

                    datasets: [{

                        label: 'Revenue (₹)',

                        data: monthlyRevenueData,

                        backgroundColor: '#3b82f6'

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }

            });

    }

    // PIE CHART
    const pieCanvas =
        document.getElementById(
            'weeklyPieChart'
        );

    if (pieCanvas) {

        const pieCtx =
            pieCanvas.getContext('2d');

        weeklyPieInstance =
            new Chart(pieCtx, {

                type: 'pie',

                data: {

                    labels:
                        last7Days.map(
                            d => d.label
                        ),

                    datasets: [{

                        data: weeklyRevenueData,

                        backgroundColor: [

                            '#ef4444',
                            '#f59e0b',
                            '#10b981',
                            '#3b82f6',
                            '#8b5cf6',
                            '#ec4899',
                            '#6366f1'

                        ]

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }

            });
        }
    }


function updateDashboardStats(invoices) {
    const bestPaymentEl = document.getElementById('bestPayment');
    const bestProductEl = document.getElementById('bestProduct');

    if (!invoices.length) {
        if(bestPaymentEl) bestPaymentEl.innerText = "-";
        if(bestProductEl) bestProductEl.innerText = "-";
        return;
    }

    // 1. Most Used Payment
    const paymentCounts = invoices.reduce((acc, inv) => {
        const method = inv.paymentMethod || 'N/A';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
    }, {});
    
    // Sort and get the most used
    const sortedPayments = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1]);
    const mostUsedPayment = sortedPayments.length > 0 ? sortedPayments[0][0] : 'N/A';

    // 2. Top Selling Item (Fixed Logic)
    const itemCounts = {};
    invoices.forEach(inv => {
        if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach(item => {
                // Use item.productName as defined in your finalizeTransaction function
                const name = item.productName || item.name || "Unknown Item";
                const qty = parseInt(item.quantity) || 0;
                itemCounts[name] = (itemCounts[name] || 0) + qty;
            });
        }
    });

    // Sort to find top item
    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    
    // 3. Update DOM
    if(bestPaymentEl) bestPaymentEl.innerText = mostUsedPayment;
    if(bestProductEl) bestProductEl.innerText = sortedItems.length > 0 ? sortedItems[0][0] : '-';
}

