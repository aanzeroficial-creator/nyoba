// Firebase JS SDK v10 Integration for Dashboard Guru (game-edu-da178)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration from User Credentials
const firebaseConfig = {
    apiKey: "AIzaSyDOgmxnWEFkoE4WzUXvqYlK_zkxdSQLI6k",
    authDomain: "game-edu-da178.firebaseapp.com",
    projectId: "game-edu-da178",
    storageBucket: "game-edu-da178.firebasestorage.app",
    messagingSenderId: "152391523724",
    appId: "1:152391523724:web:21bf1703d59a93f4c6caa9",
    measurementId: "G-YS5E0N1GTB"
};

// Default Fallback Store Items
const defaultItems = [
    {
        id: "local-1",
        name: "Pensil 2B Kebahagiaan",
        price: 3000,
        category: "alat_tulis",
        icon: "res://aset 2d/1000513844-removebg-preview.png",
        desc: "Pensil 2B kualitas tinggi untuk menulis di kelas"
    },
    {
        id: "local-2",
        name: "Paket Jangka Matematika",
        price: 13000,
        category: "alat_tulis",
        icon: "res://aset 2d/1000513843-removebg-preview.png",
        desc: "Set jangka dan penggaris melukis sudut"
    },
    {
        id: "local-3",
        name: "Roti Coklat Bergizi",
        price: 5000,
        category: "makanan",
        icon: "res://aset 2d/roti.png",
        desc: "Roti empuk selai coklat bergizi"
    },
    {
        id: "local-4",
        name: "Susu Kotak UHT",
        price: 6000,
        category: "makanan",
        icon: "res://aset 2d/susu.png",
        desc: "Susu segar kalsium tinggi untuk kesehatan"
    }
];

let app, db;
let shopItemsList = [];
let currentCategoryFilter = "all";
let isFirebaseOnline = false;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    initFirebase();
    setupNavigation();
    setupFormEvents();
    setupCategoryFilter();
    setupExportAndSync();
});

// Initialize Firebase & Listen Real-Time
function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        const itemsRef = collection(db, "shop_items");
        
        onSnapshot(itemsRef, (snapshot) => {
            isFirebaseOnline = true;
            shopItemsList = [];
            snapshot.forEach((docSnap) => {
                shopItemsList.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });
            
            renderItemsGrid();
            showToast("✅ Berhasil menyinkronkan data dari Firebase Firestore!");
        }, (error) => {
            console.warn("Firestore error:", error);
            isFirebaseOnline = false;
            renderItemsGrid();
            showToast("ℹ️ Mode offline. (Set aturan Firestore ke Public jika error permission)");
        });


    } catch (e) {
        console.error("Firebase init error:", e);
        renderItemsGrid();
    }

}

// Sidebar Tab Navigation Handler
function setupNavigation() {
    const navTabs = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    navTabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            navTabs.forEach(t => t.classList.remove("active"));
            btn.classList.add("active");

            tabContents.forEach(c => {
                if (c.id === `tab-${targetTab}`) {
                    c.classList.remove("hidden");
                } else {
                    c.classList.add("hidden");
                }
            });
        });
    });

    // Music toggle button
    let musicOn = true;
    const musicBtn = document.getElementById("btnMusicToggle");
    if (musicBtn) {
        musicBtn.addEventListener("click", () => {
            musicOn = !musicOn;
            musicBtn.textContent = musicOn ? "Musik: ON" : "Musik: OFF";
            musicBtn.style.backgroundColor = musicOn ? "#2ecc71" : "#7f8c8d";
        });
    }

    // Account switch button
    const accountBtn = document.getElementById("btnSwitchAccount");
    if (accountBtn) {
        accountBtn.addEventListener("click", () => {
            showToast("👤 Sesi Akun: Aan Rifai, S.Pd. (Guru Gaji Sejahtera)");
        });
    }
}

let uploadedImageDataUrl = "";

