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

// ================= FORMAT =================
function formatRupiah(angka) {
  return "Rp " + (angka || 0).toLocaleString("id-ID");
}

// ================= PAGU =================
function updatePagu() {
  pagu = parseInt(document.getElementById("paguInput").value) || 0;

  document.getElementById("tahap1").innerText = formatRupiah(pagu / 2);
  document.getElementById("tahap2").innerText = formatRupiah(pagu / 2);

  render();
}

function exportExcel() {
  let wb = XLSX.utils.book_new();

  // ================= SHEET 1 (REKAP)
  let rekap = [
    ["Komponen", "%", "Besaran", "Input", "Sisa"]
  ];

  data.forEach(item => {
    let besaran = pagu * item.persen / 100;
    let sisa = besaran - item.input;

    rekap.push([
      item.nama,
      item.persen + "%",
      besaran,
      item.input,
      sisa
    ]);
  });

  let ws1 = XLSX.utils.aoa_to_sheet(rekap);
  XLSX.utils.book_append_sheet(wb, ws1, "Rekap");

  // ================= SHEET 2 (DETAIL)
  let detailSheet = [
    ["Komponen", "Sub", "Kegiatan", "Uraian", "Volume", "Satuan", "Harga", "Jumlah", "Tanggal", "Keterangan"]
  ];

  Object.keys(detailData).forEach(nama => {
    detailData[nama].forEach(item => {
      detailSheet.push([
        nama,
        item.sub,
        item.kegiatan,
        item.uraian,
        item.satuan,
        item.harga,
        item.volume * item.harga,
        item.tanggal,
        item.keterangan
      ]);
    });
  });

  let ws2 = XLSX.utils.aoa_to_sheet(detailSheet);
  XLSX.utils.book_append_sheet(wb, ws2, "Detail");

  // ================= DOWNLOAD
  XLSX.writeFile(wb, "RKAS.xlsx");
}

// ================= RENDER TABLE =================
function render() {
  let tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  let totalInput = 0;

  data.forEach((item, i) => {
  let persen = parseInt(item.persen) || 0;
  let input = parseInt(item.input) || 0;

  let besaran = pagu * persen / 100;
  let sisa = besaran - input;

    totalInput += item.input;

    let row = `
      <tr>
        <td>${item.nama}</td>

        <td>
          <input type="number" value="${item.persen}" 
          onchange="updatePersen(${i}, this.value)">%
        </td>

        <td>${formatRupiah(besaran)}</td>

        <td>
          <input type="number" value="${item.input}" 
          onchange="updateInput(${i}, this.value)">
        </td>

        <td>${formatRupiah(sisa)}</td>

        <td>
          <button onclick="lihatDetail('${item.nama}')">🧐</button>
          <button onclick="editKomponen(${i})">✍</button>
          <button onclick="hapusKomponen(${i})">✖</button>
        </td>
      </tr>
    `;

    tbody.innerHTML += row;
  });

  document.getElementById("totalInput").innerText = formatRupiah(totalInput);
}

// ================= UPDATE =================
function updateInput(i, val) {
  data[i].input = parseInt(val) || 0;
  render();
}

function updatePersen(i, val) {
  data[i].persen = parseInt(val) || 0;
  render();
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

// ================= DETAIL =================
function renderDetail() {
  let table = document.getElementById("detailTable");
  table.innerHTML = "";

  let list = detailData[currentKomponen] || [];
  let totalSemua = 0;

  list.forEach((item, i) => {
    let jumlah = (item.satuan || 0) * (item.harga || 0); // 🔥 karena dianggap 1
    item.jumlah = jumlah;

    totalSemua += jumlah; // 🔥 HITUNG TOTAL

    let row = `
      <tr>
        <td>${i + 1}</td>

        <td><input value="${item.komponen}" onchange="updateDetail(${i}, 'komponen', this.value)"></td>
        <td><input value="${item.sub}" onchange="updateDetail(${i}, 'sub', this.value)"></td>
        <td><input value="${item.kegiatan}" onchange="updateDetail(${i}, 'kegiatan', this.value)"></td>
        <td><input value="${item.uraian}" onchange="updateDetail(${i}, 'uraian', this.value)"></td>
        
        <td><input type="number" value="${item.satuan}" onchange="updateDetail(${i}, 'satuan', this.value)"></td>
        <td><input type="number" value="${item.harga}" onchange="updateDetail(${i}, 'harga', this.value)"></td>

        <td>${formatRupiah(jumlah)}</td>

        <td><input type="date" value="${item.tanggal}" onchange="updateDetail(${i}, 'tanggal', this.value)"></td>
        <td><input value="${item.keterangan}" onchange="updateDetail(${i}, 'keterangan', this.value)"></td>

        <td>
          <button onclick="hapusItem(${i})">❌</button>
        </td>
      </tr>
    `;

    table.innerHTML += row;
  });

  // 🔥 TAMPILKAN TOTAL
  document.getElementById("totalDetail").innerText = formatRupiah(totalSemua);

  setTimeout(syncKeUtama, 0);
  console.log("TOTAL SEMUA:", totalSemua);
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
    komponen: "",
    sub: "",
    kegiatan: "",
    uraian: "",
    satuan: "pcs",
    harga: 1000,
    jumlah: 0,
    tanggal: "",
    keterangan: ""
  });

  renderDetail();
}

function updateDetail(i, field, value) {
  let item = detailData[currentKomponen][i];

  if (field === "harga" || field === "satuan") {
    item[field] = Number(value) || 0;
  } else {
    item[field] = value;
  }

  setTimeout(renderDetail, 0);
}

async function simpanData() {
  await setDoc(doc(db, "rkas", "dataUtama"), {
    pagu: pagu,
    komponen: data,
    detail: detailData
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
  }

  document.getElementById("paguInput").value = pagu;
  updatePagu();
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
window.updatePagu = updatePagu;
window.tambahKomponen = tambahKomponen;
window.updatePersen = updatePersen;
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