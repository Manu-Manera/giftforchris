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
const authorInput = document.getElementById("author");
const noteInput = document.getElementById("note");
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
          "Verbindung zur Datenbank fehlgeschlagen. Bitte Firestore-Regeln prüfen.",
          "error"
        );
      }
    );
  } catch (err) {
    console.error(err);
    showStatus("Firebase konnte nicht initialisiert werden.", "error");
  }
} else {
  showStatus(
    "Firebase ist noch nicht konfiguriert – siehe README.md. Aktuell werden Einträge nur lokal angezeigt.",
    "info"
  );
  loadLocal();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const entry = {
    title,
    link: linkInput.value.trim() || "",
    author: authorInput.value.trim() || "",
    note: noteInput.value.trim() || "",
    reserved: false,
    reservedBy: "",
    createdAt: new Date().toISOString(),
  };

  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-text").textContent = "Speichere...";

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
    if (authorInput.value) localStorage.setItem("chris_author", authorInput.value);
    titleInput.focus();
  } catch (err) {
    console.error(err);
    showStatus("Konnte nicht gespeichert werden. Versuch's nochmal.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = "Hinzufügen";
  }
});

const savedAuthor = localStorage.getItem("chris_author");
if (savedAuthor) authorInput.value = savedAuthor;

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
        ? "Nichts reserviert — noch ist alles offen."
        : "Alles reserviert! 🎉";
  } else {
    emptyState.querySelector("p").textContent =
      "Noch keine Wünsche. Füge den ersten oben hinzu!";
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

  const authorEl = node.querySelector(".author");
  const dotSep = node.querySelector(".dot-sep");
  authorEl.textContent = w.author ? `von ${w.author}` : "";

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
    badge.textContent = `reserviert von ${w.reservedBy}`;
  }

  const reserveBtn = node.querySelector(".btn-reserve");
  if (w.reserved) {
    reserveBtn.textContent = "Reservierung aufheben";
    reserveBtn.classList.add("is-reserved");
  } else {
    reserveBtn.textContent = "Reservieren";
  }

  reserveBtn.addEventListener("click", async () => {
    const newReserved = !w.reserved;
    let by = "";
    if (newReserved) {
      by = prompt(
        "Dein Name (damit man weiss, wer es reserviert hat):",
        authorInput.value || localStorage.getItem("chris_author") || ""
      );
      if (by === null) return;
      by = by.trim();
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
      showStatus("Konnte nicht aktualisiert werden.", "error");
    }
  });

  const delBtn = node.querySelector(".btn-delete");
  delBtn.addEventListener("click", async () => {
    if (!confirm(`"${w.title}" wirklich löschen?`)) return;
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
      showStatus("Konnte nicht gelöscht werden.", "error");
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
