/* ============================================================
   AltyapıPro — PWA istemci mantığı
   Adım 2: boş başlangıç, gerçek proje/kayıt yönetimi
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const data = window.APP_DATA || { projects: [], records: [] };

  const STORAGE = {
    projects: 'altyapipro.projects.v2',
    records: 'altyapipro.records.v1',
    lastChange: 'altyapipro.lastChange.v1'
  };

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

  const RECORD_TYPES = {
    work: { label: 'İmalat', tone: 'blue', icon: 'i-waves', defaultTitle: 'Saha İmalatı' },
    service: { label: 'Abone Bağlantısı', tone: 'green', icon: 'i-users', defaultTitle: 'Abone Bağlantısı' },
    dig: { label: 'Kazı', tone: 'amber', icon: 'i-excavator', defaultTitle: 'Kazı Çalışması' },
    photo: { label: 'Fotoğraf', tone: 'purple', icon: 'i-camera', defaultTitle: 'Saha Fotoğrafı' },
    other: { label: 'Diğer', tone: 'brown', icon: 'i-pin', defaultTitle: 'Saha Kaydı' }
  };

  const RECORD_STATUS = {
    completed: { label: 'Tamamlandı', className: 'completed' },
    ongoing: { label: 'Devam Ediyor', className: 'ongoing' },
    pending: { label: 'Onay Bekliyor', className: 'pending' },
    error: { label: 'Sorun Var', className: 'error' }
  };

  const state = {
    projects: [],
    records: [],
    featuredId: null,
    projectStatus: 'all',
    projectType: 'all',
    projectProvince: 'all',
    projectQuery: '',
    projectSort: 'default',
    recordType: 'all',
    recordQuery: '',
    editingId: null,
    formReturnId: null,
    pendingRecordType: null,
    recordFormType: 'work',
    pendingPhoto: '',
    sheetFocus: null,
    confirmAction: null,
    confirmReturnProject: null
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
  const decimal = (value, fallback = 0) => {
    const parsed = Number(String(value == null ? '' : value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const cleanText = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  const formatNumber = (value) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value);

  function parseMeters(value, bareIsKm = false) {
    const match = cleanText(value).toLocaleLowerCase('tr-TR').replace(',', '.').match(/([\d.]+)\s*(km|m)?/);
    if (!match) return 0;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return 0;
    if (match[2] === 'km') return amount * 1000;
    if (match[2] === 'm') return amount;
    return bareIsKm && amount <= 100 ? amount * 1000 : amount;
  }

  function formatMeters(meters) {
    return meters >= 1000 ? `${formatNumber(meters / 1000)} km` : `${formatNumber(meters)} m`;
  }

  function projectWorkMeters(projectId) {
    return state.records
      .filter((record) => record.projectId === projectId && record.type === 'work')
      .reduce((total, record) => total + record.meters, 0);
  }

  function applyAutoProgress() {
    let changed = false;
    state.projects = state.projects.map((project) => {
      const totalMeters = parseMeters(project.total, true);
      const workedMeters = projectWorkMeters(project.id);
      if (totalMeters <= 0 || workedMeters <= 0) return project;

      const length = formatMeters(workedMeters);
      const progress = clamp(Math.round((workedMeters / totalMeters) * 100), 0, 100);
      if (project.length === length && project.progress === progress && project.autoProgress) {
        return project;
      }
      changed = true;
      return { ...project, length, progress, autoProgress: true };
    });
    return changed;
  }

  const statusInfo = (status) => STATUS[status] || STATUS.ongoing;
  const recordTypeInfo = (type) => RECORD_TYPES[type] || RECORD_TYPES.work;
  const recordStatusInfo = (status) => RECORD_STATUS[status] || RECORD_STATUS.completed;

  function normalizeProject(project, index) {
    project = project || {};
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
      description: cleanText(project.description) || 'Açıklama eklenmedi.',
      autoProgress: Boolean(project.autoProgress)
    };
  }

  function normalizeRecord(record, index) {
    record = record || {};
    const type = RECORD_TYPES[record.type] ? record.type : 'work';
    const typeInfo = recordTypeInfo(type);
    const status = RECORD_STATUS[record.status] ? record.status : 'completed';
    const statusInfoValue = recordStatusInfo(status);
    const created = new Date(record.createdAt);
    const createdAt = Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString();

    return {
      id: String(record.id || `record-${Date.now()}-${index}`),
      projectId: String(record.projectId || ''),
      type,
      title: cleanText(record.title) || typeInfo.defaultTitle,
      location: cleanText(record.location) || 'Konum belirtilmedi',
      team: cleanText(record.team),
      people: Math.max(0, num(record.people, 0)),
      meters: Math.max(0, decimal(record.meters, 0)),
      status,
      statusLabel: statusInfoValue.label,
      statusClass: statusInfoValue.className,
      tone: typeInfo.tone,
      icon: typeInfo.icon,
      note: cleanText(record.note),
      photo:
        typeof record.photo === 'string' && record.photo.indexOf('data:image/') === 0
          ? record.photo
          : '',
      createdAt
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
    const saved = readStorage(STORAGE.projects);
    if (!saved) return fallback;

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return fallback;
      return parsed.map((project, index) => normalizeProject(project, index));
    } catch (error) {
      return fallback;
    }
  }

  function loadRecords() {
    const fallback = Array.isArray(data.records)
      ? data.records.map((record, index) => normalizeRecord(record, index))
      : [];
    const saved = readStorage(STORAGE.records);
    if (!saved) return fallback;

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return fallback;
      return parsed.map((record, index) => normalizeRecord(record, index));
    } catch (error) {
      return fallback;
    }
  }

  function saveProjects() {
    return writeStorage(STORAGE.projects, JSON.stringify(state.projects));
  }

  function saveRecords() {
    return writeStorage(STORAGE.records, JSON.stringify(state.records));
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function dayDifference(date, reference = new Date()) {
    return Math.round((startOfDay(reference) - startOfDay(date)) / 86400000);
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatRecordTime(record) {
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime())) return '—';
    const diff = dayDifference(date);
    if (diff === 0) return `Bugün ${formatTime(date)}`;
    if (diff === 1) return `Dün ${formatTime(date)}`;
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function recordGroup(record) {
    const date = new Date(record.createdAt);
    const diff = dayDifference(date);
    if (diff === 0) return 'Bugün';
    if (diff === 1) return 'Dün';
    if (diff > 1 && diff < 7) return 'Bu Hafta';
    return 'Daha Önce';
  }

  function recordsFor(projectId) {
    return state.records
      .filter((record) => record.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function currentFeaturedProject() {
    return (
      state.projects.find((project) => project.id === state.featuredId) ||
      state.projects.find((project) => project.status === 'ongoing') ||
      state.projects.find((project) => project.status === 'planned') ||
      state.projects[0] ||
      null
    );
  }

  function summaryForDay(date) {
    const list = state.records.filter((record) => isSameDay(new Date(record.createdAt), date));
    const length = list
      .filter((record) => record.type === 'work')
      .reduce((total, record) => total + record.meters, 0);
    const excavations = list.filter((record) => record.type === 'dig').length;
    const teams = new Map();

    list.forEach((record) => {
      if (!record.team) return;
      const current = teams.get(record.team) || 0;
      teams.set(record.team, Math.max(current, record.people || 0));
    });

    return {
      length,
      excavations,
      teams: teams.size,
      personnel: Array.from(teams.values()).reduce((total, value) => total + value, 0)
    };
  }

  function teamDetailsForDay(date = new Date()) {
    const teams = new Map();
    state.records
      .filter((record) => isSameDay(new Date(record.createdAt), date) && record.team)
      .forEach((record) => {
        const current = teams.get(record.team) || {
          name: record.team,
          people: 0,
          records: 0,
          projectId: record.projectId
        };
        current.people = Math.max(current.people, record.people || 0);
        current.records += 1;
        current.projectId = record.projectId || current.projectId;
        teams.set(record.team, current);
      });
    return Array.from(teams.values()).sort(
      (a, b) => b.people - a.people || a.name.localeCompare(b.name, 'tr')
    );
  }

  function markLocalChange() {
    const stamp = `Bugün ${formatTime(new Date())}`;
    writeStorage(STORAGE.lastChange, stamp);
    const sub = $('#syncSub');
    if (sub) sub.textContent = `Son değişiklik: ${stamp}`;
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

  /* ---------------- Seçim etiketleri ---------------- */

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
    if (empty) {
      empty.hidden = visible.length !== 0;
      const strong = empty.querySelector('strong');
      const copy = empty.querySelector('p');
      if (!state.projects.length) {
        if (strong) strong.textContent = 'Henüz proje yok';
        if (copy) copy.textContent = 'Yeni Proje ile ilk projenizi oluşturun.';
      } else {
        if (strong) strong.textContent = 'Proje bulunamadı';
        if (copy) copy.textContent = 'Arama veya filtreleri değiştirerek tekrar deneyin.';
      }
    }
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

    const recent = state.records
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    if (!recent.length) {
      wrap.innerHTML =
        '<div class="recent-empty">Henüz saha kaydı yok.<br><span>Hızlı işlemlerden ilk kaydını ekleyebilirsin.</span></div>';
      return;
    }

    wrap.innerHTML = recent
      .map(
        (record) => `
        <button type="button" class="recent-item" data-project-id="${esc(record.projectId)}">
          <span class="record-icon tone-${esc(record.tone)}">${icon(esc(record.icon))}</span>
          <span class="recent-main">
            <span class="recent-top">
              <strong>${esc(record.title)}</strong>
              <span class="recent-time">${esc(formatRecordTime(record))}</span>
              ${icon('i-chevron', 'chev')}
            </span>
            <span class="recent-addr">${esc(record.location)}</span>
            <span class="badge ${esc(record.statusClass)}">${esc(record.statusLabel)}</span>
          </span>
        </button>`
      )
      .join('');
  }

  function heroCard(project) {
    return `
      <article class="hero-card" role="button" tabindex="0" data-project-id="${esc(project.id)}" aria-label="${esc(project.title)} detayını aç">
        <img class="hero-thumb" src="${esc(project.thumb)}" alt="${esc(project.title)}">
        <div class="hero-info">
          <div class="hero-top">
            <span class="eyebrow">${esc(project.statusLabel)}</span>
            ${icon('i-chevron', 'chev')}
          </div>
          <h2 class="hero-title">${esc(project.title)}</h2>
          <div class="hero-meta">
            <span>${icon('i-pin')}<span>${esc(project.location)}</span></span>
            <span>${icon('i-layers')}<span>${esc(project.type)}</span></span>
          </div>
        </div>
      </article>`;
  }

  function emptyHeroCard() {
    return `
      <article class="hero-card is-empty" data-empty-hero role="button" tabindex="0" aria-label="Yeni proje oluştur">
        <img class="hero-thumb" src="assets/city.svg" alt="">
        <div class="hero-info">
          <div class="hero-top">
            <span class="eyebrow">Başlangıç</span>
            ${icon('i-chevron', 'chev')}
          </div>
          <h2 class="hero-title">İlk projeni oluştur</h2>
          <div class="hero-meta">
            <span>${icon('i-pin')}<span>Yeni proje eklemek için dokun</span></span>
            <span>${icon('i-layers')}<span>Proje yok</span></span>
          </div>
        </div>
      </article>`;
  }

  function updateHeroDots(activeIndex) {
    $$('#heroDots .hero-dot').forEach((dot, index) => {
      dot.classList.toggle('is-active', index === activeIndex);
      dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    });
  }

  function scrollHeroTo(index, smooth = true) {
    const track = $('#heroTrack');
    const cards = $$('.hero-card[data-project-id]', track || document);
    const target = cards[index];
    if (!track || !target) return;
    const left = Math.max(0, target.offsetLeft - 18);
    if (typeof track.scrollTo === 'function') {
      track.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      track.scrollLeft = left;
    }
  }

  function selectedHeroIndex() {
    return Math.max(0, state.projects.findIndex((project) => project.id === state.featuredId));
  }

  function renderHeroCarousel() {
    const track = $('#heroTrack');
    const dots = $('#heroDots');
    if (!track) return;

    if (!state.projects.length) {
      state.featuredId = null;
      track.innerHTML = emptyHeroCard();
      if (dots) {
        dots.innerHTML = '';
        dots.hidden = true;
      }
      return;
    }

    const featured = currentFeaturedProject();
    state.featuredId = featured ? featured.id : null;
    const index = selectedHeroIndex();

    track.innerHTML = state.projects.map(heroCard).join('');
    if (dots) {
      dots.hidden = state.projects.length < 2;
      dots.innerHTML = state.projects
        .map(
          (project, dotIndex) =>
            `<button class="hero-dot${dotIndex === index ? ' is-active' : ''}" type="button" data-hero-index="${dotIndex}" aria-label="${esc(project.title)} projesini göster" aria-current="${dotIndex === index ? 'true' : 'false'}"></button>`
        )
        .join('');
    }

    window.requestAnimationFrame(() => {
      if (index > 0) scrollHeroTo(index, false);
      updateHeroDots(index);
    });
  }

  function updateFeaturedPanels(featured) {
    const progressCard = $('#homeProgressCard');
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };

    if (!featured) {
      setText('#homeProgressValue', '%0');
      const bar = $('#homeProgressBar');
      if (bar) bar.style.width = '0%';
      setText('#homeLength', '0 m');
      setText('#homeTotal', '0 m');
      setText('#homeDays', '0 gün');
      if (progressCard) progressCard.hidden = true;
      renderMapActive(null);
      return;
    }

    setText('#homeProgressValue', `%${featured.progress}`);
    setText('#homeLength', featured.length);
    setText('#homeTotal', featured.total);
    setText('#homeDays', `${featured.days} gün`);
    const bar = $('#homeProgressBar');
    if (bar) bar.style.width = `${featured.progress}%`;
    if (progressCard) progressCard.hidden = false;
    renderMapActive(featured);
  }

  function renderTeamScroller() {
    const head = $('#teamHead');
    const wrap = $('#teamScroll');
    const sub = $('#teamSub');
    if (!head || !wrap) return;

    const teams = teamDetailsForDay();
    if (!teams.length) {
      head.hidden = true;
      wrap.hidden = true;
      wrap.innerHTML = '';
      return;
    }

    const totalPeople = teams.reduce((total, team) => total + team.people, 0);
    head.hidden = false;
    wrap.hidden = false;
    if (sub) sub.textContent = `${teams.length} ekip`;

    wrap.innerHTML =
      teams
        .map(
          (team) => `
          <button class="team-card" type="button" data-project-id="${esc(team.projectId)}">
            <span class="team-card-top">
              <span class="stat-icon tone-green">${icon('i-users')}</span>
              <span class="team-people">${esc(team.people)}<small> kişi</small></span>
            </span>
            <strong>${esc(team.name)}</strong>
            <small>${esc(team.records)} saha kaydı</small>
          </button>`
        )
        .join('') +
      `<div class="team-card is-total">
        <span class="team-card-top">
          <span class="stat-icon">${icon('i-users')}</span>
          <span class="team-people">${esc(totalPeople)}<small> kişi</small></span>
        </span>
        <strong>Toplam Personel</strong>
        <small>Bugün sahada</small>
      </div>`;
  }

  function renderHome() {
    const today = summaryForDay(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = summaryForDay(yesterdayDate);
    const pending = state.records.filter((record) => record.status === 'pending');
    const pendingToday = pending.filter((record) => isSameDay(new Date(record.createdAt), new Date())).length;

    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };

    setText('#statLength', formatNumber(today.length));
    setText('#statLengthPrev', `Dün: ${formatNumber(yesterday.length)} m`);
    setText('#statExcavations', today.excavations);
    setText('#statExcavationsPrev', `Dün: ${yesterday.excavations} adet`);
    setText('#statTeams', today.teams);
    setText(
      '#statPersonnel',
      today.teams ? `Toplam ${today.personnel} personel` : 'Henüz ekip yok'
    );
    setText('#statPending', pending.length);
    setText(
      '#statPendingToday',
      pendingToday
        ? `${pendingToday} tanesi bugün eklendi`
        : pending.length
          ? 'Bugün yeni kayıt yok'
          : 'Onay bekleyen kayıt yok'
    );

    renderHeroCarousel();
    const featured = currentFeaturedProject();
    updateFeaturedPanels(featured);
    renderTeamScroller();
    renderRecentHome();
  }

  function renderMapActive(featured = currentFeaturedProject()) {
    const card = $('#mapActiveWork');
    if (!card) return;
    if (!featured) {
      card.hidden = true;
      card.removeAttribute('data-project-id');
      return;
    }

    card.hidden = false;
    card.dataset.projectId = featured.id;
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };

    setText('#mapActiveTitle', featured.title);
    setText('#mapActiveLocation', featured.location);
    setText('#mapActiveDate', featured.startDate);
    setText('#mapActiveTeam', `${featured.personnel} personel`);
    setText('#mapActiveProgress', `%${featured.progress}`);
    const bar = $('#mapActiveBar');
    if (bar) bar.style.width = `${featured.progress}%`;
    const badge = $('#mapActiveBadge');
    if (badge) {
      badge.className = `badge ${featured.status}`;
      badge.textContent = featured.statusLabel;
    }
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
      const returnId = state.formReturnId;
      state.formReturnId = null;
      state.editingId = null;
      state.pendingRecordType = null;
      hideSheet(sheet);
      if (returnId) openProjectSheet(returnId);
      return;
    }

    if (sheet.id === 'confirmSheet') {
      const returnId = state.confirmReturnProject;
      state.confirmAction = null;
      state.confirmReturnProject = null;
      hideSheet(sheet);
      if (returnId) openProjectSheet(returnId);
      return;
    }

    if (sheet.id === 'recordSheet') {
      state.pendingPhoto = '';
      state.pendingRecordType = null;
    }
    hideSheet(sheet);
  }

  function openConfirm({ title, text, confirmLabel = 'Onayla', danger = false, returnProjectId = null, onConfirm }) {
    const sheet = $('#confirmSheet');
    if (!sheet) return;
    const titleEl = $('#confirmTitle');
    const textEl = $('#confirmText');
    const button = $('#confirmYes');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (button) {
      button.textContent = confirmLabel;
      button.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    }
    state.confirmAction = typeof onConfirm === 'function' ? onConfirm : null;
    state.confirmReturnProject = returnProjectId;
    showSheet(sheet);
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
        ${project.autoProgress ? '<small class="auto-progress-note">İmalat kayıtlarından otomatik hesaplandı.</small>' : ''}
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
                    ${
                      record.photo
                        ? `<img class="record-photo" src="${esc(record.photo)}" alt="">`
                        : `<span class="record-icon tone-${esc(record.tone)}">${icon(esc(record.icon))}</span>`
                    }
                    <span class="detail-record-main">
                      <strong>${esc(record.title)}</strong>
                      <small>${esc(record.location)}${record.team ? ` · ${esc(record.team)}` : ''}</small>
                    </span>
                    <time>${esc(formatRecordTime(record))}</time>
                  </div>`
                )
                .join('')
            : '<div class="detail-empty">Bu projeye ait saha kaydı henüz yok.</div>'
        }
      </div>`;

    foot.innerHTML = `
      <button class="btn btn-outline" type="button" data-edit-project="${esc(project.id)}">Düzenle</button>
      <button class="btn btn-danger" type="button" data-delete-project="${esc(project.id)}">Sil</button>
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

  function deleteProject(projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;

    state.projects = state.projects.filter((item) => item.id !== projectId);
    state.records = state.records.filter((record) => record.projectId !== projectId);
    applyAutoProgress();
    saveProjects();
    saveRecords();
    renderAll();
    renderRecords();
    markLocalChange();
    toast('Proje ve bağlı kayıtları silindi.');
  }

  /* ---------------- Proje formu ---------------- */

  function fillProjectForm(project) {
    const setValue = (selector, value) => {
      const el = $(selector);
      if (el) el.value = value == null ? '' : value;
    };

    setValue('#projectName', project ? project.title : '');
    setValue('#projectType', project ? project.type : 'İçme Suyu Hattı');
    setValue('#projectStatus', project ? project.status : 'ongoing');
    setValue('#projectProvince', project ? project.province : '');
    setValue('#projectDistrict', project ? project.district : '');
    setValue(
      '#projectContractor',
      project ? (project.contractor === 'Belirtilmedi' ? '' : project.contractor) : ''
    );
    setValue('#projectLength', project ? project.length : '');
    setValue('#projectTotal', project ? project.total : '');
    setValue('#projectPersonnel', project ? project.personnel : '');
    setValue('#projectDays', project ? project.days : '');
    setValue('#projectProgress', project ? project.progress : 0);
    setValue(
      '#projectDescription',
      project ? (project.description === 'Açıklama eklenmedi.' ? '' : project.description) : ''
    );

    const progressValue = $('#projectProgressValue');
    if (progressValue) progressValue.textContent = String(project ? project.progress : 0);

    const error = $('#projectFormError');
    if (error) error.hidden = true;
  }

  function openProjectForm(projectId = null, returnToDetail = false) {
    const project = projectId ? state.projects.find((item) => item.id === projectId) : null;
    state.editingId = project ? project.id : null;
    state.formReturnId = returnToDetail && project ? project.id : null;

    fillProjectForm(project);

    const title = $('#projectFormTitle');
    const submit = $('#projectFormSubmit');
    if (title) title.textContent = project ? 'Proje Düzenle' : 'Yeni Proje';
    if (submit) submit.textContent = project ? 'Değişiklikleri Kaydet' : 'Projeyi Kaydet';

    showSheet($('#projectFormSheet'));
  }

  function showProjectFormError(message) {
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
      showProjectFormError('Proje adı zorunlu.');
      $('#projectName')?.focus();
      return;
    }
    if (!province) {
      showProjectFormError('İl bilgisi zorunlu.');
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

    const saved = normalizeProject(
      {
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
        startDate: existing ? existing.startDate : new Intl.DateTimeFormat('tr-TR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(new Date()),
        description: value('#projectDescription') || 'Açıklama eklenmedi.'
      },
      state.projects.length
    );

    if (existing) {
      state.projects = state.projects.map((project) =>
        project.id === existing.id ? saved : project
      );
    } else {
      state.projects = [saved, ...state.projects];
      state.featuredId = saved.id;
    }

    applyAutoProgress();
    const persisted = saveProjects();
    renderAll();
    renderRecords();
    markLocalChange();
    hideSheet($('#projectFormSheet'));

    const returnId = state.formReturnId;
    const pendingType = state.pendingRecordType;
    state.formReturnId = null;
    state.pendingRecordType = null;
    state.editingId = null;

    if (pendingType) openRecordForm(pendingType, saved.id);
    else if (returnId) openProjectSheet(saved.id);

    toast(
      persisted
        ? existing
          ? 'Proje güncellendi.'
          : 'Proje eklendi.'
        : `Proje ${existing ? 'güncellendi' : 'eklendi'} ancak cihaza kaydedilemedi.`
    );
  }

  /* ---------------- Saha kaydı formu ---------------- */

  function populateRecordProjects(selectedId) {
    const select = $('#recordProject');
    if (!select) return;

    select.innerHTML = state.projects
      .map(
        (project) =>
          `<option value="${esc(project.id)}"${project.id === selectedId ? ' selected' : ''}>${esc(project.title)}</option>`
      )
      .join('');

    if (!selectedId && state.projects[0]) select.value = state.projects[0].id;
  }

  function setRecordTypeDefaults(type, force = false) {
    const info = recordTypeInfo(type);
    const title = $('#recordTitle');
    const previous = recordTypeInfo(state.recordFormType);
    if (title) {
      if (force || !title.value.trim() || title.value === previous.defaultTitle) {
        title.value = info.defaultTitle;
      }
      title.placeholder = info.defaultTitle;
    }
    state.recordFormType = type;
  }

  function openRecordForm(type = 'work', projectId = null) {
    if (!state.projects.length) {
      state.pendingRecordType = type;
      openProjectForm();
      toast('Önce bir proje ekleyin.');
      return;
    }

    const info = recordTypeInfo(type);
    const project =
      state.projects.find((item) => item.id === projectId) || currentFeaturedProject();
    const typeSelect = $('#recordType');
    const projectSelect = $('#recordProject');
    if (typeSelect) typeSelect.value = type;
    populateRecordProjects(project ? project.id : state.projects[0].id);

    const setValue = (selector, value) => {
      const el = $(selector);
      if (el) el.value = value == null ? '' : value;
    };

    setValue('#recordTitle', info.defaultTitle);
    setValue('#recordLocation', project && project.location !== 'Konum belirtilmedi' ? project.location : '');
    setValue('#recordTeam', '');
    setValue('#recordPeople', '1');
    setValue('#recordMeters', '');
    setValue('#recordStatus', type === 'photo' ? 'pending' : 'completed');
    setValue('#recordNote', '');
    setValue('#recordPhoto', '');
    state.pendingPhoto = '';
    state.recordFormType = type;

    const preview = $('#recordPhotoPreview');
    const previewImage = $('#recordPhotoImg');
    if (preview) preview.hidden = true;
    if (previewImage) previewImage.removeAttribute('src');

    const error = $('#recordFormError');
    if (error) error.hidden = true;

    const title = $('#recordFormTitle');
    const submit = $('#recordFormSubmit');
    if (title) title.textContent = `${info.label} Ekle`;
    if (submit) submit.textContent = 'Kaydı Ekle';

    if (projectSelect) projectSelect.disabled = false;
    showSheet($('#recordSheet'));
  }

  function showRecordFormError(message) {
    const error = $('#recordFormError');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function compressImage(file, maxSize = 900, quality = 0.68) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('image'));
        image.onload = () => {
          const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('canvas'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleRecordSubmit(event) {
    event.preventDefault();

    const value = (selector) => {
      const el = $(selector);
      return el ? cleanText(el.value) : '';
    };

    const project = state.projects.find((item) => item.id === value('#recordProject'));
    if (!project) {
      showRecordFormError('Kayıt için proje seçin.');
      return;
    }

    const type = RECORD_TYPES[value('#recordType')] ? value('#recordType') : 'work';
    const info = recordTypeInfo(type);
    const status = RECORD_STATUS[value('#recordStatus')] ? value('#recordStatus') : 'completed';
    const title = value('#recordTitle') || info.defaultTitle;

    const record = normalizeRecord(
      {
        id: `record-${Date.now()}`,
        projectId: project.id,
        type,
        title,
        location: value('#recordLocation') || project.location,
        team: value('#recordTeam'),
        people: num($('#recordPeople')?.value, 1),
        meters: decimal($('#recordMeters')?.value, 0),
        status,
        note: value('#recordNote'),
        photo: state.pendingPhoto,
        createdAt: new Date().toISOString()
      },
      state.records.length
    );

    state.records = [record, ...state.records];
    if (applyAutoProgress()) saveProjects();
    let persisted = saveRecords();
    let photoDropped = false;

    if (!persisted && record.photo) {
      record.photo = '';
      state.records = state.records.map((item) => (item.id === record.id ? record : item));
      persisted = saveRecords();
      photoDropped = true;
    }

    renderAll();
    renderRecords();
    closeSheet($('#recordSheet'));
    markLocalChange();

    if (!persisted) {
      toast('Kayıt eklendi ancak cihazda yeterli kayıt alanı yok.');
    } else if (photoDropped) {
      toast('Kayıt eklendi; fotoğraf yer kalmadığı için kaydedilmedi.');
    } else {
      toast('Saha kaydı eklendi.');
    }
  }

  /* ---------------- Kayıtlar ---------------- */

  function recordCard(record, project) {
    return `
      <button type="button" class="record" data-project-id="${esc(record.projectId)}">
        ${
          record.photo
            ? `<img class="record-photo" src="${esc(record.photo)}" alt="">`
            : `<span class="record-icon tone-${esc(record.tone)}">${icon(esc(record.icon))}</span>`
        }
        <span class="record-main">
          <span class="record-title">${esc(record.title)}</span>
          <span class="meta">${icon('i-projects')}${esc(project ? project.title : 'Proje silinmiş')}</span>
          <span class="meta">${icon('i-pin')}${esc(record.location)}</span>
          ${record.team ? `<span class="meta">${icon('i-users')}${esc(record.team)}</span>` : ''}
        </span>
        <span class="record-side">
          <span class="side-top"><time>${esc(formatRecordTime(record))}</time>${icon('i-chevron', 'chev')}</span>
          <span class="badge ${esc(record.statusClass)}">${esc(record.statusLabel)}</span>
        </span>
      </button>`;
  }

  function renderRecords() {
    const wrap = $('#recordGroups');
    const empty = $('#recordEmpty');
    if (!wrap) return;

    const query = normalize(state.recordQuery.trim());
    const projects = new Map(state.projects.map((project) => [project.id, project]));
    const filtered = state.records
      .filter((record) => {
        const project = projects.get(record.projectId);
        const typeOk = state.recordType === 'all' || record.type === state.recordType;
        const queryOk =
          !query ||
          normalize(record.title).includes(query) ||
          normalize(record.location).includes(query) ||
          normalize(record.team).includes(query) ||
          normalize(record.note).includes(query) ||
          normalize(project ? project.title : '').includes(query);
        return typeOk && queryOk;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const groups = ['Bugün', 'Dün', 'Bu Hafta', 'Daha Önce'];
    const grouped = new Map(groups.map((label) => [label, []]));
    filtered.forEach((record) => {
      const label = recordGroup(record);
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(record);
    });

    let total = 0;
    wrap.innerHTML = Array.from(grouped.entries())
      .filter(([, items]) => items.length)
      .map(([label, items]) => {
        total += items.length;
        return `
          <section class="record-group">
            <div class="group-head">
              <h2>${esc(label)}</h2>
              <span>${items.length} kayıt</span>
            </div>
            ${items.map((record) => recordCard(record, projects.get(record.projectId))).join('')}
          </section>`;
      })
      .join('');

    if (empty) {
      empty.hidden = total !== 0;
      const strong = empty.querySelector('strong');
      const copy = empty.querySelector('p');
      if (!state.records.length) {
        if (strong) strong.textContent = 'Henüz kayıt yok';
        if (copy) copy.textContent = 'Ana sayfadaki hızlı işlemlerden ilk kaydını ekle.';
      } else {
        if (strong) strong.textContent = 'Kayıt bulunamadı';
        if (copy) copy.textContent = 'Arama veya filtreleri değiştirerek tekrar deneyin.';
      }
    }
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

  /* ---------------- Yerel yenileme ---------------- */

  function setupSync() {
    const syncBtn = $('#syncBtn');
    const syncText = $('#syncBtnText');
    const syncTitle = $('#syncTitle');
    const syncSub = $('#syncSub');
    const syncBar = $('#syncBar');

    const stored = readStorage(STORAGE.lastChange);
    if (stored && syncSub) syncSub.textContent = `Son değişiklik: ${stored}`;

    if (!syncBtn) return;

    syncBtn.addEventListener('click', () => {
      if (syncBtn.disabled) return;

      syncBtn.disabled = true;
      syncBtn.classList.add('is-syncing');
      syncBar?.classList.add('is-syncing');
      if (syncText) syncText.textContent = 'Yenileniyor';
      if (syncTitle) syncTitle.textContent = 'Yerel veriler okunuyor…';

      window.setTimeout(() => {
        renderAll();
        renderRecords();
        if (syncTitle) syncTitle.textContent = 'Tüm veriler bu cihazda';
        if (syncText) syncText.textContent = 'Yenile';
        syncBtn.disabled = false;
        syncBtn.classList.remove('is-syncing');
        syncBar?.classList.remove('is-syncing');
        toast('Yerel veriler yenilendi.');
      }, 600);
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
    const closer = event.target.closest(
      '[data-close-project-sheet], [data-close-project-form], [data-close-record-sheet], [data-close-confirm]'
    );
    if (closer) {
      closeSheet(closer.closest('.sheet'));
      return;
    }

    const confirmYes = event.target.closest('[data-confirm-yes]');
    if (confirmYes) {
      const action = state.confirmAction;
      state.confirmAction = null;
      state.confirmReturnProject = null;
      hideSheet($('#confirmSheet'));
      if (action) action();
      return;
    }

    const edit = event.target.closest('[data-edit-project]');
    if (edit) {
      event.preventDefault();
      openProjectForm(edit.dataset.editProject, true);
      return;
    }

    const remove = event.target.closest('[data-delete-project]');
    if (remove) {
      event.preventDefault();
      const project = state.projects.find((item) => item.id === remove.dataset.deleteProject);
      if (!project) return;
      openConfirm({
        title: 'Projeyi sil',
        text: `"${project.title}" projesi ve bağlı tüm saha kayıtları silinecek. Bu işlem geri alınamaz.`,
        confirmLabel: 'Sil',
        danger: true,
        returnProjectId: project.id,
        onConfirm: () => deleteProject(project.id)
      });
      return;
    }

    const emptyHero = event.target.closest('[data-empty-hero]');
    if (emptyHero) {
      event.preventDefault();
      openProjectForm();
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
    if (event.target.closest('[data-empty-hero]')) {
      event.preventDefault();
      openProjectForm();
      return;
    }
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

  const heroDots = $('#heroDots');
  if (heroDots) {
    heroDots.addEventListener('click', (event) => {
      const dot = event.target.closest('[data-hero-index]');
      if (!dot) return;
      const index = Number(dot.dataset.heroIndex);
      const project = state.projects[index];
      if (!project) return;
      state.featuredId = project.id;
      updateHeroDots(index);
      updateFeaturedPanels(project);
      scrollHeroTo(index);
    });
  }

  const heroTrack = $('#heroTrack');
  if (heroTrack) {
    let heroScrollFrame = 0;
    heroTrack.addEventListener('scroll', () => {
      if (heroScrollFrame) window.cancelAnimationFrame(heroScrollFrame);
      heroScrollFrame = window.requestAnimationFrame(() => {
        const cards = $$('.hero-card[data-project-id]', heroTrack);
        if (!cards.length) return;

        let closestIndex = 0;
        let closestDistance = Infinity;
        cards.forEach((card, index) => {
          const distance = Math.abs(card.offsetLeft - (heroTrack.scrollLeft + 18));
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        const projectId = cards[closestIndex].dataset.projectId;
        if (!projectId || projectId === state.featuredId) return;
        const project = state.projects.find((item) => item.id === projectId) || null;
        state.featuredId = projectId;
        updateHeroDots(closestIndex);
        updateFeaturedPanels(project);
      });
    });
  }

  const newProjectBtn = $('#newProjectBtn');
  if (newProjectBtn) newProjectBtn.addEventListener('click', () => openProjectForm());

  const newRecordBtn = $('#newRecordBtn');
  if (newRecordBtn) newRecordBtn.addEventListener('click', () => openRecordForm('work'));

  const quickWork = $('#quickWork');
  if (quickWork) quickWork.addEventListener('click', () => openRecordForm('work'));

  const quickService = $('#quickService');
  if (quickService) quickService.addEventListener('click', () => openRecordForm('service'));

  const quickPhoto = $('#quickPhoto');
  if (quickPhoto) quickPhoto.addEventListener('click', () => openRecordForm('photo'));

  const homeDetailBtn = $('#homeDetailBtn');
  if (homeDetailBtn) {
    homeDetailBtn.addEventListener('click', () => {
      if (state.featuredId) openProjectSheet(state.featuredId);
      else openProjectForm();
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

  const recordType = $('#recordType');
  if (recordType) {
    recordType.addEventListener('change', () => setRecordTypeDefaults(recordType.value));
  }

  const recordProject = $('#recordProject');
  if (recordProject) {
    recordProject.addEventListener('change', () => {
      const project = state.projects.find((item) => item.id === recordProject.value);
      const location = $('#recordLocation');
      if (project && location && !location.value.trim()) location.value = project.location;
    });
  }

  const recordPhotoInput = $('#recordPhoto');
  if (recordPhotoInput) {
    recordPhotoInput.addEventListener('change', async () => {
      const file = recordPhotoInput.files && recordPhotoInput.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        showRecordFormError('Lütfen bir görsel seçin.');
        recordPhotoInput.value = '';
        return;
      }

      try {
        state.pendingPhoto = await compressImage(file);
        const preview = $('#recordPhotoPreview');
        const image = $('#recordPhotoImg');
        if (image) image.src = state.pendingPhoto;
        if (preview) preview.hidden = false;
      } catch (error) {
        state.pendingPhoto = '';
        recordPhotoInput.value = '';
        showRecordFormError('Fotoğraf okunamadı. Tekrar deneyin.');
      }
    });
  }

  const recordForm = $('#recordForm');
  if (recordForm) recordForm.addEventListener('submit', handleRecordSubmit);

  /* ---------------- Başlangıç ---------------- */

  function renderAll() {
    syncProvinceOptions();
    renderHome();
    renderProjects();
    syncSelectLabels();
  }

  state.projects = loadProjects();
  state.records = loadRecords();
  if (applyAutoProgress()) saveProjects();
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
