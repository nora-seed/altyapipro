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
    lastChange: 'altyapipro.lastChange.v1',
    location: 'altyapipro.location.v1',
    session: 'altyapipro.session.v1'
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

  const LOCATIONS = {
    Kayseri: ['Melikgazi', 'Kocasinan'],
    Ankara: ['Çankaya', 'Keçiören'],
    İstanbul: ['Kadıköy', 'Şişli'],
    İzmir: ['Bornova', 'Karşıyaka'],
    Antalya: ['Muratpaşa', 'Kepez']
  };

  const AUTH_ROLES = {
    admin: {
      label: 'Yönetici',
      name: 'Yönetici',
      pin: '1234',
      title: 'Yönetici Girişi',
      hint: '4 haneli yönetici PIN kodunu girin.'
    },
    personel: {
      label: 'Personel',
      name: 'Saha Personeli',
      pin: '0000',
      title: 'Personel Girişi',
      hint: '4 haneli personel PIN kodunu girin.'
    }
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
    pending: { label: 'Beklemede', className: 'pending' },
    error: { label: 'Sorun Var', className: 'error' }
  };

  const APPROVAL_STATUS = {
    pending: { label: 'Onay Bekliyor', className: 'pending' },
    approved: { label: 'Onaylandı', className: 'completed' },
    rejected: { label: 'Reddedildi', className: 'error' }
  };

  const REPORT_PERIODS = {
    '7': { days: 7, label: 'Son 7 gün' },
    '30': { days: 30, label: 'Son 30 gün' },
    '90': { days: 90, label: 'Son 90 gün' },
    all: { days: null, label: 'Tüm Zamanlar' }
  };

  const REPORT_TYPE_COLORS = {
    work: '#1f6ff0',
    service: '#17a34a',
    dig: '#e5a11a',
    photo: '#8b5cf6',
    other: '#9aa7b8'
  };

  const BRANCHES = {
    water: { label: 'İçme Suyu', color: '#1f6ff0', icon: 'i-droplet', tone: 'blue' },
    sewer: { label: 'Kanalizasyon', color: '#a9743f', icon: 'i-waves', tone: 'brown' },
    rain: { label: 'Yağmur Suyu', color: '#17a34a', icon: 'i-cloud-rain', tone: 'green' },
    telecom: { label: 'Telekom', color: '#8b5cf6', icon: 'i-radio', tone: 'purple' }
  };

  const TILE_SOURCES = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>'
      }
    }
  };

  const state = {
    role: null,
    authRole: null,
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
    reportProject: 'all',
    reportPeriod: '30',
    editingId: null,
    formReturnId: null,
    pendingRecordType: null,
    recordFormType: 'work',
    editingRecordId: null,
    pendingPhoto: '',
    sheetFocus: null,
    confirmAction: null,
    confirmReturnProject: null,
    mapBranch: 'all',
    mapProjectId: 'all',
    mapSatellite: false
  };

  let mapInstance = null;
  let streetLayer = null;
  let satelliteLayer = null;
  let projectLayer = null;
  let recordLayer = null;
  let locationLayer = null;
  let locationMarker = null;
  let searchMarker = null;
  let currentLocation = null;
  let mapEverRendered = false;
  let tileErrorShown = false;
  const projectMarkers = new Map();
  const recordMarkers = new Map();

  function isAdmin() {
    return state.role === 'admin';
  }

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

  function parseNumeric(value) {
    let text = cleanText(value).replace(/\s/g, '').replace(/[^\d.,-]/g, '');
    if (!text) return NaN;
    if (text.includes(',') && text.includes('.')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if (text.includes(',')) {
      text = text.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, '');
    }
    const amount = Number(text);
    return Number.isFinite(amount) ? amount : NaN;
  }

  function parseMeters(value, defaultUnit = 'm') {
    const text = cleanText(value).toLocaleLowerCase('tr-TR');
    const unit = (text.match(/(km|m)\s*$/) || [])[1];
    const amount = parseNumeric(text.replace(/(km|m)\s*$/, ''));
    if (!Number.isFinite(amount)) return 0;
    if (unit === 'km') return amount * 1000;
    if (unit === 'm') return amount;
    return defaultUnit === 'km' ? amount * 1000 : amount;
  }

  function normalizeLengthText(value, fallback = '0 km') {
    const text = cleanText(value);
    if (!text) return fallback;
    if (/(km|m)$/i.test(text)) return text;
    const amount = decimal(text, NaN);
    return Number.isFinite(amount) ? `${formatNumber(amount)} km` : text;
  }

  function formatMeters(meters) {
    return meters >= 1000 ? `${formatNumber(meters / 1000)} km` : `${formatNumber(meters)} m`;
  }

  const volumeFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
  function formatVolume(value) {
    return volumeFormatter.format(value);
  }

  function roundVolume(value) {
    return Math.round(value * 100) / 100;
  }

  function normalizeCoordinate(value, min, max) {
    if (value === null || value === undefined || value === '') return null;
    const amount = Number(String(value).replace(',', '.'));
    return Number.isFinite(amount) && amount >= min && amount <= max ? amount : null;
  }

  function readCoordinates(latSelector, lngSelector) {
    const latText = cleanText($(latSelector)?.value);
    const lngText = cleanText($(lngSelector)?.value);
    if (!latText && !lngText) return { lat: null, lng: null };
    if (!latText || !lngText) {
      return { error: 'Enlem ve boylam birlikte girilmeli.' };
    }
    const lat = normalizeCoordinate(latText, -90, 90);
    const lng = normalizeCoordinate(lngText, -180, 180);
    if (lat === null || lng === null) {
      return { error: 'Geçerli enlem (-90 / 90) ve boylam (-180 / 180) girin.' };
    }
    return { lat, lng };
  }

  function hasCoordinates(item) {
    return Number.isFinite(item?.lat) && Number.isFinite(item?.lng);
  }

  function formatCoordinate(value) {
    return Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 5 });
  }

  function projectBranch(project) {
    const type = normalize(project?.type || '');
    if (type.includes('kanalizasyon')) return 'sewer';
    if (type.includes('yağmur')) return 'rain';
    if (type.includes('telekom')) return 'telecom';
    return 'water';
  }

  function branchInfo(branch) {
    return BRANCHES[branch] || BRANCHES.water;
  }

  function haversineKm(a, b) {
    if (!a || !b) return null;
    const toRad = (value) => (value * Math.PI) / 180;
    const earth = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function formatDistance(km) {
    if (!Number.isFinite(km)) return '';
    return km < 1 ? `${formatNumber(Math.round(km * 1000))} m` : `${formatNumber(km)} km`;
  }

  function distanceLabel(lat, lng) {
    if (!currentLocation) return '';
    const km = haversineKm(currentLocation, { lat, lng });
    return km === null ? '' : formatDistance(km);
  }

  function projectWorkMeters(projectId) {
    return state.records
      .filter(
        (record) =>
          record.projectId === projectId &&
          record.type === 'work' &&
          record.approvalStatus === 'approved'
      )
      .reduce((total, record) => total + record.meters, 0);
  }

  function applyAutoProgress() {
    let changed = false;
    state.projects = state.projects.map((project) => {
      const totalMeters = parseMeters(project.total, 'km');
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
  const approvalInfo = (status) => APPROVAL_STATUS[status] || APPROVAL_STATUS.approved;

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
      length: normalizeLengthText(project.length, '0 km'),
      total: normalizeLengthText(project.total, '0 km'),
      personnel: Math.max(0, num(project.personnel)),
      days: Math.max(0, num(project.days)),
      thumb: project.thumb || THUMBS[type] || 'assets/city.svg',
      contractor: cleanText(project.contractor) || 'Belirtilmedi',
      startDate: cleanText(project.startDate) || 'Belirtilmedi',
      description: cleanText(project.description) || 'Açıklama eklenmedi.',
      autoProgress: Boolean(project.autoProgress),
      lat: normalizeCoordinate(project.lat, -90, 90),
      lng: normalizeCoordinate(project.lng, -180, 180)
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
    const approvalStatus = APPROVAL_STATUS[record.approvalStatus]
      ? record.approvalStatus
      : record.status === 'pending'
        ? 'pending'
        : 'approved';
    const approval = approvalInfo(approvalStatus);
    const reviewedDate = new Date(record.reviewedAt);
    const reviewedAt = Number.isNaN(reviewedDate.getTime()) ? '' : reviewedDate.toISOString();
    const createdByRole = record.createdByRole === 'personel' ? 'personel' : 'admin';
    const width = Math.max(0, decimal(record.width, 0));
    const depth = Math.max(0, decimal(record.depth, 0));
    const length = Math.max(0, decimal(record.length, 0));
    const bucket = Math.max(0, decimal(record.bucket, 0));
    const volume = roundVolume(
      Math.max(0, decimal(record.volume, 0) || width * depth * length)
    );
    const bucketCount = bucket > 0 ? roundVolume(volume / bucket) : 0;

    return {
      id: String(record.id || `record-${Date.now()}-${index}`),
      projectId: String(record.projectId || ''),
      type,
      title: cleanText(record.title) || typeInfo.defaultTitle,
      location: cleanText(record.location) || 'Konum belirtilmedi',
      team: cleanText(record.team),
      people: Math.max(0, num(record.people, 0)),
      meters: Math.max(0, decimal(record.meters, 0)),
      width,
      depth,
      length,
      volume,
      bucket,
      bucketCount,
      machine: cleanText(record.machine),
      status,
      statusLabel: statusInfoValue.label,
      statusClass: statusInfoValue.className,
      approvalStatus,
      approvalLabel: approval.label,
      approvalClass: approval.className,
      createdByRole,
      createdByName:
        cleanText(record.createdByName) || AUTH_ROLES[createdByRole].name,
      reviewedAt,
      reviewedBy: cleanText(record.reviewedBy),
      tone: typeInfo.tone,
      icon: typeInfo.icon,
      note: cleanText(record.note),
      photo:
        typeof record.photo === 'string' && record.photo.indexOf('data:image/') === 0
          ? record.photo
          : '',
      createdAt,
      lat: normalizeCoordinate(record.lat, -90, 90),
      lng: normalizeCoordinate(record.lng, -180, 180)
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

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function saveProjects() {
    return writeStorage(STORAGE.projects, JSON.stringify(state.projects));
  }

  function saveRecords() {
    return writeStorage(STORAGE.records, JSON.stringify(state.records));
  }

  function loadSessionRole() {
    const saved = readStorage(STORAGE.session);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      const role = typeof parsed === 'string' ? parsed : parsed && parsed.role;
      return AUTH_ROLES[role] ? role : null;
    } catch (error) {
      return null;
    }
  }

  function saveSessionRole(role) {
    if (!AUTH_ROLES[role]) return false;
    return writeStorage(
      STORAGE.session,
      JSON.stringify({ role, loggedInAt: new Date().toISOString() })
    );
  }

  function clearSessionRole() {
    return removeStorage(STORAGE.session);
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
    const list = state.records.filter(
      (record) =>
        record.approvalStatus === 'approved' &&
        isSameDay(new Date(record.createdAt), date)
    );
    const length = list
      .filter((record) => record.type === 'work')
      .reduce((total, record) => total + record.meters, 0);
    const excavationVolume = list
      .filter((record) => record.type === 'dig')
      .reduce((total, record) => total + record.volume, 0);
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
      excavationVolume,
      teams: teams.size,
      personnel: Array.from(teams.values()).reduce((total, value) => total + value, 0)
    };
  }

  function teamDetailsForDay(date = new Date()) {
    const teams = new Map();
    state.records
      .filter(
        (record) =>
          record.approvalStatus === 'approved' &&
          isSameDay(new Date(record.createdAt), date) &&
          record.team
      )
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

    if (name === 'map') {
      const raf = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
      raf(() => ensureMap());
    }
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

  function syncProjectLocationSelects(province = '', district = '') {
    const provinceSelect = $('#projectProvince');
    const districtSelect = $('#projectDistrict');
    if (!provinceSelect || !districtSelect) return;

    const provinces = Object.keys(LOCATIONS);
    if (province && !provinces.includes(province)) provinces.push(province);
    provinceSelect.innerHTML = [
      '<option value="">İl seçin</option>',
      ...provinces.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
    ].join('');
    provinceSelect.value = province || '';
    syncProjectDistrictOptions(district);
  }

  function syncProjectDistrictOptions(selected = '') {
    const provinceSelect = $('#projectProvince');
    const districtSelect = $('#projectDistrict');
    if (!provinceSelect || !districtSelect) return;

    const province = provinceSelect.value;
    const districts = province ? [...(LOCATIONS[province] || [])] : [];
    if (selected && !districts.includes(selected)) districts.push(selected);

    districtSelect.disabled = !province;
    districtSelect.innerHTML = province
      ? [
          '<option value="">İlçe seçin</option>',
          ...districts.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
        ].join('')
      : '<option value="">Önce il seçin</option>';

    if (selected && districts.includes(selected)) districtSelect.value = selected;
  }

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
        if (copy) {
          copy.textContent = isAdmin()
            ? 'Yeni Proje ile ilk projenizi oluşturun.'
            : 'Proje eklemek için yönetici girişi gerekir.';
        }
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
        <button type="button" class="recent-item" data-edit-record="${esc(record.id)}" aria-label="${esc(record.title)} kaydını düzenle">
          <span class="record-icon tone-${esc(record.tone)}">${icon(esc(record.icon))}</span>
          <span class="recent-main">
            <span class="recent-top">
              <strong>${esc(record.title)}</strong>
              <span class="recent-time">${esc(formatRecordTime(record))}</span>
              ${icon('i-chevron', 'chev')}
            </span>
            <span class="recent-addr">${esc(record.location)}</span>
            ${record.type === 'dig' ? `<span class="recent-volume">${formatVolume(record.volume)} m³ kazı</span>` : ''}
            <span class="badge ${esc(record.approvalStatus === 'approved' ? record.statusClass : record.approvalClass)}">${esc(record.approvalStatus === 'approved' ? record.statusLabel : record.approvalLabel)}</span>
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
    const canCreate = isAdmin();
    return `
      <article class="hero-card is-empty"${canCreate ? ' data-empty-hero role="button" tabindex="0" aria-label="Yeni proje oluştur"' : ''}>
        <img class="hero-thumb" src="assets/city.svg" alt="">
        <div class="hero-info">
          <div class="hero-top">
            <span class="eyebrow">Başlangıç</span>
            ${canCreate ? icon('i-chevron', 'chev') : ''}
          </div>
          <h2 class="hero-title">${canCreate ? 'İlk projeni oluştur' : 'Henüz proje yok'}</h2>
          <div class="hero-meta">
            <span>${icon('i-pin')}<span>${canCreate ? 'Yeni proje eklemek için dokun' : 'Proje eklemek için yönetici girişi gerekli'}</span></span>
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
    const pending = state.records.filter((record) => record.approvalStatus === 'pending');
    const pendingToday = pending.filter((record) => isSameDay(new Date(record.createdAt), new Date())).length;

    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };

    setText('#statLength', formatNumber(today.length));
    setText('#statLengthPrev', `Dün: ${formatNumber(yesterday.length)} m`);
    setText('#statExcavations', formatVolume(today.excavationVolume));
    setText('#statExcavationsPrev', `Dün: ${formatVolume(yesterday.excavationVolume)} m³`);
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
    const distanceEl = $('#mapActiveDistance');
    if (distanceEl) {
      const distance = hasCoordinates(featured) ? distanceLabel(featured.lat, featured.lng) : '';
      distanceEl.hidden = !distance;
      const distanceValue = $('b', distanceEl);
      if (distanceValue) distanceValue.textContent = distance || '—';
    }
  }

  /* ---------------- Harita ---------------- */

  function mappedPoints() {
    const points = [];
    const projects = new Map(state.projects.map((project) => [project.id, project]));

    state.projects.forEach((project) => {
      if (!hasCoordinates(project)) return;
      points.push({
        kind: 'project',
        id: project.id,
        project,
        lat: project.lat,
        lng: project.lng,
        branch: projectBranch(project)
      });
    });

    state.records.forEach((record) => {
      if (record.approvalStatus !== 'approved' || !hasCoordinates(record)) return;
      const project = projects.get(record.projectId);
      if (!project) return;
      points.push({
        kind: 'record',
        id: record.id,
        project,
        record,
        lat: record.lat,
        lng: record.lng,
        branch: projectBranch(project)
      });
    });

    return points;
  }

  function selectedMapProject() {
    if (state.mapProjectId === 'all') return null;
    return state.projects.find((project) => project.id === state.mapProjectId) || null;
  }

  function selectedMapPoints() {
    const project = selectedMapProject();
    const points = mappedPoints();
    return project ? points.filter((point) => point.project.id === project.id) : points;
  }

  function renderMapProjects() {
    const wrap = $('#mapProjectFilters');
    const count = $('#mapProjectCount');
    if (!wrap) return;

    if (state.mapProjectId !== 'all' && !state.projects.some((project) => project.id === state.mapProjectId)) {
      state.mapProjectId = 'all';
    }
    if (count) count.textContent = `${state.projects.length} proje`;

    if (!state.projects.length) {
      wrap.innerHTML = '<span class="map-project-empty">Henüz proje yok</span>';
      return;
    }

    wrap.innerHTML = [
      `<button class="chip${state.mapProjectId === 'all' ? ' is-active' : ''}" type="button" data-map-project="all"><i class="dot blue"></i><span>Tümü</span></button>`,
      ...state.projects.map((project) => {
        const branch = branchInfo(projectBranch(project));
        return `<button class="chip${state.mapProjectId === project.id ? ' is-active' : ''}" type="button" data-map-project="${esc(project.id)}" title="${esc(project.title)}"><i class="dot ${branch.tone}"></i><span>${esc(project.title)}</span></button>`;
      })
    ].join('');
  }

  function setMapProject(projectId, { fit = true } = {}) {
    const exists = state.projects.some((project) => project.id === projectId);
    state.mapProjectId = projectId !== 'all' && exists ? projectId : 'all';
    renderMapProjects();
    renderMapData({ fit });
    const project = selectedMapProject();
    renderMapActive(project || currentFeaturedProject());
  }

  function mapPopupHtml(point) {
    const branch = branchInfo(point.branch);
    const project = point.project;
    const isRecord = point.kind === 'record';
    const record = point.record;
    const title = isRecord ? record.title : project.title;
    const subtitle = isRecord
      ? `${project.title}${record.location && record.location !== project.location ? ` · ${record.location}` : ''}`
      : project.location;
    const detail = isRecord
      ? `${recordTypeInfo(record.type).label}${record.type === 'dig' ? ` · ${formatVolume(record.volume)} m³` : ''} · ${formatRecordTime(record)}`
      : `${project.type} · %${project.progress}`;
    const distance = distanceLabel(point.lat, point.lng);

    return `
      <div class="map-popup" style="--pin:${branch.color}">
        <span class="map-popup-type">${esc(branch.label)} · ${esc(isRecord ? 'Saha Kaydı' : 'Proje')}</span>
        <strong>${esc(title)}</strong>
        <small>${esc(subtitle)}</small>
        <small>${esc(detail)}${distance ? ` · ${esc(distance)}` : ''}</small>
        <button type="button" data-project-id="${esc(project.id)}">Projeyi Aç</button>
      </div>`;
  }

  function renderMapNearby() {
    const selected = selectedMapProject();
    const points = selectedMapPoints();
    const counts = { water: 0, sewer: 0, rain: 0, telecom: 0 };
    points.forEach((point) => {
      if (counts[point.branch] != null) counts[point.branch] += 1;
    });

    $$('[data-nearby-branch]').forEach((button) => {
      const branch = button.dataset.nearbyBranch;
      const count = counts[branch] || 0;
      const value = button.querySelector('small');
      if (value) value.textContent = `${count} adet`;
      button.classList.toggle('is-active', state.mapBranch === branch);
    });

    $$('#branchFilters .chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.branch === state.mapBranch);
    });

    const empty = $('#mapEmpty');
    if (empty) {
      empty.hidden = points.length > 0 || (!selected && Boolean(currentLocation));
      const title = $('#mapEmptyTitle');
      const copy = $('#mapEmptyText');
      const action = $('#mapEmptyAction');
      if (selected) {
        if (title) title.textContent = 'Bu projede konum yok';
        if (copy) copy.textContent = 'Haritada görmek için projeye enlem/boylam ekleyin.';
        if (action) action.textContent = 'Projeyi Düzenle';
      } else if (state.projects.length) {
        if (title) title.textContent = 'Haritada nokta yok';
        if (copy) copy.textContent = 'Projelere enlem/boylam ekleyin.';
        if (action) action.textContent = 'Projeleri Gör';
      } else {
        if (title) title.textContent = 'Henüz proje yok';
        if (copy) copy.textContent = 'Haritada görmek için önce proje ekleyin.';
        if (action) action.textContent = 'Proje Ekle';
      }
    }
  }

  function fitMapToData() {
    if (!mapInstance) return;
    const selected = selectedMapProject();
    const points = selectedMapPoints();
    const bounds = window.L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    if (!selected && currentLocation) bounds.extend([currentLocation.lat, currentLocation.lng]);
    if (bounds.isValid()) {
      mapInstance.fitBounds(bounds.pad(0.24), { maxZoom: 15, animate: true });
    } else {
      mapInstance.setView([39, 35], 6);
    }
  }

  function updateLocationMarker() {
    if (!mapInstance || !locationLayer) return;
    locationLayer.clearLayers();
    locationMarker = null;
    if (!currentLocation) return;

    const locationIcon = window.L.divIcon({
      className: 'map-location-icon',
      html: '<span class="map-location-dot"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    locationMarker = window.L.marker([currentLocation.lat, currentLocation.lng], {
      icon: locationIcon,
      keyboard: false,
      zIndexOffset: 1000,
      title: 'Konumunuz'
    })
      .addTo(locationLayer)
      .bindPopup(
        `<div class="map-popup" style="--pin:#1f6ff0"><span class="map-popup-type">GPS</span><strong>Konumunuz</strong><small>${formatCoordinate(currentLocation.lat)}, ${formatCoordinate(currentLocation.lng)}</small></div>`,
        { closeButton: true, maxWidth: 200 }
      );
  }

  function renderMapData({ fit = false } = {}) {
    renderMapNearby();
    if (!mapInstance) return;

    projectLayer.clearLayers();
    recordLayer.clearLayers();
    projectMarkers.clear();
    recordMarkers.clear();

    if (searchMarker) {
      mapInstance.removeLayer(searchMarker);
      searchMarker = null;
    }

    selectedMapPoints()
      .filter((point) => state.mapBranch === 'all' || point.branch === state.mapBranch)
      .forEach((point) => {
        const branch = branchInfo(point.branch);
        const isRecord = point.kind === 'record';
        const markerIcon = isRecord
          ? window.L.divIcon({
              className: 'map-record-icon',
              html: `<span class="map-record-dot" style="--pin:${branch.color}"></span>`,
              iconSize: [15, 15],
              iconAnchor: [7.5, 7.5],
              popupAnchor: [0, -8]
            })
          : window.L.divIcon({
              className: 'map-pin-icon',
              html: `<span class="map-pin-body" style="--pin:${branch.color}">${icon(branch.icon)}</span>`,
              iconSize: [30, 38],
              iconAnchor: [15, 36],
              popupAnchor: [0, -31]
            });

        const marker = window.L.marker([point.lat, point.lng], {
          icon: markerIcon,
          title: isRecord ? point.record.title : point.project.title,
          zIndexOffset: isRecord ? 0 : 300
        });
        marker.bindPopup(mapPopupHtml(point), {
          closeButton: true,
          maxWidth: 230,
          minWidth: 180,
          autoPanPaddingTopLeft: [20, 80],
          autoPanPaddingBottomRight: [20, 290]
        });
        marker.on('click', () => renderMapActive(point.project));

        if (isRecord) {
          marker.addTo(recordLayer);
          recordMarkers.set(point.id, marker);
        } else {
          marker.addTo(projectLayer);
          projectMarkers.set(point.id, marker);
        }
      });

    if (fit) fitMapToData();
  }

  function setMapBranch(branch) {
    state.mapBranch = branch === 'all' || BRANCHES[branch] ? branch : 'all';
    renderMapData();
  }

  function updateBaseButtons() {
    const label = $('#mapLayersText');
    if (label) label.textContent = state.mapSatellite ? 'Sokak' : 'Uydu';
    const chip = $('#mapSatelliteBtn');
    if (chip) {
      chip.classList.toggle('is-active', state.mapSatellite);
      chip.setAttribute('aria-pressed', String(state.mapSatellite));
    }
  }

  function setBaseLayer(satellite) {
    state.mapSatellite = Boolean(satellite);
    updateBaseButtons();
    if (!mapInstance) return;

    if (state.mapSatellite) {
      if (mapInstance.hasLayer(streetLayer)) mapInstance.removeLayer(streetLayer);
      if (!mapInstance.hasLayer(satelliteLayer)) satelliteLayer.addTo(mapInstance);
    } else {
      if (mapInstance.hasLayer(satelliteLayer)) mapInstance.removeLayer(satelliteLayer);
      if (!mapInstance.hasLayer(streetLayer)) streetLayer.addTo(mapInstance);
    }
  }

  function initMap() {
    if (mapInstance || !window.L) return;
    const canvas = $('#mapCanvas');
    if (!canvas) return;

    mapInstance = window.L.map(canvas, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 5,
      maxZoom: 19,
      worldCopyJump: true
    });
    mapInstance.setView([39, 35], 6);

    streetLayer = window.L.tileLayer(TILE_SOURCES.street.url, TILE_SOURCES.street.options);
    satelliteLayer = window.L.tileLayer(TILE_SOURCES.satellite.url, TILE_SOURCES.satellite.options);
    streetLayer.addTo(mapInstance);

    projectLayer = window.L.layerGroup().addTo(mapInstance);
    recordLayer = window.L.layerGroup().addTo(mapInstance);
    locationLayer = window.L.layerGroup().addTo(mapInstance);

    const showTileError = () => {
      if (tileErrorShown) return;
      tileErrorShown = true;
      toast('Harita karoları yüklenemedi. Bağlantıyı kontrol edin.');
    };
    streetLayer.on('tileerror', showTileError);
    satelliteLayer.on('tileerror', showTileError);

    $('#mapWrap')?.classList.add('map-ready');
    setBaseLayer(state.mapSatellite);
    updateLocationMarker();
  }

  function ensureMap() {
    if (!window.L) {
      toast('Harita motoru yüklenemedi.');
      return;
    }
    if (!mapInstance) initMap();
    if (!mapInstance) return;
    mapInstance.invalidateSize();
    if (!mapEverRendered) {
      renderMapData({ fit: true });
      mapEverRendered = true;
    } else {
      renderMapData();
    }
  }

  function setCurrentLocation(location, { fly = false } = {}) {
    currentLocation = {
      lat: location.lat,
      lng: location.lng,
      accuracy: Number.isFinite(location.accuracy) ? location.accuracy : 0,
      updatedAt: new Date().toISOString()
    };
    writeStorage(STORAGE.location, JSON.stringify(currentLocation));
    updateLocationMarker();
    if (mapInstance) {
      renderMapData();
      const activeId = $('#mapActiveWork')?.dataset.projectId;
      const activeProject = state.projects.find((project) => project.id === activeId);
      if (activeProject) renderMapActive(activeProject);
      if (fly) {
        mapInstance.flyTo([currentLocation.lat, currentLocation.lng], Math.max(mapInstance.getZoom(), 14), {
          duration: 0.9
        });
      }
    }
  }

  function requestLocation({ fly = false, silent = false } = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        if (!silent) toast('Bu cihaz konum servisini desteklemiyor.');
        reject(new Error('unsupported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCurrentLocation(location, { fly });
          if (!silent) toast('Konum alındı.');
          resolve(location);
        },
        (error) => {
          if (!silent) {
            const message =
              error?.code === 1
                ? 'Konum izni verilmedi. Tarayıcı ayarlarından izin verin.'
                : error?.code === 3
                  ? 'Konum isteği zaman aşımına uğradı.'
                  : 'Konum alınamadı. Tekrar deneyin.';
            toast(message);
          }
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });
  }

  function loadStoredLocation() {
    const raw = readStorage(STORAGE.location);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const lat = normalizeCoordinate(parsed.lat, -90, 90);
      const lng = normalizeCoordinate(parsed.lng, -180, 180);
      if (lat === null || lng === null) return null;
      return { lat, lng, accuracy: Number(parsed.accuracy) || 0, updatedAt: parsed.updatedAt || '' };
    } catch (error) {
      return null;
    }
  }

  function refreshMapForData() {
    if (mapInstance) renderMapData();
    else renderMapNearby();
  }

  function focusProjectOnMap(projectId) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    ensureMap();
    if (!mapInstance) return;
    state.mapBranch = 'all';
    setMapProject(project.id, { fit: true });
    renderMapActive(project);
    if (!selectedMapPoints().length) {
      toast('Bu projede harita konumu yok.');
      return;
    }
    const marker = projectMarkers.get(project.id);
    if (marker) window.setTimeout(() => marker.openPopup(), 220);
  }

  function focusRecordOnMap(record) {
    const project = state.projects.find((item) => item.id === record.projectId);
    if (!project || !hasCoordinates(record)) return;
    ensureMap();
    if (!mapInstance) return;
    state.mapBranch = 'all';
    setMapProject(project.id, { fit: true });
    renderMapActive(project);
    mapInstance.flyTo([record.lat, record.lng], Math.max(mapInstance.getZoom(), 16), {
      duration: 0.8
    });
    const marker = recordMarkers.get(record.id);
    if (marker) window.setTimeout(() => marker.openPopup(), 220);
  }

  function runMapSearch(rawQuery) {
    const query = cleanText(rawQuery);
    if (!query) return;
    ensureMap();
    if (!mapInstance) return;

    const coordinateMatch = query.match(
      /^(-?\d+(?:[.,]\d+)?)\s*(?:[,;]\s*|\s+)(-?\d+(?:[.,]\d+)?)$/
    );
    if (coordinateMatch) {
      const lat = normalizeCoordinate(coordinateMatch[1], -90, 90);
      const lng = normalizeCoordinate(coordinateMatch[2], -180, 180);
      if (lat !== null && lng !== null) {
        if (searchMarker) mapInstance.removeLayer(searchMarker);
        searchMarker = window.L.marker([lat, lng], {
          icon: window.L.divIcon({
            className: 'map-location-icon',
            html: '<span class="map-location-dot"></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          })
        })
          .addTo(mapInstance)
          .bindPopup(
            `<div class="map-popup" style="--pin:#1f6ff0"><span class="map-popup-type">Arama</span><strong>${formatCoordinate(lat)}, ${formatCoordinate(lng)}</strong></div>`
          )
          .openPopup();
        mapInstance.flyTo([lat, lng], 16, { duration: 0.8 });
        return;
      }
    }

    const needle = normalize(query);
    const project = state.projects.find(
      (item) =>
        normalize(item.title).includes(needle) ||
        normalize(item.location).includes(needle) ||
        normalize(item.type).includes(needle)
    );
    if (project) {
      focusProjectOnMap(project.id);
      return;
    }

    const record = state.records.find(
      (item) =>
        item.approvalStatus === 'approved' &&
        hasCoordinates(item) &&
        (normalize(item.title).includes(needle) ||
          normalize(item.location).includes(needle) ||
          normalize(item.team).includes(needle))
    );
    if (record) {
      focusRecordOnMap(record);
      return;
    }

    toast('Eşleşen konum bulunamadı.');
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
      state.editingRecordId = null;
    }
    hideSheet(sheet);
  }

  function closeAllSheets() {
    state.confirmAction = null;
    state.confirmReturnProject = null;
    state.formReturnId = null;
    state.editingId = null;
    state.pendingRecordType = null;
    state.pendingPhoto = '';
    state.editingRecordId = null;
    $$('.sheet').forEach((sheet) => {
      if (!sheet.hidden) hideSheet(sheet);
    });
    document.body.classList.remove('sheet-open');
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
        <div class="detail-stat is-wide"><span>Harita konumu</span><strong>${hasCoordinates(project) ? `${esc(formatCoordinate(project.lat))}, ${esc(formatCoordinate(project.lng))}` : 'Eklenmedi'}</strong></div>
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
                  <div class="detail-record" role="button" tabindex="0" data-edit-record="${esc(record.id)}" aria-label="${esc(record.title)} kaydını düzenle">
                    ${
                      record.photo
                        ? `<img class="record-photo" src="${esc(record.photo)}" alt="">`
                        : `<span class="record-icon tone-${esc(record.tone)}">${icon(esc(record.icon))}</span>`
                    }
                    <span class="detail-record-main">
                      <strong>${esc(record.title)}</strong>
                      <small>${esc(record.location)}${record.team ? ` · ${esc(record.team)}` : ''}</small>
                      ${record.type === 'dig' ? `<small class="detail-volume">${formatVolume(record.volume)} m³ · ${formatVolume(record.width)} × ${formatVolume(record.depth)} × ${formatVolume(record.length)} m${record.bucket ? ` · ${formatNumber(record.bucketCount)} kova` : ''}</small>` : ''}
                      <small class="approval-line is-${esc(record.approvalStatus)}">${esc(record.approvalLabel)}${record.approvalStatus === 'pending' ? ` · ${esc(record.createdByName)}` : ''}</small>
                    </span>
                    <time>${esc(formatRecordTime(record))}</time>
                  </div>`
                )
                .join('')
            : '<div class="detail-empty">Bu projeye ait saha kaydı henüz yok.</div>'
        }
      </div>`;

    foot.innerHTML = `
      ${
        isAdmin()
          ? `<button class="btn btn-outline" type="button" data-edit-project="${esc(project.id)}">Düzenle</button>
             <button class="btn btn-danger" type="button" data-delete-project="${esc(project.id)}">Sil</button>`
          : ''
      }
      ${hasCoordinates(project) ? `<button class="btn btn-outline" type="button" data-show-map="${esc(project.id)}">Haritada</button>` : ''}
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
    if (!isAdmin()) {
      toast('Proje silme yalnızca yönetici yetkisindedir.');
      return;
    }
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
    syncProjectLocationSelects(project ? project.province : '', project ? project.district : '');
    setValue(
      '#projectContractor',
      project ? (project.contractor === 'Belirtilmedi' ? '' : project.contractor) : ''
    );
    setValue('#projectLength', project ? project.length : '');
    setValue('#projectTotal', project ? project.total : '');
    setValue('#projectPersonnel', project ? project.personnel : '');
    setValue('#projectDays', project ? project.days : '');
    setValue('#projectLat', project && hasCoordinates(project) ? project.lat : '');
    setValue('#projectLng', project && hasCoordinates(project) ? project.lng : '');
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
    if (!isAdmin()) {
      toast('Proje ekleme ve düzenleme yalnızca yönetici yetkisindedir.');
      return;
    }
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

    if (!isAdmin()) {
      showProjectFormError('Bu işlem için yönetici yetkisi gerekli.');
      return;
    }

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

    const coordinates = readCoordinates('#projectLat', '#projectLng');
    if (coordinates.error) {
      showProjectFormError(coordinates.error);
      return;
    }

    const district = value('#projectDistrict');
    if (!district) {
      showProjectFormError('İlçe seçin.');
      $('#projectDistrict')?.focus();
      return;
    }

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
        description: value('#projectDescription') || 'Açıklama eklenmedi.',
        lat: coordinates.lat,
        lng: coordinates.lng
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

  function populateTeamOptions(selected = '') {
    const select = $('#recordTeamSelect');
    if (!select) return;

    const teams = Array.from(
      new Set(state.records.map((record) => record.team).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'tr'));

    select.innerHTML = [
      '<option value="">Manuel ekip gir</option>',
      ...teams.map((team) => `<option value="${esc(team)}">${esc(team)}</option>`)
    ].join('');
    select.value = teams.includes(selected) ? selected : '';
  }

  function updateDigPreview() {
    const preview = $('#recordVolumePreview');
    const bucketInfo = $('#recordBucketCount');
    if (!preview) return;

    const width = Math.max(0, decimal($('#recordWidth')?.value, 0));
    const depth = Math.max(0, decimal($('#recordDepth')?.value, 0));
    const length = Math.max(0, decimal($('#recordLength')?.value, 0));
    const bucket = Math.max(0, decimal($('#recordBucket')?.value, 0));
    const volume = roundVolume(width * depth * length);
    const bucketCount = bucket > 0 ? roundVolume(volume / bucket) : 0;

    preview.textContent = `${formatVolume(volume)} m³`;
    if (bucketInfo) {
      bucketInfo.textContent = bucket > 0
        ? `Yaklaşık ${formatNumber(bucketCount)} kova · kova ${formatVolume(bucket)} m³`
        : 'Kova kapasitesi girilince kova sayısı hesaplanır.';
    }
  }

  function toggleDigFields(type) {
    const box = $('#recordDigFields');
    const metersField = $('#recordMetersField');
    if (box) box.hidden = type !== 'dig';
    if (metersField) metersField.hidden = type === 'dig';
    updateDigPreview();
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
    const formTitle = $('#recordFormTitle');
    if (formTitle) {
      formTitle.textContent = `${info.label} ${state.editingRecordId ? 'Güncelle' : 'Ekle'}`;
    }
    toggleDigFields(type);
  }

  function openRecordForm(type = 'work', projectId = null, editingRecord = null) {
    if (!state.projects.length) {
      if (!isAdmin()) {
        toast('Saha kaydı için önce yönetici bir proje eklemeli.');
        return;
      }
      state.pendingRecordType = type;
      state.editingRecordId = null;
      openProjectForm();
      toast('Önce bir proje ekleyin.');
      return;
    }

    const record = editingRecord || null;
    state.editingRecordId = record ? record.id : null;
    const formType = record && RECORD_TYPES[record.type] ? record.type : type;
    const info = recordTypeInfo(formType);
    const project =
      state.projects.find((item) => item.id === (record ? record.projectId : projectId)) ||
      currentFeaturedProject();
    const typeSelect = $('#recordType');
    const projectSelect = $('#recordProject');
    if (typeSelect) typeSelect.value = formType;
    populateRecordProjects(project ? project.id : state.projects[0].id);

    const setValue = (selector, value) => {
      const el = $(selector);
      if (el) el.value = value == null ? '' : value;
    };

    setValue('#recordTitle', record ? record.title : info.defaultTitle);
    setValue(
      '#recordLocation',
      record
        ? record.location
        : project && project.location !== 'Konum belirtilmedi'
          ? project.location
          : ''
    );
    setValue(
      '#recordLat',
      record && hasCoordinates(record) ? record.lat : project && hasCoordinates(project) ? project.lat : ''
    );
    setValue(
      '#recordLng',
      record && hasCoordinates(record) ? record.lng : project && hasCoordinates(project) ? project.lng : ''
    );
    populateTeamOptions(record ? record.team : '');
    setValue('#recordTeam', record ? record.team : '');
    setValue('#recordPeople', record ? record.people || 1 : '1');
    setValue('#recordMeters', record ? record.meters : '');
    setValue('#recordWidth', record ? record.width : '');
    setValue('#recordDepth', record ? record.depth : '');
    setValue('#recordLength', record ? record.length : '');
    setValue('#recordBucket', record ? record.bucket : '');
    setValue('#recordMachine', record ? record.machine : '');
    setValue(
      '#recordStatus',
      record ? record.status : formType === 'photo' ? 'pending' : 'completed'
    );
    setValue('#recordNote', record ? record.note : '');
    setValue('#recordPhoto', '');
    state.pendingPhoto = record ? record.photo : '';
    state.recordFormType = formType;
    toggleDigFields(formType);

    const preview = $('#recordPhotoPreview');
    const previewImage = $('#recordPhotoImg');
    if (preview) preview.hidden = !state.pendingPhoto;
    if (previewImage) {
      if (state.pendingPhoto) previewImage.src = state.pendingPhoto;
      else previewImage.removeAttribute('src');
    }

    const error = $('#recordFormError');
    if (error) error.hidden = true;

    const title = $('#recordFormTitle');
    const submit = $('#recordFormSubmit');
    if (title) title.textContent = `${info.label} ${record ? 'Güncelle' : 'Ekle'}`;
    if (submit) {
      submit.textContent = isAdmin()
        ? record
          ? 'Değişiklikleri Kaydet'
          : 'Kaydı Ekle'
        : record
          ? 'Güncelle ve Onaya Gönder'
          : 'Onaya Gönder';
    }

    const approvalNote = $('#recordApprovalNote');
    if (approvalNote) approvalNote.hidden = isAdmin();

    if (projectSelect) projectSelect.disabled = false;
    showSheet($('#recordSheet'));
  }

  function openRecordEdit(recordId) {
    const record = state.records.find((item) => item.id === recordId);
    if (!record) {
      toast('Kayıt bulunamadı.');
      return;
    }
    if (!isAdmin() && record.approvalStatus !== 'pending') {
      toast('Onaylanmış veya reddedilmiş kayıtları yalnızca yönetici düzenleyebilir.');
      return;
    }
    openRecordForm(record.type, record.projectId, record);
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

    if (!state.role) {
      showRecordFormError('Kayıt için giriş yapmalısınız.');
      return;
    }

    const value = (selector) => {
      const el = $(selector);
      return el ? cleanText(el.value) : '';
    };

    const project = state.projects.find((item) => item.id === value('#recordProject'));
    if (!project) {
      showRecordFormError('Kayıt için proje seçin.');
      return;
    }

    const coordinates = readCoordinates('#recordLat', '#recordLng');
    if (coordinates.error) {
      showRecordFormError(coordinates.error);
      return;
    }

    const type = RECORD_TYPES[value('#recordType')] ? value('#recordType') : 'work';
    const info = recordTypeInfo(type);
    const status = RECORD_STATUS[value('#recordStatus')] ? value('#recordStatus') : 'completed';
    const title = value('#recordTitle') || info.defaultTitle;
    const width = Math.max(0, decimal($('#recordWidth')?.value, 0));
    const depth = Math.max(0, decimal($('#recordDepth')?.value, 0));
    const length = Math.max(0, decimal($('#recordLength')?.value, 0));
    const bucket = Math.max(0, decimal($('#recordBucket')?.value, 0));

    if (type === 'dig' && (width <= 0 || depth <= 0 || length <= 0)) {
      showRecordFormError('Kazı için kanal genişliği, derinliği ve uzunluğu zorunlu.');
      return;
    }

    const volume = type === 'dig' ? roundVolume(width * depth * length) : 0;
    const editing = state.editingRecordId
      ? state.records.find((item) => item.id === state.editingRecordId)
      : null;

    if (editing && !isAdmin() && editing.approvalStatus !== 'pending') {
      showRecordFormError('Bu kayıt onaylandığı için düzenlenemez.');
      return;
    }

    const approvalStatus = editing
      ? isAdmin()
        ? editing.approvalStatus
        : 'pending'
      : isAdmin()
        ? 'approved'
        : 'pending';
    const reviewedAt =
      approvalStatus === 'approved'
        ? editing?.reviewedAt || new Date().toISOString()
        : '';
    const reviewedBy =
      approvalStatus === 'approved'
        ? editing?.reviewedBy || AUTH_ROLES[state.role]?.name || 'Yönetici'
        : '';

    const record = normalizeRecord(
      {
        id: editing ? editing.id : `record-${Date.now()}`,
        projectId: project.id,
        type,
        title,
        location: value('#recordLocation') || project.location,
        team: value('#recordTeam'),
        people: num($('#recordPeople')?.value, 1),
        meters: type === 'dig' ? 0 : decimal($('#recordMeters')?.value, 0),
        width,
        depth,
        length,
        volume,
        bucket,
        machine: value('#recordMachine'),
        status,
        approvalStatus,
        createdByRole: editing ? editing.createdByRole : state.role,
        createdByName: editing
          ? editing.createdByName
          : AUTH_ROLES[state.role]?.name || 'Kullanıcı',
        reviewedAt,
        reviewedBy,
        note: value('#recordNote'),
        photo: state.pendingPhoto,
        createdAt: editing ? editing.createdAt : new Date().toISOString(),
        lat: coordinates.lat,
        lng: coordinates.lng
      },
      state.records.length
    );

    state.records = editing
      ? state.records.map((item) => (item.id === record.id ? record : item))
      : [record, ...state.records];
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
      toast(`Kayıt ${editing ? 'güncellendi' : 'eklendi'} ancak cihazda yeterli kayıt alanı yok.`);
    } else if (photoDropped) {
      toast(`Kayıt ${editing ? 'güncellendi' : 'eklendi'}; fotoğraf yer kalmadığı için kaydedilmedi.`);
    } else if (record.approvalStatus === 'pending') {
      toast(
        editing
          ? 'Kayıt güncellendi ve yeniden yönetici onayına gönderildi.'
          : 'Kayıt yönetici onayına gönderildi.'
      );
    } else if (type === 'dig') {
      toast(`Kazı kaydı ${editing ? 'güncellendi' : 'eklendi'}: ${formatVolume(record.volume)} m³.`);
    } else {
      toast(`Saha kaydı ${editing ? 'güncellendi' : 'eklendi'}.`);
    }
  }

  /* ---------------- Kayıtlar ---------------- */

  function renderApprovalQueue() {
    const panel = $('#approvalPanel');
    const list = $('#approvalQueue');
    const count = $('#approvalQueueCount');
    if (!panel || !list) return;

    if (!isAdmin()) {
      panel.hidden = true;
      list.innerHTML = '';
      return;
    }

    const projects = new Map(state.projects.map((project) => [project.id, project]));
    const pending = state.records
      .filter((record) => record.approvalStatus === 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    panel.hidden = pending.length === 0;
    if (count) count.textContent = String(pending.length);
    if (!pending.length) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = pending
      .map((record) => {
        const project = projects.get(record.projectId);
        const value =
          record.type === 'dig'
            ? `${formatVolume(record.volume)} m³ kazı`
            : record.type === 'work'
              ? `${formatNumber(record.meters)} m imalat`
              : recordTypeInfo(record.type).label;
        return `
          <div class="approval-item">
            <div class="approval-item-main">
              <strong class="approval-item-title">${esc(record.title)}</strong>
              <div class="approval-item-meta">
                <span><b>${esc(project ? project.title : 'Proje silinmiş')}</b></span>
                <span>${esc(value)}</span>
                <span>${icon('i-users')}${esc(record.createdByName || 'Personel')}</span>
                <span>${esc(formatRecordTime(record))}</span>
              </div>
            </div>
            <div class="approval-actions">
              <button class="btn btn-primary" type="button" data-approve-record="${esc(record.id)}">Onayla</button>
              <button class="btn btn-danger" type="button" data-reject-record="${esc(record.id)}">Reddet</button>
            </div>
          </div>`;
      })
      .join('');
  }

  function reviewRecord(recordId, approvalStatus) {
    if (!isAdmin()) {
      toast('Bu işlem için yönetici girişi gerekli.');
      return;
    }
    if (!APPROVAL_STATUS[approvalStatus]) return;
    const record = state.records.find((item) => item.id === recordId);
    if (!record || record.approvalStatus === approvalStatus) return;

    record.approvalStatus = approvalStatus;
    record.approvalLabel = approvalInfo(approvalStatus).label;
    record.approvalClass = approvalInfo(approvalStatus).className;
    record.reviewedAt = new Date().toISOString();
    record.reviewedBy = AUTH_ROLES[state.role]?.name || 'Yönetici';

    if (approvalStatus === 'approved') {
      applyAutoProgress();
      saveProjects();
    }
    saveRecords();
    renderAll();
    renderRecords();
    markLocalChange();
    toast(
      approvalStatus === 'approved'
        ? 'Kayıt onaylandı ve proje verilerine işlendi.'
        : 'Kayıt reddedildi.'
    );
  }

  function recordCard(record, project) {
    return `
      <button type="button" class="record" data-edit-record="${esc(record.id)}" aria-label="${esc(record.title)} kaydını düzenle">
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
          ${record.type === 'dig' ? `<span class="meta is-volume">${icon('i-excavator')}${formatVolume(record.volume)} m³ · ${formatVolume(record.width)} × ${formatVolume(record.depth)} × ${formatVolume(record.length)} m${record.bucket ? ` · ${formatNumber(record.bucketCount)} kova` : ''}</span>` : ''}
          ${record.machine ? `<span class="meta">${icon('i-excavator')}${esc(record.machine)}</span>` : ''}
        </span>
        <span class="record-side">
          <span class="side-top"><time>${esc(formatRecordTime(record))}</time>${icon('i-chevron', 'chev')}</span>
          <span class="badge ${esc(record.approvalClass)}">${esc(record.approvalLabel)}</span>
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
    renderApprovalQueue();
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

  /* ---------------- Raporlar ---------------- */

  function reportPeriodInfo(period) {
    return REPORT_PERIODS[period] || REPORT_PERIODS['30'];
  }

  function reportStartDate(period) {
    const info = reportPeriodInfo(period);
    if (!info.days) return null;
    const start = startOfDay(new Date());
    start.setDate(start.getDate() - (info.days - 1));
    return start;
  }

  function activeReportProjects() {
    const selected = state.projects.find((project) => project.id === state.reportProject);
    return selected ? [selected] : state.projects;
  }

  function reportRecordsFor(projects, period, approvalStatus = 'approved') {
    const ids = new Set(projects.map((project) => project.id));
    const start = reportStartDate(period);
    return state.records
      .filter((record) => ids.has(record.projectId))
      .filter((record) => !approvalStatus || record.approvalStatus === approvalStatus)
      .filter((record) => !start || new Date(record.createdAt) >= start)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function reportBuckets(period) {
    const today = new Date();

    if (period === 'all') {
      return Array.from({ length: 12 }, (_, index) => {
        const start = new Date(today.getFullYear(), today.getMonth() - (11 - index), 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return {
          start,
          end,
          label: new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(start),
          work: 0,
          dig: 0,
          count: 0
        };
      });
    }

    const step = period === '90' ? 7 : period === '30' ? 3 : 1;
    const count = period === '90' ? 13 : period === '30' ? 10 : 7;
    const start = startOfDay(today);
    start.setDate(start.getDate() - (count * step - 1));

    return Array.from({ length: count }, (_, index) => {
      const bucketStart = new Date(start);
      bucketStart.setDate(bucketStart.getDate() + index * step);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketEnd.getDate() + step);
      return {
        start: bucketStart,
        end: bucketEnd,
        label: new Intl.DateTimeFormat('tr-TR', {
          day: '2-digit',
          month: 'short'
        }).format(bucketStart),
        work: 0,
        dig: 0,
        count: 0
      };
    });
  }

  function buildReportData() {
    const info = reportPeriodInfo(state.reportPeriod);
    const projects = activeReportProjects();
    const records = reportRecordsFor(projects, state.reportPeriod);
    const workRecords = records.filter((record) => record.type === 'work');
    const digRecords = records.filter((record) => record.type === 'dig');
    const pending = reportRecordsFor(projects, state.reportPeriod, 'pending');
    const workMeters = workRecords.reduce((total, record) => total + record.meters, 0);
    const digVolume = roundVolume(
      digRecords.reduce((total, record) => total + record.volume, 0)
    );
    const completedProjects = projects.filter((project) => project.status === 'completed').length;
    const averageProgress = projects.length
      ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
      : 0;

    const typeCounts = Object.keys(RECORD_TYPES).reduce((counts, type) => {
      counts[type] = 0;
      return counts;
    }, {});
    records.forEach((record) => {
      typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
    });

    const trend = reportBuckets(state.reportPeriod);
    records.forEach((record) => {
      const created = new Date(record.createdAt);
      const bucket = trend.find((item) => created >= item.start && created < item.end);
      if (!bucket) return;
      bucket.count += 1;
      if (record.type === 'work') bucket.work += record.meters;
      if (record.type === 'dig') bucket.dig += record.volume;
    });
    const trendWork = trend.reduce((total, bucket) => total + bucket.work, 0);

    const projectRows = projects.map((project) => {
      const projectRecords = records.filter((record) => record.projectId === project.id);
      return {
        ...project,
        reportRecords: projectRecords.length,
        reportWork: projectRecords
          .filter((record) => record.type === 'work')
          .reduce((total, record) => total + record.meters, 0),
        reportDig: roundVolume(
          projectRecords
            .filter((record) => record.type === 'dig')
            .reduce((total, record) => total + record.volume, 0)
        )
      };
    });

    return {
      info,
      projects,
      records,
      workRecords,
      digRecords,
      pending,
      workMeters,
      digVolume,
      completedProjects,
      averageProgress,
      typeCounts,
      trend,
      trendWork,
      trendLabel: state.reportPeriod === 'all' ? 'Son 12 ay' : info.label,
      projectRows
    };
  }

  function renderReportFilters() {
    const wrap = $('#reportFilters');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="report-filters">
        <label class="select-wrap">
          <select id="reportProject" aria-label="Rapor projesi">
            <option value="all">Tüm Projeler</option>
            ${state.projects
              .map(
                (project) =>
                  `<option value="${esc(project.id)}">${esc(project.title)}</option>`
              )
              .join('')}
          </select>
          <span class="select-label" aria-hidden="true">Tüm Projeler</span>
          <svg aria-hidden="true"><use href="#i-chevron-down"/></svg>
        </label>
        <label class="select-wrap">
          <select id="reportPeriod" aria-label="Rapor dönemi">
            ${Object.entries(REPORT_PERIODS)
              .map(([value, info]) => `<option value="${value}">${esc(info.label)}</option>`)
              .join('')}
          </select>
          <span class="select-label" aria-hidden="true">Son 30 gün</span>
          <svg aria-hidden="true"><use href="#i-chevron-down"/></svg>
        </label>
      </div>`;

    const projectSelect = $('#reportProject');
    const periodSelect = $('#reportPeriod');
    if (projectSelect) projectSelect.value = state.reportProject;
    if (periodSelect) periodSelect.value = state.reportPeriod;
    syncSelectLabels();
  }

  function renderReportKpis(data) {
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };
    const setHtml = (selector, value) => {
      const el = $(selector);
      if (el) el.innerHTML = value;
    };

    const donut = $('#reportKpiDonut');
    if (donut) donut.style.setProperty('--p', String(data.averageProgress));
    setText('#reportKpiProgress', `%${data.averageProgress}`);
    setHtml('#reportKpiProjects', `${data.projects.length} <small>proje</small>`);
    setHtml(
      '#reportKpiProgressSub',
      data.projects.length
        ? `${data.completedProjects} tamamlandı · ${data.projects.length - data.completedProjects} devam eden`
        : 'Proje yok'
    );
    setHtml('#reportKpiWork', `${formatNumber(data.workMeters)} <small>m</small>`);
    setHtml(
      '#reportKpiWorkSub',
      data.workRecords.length ? `${data.workRecords.length} imalat kaydı` : 'Kayıt yok'
    );
    setHtml('#reportKpiDig', `${formatVolume(data.digVolume)} <small>m³</small>`);
    setHtml(
      '#reportKpiDigSub',
      data.digRecords.length ? `${data.digRecords.length} kazı kaydı` : 'Kazı yok'
    );
    setHtml('#reportKpiRecords', `${data.records.length} <small>kayıt</small>`);
    setHtml(
      '#reportKpiRecordsSub',
      data.pending.length ? `${data.pending.length} onay bekliyor` : 'Onay bekleyen yok'
    );
  }

  function trendChartHtml(series) {
    const width = 180;
    const height = 86;
    const left = 4;
    const right = 4;
    const top = 8;
    const bottom = 66;
    if (!series.length) return '';

    const max = Math.max(1, ...series.map((item) => item.work));
    const n = series.length;
    const pointX = (index) =>
      n === 1 ? width / 2 : left + (index * (width - left - right)) / (n - 1);
    const pointY = (value) => bottom - (value / max) * (bottom - top);
    const points = series.map((item, index) => ({
      x: pointX(index),
      y: pointY(item.work),
      item
    }));
    const line = points
      .map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${bottom} L ${points[0].x.toFixed(1)} ${bottom} Z`;
    const grid = [0, 0.5, 1]
      .map((ratio) => {
        const y = top + ratio * (bottom - top);
        return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e8eff8" stroke-width="1"/>`;
      })
      .join('');
    const labelIndexes = new Set([0, Math.floor((n - 1) / 2), n - 1]);
    const labels = Array.from(labelIndexes)
      .map((index) => {
        const anchor = index === 0 ? 'start' : index === n - 1 ? 'end' : 'middle';
        return `<text x="${pointX(index).toFixed(1)}" y="80" text-anchor="${anchor}" font-size="6" fill="#7c8ea4">${esc(series[index].label)}</text>`;
      })
      .join('');
    const dots = points
      .map(
        (point) =>
          `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.2" fill="#fff" stroke="#1f6ff0" stroke-width="1.4"><title>${esc(point.item.label)}: ${formatNumber(point.item.work)} m</title></circle>`
      )
      .join('');
    const total = series.reduce((sum, item) => sum + item.work, 0);

    return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="İmalat trendi, toplam ${formatNumber(total)} metre">
      ${grid}
      <path d="${area}" fill="#1f6ff0" opacity="0.1"/>
      <path d="${line}" fill="none" stroke="#1f6ff0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      ${labels}
    </svg>`;
  }

  function renderReportTrend(data) {
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };
    const trendCount = data.trend.reduce((total, bucket) => total + bucket.count, 0);
    setText('#reportTrendRange', data.trendLabel);
    setText(
      '#reportTrendSub',
      `${formatNumber(data.trendWork)} m imalat · ${trendCount} kayıt`
    );
    const chart = $('#reportTrendChart');
    if (chart) chart.innerHTML = trendChartHtml(data.trend);
  }

  function renderReportProjectProgress(data) {
    const setText = (selector, value) => {
      const el = $(selector);
      if (el) el.textContent = value;
    };
    setText('#reportProjectRange', state.reportProject === 'all' ? 'Tümü' : 'Tek proje');
    setText(
      '#reportProjectSub',
      data.projects.length
        ? `${data.projects.length} proje · ortalama %${data.averageProgress}`
        : 'Proje bulunmuyor'
    );

    const wrap = $('#reportProjectProgress');
    if (!wrap) return;
    if (!data.projects.length) {
      wrap.innerHTML = '<p class="report-bars-empty">Proje bulunmuyor.</p>';
      return;
    }

    const visible = data.projects.slice(0, 5);
    wrap.innerHTML =
      visible
        .map(
          (project) => `
          <div class="report-bar-row">
            <div class="report-bar-top">
              <strong>${esc(project.title)}</strong>
              <span>%${esc(project.progress)}</span>
            </div>
            <span class="bar"><i style="width:${project.progress}%"></i></span>
          </div>`
        )
        .join('') +
      (data.projects.length > visible.length
        ? `<p class="report-extra-note">+${data.projects.length - visible.length} proje daha</p>`
        : '');
  }

  function renderReportDonut(data) {
    const total = data.records.length;
    const entries = Object.keys(RECORD_TYPES)
      .map((type) => ({ type, count: data.typeCounts[type] || 0 }))
      .filter((entry) => entry.count > 0);
    const donut = $('#reportTypeDonut');
    const totalEl = $('#reportTypeTotal');
    const legend = $('#reportTypeLegend');

    if (totalEl) totalEl.textContent = String(total);
    if (donut) {
      if (!total) {
        donut.style.background = '#e8eff8';
      } else {
        let cursor = 0;
        const segments = entries.map((entry, index) => {
          const start = cursor;
          cursor += (entry.count / total) * 100;
          const end = index === entries.length - 1 ? 100 : cursor;
          return `${REPORT_TYPE_COLORS[entry.type]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        });
        donut.style.background = `conic-gradient(${segments.join(', ')})`;
      }
    }
    if (legend) {
      legend.innerHTML = entries.length
        ? entries
            .map(
              (entry) =>
                `<li><i class="dot" style="background:${REPORT_TYPE_COLORS[entry.type]}"></i><span>${esc(recordTypeInfo(entry.type).label)}</span><b>${entry.count}</b></li>`
            )
            .join('')
        : '<li class="report-empty-line">Kayıt yok</li>';
    }
  }

  function renderReportPending(data) {
    const list = $('#reportPendingList');
    const count = $('#reportPendingCount');
    if (count) count.textContent = String(data.pending.length);
    if (!list) return;

    if (!data.pending.length) {
      list.innerHTML = '<p class="report-empty-line">Onay bekleyen kayıt yok.</p>';
      return;
    }

    const visible = data.pending.slice(0, 3);
    list.innerHTML =
      visible
        .map((record) => {
          const info = recordTypeInfo(record.type);
          return `<button type="button" data-edit-record="${esc(record.id)}" aria-label="${esc(record.title)} kaydını düzenle">
            <span class="appr-icon tone-${esc(info.tone)}">${icon(info.icon)}</span>
            <span class="pending-title">${esc(record.title)}</span>
            ${icon('i-chevron', 'chev')}
          </button>`;
        })
        .join('') +
      (data.pending.length > visible.length
        ? `<p class="report-extra-note">+${data.pending.length - visible.length} kayıt daha</p>`
        : '');
  }

  function renderReportProjectRows(data) {
    const wrap = $('#reportProjectRows');
    const count = $('#reportProjectCount');
    if (count) count.textContent = `${data.projectRows.length} proje`;
    if (!wrap) return;

    if (!data.projectRows.length) {
      wrap.innerHTML = '<p class="report-empty-line">Proje bulunmuyor.</p>';
      return;
    }

    wrap.innerHTML = data.projectRows
      .map(
        (project) => `
        <button type="button" class="report-project-row" data-project-id="${esc(project.id)}" aria-label="${esc(project.title)} proje detayını aç">
          <span class="report-project-title">${esc(project.title)}</span>
          <span class="badge ${esc(project.status)}">${esc(project.statusLabel)}</span>
          <div class="report-project-metrics">
            <span>${icon('i-records')}<b>${project.reportRecords}</b> kayıt</span>
            <span>${icon('i-crosshair')}<b>${formatNumber(project.reportWork)}</b> m</span>
            <span>${icon('i-excavator')}<b>${formatVolume(project.reportDig)}</b> m³</span>
          </div>
          <div class="report-project-progress">
            <span class="bar"><i style="width:${project.progress}%"></i></span>
            <b>%${esc(project.progress)}</b>
          </div>
        </button>`
      )
      .join('');
  }

  function renderReports() {
    const empty = $('#reportsEmpty');
    const content = $('#reportsContent');
    const filters = $('#reportFilters');
    if (!empty || !content) return;

    if (!REPORT_PERIODS[state.reportPeriod]) state.reportPeriod = '30';
    if (
      state.reportProject !== 'all' &&
      !state.projects.some((project) => project.id === state.reportProject)
    ) {
      state.reportProject = 'all';
    }

    const hasData = state.projects.length > 0 || state.records.length > 0;
    empty.hidden = hasData;
    content.hidden = !hasData;
    if (!hasData) {
      if (filters) filters.innerHTML = '';
      return;
    }

    renderReportFilters();
    const data = buildReportData();
    const projectLabel =
      state.reportProject === 'all'
        ? 'Tüm Projeler'
        : state.projects.find((project) => project.id === state.reportProject)?.title || 'Tüm Projeler';
    const summary = $('#reportSummary');
    if (summary) {
      summary.textContent = `${data.info.label} · ${projectLabel} · ${data.records.length} kayıt`;
    }

    renderReportKpis(data);
    renderReportTrend(data);
    renderReportProjectProgress(data);
    renderReportDonut(data);
    renderReportPending(data);
    renderReportProjectRows(data);
  }

  function formatReportDate(value, withTime = false) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    }).format(date);
  }

  function csvCell(value) {
    return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  }

  function downloadReportCsv() {
    if (!isAdmin()) {
      toast('Rapor dışa aktarma yalnızca yönetici yetkisindedir.');
      return;
    }
    if (!state.projects.length && !state.records.length) {
      toast('Dışa aktarılacak rapor verisi yok.');
      return;
    }

    const data = buildReportData();
    const projectLabel =
      state.reportProject === 'all'
        ? 'Tüm Projeler'
        : state.projects.find((project) => project.id === state.reportProject)?.title || 'Tüm Projeler';
    const projectNames = new Map(state.projects.map((project) => [project.id, project.title]));
    const rows = [
      ['AltyapıPro Raporu'],
      ['Oluşturma', formatReportDate(new Date(), true)],
      ['Dönem', data.info.label],
      ['Proje', projectLabel],
      [],
      ['Özet'],
      ['Proje Sayısı', data.projects.length],
      ['Saha Kaydı', data.records.length],
      ['Toplam İmalat (m)', data.workMeters],
      ['Toplam Kazı (m³)', data.digVolume],
      ['Onay Bekleyen', data.pending.length],
      [],
      ['Projeler'],
      ['Proje', 'İl', 'İlçe', 'Tür', 'Durum', 'İlerleme (%)', 'Kayıt', 'İmalat (m)', 'Kazı (m³)'],
      ...data.projectRows.map((project) => [
        project.title,
        project.province,
        project.district,
        project.type,
        project.statusLabel,
        project.progress,
        project.reportRecords,
        project.reportWork,
        project.reportDig
      ]),
      [],
      ['Saha Kayıtları'],
      ['Tarih', 'Proje', 'Tür', 'Başlık', 'Konum', 'Ekip', 'Kişi', 'İmalat (m)', 'Kazı (m³)', 'Durum', 'Not'],
      ...data.records.map((record) => [
        formatReportDate(record.createdAt, true),
        projectNames.get(record.projectId) || 'Proje silinmiş',
        recordTypeInfo(record.type).label,
        record.title,
        record.location,
        record.team,
        record.people,
        record.meters,
        record.volume,
        record.statusLabel,
        record.note
      ])
    ];
    const csv = `\ufeff${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const filename = `altyapipro-rapor-${new Date().toISOString().slice(0, 10)}.csv`;

    try {
      const blob = new window.Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const objectUrl =
        window.URL && typeof window.URL.createObjectURL === 'function'
          ? window.URL.createObjectURL(blob)
          : '';
      link.href = objectUrl || `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (objectUrl && window.URL && typeof window.URL.revokeObjectURL === 'function') {
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      }
      toast('Rapor CSV olarak dışa aktarıldı.');
    } catch (error) {
      toast('Rapor dışa aktarılamadı.');
    }
  }

  const reportFilterWrap = $('#reportFilters');
  if (reportFilterWrap) {
    reportFilterWrap.addEventListener('change', (event) => {
      const select = event.target.closest('select');
      if (!select) return;
      if (select.id === 'reportProject') state.reportProject = select.value || 'all';
      if (select.id === 'reportPeriod') state.reportPeriod = select.value || '30';
      renderReports();
    });
  }

  const reportExportBtn = $('#reportExportBtn');
  if (reportExportBtn) reportExportBtn.addEventListener('click', downloadReportCsv);

  /* ---------------- Harita etkileşimleri ---------------- */

  const branchGroup = $('#branchFilters');
  if (branchGroup) {
    branchGroup.addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (!chip) return;
      setMapBranch(chip.dataset.branch || 'all');
    });
  }

  const mapProjectGroup = $('#mapProjectFilters');
  if (mapProjectGroup) {
    mapProjectGroup.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-map-project]');
      if (!chip) return;
      setMapProject(chip.dataset.mapProject || 'all');
    });
  }

  const nearbyGroup = $('.nearby-grid');
  if (nearbyGroup) {
    nearbyGroup.addEventListener('click', (event) => {
      const button = event.target.closest('[data-nearby-branch]');
      if (!button) return;
      const branch = button.dataset.nearbyBranch;
      setMapBranch(state.mapBranch === branch ? 'all' : branch);
    });
  }

  const mapSearch = $('#mapSearch');
  if (mapSearch) {
    mapSearch.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      runMapSearch(mapSearch.value);
    });
    mapSearch.addEventListener('search', () => {
      if (!mapSearch.value) {
        if (searchMarker && mapInstance) mapInstance.removeLayer(searchMarker);
        searchMarker = null;
      }
    });
  }

  const mapFitBtn = $('#mapFitBtn');
  if (mapFitBtn) {
    mapFitBtn.addEventListener('click', () => {
      ensureMap();
      if (mapInstance) fitMapToData();
    });
  }

  const mapFitToolBtn = $('#mapFitToolBtn');
  if (mapFitToolBtn) {
    mapFitToolBtn.addEventListener('click', () => {
      ensureMap();
      if (mapInstance) fitMapToData();
    });
  }

  const mapLocateBtn = $('#mapLocateBtn');
  if (mapLocateBtn) {
    mapLocateBtn.addEventListener('click', async () => {
      ensureMap();
      mapLocateBtn.disabled = true;
      try {
        await requestLocation({ fly: true });
      } catch (error) {
        /* toast is handled by requestLocation */
      } finally {
        mapLocateBtn.disabled = false;
      }
    });
  }

  const mapLayersBtn = $('#mapLayersBtn');
  if (mapLayersBtn) {
    mapLayersBtn.addEventListener('click', () => {
      ensureMap();
      setBaseLayer(!state.mapSatellite);
    });
  }

  const mapSatelliteBtn = $('#mapSatelliteBtn');
  if (mapSatelliteBtn) {
    mapSatelliteBtn.addEventListener('click', () => {
      ensureMap();
      setBaseLayer(!state.mapSatellite);
    });
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

    const emptyMap = event.target.closest('[data-empty-map-project]');
    if (emptyMap) {
      event.preventDefault();
      if (state.mapProjectId !== 'all') {
        openProjectForm(state.mapProjectId);
      } else if (!state.projects.length) {
        openProjectForm();
      } else {
        window.location.hash = '#projects';
      }
      return;
    }

    const approveRecord = event.target.closest('[data-approve-record]');
    if (approveRecord) {
      event.preventDefault();
      reviewRecord(approveRecord.dataset.approveRecord, 'approved');
      return;
    }

    const rejectRecord = event.target.closest('[data-reject-record]');
    if (rejectRecord) {
      event.preventDefault();
      const record = state.records.find((item) => item.id === rejectRecord.dataset.rejectRecord);
      if (!record) return;
      openConfirm({
        title: 'Kaydı reddet',
        text: `"${record.title}" kaydı reddedilecek ve proje verilerine işlenmeyecek.`,
        confirmLabel: 'Reddet',
        danger: true,
        onConfirm: () => reviewRecord(record.id, 'rejected')
      });
      return;
    }

    const showMap = event.target.closest('[data-show-map]');
    if (showMap) {
      event.preventDefault();
      const projectId = showMap.dataset.showMap;
      hideSheet($('#projectSheet'));
      if (window.location.hash === '#map') setScreen('map');
      else window.location.hash = '#map';
      window.setTimeout(() => focusProjectOnMap(projectId), 140);
      return;
    }

    const editRecord = event.target.closest('[data-edit-record]');
    if (editRecord) {
      event.preventDefault();
      openRecordEdit(editRecord.dataset.editRecord);
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
    const editRecord = event.target.closest('[data-edit-record]');
    if (editRecord && editRecord.tagName !== 'BUTTON' && editRecord.tagName !== 'A') {
      event.preventDefault();
      openRecordEdit(editRecord.dataset.editRecord);
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

  const projectProvince = $('#projectProvince');
  if (projectProvince) {
    projectProvince.addEventListener('change', () => {
      syncProjectDistrictOptions();
      const error = $('#projectFormError');
      if (error) error.hidden = true;
    });
  }

  const projectForm = $('#projectForm');
  if (projectForm) projectForm.addEventListener('submit', handleProjectSubmit);

  const recordType = $('#recordType');
  if (recordType) {
    recordType.addEventListener('change', () => setRecordTypeDefaults(recordType.value));
  }

  const recordTeamSelect = $('#recordTeamSelect');
  if (recordTeamSelect) {
    recordTeamSelect.addEventListener('change', () => {
      const teamInput = $('#recordTeam');
      if (!teamInput) return;
      if (recordTeamSelect.value) {
        teamInput.value = recordTeamSelect.value;
      } else {
        teamInput.value = '';
        teamInput.focus();
      }
    });
  }

  const recordTeamInput = $('#recordTeam');
  if (recordTeamInput && recordTeamSelect) {
    recordTeamInput.addEventListener('input', () => {
      if (recordTeamSelect.value && recordTeamSelect.value !== recordTeamInput.value.trim()) {
        recordTeamSelect.value = '';
      }
    });
  }

  ['#recordWidth', '#recordDepth', '#recordLength', '#recordBucket'].forEach((selector) => {
    const input = $(selector);
    if (input) {
      input.addEventListener('input', updateDigPreview);
      input.addEventListener('change', updateDigPreview);
    }
  });

  const recordProject = $('#recordProject');
  if (recordProject) {
    recordProject.addEventListener('change', () => {
      const project = state.projects.find((item) => item.id === recordProject.value);
      const location = $('#recordLocation');
      if (project && location && !location.value.trim()) location.value = project.location;
      if (project && hasCoordinates(project)) {
        const lat = $('#recordLat');
        const lng = $('#recordLng');
        if (lat && !lat.value.trim()) lat.value = project.lat;
        if (lng && !lng.value.trim()) lng.value = project.lng;
      }
    });
  }

  const projectUseLocation = $('#projectUseLocation');
  if (projectUseLocation) {
    projectUseLocation.addEventListener('click', async () => {
      projectUseLocation.disabled = true;
      try {
        const location = await requestLocation({ fly: false });
        const lat = $('#projectLat');
        const lng = $('#projectLng');
        if (lat) lat.value = location.lat;
        if (lng) lng.value = location.lng;
      } catch (error) {
        /* toast is handled by requestLocation */
      } finally {
        projectUseLocation.disabled = false;
      }
    });
  }

  const recordUseLocation = $('#recordUseLocation');
  if (recordUseLocation) {
    recordUseLocation.addEventListener('click', async () => {
      recordUseLocation.disabled = true;
      try {
        const location = await requestLocation({ fly: false });
        const lat = $('#recordLat');
        const lng = $('#recordLng');
        if (lat) lat.value = location.lat;
        if (lng) lng.value = location.lng;
      } catch (error) {
        /* toast is handled by requestLocation */
      } finally {
        recordUseLocation.disabled = false;
      }
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

  const authRoleGrid = $('#authRoleGrid');
  if (authRoleGrid) {
    authRoleGrid.addEventListener('click', (event) => {
      const roleButton = event.target.closest('[data-auth-role]');
      if (roleButton) showAuthPinForm(roleButton.dataset.authRole);
    });
  }

  const authPinForm = $('#authPinForm');
  if (authPinForm) authPinForm.addEventListener('submit', handleAuthSubmit);

  const authBack = $('[data-auth-back]');
  if (authBack) authBack.addEventListener('click', showAuthRoleChoices);

  const authPin = $('#authPin');
  if (authPin) {
    authPin.addEventListener('input', () => {
      authPin.value = authPin.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  const profileBtn = $('#profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      if (!state.role) {
        showAuthScreen(true);
        return;
      }
      openConfirm({
        title: 'Oturumu kapat',
        text: `${AUTH_ROLES[state.role].label} oturumu kapatılacak. Devam etmek için yeniden giriş yapmanız gerekir.`,
        confirmLabel: 'Çıkış Yap',
        danger: true,
        onConfirm: logout
      });
    });
  }

  /* ---------------- Giriş ve rol yetkileri ---------------- */

  function showAuthRoleChoices() {
    state.authRole = null;
    const grid = $('#authRoleGrid');
    const form = $('#authPinForm');
    const error = $('#authPinError');
    const pin = $('#authPin');
    if (grid) grid.hidden = false;
    if (form) form.hidden = true;
    if (error) error.hidden = true;
    if (pin) pin.value = '';
  }

  function showAuthPinForm(role) {
    if (!AUTH_ROLES[role]) return;
    state.authRole = role;
    const info = AUTH_ROLES[role];
    const grid = $('#authRoleGrid');
    const form = $('#authPinForm');
    const title = $('#authPinTitle');
    const hint = $('#authPinHint');
    const error = $('#authPinError');
    const pin = $('#authPin');
    if (grid) grid.hidden = true;
    if (form) form.hidden = false;
    if (title) title.textContent = info.title;
    if (hint) hint.textContent = info.hint;
    if (error) error.hidden = true;
    if (pin) {
      pin.value = '';
      window.setTimeout(() => pin.focus(), 20);
    }
  }

  function showAuthScreen(visible) {
    const screen = $('#authScreen');
    if (!screen) return;
    screen.hidden = !visible;
    document.body.classList.toggle('auth-locked', visible);
    if (visible) showAuthRoleChoices();
  }

  function applyRolePermissions() {
    const info = AUTH_ROLES[state.role];
    document.body.dataset.role = state.role || '';
    $$('[data-admin-only]').forEach((element) => {
      element.hidden = !isAdmin();
    });
    const profile = $('#profileBtn');
    if (profile) {
      profile.textContent = info ? info.label.charAt(0) : '?';
      profile.setAttribute(
        'aria-label',
        info ? `${info.label} hesabı ve çıkış` : 'Giriş yap'
      );
      profile.title = info ? `${info.label} · Çıkış` : 'Giriş yap';
    }
  }

  function loginAs(role) {
    if (!AUTH_ROLES[role]) return;
    state.role = role;
    state.authRole = null;
    saveSessionRole(role);
    showAuthScreen(false);
    applyRolePermissions();
    renderAll();
    renderRecords();
    toast(`${AUTH_ROLES[role].label} olarak giriş yapıldı.`);
  }

  function logout() {
    state.role = null;
    state.authRole = null;
    clearSessionRole();
    closeAllSheets();
    applyRolePermissions();
    showAuthScreen(true);
  }

  function handleAuthSubmit(event) {
    event.preventDefault();
    const role = state.authRole;
    if (!AUTH_ROLES[role]) {
      showAuthRoleChoices();
      return;
    }
    const pinInput = $('#authPin');
    const error = $('#authPinError');
    const pin = pinInput ? pinInput.value.trim() : '';
    if (!/^\d{4}$/.test(pin)) {
      if (error) {
        error.textContent = 'PIN kodu 4 haneli olmalı.';
        error.hidden = false;
      }
      pinInput?.focus();
      return;
    }
    if (pin !== AUTH_ROLES[role].pin) {
      if (error) {
        error.textContent = 'PIN kodu hatalı. Tekrar deneyin.';
        error.hidden = false;
      }
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
      return;
    }
    loginAs(role);
  }

  /* ---------------- Başlangıç ---------------- */

  function renderAll() {
    syncProvinceOptions();
    renderHome();
    renderProjects();
    syncSelectLabels();
    renderMapProjects();
    refreshMapForData();
    renderMapActive(selectedMapProject() || currentFeaturedProject());
    renderReports();
  }

  currentLocation = loadStoredLocation();
  state.role = loadSessionRole();
  state.projects = loadProjects();
  state.records = loadRecords();
  if (applyAutoProgress()) saveProjects();
  applyRolePermissions();
  showAuthScreen(!state.role);
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
