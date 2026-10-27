/* ============================================================
   AltyapıPro — PWA istemci mantığı
   Adım 2: dinamik Ana Sayfa, Projeler, detay ve proje formu
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const data = window.APP_DATA || { projects: [], records: [] };

  const STORAGE_KEY = 'altyapipro.projects.v1';
  const SYNC_KEY = 'altyapipro.lastSync.v1';

  const STATUS = {
    ongoing: { label: 'Devam Ediyor', className: 'ongoing' },
    planned: { label: 'Planlanıyor', className: 'planned' },
    paused: { label: 'Duraklatıldı', className: 'paused' },
    completed: { label: 'Tamamlandı', className: 'completed' }
  };

  const THUMBS = {
    'İçme Suyu Hattı': 'assets/city.svg',
    'Kanalizasyon Hattı': 'assets/canal.svg',
    'Yağmur Suyu Hattı': 'assets/rain.svg',
    'Telekom Altyapısı': 'assets/telecom.svg'
  };

  const state = {
    projects: [],
    projectStatus: 'all',
    projectType: 'all',
    projectProvince: 'all',
    projectQuery: '',
    projectSort: 'default',
    recordType: 'all',
    recordQuery: '',
    editingId: null,
    formReturnId: null,
    sheetFocus: null
  };

  const esc = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const icon = (name, cls = '') =>
    `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#${name}"/></svg>`;

  const normalize = (value) => String(value).toLocaleLowerCase('tr-TR');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const num = (value, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const cleanText = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();

  const statusInfo = (status) => STATUS[status] || STATUS.ongoing;

  function normalizeProject(project, index) {
    const status = STATUS[project.status] ? project.status : 'ongoing';
    const info = statusInfo(status);
    const province = cleanText(project.province);
    const district = cleanText(project.district);
    const type = cleanText(project.type) || 'İçme Suyu Hattı';
    const location =
      cleanText(project.location) ||
      [district, province].filter(Boolean).join(', ') ||
      'Konum belirtilmedi';

    return {
      id: String(project.id || `project-${Date.now()}-${index}`),
      title: cleanText(project.title) || 'İsimsiz Proje',
      location,
      province,
      district,
      type,
      status,
      statusLabel: info.label,
      progress: clamp(num(project.progress), 0, 100),
      length: cleanText(project.length) || '0 km',
      total: cleanText(project.total) || '0 km',
      personnel: Math.max(0, num(project.personnel)),
      days: Math.max(0, num(project.days)),
      thumb: project.thumb || THUMBS[type] || 'assets/city.svg',
      contractor: cleanText(project.contractor) || 'Belirtilmedi',
      startDate: cleanText(project.startDate) || 'Belirtilmedi',
      description: cleanText(project.description) || 'Açıklama eklenmedi.'
    };
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadProjects() {
    const fallback = Array.isArray(data.projects)
      ? data.projects.map((project, index) => normalizeProject(project, index))
      : [];

    const saved = readStorage(STORAGE_KEY);
    if (!saved) return fallback;

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return fallback;
      return parsed.map((project, index) => normalizeProject(project, index));
    } catch (error) {
      return fallback;
    }
  }

  function saveProjects() {
    return writeStorage(STORAGE_KEY, JSON.stringify(state.projects));
  }

  function allRecords() {
    return (Array.isArray(data.records) ? data.records : []).reduce((rows, group) => {
      const items = Array.isArray(group.items) ? group.items : [];
      items.forEach((record) => rows.push(record));
      return rows;
    }, []);
  }

  function recordsFor(projectId) {
    return allRecords().filter((record) => record.projectId === projectId);
  }

  function currentTime() {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  }

  function currentDate() {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date());
  }

  /* ---------------- Navigasyon ---------------- */

  const screens = ['home', 'projects', 'map', 'records', 'reports'];

  function setScreen(name, scroll = true) {
    if (!screens.includes(name)) name = 'home';

    $$('.screen').forEach((screen) => {
      screen.classList.toggle('is-active', screen.id === `screen-${name}`);
    });

    $$('.nav-item').forEach((item) => {
      const active = item.dataset.nav === name;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    if (scroll) window.scrollTo(0, 0);
  }

  function syncFromHash() {
    const name = (window.location.hash || '#home').replace(/^#/, '');
    setScreen(name);
  }

  window.addEventListener('hashchange', syncFromHash);

  $$('[data-go]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.go;
      if (window.location.hash === `#${target}`) {
        setScreen(target);
      } else {
        window.location.hash = `#${target}`;
      }
    });
  });

  /* ---------------- Sayfa seçim etiketleri ---------------- */

  function syncSelectLabels() {
    $$('.select-wrap').forEach((wrap) => {
      const select = wrap.querySelector('select');
      const label = wrap.querySelector('.select-label');
      if (select && label) {
        label.textContent = select.options[select.selectedIndex]?.textContent || '';
      }
    });

    const sort = $('#projectSort');
    const sortLabel = $('#sortLabel');
    if (sort && sortLabel) {
      sortLabel.textContent = sort.options[sort.selectedIndex]?.textContent || 'Varsayılan';
    }
  }

  /* ---------------- Projeler ---------------- */

  function syncProvinceOptions() {
    const select = $('#provinceFilter');
    if (!select) return;

    const provinces = Array.from(
      new Set(state.projects.map((project) => project.province).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'tr'));

    select.innerHTML = [
      '<option value="all">Tüm İller</option>',
      ...provinces.map((province) => `<option value="${esc(province)}">${esc(province)}</option>`)
    ].join('');

    if (!provinces.includes(state.projectProvince)) state.projectProvince = 'all';
    select.value = state.projectProvince;
  }

  function projectCard(project) {
    return `
      <article class="project-card" role="button" tabindex="0" data-project-id="${esc(project.id)}" aria-label="${esc(project.title)} detayını aç">
        <div class="project-grid">
          <img class="project-thumb" src="${esc(project.thumb)}" alt="${esc(project.title)}" loading="lazy">
          <div class="project-info">
            <div class="project-badges">
              <span class="badge ${esc(project.status)}">${esc(project.statusLabel)}</span>
              ${icon('i-chevron', 'chev')}
            </div>
            <h3>${esc(project.title)}</h3>
            <div class="project-meta">
              <span>${icon('i-pin')}${esc(project.location)}</span>
              <span>${icon('i-layers')}${esc(project.type)}</span>
            </div>
          </div>
        </div>
        <div class="project-progress">
          <span class="bar"><i style="width:${project.progress}%"></i></span>
          <b>%${esc(project.progress)}</b>
        </div>
        <div class="project-stats">
          <span>${icon('i-crosshair')}<span><b>${esc(project.length)} <small>/ ${esc(project.total)}</small></b><small>Hat Uzunluğu</small></span></span>
          <span>${icon('i-users')}<span><b>${esc(project.personnel)}</b><small>Personel</small></span></span>
          <span>${icon('i-calendar')}<span><b>${esc(project.days)} gün</b><small>Kalan Süre</small></span></span>
        </div>
      </article>`;
  }

  function sortProjects(list) {
    const sorted = list.slice();
    const byName = (a, b) => a.title.localeCompare(b.title, 'tr');

    if (state.projectSort === 'progress-desc') sorted.sort((a, b) => b.progress - a.progress || byName(a, b));
    else if (state.projectSort === 'progress-asc') sorted.sort((a, b) => a.progress - b.progress || byName(a, b));
    else if (state.projectSort === 'days-asc') sorted.sort((a, b) => a.days - b.days || byName(a, b));
    else if (state.projectSort === 'name-asc') sorted.sort(byName);

    return sorted;
  }

  function renderProjects() {
    const list = $('#projectList');
    const empty = $('#projectEmpty');
    if (!list) return;

    const query = normalize(state.projectQuery.trim());

    const visible = state.projects.filter((project) => {
      const statusOk = state.projectStatus === 'all' || project.status === state.projectStatus;
      const typeOk = state.projectType === 'all' || project.type === state.projectType;
      const provinceOk = state.projectProvince === 'all' || project.province === state.projectProvince;
      const queryOk =
        !query ||
        normalize(project.title).includes(query) ||
        normalize(project.location).includes(query) ||
        normalize(project.type).includes(query) ||
        normalize(project.province).includes(query) ||
        normalize(project.district).includes(query) ||
        normalize(project.contractor).includes(query) ||
        normalize(project.description).includes(query);
      return statusOk && typeOk && provinceOk && queryOk;
    });

    list.innerHTML = sortProjects(visible).map(projectCard).join('');
    if (empty) empty.hidden = visible.length !== 0;
  }

  const projectFilterGroup = $('#projectFilters');
  if (projectFilterGroup) {
    projectFilterGroup.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      state.projectStatus = chip.dataset.status || 'all';
      $$('.chip', projectFilterGroup).forEach((item) => {
        const active = item === chip;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      renderProjects();
    });
  }

  const projectSearch = $('#projectSearch');
  if (projectSearch) {
    projectSearch.addEventListener('input', () => {
      state.projectQuery = projectSearch.value;
      renderProjects();
    });
  }

  const typeFilter = $('#typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      state.projectType = typeFilter.value;
      renderProjects();
    });
  }

  const provinceFilter = $('#provinceFilter');
  if (provinceFilter) {
    provinceFilter.addEventListener('change', () => {
      state.projectProvince = provinceFilter.value;
      renderProjects();
    });
  }

  const projectSort = $('#projectSort');
  if (projectSort) {
    projectSort.addEventListener('change', () => {
      state.projectSort = projectSort.value;
      renderProjects();
    });
  }

  /* ---------------- Ana Sayfa ---------------- */

  function renderRecentHome() {
    const wrap = $('#homeRecent');
    if (!wrap) return;

    const recent = allRecords().slice(0, 3);
    if (!recent.length) {
      wrap.innerHTML = '<div class="recent-empty">Henüz saha kaydı bulunmuyor.</div>';
      return;
    }

    wrap.innerHTML = recent
      .map(
        (record) => `
        <button type="button" class="recent-item" data-project-id="${esc(record.projectId || '')}">
          <span class="record-icon tone-${esc(record.tone || 'blue')}">${icon(esc(record.icon || 'i-pin'))}</span>
          <span class="recent-main">
            <span class="recent-top">
              <strong>${esc(record.title)}</strong>
              <span class="recent-time">${esc(record.time)}</span>
              ${icon('i-chevron', 'chev')}
            </span>
            <span class="recent-addr">${esc(record.location)}</span>
            <span class="badge ${esc(record.statusClass || 'ongoing')}">${esc(record.status)}</span>
          </span>
        </button>`
      )
      .join('');
  }

  function renderHome() {
    const summary = data.summary || {};
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };

    setText('#statLength', summary.length ?? 0);
    setText('#statLengthPrev', `Dün: ${summary.lengthPrevious ?? 0} m`);
    setText('#statExcavations', summary.excavations ?? 0);
    setText('#statExcavationsPrev', `Dün: ${summary.excavationsPrevious ?? 0} adet`);
    setText('#statTeams', summary.teams ?? 0);
    setText('#statPersonnel', `Toplam ${summary.personnel ?? 0} personel`);
    setText('#statPending', summary.pending ?? 0);
    setText(
      '#statPendingToday',
      summary.pendingToday ? `${summary.pendingToday}'ü bugün eklendi` : 'Bugün yeni kayıt yok'
    );

    const featured =
      state.projects.find((project) => project.status === 'ongoing') ||
      state.projects.find((project) => project.status === 'planned') ||
      state.projects[0];

    const featuredCard = $('#featuredCard');
    const featuredThumb = $('#featuredThumb');
    const featuredEyebrow = $('#featuredEyebrow');
    const featuredTitle = $('#featuredTitle');
    const featuredLocation = $('#featuredLocation');
    const featuredType = $('#featuredType');
    const progressValue = $('#homeProgressValue');
    const progressBar = $('#homeProgressBar');
    const homeLength = $('#homeLength');
    const homeTotal = $('#homeTotal');
    const homeDays = $('#homeDays');

    if (!featured) {
      if (featuredCard) {
        featuredCard.removeAttribute('data-project-id');
        featuredCard.setAttribute('aria-label', 'Henüz proje yok');
      }
      if (featuredThumb) {
        featuredThumb.removeAttribute('src');
        featuredThumb.alt = '';
      }
      setText('#featuredEyebrow', 'Proje Yok');
      setText('#featuredTitle', 'Henüz proje eklenmedi');
      setText('#featuredLocation', 'Yeni proje ekleyerek başlayın');
      setText('#featuredType', '—');
      setText('#homeProgressValue', '%0');
      if (progressBar) progressBar.style.width = '0%';
      setText('#homeLength', '0 km');
      setText('#homeTotal', '0 km');
      setText('#homeDays', '0 gün');
    } else {
      if (featuredCard) {
        featuredCard.dataset.projectId = featured.id;
        featuredCard.setAttribute('aria-label', `${featured.title} detayını aç`);
      }
      if (featuredThumb) {
        featuredThumb.src = featured.thumb;
        featuredThumb.alt = `${featured.title} projesi`;
      }
      if (featuredEyebrow) featuredEyebrow.textContent = featured.statusLabel;
      if (featuredTitle) featuredTitle.textContent = featured.title;
      if (featuredLocation) featuredLocation.textContent = featured.location;
      if (featuredType) featuredType.textContent = featured.type;
      if (progressValue) progressValue.textContent = `%${featured.progress}`;
      if (progressBar) progressBar.style.width = `${featured.progress}%`;
      if (homeLength) homeLength.textContent = featured.length;
      if (homeTotal) homeTotal.textContent = featured.total;
      if (homeDays) homeDays.textContent = `${featured.days} gün`;
    }

    renderRecentHome();
  }

  /* ---------------- Sheet yardımcıları ---------------- */

  function showSheet(sheet) {
    if (!sheet) return;
    state.sheetFocus = document.activeElement;

    $$('.sheet').forEach((other) => {
      if (other !== sheet) {
        other.hidden = true;
        other.classList.remove('is-open');
      }
    });

    sheet.hidden = false;
    document.body.classList.add('sheet-open');
    const raf = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
    raf(() => {
      sheet.classList.add('is-open');
      const close = sheet.querySelector('.sheet-close');
      if (close) close.focus({ preventScroll: true });
    });
  }

  function hideSheet(sheet) {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.hidden = true;

    if (!$('.sheet:not([hidden])')) document.body.classList.remove('sheet-open');

    const focusTarget = state.sheetFocus;
    state.sheetFocus = null;
    if (focusTarget && focusTarget.isConnected) focusTarget.focus({ preventScroll: true });
  }

  function closeSheet(sheet) {
    if (!sheet) return;
    if (sheet.id === 'projectFormSheet') {
      state.formReturnId = null;
      state.editingId = null;
    }
    hideSheet(sheet);
  }

  function renderProjectSheet(project) {
    const sheet = $('#projectSheet');
    if (!sheet) return;

    const title = $('#projectSheetTitle');
    const body = $('#projectSheetBody');
    const foot = $('#projectSheetFoot');
    if (title) title.textContent = project.title;
    if (!body || !foot) return;

    const records = recordsFor(project.id);

    body.innerHTML = `
      <div class="detail-hero">
        <img src="${esc(project.thumb)}" alt="${esc(project.title)}">
        <div class="detail-hero-copy">
          <span class="badge ${esc(project.status)}">${esc(project.statusLabel)}</span>
          <strong>${esc(project.location)}</strong>
          <p>${esc(project.type)}</p>
          <p>Başlangıç: ${esc(project.startDate)}</p>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-stat"><span>İlerleme</span><strong>%${esc(project.progress)}</strong></div>
        <div class="detail-stat"><span>Hat uzunluğu</span><strong>${esc(project.length)} / ${esc(project.total)}</strong></div>
        <div class="detail-stat"><span>Personel</span><strong>${esc(project.personnel)} kişi</strong></div>
        <div class="detail-stat"><span>Kalan süre</span><strong>${esc(project.days)} gün</strong></div>
        <div class="detail-stat is-wide"><span>Yüklenici</span><strong>${esc(project.contractor)}</strong></div>
      </div>
      <div class="detail-progress">
        <div class="detail-progress-head"><span>Fiziki gerçekleşme</span><b>%${esc(project.progress)}</b></div>
        <div class="bar"><i style="width:${project.progress}%"></i></div>
      </div>
      <div class="detail-section">
        <h3>Açıklama</h3>
        <p class="detail-desc">${esc(project.description)}</p>
      </div>
      <div class="detail-section">
        <h3>Saha Kayıtları</h3>
        ${
          records.length
            ? records
                .map(
                  (record) => `
                  <div class="detail-record">
                    <span class="record-icon tone-${esc(record.tone || 'blue')}">${icon(esc(record.icon || 'i-pin'))}</span>
                    <span class="detail-record-main">
                      <strong>${esc(record.title)}</strong>
                      <small>${esc(record.location)} · ${esc(record.team)}</small>
                    </span>
                    <time>${esc(record.time)}</time>
                  </div>`
                )
                .join('')
            : '<div class="detail-empty">Bu projeye ait saha kaydı henüz yok.</div>'
        }
      </div>`;

    foot.innerHTML = `
      <button class="btn btn-outline" type="button" data-edit-project="${esc(project.id)}">Düzenle</button>
      <button class="btn btn-primary" type="button" data-close-project-sheet>Kapat</button>`;
  }

  function openProjectSheet(projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) {
      toast('Proje bulunamadı.');
      return;
    }
    renderProjectSheet(project);
    showSheet($('#projectSheet'));
  }

  /* ---------------- Proje formu ---------------- */

  function fillForm(project) {
    const setValue = (selector, value) => {
      const el = $(selector);
      if (el) el.value = value == null ? '' : value;
    };

    setValue('#projectName', project ? project.title : '');
    setValue('#projectType', project ? project.type : 'İçme Suyu Hattı');
    setValue('#projectStatus', project ? project.status : 'ongoing');
    setValue('#projectProvince', project ? project.province : '');
    setValue('#projectDistrict', project ? project.district : '');
    setValue('#projectContractor', project ? project.contractor === 'Belirtilmedi' ? '' : project.contractor : '');
    setValue('#projectLength', project ? project.length : '');
    setValue('#projectTotal', project ? project.total : '');
    setValue('#projectPersonnel', project ? project.personnel : '');
    setValue('#projectDays', project ? project.days : '');
    setValue('#projectProgress', project ? project.progress : 0);
    setValue('#projectDescription', project ? project.description === 'Açıklama eklenmedi.' ? '' : project.description : '');

    const progressValue = $('#projectProgressValue');
    if (progressValue) progressValue.textContent = String(project ? project.progress : 0);

    const error = $('#projectFormError');
    if (error) error.hidden = true;
  }

  function openProjectForm(projectId = null, returnToDetail = false) {
    const project = projectId ? state.projects.find((item) => item.id === projectId) : null;
    state.editingId = project ? project.id : null;
    state.formReturnId = returnToDetail && project ? project.id : null;

    fillForm(project);

    const title = $('#projectFormTitle');
    const submit = $('#projectFormSubmit');
    if (title) title.textContent = project ? 'Proje Düzenle' : 'Yeni Proje';
    if (submit) submit.textContent = project ? 'Değişiklikleri Kaydet' : 'Projeyi Kaydet';

    showSheet($('#projectFormSheet'));
  }

  function showFormError(message) {
    const error = $('#projectFormError');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function handleProjectSubmit(event) {
    event.preventDefault();

    const value = (selector) => {
      const el = $(selector);
      return el ? cleanText(el.value) : '';
    };

    const title = value('#projectName');
    const province = value('#projectProvince');

    if (!title) {
      showFormError('Proje adı zorunlu.');
      $('#projectName')?.focus();
      return;
    }
    if (!province) {
      showFormError('İl bilgisi zorunlu.');
      $('#projectProvince')?.focus();
      return;
    }

    const district = value('#projectDistrict');
    const type = value('#projectType') || 'İçme Suyu Hattı';
    const status = value('#projectStatus') || 'ongoing';
    const info = statusInfo(status);
    const progress = clamp(num($('#projectProgress')?.value, 0), 0, 100);
    const existing = state.editingId
      ? state.projects.find((project) => project.id === state.editingId)
      : null;

    const saved = normalizeProject({
      id: existing ? existing.id : `project-${Date.now()}`,
      title,
      province,
      district,
      location: [district, province].filter(Boolean).join(', '),
      type,
      status,
      statusLabel: info.label,
      progress,
      length: value('#projectLength') || '0 km',
      total: value('#projectTotal') || '0 km',
      personnel: num($('#projectPersonnel')?.value, 0),
      days: num($('#projectDays')?.value, 0),
      thumb: THUMBS[type] || (existing ? existing.thumb : 'assets/city.svg'),
      contractor: value('#projectContractor') || 'Belirtilmedi',
      startDate: existing ? existing.startDate : currentDate(),
      description: value('#projectDescription') || 'Açıklama eklenmedi.'
    }, state.projects.length);

    if (existing) {
      state.projects = state.projects.map((project) =>
        project.id === existing.id ? saved : project
      );
    } else {
      state.projects = [saved, ...state.projects];
    }

    const persisted = saveProjects();
    renderAll();
    hideSheet($('#projectFormSheet'));

    const returnId = state.formReturnId;
    state.formReturnId = null;
    state.editingId = null;

    if (returnId) openProjectSheet(saved.id);

    toast(
      persisted
        ? existing
          ? 'Proje güncellendi.'
          : 'Proje eklendi.'
        : 'Proje güncellendi ancak cihaza kaydedilemedi.'
    );
  }

  /* ---------------- Kayıtlar ---------------- */

  function recordCard(record) {
    return `
      <button type="button" class="record" data-type="${esc(record.type)}" data-soon>
        <span class="record-icon tone-${esc(record.tone)}">${icon(esc(record.icon))}</span>
        <span class="record-main">
          <span class="record-title">${esc(record.title)}</span>
          <span class="meta">${icon('i-pin')}${esc(record.location)}</span>
          <span class="meta">${icon('i-users')}${esc(record.team)}</span>
        </span>
        <span class="record-side">
          <span class="side-top"><time>${esc(record.time)}</time>${icon('i-chevron', 'chev')}</span>
          <span class="badge ${esc(record.statusClass)}">${esc(record.status)}</span>
        </span>
      </button>`;
  }

  function renderRecords() {
    const wrap = $('#recordGroups');
    const empty = $('#recordEmpty');
    if (!wrap) return;

    const query = normalize(state.recordQuery.trim());
    let total = 0;

    const html = data.records
      .map((group) => {
        const items = group.items.filter((record) => {
          const typeOk = state.recordType === 'all' || record.type === state.recordType;
          const queryOk =
            !query ||
            normalize(record.title).includes(query) ||
            normalize(record.location).includes(query) ||
            normalize(record.team).includes(query);
          return typeOk && queryOk;
        });
        if (!items.length) return '';
        total += items.length;
        return `
          <section class="record-group">
            <div class="group-head">
              <h2>${esc(group.label)}</h2>
              <span>${items.length} kayıt</span>
            </div>
            ${items.map(recordCard).join('')}
          </section>`;
      })
      .join('');

    wrap.innerHTML = html;
    if (empty) empty.hidden = total !== 0;
  }

  const recordFilterGroup = $('#recordFilters');
  if (recordFilterGroup) {
    recordFilterGroup.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      state.recordType = chip.dataset.type || 'all';
      $$('.chip', recordFilterGroup).forEach((item) => {
        item.classList.toggle('is-active', item === chip);
      });
      renderRecords();
    });
  }

  const recordSearch = $('#recordSearch');
  if (recordSearch) {
    recordSearch.addEventListener('input', () => {
      state.recordQuery = recordSearch.value;
      renderRecords();
    });
  }

  /* ---------------- Harita branş filtresi ---------------- */

  function applyBranch(branch) {
    $$('.map-marker').forEach((marker) => {
      marker.classList.toggle('is-dim', marker.dataset.branch !== branch);
    });
    $$('.pipe').forEach((pipe) => {
      pipe.classList.toggle('is-dim', pipe.dataset.branch !== branch);
    });
  }

  const branchGroup = $('#branchFilters');
  if (branchGroup) {
    branchGroup.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      const branch = chip.dataset.branch;

      $$('.chip', branchGroup).forEach((item) => item.classList.toggle('is-active', item === chip));
      applyBranch(branch);
    });

    const initialBranch = branchGroup.querySelector('.chip.is-active');
    applyBranch(initialBranch ? initialBranch.dataset.branch : 'water');
  }

  /* ---------------- Senkronizasyon ---------------- */

  function setupSync() {
    const syncBtn = $('#syncBtn');
    const syncText = $('#syncBtnText');
    const syncTitle = $('#syncTitle');
    const syncSub = $('#syncSub');
    const syncBar = $('#syncBar');

    const stored = readStorage(SYNC_KEY);
    if (stored && syncSub) syncSub.textContent = `Son eşitleme: ${stored}`;

    if (!syncBtn) return;

    syncBtn.addEventListener('click', () => {
      if (syncBtn.disabled) return;

      syncBtn.disabled = true;
      syncBtn.classList.add('is-syncing');
      syncBar?.classList.add('is-syncing');
      if (syncText) syncText.textContent = 'Eşitleniyor';
      if (syncTitle) syncTitle.textContent = 'Veriler eşitleniyor…';

      window.setTimeout(() => {
        const stamp = `Bugün ${currentTime()}`;
        writeStorage(SYNC_KEY, stamp);
        if (syncSub) syncSub.textContent = `Son eşitleme: ${stamp}`;
        if (syncTitle) syncTitle.textContent = 'Veriler senkronize edildi';
        if (syncText) syncText.textContent = 'Çevrim içi';
        syncBtn.disabled = false;
        syncBtn.classList.remove('is-syncing');
        syncBar?.classList.remove('is-syncing');
        toast('Veriler senkronize edildi.');
      }, 900);
    });
  }

  /* ---------------- Toast ve global etkileşim ---------------- */

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('is-show'), 2400);
  }

  document.addEventListener('click', (event) => {
    const closer = event.target.closest('[data-close-project-sheet], [data-close-project-form]');
    if (closer) {
      const sheet = closer.closest('.sheet');
      closeSheet(sheet);
      return;
    }

    const edit = event.target.closest('[data-edit-project]');
    if (edit) {
      event.preventDefault();
      openProjectForm(edit.dataset.editProject, true);
      return;
    }

    const trigger = event.target.closest('[data-project-id]');
    if (trigger && trigger.dataset.projectId) {
      event.preventDefault();
      openProjectSheet(trigger.dataset.projectId);
      return;
    }

    const soon = event.target.closest('[data-soon]');
    if (soon) {
      event.preventDefault();
      toast('Bu işlem sonraki adımda etkinleşecek.');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const open = $('.sheet:not([hidden])');
      if (open) {
        event.preventDefault();
        closeSheet(open);
      }
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    const trigger = event.target.closest('[data-project-id]');
    if (!trigger || trigger.tagName === 'BUTTON' || trigger.tagName === 'A') return;
    if (trigger.dataset.projectId) {
      event.preventDefault();
      openProjectSheet(trigger.dataset.projectId);
    }
  });

  document.addEventListener('change', (event) => {
    const select = event.target.closest('select');
    if (!select) return;

    const wrap = select.closest('.select-wrap');
    const label = wrap?.querySelector('.select-label');
    if (label) label.textContent = select.options[select.selectedIndex]?.textContent || '';

    if (select.id === 'projectSort') syncSelectLabels();
  });

  const newProjectBtn = $('#newProjectBtn');
  if (newProjectBtn) newProjectBtn.addEventListener('click', () => openProjectForm());

  const homeDetailBtn = $('#homeDetailBtn');
  if (homeDetailBtn) {
    homeDetailBtn.addEventListener('click', () => {
      const card = $('#featuredCard');
      if (card?.dataset.projectId) openProjectSheet(card.dataset.projectId);
      else toast('Önce bir proje ekleyin.');
    });
  }

  const progressInput = $('#projectProgress');
  if (progressInput) {
    progressInput.addEventListener('input', () => {
      const value = $('#projectProgressValue');
      if (value) value.textContent = progressInput.value;
    });
  }

  const projectForm = $('#projectForm');
  if (projectForm) projectForm.addEventListener('submit', handleProjectSubmit);

  /* ---------------- Başlangıç ---------------- */

  function renderAll() {
    syncProvinceOptions();
    renderHome();
    renderProjects();
    syncSelectLabels();
  }

  state.projects = loadProjects();
  renderAll();
  renderRecords();
  syncFromHash();
  setupSync();

  if ('serviceWorker' in navigator) {
    const canRegister =
      window.location.protocol === 'https:' ||
      ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (canRegister) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
          /* önizleme modunda sessiz geç */
        });
      });
    }
  }
})();
