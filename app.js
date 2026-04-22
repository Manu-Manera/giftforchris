import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("wishForm");
const titleInput = document.getElementById("title");
const linkInput = document.getElementById("link");
const noteInput = document.getElementById("note");
const imagesInput = document.getElementById("images");
const fileDrop = document.getElementById("fileDrop");
const imagePreview = document.getElementById("imagePreview");
const submitBtn = document.getElementById("submitBtn");
const list = document.getElementById("wishList");
const emptyState = document.getElementById("emptyState");
const template = document.getElementById("wishTemplate");
const statusEl = document.getElementById("status");
const filterButtons = document.querySelectorAll(".filters .chip");
const statTotal = document.getElementById("statTotal");
const statReserved = document.getElementById("statReserved");
const statOpen = document.getElementById("statOpen");
const infoLink = document.getElementById("infoLink");
const infoDialog = document.getElementById("infoDialog");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = lightbox.querySelector(".lightbox-close");

const MAX_IMAGES = 4;
const MAX_DIM = 1000;
const JPEG_QUALITY = 0.75;
const MAX_TOTAL_BYTES = 900 * 1024;
let pendingImages = [];

let db = null;
let wishes = [];
let currentFilter = "all";

const isConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith("REPLACE_");

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"));
    onSnapshot(
      q,
      (snap) => {
        wishes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        render();
      },
      (err) => {
        console.error(err);
        showStatus(
          "D'Verbindig zur Datebank hät nöd klappet. Bitte d'Firestore-Regle checke.",
          "error"
        );
      }
    );
  } catch (err) {
    console.error(err);
    showStatus("Firebase hät sich nöd chöne aalegge.", "error");
  }
} else {
  showStatus(
    "Firebase isch no nöd konfiguriert – lueg im README. Jetzt werded d'Iiträg nur lokal gspeicheret.",
    "info"
  );
  loadLocal();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const images = pendingImages.slice(0, MAX_IMAGES);
  const totalSize = images.reduce((sum, s) => sum + s.length, 0);
  if (totalSize > MAX_TOTAL_BYTES) {
    showStatus(
      "D'Föteli sind zäme z'gross. Nimm weniger oder chliineri Bildli.",
      "error"
    );
    return;
  }

  const entry = {
    title,
    link: linkInput.value.trim() || "",
    author: "",
    note: noteInput.value.trim() || "",
    images,
    reserved: false,
    reservedBy: "",
    createdAt: new Date().toISOString(),
  };

  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-text").textContent = "Am ufneh...";

  try {
    if (db) {
      await addDoc(collection(db, "wishes"), {
        ...entry,
        createdAt: serverTimestamp(),
      });
    } else {
      wishes = [{ id: String(Date.now()), ...entry }, ...wishes];
      saveLocal();
      render();
    }
    form.reset();
    pendingImages = [];
    renderImagePreview();
    titleInput.focus();
  } catch (err) {
    console.error(err);
    showStatus("Hät nöd chöne gspeicheret werde. Probier's nomal.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = "Uf d'Liste";
  }
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    currentFilter = btn.dataset.filter;
    render();
  });
});

infoLink?.addEventListener("click", (e) => {
  e.preventDefault();
  infoDialog?.showModal();
});

function render() {
  list.innerHTML = "";
  const filtered = wishes.filter((w) => {
    if (currentFilter === "open") return !w.reserved;
    if (currentFilter === "reserved") return w.reserved;
    return true;
  });

  filtered.forEach((w) => list.appendChild(buildItem(w)));

  const total = wishes.length;
  const reservedCount = wishes.filter((w) => w.reserved).length;
  statTotal.textContent = total;
  statReserved.textContent = reservedCount;
  statOpen.textContent = total - reservedCount;

  emptyState.hidden = filtered.length !== 0;
  if (filtered.length === 0 && currentFilter !== "all") {
    emptyState.querySelector("p").textContent =
      currentFilter === "reserved"
        ? "No nüt gnoh – alles no offe."
        : "Alles scho gnoh! 🎉 Krass, merci.";
  } else {
    emptyState.querySelector("p").textContent =
      "No nüt uf dr Liste. Muess mir no ebbis iifalle.";
  }
}

