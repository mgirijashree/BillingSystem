const invoice = JSON.parse(localStorage.getItem('currentInvoice'));

const invoiceItems = document.getElementById('invoice-items');


document.getElementById('invoice-number').textContent = invoice.invoiceNo;

document.getElementById('invoice-total').textContent = `Total: ₹${invoice.total.toFixed(2)}`;

invoice.items.forEach(item => {

    const div = document.createElement('div');

    div.className = 'flex justify-between border-b py-4';

    div.innerHTML = `
        <div>
            <h3 class="font-bold">${item.name}</h3>
            <p>${item.qty} x ₹${item.price}</p>
        </div>

        <h3 class="font-bold">₹${item.qty * item.price}</h3>
    `;

    invoiceItems.appendChild(div);
});

JsBarcode('#invoice-barcode', invoice.invoiceNo, {

    width: 2,
    height: 60
});

function downloadPDF() {

    const invoiceEl = document.getElementById('invoice-container');

    html2pdf().from(invoiceEl).save();
}