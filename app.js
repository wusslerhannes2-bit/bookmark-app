/**
 * PinDrop — Minimalist Bookmark & Snippet Space
 * Pure client-side application with zero external runtime dependencies.
 */

(function () {
  'use strict';

  // --- Register Service Worker for PWA Offline App ---
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // --- Storage Engine (IndexedDB + localStorage Sync) ---
  const DB_NAME = 'pindrop_space_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'items';

  let db = null;

  function initDB() {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          resolve(false);
          return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => resolve(false);
        req.onsuccess = (e) => {
          db = e.target.result;
          resolve(true);
        };
        req.onupgradeneeded = (e) => {
          const database = e.target.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      } catch (err) {
        resolve(false);
      }
    });
  }

  async function loadAllItems() {
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction([STORE_NAME], 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) {
              resolve(req.result);
            } else {
              const local = loadFromLocalStorage();
              if (local.length > 0) saveAllItems(local);
              resolve(local);
            }
          };
          req.onerror = () => resolve(loadFromLocalStorage());
        } catch (e) {
          resolve(loadFromLocalStorage());
        }
      });
    }
    return loadFromLocalStorage();
  }

  function loadFromLocalStorage() {
    try {
      const local = localStorage.getItem('pindrop_items');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }

  async function saveAllItems(items) {
    if (db) {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        items.forEach(item => store.put(item));
      } catch (err) {
        console.warn('IndexedDB write issue:', err);
      }
    }
    try {
      localStorage.setItem('pindrop_items', JSON.stringify(items));
    } catch (e) {}
  }

  // --- App State ---
  const state = {
    items: [],
    selectedIds: new Set(),
    currentFilter: 'all',
    searchQuery: '',
    currentSort: 'newest',
    currentView: 'grid',
    activeTypeInModal: 'link',
    customFolders: ['Allgemein']
  };

  try {
    const savedFolders = localStorage.getItem('pindrop_folders');
    if (savedFolders) state.customFolders = JSON.parse(savedFolders);
  } catch (e) {}

  // --- DOM Elements ---
  const cardsGrid = document.getElementById('cardsGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDesc');
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

  // Bulk Actions
  const bulkActions = document.getElementById('bulkActions');
  const bulkCount = document.getElementById('bulkCount');
  const bulkFavBtn = document.getElementById('bulkFavBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const bulkCancelBtn = document.getElementById('bulkCancelBtn');

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
  const itemColorInput = document.getElementById('itemColorInput');
  const itemColorPicker = document.getElementById('itemColorPicker');
  const itemTitleInput = document.getElementById('itemTitle');
  const itemContentInput = document.getElementById('itemContent');
  const codeLanguageSelect = document.getElementById('codeLanguage');
  const itemFolderSelect = document.getElementById('itemFolder');
  const itemTagsInput = document.getElementById('itemTags');
  const itemFavoriteInput = document.getElementById('itemFavorite');
  const fetchMetadataBtn = document.getElementById('fetchMetadataBtn');

  // Detail Modal
  const detailModal = document.getElementById('detailModal');
  const detailBadges = document.getElementById('detailBadges');
  const detailBody = document.getElementById('detailBody');
  const detailFooter = document.getElementById('detailFooter');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');

  // QR Modal
  const qrModal = document.getElementById('qrModal');
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  const qrUrlText = document.getElementById('qrUrlText');
  const copyQrUrlBtn = document.getElementById('copyQrUrlBtn');
  const closeQrModalBtn = document.getElementById('closeQrModalBtn');

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const exportMarkdownBtn = document.getElementById('exportMarkdownBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const importHtmlInput = document.getElementById('importHtmlInput');
  const clearAllDataBtn = document.getElementById('clearAllDataBtn');
  const addFolderBtn = document.getElementById('addFolderBtn');
  const setPinInput = document.getElementById('setPinInput');
  const savePinBtn = document.getElementById('savePinBtn');
  const removePinBtn = document.getElementById('removePinBtn');
  const unlockForm = document.getElementById('unlockForm');
  const unlockPinInput = document.getElementById('unlockPinInput');
  const accentPicker = document.getElementById('accentPicker');

  // Cloud Sync Elements
  const syncTokenInput = document.getElementById('syncTokenInput');
  const syncPasswordInput = document.getElementById('syncPasswordInput');
  const syncGistIdInput = document.getElementById('syncGistIdInput');
  const syncUploadBtn = document.getElementById('syncUploadBtn');
  const syncDownloadBtn = document.getElementById('syncDownloadBtn');
  const syncStatusMsg = document.getElementById('syncStatusMsg');

  // --- Load saved cloud sync credentials ---
  try {
    const savedToken = localStorage.getItem('pindrop_sync_token');
    const savedGistId = localStorage.getItem('pindrop_sync_gist_id');
    if (savedToken && syncTokenInput) syncTokenInput.value = savedToken;
    if (savedGistId && syncGistIdInput) syncGistIdInput.value = savedGistId;
  } catch (e) {}

  // --- Cryptography Helpers (AES-GCM 256 + PBKDF2) ---
  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptData(plainText, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(plainText)
    );

    function bufferToBase64(buf) {
      return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }

    return JSON.stringify({
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      data: bufferToBase64(encryptedContent)
    });
  }

  async function decryptData(encryptedJsonStr, password) {
    function base64ToBuffer(b64) {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr.buffer;
    }

    const parsed = JSON.parse(encryptedJsonStr);
    const salt = base64ToBuffer(parsed.salt);
    const iv = base64ToBuffer(parsed.iv);
    const encryptedData = base64ToBuffer(parsed.data);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }

  // --- Utilities ---
  function getFaviconUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch (e) {
      return '';
    }
  }

  function formatDomain(url) {
    if (!url) return '';
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      return u.hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
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
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'copy') icon = '📋';

    toast.innerHTML = `<span style="font-weight:700; color:var(--accent);">${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2400);
  }

  function copyToClipboard(text, label = 'Text') {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} kopiert!`, 'copy');
    }).catch(() => {
      showToast('Kopieren fehlgeschlagen.', 'error');
    });
  }

  // --- Smart Categorization Rules ---
  function applySmartRules(url) {
    if (!url) return { folder: null, tags: [] };
    const lower = url.toLowerCase();

    if (lower.includes('github.com') || lower.includes('gitlab.com')) {
      return { folder: 'Development', tags: ['git', 'dev'] };
    }
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
      return { folder: 'Medien', tags: ['video'] };
    }
    if (lower.includes('figma.com') || lower.includes('dribbble.com') || lower.includes('behance.net')) {
      return { folder: 'Design', tags: ['design', 'ui'] };
    }
    if (lower.includes('medium.com') || lower.includes('dev.to') || lower.includes('substack.com')) {
      return { folder: 'Leseliste', tags: ['article', 'reading'] };
    }
    if (lower.includes('stackoverflow.com') || lower.includes('developer.mozilla.org')) {
      return { folder: 'Development', tags: ['docs', 'coding'] };
    }
    return { folder: null, tags: [] };
  }

  // --- Theme & Accent ---
  function initThemes() {
    const savedTheme = localStorage.getItem('pindrop_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedAccent = localStorage.getItem('pindrop_accent') || 'indigo';
    document.documentElement.setAttribute('data-accent', savedAccent);

    if (accentPicker) {
      accentPicker.querySelectorAll('.accent-dot').forEach(dot => {
        dot.classList.toggle('active', dot.getAttribute('data-accent') === savedAccent);
      });
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pindrop_theme', next);
  }

  if (accentPicker) {
    accentPicker.addEventListener('click', (e) => {
      const dot = e.target.closest('.accent-dot');
      if (dot) {
        const accent = dot.getAttribute('data-accent');
        document.documentElement.setAttribute('data-accent', accent);
        localStorage.setItem('pindrop_accent', accent);
        accentPicker.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        showToast(`Farbschema geändert (${accent})`);
      }
    });
  }

  // --- PIN Protection ---
  async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode('pindrop_secure_' + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function checkPinProtection() {
    const savedPinHash = localStorage.getItem('pindrop_pin_hash');
    const lockScreen = document.getElementById('lockScreen');
    const pinStatusText = document.getElementById('pinStatusText');
    const removePinBtn = document.getElementById('removePinBtn');

    if (savedPinHash) {
      lockScreen.style.display = 'flex';
      if (pinStatusText) pinStatusText.style.display = 'inline-block';
      if (removePinBtn) removePinBtn.style.display = 'inline-block';
    } else {
      lockScreen.style.display = 'none';
      if (pinStatusText) pinStatusText.style.display = 'none';
      if (removePinBtn) removePinBtn.style.display = 'none';
    }
  }

  // --- QR Code ---
  function openQrModal(url) {
    if (!url) return;
    const cleanUrl = url.startsWith('http') ? url : 'https://' + url;
    const encoded = encodeURIComponent(cleanUrl);
    qrCodeContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&margin=0" alt="QR Code" style="width:180px; height:180px; display:block;" />`;
    qrUrlText.textContent = cleanUrl;
    copyQrUrlBtn.onclick = () => copyToClipboard(cleanUrl, 'Link');
    qrModal.classList.add('open');
  }

  // --- Sidebar & Folders ---
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
    const activeItems = state.items.filter(i => !i.trashed);
    const trashedItems = state.items.filter(i => i.trashed);

    document.getElementById('count-all').textContent = activeItems.length;
    document.getElementById('count-favorites').textContent = activeItems.filter(i => i.favorite).length;
    document.getElementById('count-type-link').textContent = activeItems.filter(i => i.type === 'link').length;
    document.getElementById('count-type-image').textContent = activeItems.filter(i => i.type === 'image').length;
    document.getElementById('count-type-note').textContent = activeItems.filter(i => i.type === 'note').length;
    document.getElementById('count-type-color').textContent = activeItems.filter(i => i.type === 'color').length;
    document.getElementById('count-type-code').textContent = activeItems.filter(i => i.type === 'code').length;
    document.getElementById('count-trash').textContent = trashedItems.length;

    // Folders
    foldersList.innerHTML = '';
    state.customFolders.forEach(folder => {
      const count = activeItems.filter(i => (i.folder || 'Allgemein') === folder).length;
      const li = document.createElement('li');
      li.className = `nav-item ${state.currentFilter === 'folder:' + folder ? 'active' : ''}`;
      li.setAttribute('data-filter', `folder:${folder}`);
      li.innerHTML = `
        <button class="nav-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          <span>${escapeHtml(folder)}</span>
          <span class="count-badge">${count}</span>
          ${folder !== 'Allgemein' ? `<span class="folder-action-btn delete-folder-btn" title="Ordner löschen" data-folder="${escapeHtml(folder)}">✕</span>` : ''}
        </button>
      `;
      foldersList.appendChild(li);
    });

    // Tag cloud
    const tagCounts = {};
    activeItems.forEach(item => {
      (item.tags || []).forEach(t => {
        const clean = t.trim().toLowerCase();
        if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });

    tagsCloud.innerHTML = '';
    const sortedTags = Object.keys(tagCounts).sort();
    if (sortedTags.length === 0) {
      tagsCloud.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); padding:2px 6px;">Keine Tags</span>`;
    } else {
      sortedTags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = `tag-chip ${state.currentFilter === 'tag:' + tag ? 'active' : ''}`;
        chip.innerHTML = `#${escapeHtml(tag)} <span style="opacity:0.6; font-size:0.68rem;">${tagCounts[tag]}</span>`;
        chip.addEventListener('click', () => setFilter(`tag:${tag}`));
        tagsCloud.appendChild(chip);
      });
    }

    updateFolderSelect();
  }

  function setFilter(filter) {
    state.currentFilter = filter;
    state.selectedIds.clear();
    updateBulkActionsUI();

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-filter') === filter);
    });

    renderItems();
  }

  function getFilteredItems() {
    let result = [...state.items];

    if (state.currentFilter === 'trash') {
      result = result.filter(i => i.trashed);
    } else {
      result = result.filter(i => !i.trashed);

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
        result = result.filter(i => (i.tags || []).some(t => t.toLowerCase() === tag));
      }
    }

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

  function updateFilterHeader(filteredCount) {
    let title = 'Alle Einträge';
    let subtitle = `${filteredCount} Element${filteredCount === 1 ? '' : 'e'}`;

    if (state.currentFilter === 'trash') title = '🗑️ Papierkorb';
    else if (state.currentFilter === 'favorites') title = '❤️ Favoriten';
    else if (state.currentFilter === 'type-link') title = '🔗 Links';
    else if (state.currentFilter === 'type-image') title = '🖼️ Bilder';
    else if (state.currentFilter === 'type-note') title = '📝 Notizen & To-Dos';
    else if (state.currentFilter === 'type-color') title = '🎨 Farben';
    else if (state.currentFilter === 'type-code') title = '💻 Code-Snippets';
    else if (state.currentFilter.startsWith('folder:')) title = `📁 ${state.currentFilter.replace('folder:', '')}`;
    else if (state.currentFilter.startsWith('tag:')) title = `#${state.currentFilter.replace('tag:', '')}`;

    if (state.searchQuery) subtitle += ` • Filter: "${state.searchQuery}"`;

    filterTitle.textContent = title;
    filterSubtitle.textContent = subtitle;

    activeFilterTags.innerHTML = '';
    if (state.currentFilter !== 'all') {
      const badge = document.createElement('div');
      badge.className = 'active-filter-badge';
      badge.innerHTML = `${title} <button style="color:var(--accent); font-size:0.8rem; margin-left:4px;">✕</button>`;
      badge.querySelector('button').addEventListener('click', () => setFilter('all'));
      activeFilterTags.appendChild(badge);
    }
  }

  function updateBulkActionsUI() {
    const count = state.selectedIds.size;
    if (count > 0) {
      bulkActions.style.display = 'flex';
      bulkCount.textContent = `${count} gewählt`;
    } else {
      bulkActions.style.display = 'none';
    }
  }

  // --- Render Checklist helper ---
  function renderChecklistHtml(content, itemId) {
    if (!content) return '';
    const lines = content.split('\n');
    const hasCheckboxes = lines.some(l => /^\s*-\s*\[([ xX])\]/.test(l));

    if (!hasCheckboxes) {
      return `<div class="card-content-text" data-action="view-detail">${escapeHtml(content)}</div>`;
    }

    let html = '<div class="todo-list-container">';
    lines.forEach((line, idx) => {
      const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const taskText = match[2];
        html += `
          <label class="todo-item ${isChecked ? 'done' : ''}" data-item-id="${itemId}" data-line-idx="${idx}">
            <input type="checkbox" class="todo-checkbox" ${isChecked ? 'checked' : ''}>
            <span>${escapeHtml(taskText)}</span>
          </label>
        `;
      } else if (line.trim()) {
        html += `<div style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(line)}</div>`;
      }
    });
    html += '</div>';
    return html;
  }

  // --- Render Bookmarks ---
  function renderItems() {
    const filtered = getFilteredItems();
    updateFilterHeader(filtered.length);
    renderSidebar();

    cardsGrid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      if (state.currentFilter === 'trash') {
        emptyTitle.textContent = 'Papierkorb ist leer';
        emptyDesc.textContent = 'Gelöschte Einträge landen hier und können wiederhergestellt werden.';
      } else if (state.searchQuery) {
        emptyTitle.textContent = `Keine Treffer für "${state.searchQuery}"`;
        emptyDesc.textContent = 'Versuche einen anderen Suchbegriff.';
      } else {
        emptyTitle.textContent = 'Keine Einträge vorhanden';
        emptyDesc.textContent = 'Klicke auf "Neuer Eintrag" oder drücke N, um zu starten.';
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
    const isSelected = state.selectedIds.has(item.id);
    card.className = `bookmark-card ${isSelected ? 'selected' : ''}`;
    card.setAttribute('data-id', item.id);

    // Image section
    let mediaHtml = '';
    if (item.type === 'image' && item.url) {
      mediaHtml = `
        <div class="card-media-wrapper" data-action="view-detail">
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" class="card-img" loading="lazy">
        </div>
      `;
    }

    // Color Swatch section
    let colorHtml = '';
    if (item.type === 'color' && item.url) {
      colorHtml = `
        <div class="card-color-swatch" style="background: ${escapeHtml(item.url)};" data-action="copy-color" data-color="${escapeHtml(item.url)}">
          <span class="color-hex-label">${escapeHtml(item.url)} (Kopieren)</span>
        </div>
      `;
    }

    // Code section
    let codeHtml = '';
    if (item.type === 'code' && item.content) {
      codeHtml = `
        <div class="code-preview-box" data-action="view-detail">
          <span class="code-lang-tag">${escapeHtml(item.codeLang || 'CODE')}</span>
          <pre><code>${escapeHtml(item.content)}</code></pre>
        </div>
      `;
    }

    // Favicon & Type icon
    let faviconHtml = '';
    if (item.type === 'link') {
      const fav = getFaviconUrl(item.url);
      faviconHtml = `
        <div class="favicon-box">
          <img src="${fav}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' fill=\'%236366f1\' viewBox=\'0 0 24 24\'><path d=\'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\'/><path d=\'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\'/></svg>'">
        </div>
      `;
    } else if (item.type === 'note') {
      faviconHtml = `<div class="favicon-box" style="color:var(--success);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg></div>`;
    } else if (item.type === 'color') {
      faviconHtml = `<div class="favicon-box" style="background:${escapeHtml(item.url || 'var(--accent)')};"></div>`;
    } else if (item.type === 'code') {
      faviconHtml = `<div class="favicon-box" style="color:#38bdf8;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>`;
    } else if (item.type === 'image') {
      faviconHtml = `<div class="favicon-box" style="color:var(--favorite);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/></svg></div>`;
    }

    let tagsHtml = '';
    if (item.tags && item.tags.length > 0) {
      tagsHtml = `
        <div class="card-tags">
          ${item.tags.map(t => `<span class="card-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join('')}
        </div>
      `;
    }

    let contentHtml = '';
    if (item.type === 'note') {
      contentHtml = renderChecklistHtml(item.content, item.id);
    } else if (item.type !== 'code' && item.type !== 'color' && item.content) {
      contentHtml = `<div class="card-content-text" data-action="view-detail">${escapeHtml(item.content)}</div>`;
    }

    let actionsFooter = '';
    if (item.trashed) {
      actionsFooter = `
        <button class="card-btn" data-action="restore" title="Wiederherstellen" style="color:var(--success);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span>Wiederherstellen</span>
        </button>
        <button class="card-btn text-danger" data-action="delete-forever" title="Endgültig löschen">Endgültig löschen</button>
      `;
    } else {
      let visitLinkHtml = '';
      let qrBtnHtml = '';
      if (item.type === 'link' && item.url) {
        visitLinkHtml = `
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="card-btn visit-btn" title="Link öffnen">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
            <span>${escapeHtml(formatDomain(item.url))}</span>
          </a>
        `;
        qrBtnHtml = `
          <button class="card-btn" data-action="qr" title="QR-Code für Smartphone">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
          </button>
        `;
      }

      actionsFooter = `
        <div class="card-folder-badge">📁 ${escapeHtml(item.folder || 'Allgemein')}</div>
        <div class="card-buttons">
          ${visitLinkHtml}
          ${qrBtnHtml}
          <button class="card-btn" data-action="copy" title="Inhalt kopieren">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <button class="card-btn" data-action="edit" title="Bearbeiten">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button class="card-btn text-danger" data-action="soft-delete" title="In Papierkorb">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      <input type="checkbox" class="card-select-checkbox" data-action="select-item" ${isSelected ? 'checked' : ''}>
      ${mediaHtml}
      ${colorHtml}
      <div class="card-body">
        <div class="card-top">
          <div class="card-icon-title">
            ${faviconHtml}
            <h3 class="card-title" data-action="view-detail">${escapeHtml(item.title)}</h3>
          </div>
          ${!item.trashed ? `
            <button class="fav-toggle-btn ${item.favorite ? 'is-fav' : ''}" data-action="toggle-fav" title="Favorit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
          ` : ''}
        </div>

        ${codeHtml}
        ${contentHtml}
        ${tagsHtml}
      </div>

      <div class="card-footer">
        ${actionsFooter}
      </div>
    `;

    // Click delegation
    card.addEventListener('click', (e) => {
      // Checkbox Toggle in To-Do Notes
      const todoCheckbox = e.target.closest('.todo-checkbox');
      if (todoCheckbox) {
        const todoLabel = todoCheckbox.closest('.todo-item');
        const lineIdx = parseInt(todoLabel.getAttribute('data-line-idx'), 10);
        const isChecked = todoCheckbox.checked;

        const lines = (item.content || '').split('\n');
        if (lines[lineIdx]) {
          lines[lineIdx] = lines[lineIdx].replace(/^(\s*-\s*\[)([ xX])(\])/, `$1${isChecked ? 'x' : ' '}$3`);
          item.content = lines.join('\n');
          saveAllItems(state.items);
          todoLabel.classList.toggle('done', isChecked);
        }
        return;
      }

      const target = e.target.closest('[data-action], [data-tag]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const tag = target.getAttribute('data-tag');

      if (tag) {
        setFilter(`tag:${tag}`);
        return;
      }

      if (action === 'select-item') {
        if (state.selectedIds.has(item.id)) state.selectedIds.delete(item.id);
        else state.selectedIds.add(item.id);
        card.classList.toggle('selected', state.selectedIds.has(item.id));
        updateBulkActionsUI();
      } else if (action === 'copy-color') {
        copyToClipboard(item.url, 'Farbcode');
      } else if (action === 'toggle-fav') {
        item.favorite = !item.favorite;
        saveAllItems(state.items);
        renderItems();
        showToast(item.favorite ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
      } else if (action === 'qr') {
        openQrModal(item.url);
      } else if (action === 'copy') {
        const textToCopy = item.url || item.content || item.title;
        copyToClipboard(textToCopy, item.type === 'link' ? 'Link' : 'Inhalt');
      } else if (action === 'edit') {
        openEditModal(item);
      } else if (action === 'soft-delete') {
        item.trashed = true;
        saveAllItems(state.items);
        renderItems();
        showToast('In Papierkorb verschoben', 'info');
      } else if (action === 'restore') {
        item.trashed = false;
        saveAllItems(state.items);
        renderItems();
        showToast('Wiederhergestellt!', 'success');
      } else if (action === 'delete-forever') {
        if (confirm(`Eintrag "${item.title}" endgültig löschen?`)) {
          state.items = state.items.filter(i => i.id !== item.id);
          saveAllItems(state.items);
          renderItems();
          showToast('Endgültig gelöscht', 'info');
        }
      } else if (action === 'view-detail') {
        openDetailModal(item);
      }
    });

    return card;
  }

  // --- Bulk Actions ---
  bulkFavBtn.addEventListener('click', () => {
    state.items.forEach(i => {
      if (state.selectedIds.has(i.id)) i.favorite = true;
    });
    saveAllItems(state.items);
    state.selectedIds.clear();
    updateBulkActionsUI();
    renderItems();
    showToast('Ausgewählte Einträge favorisiert!', 'success');
  });

  bulkDeleteBtn.addEventListener('click', () => {
    if (confirm(`${state.selectedIds.size} Einträge in den Papierkorb verschieben?`)) {
      state.items.forEach(i => {
        if (state.selectedIds.has(i.id)) i.trashed = true;
      });
      saveAllItems(state.items);
      state.selectedIds.clear();
      updateBulkActionsUI();
      renderItems();
      showToast('Einträge in Papierkorb verschoben', 'info');
    }
  });

  bulkCancelBtn.addEventListener('click', () => {
    state.selectedIds.clear();
    updateBulkActionsUI();
    document.querySelectorAll('.bookmark-card').forEach(c => c.classList.remove('selected'));
  });

  // --- Modal Logic ---
  function setModalType(type) {
    state.activeTypeInModal = type;
    itemTypeInput.value = type;

    document.querySelectorAll('.type-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });

    document.querySelector('.field-link').style.display = type === 'link' ? 'block' : 'none';
    document.querySelector('.field-image').style.display = type === 'image' ? 'block' : 'none';
    document.querySelector('.field-color').style.display = type === 'color' ? 'block' : 'none';
    document.querySelector('.field-code').style.display = type === 'code' ? 'block' : 'none';

    if (type === 'color') {
      document.getElementById('contentLabel').textContent = 'Farbnotiz / Verwendung';
    } else if (type === 'code') {
      document.getElementById('contentLabel').textContent = 'Code-Inhalt';
    } else if (type === 'note') {
      document.getElementById('contentLabel').textContent = 'Notiz (z. B. - [ ] Aufgabe für To-Dos)';
    } else {
      document.getElementById('contentLabel').textContent = 'Optionale Beschreibung';
    }
  }

  // Color picker sync
  if (itemColorPicker && itemColorInput) {
    itemColorPicker.addEventListener('input', (e) => {
      itemColorInput.value = e.target.value;
    });
    itemColorInput.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        itemColorPicker.value = e.target.value;
      }
    });
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
    }, 80);
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
    } else if (item.type === 'color') {
      itemColorInput.value = item.url || '#6366f1';
      itemColorPicker.value = item.url || '#6366f1';
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
    qrModal.classList.remove('open');
  }

  function openDetailModal(item) {
    detailBadges.innerHTML = `
      <span class="card-tag">${item.type.toUpperCase()}</span>
      <span class="card-tag">📁 ${escapeHtml(item.folder || 'Allgemein')}</span>
      ${item.favorite ? '<span class="card-tag" style="color:var(--favorite);">❤️ Favorit</span>' : ''}
    `;

    let bodyContent = `<h2 style="font-size:1.3rem; font-weight:700; margin-bottom:12px;">${escapeHtml(item.title)}</h2>`;

    if (item.type === 'image' && item.url) {
      bodyContent += `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}" class="detail-img">`;
    }

    if (item.type === 'color' && item.url) {
      bodyContent += `
        <div style="height:120px; border-radius:var(--radius-md); background:${escapeHtml(item.url)}; display:flex; align-items:center; justify-content:center; color:#fff; font-family:var(--font-mono); font-weight:700; font-size:1.2rem;">
          ${escapeHtml(item.url)}
        </div>
      `;
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

    detailFooter.innerHTML = `
      <button class="btn btn-secondary btn-sm" id="detailCopyBtn">Kopieren</button>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary btn-sm" id="detailEditBtn">Bearbeiten</button>
        ${item.url && item.type === 'link' ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Öffnen</a>` : ''}
      </div>
    `;

    document.getElementById('detailCopyBtn').onclick = () => copyToClipboard(item.url || item.content || item.title, 'Inhalt');
    document.getElementById('detailEditBtn').onclick = () => {
      detailModal.classList.remove('open');
      openEditModal(item);
    };

    detailModal.classList.add('open');
  }

  // --- Auto Title & Smart Rules ---
  function autofillMetadata() {
    let url = itemUrlInput.value.trim();
    if (!url) return;

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

      // Smart Rules
      const rules = applySmartRules(url);
      if (rules.folder && !itemFolderSelect.value) {
        if (!state.customFolders.includes(rules.folder)) {
          state.customFolders.push(rules.folder);
          updateFolderSelect();
        }
        itemFolderSelect.value = rules.folder;
      }
      if (rules.tags.length > 0 && !itemTagsInput.value.trim()) {
        itemTagsInput.value = rules.tags.join(', ');
      } else if (!itemTagsInput.value.trim()) {
        const domainParts = host.split('.');
        if (domainParts[0] && domainParts[0] !== 'com') itemTagsInput.value = domainParts[0];
      }
    } catch (e) {}
  }

  fetchMetadataBtn.addEventListener('click', () => {
    autofillMetadata();
    showToast('Titel & Smart-Rules angewandt! ✨', 'success');
  });

  itemUrlInput.addEventListener('blur', () => {
    if (itemUrlInput.value.trim() && !itemTitleInput.value.trim()) autofillMetadata();
  });

  // --- Image Upload ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Ungültige Bilddatei', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      imageUrlInput.value = base64;
      imagePreview.src = base64;
      imagePreviewContainer.style.display = 'block';
      if (!itemTitleInput.value.trim()) itemTitleInput.value = file.name.replace(/\.[^/.]+$/, '');
      showToast('Bild geladen!', 'success');
    };
    reader.readAsDataURL(file);
  }

  imageDropZone.addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
  });

  removeImageBtn.addEventListener('click', () => {
    imageUrlInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  });

  imageUrlInput.addEventListener('input', () => {
    const val = imageUrlInput.value.trim();
    imagePreview.src = val;
    imagePreviewContainer.style.display = val ? 'block' : 'none';
  });

  // --- Drag & Drop ---
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
            content: `Upload am ${new Date().toLocaleDateString('de-DE')}`,
            folder: 'Allgemein',
            tags: ['upload'],
            favorite: false,
            createdAt: Date.now()
          };
          state.items.unshift(newItem);
          saveAllItems(state.items);
          renderItems();
          showToast(`Bild "${newItem.title}" hinzugefügt!`, 'success');
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    const textData = e.dataTransfer.getData('text');
    if (textData) {
      const isUrl = /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(textData.trim());
      const cleanUrl = isUrl && !textData.startsWith('http') ? 'https://' + textData.trim() : textData.trim();
      const rules = isUrl ? applySmartRules(cleanUrl) : { folder: 'Allgemein', tags: ['note'] };

      const newItem = {
        id: 'item-' + Date.now(),
        type: isUrl ? 'link' : 'note',
        title: isUrl ? formatDomain(cleanUrl) : 'Schnellnotiz ' + new Date().toLocaleTimeString('de-DE'),
        url: isUrl ? cleanUrl : '',
        content: isUrl ? '' : textData,
        folder: rules.folder || 'Allgemein',
        tags: rules.tags || [],
        favorite: false,
        createdAt: Date.now()
      };
      state.items.unshift(newItem);
      saveAllItems(state.items);
      renderItems();
      showToast('Eintrag erstellt!', 'success');
    }
  });

  // --- Form Submit ---
  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = itemIdInput.value.trim();
    const type = itemTypeInput.value || 'link';
    let title = itemTitleInput.value.trim();
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
      if (!title) title = url ? formatDomain(url) : 'Neuer Link';
    } else if (type === 'image') {
      url = imageUrlInput.value.trim();
      if (!title) title = 'Bild ' + new Date().toLocaleDateString('de-DE');
    } else if (type === 'color') {
      url = itemColorInput.value.trim() || '#6366f1';
      if (!title) title = url;
    } else if (type === 'code') {
      codeLang = codeLanguageSelect.value;
      if (!title) title = 'Snippet (' + (codeLang || 'Text') + ')';
    } else if (type === 'note') {
      if (!title) title = content ? (content.slice(0, 32) + (content.length > 32 ? '...' : '')) : 'Notiz ' + new Date().toLocaleDateString('de-DE');
    }

    if (!title) title = 'Eintrag';

    if (id) {
      const idx = state.items.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], type, title, url, content, codeLang, folder, tags, favorite, updatedAt: Date.now() };
        showToast('Eintrag aktualisiert!', 'success');
      }
    } else {
      const newItem = { id: 'item-' + Date.now(), type, title, url, content, codeLang, folder, tags, favorite, createdAt: Date.now() };
      state.items.unshift(newItem);
      showToast('Eintrag gespeichert!', 'success');
    }

    saveAllItems(state.items);
    closeModals();
    renderItems();
  });

  // --- Encrypted Cloud Sync (GitHub Gist API) ---
  syncUploadBtn.addEventListener('click', async () => {
    const token = syncTokenInput.value.trim();
    const password = syncPasswordInput.value.trim();
    let gistId = syncGistIdInput.value.trim();

    if (!token || !password) {
      showToast('Token und Passwort erforderlich!', 'error');
      return;
    }

    syncStatusMsg.textContent = 'Verschlüssele und lade hoch...';
    try {
      localStorage.setItem('pindrop_sync_token', token);

      const payload = JSON.stringify({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        folders: state.customFolders,
        items: state.items
      });

      // Encrypt with AES-GCM 256
      const encryptedBlob = await encryptData(payload, password);

      const requestBody = {
        description: 'PinDrop Private Encrypted Bookmark Sync',
        public: false,
        files: {
          'pindrop_encrypted_sync.json': {
            content: encryptedBlob
          }
        }
      };

      let res;
      if (gistId) {
        res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
      } else {
        res = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
      }

      if (!res.ok) throw new Error(`GitHub API Fehler (${res.status})`);
      const gistData = await res.json();
      syncGistIdInput.value = gistData.id;
      localStorage.setItem('pindrop_sync_gist_id', gistData.id);

      syncStatusMsg.textContent = `✓ Erfolgreich verschlüsselt gesichert (${new Date().toLocaleTimeString('de-DE')})`;
      syncStatusMsg.style.color = 'var(--success)';
      showToast('Verschlüsselter Sync erfolgreich! 🔒', 'success');
    } catch (err) {
      syncStatusMsg.textContent = `Fehler: ${err.message}`;
      syncStatusMsg.style.color = 'var(--danger)';
      showToast('Sync fehlgeschlagen', 'error');
    }
  });

  syncDownloadBtn.addEventListener('click', async () => {
    const token = syncTokenInput.value.trim();
    const password = syncPasswordInput.value.trim();
    const gistId = syncGistIdInput.value.trim();

    if (!token || !password || !gistId) {
      showToast('Token, Passwort und Gist-ID erforderlich!', 'error');
      return;
    }

    syncStatusMsg.textContent = 'Lade aus Cloud und entschlüssele...';
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!res.ok) throw new Error(`Gist nicht gefunden (${res.status})`);
      const gistData = await res.json();
      const file = gistData.files['pindrop_encrypted_sync.json'];
      if (!file || !file.content) throw new Error('Keine PinDrop-Sync-Datei im Gist gefunden');

      // Decrypt AES-GCM 256
      const decryptedJsonStr = await decryptData(file.content, password);
      const data = JSON.parse(decryptedJsonStr);

      if (data.items && Array.isArray(data.items)) {
        state.items = data.items;
        if (data.folders) {
          state.customFolders = Array.from(new Set([...state.customFolders, ...data.folders]));
          localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
        }
        saveAllItems(state.items);
        renderItems();
        syncStatusMsg.textContent = `✓ ${state.items.length} Einträge synchronisiert`;
        syncStatusMsg.style.color = 'var(--success)';
        showToast('Erfolgreich aus Cloud wiederhergestellt! 🔓', 'success');
      }
    } catch (err) {
      syncStatusMsg.textContent = `Entschlüsselung fehlgeschlagen (Falsches Passwort?)`;
      syncStatusMsg.style.color = 'var(--danger)';
      showToast('Entschlüsselung fehlgeschlagen', 'error');
    }
  });

  // --- PIN / Password Security ---
  savePinBtn.addEventListener('click', async () => {
    const pin = setPinInput.value.trim();
    if (!pin) {
      showToast('Bitte eine PIN eingeben', 'error');
      return;
    }
    const hash = await hashPin(pin);
    localStorage.setItem('pindrop_pin_hash', hash);
    setPinInput.value = '';
    checkPinProtection();
    showToast('PIN-Schutz aktiv! 🔒', 'success');
  });

  removePinBtn.addEventListener('click', () => {
    if (confirm('PIN-Schutz wirklich entfernen?')) {
      localStorage.removeItem('pindrop_pin_hash');
      checkPinProtection();
      showToast('PIN-Schutz deaktiviert', 'info');
    }
  });

  unlockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = unlockPinInput.value.trim();
    const enteredHash = await hashPin(pin);
    const savedHash = localStorage.getItem('pindrop_pin_hash');

    if (enteredHash === savedHash) {
      document.getElementById('lockScreen').style.display = 'none';
      unlockPinInput.value = '';
      showToast('Entsperrt! 🔓', 'success');
    } else {
      showToast('Falsche PIN', 'error');
      unlockPinInput.value = '';
      unlockPinInput.focus();
    }
  });

  // --- Export (JSON & Markdown) ---
  exportDataBtn.addEventListener('click', () => {
    const data = { app: 'PinDrop', version: '2.0', exportedAt: new Date().toISOString(), folders: state.customFolders, items: state.items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pindrop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup gespeichert!', 'success');
  });

  exportMarkdownBtn.addEventListener('click', () => {
    let md = `# PinDrop Bookmarks Export\n*Exportiert am ${new Date().toLocaleDateString('de-DE')}*\n\n`;
    state.customFolders.forEach(folder => {
      const folderItems = state.items.filter(i => !i.trashed && (i.folder || 'Allgemein') === folder);
      if (folderItems.length > 0) {
        md += `## 📁 ${folder}\n\n`;
        folderItems.forEach(i => {
          if (i.type === 'link') md += `- [${i.title}](${i.url}) ${i.tags && i.tags.length ? `*(#${i.tags.join(' #')})*` : ''}\n`;
          else if (i.type === 'color') md += `- **Farbe ${i.title}**: \`${i.url}\`\n`;
          else if (i.type === 'note') md += `### 📝 ${i.title}\n${i.content}\n\n`;
          else if (i.type === 'code') md += `### 💻 ${i.title}\n\`\`\`${i.codeLang || ''}\n${i.content}\n\`\`\`\n\n`;
          else if (i.type === 'image') md += `- **${i.title}**: ![Image](${i.url})\n`;
        });
        md += '\n';
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pindrop-bookmarks-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Markdown exportiert!', 'success');
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
          if (json.folders) {
            state.customFolders = Array.from(new Set([...state.customFolders, ...json.folders]));
            localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
          }
        }
        saveAllItems(state.items);
        closeModals();
        renderItems();
        showToast(`${state.items.length} Einträge importiert!`, 'success');
      } catch (err) {
        showToast('Fehler beim Importieren', 'error');
      }
    };
    reader.readAsText(file);
  });

  importHtmlInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const doc = new DOMParser().parseFromString(ev.target.result, 'text/html');
      const links = doc.querySelectorAll('a');
      let count = 0;
      links.forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('http')) {
          state.items.unshift({
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            type: 'link',
            title: a.textContent.trim() || href,
            url: href,
            folder: 'Importiert',
            tags: ['import'],
            favorite: false,
            createdAt: Date.now()
          });
          count++;
        }
      });
      if (!state.customFolders.includes('Importiert')) state.customFolders.push('Importiert');
      saveAllItems(state.items);
      closeModals();
      renderItems();
      showToast(`${count} Lesezeichen importiert!`, 'success');
    };
    reader.readAsText(file);
  });

  clearAllDataBtn.addEventListener('click', () => {
    if (confirm('Wirklich ALLE Lesezeichen löschen?')) {
      state.items = [];
      saveAllItems(state.items);
      closeModals();
      renderItems();
      showToast('Alle Daten gelöscht', 'info');
    }
  });

  // --- Folder Management ---
  addFolderBtn.addEventListener('click', () => {
    const name = prompt('Name des neuen Ordners:');
    if (name && name.trim()) {
      const clean = name.trim();
      if (!state.customFolders.includes(clean)) {
        state.customFolders.push(clean);
        localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
        renderSidebar();
        showToast(`Ordner "${clean}" angelegt`, 'success');
      } else {
        showToast('Ordner existiert bereits', 'error');
      }
    }
  });

  foldersList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.delete-folder-btn');
    if (delBtn) {
      e.stopPropagation();
      const folderToDelete = delBtn.getAttribute('data-folder');
      if (confirm(`Ordner "${folderToDelete}" löschen? (Einträge verbleiben in "Allgemein")`)) {
        state.customFolders = state.customFolders.filter(f => f !== folderToDelete);
        localStorage.setItem('pindrop_folders', JSON.stringify(state.customFolders));
        state.items.forEach(i => {
          if (i.folder === folderToDelete) i.folder = 'Allgemein';
        });
        saveAllItems(state.items);
        if (state.currentFilter === 'folder:' + folderToDelete) state.currentFilter = 'all';
        renderItems();
        showToast(`Ordner gelöscht`, 'info');
      }
    }
  });

  // --- Search & View Listeners ---
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-folder-btn')) return;
      const filter = item.getAttribute('data-filter');
      if (filter) setFilter(filter);
      if (window.innerWidth <= 900) sidebar.classList.remove('mobile-open');
    });
  });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
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

  // --- Modals Triggers ---
  document.getElementById('openNewItemModalBtn').addEventListener('click', openNewItemModal);
  document.getElementById('openNewItemModalTopBtn').addEventListener('click', openNewItemModal);
  document.getElementById('emptyAddBtn').addEventListener('click', openNewItemModal);
  document.getElementById('closeItemModalBtn').addEventListener('click', closeModals);
  document.getElementById('cancelItemModalBtn').addEventListener('click', closeModals);
  closeDetailModalBtn.addEventListener('click', closeModals);
  closeQrModalBtn.addEventListener('click', closeModals);

  openSettingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
  closeSettingsModalBtn.addEventListener('click', closeModals);

  typeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-tab-btn');
    if (btn) setModalType(btn.getAttribute('data-type'));
  });

  [itemModal, detailModal, settingsModal, qrModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModals();
    });
  });

  collapseSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
  mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'n' || e.key === 'N') {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea' && !itemModal.classList.contains('open')) {
        e.preventDefault();
        openNewItemModal();
      }
    }
    if (e.key === 'Escape') closeModals();
  });

  // --- App Init ---
  async function init() {
    initThemes();
    checkPinProtection();
    await initDB();
    state.items = await loadAllItems();
    renderItems();
  }

  init();
})();
