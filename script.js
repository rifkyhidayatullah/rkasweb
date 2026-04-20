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
function handleFile(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    const dataExcel = new Uint8Array(e.target.result);
    const workbook = XLSX.read(dataExcel, { type: 'array' });

    previewRekap = XLSX.utils.sheet_to_json(workbook.Sheets["Rekap"]);
    previewDetail = XLSX.utils.sheet_to_json(workbook.Sheets["Detail"]);

    showPreview();
  };

  reader.readAsArrayBuffer(file);
}

function toNumber(val) {
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9]/g, "")) || 0;
}

function showPreview() {
  const table = document.getElementById("previewTable");
  table.innerHTML = "";

  previewRekap.forEach(row => {
    let tr = `<tr>
      <td>${row["Komponen"]}</td>
      <td>${row["%"]}</td>
      <td>${row["Input"]}</td>
    </tr>`;
    table.innerHTML += tr;
  });

  document.getElementById("previewBox").style.display = "block";
}

async function confirmImport() {
  // ================= REKAP
  data = previewRekap.map(row => ({
    nama: row["Komponen"],
    persen: toNumber(row["%"]) || 0,
    input: toNumber(row["Input"])
  }));

  // ================= DETAIL
  detailData = {};

  previewDetail.forEach(row => {
    const nama = row["Komponen"];

    if (!detailData[nama]) {
      detailData[nama] = [];
    }

    console.log("IMPORT ROW:", row); // 🔥 DEBUG

    detailData[nama].push({
      namaBarang: row["Nama Barang/Jasa"] || "",
      sub: row["Sub"] || "",
      kegiatan: row["Kegiatan"] || "",
      uraian: row["Uraian"] || "", // 🔥 INI YANG BENAR
satuan: toNumber(row["Qty"]),
harga: toNumber(row["Harga"]),
      tanggal: row["Tanggal"] || "",
      keterangan: row["Keterangan"] || ""
    });
  });

  render();
  await simpanData();

  alert("Import sukses 🔥");
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

async function exportExcel() {
  const workbook = new ExcelJS.Workbook();

  // ================= CONFIG (EDIT SENDIRI) =================
  const sekolah = "TK Imam Bukhori";
  const kota = "Bekasi";
  const provinsi = "Jawa Barat";
  const dana = "BOP";
  const tahunInput = document.getElementById("tahunAjaran");
const tahun = tahunInput ? tahunInput.value : "-";

  // ================= SHEET REKAP =================
  const sheet1 = workbook.addWorksheet("Rekap");

  // 🧾 HEADER
  sheet1.mergeCells("A1:E1");
  sheet1.getCell("A1").value = "LAPORAN RKAS";
  sheet1.getCell("A1").font = { size: 16, bold: true };
  sheet1.getCell("A1").alignment = { horizontal: "center" };

  sheet1.mergeCells("A2:E2");
  sheet1.getCell("A2").value = "TAHUN ANGGARAN " + tahun;
  sheet1.getCell("A2").alignment = { horizontal: "center" };

  sheet1.addRow([]);
  sheet1.addRow(["Nama Sekolah", ":", sekolah]).font ={bold: true};
  sheet1.addRow(["Kab/Kota", ":", kota]).font ={bold: true};
  sheet1.addRow(["Provinsi", ":", provinsi]).font ={bold: true};
  sheet1.addRow(["Sumber Dana", ":", dana]).font ={bold: true};

  sheet1.addRow([]);

  // 📊 HEADER TABLE
  sheet1.addRow(["Komponen", "%", "Input"]);

  let totalInput = 0;

  data.forEach(item => {
      let persen = toNumber(item.persen);
    let input = toNumber(item.input);
    

    totalInput += input;

    sheet1.addRow([
      item.nama,
      persen,
      input
  
    ]);
  });

let sisaDana = pagu - totalInput;

  sheet1.addRow([]);
  sheet1.addRow(["SISA DANA", "", sisaDana]);
  sheet1.addRow(["TOTAL", "", totalInput]);

  // 🎨 STYLE HEADER TABLE
  sheet1.getRow(9).eachCell(cell => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "2E7D32" } // hijau elegan
    };
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: "center" };
  });

  // 📏 FORMAT ANGKA
  sheet1.columns = [
    { width: 30 },
    { width: 10 },
    { width: 20 }

  ];

  sheet1.eachRow((row, rowNumber) => {
    if (rowNumber >= 10) {
      row.getCell(3).numFmt = '"Rp" #,##0';
    }
  });

  // ================= SHEET DETAIL =================
  const sheet2 = workbook.addWorksheet("Detail");

  sheet2.mergeCells("A1:H1");
  sheet2.getCell("A1").value = "DETAIL RKAS";
  sheet2.getCell("A1").font = { size: 16, bold: true };
  sheet2.getCell("A1").alignment = { horizontal: "center" };

  sheet2.addRow([]);

  sheet2.addRow([
    "Komponen",
    "Nama Barang",
    "Uraian",
    "Qty",
    "Harga",
    "Jumlah",
    "Tanggal",
    "Keterangan"
  ]);

  let grandTotal = 0;

  Object.keys(detailData).forEach(nama => {
    sheet2.addRow([nama]);

    let subtotal = 0;

    detailData[nama].forEach(item => {
      let qty = Number(item.satuan) || 0;
let harga = Number(item.harga) || 0;
let jumlah = qty * harga;
      subtotal += jumlah;
      grandTotal += jumlah;

      sheet2.addRow([
        "",
        item.namaBarang,
        item.uraian,
        item.satuan,
        item.harga,
        jumlah,
        item.tanggal,
        item.keterangan + (item.bukti ? " | Bukti: " + item.bukti : "")
      ]);
    });

    // 🔥 SUBTOTAL
    sheet2.addRow(["", "", "", "Subtotal", subtotal]);
    sheet2.addRow([]);
  });

  // 🔥 GRAND TOTAL
  sheet2.addRow(["", "", "", "GRAND TOTAL", grandTotal]);

  // 🎨 HEADER DETAIL
  sheet2.getRow(3).eachCell(cell => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1565C0" } // biru elegan
    };
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
  });

