// 🔥 IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, setDoc, getDocs, doc, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 CONFIG (GANTI PUNYA KAMU)
const firebaseConfig = {
    apiKey: "AIzaSyCuZBG43SG6BmxN3VYVQgJRh2sPk0P-UK0",
  authDomain: "rkasweb.firebaseapp.com",
  projectId: "rkasweb",
  storageBucket: "rkasweb.firebasestorage.app",
  messagingSenderId: "878789834712",
  appId: "1:878789834712:web:b23714fc813a13c980a4ad",
  measurementId: "G-9B21RHQ9YR"
};

// 🔥 INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let pagu = 0;
let data = [];
let detailData = {};
let currentKomponen = "";
let previewRekap = [];
let previewDetail = [];

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

// ================= DRAG & DROP =================
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", (e) => {
  handleFile(e.target.files[0]);
});

// ================= HANDLE FILE =================
window.handleFile = function(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataExcel = new Uint8Array(e.target.result);
    const workbook = XLSX.read(dataExcel, { type: 'array' });

    // Ambil sheet pertama untuk rekap, kedua untuk detail (asumsi standar)
    previewRekap = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    previewDetail = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]]);

    showPreview(); // Memunculkan #previewBox yang ada di index.html
  };
  reader.readAsArrayBuffer(file);
};
function toNumber(val) {
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9]/g, "")) || 0;
}

window.showPreview = function() {
  const table = document.getElementById("previewTable");
  const box = document.getElementById("previewBox");
  if (!table || !box) return;

  table.innerHTML = `<thead><tr><th>Komponen</th><th>Persen</th><th>Input</th></tr></thead>`;
  
  previewRekap.forEach(row => {
    table.innerHTML += `
      <tr>
        <td>${row["Komponen"] || row["KOMPONEN"] || "-"}</td>
        <td>${row["%"] || "0%"}</td>
        <td>${formatRupiah(toNumber(row["Input"] || row["Input"]))}</td>
      </tr>`;
  });

  box.style.display = "block"; // Munculkan box preview
  box.scrollIntoView({ behavior: 'smooth' });
};

async function confirmImport() {
  if (previewRekap.length === 0) return alert("Gak ada data buat diimport, Wir!");

  // 1. Proses Rekap (Dashboard Utama)
  data = previewRekap.map(row => ({
    nama: row["Komponen"] || row["KOMPONEN"],
    persen: toNumber(row["%"]),
    input: toNumber(row["Input"] || row["TERPAKAI"])
  }));

  // 2. Proses Detail (Rincian Barang)
  detailData = {};
  previewDetail.forEach(row => {
    const namaKomp = row["Komponen"] || row["KOMPONEN"];
    if (!namaKomp) return;

    if (!detailData[namaKomp]) detailData[namaKomp] = [];

    detailData[namaKomp].push({
      namaBarang: row["Nama Barang/Jasa"] || row["NAMA BARANG"] || row["Item"] || "-",
      sub: row["Sub"] || row["SUB"] || "",
      uraian: row["Uraian"] || row["URAIAN"] || "-",
      satuan: toNumber(row["Qty"] || row["QTY"]),
      harga: toNumber(row["Harga"] || row["HARGA"]),
      tanggal: row["Tanggal"] || new Date().toISOString().split('T')[0],
      bukti: "" // Bukti baru kosong dulu
    });
  });

  // 3. Finalisasi
  render(); // Update tampilan dashboard
  await simpanData(); // Langsung auto-save ke Firebase

  document.getElementById("previewBox").style.display = "none";
  alert("Import Sukses & Tersimpan ke Database! 🔥");
}

// ================= FORMAT =================
function formatRupiah(angka) {
  return "Rp " + (angka || 0).toLocaleString("id-ID");
}

function parseAngka(val) {
  return Number(String(val).replace(/\./g, "").replace(/[^0-9]/g, "")) || 0;
}

// ================= PAGU =================
async function updatePagu() {
  pagu = parseAngka(document.getElementById("paguInput").value);

  document.getElementById("tahap1").innerText = formatRupiah(pagu / 2);
  document.getElementById("tahap2").innerText = formatRupiah(pagu / 2);

  render();
  await simpanData(); 
}

