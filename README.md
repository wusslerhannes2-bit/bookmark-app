# PinDrop 📌 — Minimal & Clean Bookmark App

Eine extrem schlanke, moderne und übersichtliche Bookmark- und Snippet-Web-App für Links, Bilder/Screenshots, Notizen und Code-Snippets.

✨ **Kein Server / kein localhost nötig!** Du kannst einfach die `index.html` direkt im Browser per Doppelklick öffnen oder kostenlos über GitHub Pages hosten.

---

## 🌟 Highlights & Funktionen

- 🔗 **Links & Bookmarks**: Automatische Favicon-Erkennung & Auto-Fill für Domain-Titel und Tags.
- 🖼️ **Bilder & Screenshots**: Unterstützt Bild-URLs oder direkten Datei-Upload (Drag & Drop) mit integrierter Lightbox-Vollbildansicht.
- 📝 **Texte & Notizen**: Formatierte Notizen und Gedanken schnell festhalten.
- 💻 **Code-Snippets**: Integrierte Syntax-Kennzeichnung mit 1-Klick-Kopieren in die Zwischenablage.
- 📁 **Ordner & Tags**: Flexible Organisation mit Ordnern, Sammlungen und Tag-Cloud.
- 🔍 **Echtzeit-Suche & Tastatur-Shortcuts**:
  - `Strg + K` (oder `Cmd + K`): Suche fokussieren
  - `N`: Neuen Eintrag erstellen
  - `Esc`: Dialoge schließen
- 🎨 **Modernes UI & Themes**: Flüssige Animationen, Glassmorphism, Dark Mode und Light Mode.
- 👁️ **3 Ansichtsmodi**:
  - 🍱 *Grid / Raster*: Große visuelle Vorschaukarten
  - 📑 *Kompakte Liste*: Maximale Übersicht für viele Links
  - 📌 *Moodboard / Pinnwand*: Masonry-Layout für Bilder und Notizen
- 💾 **Datensicherheit & Portabilität**:
  - Gespeichert in modernem Browser `IndexedDB` mit `localStorage` Fallback.
  - **JSON Export & Import**: Volles Backup mit einem Klick.
  - **Browser-Bookmarks Import**: Importiere Lesezeichen aus Google Chrome, Mozilla Firefox, Safari und Microsoft Edge.

---

## 🚀 Wie öffne ich die App?

### Methode 1: Direkt im Browser öffnen (Lokal ohne Installation)
1. Öffne den Ordner `/home/hannes/Projekte/Bookmark app/`
2. Mache einen Doppelklick auf die Datei [`index.html`](file:///home/hannes/Projekte/Bookmark%20app/index.html) oder ziehe sie in deinen Browser.
3. Fertig!

---

## 🐙 Auf GitHub hochladen & GitHub Pages aktivieren

Um das Projekt auf GitHub zu pushen und optional kostenlos im Web bereitzustellen:

1. **Erstelle ein neues leeres Repository auf [GitHub.com](https://github.com/new)** (z. B. mit dem Namen `bookmark-app`).
2. Führe im Terminal folgende Befehle aus:

```bash
cd "/home/hannes/Projekte/Bookmark app"
git remote add origin https://github.com/<DEIN-NUTZERNAME>/bookmark-app.git
git branch -M main
git push -u origin main
```

3. **Optional (Online hosten mit GitHub Pages):**
   - Gehe in deinem GitHub-Repository auf **Settings** -> **Pages**.
   - Wähle unter *Branch* den `main` Branch und klicke auf **Save**.
   - Deine Bookmark-App ist nun unter `https://<DEIN-NUTZERNAME>.github.io/bookmark-app/` weltweit erreichbar!

---

Entwickelt mit modernem Vanilla HTML5, CSS3 und JavaScript.
