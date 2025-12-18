
        // Read backend URL from global `window.API_URL` set in HTML, else fallback to deployed Render URL
        const API_URL = (window.API_URL && window.API_URL.replace(/\/$/, '')) || 'https://payment-qich.onrender.com'; 
        let currentInvoice = null;
        let selectedPaymentMethod = 'CASH'; 

        window.onload = function() { fetchAllInvoices(); document.getElementById('search-input').focus(); };

        // 1. FETCH DATA
        async function fetchAllInvoices() {
            const tbody = document.getElementById('invoice-list-body');
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Loading...</td></tr>';
            try {
                const response = await fetch(`${API_URL}/invoices`);
                const data = await response.json();
                tbody.innerHTML = ''; 
                const search = document.getElementById('search-input').value.toLowerCase();
                const filteredData = data.filter(inv => {
                    const invalidNames = ['Pasien Tanpa Data', 'Data Lama (Tanpa Pasien)', 'Tanpa Nama', null, ''];
                    if (!inv.patient_name || invalidNames.includes(inv.patient_name)) return false; 
                    return (inv.patient_name?.toLowerCase().includes(search) || inv.id?.toLowerCase().includes(search) || inv.mr_no?.toLowerCase().includes(search));
                });

                if (filteredData.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 italic">Tidak ada data ditemukan.</td></tr>`; return; }

                filteredData.forEach(inv => {
                    let statusBadge = inv.status === 'paid' ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold border border-green-200">LUNAS</span>' : '<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold border border-orange-200">UNPAID</span>';
                    let actionBtn = inv.status === 'paid' 
                        ? `<button onclick="printReceipt('${inv.id}')" class="bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-800 shadow-sm transition group"><i class="fa-solid fa-print mr-1 group-hover:animate-pulse"></i> Cetak</button>` 
                        : `<button onclick="selectInvoice('${inv.id}')" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-sm">PILIH</button>`;
                    const displayRM = inv.mr_no ? `<span class="text-xs text-slate-400 ml-1">(${inv.mr_no})</span>` : '';
                    tbody.innerHTML += `<tr class="border-b border-slate-50 hover:bg-blue-50/50 transition cursor-pointer" onclick="selectInvoice('${inv.id}')"><td class="p-4 font-mono text-xs text-slate-500">#${inv.id.substring(0,6)}</td><td class="p-4 font-bold text-slate-700 text-sm">${inv.patient_name} ${displayRM}</td><td class="p-4 font-bold text-slate-700">Rp ${parseInt(inv.total_amount).toLocaleString('id-ID')}</td><td class="p-4">${statusBadge}</td><td class="p-4 text-center">${actionBtn}</td></tr>`;
                });
            } catch (error) { tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-500">Gagal koneksi server!</td></tr>`; }
        }

        // 2. PILIH INVOICE
        async function selectInvoice(id) {
            try {
                document.getElementById('empty-state').classList.add('hidden');
                document.getElementById('payment-panel').classList.remove('hidden');
                document.getElementById('pay-items-list').innerHTML = '<div class="text-center text-slate-400">Loading details...</div>';
                const response = await fetch(`${API_URL}/invoices/${id}`);
                const data = await response.json();
                currentInvoice = data.invoice;
                document.getElementById('pay-patient-name').innerText = currentInvoice.patient_name || "Tanpa Nama";
                document.getElementById('pay-patient-mr').innerText = currentInvoice.mr_no || "-";
                document.getElementById('pay-total-amount').innerText = `Rp ${parseInt(currentInvoice.total_amount).toLocaleString('id-ID')}`;
                const listContainer = document.getElementById('pay-items-list');
                listContainer.innerHTML = '';
                if (data.details && data.details.length > 0) {
                    data.details.forEach(item => {
                        listContainer.innerHTML += `<div class="flex justify-between border-b border-slate-100 pb-2 mb-2"><div><div class="font-bold text-slate-600">${item.item_name}</div><div class="text-xs text-slate-400">x${item.qty}</div></div><div class="font-bold text-slate-700">Rp ${parseInt(item.subtotal).toLocaleString('id-ID')}</div></div>`;
                    });
                } else { listContainer.innerHTML = '<div class="text-center text-slate-400 italic">Tidak ada rincian item.</div>'; }
                selectMethod('CASH');
            } catch (error) { console.error(error); }
        }

        // 3. PILIH METODE BAYAR
        function selectMethod(method) {
            selectedPaymentMethod = method;
            document.querySelectorAll('.method-btn').forEach(btn => { btn.classList.remove('active', 'bg-blue-600', 'text-white'); });
            const activeBtn = document.getElementById(`btn-${method.toLowerCase()}`);
            if(activeBtn) activeBtn.classList.add('active');
            const inputAmount = document.getElementById('pay-input-amount');
            if (method !== 'CASH' && currentInvoice) { inputAmount.value = parseInt(currentInvoice.total_amount); calculateChange(); } 
            else { inputAmount.value = ''; document.getElementById('change-amount').innerText = 'Rp 0'; inputAmount.focus(); }
        }

        // 5. PROSES BAYAR
        async function processPayment() {
            if (!currentInvoice) return;
            const amount = parseInt(document.getElementById('pay-input-amount').value) || 0;
            const totalTagihan = parseInt(currentInvoice.total_amount);
            if (amount < totalTagihan) { alert("⚠️ Uang Kurang!"); return; }
            if(!confirm(`Konfirmasi pembayaran Rp ${amount.toLocaleString('id-ID')} via ${selectedPaymentMethod}?`)) return;
            try {
                const response = await fetch(`${API_URL}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoice_id: currentInvoice.id, amount: amount, method: selectedPaymentMethod, cashier_name: "Kireina (Staff Kasir)" })
                });
                const result = await response.json();
                if (response.ok) { alert("✅ Pembayaran Sukses! Kembalian: Rp " + (result.change_amount || 0)); closePanel(); fetchAllInvoices(); } 
                else { alert("❌ Gagal: " + result.error); }
            } catch (error) { alert("Error Server"); }
        }

        function closePanel() { document.getElementById('payment-panel').classList.add('hidden'); document.getElementById('empty-state').classList.remove('hidden'); currentInvoice = null; }
        document.getElementById('search-input').addEventListener('input', fetchAllInvoices);

        // --- 6. PRINT RECEIPT (VERSI AMAN - TANPA BACKTICK TEMPLATE) ---
        async function printReceipt(invoiceId) {
            try {
                const response = await fetch(`${API_URL}/invoices/${invoiceId}`);
                const data = await response.json();
                const inv = data.invoice;
                const items = data.details;
                const pay = data.payments[0];

                const bayar = pay ? parseInt(pay.amount) : 0;
                let kembalian = bayar - parseInt(inv.total_amount);  // Calculate the change directly here
                const metode = pay ? pay.method : '-';
                const kasir = pay ? pay.cashier_name : 'Admin';
                const tgl = new Date(inv.created_at).toLocaleString('id-ID');

                let itemRows = '';
                items.forEach(item => {
                    itemRows += '<tr><td style="padding: 2px 0;">' + item.item_name + '<br><span style="font-size: 10px; color: #555;">' + item.qty + ' x ' + parseInt(item.price).toLocaleString('id-ID') + '</span></td><td style="text-align: right; vertical-align: top;">' + parseInt(item.subtotal).toLocaleString('id-ID') + '</td></tr>';
                });

                // KITA RAKIT HTML PAKAI STRING BIASA (+) SUPAYA BROWSER GAK BINGUNG
                var receiptHTML = '<html><head><title>Struk #' + inv.id.substring(0,6) + '</title>';
                receiptHTML += '<style>body { font-family: monospace; width: 300px; padding: 10px; font-size: 12px; } .center { text-align: center; } .line { border-bottom: 1px dashed #000; margin: 10px 0; } table { width: 100%; } .bold { font-weight: bold; }</style></head><body>';
                receiptHTML += '<div class="center"><h3 style="margin:0;">RS SEHAT SENTOSA</h3><p style="margin:2px 0; font-size: 10px;">Jl. Teknik Kimia, ITS Surabaya</p></div><div class="line"></div>';
                receiptHTML += '<table><tr><td>No. Resep</td><td style="text-align:right">#' + inv.id.substring(0,8) + '</td></tr><tr><td>Tanggal</td><td style="text-align:right">' + tgl + '</td></tr><tr><td>Pasien</td><td style="text-align:right">' + inv.patient_name + '</td></tr><tr><td>Kasir</td><td style="text-align:right">' + kasir + '</td></tr></table>';
                receiptHTML += '<div class="line"></div><table>' + itemRows + '</table><div class="line"></div>';
                receiptHTML += '<table><tr class="bold"><td>TOTAL</td><td style="text-align:right">Rp ' + parseInt(inv.total_amount).toLocaleString('id-ID') + '</td></tr><tr><td>Bayar (' + metode + ')</td><td style="text-align:right">Rp ' + bayar.toLocaleString('id-ID') + '</td></tr>';

                // Dynamic update for Kembali (change) or Kurang (deficit)
                const kembalianFormatted = kembalian >= 0 ? `Rp ${kembalian.toLocaleString('id-ID')}` : `Rp ${(-kembalian).toLocaleString('id-ID')}`;
                receiptHTML += `<tr><td>Kembali</td><td style="text-align:right">${kembalianFormatted}</td></tr>`;

                receiptHTML += '</table>';
                receiptHTML += '<div class="line"></div><div class="center"><p>Terima Kasih<br>Semoga Lekas Sembuh</p></div>';
                receiptHTML += '</body></html>';

                const popup = window.open('', '_blank', 'width=350,height=500');
                if(popup) {
                    popup.document.open();
                    popup.document.write(receiptHTML);
                    popup.document.close();
                    setTimeout(function() { popup.focus(); popup.print(); }, 500);
                } else {
                    alert("Pop-up diblokir browser!");
                }

            } catch (error) { alert("Gagal mencetak struk: " + error.message); }
        }

        // --- Calculate Change Function (for input change) ---
        document.getElementById('pay-input-amount').addEventListener('input', calculateChange);

        function calculateChange() {
            if (!currentInvoice) return;

            // Get the amount paid and the bill total
            const bayar = parseInt(document.getElementById('pay-input-amount').value) || 0;
            const tagihan = parseInt(currentInvoice.total_amount);

            // Calculate the change (kembalian) or deficit (kurang)
            const kembalian = bayar - tagihan;

            // Update the #change-amount element to display Kembali or Kurang
            const el = document.getElementById('change-amount');
            if (kembalian >= 0) {
                el.innerText = `Kembali: Rp ${kembalian.toLocaleString('id-ID')}`;
                el.className = "font-bold text-green-600 bg-green-50 px-2 py-1 rounded";
            } else {
                el.innerText = `Kurang: Rp ${(kembalian * -1).toLocaleString('id-ID')}`;
                el.className = "font-bold text-red-500 bg-red-50 px-2 py-1 rounded";
            }

            // Dynamic update for Kembali (change) or Kurang (deficit) in the printed receipt HTML
            updateReceiptChange(kembalian);
        }

        // This function updates the Kembali value in the printed receipt HTML dynamically
        function updateReceiptChange(kembalian) {
            const kembalianFormatted = kembalian >= 0 ? `Rp ${kembalian.toLocaleString('id-ID')}` : `Rp ${(-kembalian).toLocaleString('id-ID')}`;
            // Assuming the kembalian row is part of the printed receipt HTML
            const kembalianRowIndex = receiptHTML.indexOf('<tr><td>Kembali</td><td style="text-align:right">');
            if (kembalianRowIndex !== -1) {
                const kembalianRowStart = kembalianRowIndex + '<tr><td>Kembali</td><td style="text-align:right">'.length;
                const kembalianRowEnd = receiptHTML.indexOf('</td></tr>', kembalianRowStart);
                receiptHTML = receiptHTML.substring(0, kembalianRowStart) +
                            kembalianFormatted +
                            receiptHTML.substring(kembalianRowEnd);
            }
        }