// Render Items Grid in Manajemen Toko
function renderItemsGrid() {
    const grid = document.getElementById("itemsGrid");
    if (!grid) return;

    let filtered = shopItemsList;
    if (currentCategoryFilter !== "all") {
        filtered = shopItemsList.filter(item => item.category === currentCategoryFilter);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state-banner"><p>Tidak ada barang belanja pada kategori ini.</p></div>`;
        return;
    }

    let html = "";
    filtered.forEach((item) => {
        const catLabel = item.category === "makanan" ? "Toko Makanan" : "Toko Buku & Alat";
        const imageSrc = item.icon && (item.icon.startsWith("http") || item.icon.startsWith("data:image")) 
            ? item.icon 
            : "https://api.dicebear.com/7.x/shapes/svg?seed=" + encodeURIComponent(item.name);

        html += `
            <div class="item-card-box">
                <div>
                    <img src="${imageSrc}" alt="${item.name}" class="item-img-preview" onerror="this.src='https://api.dicebear.com/7.x/shapes/svg?seed=item'">
                    <div class="item-name-text">${escapeHtml(item.name)}</div>
                    <div class="item-price-tag">${formatRupiah(item.price)}</div>
                    <span class="item-cat-badge">${catLabel}</span>
                </div>
                <div class="card-btn-row">
                    <button class="btn btn-sm btn-card-edit" onclick="editItem('${item.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-card-delete" onclick="deleteItem('${item.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// Form Handlers
function setupFormEvents() {
    const form = document.getElementById("itemForm");
    const btnReset = document.getElementById("btnResetForm");
    const fileInput = document.getElementById("itemFile");
    const previewBox = document.getElementById("imagePreviewBox");
    const previewImg = document.getElementById("imagePreviewImg");
    const btnRemovePreview = document.getElementById("btnRemovePreview");

    // Handle File Selection with Automatic Canvas Optimization
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const maxDim = 160;
                        let w = img.width;
                        let h = img.height;
                        if (w > h) {
                            if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
                        } else {
                            if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, w, h);
                        uploadedImageDataUrl = canvas.toDataURL("image/png");
                        if (previewImg) previewImg.src = uploadedImageDataUrl;
                        if (previewBox) previewBox.classList.remove("hidden");
                        showToast("📷 Foto di-compress & siap disimpan ke Firebase!");
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }


    if (btnRemovePreview) {
        btnRemovePreview.addEventListener("click", () => {
            uploadedImageDataUrl = "";
            if (fileInput) fileInput.value = "";
            if (previewBox) previewBox.classList.add("hidden");
        });
    }

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("itemId").value;
        const name = document.getElementById("itemName").value.trim();
        const price = parseInt(document.getElementById("itemPrice").value) || 0;
        const category = document.getElementById("itemCategory").value;
        let icon = document.getElementById("itemIcon").value.trim();
        const desc = document.getElementById("itemDesc").value.trim();

        // Use uploaded photo Data URL if available
        if (uploadedImageDataUrl) {
            icon = uploadedImageDataUrl;
        } else if (!icon) {
            icon = "res://icon.svg";
        }

        if (!name || price <= 0) {
            showToast("⚠️ Mohon isi Nama Barang dan Harga secara valid!");
            return;
        }

        const itemPayload = {
            name,
            price,
            category,
            icon,
            desc,
            updatedAt: serverTimestamp()
        };

        try {
            if (id && isFirebaseOnline) {
                const docRef = doc(db, "shop_items", id);
                await updateDoc(docRef, itemPayload);
                showToast(`✅ Barang "${name}" berhasil diperbarui!`);
            } else if (isFirebaseOnline) {
                const collRef = collection(db, "shop_items");
                await addDoc(collRef, itemPayload);
                showToast(`✅ Barang "${name}" & foto berhasil disimpan ke Firebase!`);
            } else {
                if (id) {
                    const idx = shopItemsList.findIndex(i => i.id === id);
                    if (idx !== -1) shopItemsList[idx] = { id, ...itemPayload };
                } else {
                    shopItemsList.push({ id: "local-" + Date.now(), ...itemPayload });
                }
                renderItemsGrid();
                showToast(`✅ Barang "${name}" & foto tersimpan di memori lokal!`);
            }

            resetForm();
        } catch (err) {
            console.error("Save error:", err);
            showToast("❌ Gagal menyimpan data: " + err.message);
        }
    });

    if (btnReset) {
        btnReset.addEventListener("click", resetForm);
    }
}


// Edit item window expose
window.editItem = function(id) {
    const item = shopItemsList.find(i => i.id === id);
    if (!item) return;

    document.getElementById("itemId").value = item.id;
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemPrice").value = item.price;
    document.getElementById("itemCategory").value = item.category || "makanan";
    document.getElementById("itemIcon").value = item.icon || "";
    document.getElementById("itemDesc").value = item.desc || "";

    document.getElementById("formModeTitle").textContent = "✏️ Edit Barang Toko";
    document.getElementById("btnSubmitForm").innerHTML = "<span>💾 Update Barang</span>";
    document.getElementById("btnResetForm").style.display = "inline-flex";

    // Auto switch to Toko tab if not active
    document.querySelector('.nav-tab[data-tab="manajementoko"]').click();
};

// Delete item window expose
window.deleteItem = async function(id) {
    const item = shopItemsList.find(i => i.id === id);
    const itemName = item ? item.name : "barang ini";

    if (!confirm(`Apakah Anda yakin ingin menghapus "${itemName}" dari Toko Game?`)) {
        return;
    }

    try {
        if (isFirebaseOnline && !id.startsWith("local-")) {
            await deleteDoc(doc(db, "shop_items", id));
            shopItemsList = shopItemsList.filter(i => i.id !== id);
            renderItemsGrid();
            showToast(`🗑️ Barang "${itemName}" berhasil dihapus!`);
        } else {
            shopItemsList = shopItemsList.filter(i => i.id !== id);
            renderItemsGrid();
            showToast(`🗑️ Barang "${itemName}" dihapus!`);
        }
    } catch (err) {
        console.error("Delete error:", err);
        shopItemsList = shopItemsList.filter(i => i.id !== id);
        renderItemsGrid();
        showToast(`🗑️ Barang "${itemName}" dihapus!`);
    }
};


function resetForm() {
    uploadedImageDataUrl = "";
    const fileInput = document.getElementById("itemFile");
    const previewBox = document.getElementById("imagePreviewBox");
    if (fileInput) fileInput.value = "";
    if (previewBox) previewBox.classList.add("hidden");

    document.getElementById("itemId").value = "";
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    document.getElementById("itemCategory").value = "makanan";
    document.getElementById("itemIcon").value = "";
    document.getElementById("itemDesc").value = "";

    document.getElementById("formModeTitle").textContent = "➕ Input Barang Toko Belanja Baru";
    document.getElementById("btnSubmitForm").innerHTML = "<span>💾 Simpan ke Firebase & Game</span>";
    document.getElementById("btnResetForm").style.display = "none";
}


// Category filter buttons
function setupCategoryFilter() {
    const filterTabs = document.querySelectorAll("#filterTabs .tab-pill");
    filterTabs.forEach((pill) => {
        pill.addEventListener("click", () => {
            filterTabs.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            currentCategoryFilter = pill.getAttribute("data-cat");
            renderItemsGrid();
        });
    });
}

// Export & Sync Button Handlers
function setupExportAndSync() {
    const btnExport = document.getElementById("btnExportJSON");
    if (btnExport) {
        btnExport.addEventListener("click", () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shopItemsList, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "shop_items.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast("📥 File shop_items.json berhasil diunduh!");
        });
    }

    const btnSync = document.getElementById("btnSyncFirebase");
    if (btnSync) {
        btnSync.addEventListener("click", () => {
            initFirebase();
        });
    }
}

// Toast Helper
function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// Utility Functions
function formatRupiah(val) {
    return "Rp " + val.toLocaleString("id-ID");
}

function escapeHtml(str) {
    return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
}
