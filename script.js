document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const billNoField = document.getElementById('billNo');
    const customerNameField = document.getElementById('customerName');
    const mobileNumberField = document.getElementById('mobileNumber');
    const itemsTableBody = document.getElementById('itemsTableBody');
    const grandTotalLabel = document.getElementById('grandTotal');

    const addItemBtn = document.getElementById('addItemBtn');
    const removeItemBtn = document.getElementById('removeItemBtn');
    const generateShareBtn = document.getElementById('generateShareBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    
    const addItemModal = document.getElementById('addItemModal');
    const closeAddItemModal = document.getElementById('closeAddItemModal');
    const addItemForm = document.getElementById('addItemForm');
    const itemNameField = document.getElementById('itemName');
    const itemQuantityField = document.getElementById('itemQuantity');
    const itemPriceField = document.getElementById('itemPrice');

    const shareModal = document.getElementById('shareModal');
    const closeShareModal = document.getElementById('closeShareModal');
    const shareTextArea = document.getElementById('shareTextArea');
    const copyToClipboardBtn = document.getElementById('copyToClipboardBtn');
    const shareOnWhatsAppBtn = document.getElementById('shareOnWhatsAppBtn');

    const historyModal = document.getElementById('historyModal');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const historyTableBody = document.getElementById('historyTableBody');
    const historyDetailsArea = document.getElementById('historyDetailsArea');
    const shareFromHistoryBtn = document.getElementById('shareFromHistoryBtn');
    const downloadFromHistoryBtn = document.getElementById('downloadFromHistoryBtn');
    
    // --- State Management ---
    let invoiceHistory = JSON.parse(localStorage.getItem('invoiceHistory')) || [];
    let selectedHistoryInvoice = null;

    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    });

    // --- Event Listeners ---
    addItemBtn.addEventListener('click', () => addItemModal.style.display = 'block');
    closeAddItemModal.addEventListener('click', () => addItemModal.style.display = 'none');
    addItemForm.addEventListener('submit', handleAddItem);
    
    removeItemBtn.addEventListener('click', handleRemoveItem);
    itemsTableBody.addEventListener('click', handleRowSelect);

    generateShareBtn.addEventListener('click', () => processAndSaveInvoice(false));
    downloadBtn.addEventListener('click', () => processAndSaveInvoice(true));

    viewHistoryBtn.addEventListener('click', showHistoryDialog);
    closeHistoryModal.addEventListener('click', () => historyModal.style.display = 'none');
    closeShareModal.addEventListener('click', () => shareModal.style.display = 'none');
    
    copyToClipboardBtn.addEventListener('click', copyInvoiceToClipboard);
    shareOnWhatsAppBtn.addEventListener('click', handleShareOnWhatsApp);
    historyTableBody.addEventListener('click', handleHistoryRowSelect);
    
    shareFromHistoryBtn.addEventListener('click', () => shareInvoice(selectedHistoryInvoice));
    downloadFromHistoryBtn.addEventListener('click', () => downloadInvoice(selectedHistoryInvoice));

    // --- Core Functions ---

    function handleAddItem(e) {
        e.preventDefault();
        const name = itemNameField.value.trim();
        const quantity = parseInt(itemQuantityField.value, 10);
        const price = parseFloat(itemPriceField.value);

        if (name && quantity > 0 && price >= 0) {
            const total = quantity * price;
            const newRow = itemsTableBody.insertRow();
            newRow.innerHTML = `
                <td>${name}</td>
                <td>${quantity}</td>
                <td>${formatter.format(price)}</td>
                <td>${formatter.format(total)}</td>
            `;
            updateTotals();
            addItemForm.reset();
            addItemModal.style.display = 'none';
        } else {
            alert('Please fill all fields with valid values.');
        }
    }

    function handleRemoveItem() {
        const selectedRow = itemsTableBody.querySelector('tr.selected');
        if (selectedRow) {
            selectedRow.remove();
            updateTotals();
        } else {
            alert('Please select an item to remove.');
        }
    }

    function handleRowSelect(e) {
        const selectedRow = e.target.closest('tr');
        if (!selectedRow) return;
        const currentlySelected = itemsTableBody.querySelector('tr.selected');
        if (currentlySelected) currentlySelected.classList.remove('selected');
        selectedRow.classList.add('selected');
    }

    function updateTotals() {
        let total = 0;
        itemsTableBody.querySelectorAll('tr').forEach(row => {
            const totalCell = row.cells[3].textContent;
            total += parseFloat(totalCell.replace(/[₹,]/g, ''));
        });
        grandTotalLabel.textContent = formatter.format(total);
    }
    
    function resetForm() {
        billNoField.value = '';
        customerNameField.value = '';
        mobileNumberField.value = '';
        itemsTableBody.innerHTML = '';
        updateTotals();
    }

    function processAndSaveInvoice(isForDownload) {
        const billNo = billNoField.value.trim();
        const customerName = customerNameField.value.trim();
        const mobileNumber = mobileNumberField.value.trim();

        if (!billNo || !customerName || !mobileNumber || itemsTableBody.rows.length === 0) {
            alert('Bill No., Customer details, and at least one item are required.');
            return;
        }

        const items = [];
        let totalAmount = 0;
        itemsTableBody.querySelectorAll('tr').forEach(row => {
            const pricePerUnit = parseFloat(row.cells[2].textContent.replace(/[₹,]/g, ''));
            const total = parseFloat(row.cells[3].textContent.replace(/[₹,]/g, ''));
            items.push({
                name: row.cells[0].textContent,
                quantity: parseInt(row.cells[1].textContent, 10),
                pricePerUnit,
                total
            });
            totalAmount += total;
        });
        
        const invoice = {
            number: billNo,
            date: new Date().toISOString(),
            customerName,
            mobileNumber,
            items,
            totalAmount
        };

        invoiceHistory.push(invoice);
        localStorage.setItem('invoiceHistory', JSON.stringify(invoiceHistory));
        
        if (isForDownload) downloadInvoice(invoice);
        else shareInvoice(invoice);
        resetForm();
    }
    
    function shareInvoice(invoice) {
        shareTextArea.value = buildTextInvoice(invoice);
        shareModal.style.display = 'block';
    }

    function downloadInvoice(invoice) {
        const htmlContent = buildHtmlInvoice(invoice);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.number}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function copyInvoiceToClipboard() {
        navigator.clipboard.writeText(shareTextArea.value).then(() => {
             alert('Invoice copied to clipboard!');
        });
    }

    function handleShareOnWhatsApp() {
        const text = shareTextArea.value;
        const encodedText = encodeURIComponent(text);
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    }

    function showHistoryDialog() {
        historyTableBody.innerHTML = '';
        invoiceHistory.sort((a, b) => new Date(b.date) - new Date(a.date)); 
        
        invoiceHistory.forEach((invoice) => {
            const row = historyTableBody.insertRow();
            row.dataset.billNumber = invoice.number;
            row.innerHTML = `
                <td>${invoice.number}</td>
                <td>${new Date(invoice.date).toLocaleString('en-IN')}</td>
                <td>${invoice.customerName}</td>
                <td>${formatter.format(invoice.totalAmount)}</td>
            `;
        });

        historyDetailsArea.value = 'Select an invoice to see details.';
        shareFromHistoryBtn.disabled = true;
        downloadFromHistoryBtn.disabled = true;
        selectedHistoryInvoice = null;
        historyModal.style.display = 'block';
    }

    function handleHistoryRowSelect(e) {
        const row = e.target.closest('tr');
        if (!row) return;
        historyTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        const billNumber = row.dataset.billNumber;
        selectedHistoryInvoice = invoiceHistory.find(inv => inv.number === billNumber);

        if (selectedHistoryInvoice) {
            historyDetailsArea.value = buildTextInvoice(selectedHistoryInvoice);
            shareFromHistoryBtn.disabled = false;
            downloadFromHistoryBtn.disabled = false;
        }
    }

    // --- Updated Content Builders ---

    function buildTextInvoice(invoice) {
        const date = new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        let text = `Thank you for shopping at E-COMMERCE!\n`;
        text += `Bill No.: ${invoice.number}\n`;
        text += `Date: ${date}\n\n`;
        text += `Hi ${invoice.customerName}, here is your invoice:\n\n`;
        invoice.items.forEach(item => {
            text += `${item.name} (Qty: ${item.quantity}) - ${formatter.format(item.total)}\n`;
        });
        text += `--------------------\n`;
        text += `Total Amount: ${formatter.format(invoice.totalAmount)}\n\n`;
        text += `Have a great day!`;
        return text;
    }

    function buildHtmlInvoice(invoice) {
        const date = new Date(invoice.date).toLocaleDateString('en-IN');
        const itemsHtml = invoice.items.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${formatter.format(item.pricePerUnit).replace('₹', '')}</td>
                <td>${formatter.format(item.total).replace('₹', '')}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
            <html lang='en'><head><meta charset='UTF-8'><title>Invoice - ${invoice.number}</title>
            <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; background-color: #fff; color: #000; }
            .invoice-box { max-width: 800px; margin: 40px auto; padding: 30px; border: 2px solid #000; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .cash-bill { font-weight: bold; margin-bottom: 5px; }
            .store-name { font-size: 1.8em; font-weight: bold; margin: 0; }
            .address { font-size: 0.9em; }
            .details { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 10px; }
            .customer-name { border-bottom: 1px dotted #000; flex-grow: 1; margin-left: 5px;}
            .invoice-table { width: 100%; border-collapse: collapse; }
            .invoice-table th, .invoice-table td { border: 1px solid #000; padding: 8px; text-align: center; }
            .invoice-table th { font-weight: bold; }
            .invoice-table td:nth-child(2) { text-align: left; }
            .invoice-table tfoot td { font-weight: bold; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
            .footer-left { text-align: left; }
            .footer-right { text-align: right; }
            .signature { border-top: 1px dotted #000; padding-top: 20px; font-style: italic; }
            .thank-you { text-align: center; margin-top: 20px; font-weight: bold;}
            </style></head><body>
            <div class='invoice-box'>
            <div class='header'>
            <div class='cash-bill'>CASH BILL</div>
            <div style='display: flex; justify-content: space-between;'><span>&nbsp;</span><h1 class='store-name'>E-COMMERCE</h1><span>Cell: [Enter Number]</span></div>
            <div class='address'>[Enter Your Business Address Here]</div>
            </div>
            <div class='details'>
            <div>No. <span style='border-bottom: 1px dotted #000; padding: 0 10px;'> ${invoice.number} </span></div>
            <div>Date: <span style='border-bottom: 1px dotted #000; padding: 0 10px;'>${date}</span></div>
            </div>
            <div class='details'>Name: <span class='customer-name'>${invoice.customerName}</span></div>
            <div class='details'>Mobile: <span class='customer-name'>${invoice.mobileNumber}</span></div>
            <table class='invoice-table'>
            <thead><tr><th>Sl. No.</th><th>PARTICULARS</th><th>Qty.</th><th>Rate</th><th>AMOUNT</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot><tr><td colspan='4' style='text-align:right;'>TOTAL</td><td>${formatter.format(invoice.totalAmount)}</td></tr></tfoot>
            </table>
            <div class='footer'>
            <div class='footer-left'><strong>NO RETURN & NO EXCHANGE</strong></div>
            <div class='footer-right'><strong>For E-COMMERCE</strong><br><br><div class='signature'>Authorized Signatory</div></div>
            </div>
            <div class='thank-you'>Thank You Visit Again</div>
            </div></body></html>`;
    }
});