sheet2.columns = [
  { width: 20 }, // Komponen
  { width: 25 }, // Nama Barang
  { width: 30 }, // Uraian
  { width: 10 }, // Qty
  { width: 20 }, // Harga
  { width: 20 }, // Jumlah
  { width: 15 }, // Tanggal
  { width: 25 }  // Keterangan
];

  // FORMAT RUPIAH
  sheet2.eachRow((row, i) => {
    if (i >= 4) {
      row.getCell(4).numFmt = '"Rp" #,##0';
      row.getCell(5).numFmt = '"Rp" #,##0';
    }
  });

  // 📏 BORDER
  function border(sheet) {
    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });
  }

  border(sheet1);
  border(sheet2);

  // 💾 DOWNLOAD
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer]);

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "RKAS_PRO.xlsx";
  a.click();
}

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
                legend: { display: false } // Legend kita buat custom di bawah
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });

    // 3. Render Legend Custom (Warna Otomatis)
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
        // Menggunakan rotasi Hue (360/count) agar warna tersebar merata
        // Saturation 70% dan Lightness 60% agar warna cerah & modern
        const hue = (i * (360 / count)) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
}

// ================= RENDER TABLE =================
// Ganti bagian akhir fungsi render() Anda untuk menyesuaikan dengan baris tabel premium
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

  // Animasi Angka Berjalan (Counter)
  document.querySelectorAll('.persen').forEach(el => {
    const target = parseFloat(el.getAttribute('data-target'));
    let current = 0;
    const increment = target / 25; // Kecepatan gerak
    
    const updateCount = () => {
      if (current < target) {
        current += increment;
        el.innerText = current.toFixed(1) + '%';
        requestAnimationFrame(updateCount); // Lebih smooth daripada setTimeout
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

async function simpanData() {
  await setDoc(doc(db, "rkas", "dataUtama"), {
    pagu: pagu,
    komponen: data,
    detail: detailData,
    tahunAjaran: document.getElementById("tahunAjaran").value
  });

  console.log("Auto save jalan 🔥");
}

async function loadData() {
  const docRef = doc(db, "rkas", "dataUtama");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    let d = docSnap.data();

    pagu = d.pagu || 0;
    data = d.komponen || [];
    detailData = d.detail || {};

    document.getElementById("tahunAjaran").value = d.tahunAjaran || "";
  }

  document.getElementById("paguInput").value = formatAngka(pagu);
  render(); 
  updatePagu();
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
