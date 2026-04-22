# Chris' Geburtstags-Wunschliste 🎁

Eine öffentlich editierbare Wunschliste als einzelne Landingpage. Jede Person
kann Wünsche hinzufügen, reservieren und löschen. Modernes Glas-Design mit
animiertem Aurora-Hintergrund, abgerundeten Ecken und Live-Sync für alle
Besucher.

**Live-Domain:** <https://giftforchris.ch>

## Tech-Stack

| Teil          | Tool                               | Kosten |
|---------------|------------------------------------|--------|
| Hosting       | GitHub Pages                       | gratis |
| Datenspeicher | Firebase Firestore (Spark-Plan)    | gratis |
| Custom Domain | giftforchris.ch (Hoststar)         | bereits vorhanden |

Keine Build-Tools, kein Node, kein Backend – einfach statische Dateien.

---

## Schnellstart (lokal testen)

Einfach `index.html` im Browser öffnen. Ohne Firebase-Config werden die
Einträge nur lokal im Browser gespeichert (LocalStorage), damit man das UI
testen kann.

Alternativ mit einem kleinen Webserver:

```bash
python3 -m http.server 8000
# -> http://localhost:8000
```

---

## 1) Firebase einrichten (einmalig, ~5 Minuten)

1. Gehe zu <https://console.firebase.google.com> und klicke **"Projekt hinzufügen"**.
   - Name z. B. `chris-wishlist`
   - Google Analytics kannst du **deaktivieren**
2. In der linken Seitenleiste: **Build → Firestore Database → Datenbank erstellen**.
   - Modus: **"Im Produktionsmodus starten"**
   - Standort: z. B. `eur3 (europe-west)`
3. Erstelle dann eine **Web-App** im Projekt:
   - Zahnrad oben links → **Projekteinstellungen → Allgemein**
   - Ganz unten **Apps → `</>` (Web)** → Nickname z. B. `Wishlist Web`
   - Firebase Hosting **nicht** aktivieren
4. Kopiere das `firebaseConfig`-Objekt und füge es in [`firebase-config.js`](./firebase-config.js) ein.
5. Gehe zu **Firestore → Regeln** und ersetze den Inhalt durch:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /wishes/{doc} {
         allow read: if true;
         allow create: if request.resource.data.title is string
                       && request.resource.data.title.size() > 0
                       && request.resource.data.title.size() < 200;
         allow update, delete: if true;
       }
     }
   }
   ```

   Klicke **"Veröffentlichen"**. Damit darf jeder lesen/schreiben – genau das
   was wir wollen. Titel sind auf max. 200 Zeichen begrenzt, damit niemand
   Spam einfügen kann.

6. Zurück zu Projekteinstellungen → **Authentifizierte Domains** sind nicht
   nötig (wir benutzen keine Auth). Firestore API ist ausreichend.

> **Sicherheitshinweis:** Die Firebase-Config ist kein Geheimnis, sie ist für
> Browser-Clients gedacht. Der Schutz kommt über die Firestore-Regeln oben.

---

## 2) Auf GitHub Pages deployen

Das Repo wird gleich unter deinem GitHub-Account `Manu-Manera` erstellt.

```bash
cd "/Users/manumanera/Chris Wish List"

# Repo initialisieren (bereits geschehen, falls gewünscht)
git init -b main
git add .
git commit -m "Initial commit: Chris' Wunschliste"

# Repo auf GitHub erstellen (mit gh CLI) …
gh repo create Manu-Manera/giftforchris --public --source=. --remote=origin --push

# … oder manuell:
# 1. https://github.com/new -> Repo-Name: giftforchris, public
# 2. Dann:
git remote add origin git@github-manuel-weiss:Manu-Manera/giftforchris.git
git push -u origin main
```

Im Browser:

1. <https://github.com/Manu-Manera/giftforchris/settings/pages>
2. **Source:** Deploy from a branch → **Branch:** `main` / `(root)` → **Save**
3. Unter **"Custom domain"** `giftforchris.ch` eintragen und speichern.
   GitHub liest auch die Datei [`CNAME`](./CNAME) automatisch.
4. Häkchen **"Enforce HTTPS"** aktivieren (sobald verfügbar, dauert 5-30 Min).

---

## 3) DNS bei Hoststar konfigurieren

Im Hoststar **My Panel** (`my.hoststar.ch`) bei der Domain `giftforchris.ch`
unter **DNS-Verwaltung** folgende Einträge setzen:

### Variante A – Apex-Domain `giftforchris.ch` auf GitHub Pages

Vier `A`-Einträge (GitHub Pages IPs) und einer für `www`:

| Typ   | Host / Name | Wert                   |
|-------|-------------|------------------------|
| A     | @           | `185.199.108.153`      |
| A     | @           | `185.199.109.153`      |
| A     | @           | `185.199.110.153`      |
| A     | @           | `185.199.111.153`      |
| AAAA  | @           | `2606:50c0:8000::153`  |
| AAAA  | @           | `2606:50c0:8001::153`  |
| AAAA  | @           | `2606:50c0:8002::153`  |
| AAAA  | @           | `2606:50c0:8003::153`  |
| CNAME | www         | `manu-manera.github.io.` |

Nach dem Speichern 5-60 Minuten warten. Check:

```bash
dig giftforchris.ch +short
# -> sollte die 185.199.x.153 IPs zeigen
```

---

## Ordnerstruktur

```
.
├── index.html           # Markup + Template
├── styles.css           # Glas-Design, Aurora, Animationen
├── app.js               # Logik + Firestore-Anbindung
├── firebase-config.js   # >>> HIER deine Firebase-Werte eintragen
├── CNAME                # giftforchris.ch für GitHub Pages
├── .nojekyll            # Deaktiviert Jekyll auf GitHub Pages
└── README.md
```

## Features

- ✨ Glas-Look mit animiertem Farb-Hintergrund (Aurora-Blobs)
- 🎁 Wünsche hinzufügen mit optionalem Link + Notiz
- 🔒 Reservieren / Freigeben, damit nichts doppelt gekauft wird
- 🗑️ Löschen mit Bestätigung
- 📊 Live-Zähler (Gesamt / Reserviert / Offen)
- 🔁 Live-Sync zwischen allen Besuchern dank Firestore `onSnapshot`
- 📱 Responsive, mit reduzierten Animationen bei `prefers-reduced-motion`

## Später anpassen

- Text und Titel in `index.html`
- Farben/Gradient in `styles.css` (`:root`-Variablen ganz oben)
- Hintergrund-Blobs sind `.blob-1` bis `.blob-4` – Farbe und Position
  beliebig änderbar

Viel Spass! 🎂