function updateJam() {
    const now = new Date();
    
    // Format Jam: 00:00:00
    const jam = now.getHours().toString().padStart(2, '0');
    const menit = now.getMinutes().toString().padStart(2, '0');
    const detik = now.getSeconds().toString().padStart(2, '0');
    
    // Format Tanggal: Senin, 20 Apr 2026
    const opsiTanggal = { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    };
    const tanggalStr = now.toLocaleDateString("id-ID", opsiTanggal);

    // Update Elemen
    const elJam = document.getElementById("txt-jam");
    const elTgl = document.getElementById("txt-tanggal");
    
    if(elJam) elJam.innerText = `${jam}:${menit}:${detik}`;
    if(elTgl) elTgl.innerText = tanggalStr;
}

// Jalankan interval
setInterval(updateJam, 1000);
updateJam();

async function importExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async function(e) {
    const dataExcel = new Uint8Array(e.target.result);
    const workbook = XLSX.read(dataExcel, { type: 'array' });

    // ================= REKAP
    const sheetRekap = workbook.Sheets["Rekap"];
    const jsonRekap = XLSX.utils.sheet_to_json(sheetRekap);

    data = jsonRekap.map(row => ({
      nama: row["Komponen"],
      persen: toNumber(row["%"]) || 0,
      input: toNumber(row["Input"])
    }));

    // ================= DETAIL
    const sheetDetail = workbook.Sheets["Detail"];
    const jsonDetail = XLSX.utils.sheet_to_json(sheetDetail);

    detailData = {};

    jsonDetail.forEach(row => {
      const nama = row["Komponen"];

      if (!detailData[nama]) {
        detailData[nama] = [];
      }

      console.log("IMPORT ROW:", row); // 🔥 DEBUG

      detailData[nama].push({
        barang: row["Nama Barang/Jasa"] || "",
        sub: row["Sub"] || "",
        kegiatan: row["Kegiatan"] || "",
        uraian: row["Uraian"] || "", // 🔥 FIX
        satuan: Number(row["Qty"]) || 0,
        harga: Number(row["Harga"]) || 0,
        tanggal: row["Tanggal"] || "",
        keterangan: row["Keterangan"] || ""
      });
    });

    render();
    await simpanData();

    alert("Import berhasil 🔥");
  };

  reader.readAsArrayBuffer(file);
}

window.importExcel = importExcel;

