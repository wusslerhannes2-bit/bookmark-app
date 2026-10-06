# 📌 PinDrop — Minimal, Privacy-First Bookmark & Snippet Hub

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/Backend-Zero%20%2F%20Client--Side-blue.svg?style=flat-square" alt="Backend">
  <img src="https://img.shields.io/badge/Storage-IndexedDB%20%2B%20Local-purple.svg?style=flat-square" alt="Storage">
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License">
</p>

<p align="center">
  <b>Eine moderne, übersichtliche und lokale Bookmark-App für Links, Bilder, Notizen und Code-Snippets.</b><br>
  <i>Kein Server, kein Backend, keine Registrierung — 100% lokal in deinem Browser.</i>
</p>

<p align="center">
  🌐 <b><a href="https://wusslerhannes2-bit.github.io/bookmark-app/">Live Demo ansehen</a></b>
</p>

---

## ✨ Features

- 🔒 **100% Privacy & Local-First**: Alle Daten verbleiben ausschließlich in deinem Browser (`IndexedDB` & `localStorage`). Kein Tracking, keine externen Server.
- 🔑 **PIN / Passwort-Schutz**: Schütze deine gespeicherten Lesezeichen mit einer Master-PIN vor neugierigen Blicken.
- 🔗 **Smarte Links**: Automatischer Favicon-Grabber, Domain-Erkennung und Auto-Fill-Funktion für Titel und Tags.
- 🖼️ **Bilder & Screenshots**: Unterstützt Bild-URLs sowie **Drag-and-Drop / Datei-Upload** mit integrierter Lightbox-Vollbildansicht.
- 📝 **Notizen & Markdown**: Schnelle Textnotizen und formatierte Gedanken mit Sofort-Kopierfunktion.
- 💻 **Code-Snippets**: Syntax-Tagging mit 1-Klick-Kopieren in die Zwischenablage.
- 📁 **Kollektionen & Tags**: Organisiere Inhalte nach benutzerdefinierten Ordnern und flexiblen Tags.
- 🍱 **3 Ansichtsmodi**:
  - **Grid**: Visuelle Kacheln mit Media-Vorschau
  - **Kompakt**: Tabellarische Schnellansicht für hohe Informationsdichte
  - **Masonry (Moodboard)**: Dynamische Pinnwand für Design & Inspiration
- 🌓 **Dark & Light Mode**: Automatisch angepasstes, augenschonendes UI-Design mit Glassmorphism-Effekten.
- 📦 **Export & Import**:
  - Vollständiges JSON-Backup (Download & Restore mit einem Klick)
  - HTML-Bookmark-Import (unterstützt Google Chrome, Firefox, Safari und Edge)

---

## ⌨️ Tastatur-Shortcuts

| Shortcut | Aktion |
| :--- | :--- |
| <kbd>Strg</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Sofortsuche fokussieren |
| <kbd>N</kbd> | Neuen Eintrag erstellen |
| <kbd>Esc</kbd> | Modals und Dialoge schließen |

---

## 🚀 Schnellstart

### 1. Direkt im Browser nutzen
Du benötigst weder Node.js noch einen Webserver.

1. Repository klonen oder als ZIP herunterladen:
   ```bash
   git clone https://github.com/wusslerhannes2-bit/bookmark-app.git
   ```
2. Die Datei [`index.html`](index.html) per Doppelklick in deinem Lieblingsbrowser öffnen.

### 2. Eigenes GitHub Pages Deployment
1. Forke dieses Repository.
2. Gehe in deinem GitHub-Repository auf **Settings** → **Pages**.
3. Wähle als Source `Deploy from a branch` und wähle den Branch `main` mit `/ (root)`.
4. Klicke auf **Save**. Deine Bookmark-App ist in unter einer Minute live!

---

## 🛠️ Technologien

- **HTML5** — Semantische Struktur und barrierefreie Modals
- **CSS3** — Custom CSS Variables, Glassmorphism, CSS Grid & Flexbox, responsive Breakpoints
- **Vanilla JavaScript** — Kein Framework-Overhead, performante DOM-Manipulation
- **IndexedDB API** — Zuverlässige Offline-Speicherung auch für hochauflösende Bilder

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert — frei zur privaten und kommerziellen Nutzung.