function buildItem(w) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = w.id;
  if (w.reserved) node.classList.add("reserved");

  node.querySelector(".wish-title").textContent = w.title;

  const noteEl = node.querySelector(".wish-note");
  if (w.note) {
    noteEl.textContent = w.note;
    noteEl.hidden = false;
  }

  const gallery = node.querySelector(".wish-gallery");
  if (Array.isArray(w.images) && w.images.length > 0) {
    gallery.hidden = false;
    w.images.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = w.title;
      img.loading = "lazy";
      img.addEventListener("click", () => openLightbox(src));
      gallery.appendChild(img);
    });
  }

  const authorEl = node.querySelector(".author");
  const dotSep = node.querySelector(".dot-sep");
  authorEl.textContent = w.author ? `vo ${w.author}` : "";

  const linkEl = node.querySelector(".wish-link");
  if (w.link) {
    linkEl.href = w.link;
    linkEl.hidden = false;
    dotSep.hidden = !w.author;
  }
  if (!w.author && !w.link) {
    node.querySelector(".wish-meta").hidden = true;
  }

  const badge = node.querySelector(".badge");
  badge.hidden = !w.reserved;
  if (w.reserved && w.reservedBy) {
    badge.textContent = `gnoh vo ${w.reservedBy}`;
  }

  const reserveBtn = node.querySelector(".btn-reserve");
  if (w.reserved) {
    reserveBtn.textContent = "Doch nöd gnoh";
    reserveBtn.classList.add("is-reserved");
  } else {
    reserveBtn.textContent = "Reserviere";
  }

  reserveBtn.addEventListener("click", async () => {
    const newReserved = !w.reserved;
    let by = "";
    if (newReserved) {
      by = prompt(
        "Dii Name? (demit mer gsehnd, wer's gnoh hät)",
        localStorage.getItem("chris_author") || ""
      );
      if (by === null) return;
      by = by.trim();
      if (by) localStorage.setItem("chris_author", by);
    }
    try {
      if (db) {
        await updateDoc(doc(db, "wishes", w.id), {
          reserved: newReserved,
          reservedBy: by,
        });
      } else {
        w.reserved = newReserved;
        w.reservedBy = by;
        saveLocal();
        render();
      }
    } catch (err) {
      console.error(err);
      showStatus("Hät nöd chöne aktualisiert werde.", "error");
    }
  });

  const delBtn = node.querySelector(".btn-delete");
  delBtn.addEventListener("click", async () => {
    if (!confirm(`"${w.title}" würkli vo dr Liste näh?`)) return;
    try {
      if (db) {
        await deleteDoc(doc(db, "wishes", w.id));
      } else {
        wishes = wishes.filter((x) => x.id !== w.id);
        saveLocal();
        render();
      }
    } catch (err) {
      console.error(err);
      showStatus("Hät nöd chöne glöscht werde.", "error");
    }
  });

  return node;
}

function showStatus(msg, kind = "error") {
  statusEl.textContent = msg;
  statusEl.className = `status-msg ${kind === "info" ? "info" : ""}`;
  statusEl.hidden = false;
}

function loadLocal() {
  try {
    wishes = JSON.parse(localStorage.getItem("chris_wishes") || "[]");
  } catch {
    wishes = [];
  }
  render();
}

function saveLocal() {
  localStorage.setItem("chris_wishes", JSON.stringify(wishes));
}

imagesInput.addEventListener("change", async (e) => {
  await addFiles(e.target.files);
  imagesInput.value = "";
});

["dragenter", "dragover"].forEach((evt) => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.add("drag-over");
  });
});
["dragleave", "drop"].forEach((evt) => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.remove("drag-over");
  });
});
fileDrop.addEventListener("drop", async (e) => {
  if (e.dataTransfer?.files) {
    await addFiles(e.dataTransfer.files);
  }
});

async function addFiles(files) {
  const remaining = MAX_IMAGES - pendingImages.length;
  if (remaining <= 0) {
    showStatus(`Max ${MAX_IMAGES} Föteli pro Wunsch.`, "info");
    return;
  }
  const list = Array.from(files)
    .filter((f) => f.type.startsWith("image/"))
    .slice(0, remaining);
  if (list.length === 0) return;

  const originalText = fileDrop.querySelector(".file-drop-text").textContent;
  fileDrop.querySelector(".file-drop-text").textContent = "Föteli werded chliiner gmacht...";
  try {
    for (const f of list) {
      const dataUrl = await resizeImage(f);
      pendingImages.push(dataUrl);
    }
  } catch (err) {
    console.error(err);
    showStatus("Es Fötteli hät nöd chöne verarbeitet werde.", "error");
  } finally {
    fileDrop.querySelector(".file-drop-text").textContent = originalText;
    renderImagePreview();
  }
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  imagePreview.innerHTML = "";
  if (pendingImages.length === 0) {
    imagePreview.hidden = true;
    return;
  }
  imagePreview.hidden = false;
  pendingImages.forEach((src, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove";
    rm.textContent = "✕";
    rm.setAttribute("aria-label", "Wägnäh");
    rm.addEventListener("click", () => {
      pendingImages.splice(idx, 1);
      renderImagePreview();
    });
    thumb.appendChild(img);
    thumb.appendChild(rm);
    imagePreview.appendChild(thumb);
  });
}

function openLightbox(src) {
  lightboxImg.src = src;
  if (typeof lightbox.showModal === "function") lightbox.showModal();
}
lightboxClose.addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.close();
});