window.exportExcel = async function() {
    const workbook = new ExcelJS.Workbook();
    const tahun = document.getElementById("inputTahunAjaran").value || "2025/2026";
    const namaTK = "TKIT IMAM BUKHARI"; // Branding sekolah
    
    // --- SHEET 1: REKAPITULASI (Tanpa Kolom Keterangan) ---
    const sheet1 = workbook.addWorksheet('Rekap Anggaran');
    
    // Header Judul
    sheet1.mergeCells('A1:D1');
    sheet1.getCell('A1').value = 'REKAPITULASI ANGGARAN (RKAS)';
    sheet1.getCell('A1').font = { size: 14, bold: true };
    sheet1.getCell('A1').alignment = { horizontal: 'center' };

    sheet1.mergeCells('A2:D2');
    sheet1.getCell('A2').value = namaTK + " - TA " + tahun;
    sheet1.getCell('A2').font = { size: 11, bold: true };
    sheet1.getCell('A2').alignment = { horizontal: 'center' };
    sheet1.addRow([]); // Spasi

    // Header Tabel Rekap (Hanya 4 Kolom Utama)
    const headerRekap = ['NO', 'NAMA KOMPONEN', 'PERSENTASE', 'TOTAL ANGGARAN'];
    const rowHeader1 = sheet1.addRow(headerRekap);
    rowHeader1.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // Isi Data Rekap
    data.forEach((k, i) => {
        const row = sheet1.addRow([
            i + 1, 
            k.nama, 
            (k.input / (pagu || 1) * 100).toFixed(1) + '%', 
            k.input
        ]);
        row.getCell(4).numFmt = '#,##0';
        row.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
    });

    // --- SHEET 2: DETAIL RINCIAN (Redesign Total & Rapi) ---
    const sheet2 = workbook.addWorksheet('Detail Rincian');
    
    // Judul Besar
    sheet2.mergeCells('A1:G1');
    sheet2.getCell('A1').value = 'DAFTAR RINCIAN PENGGUNAAN DANA';
    sheet2.getCell('A1').font = { size: 14, bold: true };
    sheet2.addRow(['Tahun Ajaran: ' + tahun]);
    sheet2.addRow([]); 

    // Header Tabel Detail
    const headerDetail = ['NO', 'TANGGAL', 'NAMA BARANG / JASA', 'URAIAN', 'QTY', 'HARGA', 'TOTAL'];
    const rowHeader2 = sheet2.addRow(headerDetail);
    rowHeader2.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22D3EE' } };
        cell.font = { bold: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // Looping per Komponen agar terkelompok rapi
    Object.keys(detailData).forEach(komponenNama => {
        // Baris Pemisah Komponen
        const compRow = sheet2.addRow(['KOMPONEN: ' + komponenNama]);
        sheet2.mergeCells(`A${compRow.number}:G${compRow.number}`);
        compRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        compRow.getCell(1).font = { bold: true };

        const items = detailData[komponenNama] || [];
        items.forEach((item, idx) => {
            const row = sheet2.addRow([
                idx + 1,
                item.tanggal || "-",
                item.namaBarang || "-",
                item.uraian || "-",
                item.satuan || 0,
                item.harga || 0,
                (item.satuan || 0) * (item.harga || 0)
            ]);
            
            // Format angka & Border
            row.getCell(6).numFmt = '#,##0';
            row.getCell(7).numFmt = '#,##0';
            row.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        });
    });

    // Set Lebar Kolom Otomatis
    sheet1.columns = [{width: 5}, {width: 40}, {width: 15}, {width: 25}];
    sheet2.columns = [{width: 5}, {width: 15}, {width: 30}, {width: 35}, {width: 10}, {width: 20}, {width: 25}];

    // --- DOWNLOAD ---
const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `RKAS_${namaTK.replace(/ /g, '_')}_${tahun.replace(/\//g, '-')}.xlsx`;
    
    // Proses download
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    alert("Export Selesai! Detail sudah rapi. 🔥");
};
// --- LOGIKA MODAL GANTI PIN ---
window.openPinModal = () => {
    document.getElementById('pinModal').style.display = 'flex';
};

window.closePinModal = () => {
    document.getElementById('pinModal').style.display = 'none';
};

// Di dalam script arsip.html
async function loadDataArsip() {
    // 1. Cek elemen input (kita cari ID lama 'selectTahun' ATAU ID baru 'inputTahunAjaran')
    const inputEl = document.getElementById("selectTahun") || 
                    document.getElementById("inputTahunAjaran") || 
                    document.getElementById("cariTahunArsip");

    // Jika elemen tidak ditemukan sama sekali di HTML
    if (!inputEl) {
        console.error("Error: Elemen input tahun ajaran tidak ditemukan di HTML!");
        alert("Sistem error: Elemen input tidak ditemukan.");
        return;
    }

    const tahunRaw = inputEl.value.trim();
    if (!tahunRaw) {
        alert("Harap masukkan Tahun Ajaran (Contoh: 2025/2026)");
        return;
    }

    // 2. Bersihkan karakter '/' menjadi '-' agar bisa dibaca Firebase
    const tahunID = tahunRaw.replace(/\//g, "-");
    
    const display = document.getElementById("arsipDisplay");
    if (display) display.innerHTML = "<p style='color: white;'>Membongkar arsip...</p>";

    try {
        // Ambil data dari koleksi rkas_arsip
        const docRef = doc(db, "rkas_arsip", tahunID);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const d = snap.data();
            
            // Tampilkan Data ke layar
            if (display) {
                display.innerHTML = `
                    <div class="card-arsip" style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; border: 1px solid #22d3ee;">
                        <h2 style="color: #22d3ee;">Tahun Ajaran: ${d.tahun_ajaran}</h2>
                        <h3 style="color: #fbbf24;">Total Pagu: Rp ${d.total_pagu.toLocaleString()}</h3>
                        <div style="margin-top: 20px;">
                            ${renderKomponenArsip(d.data_komponen, d.detail_komponen)}
                        </div>
                    </div>
                `;
            }
            alert("Data Berhasil Ditemukan! 🔥");
        } else {
            if (display) display.innerHTML = `<p style="color: #ff4444;">Data tahun ${tahunRaw} tidak ditemukan.</p>`;
        }
    } catch (err) {
        console.error("Error Firebase:", err);
        alert("Gagal koneksi ke database!");
    }
}

// --- PROSES GANTI PIN KE FIREBASE ---
async function processChangePin() {
    const oldPin = document.getElementById("oldPin").value;
    const newPin = document.getElementById("newPin").value;
    const confirmPin = document.getElementById("confirmNewPin").value;

    if (!oldPin || !newPin || !confirmPin) return alert("Isi semua kolom, Wir!");
    if (newPin !== confirmPin) return alert("Konfirmasi PIN baru gak cocok!");

    try {
        const pinRef = doc(db, "settings", "access_control");
        const snap = await getDoc(pinRef);

        if (snap.exists() && oldPin === snap.data().pin) {
            // Update PIN baru di Firestore
            await setDoc(pinRef, { pin: newPin }, { merge: true });
            alert("PIN Berhasil diperbarui! 🔥");
            closePinModal();
            // Reset form
            document.getElementById("oldPin").value = "";
            document.getElementById("newPin").value = "";
            document.getElementById("confirmNewPin").value = "";
        } else {
            alert("PIN Lama salah! Akses ditolak.");
        }
    } catch (err) {
        console.error(err);
        alert("Gagal konek database!");
    }
}
window.processChangePin = processChangePin;

function formatAngka(angka) {
  return (angka || 0).toLocaleString("id-ID");
}

let chart;

function renderChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    const labels = data.map(item => item.nama);
    const values = data.map(item => parseAngka(item.input) || 0);
    
    // Auto-generate warna sebanyak jumlah komponen
    const dynamicColors = generateDynamicColors(data.length);

    if (window.chartInstance) {
        window.chartInstance.destroy();
    }

    window.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: dynamicColors,
                borderWidth: 0,
                hoverOffset: 20
            }]
        },
        options: {
            cutout: '75%',
            plugins: {
                legend: { display: false } 
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });

    
    const legendContainer = document.getElementById('legendCustom');
    legendContainer.innerHTML = '';
    data.forEach((item, i) => {
        legendContainer.innerHTML += `
            <div class="legend-item" data-aos="fade-left" data-aos-delay="${i * 50}">
                <span class="dot" style="background: ${dynamicColors[i]}"></span>
                <span class="label">${item.nama}</span>
            </div>
        `;
    });
}

function generateDynamicColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * (360 / count)) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
}

function render() {
  let tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  let totalInputVal = 0;
  let totalSemua = data.reduce((sum, item) => sum + parseAngka(item.input), 0);

  data.forEach((item, i) => {
    let input = parseAngka(item.input) || 0;
    let persen = pagu ? (input / pagu * 100) : 0;
    totalInputVal += input;

    let row = `
      <tr class="table-row" data-aos="fade-up">
        <td style="font-weight: bold; color: #291056;">${item.nama}</td>
        <td>
          <div class="progress">
            <div class="progress-bar" style="width:${persen}%"></div>
          </div>
        </td>
        <td class="persen" data-target="${persen.toFixed(1)}">0%</td>
        <td class="rupiah">
           <strong>${formatRupiah(input)}</strong>
        </td>
        <td class="aksi-group-modern">
          <button class="btn-icon view" onclick="lihatDetail('${item.nama}')" title="Detail">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-icon edit" onclick="editKomponen(${i})" title="Edit">
          <i class="fas fa-pen-nib"></i>
        </button>
        <button class="btn-icon delete" onclick="hapusKomponen(${i})" title="Hapus">
          <i class="fas fa-trash-alt"></i>
        </button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
  document.querySelectorAll('.persen').forEach(el => {
    const target = parseFloat(el.getAttribute('data-target'));
    let current = 0;
    const increment = target / 25; 
    
    const updateCount = () => {
      if (current < target) {
        current += increment;
        el.innerText = current.toFixed(1) + '%';
        requestAnimationFrame(updateCount); 
      } else {
        el.innerText = target.toFixed(1) + '%';
      }
    };
    updateCount();
  });

  document.getElementById("totalInput").innerText = formatRupiah(totalInputVal);
  document.getElementById("sisaDana").innerText = formatRupiah(pagu - totalInputVal);
  renderChart();
}

async function arsipDataTahun() {
    const tahun = document.getElementById("tahunAjaran").value;
    if(!tahun) return alert("Isi Tahun Ajaran dulu, Wir!");

    const confirmSave = confirm(`Simpan semua data untuk Tahun Ajaran ${tahun}?`);
    
    if(confirmSave) {
        try {
            await setDoc(doc(db, "rkas_history", tahun.replace("/", "-")), {
                tahun: tahun,
                pagu: pagu,
                komponen: data,
                detail: detailData,
                lastUpdate: new Date()
            });
            alert("Data Berhasil Diarsipkan! 🔥");
        } catch (e) {
            console.error(e);
            alert("Gagal simpan data, Wir.");
        }
    }
}

function renderLegend(labels, colors) {
  let html = "";

  labels.forEach((label, i) => {
    html += `
      <div class="legend-item">
        <span class="dot" style="background:${colors[i]}"></span>
        ${label}
      </div>
    `;
  });

  document.getElementById("legendCustom").innerHTML = html;
}

// ================= UPDATE =================
function updateInput(i, val) {
  data[i].input = parseAngka(val);
  render();
  simpanData();
}

function hapusKomponen(i) {
  let nama = data[i].nama;

  if (confirm("Yakin hapus komponen ini?")) {
    data.splice(i, 1);
    delete detailData[nama];
    render();
  }
}

// ================= TAMBAH =================
function tambahKomponen() {
  let nama = prompt("Nama Komponen:");
  if (!nama) return;

  data.push({
    nama: nama,
    persen: 0,
    input: 0
  });

  // otomatis bikin detail kosong
  detailData[nama] = [];

  render();
}

// ================= EDIT =================
function editKomponen(i) {
  let namaBaru = prompt("Edit Nama:", data[i].nama);
  if (!namaBaru) return;

  // pindahin detail juga
  detailData[namaBaru] = detailData[data[i].nama];
  delete detailData[data[i].nama];

  data[i].nama = namaBaru;

  render();
}

// ================= HAPUS =================
function hapusItem(i) {
  if (confirm("Hapus item ini?")) {
    detailData[currentKomponen].splice(i, 1);
    renderDetail();
  }
}

// ================= MODAL =================
function lihatDetail(nama) {
  currentKomponen = nama;

  document.getElementById("modalTitle").innerText = "Detail: " + nama;

  renderDetail();
  document.getElementById("modal").style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// ================= DETAIL =================
function renderDetail() {
  let table = document.getElementById("detailTable");
  table.innerHTML = "";
  let list = detailData[currentKomponen] || [];
  let totalSemua = 0;

  list.forEach((item, i) => {
    let jumlah = (item.satuan || 0) * (item.harga || 0);
    totalSemua += jumlah;

    let row = `
      <tr>
        <td align="center"><strong>${i + 1}</strong></td>
        <td>
          <input type="text" placeholder="Nama Barang" value="${item.namaBarang || ''}" onchange="updateDetail(${i}, 'namaBarang', this.value)">
          <div style="margin-top:5px; font-size:10px; color:#94a3b8">Kategori: ${currentKomponen}</div>
        </td>
        <td>
          <input type="text" placeholder="Sub/Kegiatan" value="${item.sub || ''}" onchange="updateDetail(${i}, 'sub', this.value)" style="margin-bottom:5px">
          <textarea placeholder="Uraian" onchange="updateDetail(${i}, 'uraian', this.value)">${item.uraian || ''}</textarea>
        </td>
        <td><input type="number" value="${item.satuan || 0}" onchange="updateDetail(${i}, 'satuan', this.value)"></td>
        <td><input type="number" value="${item.harga || 0}" onchange="updateDetail(${i}, 'harga', this.value)"></td>
        <td style="color:var(--primary); font-weight:800">${formatRupiah(jumlah)}</td>
        <td><input type="date" value="${item.tanggal}" onchange="updateDetail(${i}, 'tanggal', this.value)"></td>
        <td>
          <div class="aksi-group-modern">
            ${item.bukti ? `
              <img src="${item.bukti}" class="preview-img" onclick="openPreview('${item.bukti}')">
              <button class="btn-tiny-del" onclick="hapusBukti(${i})"><i class="fas fa-eraser"></i></button>
            ` : `
              <button class="btn-upload-modern" onclick="document.getElementById('file${i}').click()">
                <i class="fas fa-paperclip"></i> Upload
              </button>
            `}
            <input type="file" id="file${i}" hidden onchange="uploadBukti(${i}, this)">
            <button class="btn-tiny-del danger" onclick="hapusItem(${i})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
    table.innerHTML += row;
  });

  document.getElementById("totalDetail").innerText = formatRupiah(totalSemua);
  syncKeUtama(); // Pastikan data terupdate ke dashboard utama
}

