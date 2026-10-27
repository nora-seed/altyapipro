/* ============================================================
   AltyapıPro — PWA istemci mantığı
   Adım 1: ekran yönlendirme, filtreler, PWA kaydı
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const data = window.APP_DATA || { projects: [], records: [] };

  const state = {
    projectStatus: 'all',
    projectType: 'all',
    projectQuery: '',
    recordType: 'all',
    recordQuery: ''
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

  /* ---------------- Projeler ---------------- */

  function projectCard(project) {
    return `
      <article class="project-card">
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
          <span class="bar"><i style="width:${Number(project.progress) || 0}%"></i></span>
          <b>%${esc(project.progress)}</b>
        </div>
        <div class="project-stats">
          <span>${icon('i-crosshair')}<span><b>${esc(project.length)} <small>/ ${esc(project.total)}</small></b><small>Hat Uzunluğu</small></span></span>
          <span>${icon('i-users')}<span><b>${esc(project.personnel)}</b><small>Personel</small></span></span>
          <span>${icon('i-calendar')}<span><b>${esc(project.days)} gün</b><small>Kalan Süre</small></span></span>
        </div>
      </article>`;
  }

  function renderProjects() {
    const list = $('#projectList');
    const empty = $('#projectEmpty');
    if (!list) return;

    const query = normalize(state.projectQuery.trim());

    const visible = data.projects.filter((project) => {
      const statusOk = state.projectStatus === 'all' || project.status === state.projectStatus;
      const typeOk = state.projectType === 'all' || project.type === state.projectType;
      const queryOk =
        !query ||
        normalize(project.title).includes(query) ||
        normalize(project.location).includes(query) ||
        normalize(project.type).includes(query);
      return statusOk && typeOk && queryOk;
    });

    list.innerHTML = visible.map(projectCard).join('');
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

  /* ---------------- Yakında gelecek işlemler ---------------- */

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('is-show'), 2200);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-soon]');
    if (!target) return;
    event.preventDefault();
    toast('Bu işlem sonraki adımda etkinleşecek.');
  });

  /* ---------------- Başlangıç ---------------- */

  renderProjects();
  renderRecords();
  syncFromHash();

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
