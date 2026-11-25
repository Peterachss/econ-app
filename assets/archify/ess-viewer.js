(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.initEssDiagram = function (cfg) {
    var root = document.documentElement;
    if (!root.getAttribute('data-theme')) root.setAttribute('data-theme', 'light');
    if (!root.getAttribute('data-motion')) root.setAttribute('data-motion', 'live');

    var curView = cfg.defaultView || 'v1';
    var z = 1, tx = 0, ty = 0;

    function activeSvg() {
      var list = document.querySelectorAll('.esvg');
      for (var i = 0; i < list.length; i++) {
        if (!list[i].hasAttribute('hidden')) return list[i];
      }
      return list[0] || null;
    }

    function applyTransform() {
      var svg = activeSvg();
      if (!svg) return;
      var vp = svg.querySelector('.vp');
      if (vp) {
        vp.setAttribute('transform', 'translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ') scale(' + z.toFixed(3) + ')');
      }
      var zl = document.getElementById('z-lbl');
      if (zl) zl.textContent = Math.round(z * 100) + '%';
    }

    function resetView() {
      z = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    }

    function showTip(key) {
      var svg = activeSvg();
      if (svg) {
        svg.querySelectorAll('[data-tip]').forEach(function (el) {
          el.classList.toggle('sel', el.getAttribute('data-tip') === key);
        });
      }
      var info = (cfg.tips && cfg.tips[key]) || null;
      var el = document.getElementById('insp');
      if (!el || !info) return;
      el.innerHTML =
        '<div class="insp-main">' +
        '<div class="insp-top">' +
        (info.code ? '<span class="insp-code">' + esc(info.code) + '</span>' : '') +
        '<span class="insp-title">' + esc(info.title) + '</span>' +
        '</div>' +
        '<p class="insp-body">' + esc(info.body) + '</p>' +
        '</div>' +
        (info.exam ? '<div class="insp-exam"><b>SL Exam Tip:</b> ' + esc(info.exam) + '</div>' : '');
    }

    function switchView(v) {
      curView = v;
      document.querySelectorAll('[data-vtab]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-vtab') === v);
      });
      document.querySelectorAll('.esvg').forEach(function (s) {
        if (s.getAttribute('data-view') === v) s.removeAttribute('hidden');
        else s.setAttribute('hidden', '');
      });
      document.querySelectorAll('.ctrl-bar[data-forview]').forEach(function (c) {
        var allowed = c.getAttribute('data-forview').split(/\s+/);
        if (allowed.indexOf(v) >= 0) c.removeAttribute('hidden');
        else c.setAttribute('hidden', '');
      });
      resetView();
      var defKey = (cfg.viewDefaults && cfg.viewDefaults[v]) || cfg.defaultTip;
      if (defKey) showTip(defKey);
      if (typeof cfg.onViewChange === 'function') cfg.onViewChange(v);
    }

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var vt = t.closest('[data-vtab]');
      if (vt) { switchView(vt.getAttribute('data-vtab')); return; }

      var th = t.closest('#btn-theme');
      if (th) {
        var dark = root.getAttribute('data-theme') === 'dark';
        root.setAttribute('data-theme', dark ? 'light' : 'dark');
        th.setAttribute('aria-pressed', dark ? 'false' : 'true');
        th.textContent = dark ? 'Dark' : 'Light';
        return;
      }

      var mt = t.closest('#btn-motion');
      if (mt) {
        var still = root.getAttribute('data-motion') === 'still';
        root.setAttribute('data-motion', still ? 'live' : 'still');
        mt.setAttribute('aria-pressed', still ? 'true' : 'false');
        mt.textContent = still ? 'Live' : 'Still';
        return;
      }

      var ex = t.closest('#btn-export');
      if (ex) {
        var svg = activeSvg();
        if (!svg) return;
        var clone = svg.cloneNode(true);
        clone.removeAttribute('hidden');
        var cs = getComputedStyle(root);
        var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent =
          'svg{background:' + cs.getPropertyValue('--bg') + ';font-family:system-ui,sans-serif}' +
          ':root{--bg:' + cs.getPropertyValue('--bg') + ';--surface:' + cs.getPropertyValue('--surface') + ';--warm:' + cs.getPropertyValue('--warm') + ';--ink:' + cs.getPropertyValue('--ink') + ';--muted:' + cs.getPropertyValue('--muted') + ';--line:' + cs.getPropertyValue('--line') + ';--accent:' + cs.getPropertyValue('--accent') + ';--accent2:' + cs.getPropertyValue('--accent2') + ';--amber:' + cs.getPropertyValue('--amber') + ';--amber-bg:' + cs.getPropertyValue('--amber-bg') + ';--blue:' + cs.getPropertyValue('--blue') + ';--blue-bg:' + cs.getPropertyValue('--blue-bg') + ';--red:' + cs.getPropertyValue('--red') + ';--red-bg:' + cs.getPropertyValue('--red-bg') + ';--green-bg:' + cs.getPropertyValue('--green-bg') + '}';
        clone.insertBefore(style, clone.firstChild);
        var blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (cfg.slug || 'ess-diagram') + '-' + curView + '.svg';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        return;
      }

      if (t.closest('#z-in')) { z = Math.min(2.4, z * 1.18); applyTransform(); return; }
      if (t.closest('#z-out')) { z = Math.max(0.65, z / 1.18); applyTransform(); return; }
      if (t.closest('#z-fit')) { resetView(); return; }

      var tipEl = t.closest('[data-tip]');
      if (tipEl) { showTip(tipEl.getAttribute('data-tip')); return; }
    });

    var stage = document.getElementById('stage');
    var dragging = false, sx = 0, sy = 0, stx = 0, sty = 0, moved = false;
    if (stage) {
      stage.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button,input,select')) return;
        dragging = true; moved = false; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
        stage.classList.add('grabbing');
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        if (!moved) return;
        tx = stx + dx; ty = sty + dy;
        applyTransform();
      });
      window.addEventListener('pointerup', function () {
        if (!dragging) return;
        dragging = false;
        stage.classList.remove('grabbing');
      });
      stage.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        z = Math.min(2.4, Math.max(0.65, z * (e.deltaY < 0 ? 1.1 : 0.91)));
        applyTransform();
      }, { passive: false });
    }

    switchView(curView);
    return { showTip: showTip, resetView: resetView, activeSvg: activeSvg };
  };
})();
