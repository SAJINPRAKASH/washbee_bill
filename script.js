document.addEventListener('DOMContentLoaded', () => {
    const servicesContainer = document.getElementById('servicesContainer');
    const subTotalInput = document.getElementById('subTotal');
    const totalInput = document.getElementById('total');
    const invoiceForm = document.getElementById('invoiceForm');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const spinner = generateBtn.querySelector('.spinner');
    const statusMessage = document.getElementById('statusMessage');

    // Generate 10 Service Rows
    for (let i = 1; i <= 10; i++) {
        const row = document.createElement('div');
        row.className = 'service-row form-group row';

        row.innerHTML = `
            <div class="col-service">
                <input type="text" id="serviceDesc_${i}" placeholder="Service ${i} description (Optional)">
            </div>
            <div class="col-rate">
                <input type="number" id="serviceRate_${i}" class="rate-input total-input" placeholder="0.00" min="0" step="0.01">
            </div>
        `;
        servicesContainer.appendChild(row);
    }

    // Calculate Totals automatically
    const rateInputs = document.querySelectorAll('.rate-input');
    rateInputs.forEach(input => {
        input.addEventListener('input', calculateTotals);
    });

    function calculateTotals() {
        let sum = 0;
        rateInputs.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                sum += val;
            }
        });
        subTotalInput.value = sum.toFixed(2);
        // Assuming no tax for now, Total = SubTotal
        totalInput.value = sum.toFixed(2);
    }

    // Show Status Message
    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
        statusMessage.classList.remove('hidden');

        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 5000);
    }

    const previewContainer = document.getElementById('previewContainer');
    const invoiceBox = document.querySelector('.container.glass-panel');
    const editBtn = document.getElementById('editBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    const GOOGLE_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzxA-ncUk8HQ-me0nteA0bltulJbNvkKkLpCJ4zq7wJir0SpSvBUakOARC_vj148un_/exec';
    let currentInvoiceData = null;

    // Set loading state for main button
    function setLoading(isLoading) {
        if (isLoading) {
            generateBtn.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            generateBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    // Set loading state for download button
    function setDownloadLoading(isLoading) {
        const dBtnText = downloadBtn.querySelector('.btn-text');
        const dSpinner = downloadBtn.querySelector('.spinner');
        if (isLoading) {
            downloadBtn.disabled = true;
            dBtnText.classList.add('hidden');
            dSpinner.classList.remove('hidden');
        } else {
            downloadBtn.disabled = false;
            dBtnText.classList.remove('hidden');
            dSpinner.classList.add('hidden');
        }
    }

    // Return to Edit Mode
    editBtn.addEventListener('click', () => {
        previewContainer.classList.add('hidden');
        invoiceBox.style.display = 'block';
    });

    // Handle initial form generation (Preview)
    invoiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        setLoading(true);
        statusMessage.classList.add('hidden');

        try {
            // Helper function for Title Case
            const toTitleCase = (str) => {
                if (!str) return ' ';
                return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            };

            // 1. Populate the hidden HTML structure
            document.getElementById('outClientName').innerText = toTitleCase(document.getElementById('clientName').value);
            document.getElementById('outDate').innerText = document.getElementById('date').value || ' ';
            document.getElementById('outInvoiceNo').innerText = document.getElementById('invoiceNumber').value.toUpperCase() || ' ';

            document.getElementById('outVehicleName').innerText = toTitleCase(document.getElementById('vehicleBrandModel').value);
            document.getElementById('outRegNo').innerText = document.getElementById('registrationNumber').value.toUpperCase() || ' ';
            document.getElementById('outVehicleType').innerText = toTitleCase(document.getElementById('vehicleType').value);

            // 2. Map Services Table
            const outServices = document.getElementById('outServices');
            outServices.innerHTML = ''; // Clear previous rendering

            for (let i = 1; i <= 10; i++) {
                const desc = document.getElementById(`serviceDesc_${i}`).value;
                const rate = document.getElementById(`serviceRate_${i}`).value;

                if (desc || rate) {
                    const tr = document.createElement('div');
                    tr.className = 'in-tr';
                    tr.innerHTML = `
                        <div>${toTitleCase(desc)}</div>
                        <div>${rate || ' '}</div>
                    `;
                    outServices.appendChild(tr);
                }
            }

            // 3. Map Totals
            const totalVal = document.getElementById('total').value || '0.00';
            document.getElementById('outTotal').innerText = totalVal;

            // 4. Update the current invoice data for Google Sheets
            currentInvoiceData = {
                date: document.getElementById('date').value,
                clientName: document.getElementById('clientName').value,
                invoiceNumber: document.getElementById('invoiceNumber').value,
                vehicleBrandModel: document.getElementById('vehicleBrandModel').value,
                registrationNumber: document.getElementById('registrationNumber').value,
                vehicleType: document.getElementById('vehicleType').value,
                total: totalVal
            };

            // Hide the input form and reveal the preview
            invoiceBox.style.display = 'none';
            previewContainer.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            showStatus("Error generating preview. See console output.", true);
        } finally {
            setLoading(false);
        }
    });

    // Handle PDF Download
    downloadBtn.addEventListener('click', async () => {
        setDownloadLoading(true);
        try {
            const element = document.getElementById('invoiceTemplate');
            const clientNameVal = document.getElementById('clientName').value.trim() || 'Client';

            const opt = {
                margin: 0,
                filename: `wb ${clientNameVal} bill.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, useCORS: true, logging: true },
                jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();

            // Push to Google Sheets (Fire and forget)
            if (currentInvoiceData) {
                try {
                    fetch(GOOGLE_WEB_APP_URL, {
                        method: 'POST',
                        body: JSON.stringify(currentInvoiceData),
                        // The 'no-cors' mode ensures the browser doesn't block the request due to missing CORS headers
                        // from Google Apps Script, but it also means we can't read the response.
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }).catch(console.error);
                } catch (e) {
                    console.error("Failed to push to Google Sheets", e);
                }
            }

            showStatus('PDF generated successfully!');

        } catch (error) {
            console.error(error);
            showStatus("Error generating PDF.", true);
        } finally {
            setDownloadLoading(false);
        }
    });

});