function zoomGambar(url) {
  const win = window.open();
  win.document.write(`
    <img src="${url}" style="width:100%">
  `);
}

function updateBulan(i, bulan, value) {
  detailData[currentKomponen][i].bulan[bulan] = parseInt(value) || 0;
}

// ================= TAMBAH ITEM =================
function tambahItem() {
  if (!currentKomponen) {
    alert("Pilih komponen dulu!");
    return;
  }

  if (!detailData[currentKomponen]) {
    detailData[currentKomponen] = [];
  }

  detailData[currentKomponen].push({
    namaBarang: "",
    sub: "",
    kegiatan: "",
    uraian: "",
    satuan: 1,
    harga: 1000,
    jumlah: 0,
    tanggal: "",
    keterangan: "",
    bukti: ""
  });

  renderDetail();
}

function updateDetail(i, field, value) {
  let item = detailData[currentKomponen][i];

  if (field === "harga" || field === "satuan") {
    let angka = parseInt(value);
    item[field] = isNaN(angka) ? 0 : angka; // 🔥 aman dari NaN
  } else {
    item[field] = value || "";
  }

  setTimeout(renderDetail, 0);
}

// Tambahkan/Update fungsi ini di script.js
async function muatDataOtomatis() {
  // Ambil apa yang ada di input tahun ajaran saat ini
  let tahunRaw = document.getElementById("inputTahunAjaran").value.trim();
  
  // Jika input kosong, kita kasih default ke data terbaru atau jangan lanjut
  if (!tahunRaw) {
    console.log("Input tahun kosong, mencoba muat data pusat...");
    tahunRaw = "pagu_data"; // Sesuaikan dengan nama dokumen di Firebase kamu
  }

  // Bersihkan ID (Ganti / jadi -)
  const tahunID = tahunRaw.replace(/\//g, "-");

  try {
    const docRef = doc(db, "rkas", tahunID); // Sesuaikan koleksinya 'rkas' atau 'rkas_arsip'
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const d = snap.data();
      pagu = d.pagu || 0;
      data = d.data || d.data_komponen || [];
      detailData = d.detail_komponen || d.detailData || {};
      
      // Update UI
      document.getElementById("pagu-display").innerText = pagu.toLocaleString();
      renderKomponen(); 
      console.log("Data Berhasil Muncul!");
    } else {
      console.error("Data tidak ditemukan di database untuk ID: " + tahunID);
    }
  } catch (err) {
    console.error(err);
    alert("Koneksi data terhambat! Periksa koneksi internet atau config Firebase.");
  }
}
// Ganti fungsi simpanData kamu dengan versi "Safety First" ini:
async function simpanData() {
  const inputTahun = document.getElementById("inputTahunAjaran");
  if (!inputTahun) return; // Jaga-jaga kalau elemennya gak ketemu

  let tahunRaw = inputTahun.value.trim();
  
  // 🔥 CEK PENTING: Kalau tahun kosong, jangan lanjut simpan!
  if (!tahunRaw || tahunRaw === "") {
    console.warn("Simpan dibatalkan: Tahun Ajaran kosong.");
    return; 
  }

  // Bersihkan "/" jadi "-" untuk ID Firebase
  const tahunID = tahunRaw.replace(/\//g, "-");

  try {
    // 1. Simpan ke data utama (Dashboard)
    await setDoc(doc(db, "rkas", "pagu_data"), { 
      pagu, 
      data, 
      detailData, 
      tahunAjaran: tahunRaw 
    });

    // 2. Simpan ke Arsip (ID pakai tahunID yang bersih)
    await setDoc(doc(db, "rkas_arsip", tahunID), {
      tahun_ajaran: tahunRaw,
      total_pagu: pagu,
      data_komponen: data,
      detail_komponen: detailData,
      update_terakhir: new Date().toLocaleString("id-ID")
    });

    console.log(`Auto-Save Berhasil: ${tahunRaw}`);
  } catch (err) {
    console.error("Gagal Auto-Save:", err);
  }
}

async function loadData() {
  // 1. Sesuaikan nama dokumen. 
  // Jika di Firebase kamu simpan sebagai "pagu_data", ganti "dataUtama" jadi "pagu_data"
  const docRef = doc(db, "rkas", "pagu_data"); 
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    let d = docSnap.data();

    pagu = d.pagu || 0;
    // Pastikan nama field di database sama (komponen vs data_komponen)
    data = d.komponen || d.data || []; 
    detailData = d.detail || d.detailData || {};

    // 2. CEK SAFETY ID: Pastikan ID-nya ada di index.html
    const elTahun = document.getElementById("inputTahunAjaran") || document.getElementById("tahunAjaran");
    if (elTahun) {
      elTahun.value = d.tahunAjaran || "";
    }
  }

  // 3. CEK SAFETY ID PAGU
  const elPagu = document.getElementById("paguInput");
  if (elPagu) {
    elPagu.value = formatAngka(pagu);
  }

  // Jalankan fungsi render
  if (typeof render === "function") render(); 
  if (typeof updatePagu === "function") updatePagu();
  
  console.log("Data berhasil dimuat tanpa error! 🔥");
}

