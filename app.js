// ==========================================
// BACKEND PAYMENT (ANNISA) - PORT 3001
// ==========================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 3001; 

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) console.error("❌ Gagal konek DB Payment:", err.message);
    else console.log("✅ Server Payment (Annisa) Ready di Port 3001");
});

// --- ROUTES ---

// 1. GET ALL (Dengan Nama Pasien)
app.get("/api/invoices", async (req, res) => {
  try {
    const query = `
      SELECT i.id, i.total_amount, i.status, i.created_at,
        COALESCE(p.full_name, 'Pasien Tanpa Data') AS patient_name, p.mr_no
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET DETAIL
app.get("/api/invoices/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const invQuery = `
        SELECT i.*, p.full_name AS patient_name, p.mr_no 
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        WHERE i.id = $1`;
    const invoice = await pool.query(invQuery, [id]);
    
    if (invoice.rows.length === 0) return res.status(404).json({ message: "Not found" });

    const details = await pool.query("SELECT * FROM invoice_details WHERE invoice_id = $1", [id]);
    const payments = await pool.query("SELECT * FROM payments WHERE invoice_id = $1", [id]);

    res.json({ invoice: invoice.rows[0], details: details.rows, payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PROSES BAYAR (INI YANG KITA PERBAIKI)
app.post("/api/payments", async (req, res) => {
  // Tambahkan cashier_name di input body
  const { invoice_id, amount, method, cashier_name } = req.body;
  
  try {
    // A. AMBIL DATA TAGIHAN ASLI DULU (PENTING! Buat hitung kembalian)
    const invRes = await pool.query("SELECT total_amount FROM invoices WHERE id = $1", [invoice_id]);
    
    if (invRes.rows.length === 0) {
        return res.status(404).json({ error: "Invoice tidak valid" });
    }

    // --- DEFINISI VARIABEL (INI YANG SEBELUMNYA HILANG) ---
    const totalTagihan = Number(invRes.rows[0].total_amount);
    const uangDiterima = Number(amount); // Kita pakai nama variabel yang konsisten

    // B. HITUNG KEMBALIAN
    let changeAmount = 0;
    if (uangDiterima > totalTagihan) {
        changeAmount = uangDiterima - totalTagihan;
    }

    // C. SIMPAN KE DB
    // Sekarang variabel 'uangDiterima' dan 'changeAmount' sudah ada isinya
    await pool.query(
      `INSERT INTO payments (invoice_id, amount, method, change_amount, cashier_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [invoice_id, uangDiterima, method, changeAmount, cashier_name || "Kireina (Kasir)"]
    );

    // D. CEK STATUS LUNAS
    const paidRes = await pool.query("SELECT SUM(amount) FROM payments WHERE invoice_id = $1", [invoice_id]);
    const totalPaid = Number(paidRes.rows[0].sum) || 0;

    let status = (totalPaid >= totalTagihan) ? "paid" : "partial";

    // E. UPDATE STATUS INVOICE
    await pool.query("UPDATE invoices SET status = $1 WHERE id = $2", [status, invoice_id]);

    res.json({ 
        message: "Payment success", 
        new_status: status,
        change_amount: changeAmount // Kirim balik ke frontend biar bisa ditampilkan
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Tambahkan ini sebelum app.listen
app.get('/', (req, res) => {
    res.send('✅ Server Backend Payment (Annisa) is RUNNING! Buka file kasir.html untuk akses UI.');
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Payment running on http://localhost:${PORT}`);
});