(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia("(max-width: 768px)").matches;

  /* ------------------------------------------------------------------
   * 0. LANGUAGE (ES / EN)
   * ------------------------------------------------------------------ */
  var T = {
    en: {
      skip: "Skip to the wineries", nav_wineries: "Wineries", nav_map: "Map", nav_about: "About", nav_contact: "Contact", nav_catalog: "Wines", nav_login: "Login",
      h1: "Boutique wines from Mendoza, bought direct from the winery.", h1_sub: "A reservation service for UK restaurants and importers.",
      cta_browse: "Browse the wineries", cta_access: "Request access", hint: "Scroll to fly over Mendoza",
      c2_h: "Small estates, chosen on the ground.", c2_p: "Every winery on the list is independent and family scale. We select them in Mendoza, so the list stays short and the bottles stay specific.",
      c3_h: "Reserve online. The winery ships.", s1_t: "Choose", s1_d: "Browse wineries by region and grape.", s2_t: "Reserve", s2_d: "A reservation secures your allocation.", s3_t: "Receive", s3_d: "The winery invoices the balance and ships to you.",
      c4_h: "From the foothills of the Andes to your cellar door.", c4_p: "Four regions, one list. Pick a region on the map below.",
      w_title: "The wineries", w_intro: "Select a region on the map, search by name, or filter by grape. Open a winery to see what it offers.",
      w_search_label: "Search wineries", w_search: "Search by winery or grape", w_empty: "No winery matches those filters. Clear a filter to see the full list.",
      all_regions: "All regions", all_grapes: "All grapes", one: "winery", many: "wineries", in_: " in ", ask: "Ask about this winery", ask_msg: "I would like to know more about {n}.", sample: "Sample",
      m_sat: "Satellite", m_street: "Streets", m_aria: "Map of the wineries",
      a_h: "A shorter route between the winery and the glass.", a_lede: "Mendoza Reserve is a boutique wine broker. We connect independent Mendoza wineries with UK restaurants and importers who want wines they cannot find through the usual distribution.",
      a1_t: "Direct from the estate", a1_d: "Each order goes to the winery that made the wine. The winery invoices the balance and arranges shipping.",
      a2_t: "A curated list", a2_d: "Wineries join after we contact them and confirm their participation, so every entry on the list is active.",
      a3_t: "One point of contact", a3_d: "Questions on allocation, availability or logistics come to us, in English, on UK time.",
      k_h: "Request trade access", k_p: "Tell us what you are looking for. We reply within one working day with the wineries that fit.",
      k_name: "Name", k_company: "Business", k_email: "Email", k_msg: "What are you looking for?", k_ph: "Grapes, regions, volumes, timing", k_send: "Send request",
      k_invalid: "Complete the highlighted fields: name, business and a valid email.", k_sending: "Sending…", k_ok: "Request sent. We reply within one working day.",
      k_fail: "The request did not send. Check your connection and try again, or email {m}.", k_mail: "Your email app should open with the request ready. If it does not, write to {m}.",
      f_desc: "Independent boutique wineries from Mendoza, direct to the UK market.", f_uk: "Sales, United Kingdom", f_ar: "Sales, Argentina (Mendoza)",
      f_rights: "© 2026 Mendoza Reserve — Boutique Wine Selections. All rights reserved.", f_owner: "Mendoza Reserve is a brand owned and managed by Puma Code.",
      f_dev: "Design and development by", f_collab: "In collaboration with Aquila Aerial", f_credit: "Aerial footage © 2026 Aquila Aerial. All rights reserved. Used with permission."
    },
    es: {
      skip: "Saltar a las bodegas", nav_wineries: "Bodegas", nav_map: "Mapa", nav_about: "Historia", nav_contact: "Contacto", nav_catalog: "Vinos", nav_login: "Ingresar",
      h1: "Vinos boutique de Mendoza, directo desde la bodega.", h1_sub: "Un servicio de reserva para restaurantes e importadores del Reino Unido.",
      cta_browse: "Conocer bodegas", cta_access: "Solicitar acceso", hint: "Desplaza para sobrevolar Mendoza",
      c2_h: "Bodegas pequeñas, elegidas en el lugar.", c2_p: "Cada bodega de la lista es independiente y de escala familiar. Las seleccionamos en Mendoza, así la lista es corta y cada botella tiene identidad.",
      c3_h: "Reserva online. La bodega envía.", s1_t: "Elegir", s1_d: "Explora las bodegas por región y por uva.", s2_t: "Reservar", s2_d: "Una reserva asegura tu asignación.", s3_t: "Recibir", s3_d: "La bodega factura el saldo y te lo envía.",
      c4_h: "Desde las faldas de los Andes hasta tu bodega.", c4_p: "Cuatro regiones, una sola lista. Elige una región en el mapa.",
      w_title: "Las bodegas", w_intro: "Elige una región en el mapa, busca por nombre o filtra por uva. Abre una bodega para ver lo que ofrece.",
      w_search_label: "Buscar bodegas", w_search: "Buscar por bodega o uva", w_empty: "Ninguna bodega coincide con esos filtros. Quita un filtro para ver la lista completa.",
      all_regions: "Todas las regiones", all_grapes: "Todas las uvas", one: "bodega", many: "bodegas", in_: " en ", ask: "Consultar por esta bodega", ask_msg: "Quisiera saber más sobre {n}.", sample: "Muestra",
      m_sat: "Satelital", m_street: "Calles", m_aria: "Mapa de las bodegas",
      a_h: "Un camino más corto entre la bodega y la copa.", a_lede: "Mendoza Reserve es un broker de vinos boutique. Conectamos bodegas independientes de Mendoza con restaurantes e importadores del Reino Unido que buscan vinos que no encuentran en la distribución habitual.",
      a1_t: "Directo desde la finca", a1_d: "Cada pedido va a la bodega que hizo el vino. La bodega factura el saldo y organiza el envío.",
      a2_t: "Una lista curada", a2_d: "Las bodegas se suman después de que las contactamos y confirman su participación, así que cada una de la lista está activa.",
      a3_t: "Un solo contacto", a3_d: "Las consultas sobre asignación, disponibilidad o logística llegan a nosotros, en inglés y en horario del Reino Unido.",
      k_h: "Solicitar acceso profesional", k_p: "Cuéntanos qué buscas. Respondemos en un día hábil con las bodegas que encajan.",
      k_name: "Nombre", k_company: "Empresa", k_email: "Email", k_msg: "¿Qué estás buscando?", k_ph: "Uvas, regiones, volúmenes, plazos", k_send: "Enviar solicitud",
      k_invalid: "Completa los campos marcados: nombre, empresa y un email válido.", k_sending: "Enviando…", k_ok: "Solicitud enviada. Respondemos en un día hábil.",
      k_fail: "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo, o escribe a {m}.", k_mail: "Se abrirá tu app de correo con la solicitud lista. Si no se abre, escribe a {m}.",
      f_desc: "Bodegas boutique independientes de Mendoza, directo al mercado británico.", f_uk: "Ventas — Reino Unido", f_ar: "Ventas — Argentina (Mendoza)",
      f_rights: "© 2026 Mendoza Reserve — Boutique Wine Selections. Todos los derechos reservados.", f_owner: "Mendoza Reserve es una marca propiedad de, y administrada por, Puma Code.",
      f_dev: "Diseño y desarrollo por", f_collab: "En colaboración con Aquila Aerial", f_credit: "Video aéreo © 2026 Aquila Aerial. Todos los derechos reservados. Usado con autorización."
    }
  };
  var lang = "en";
  try { lang = localStorage.getItem("mr_lang") || ""; } catch (e) {}
  if (lang !== "es" && lang !== "en") lang = /^es/i.test(navigator.language || "") ? "es" : "en";
  var t = function (k, v) { var s = (T[lang] && T[lang][k]) || T.en[k] || k; if (v) for (var n in v) s = s.replace("{" + n + "}", v[n]); return s; };

  /* ------------------------------------------------------------------
   * 1. FILM: scroll position scrubs a sequence of aerial frames
   * ------------------------------------------------------------------ */
  var film = $("#film"), canvas = $("#filmCanvas"), ctx = canvas.getContext("2d", { alpha: false });
  var TOTAL = mobile ? 84 : 150;
  var DIR = mobile ? "assets/frames-m/" : "assets/frames/";
  var frames = new Array(TOTAL);
  var current = 0, target = 0, lastDrawn = -1, progress = 0, raf = null;
  var chapters = $$(".chapter");
  var gaugeDot = $("#gaugeDot"), nav = $("#nav");

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.25);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    lastDrawn = -1; schedule();
  }
  function ok(img) { return img && img.complete && img.naturalWidth; }
  function nearestLoaded(i) {
    if (ok(frames[i])) return frames[i];
    for (var d = 1; d < TOTAL; d++) { if (ok(frames[i - d])) return frames[i - d]; if (ok(frames[i + d])) return frames[i + d]; }
    return null;
  }
  function draw(idx) {
    var img = nearestLoaded(idx); if (!img) return;
    var cw = canvas.width, ch = canvas.height;
    var s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * (1 + 0.07 * progress);   // slow push-in
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  function loadFrames() {
    // Coarse pass first (every 6th frame) so scrubbing works almost at once, then fill the gaps.
    var order = [], seen = {}, i;
    for (i = 0; i < TOTAL; i += 6) { order.push(i); seen[i] = 1; }
    for (i = 0; i < TOTAL; i++) if (!seen[i]) order.push(i);
    var cursor = 0, active = 0, MAX = 6;
    (function pump() {
      while (active < MAX && cursor < order.length) {
        (function (n) {
          var img = new Image(); active++; img.decoding = "async";
          img.onload = img.onerror = function () { active--; if (Math.abs(n - current) < 3) lastDrawn = -1; schedule(); pump(); };
          img.src = DIR + "f_" + String(n + 1).padStart(3, "0") + ".webp";
          frames[n] = img;
        })(order[cursor++]);
      }
    })();
  }
  function filmProgress() { var r = film.getBoundingClientRect(); return clamp(-r.top / (r.height - window.innerHeight), 0, 1); }
  function chapterAlpha(p, a, b) { var f = 0.035; if (a === 0 && p < f) return 1; return clamp((p - a) / f, 0, 1) * clamp((b - p) / f, 0, 1); }
  function updateChapters() {
    chapters.forEach(function (el) {
      var o = chapterAlpha(progress, parseFloat(el.dataset["in"]), parseFloat(el.dataset.out));
      el.style.opacity = o.toFixed(3);
      el.style.transform = "translate3d(0," + ((1 - o) * 18).toFixed(1) + "px,0)";
      el.classList.toggle("is-on", o > 0.5);
    });
    gaugeDot.style.top = (progress * 100).toFixed(2) + "%";
  }
  function tick() {
    raf = null;
    current += (target - current) * 0.16;                  // easing gives the flight its glide
    if (Math.abs(target - current) < 0.01) current = target;
    var idx = clamp(Math.round(current), 0, TOTAL - 1);
    if (idx !== lastDrawn) { draw(idx); lastDrawn = idx; }
    if (current !== target) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }
  function onScroll() {
    progress = filmProgress(); target = progress * (TOTAL - 1);
    if (reduced) current = target;
    updateChapters();
    nav.classList.toggle("is-solid", window.scrollY > 40);
    schedule();
  }
  if (reduced) {
    // No scrubbing: keep the poster and show every chapter as normal content.
    canvas.style.display = "none"; film.style.height = "auto";
    $(".film__stage").style.cssText = "position:relative;height:auto;padding:140px 0 120px";
    chapters.forEach(function (c) { c.style.cssText = "position:relative;opacity:1;left:auto;bottom:auto;margin:0 var(--gutter) 64px;width:auto;max-width:660px"; });
    $(".gauge").style.display = "none";
  } else { resize(); loadFrames(); window.addEventListener("resize", resize); }

  /* ------------------------------------------------------------------
   * 2. WINERIES: data, list, filters, Leaflet map
   * ------------------------------------------------------------------ */
  var REGIONS = window.MR_REGIONS, WINERIES = window.MR_WINERIES.slice();
  var state = { region: null, grape: null, q: "", open: null };
  var regionById = {}; REGIONS.forEach(function (r) { regionById[r.id] = r; });

  // Optional: pull the real list from the existing backend.
  // Map your API fields to { id, name, region, grapes[], note, lat, lon } here.
  function loadWineries() {
    if (!window.MR_API) return Promise.resolve();
    return fetch(window.MR_API, { headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        WINERIES = rows.map(function (w) {
          return { id: String(w.id), name: w.name, region: w.region, grapes: w.grapes || [], note: w.note || w.description || "", lat: +w.lat, lon: +(w.lon != null ? w.lon : w.lng) };
        });
      })
      .catch(function () { /* keep the sample list if the API is unreachable */ });
  }

  var listEl = $("#list"), countEl = $("#count"), emptyEl = $("#empty");
  var regionChips = $("#regionChips"), grapeChips = $("#grapeChips"), qEl = $("#q");
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function buildChips() {
    regionChips.innerHTML = ""; grapeChips.innerHTML = "";
    var all = el("button", "chip", t("all_regions")); all.type = "button"; all.dataset.region = ""; regionChips.appendChild(all);
    REGIONS.forEach(function (r) { var b = el("button", "chip", r.name); b.type = "button"; b.dataset.region = r.id; regionChips.appendChild(b); });
    var grapes = {}; WINERIES.forEach(function (w) { w.grapes.forEach(function (g) { grapes[g] = 1; }); });
    var ag = el("button", "chip", t("all_grapes")); ag.type = "button"; ag.dataset.grape = ""; grapeChips.appendChild(ag);
    Object.keys(grapes).sort().forEach(function (g) { var b = el("button", "chip", g); b.type = "button"; b.dataset.grape = g; grapeChips.appendChild(b); });
  }
  function matches(w) {
    if (state.region && w.region !== state.region) return false;
    if (state.grape && w.grapes.indexOf(state.grape) < 0) return false;
    if (state.q) { var hay = (w.name + " " + w.grapes.join(" ") + " " + (regionById[w.region] || {}).name).toLowerCase(); if (hay.indexOf(state.q) < 0) return false; }
    return true;
  }

  function renderList() {
    var rows = WINERIES.filter(matches);
    listEl.innerHTML = "";
    rows.forEach(function (w) {
      var open = state.open === w.id;
      var li = el("li", "row" + (open ? " is-open" : "")); li.dataset.id = w.id;
      var head = el("button", "row__head"); head.type = "button"; head.setAttribute("aria-expanded", open ? "true" : "false"); head.setAttribute("aria-controls", "p-" + w.id);
      var name = el("span", "row__name", w.name);
      if (w.sample) name.appendChild(el("span", "sample", t("sample")));
      head.appendChild(name);
      head.appendChild(el("span", "row__meta", (regionById[w.region] || {}).name + " · " + w.grapes.join(", ")));
      head.appendChild(el("span", "row__toggle"));
      var panel = el("div", "row__panel"); panel.id = "p-" + w.id;
      var inner = el("div", "row__inner"), body = el("div", "row__body");
      body.appendChild(el("p", null, w.note));
      var tags = el("ul", "tags"); w.grapes.forEach(function (g) { tags.appendChild(el("li", null, g)); }); body.appendChild(tags);
      var cta = el("a", "btn btn--sm", t("ask")); cta.href = "#contact"; cta.dataset.winery = w.name; body.appendChild(cta);
      inner.appendChild(body); panel.appendChild(inner); li.appendChild(head); li.appendChild(panel); listEl.appendChild(li);
    });
    countEl.textContent = rows.length + " " + (rows.length === 1 ? t("one") : t("many")) + (state.region ? t("in_") + regionById[state.region].name : "");
    emptyEl.hidden = rows.length > 0;
    $$(".chip", regionChips).forEach(function (b) { b.setAttribute("aria-pressed", String((b.dataset.region || null) === state.region)); });
    $$(".chip", grapeChips).forEach(function (b) { b.setAttribute("aria-pressed", String((b.dataset.grape || null) === state.grape)); });
    updateMarkers(rows);
  }

  /* --- Leaflet map: Satellite / Streets toggle, clustered markers --- */
  var map = null, cluster = null, markerById = {}, layers = {}, activeLayer = null;
  function clusterIcon(c) {
    var n = c.getChildCount();
    return L.divIcon({ html: '<div class="mr-cluster' + (n > 9 ? " is-lg" : "") + '">' + n + "</div>", className: "", iconSize: n > 9 ? [54, 54] : [44, 44] });
  }
  function initMap() {
    if (!window.L) return;
    map = L.map("map", { zoomControl: true, scrollWheelZoom: false, worldCopyJump: false }).setView([-33.4, -68.9], 8);
    layers.sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18, attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community" });
    layers.street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
    activeLayer = layers.sat.addTo(map);
    cluster = L.markerClusterGroup({ iconCreateFunction: clusterIcon, maxClusterRadius: 48, showCoverageOnHover: false });
    map.addLayer(cluster);
    // On touch screens a one-finger drag must still scroll the page.
    map.on("focus", function () { map.scrollWheelZoom.enable(); });
    map.on("blur", function () { map.scrollWheelZoom.disable(); });
    $("#btnSat").addEventListener("click", function () { setLayer("sat"); });
    $("#btnStreet").addEventListener("click", function () { setLayer("street"); });
  }
  function setLayer(k) {
    if (!map || activeLayer === layers[k]) return;
    map.removeLayer(activeLayer); activeLayer = layers[k].addTo(map);
    $("#btnSat").setAttribute("aria-pressed", String(k === "sat")); $("#btnStreet").setAttribute("aria-pressed", String(k === "street"));
  }
  function updateMarkers(rows) {
    if (!map) return;
    cluster.clearLayers(); markerById = {};
    var pts = [];
    rows.forEach(function (w) {
      if (!isFinite(w.lat) || !isFinite(w.lon)) return;
      var m = L.marker([w.lat, w.lon], { icon: L.divIcon({ html: '<div class="mr-pin' + (state.open === w.id ? " is-on" : "") + '"></div>', className: "", iconSize: [22, 22] }), title: w.name, keyboard: true });
      m.bindPopup("<strong>" + esc(w.name) + "</strong><br><em>" + esc(regionById[w.region].name) + "</em>");
      m.on("click", function () { state.open = w.id; renderList(); var row = listEl.querySelector('[data-id="' + w.id + '"]'); if (row) row.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); });
      markerById[w.id] = m; cluster.addLayer(m); pts.push([w.lat, w.lon]);
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.35), { maxZoom: 10, animate: !reduced });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* --- events --- */
  regionChips.addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; state.region = b.dataset.region || null; state.open = null; renderList(); });
  grapeChips.addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; state.grape = b.dataset.grape || null; state.open = null; renderList(); });
  qEl.addEventListener("input", function () { state.q = qEl.value.trim().toLowerCase(); renderList(); });
  listEl.addEventListener("click", function (e) {
    var head = e.target.closest(".row__head");
    if (head) {
      var id = head.parentNode.dataset.id; state.open = state.open === id ? null : id; renderList();
      var again = listEl.querySelector('[data-id="' + id + '"] .row__head'); if (again) again.focus({ preventScroll: true });
      var m = markerById[id];
      if (state.open && m && map && window.innerWidth > 900) { map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 11), { duration: reduced ? 0 : 0.9 }); m.openPopup(); }
      return;
    }
    var cta = e.target.closest("[data-winery]");
    if (cta) { var msg = $("#f-msg"); if (!msg.value) msg.value = t("ask_msg", { n: cta.dataset.winery }); }
  });

  /* ------------------------------------------------------------------
   * 3. CONTACT FORM
   *    Set data-endpoint on the form (or window.MR_FORM_ENDPOINT) to POST JSON to the backend.
   *    Without an endpoint it opens the visitor's email app, addressed to the business inbox.
   * ------------------------------------------------------------------ */
  var form = $("#form"), status = $("#formStatus"), INBOX = "mendozareserve@gmail.com";
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = $$("[required]", form).filter(function (f) { var good = f.type === "email" ? /^\S+@\S+\.\S+$/.test(f.value) : f.value.trim(); f.setAttribute("aria-invalid", good ? "false" : "true"); return !good; });
    if (bad.length) { status.textContent = t("k_invalid"); bad[0].focus(); return; }
    var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
    var endpoint = window.MR_FORM_ENDPOINT || form.dataset.endpoint;
    if (endpoint) {
      status.textContent = t("k_sending");
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); status.textContent = t("k_ok"); form.reset(); })
        .catch(function () { status.textContent = t("k_fail", { m: INBOX }); });
    } else {
      var body = "Name: " + data.name + "\nBusiness: " + data.company + "\nEmail: " + data.email + "\n\n" + (data.message || "");
      window.location.href = "mailto:" + INBOX + "?subject=" + encodeURIComponent("Trade access request: " + data.company) + "&body=" + encodeURIComponent(body);
      status.textContent = t("k_mail", { m: INBOX });
    }
  });

  /* ------------------------------------------------------------------ language switch + init */
  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i]").forEach(function (n) { n.textContent = t(n.dataset.i); });
    $$("[data-iph]").forEach(function (n) { n.placeholder = t(n.dataset.iph); });
    $$("[data-iarial]").forEach(function (n) { n.setAttribute("aria-label", t(n.dataset.iarial)); });
    $$(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    if (status) status.textContent = "";
    buildChips(); renderList();
  }
  $$(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { lang = b.dataset.lang; try { localStorage.setItem("mr_lang", lang); } catch (e) {} applyLang(); });
  });

  initMap();
  loadWineries().then(function () { applyLang(); if (map) setTimeout(function () { map.invalidateSize(); }, 200); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