function hapusBukti(index) {
  if (!confirm("Hapus bukti ini?")) return;

  detailData[currentKomponen][index].bukti = "";

  simpanData();
  renderDetail();
}

async function syncKeUtama() {
  let list = detailData[currentKomponen] || [];

  let total = list.reduce((sum, item) => {
    return sum + ((item.satuan || 0) * (item.harga || 0));
  }, 0);

  let comp = data.find(d => d.nama === currentKomponen);
  if (comp) {
    comp.input = total;
  }

  render();

  // 🔥 AUTO SAVE
  await simpanData();
}

function openPreview(url) {
  document.getElementById("imageModal").style.display = "flex";
  document.getElementById("modalImg").src = url;
}

function closePreview() {
  document.getElementById("imageModal").style.display = "none";
}

async function uploadBukti(index, input) {
  const file = input.files[0]; // 🔥 INI WAJIB
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "rkas_upload"); // pastikan benar
    formData.append("folder", "rkas_bukti");

    const res = await fetch("https://api.cloudinary.com/v1_1/dasfuelus/image/upload", {
      method: "POST",
      body: formData
    });

    const dataRes = await res.json();

    console.log("UPLOAD RESULT:", dataRes);

    if (!dataRes.secure_url) {
      alert("Upload gagal ❌ (preset salah / belum aktif)");
      return;
    }

    const url = dataRes.secure_url;

    detailData[currentKomponen][index].bukti = url;

    await simpanData();
    renderDetail();

    alert("Upload bukti berhasil 🔥");

  } catch (err) {
    console.error(err);
    alert("Upload gagal ❌");
  }
}

window.uploadBukti = uploadBukti;
window.hapusBukti = hapusBukti;
window.updatePagu = updatePagu;
window.tambahKomponen = tambahKomponen;
window.updateInput = updateInput;
window.lihatDetail = lihatDetail;
window.editKomponen = editKomponen;
window.hapusKomponen = hapusKomponen;
window.tambahItem = tambahItem;
window.closeModal = closeModal;
window.simpanData = simpanData;
window.updateDetail = updateDetail;
window.hapusItem = hapusItem;
window.onload = loadData;
window.exportExcel = exportExcel;
window.openPreview = openPreview;
window.closePreview = closePreview;
window.confirmImport = confirmImport;
