async function generateInvoicePDF(invoice) {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF();

    pdf.setFontSize(18);

    pdf.text('HAPPY STORE INVOICE', 20, 20);

    pdf.setFontSize(12);

    pdf.text(`Invoice No: ${invoice.invoice_no}`, 20, 40);

    pdf.text(`Payment Method: ${invoice.payment_method}`, 20, 50);

    pdf.text(`Date: ${invoice.date}`, 20, 60);

    let y = 80;

    invoice.items.forEach(item => {

        pdf.text(
            `${item.name} x${item.qty} - ₹${item.price}`,
            20,
            y
        );

        y += 10;
    });

    pdf.text(`Total: ₹${invoice.total.toFixed(2)}`, 20, y + 20);

    pdf.save(`${invoice.invoice_no}.pdf`);
}


async function downloadInvoiceImage() {

    const invoice = document.getElementById('invoice-print');

    const canvas = await html2canvas(invoice);

    const image = canvas.toDataURL('image/png');

    const link = document.createElement('a');

    link.href = image;

    link.download = 'invoice.png';

    link.click();
}
function downloadReportsPDF() {
    // Access the global variable defined in reports.js
    const dataToExport = typeof currentDataView !== 'undefined' ? currentDataView : [];

    if (dataToExport.length === 0) {
        alert("No data available to download.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.text("Sales Report", 14, 15);

    const rows = dataToExport.map(inv => [
        `${inv.invoiceNumber || 'N/A'}\n${inv.barcode || 'N/A'}`,
        inv.date || 'N/A',
        inv.time || 'N/A',
        inv.customerName || 'Walk-In',
        inv.productName || 'N/A',
        inv.productId || 'N/A',
        inv.quantity || 1,
        (inv.unitPrice || 0).toFixed(2),
        (inv.subtotal || 0).toFixed(2),
        (inv.gst || 0).toFixed(2),
        (inv.total || 0).toFixed(2),
        inv.paymentMethod || '-'
    ]);

    doc.autoTable({
        head: [["Invoice/Barcode", "Date", "Time", "Customer", "Product", "SKU", "Qty", "Price", "Sub", "GST", "Total", "Pay"]],
        body: rows,
        startY: 20,
        styles: { fontSize: 7 }
    });

    doc.save(`Filtered_Report_${new Date().toLocaleDateString()}.pdf`);
}