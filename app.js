/**
 * PinDrop — Modern, Clean & Lightweight Bookmark & Snippet App
 * Pure client-side application. No server or build steps needed.
 */

(function () {
  'use strict';

  // --- Initial / Default Sample Data ---
  const DEFAULT_ITEMS = [
    {
      id: 'item-1',
      type: 'link',
      title: 'GitHub — Build and ship software on a single platform',
      url: 'https://github.com',
      content: 'Der weltgrößte Code-Host für Entwickler und Open-Source-Projekte.',
      folder: 'Development',
      tags: ['git', 'code', 'open-source'],
      favorite: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2
    },
    {
      id: 'item-2',
      type: 'image',
      title: 'Minimalist Desktop Workspace Inspiration',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      content: 'Clean Setup mit warmem Licht und minimalistischer Tastatur.',
      folder: 'Design & Inspo',
      tags: ['workspace', 'minimal', 'setup'],
      favorite: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 12
    },
    {
      id: 'item-3',
      type: 'code',
      title: 'Modern CSS Flexbox Center Shortcut',
      codeLang: 'html',
      content: '.container {\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n}',
      folder: 'Development',
      tags: ['css', 'frontend', 'cheatsheet'],
      favorite: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 5
    },
    {
      id: 'item-4',
      type: 'note',
      title: 'Ideen für zukünftige Web-Projekte 💡',
      content: '- Interaktives 3D Portfolio mit Three.js\n- RSS Feed Reader mit automatischer KI-Zusammenfassung\n- Lokale Markdown-Notizen-App mit Canvas-Board',
      folder: 'Allgemein',
      tags: ['ideas', 'todo', 'projects'],
      favorite: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 2
    },
    {
      id: 'item-5',
      type: 'link',
      title: 'Dribbble — Discover the World’s Top Designers & Creatives',
      url: 'https://dribbble.com',
      content: 'Inspiration für Webdesign, UI/UX, Animationen und Branding.',
      folder: 'Design & Inspo',
      tags: ['design', 'ui', 'inspiration'],
      favorite: false,
      createdAt: Date.now() - 1000 * 60 * 30
    }
  ];

  // --- Storage Helper with IndexedDB & localStorage Fallback ---
  const DB_NAME = 'pindrop_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'bookmarks';

  let db = null;

  function initDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to localStorage.');
        resolve(false);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        console.error('IndexedDB error, falling back to localStorage.');
        resolve(false);
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(true);
      };
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async function loadAllItems() {
    if (db) {
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          if (req.result && req.result.length > 0) {
            resolve(req.result);
          } else {
            // Check localStorage
            const local = localStorage.getItem('pindrop_bookmarks');
            if (local) {
              try {
                const parsed = JSON.parse(local);
                // Save to IndexedDB
                saveAllItems(parsed);
                resolve(parsed);
                return;
              } catch (e) {
                console.error(e);
              }
            }
            // Seed default items
            saveAllItems(DEFAULT_ITEMS);
            resolve(DEFAULT_ITEMS);
          }
        };
        req.onerror = () => {
          resolve(DEFAULT_ITEMS);
        };
      });
    } else {
      const local = localStorage.getItem('pindrop_bookmarks');
      if (local) {
        try {
          return JSON.parse(local);
        } catch (e) {
          return DEFAULT_ITEMS;
        }
      }
      localStorage.setItem('pindrop_bookmarks', JSON.stringify(DEFAULT_ITEMS));
      return DEFAULT_ITEMS;
    }
  }

  async function saveAllItems(items) {
    if (db) {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      items.forEach(item => store.put(item));
    }
    // Also save in localStorage as lightweight backup (without huge base64 if possible)
    try {
      localStorage.setItem('pindrop_bookmarks', JSON.stringify(items));
    } catch (e) {
      console.warn('localStorage full or quota exceeded, IndexedDB is primary.');
    }
  }

  // --- App State ---
  const state = {
    items: [],
    currentFilter: 'all', // 'all', 'favorites', 'type-link', 'type-image', 'type-note', 'type-code', 'folder:<name>', 'tag:<name>'
    searchQuery: '',
    currentSort: 'newest', // 'newest', 'oldest', 'alpha', 'favorite'
    currentView: 'grid', // 'grid', 'compact', 'masonry'
    activeTypeInModal: 'link',
    customFolders: ['Allgemein', 'Development', 'Design & Inspo', 'Leseliste']
  };

  // Load custom folders from localStorage
  const savedFolders = localStorage.getItem('pindrop_folders');
  if (savedFolders) {
    try {
      state.customFolders = JSON.parse(savedFolders);
    } catch (e) {}
  }

  // --- DOM Elements ---
  const cardsGrid = document.getElementById('cardsGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const viewBtns = document.querySelectorAll('.view-btn');
  const filterTitle = document.getElementById('filterTitle');
  const filterSubtitle = document.getElementById('filterSubtitle');
  const activeFilterTags = document.getElementById('activeFilterTags');
  const foldersList = document.getElementById('foldersList');
  const tagsCloud = document.getElementById('tagsCloud');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sidebar = document.getElementById('sidebar');
  const collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const toastContainer = document.getElementById('toastContainer');
  const dropOverlay = document.getElementById('dropOverlay');

  // Modal Elements
  const itemModal = document.getElementById('itemModal');
  const itemForm = document.getElementById('itemForm');
  const modalTitle = document.getElementById('modalTitle');
  const typeSelector = document.getElementById('typeSelector');
  const itemIdInput = document.getElementById('itemId');
  const itemTypeInput = document.getElementById('itemType');
  const itemUrlInput = document.getElementById('itemUrl');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const imageFileInput = document.getElementById('imageFileInput');
  const imageDropZone = document.getElementById('imageDropZone');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const itemTitleInput = document.getElementById('itemTitle');
  const itemContentInput = document.getElementById('itemContent');
  const codeLanguageSelect = document.getElementById('codeLanguage');
  const itemFolderSelect = document.getElementById('itemFolder');
  const itemTagsInput = document.getElementById('itemTags');
  const itemFavoriteInput = document.getElementById('itemFavorite');
  const fetchMetadataBtn = document.getElementById('fetchMetadataBtn');

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const detailBadges = document.getElementById('detailBadges');
  const detailBody = document.getElementById('detailBody');
  const detailFooter = document.getElementById('detailFooter');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');

  // Settings Modal Elements
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const importHtmlInput = document.getElementById('importHtmlInput');
  const loadSampleDataBtn = document.getElementById('loadSampleDataBtn');
  const clearAllDataBtn = document.getElementById('clearAllDataBtn');
  const addFolderBtn = document.getElementById('addFolderBtn');

  // --- Helper Functions ---
  function getFaviconUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch (e) {
      return '';
    }
  }

  function formatDomain(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = '✨';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'copy') icon = '📋';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function copyToClipboard(text, label = 'Text') {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} in die Zwischenablage kopiert!`, 'copy');
    }).catch(() => {
      showToast('Kopieren fehlgeschlagen.', 'error');
    });
  }

  // --- Theme Management ---
  function initTheme() {
    const saved = localStorage.getItem('pindrop_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pindrop_theme', next);
  }

  // --- Sidebar & Folders Management ---
  function updateFolderSelect() {
    itemFolderSelect.innerHTML = '';
    state.customFolders.forEach(folder => {
      const opt = document.createElement('option');
      opt.value = folder;
      opt.textContent = `📁 ${folder}`;
      itemFolderSelect.appendChild(opt);
    });
  }

  function renderSidebar() {
    // Render counts
    const countAll = state.items.length;
    const countFavs = state.items.filter(i => i.favorite).length;
    const countLink = state.items.filter(i => i.type === 'link').length;
    const countImage = state.items.filter(i => i.type === 'image').length;
    const countNote = state.items.filter(i => i.type === 'note').length;
    const countCode = state.items.filter(i => i.type === 'code').length;

    document.getElementById('count-all').textContent = countAll;
    document.getElementById('count-favorites').textContent = countFavs;
    document.getElementById('count-type-link').textContent = countLink;
    document.getElementById('count-type-image').textContent = countImage;
    document.getElementById('count-type-note').textContent = countNote;
    document.getElementById('count-type-code').textContent = countCode;

    // Render Folders
    foldersList.innerHTML = '';
    state.customFolders.forEach(folder => {
      const folderCount = state.items.filter(i => (i.folder || 'Allgemein') === folder).length;
      const li = document.createElement('li');
      li.className = `nav-item ${state.currentFilter === 'folder:' + folder ? 'active' : ''}`;
      li.setAttribute('data-filter', `folder:${folder}`);
      
      li.innerHTML = `
        <button class="nav-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          <span>${escapeHtml(folder)}</span>
          <span class="count-badge">${folderCount}</span>
          ${folder !== 'Allgemein' ? `<span class="folder-action-btn delete-folder-btn" title="Ordner löschen" data-folder="${escapeHtml(folder)}">✕</span>` : ''}
        </button>
      `;
      foldersList.appendChild(li);
    });

    // Render Tags Cloud
    const tagCounts = {};
    state.items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          const clean = t.trim().toLowerCase();
          if (clean) {
            tagCounts[clean] = (tagCounts[clean] || 0) + 1;
          }
        });
      }
    });

    tagsCloud.innerHTML = '';
    const sortedTags = Object.keys(tagCounts).sort();
    if (sortedTags.length === 0) {
      tagsCloud.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); padding: 4px;">Keine Tags vorhanden</span>`;
    } else {
      sortedTags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = `tag-chip ${state.currentFilter === 'tag:' + tag ? 'active' : ''}`;
        chip.innerHTML = `#${escapeHtml(tag)} <span style="font-size:0.7rem; opacity:0.75;">(${tagCounts[tag]})</span>`;
        chip.addEventListener('click', () => {
          setFilter(`tag:${tag}`);
        });
        tagsCloud.appendChild(chip);
      });
    }

    updateFolderSelect();
  }

  // --- Filtering & Sorting ---
  function setFilter(filter) {
    state.currentFilter = filter;

    // Update active class on sidebar items
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-filter') === filter) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    renderItems();
  }

  function getFilteredItems() {
    let result = [...state.items];

    // Filter by category / type / tag
    if (state.currentFilter === 'favorites') {
      result = result.filter(i => i.favorite);
    } else if (state.currentFilter.startsWith('type-')) {
      const type = state.currentFilter.replace('type-', '');
      result = result.filter(i => i.type === type);
    } else if (state.currentFilter.startsWith('folder:')) {
      const folder = state.currentFilter.replace('folder:', '');
      result = result.filter(i => (i.folder || 'Allgemein') === folder);
    } else if (state.currentFilter.startsWith('tag:')) {
      const tag = state.currentFilter.replace('tag:', '').toLowerCase();
      result = result.filter(i => i.tags && i.tags.map(t => t.toLowerCase()).includes(tag));
    }

    // Search query filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(i => {
        const inTitle = (i.title || '').toLowerCase().includes(q);
        const inContent = (i.content || '').toLowerCase().includes(q);
        const inUrl = (i.url || '').toLowerCase().includes(q);
        const inTags = (i.tags || []).some(t => t.toLowerCase().includes(q));
        const inFolder = (i.folder || '').toLowerCase().includes(q);
        return inTitle || inContent || inUrl || inTags || inFolder;
      });
    }

    // Sorting
    if (state.currentSort === 'newest') {
      result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (state.currentSort === 'oldest') {
      result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (state.currentSort === 'alpha') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (state.currentSort === 'favorite') {
      result.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0));
    }

    return result;
  }

  // --- Rendering UI ---
  function updateFilterHeader(filteredCount) {
    let title = 'Alle Einträge';
    let subtitle = `${filteredCount} Element${filteredCount === 1 ? '' : 'e'}`;

    if (state.currentFilter === 'favorites') {
      title = '❤️ Favoriten';
    } else if (state.currentFilter === 'type-link') {
      title = '🔗 Web-Links';
    } else if (state.currentFilter === 'type-image') {
      title = '🖼️ Bilder & Screenshots';
    } else if (state.currentFilter === 'type-note') {
      title = '📝 Texte & Notizen';
    } else if (state.currentFilter === 'type-code') {
      title = '💻 Code-Snippets';
    } else if (state.currentFilter.startsWith('folder:')) {
      title = `📁 ${state.currentFilter.replace('folder:', '')}`;
    } else if (state.currentFilter.startsWith('tag:')) {
      title = `#${state.currentFilter.replace('tag:', '')}`;
    }

    if (state.searchQuery) {
      subtitle += ` (gefiltert nach "${state.searchQuery}")`;
    }

    filterTitle.textContent = title;
    filterSubtitle.textContent = subtitle;

    // Active tags filter badge
    activeFilterTags.innerHTML = '';
    if (state.currentFilter !== 'all') {
      const badge = document.createElement('div');
      badge.className = 'active-filter-badge';
      badge.innerHTML = `Filter aktiv: ${title} <button title="Filter zurücksetzen">✕</button>`;
      badge.querySelector('button').addEventListener('click', () => setFilter('all'));
      activeFilterTags.appendChild(badge);
    }
  }

  function renderItems() {
    const filtered = getFilteredItems();
    updateFilterHeader(filtered.length);
    renderSidebar();

    cardsGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      if (state.searchQuery) {
        emptyTitle.textContent = `Keine Treffer für "${state.searchQuery}"`;
      } else {
        emptyTitle.textContent = 'Keine Einträge in dieser Ansicht';
      }
      return;
    }

    emptyState.style.display = 'none';

    filtered.forEach(item => {
      const card = createItemCard(item);
      cardsGrid.appendChild(card);
    });
  }

  function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.setAttribute('data-id', item.id);

    // Image / Media section
    let mediaHtml = '';
    if (item.type === 'image' && item.url) {
      mediaHtml = `
        <div class="card-media-wrapper" data-action="view-detail">
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" class="card-img" loading="lazy">
          <div class="card-media-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            Bild
          </div>
        </div>
      `;
    }

    // Code Snippet section
    let codeHtml = '';
    if (item.type === 'code' && item.content) {
      codeHtml = `
        <div class="code-preview-box" data-action="view-detail">
          <span class="code-lang-tag">${escapeHtml(item.codeLang || 'CODE')}</span>
          <pre><code>${escapeHtml(item.content)}</code></pre>
        </div>
      `;
    }

    // Favicon & Icon logic
    let faviconHtml = '';
    if (item.type === 'link') {
      const fav = getFaviconUrl(item.url);
      faviconHtml = `
        <div class="favicon-box">
          <img src="${fav}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' fill=\'%236366f1\' viewBox=\'0 0 24 24\'><path d=\'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\'/><path d=\'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\'/></svg>'">
        </div>
      `;
    } else if (item.type === 'note') {
      faviconHtml = `
        <div class="favicon-box" style="color: #10b981;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
        </div>
      `;
    } else if (item.type === 'code') {
      faviconHtml = `
        <div class="favicon-box" style="color: #38bdf8;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
      `;
    } else if (item.type === 'image') {
      faviconHtml = `
        <div class="favicon-box" style="color: #ec4899;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/></svg>
        </div>
      `;
    }

    // Tags
    let tagsHtml = '';
    if (item.tags && item.tags.length > 0) {
      tagsHtml = `
        <div class="card-tags">
          ${item.tags.map(t => `<span class="card-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join('')}
        </div>
      `;
    }

    // Text content for notes / links
    let contentHtml = '';
    if (item.type !== 'code' && item.content) {
      contentHtml = `<div class="card-content-text" data-action="view-detail">${escapeHtml(item.content)}</div>`;
    }

    // Action buttons (Visit link / copy / edit / delete)
    let actionVisitHtml = '';
    if (item.type === 'link' && item.url) {
      actionVisitHtml = `
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="card-btn visit-btn" title="Öffnen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
          <span>${escapeHtml(formatDomain(item.url))}</span>
        </a>
      `;
    }

    card.innerHTML = `
      ${mediaHtml}
      <div class="card-body">
        <div class="card-top">
          <div class="card-icon-title">
            ${faviconHtml}
            <h3 class="card-title" data-action="view-detail">${escapeHtml(item.title)}</h3>
          </div>
          <div class="card-actions-quick">
            <button class="fav-toggle-btn ${item.favorite ? 'is-fav' : ''}" data-action="toggle-fav" title="${item.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
          </div>
        </div>

        ${codeHtml}
        ${contentHtml}
        ${tagsHtml}
      </div>

      <div class="card-footer">
        <div class="card-folder-badge">
          <span>📁 ${escapeHtml(item.folder || 'Allgemein')}</span>
        </div>
        <div class="card-buttons">
          ${actionVisitHtml}
          <button class="card-btn" data-action="copy" title="Kopieren">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <button class="card-btn" data-action="edit" title="Bearbeiten">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button class="card-btn" data-action="delete" title="Löschen" style="color: var(--danger);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Event Delegation for Card
    card.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-tag]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const tag = target.getAttribute('data-tag');

      if (tag) {
        setFilter(`tag:${tag}`);
        return;
      }

      if (action === 'toggle-fav') {
        item.favorite = !item.favorite;
        saveAllItems(state.items);
        renderItems();
        showToast(item.favorite ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
      } else if (action === 'copy') {
        const textToCopy = item.url || item.content || item.title;
        copyToClipboard(textToCopy, item.type === 'link' ? 'Link' : 'Inhalt');
      } else if (action === 'edit') {
        openEditModal(item);
      } else if (action === 'delete') {
        if (confirm(`Eintrag "${item.title}" wirklich löschen?`)) {
          state.items = state.items.filter(i => i.id !== item.id);
          saveAllItems(state.items);
          renderItems();
          showToast('Eintrag gelöscht', 'info');
        }
      } else if (action === 'view-detail') {
        openDetailModal(item);
      }
    });

    return card;
  }

  // --- Modal Logic (Add / Edit) ---
  function setModalType(type) {
    state.activeTypeInModal = type;
    itemTypeInput.value = type;

    // Update Tab UI
    document.querySelectorAll('.type-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-type') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Form fields visibility
    const fieldLink = document.querySelector('.field-link');
    const fieldImage = document.querySelector('.field-image');
    const fieldCode = document.querySelector('.field-code');
    const contentLabel = document.getElementById('contentLabel');

    if (type === 'link') {
      fieldLink.style.display = 'block';
      fieldImage.style.display = 'none';
      fieldCode.style.display = 'none';
      contentLabel.textContent = 'Optionale Beschreibung / Notiz';
      itemUrlInput.required = true;
    } else if (type === 'image') {
      fieldLink.style.display = 'none';
      fieldImage.style.display = 'block';
      fieldCode.style.display = 'none';
      contentLabel.textContent = 'Bildunterschrift / Gedanken';
      itemUrlInput.required = false;
    } else if (type === 'code') {
      fieldLink.style.display = 'none';
      fieldImage.style.display = 'none';
      fieldCode.style.display = 'block';
      contentLabel.textContent = 'Code / Snippet *';
      itemUrlInput.required = false;
    } else if (type === 'note') {
      fieldLink.style.display = 'none';
      fieldImage.style.display = 'none';
      fieldCode.style.display = 'none';
      contentLabel.textContent = 'Notiz / Markdown Inhalt *';
      itemUrlInput.required = false;
    }
  }

  function openNewItemModal() {
    modalTitle.textContent = 'Neuer Eintrag';
    itemForm.reset();
    itemIdInput.value = '';
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
    setModalType('link');
    itemFolderSelect.value = state.customFolders[0] || 'Allgemein';
    itemModal.classList.add('open');
    setTimeout(() => {
      if (state.activeTypeInModal === 'link') itemUrlInput.focus();
      else itemTitleInput.focus();
    }, 100);
  }

  function openEditModal(item) {
    modalTitle.textContent = 'Eintrag bearbeiten';
    itemForm.reset();
    itemIdInput.value = item.id;
    itemTitleInput.value = item.title || '';
    itemContentInput.value = item.content || '';
    itemTagsInput.value = (item.tags || []).join(', ');
    itemFolderSelect.value = item.folder || 'Allgemein';
    itemFavoriteInput.checked = !!item.favorite;

    setModalType(item.type || 'link');

    if (item.type === 'link') {
      itemUrlInput.value = item.url || '';
    } else if (item.type === 'image') {
      imageUrlInput.value = item.url || '';
      if (item.url) {
        imagePreview.src = item.url;
        imagePreviewContainer.style.display = 'block';
      }
    } else if (item.type === 'code') {
      codeLanguageSelect.value = item.codeLang || 'javascript';
    }

    itemModal.classList.add('open');
    itemTitleInput.focus();
  }

  function closeModals() {
    itemModal.classList.remove('open');
    detailModal.classList.remove('open');
    settingsModal.classList.remove('open');
  }

  // --- Detail Lightbox Modal ---
  function openDetailModal(item) {
    detailBadges.innerHTML = `
      <span class="card-tag">Typ: ${item.type.toUpperCase()}</span>
      <span class="card-tag">📁 ${escapeHtml(item.folder || 'Allgemein')}</span>
      ${item.favorite ? '<span class="card-tag" style="color:var(--favorite);">❤️ Favorit</span>' : ''}
    `;

    let bodyContent = `<h2 style="font-size:1.4rem; font-weight:700; margin-bottom:12px;">${escapeHtml(item.title)}</h2>`;

    if (item.type === 'image' && item.url) {
      bodyContent += `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" class="detail-img">`;
    }

    if (item.type === 'code' && item.content) {
      bodyContent += `
        <div class="detail-code-block">
          <pre><code>${escapeHtml(item.content)}</code></pre>
        </div>
      `;
    }

    if (item.content && item.type !== 'code') {
      bodyContent += `<div class="detail-text-body">${escapeHtml(item.content)}</div>`;
    }

    if (item.tags && item.tags.length > 0) {
      bodyContent += `
        <div class="card-tags" style="margin-top:12px;">
          ${item.tags.map(t => `<span class="card-tag">#${escapeHtml(t)}</span>`).join('')}
        </div>
      `;
    }

    detailBody.innerHTML = bodyContent;

    let footerButtons = `
      <button class="btn btn-secondary" id="detailCopyBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        Kopieren
      </button>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" id="detailEditBtn">Bearbeiten</button>
        ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Link öffnen</a>` : ''}
      </div>
    `;

    detailFooter.innerHTML = footerButtons;

    document.getElementById('detailCopyBtn').addEventListener('click', () => {
      const text = item.url || item.content || item.title;
      copyToClipboard(text, 'Inhalt');
    });

    document.getElementById('detailEditBtn').addEventListener('click', () => {
      detailModal.classList.remove('open');
      openEditModal(item);
    });

    detailModal.classList.add('open');
  }

  // --- Auto Metadata / Title generator for Links ---
  fetchMetadataBtn.addEventListener('click', () => {
    let url = itemUrlInput.value.trim();
    if (!url) {
      showToast('Bitte zuerst eine URL eingeben', 'error');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      itemUrlInput.value = url;
    }

    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      const pathClean = u.pathname.replace(/^\/|\/$/g, '').replace(/[-_]/g, ' ');
      
      if (!itemTitleInput.value.trim()) {
        const titlePart = pathClean ? `${pathClean.charAt(0).toUpperCase() + pathClean.slice(1)} — ${host}` : host.charAt(0).toUpperCase() + host.slice(1);
        itemTitleInput.value = titlePart;
      }

      if (!itemTagsInput.value.trim()) {
        const domainParts = host.split('.');
        if (domainParts[0] && domainParts[0] !== 'com') {
          itemTagsInput.value = domainParts[0];
        }
      }

      showToast('Titel & Domain automatisch ausgefüllt! ✨', 'success');
    } catch (e) {
      showToast('Ungültige URL', 'error');
    }
  });

  // --- Image Upload (Base64) ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Bitte eine gültige Bilddatei wählen', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      imageUrlInput.value = base64;
      imagePreview.src = base64;
      imagePreviewContainer.style.display = 'block';
      if (!itemTitleInput.value.trim()) {
        itemTitleInput.value = file.name.replace(/\.[^/.]+$/, '');
      }
      showToast('Bild erfolgreich geladen!', 'success');
    };
    reader.readAsDataURL(file);
  }

  imageDropZone.addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  removeImageBtn.addEventListener('click', () => {
    imageUrlInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  });

  imageUrlInput.addEventListener('input', () => {
    const val = imageUrlInput.value.trim();
    if (val) {
      imagePreview.src = val;
      imagePreviewContainer.style.display = 'block';
    } else {
      imagePreviewContainer.style.display = 'none';
    }
  });

  // --- Drag and Drop on Whole App ---
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      dropOverlay.classList.remove('active');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');

    // Check dropped files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const newItem = {
            id: 'item-' + Date.now(),
            type: 'image',
            title: file.name.replace(/\.[^/.]+$/, ''),
            url: ev.target.result,
            content: `Hochgeladen am ${new Date().toLocaleDateString('de-DE')}`,
            folder: 'Allgemein',
            tags: ['upload', 'image'],
            favorite: false,
            createdAt: Date.now()
          };
          state.items.unshift(newItem);
          saveAllItems(state.items);
          renderItems();
          showToast(`Bild "${newItem.title}" gespeichert!`, 'success');
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // Check dropped URL / Text
    const textData = e.dataTransfer.getData('text');
    if (textData) {
      const isUrl = /^https?:\/\//i.test(textData.trim());
      const newItem = {
        id: 'item-' + Date.now(),
        type: isUrl ? 'link' : 'note',
        title: isUrl ? formatDomain(textData) : 'Schnellnotiz ' + new Date().toLocaleTimeString('de-DE'),
        url: isUrl ? textData.trim() : '',
        content: isUrl ? '' : textData,
        folder: 'Allgemein',
        tags: isUrl ? ['web'] : ['note'],
        favorite: false,
        createdAt: Date.now()
      };
      state.items.unshift(newItem);
      saveAllItems(state.items);
      renderItems();
      showToast('Eintrag aus Drag & Drop erstellt!', 'success');
    }
  });

  // --- Form Submit: Save Item ---
  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = itemIdInput.value.trim();
    const type = itemTypeInput.value;
    const title = itemTitleInput.value.trim();
    const content = itemContentInput.value.trim();
    const folder = itemFolderSelect.value || 'Allgemein';
    const favorite = itemFavoriteInput.checked;
    const tags = itemTagsInput.value
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    let url = '';
    let codeLang = '';

    if (type === 'link') {
      url = itemUrlInput.value.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
    } else if (type === 'image') {
      url = imageUrlInput.value.trim();
    } else if (type === 'code') {
      codeLang = codeLanguageSelect.value;
    }

    if (id) {
      // Edit existing
      const index = state.items.findIndex(i => i.id === id);
      if (index !== -1) {
        state.items[index] = {
          ...state.items[index],
          type,
          title,
          url,
          content,
          codeLang,
          folder,
          tags,
          favorite,
          updatedAt: Date.now()
        };
        showToast('Eintrag aktualisiert!', 'success');
      }
    } else {
      // Create new
      const newItem = {
        id: 'item-' + Date.now(),
        type,
        title,
        url,
        content,
        codeLang,
        folder,
        tags,
        favorite,
        createdAt: Date.now()
      };
      state.items.unshift(newItem);
      showToast('Neuer Eintrag gespeichert!', 'success');
    }

    saveAllItems(state.items);
    closeModals();
    renderItems();
  });

  // --- Backup: JSON Export & Import ---
  exportDataBtn.addEventListener('click', () => {
    const data = {
      app: 'PinDrop',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      folders: state.customFolders,
      items: state.items
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pindrop-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup erfolgreich heruntergeladen!', 'success');
  });

  importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (Array.isArray(json)) {
          state.items = json;
        } else if (json.items && Array.isArray(json.items)) {
          state.items = json.items;
          if (json.folders && Array.isArray(json.folders)) {
            state.customFolders = Array.from(new Set([...state.customFolders, ...json.folders]));
            localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
          }
        } else {
          throw new Error('Ungültiges Format');
        }

        saveAllItems(state.items);
        closeModals();
        renderItems();
        showToast(`${state.items.length} Lesezeichen importiert!`, 'success');
      } catch (err) {
        showToast('Fehler beim Lesen der JSON-Datei', 'error');
      }
    };
    reader.readAsText(file);
  });

  // --- HTML Browser Bookmarks Import ---
  importHtmlInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const html = ev.target.result;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a');

      if (links.length === 0) {
        showToast('Keine Links in der HTML-Datei gefunden', 'error');
        return;
      }

      let imported = 0;
      links.forEach(a => {
        const href = a.getAttribute('href');
        const title = a.textContent.trim() || href;
        const addDate = a.getAttribute('add_date');
        const tags = a.getAttribute('tags') ? a.getAttribute('tags').split(',') : ['browser-import'];

        if (href && href.startsWith('http')) {
          state.items.unshift({
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            type: 'link',
            title: title,
            url: href,
            content: '',
            folder: 'Importiert',
            tags: tags,
            favorite: false,
            createdAt: addDate ? parseInt(addDate) * 1000 : Date.now()
          });
          imported++;
        }
      });

      if (!state.customFolders.includes('Importiert')) {
        state.customFolders.push('Importiert');
        localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
      }

      saveAllItems(state.items);
      closeModals();
      renderItems();
      showToast(`${imported} Browser-Lesezeichen erfolgreich importiert!`, 'success');
    };
    reader.readAsText(file);
  });

  // --- Sample Data & Clear ---
  loadSampleDataBtn.addEventListener('click', () => {
    state.items = [...DEFAULT_ITEMS];
    saveAllItems(state.items);
    closeModals();
    renderItems();
    showToast('Beispieldaten geladen!', 'success');
  });

  clearAllDataBtn.addEventListener('click', () => {
    if (confirm('Wirklich ALLE Lesezeichen löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      state.items = [];
      saveAllItems(state.items);
      closeModals();
      renderItems();
      showToast('Alle Daten gelöscht', 'info');
    }
  });

  // --- Add Folder ---
  addFolderBtn.addEventListener('click', () => {
    const name = prompt('Name des neuen Ordners:');
    if (name && name.trim()) {
      const clean = name.trim();
      if (!state.customFolders.includes(clean)) {
        state.customFolders.push(clean);
        localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
        renderSidebar();
        showToast(`Ordner "${clean}" erstellt`, 'success');
      } else {
        showToast('Dieser Ordner existiert bereits', 'error');
      }
    }
  });

  // Delete Folder (delegation)
  foldersList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.delete-folder-btn');
    if (delBtn) {
      e.stopPropagation();
      const folderToDelete = delBtn.getAttribute('data-folder');
      if (confirm(`Ordner "${folderToDelete}" löschen? (Einträge werden nach "Allgemein" verschoben)`)) {
        state.customFolders = state.customFolders.filter(f => f !== folderToDelete);
        localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
        state.items.forEach(i => {
          if (i.folder === folderToDelete) i.folder = 'Allgemein';
        });
        saveAllItems(state.items);
        if (state.currentFilter === 'folder:' + folderToDelete) {
          state.currentFilter = 'all';
        }
        renderItems();
        showToast(`Ordner "${folderToDelete}" gelöscht`, 'info');
      }
    }
  });

  // --- Event Listeners: Navigation, Search, UI ---
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-folder-btn')) return;
      const filter = item.getAttribute('data-filter');
      if (filter) setFilter(filter);
      if (window.innerWidth <= 900) {
        sidebar.classList.remove('mobile-open');
      }
    });
  });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
    renderItems();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderItems();
    searchInput.focus();
  });

  sortSelect.addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    renderItems();
  });

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.getAttribute('data-view');
      state.currentView = view;
      cardsGrid.className = `cards-grid view-${view}`;
    });
  });

  // Modals Open / Close triggers
  document.getElementById('openNewItemModalBtn').addEventListener('click', openNewItemModal);
  document.getElementById('openNewItemModalTopBtn').addEventListener('click', openNewItemModal);
  document.getElementById('emptyAddBtn').addEventListener('click', openNewItemModal);
  document.getElementById('closeItemModalBtn').addEventListener('click', closeModals);
  document.getElementById('cancelItemModalBtn').addEventListener('click', closeModals);
  closeDetailModalBtn.addEventListener('click', closeModals);

  openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('open');
  });
  closeSettingsModalBtn.addEventListener('click', closeModals);

  typeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-tab-btn');
    if (btn) {
      setModalType(btn.getAttribute('data-type'));
    }
  });

  // Backdrop click to close modals
  [itemModal, detailModal, settingsModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModals();
    });
  });

  // Sidebar toggle
  collapseSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  themeToggleBtn.addEventListener('click', toggleTheme);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    // N: New bookmark (if not focused in an input)
    if (e.key === 'n' || e.key === 'N') {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea' && !itemModal.classList.contains('open')) {
        e.preventDefault();
        openNewItemModal();
      }
    }
    // Escape: Close modal
    if (e.key === 'Escape') {
      closeModals();
    }
  });

  // --- Initialize App ---
  async function init() {
    initTheme();
    await initDB();
    state.items = await loadAllItems();
    renderItems();
  }

  init();
})();
