(function () {
  "use strict";

  const deskEl = document.getElementById("desk");
  const docListEl = document.getElementById("doc-list");
  const reportEntryEl = document.getElementById("report-entry");
  const blotterEl = document.getElementById("reading-area");
  const pinnedPaneEl = document.getElementById("pinned-pane");
  const browsePaneEl = document.getElementById("browse-pane");
  const caseTitleEl = document.getElementById("case-title");
  const caseOpensEl = document.getElementById("case-opens");
  const markPopupEl = document.getElementById("mark-popup");
  const markAddEl = document.getElementById("mark-add");

  const drawerEl = document.getElementById("index-drawer");
  const drawerHandleEl = document.getElementById("drawer-handle");
  const drawerStateEl = document.getElementById("drawer-state");
  const indexSearchEl = document.getElementById("index-search");
  const indexCardsEl = document.getElementById("index-cards");
  const notebookEl = document.getElementById("notebook-area");

  const telephoneEl = document.getElementById("telephone");
  const inTrayEl = document.getElementById("in-tray");
  const trayBadgeEl = document.getElementById("tray-badge");

  const calMonthEl = document.getElementById("cal-month");
  const calDayEl = document.getElementById("cal-day");
  const calYearEl = document.getElementById("cal-year");
  const clockHourEl = document.getElementById("clock-hour");
  const clockMinuteEl = document.getElementById("clock-minute");
  const clockReadoutEl = document.getElementById("clock-readout");

  const TYPE_LABELS = {
    "post-mortem": "Post-mortem report",
    "witness-statement": "Witness statement",
    "forensic": "Forensic report",
    "solicitor's letter": "Solicitor's letter",
    "criminal record office extract": "C.R.O. extract",
    "observation report": "Observation report",
    "newspaper clipping": "Press cutting",
    "police report": "Report of officer",
    "scene examination": "Scene examination",
    "bank extract": "Bank extract",
    "internal-memo": "Internal memo",
  };

  const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];

  const REPORT_FIELDS = [
    { key: "perpetrator", number: 1, label: "Person responsible" },
    { key: "method", number: 2, label: "Means employed" },
    { key: "motive", number: 3, label: "Motive" },
    { key: "firm_connected", number: 4, label: "Connected to organised criminal activity (Yes/No)" },
  ];

  // Fields answered yes/no rather than in prose. Matched whole, never as
  // substrings — "not the firm" and "the firm" must stay distinct answers.
  const BINARY_FIELDS = ["firm_connected"];
  const AFFIRMATIVE = [
    "yes", "y", "true",
    "connected", "the firm", "gangland", "firm related",
  ];
  const NEGATIVE = [
    "no", "n", "false",
    "not connected", "no connection", "unconnected", "not the firm", "unrelated",
  ];

  const SHORT_VARIANT_LENGTH = 3;
  const REPORT_VIEW = "REPORT_FORM";
  const REQUESTS_VIEW = "REQUESTS";
  const BROWSE_PLACEHOLDER =
    '<p class="placeholder">Take a document from the folder.</p>';

  const CASES_DIR = "../cases/";

  const state = {
    manifest: null,
    caseEntry: null,
    caseData: null,
    byId: {},
    actionById: {},
    hintDocs: [],
    activeId: null,
    pinnedId: null,
    reportDraft: {},
    reportAttempts: 0,
    indexQuery: "",
    // Everything under `saved` is persisted to localStorage.
    saved: {
      highlights: {},
      bookmarks: {},
      notes: "",
      drawerOpen: false,
      requests: {},   // actionId -> { dueAt, delivered }
      seen: {},       // docId -> true, for the in-tray badge
      hints: { delivered: [], pending: null },
    },
  };

  /* ---------------- persistence ---------------- */

  function saveKey() {
    return "the-firm:save:" + (state.caseData ? state.caseData.id : "unknown");
  }

  function loadSaved() {
    try {
      const raw = window.localStorage.getItem(saveKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.saved = {
        highlights: parsed.highlights || {},
        bookmarks: parsed.bookmarks || {},
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        drawerOpen: !!parsed.drawerOpen,
        requests: parsed.requests || {},
        seen: parsed.seen || {},
        hints: {
          delivered: (parsed.hints && parsed.hints.delivered) || [],
          pending: (parsed.hints && parsed.hints.pending) || null,
        },
      };
    } catch (err) {
      // Private windows and blocked site data both throw here. Carry on
      // unsaved rather than failing to open the case.
      console.warn("Could not read saved work:", err);
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(saveKey(), JSON.stringify(state.saved));
    } catch (err) {
      console.warn("Could not save work:", err);
    }
  }

  /* ---------------- boot ---------------- */

  // The engine knows about the manifest, never about a particular case.
  // Adding a case means adding a file and a line in cases/manifest.json.
  fetch(CASES_DIR + "manifest.json")
    .then((res) => res.json())
    .then((manifest) => {
      state.manifest = manifest;
      const wanted = new URLSearchParams(window.location.search).get("case");
      const entry =
        (manifest.cases || []).find((c) => c.id === wanted) || (manifest.cases || [])[0];
      if (!entry) throw new Error("No cases listed in the manifest.");
      state.caseEntry = entry;
      return fetch(CASES_DIR + entry.file).then((r) => r.json());
    })
    .then((caseData) => renderCase(caseData))
    .catch((err) => {
      browsePaneEl.innerHTML =
        '<p class="placeholder">Could not load the case file. Are you viewing this over a local server rather than file://?</p>';
      console.error(err);
    });

  function renderCase(caseData) {
    state.caseData = caseData;
    loadSaved();

    caseData.documents.forEach((doc) => { state.byId[doc.id] = doc; });
    (caseData.actions || []).forEach((a) => { state.actionById[a.id] = a; });

    caseTitleEl.textContent = caseData.title;
    caseOpensEl.textContent = "Opened " + formatDate(caseData.opens);
    renderCaseChooser();

    // Requests that came due while the desk was unattended are already waiting,
    // and any note from a colleague is rebuilt from what was delivered.
    settleDueRequests(true);

    reportEntryEl.addEventListener("click", () => setActive(REPORT_VIEW));
    telephoneEl.addEventListener("click", () => setActive(REQUESTS_VIEW));
    inTrayEl.addEventListener("click", openInTray);

    drawerHandleEl.addEventListener("click", () => {
      state.saved.drawerOpen = !state.saved.drawerOpen;
      persist();
      refreshDrawer();
    });

    indexSearchEl.addEventListener("input", () => {
      state.indexQuery = indexSearchEl.value;
      renderCards();
    });

    notebookEl.value = state.saved.notes;
    notebookEl.addEventListener("input", () => {
      state.saved.notes = notebookEl.value;
      persist();
    });

    renderCards();
    refreshDrawer();
    tick();
    window.setInterval(tick, 1000);

    const first = availableDocuments()[0];
    if (first) setActive(first.id);
    else refresh();
  }

  /* ---------------- requests and the clock ---------------- */

  // Only worth showing once there is more than one folder to choose between.
  function renderCaseChooser() {
    const cases = (state.manifest && state.manifest.cases) || [];
    if (cases.length < 2) return;

    const head = document.querySelector(".folder-head");
    if (!head) return;

    const select = document.createElement("select");
    select.className = "case-chooser";
    select.setAttribute("aria-label", "Case folder");

    cases.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.title;
      if (state.caseEntry && c.id === state.caseEntry.id) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      window.location.search = "?case=" + encodeURIComponent(select.value);
    });

    head.appendChild(select);
  }

  function requestState(actionId) {
    return state.saved.requests[actionId] || null;
  }

  function isDelivered(actionId) {
    const r = requestState(actionId);
    return !!(r && r.delivered);
  }

  function isPending(actionId) {
    const r = requestState(actionId);
    return !!(r && !r.delivered);
  }

  function makeRequest(action) {
    if (requestState(action.id)) return;
    state.saved.requests[action.id] = {
      dueAt: Date.now() + action.real_minutes * 60 * 1000,
      delivered: false,
    };
    persist();
    refresh();
  }

  // Returns true if anything newly landed.
  function settleDueRequests(quiet) {
    const now = Date.now();
    let landed = false;

    Object.keys(state.saved.requests).forEach((actionId) => {
      const r = state.saved.requests[actionId];
      if (!r.delivered && now >= r.dueAt) {
        r.delivered = true;
        landed = true;
      }
    });

    const h = hintsState();
    if (h.pending && now >= h.pending.dueAt) {
      h.delivered.push(h.pending.step);
      h.pending = null;
      landed = true;
    }

    rebuildHintDocs();

    if (landed) persist();
    if (landed && !quiet) refresh();
    return landed;
  }

  function availableDocuments() {
    const fromCase = state.caseData.documents.filter((doc) => {
      if (!doc.requires) return true;
      return isDelivered(doc.requires);
    });
    return fromCase.concat(state.hintDocs);
  }

  // Anything that came to the desk after the folder landed: a requested
  // document, or a note from a colleague.
  function isArrival(doc) {
    return !!(doc && (doc.requires || doc.hint));
  }

  // Documents that have arrived and not yet been opened.
  function unseenArrivals() {
    return availableDocuments().filter(
      (doc) => isArrival(doc) && !state.saved.seen[doc.id]
    );
  }

  /* ---------------- a word with a colleague ---------------- */

  function consultation() {
    return (state.caseData && state.caseData.consultation) || null;
  }

  function hintsState() {
    const h = state.saved.hints;
    if (!Array.isArray(h.delivered)) h.delivered = [];
    return h;
  }

  // One opening remark, then for each authored contradiction: the pair of
  // documents, then what is wrong between them. Never the culprit.
  //
  // Two contradictions can sit between the same pair of documents, and naming
  // that pair twice would charge the player time for a note they already have,
  // so a pair is only ever named once.
  function hintSteps() {
    if (!consultation()) return [];

    const steps = [{ kind: "opening" }];
    const named = {};

    (state.caseData.contradictions || []).forEach((contra, i) => {
      const pair = [parseRef(contra.a).docId, parseRef(contra.b).docId].sort().join("|");
      if (!named[pair]) {
        named[pair] = true;
        steps.push({ kind: "pair", index: i });
      }
      steps.push({ kind: "note", index: i });
    });

    return steps;
  }

  function nextHintStep() {
    const h = hintsState();
    const used = h.delivered.length + (h.pending ? 1 : 0);
    return used < hintSteps().length ? used : null;
  }

  function askColleague() {
    const c = consultation();
    const h = hintsState();
    const step = nextHintStep();
    if (!c || h.pending || step === null) return;
    h.pending = { step: step, dueAt: Date.now() + c.real_minutes * 60 * 1000 };
    persist();
    refresh();
  }

  function rebuildHintDocs() {
    state.hintDocs = [];
    hintsState().delivered.forEach((step) => {
      const doc = buildHintDoc(step);
      if (!doc) return;
      state.byId[doc.id] = doc;
      state.hintDocs.push(doc);
    });
  }

  function buildHintDoc(stepIndex) {
    const c = consultation();
    const step = hintSteps()[stepIndex];
    if (!c || !step) return null;

    const lines = [];

    if (step.kind === "opening") {
      lines.push(fill(c.opening, {
        count: numberWord((state.caseData.contradictions || []).length),
      }));
    } else {
      const contra = (state.caseData.contradictions || [])[step.index];
      if (!contra) return null;
      const a = parseRef(contra.a);
      const b = parseRef(contra.b);

      if (step.kind === "pair") {
        lines.push(fill(c.pair, { a: titleOf(a.docId), b: titleOf(b.docId) }));
      } else {
        lines.push(fill(c.note, { note: contra.note }));
        if (a.para && b.para) {
          lines.push(fill(c.where_to_look, { pa: a.para, pb: b.para }));
        } else if (a.para) {
          lines.push(fill(c.where_to_look_single, { pa: a.para }));
        }
      }
    }

    return {
      id: "hint-" + stepIndex,
      hint: true,
      type: "note",
      title: "Note from " + (c.short || c.colleague) + " (" + (stepIndex + 1) + ")",
      letterhead: "Metropolitan Police — C Division",
      subhead: "Note — " + (c.where || "Sergeants' Room"),
      meta: [
        { label: "From", value: c.colleague },
        { label: "To", value: "D.I., C Division" },
      ],
      body: lines.join("\n\n") + "\n\n(Signed) " + c.colleague,
    };
  }

  function parseRef(ref) {
    const parts = String(ref || "").split(":");
    const para = (parts[1] || "").replace("para-", "");
    return { docId: parts[0], para: para || null };
  }

  function titleOf(docId) {
    const doc = state.byId[docId];
    return doc ? doc.title : docId;
  }

  function fill(template, vars) {
    return String(template || "").replace(/\{(\w+)\}/g, (m, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m
    );
  }

  function numberWord(n) {
    const words = ["no", "one", "two", "three", "four", "five", "six", "seven"];
    return words[n] !== undefined ? words[n] : String(n);
  }

  function openInTray() {
    const waiting = unseenArrivals();
    if (waiting.length > 0) setActive(waiting[0].id);
    else setActive(REQUESTS_VIEW);
  }

  // The desk calendar moves forward as enquiries come back.
  function gameHoursElapsed() {
    let hours = 0;
    (state.caseData.actions || []).forEach((a) => {
      if (isDelivered(a.id)) hours += a.game_hours || 0;
    });
    const c = consultation();
    if (c) hours += hintsState().delivered.length * (c.game_hours || 0);
    return hours;
  }

  function caseDate() {
    const [y, m, d] = state.caseData.opens.split("-").map(Number);
    const [hh, mm] = (state.caseData.opens_time || "09:00").split(":").map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    start.setHours(start.getHours() + gameHoursElapsed());
    return start;
  }

  function tick() {
    settleDueRequests(false);
    updateClock();
    updateCalendar();
    updateCountdowns();
  }

  function updateClock() {
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    clockHourEl.style.transform = "rotate(" + ((h + m / 60) * 30) + "deg)";
    clockMinuteEl.style.transform = "rotate(" + ((m + s / 60) * 6) + "deg)";
    clockReadoutEl.textContent = clockWords(now);
  }

  // 1966 register: "twenty past three", not "15:20".
  function clockWords(date) {
    let h = date.getHours();
    const m = date.getMinutes();
    const suffix = h < 12 ? "a.m." : "p.m.";
    h = h % 12;
    if (h === 0) h = 12;
    return h + "." + String(m).padStart(2, "0") + " " + suffix;
  }

  function updateCalendar() {
    const d = caseDate();
    calMonthEl.textContent = MONTHS_SHORT[d.getMonth()];
    calDayEl.textContent = String(d.getDate());
    calYearEl.textContent = String(d.getFullYear());
  }

  function updateCountdowns() {
    document.querySelectorAll("[data-countdown]").forEach((el) => {
      const due = Number(el.dataset.countdown);
      el.textContent = countdownWords(due - Date.now());
    });
  }

  function countdownWords(ms) {
    if (ms <= 0) return "due now";
    const total = Math.ceil(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins + ":" + String(secs).padStart(2, "0");
  }

  function refreshTray() {
    const n = unseenArrivals().length;
    trayBadgeEl.textContent = String(n);
    trayBadgeEl.hidden = n === 0;
    inTrayEl.classList.toggle("has-post", n > 0);

    const pending =
      (state.caseData.actions || []).some((a) => isPending(a.id)) ||
      !!hintsState().pending;
    telephoneEl.classList.toggle("waiting", pending);
  }

  /* ---------------- navigation ---------------- */

  function setActive(id) {
    state.activeId = id;
    if (isArrival(state.byId[id]) && !state.saved.seen[id]) {
      state.saved.seen[id] = true;
      persist();
    }
    refresh();
  }

  function togglePin(id) {
    state.pinnedId = state.pinnedId === id ? null : id;
    refresh();
  }

  function toggleBookmark(id) {
    if (state.saved.bookmarks[id]) delete state.saved.bookmarks[id];
    else state.saved.bookmarks[id] = true;
    persist();
    refresh();
  }

  function refresh() {
    hideMarkPopup();
    refreshDocList();
    refreshTray();
    refreshPinnedPane();
    refreshBrowsePane();
    updateCountdowns();
  }

  function refreshDrawer() {
    const open = state.saved.drawerOpen;
    drawerEl.classList.toggle("open", open);
    deskEl.classList.toggle("drawer-open", open);
    drawerStateEl.textContent = open ? "Close" : "Open";
  }

  function refreshDocList() {
    docListEl.innerHTML = "";
    availableDocuments().forEach((doc) => docListEl.appendChild(buildListItem(doc)));

    reportEntryEl.classList.toggle(
      "active",
      state.activeId === REPORT_VIEW || state.activeId === "memo"
    );
    telephoneEl.classList.toggle("active", state.activeId === REQUESTS_VIEW);
  }

  function buildListItem(doc) {
    const item = document.createElement("li");
    item.className = "doc-list-item";
    item.dataset.docId = doc.id;
    item.classList.toggle("active", doc.id === state.activeId);
    item.classList.toggle("pinned", doc.id === state.pinnedId);
    item.classList.toggle("bookmarked", !!state.saved.bookmarks[doc.id]);

    // Must be a real boolean: classList.toggle(name, undefined) toggles the
    // class rather than forcing it off, and doc.requires is undefined on the
    // documents that start on the desk.
    const isNew = !!(isArrival(doc) && !state.saved.seen[doc.id]);
    item.classList.toggle("fresh", isNew);

    const typeLabel = document.createElement("span");
    typeLabel.className = "doc-type-label";
    typeLabel.textContent = TYPE_LABELS[doc.type] || doc.type;

    const titleLabel = document.createElement("span");
    titleLabel.className = "doc-title-label";
    titleLabel.textContent = doc.title;

    const flags = document.createElement("span");
    flags.className = "item-flags";

    if (isNew) {
      const fresh = document.createElement("span");
      fresh.className = "fresh-flag";
      fresh.textContent = "Just in";
      flags.appendChild(fresh);
    }

    const pinFlag = document.createElement("span");
    pinFlag.className = "pin-flag";
    pinFlag.textContent = "Pinned";

    const markFlag = document.createElement("span");
    markFlag.className = "bookmark-flag";
    markFlag.textContent = "Bookmarked";

    flags.appendChild(pinFlag);
    flags.appendChild(markFlag);

    item.appendChild(typeLabel);
    item.appendChild(titleLabel);
    item.appendChild(flags);
    item.addEventListener("click", () => setActive(doc.id));

    return item;
  }

  function refreshPinnedPane() {
    pinnedPaneEl.innerHTML = "";

    if (!state.pinnedId || !state.byId[state.pinnedId]) {
      blotterEl.classList.remove("split");
      return;
    }

    blotterEl.classList.add("split");
    pinnedPaneEl.appendChild(buildDocumentSheet(state.byId[state.pinnedId]));
  }

  function refreshBrowsePane() {
    browsePaneEl.innerHTML = "";

    if (!state.activeId) {
      browsePaneEl.innerHTML = BROWSE_PLACEHOLDER;
      return;
    }

    if (state.activeId === REPORT_VIEW) {
      browsePaneEl.appendChild(buildReportForm());
      return;
    }

    if (state.activeId === REQUESTS_VIEW) {
      browsePaneEl.appendChild(buildRequestsDocket());
      return;
    }

    const doc = state.byId[state.activeId];
    if (!doc) {
      browsePaneEl.innerHTML = BROWSE_PLACEHOLDER;
      return;
    }
    browsePaneEl.appendChild(buildDocumentSheet(doc));
  }

  /* ---------------- requests docket ---------------- */

  function buildRequestsDocket() {
    const sheet = document.createElement("article");
    sheet.className = "document-sheet";
    sheet.dataset.type = "requests";

    sheet.appendChild(
      buildLetterhead("Metropolitan Police — C Division", "Requests and Enquiries")
    );
    sheet.appendChild(
      buildMetaList([
        { label: "Case", value: state.caseData.title },
        { label: "Officer", value: "D.I., C Division" },
        { label: "Desk date", value: formatLongDate(caseDate()) },
      ])
    );

    const intro = document.createElement("p");
    intro.className = "requests-intro";
    intro.textContent =
      "Nothing here is needed to close the case. Each enquiry costs time, and some of it will be wasted.";
    sheet.appendChild(intro);

    const list = document.createElement("div");
    list.className = "request-list";

    (state.caseData.actions || []).forEach((action) => {
      list.appendChild(buildRequestRow(action));
    });

    sheet.appendChild(list);

    const consult = buildConsultationBlock();
    if (consult) sheet.appendChild(consult);

    return sheet;
  }

  function buildConsultationBlock() {
    const c = consultation();
    if (!c) return null;

    const wrap = document.createElement("section");
    wrap.className = "consultation";

    const heading = document.createElement("h3");
    heading.className = "consultation-heading";
    heading.textContent = "A word with " + (c.short || c.colleague);
    wrap.appendChild(heading);

    const blurb = document.createElement("p");
    blurb.className = "consultation-blurb";
    blurb.textContent =
      "He has read the file too. He will point you at what does not sit right — never at who did it.";
    wrap.appendChild(blurb);

    const notes = state.hintDocs;
    if (notes.length > 0) {
      const had = document.createElement("p");
      had.className = "consultation-had";
      had.appendChild(document.createTextNode("He has given you: "));
      notes.forEach((doc) => {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "doc-ref";
        link.textContent = doc.title;
        link.addEventListener("click", () => setActive(doc.id));
        had.appendChild(link);
      });
      wrap.appendChild(had);
    }

    const status = document.createElement("div");
    status.className = "request-status";
    const h = hintsState();

    if (h.pending) {
      wrap.classList.add("pending");
      status.appendChild(document.createTextNode("He is looking. "));
      const countdown = document.createElement("span");
      countdown.className = "request-countdown";
      countdown.dataset.countdown = String(h.pending.dueAt);
      countdown.textContent = countdownWords(h.pending.dueAt - Date.now());
      status.appendChild(countdown);
    } else if (nextHintStep() === null) {
      const done = document.createElement("span");
      done.className = "consultation-exhausted";
      done.textContent = c.exhausted;
      status.appendChild(done);
    } else {
      const cost = document.createElement("span");
      cost.className = "request-cost";
      cost.textContent =
        "about " + c.real_minutes + " min, and " + gameCost(c.game_hours) + " on the case";
      status.appendChild(cost);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "request-button";
      button.textContent = "Ask him";
      button.addEventListener("click", askColleague);
      status.appendChild(button);
    }

    wrap.appendChild(status);
    return wrap;
  }

  function buildRequestRow(action) {
    const row = document.createElement("div");
    row.className = "request-row";

    const head = document.createElement("div");
    head.className = "request-head";

    const label = document.createElement("span");
    label.className = "request-label";
    label.textContent = action.label;
    head.appendChild(label);

    const detail = document.createElement("p");
    detail.className = "request-detail";
    detail.textContent = action.detail;

    row.appendChild(head);
    row.appendChild(detail);

    const status = document.createElement("div");
    status.className = "request-status";

    if (isDelivered(action.id)) {
      row.classList.add("delivered");
      const doc = state.byId[action.delivers];
      const done = document.createElement("span");
      done.className = "request-done";
      done.textContent = "Received.";
      status.appendChild(done);

      if (doc) {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "doc-ref";
        link.textContent = doc.title;
        link.addEventListener("click", () => setActive(doc.id));
        status.appendChild(link);
      }
    } else if (isPending(action.id)) {
      row.classList.add("pending");
      const waiting = document.createElement("span");
      waiting.className = "request-waiting";
      waiting.textContent = "Sent. Expected in ";
      status.appendChild(waiting);

      const countdown = document.createElement("span");
      countdown.className = "request-countdown";
      countdown.dataset.countdown = String(requestState(action.id).dueAt);
      countdown.textContent = countdownWords(requestState(action.id).dueAt - Date.now());
      status.appendChild(countdown);
    } else {
      const cost = document.createElement("span");
      cost.className = "request-cost";
      cost.textContent =
        "about " + action.real_minutes + " min, and " + gameCost(action.game_hours) + " on the case";
      status.appendChild(cost);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "request-button";
      button.textContent = "Request";
      button.addEventListener("click", () => makeRequest(action));
      status.appendChild(button);
    }

    row.appendChild(status);
    return row;
  }

  function gameCost(hours) {
    if (!hours) return "no time";
    if (hours < 24) return hours + " hours";
    const days = Math.round(hours / 24);
    return days === 1 ? "a day" : days + " days";
  }

  /* ---------------- document sheet ---------------- */

  function buildDocumentSheet(doc) {
    const sheet = document.createElement("article");
    sheet.className = "document-sheet";
    sheet.dataset.type = doc.type;
    sheet.dataset.docId = doc.id;

    const tools = document.createElement("div");
    tools.className = "sheet-tools";

    const isPinned = doc.id === state.pinnedId;
    const isBookmarked = !!state.saved.bookmarks[doc.id];

    const markBtn = document.createElement("button");
    markBtn.type = "button";
    markBtn.className = "sheet-tool" + (isBookmarked ? " on" : "");
    markBtn.textContent = isBookmarked ? "Bookmarked" : "Bookmark";
    markBtn.addEventListener("click", () => toggleBookmark(doc.id));

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "sheet-tool" + (isPinned ? " on" : "");
    pinBtn.textContent = isPinned ? "Unpin" : "Pin";
    pinBtn.addEventListener("click", () => togglePin(doc.id));

    tools.appendChild(markBtn);
    tools.appendChild(pinBtn);

    const body = document.createElement("div");
    body.className = "doc-body";
    body.appendChild(renderBody(doc.body));

    sheet.appendChild(tools);
    sheet.appendChild(buildLetterhead(doc.letterhead, doc.subhead));
    sheet.appendChild(buildMetaList(doc.meta));
    sheet.appendChild(body);

    applyHighlights(body, state.saved.highlights[doc.id] || []);

    return sheet;
  }

  /* ---------------- highlighting ---------------- */

  function highlightsFor(docId) {
    if (!state.saved.highlights[docId]) state.saved.highlights[docId] = [];
    return state.saved.highlights[docId];
  }

  // Keep stored ranges disjoint, so applying them can never nest one <mark>
  // inside another.
  function addHighlight(docId, para, start, end) {
    const list = highlightsFor(docId);
    let lo = start;
    let hi = end;

    const kept = list.filter((h) => {
      if (h.para !== para || h.end < lo || h.start > hi) return true;
      lo = Math.min(lo, h.start);
      hi = Math.max(hi, h.end);
      return false;
    });

    kept.push({ para: para, start: lo, end: hi });
    kept.sort((a, b) => a.para - b.para || a.start - b.start);
    state.saved.highlights[docId] = kept;
    persist();
  }

  function removeHighlight(docId, para, start, end) {
    const list = highlightsFor(docId);
    state.saved.highlights[docId] = list.filter(
      (h) => !(h.para === para && h.start === start && h.end === end)
    );
    persist();
  }

  function applyHighlights(bodyEl, list) {
    const paras = Array.from(bodyEl.children);
    list.forEach((h) => {
      const p = paras[h.para];
      if (p) markRange(p, h.start, h.end);
    });
  }

  // Wrap [start, end) of the paragraph's text in <mark>, walking text nodes so
  // that inline markup (struck-through corrections, line breaks) survives.
  function markRange(root, start, end) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const hits = [];
    let pos = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.nodeValue.length;
      const nodeStart = pos;
      const nodeEnd = pos + len;
      if (nodeEnd > start && nodeStart < end) {
        hits.push({
          node: node,
          from: Math.max(0, start - nodeStart),
          to: Math.min(len, end - nodeStart),
        });
      }
      pos = nodeEnd;
    }

    // Back to front, so earlier offsets stay valid as nodes are split.
    for (let i = hits.length - 1; i >= 0; i--) {
      const hit = hits[i];
      let target = hit.node;
      if (hit.from > 0) target = target.splitText(hit.from);
      if (hit.to - hit.from < target.nodeValue.length) {
        target.splitText(hit.to - hit.from);
      }
      const mark = document.createElement("mark");
      mark.className = "hl";
      mark.title = "Click to remove this highlight";
      mark.dataset.start = String(start);
      mark.dataset.end = String(end);
      target.parentNode.insertBefore(mark, target);
      mark.appendChild(target);
    }
  }

  function selectionTarget() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!node || !node.closest) return null;

    const para = node.closest(".doc-body > p");
    if (!para) return null;
    if (!para.contains(range.startContainer) || !para.contains(range.endContainer)) return null;

    const sheet = para.closest(".document-sheet");
    if (!sheet || !sheet.dataset.docId) return null;

    const text = range.toString();
    if (!text.trim()) return null;

    const paras = Array.from(para.parentNode.children);
    const before = range.cloneRange();
    before.selectNodeContents(para);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;

    return {
      docId: sheet.dataset.docId,
      para: paras.indexOf(para),
      start: start,
      end: start + text.length,
      rect: range.getBoundingClientRect(),
    };
  }

  function showMarkPopup(target) {
    markPopupEl.hidden = false;
    const box = markPopupEl.getBoundingClientRect();
    const left = target.rect.left + target.rect.width / 2 - box.width / 2;
    const top = target.rect.top - box.height - 8;
    markPopupEl.style.left = Math.max(8, left) + "px";
    markPopupEl.style.top = Math.max(8, top) + "px";
  }

  function hideMarkPopup() {
    markPopupEl.hidden = true;
  }

  document.addEventListener("mouseup", (event) => {
    if (markPopupEl.contains(event.target)) return;

    // Clicking an existing highlight lifts it.
    const mark = event.target.closest && event.target.closest("mark.hl");
    if (mark && window.getSelection().isCollapsed) {
      const sheet = mark.closest(".document-sheet");
      const para = mark.closest(".doc-body > p");
      if (sheet && para) {
        const paras = Array.from(para.parentNode.children);
        removeHighlight(
          sheet.dataset.docId,
          paras.indexOf(para),
          Number(mark.dataset.start),
          Number(mark.dataset.end)
        );
        refresh();
        return;
      }
    }

    const target = selectionTarget();
    if (target) {
      markPopupEl.dataset.payload = JSON.stringify(target);
      showMarkPopup(target);
    } else {
      hideMarkPopup();
    }
  });

  markAddEl.addEventListener("click", () => {
    const payload = markPopupEl.dataset.payload;
    if (!payload) return;
    const t = JSON.parse(payload);
    addHighlight(t.docId, t.para, t.start, t.end);
    window.getSelection().removeAllRanges();
    refresh();
  });

  /* ---------------- card index ---------------- */

  function renderCards() {
    indexCardsEl.innerHTML = "";
    const characters = (state.caseData && state.caseData.characters) || [];
    const q = state.indexQuery.trim().toLowerCase();

    const matches = characters.filter((c) => {
      if (!q) return true;
      const hay = [c.name, c.role, c.occupation, c.address, c.cro]
        .concat(c.aliases || [])
        .join(" ")
        .toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    if (matches.length === 0) {
      const none = document.createElement("p");
      none.className = "index-empty";
      none.textContent = "No card of that name in this drawer.";
      indexCardsEl.appendChild(none);
      return;
    }

    matches.forEach((c) => indexCardsEl.appendChild(buildCard(c)));
  }

  function buildCard(character) {
    const card = document.createElement("section");
    card.className = "index-card";

    const name = document.createElement("h3");
    name.className = "index-card-name";
    name.textContent = character.name;

    const role = document.createElement("p");
    role.className = "index-card-role";
    role.textContent = character.role;

    card.appendChild(name);
    card.appendChild(role);

    const rows = [
      ["Aliases", (character.aliases || []).join("; ") || "None recorded"],
      ["Age", character.age],
      ["Height", character.height],
      ["Occupation", character.occupation],
      ["Address", character.address],
      ["Blood group", character.blood_group],
      ["C.R.O.", character.cro],
      ["Prints on file", character.prints_on_file],
      ["Associates", (character.associates || []).join("; ") || "None recorded"],
    ];

    const dl = document.createElement("dl");
    dl.className = "index-card-fields";
    rows.forEach((row) => {
      const wrap = document.createElement("div");
      wrap.className = "index-card-row";

      const dt = document.createElement("dt");
      dt.textContent = row[0] + ":";

      const dd = document.createElement("dd");
      dd.textContent = row[1];

      wrap.appendChild(dt);
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    });
    card.appendChild(dl);

    // Only documents actually on the desk are cross-referenced.
    const refs = (character.documents || []).filter((id) => {
      const doc = state.byId[id];
      return doc && (!doc.requires || isDelivered(doc.requires));
    });

    if (refs.length > 0) {
      const refsEl = document.createElement("p");
      refsEl.className = "index-card-refs";

      refs.forEach((docId) => {
        const doc = state.byId[docId];
        const link = document.createElement("button");
        link.type = "button";
        link.className = "doc-ref";
        link.textContent = doc.title;
        // The drawer stays open, so a record can be read beside its document.
        link.addEventListener("click", () => setActive(docId));
        refsEl.appendChild(link);
      });

      card.appendChild(refsEl);
    }

    return card;
  }

  /* ---------------- report of investigating officer ---------------- */

  function buildReportForm() {
    const sheet = document.createElement("article");
    sheet.className = "document-sheet";
    sheet.dataset.type = "report-form";

    sheet.appendChild(
      buildLetterhead("Metropolitan Police — C Division", "Report of Investigating Officer")
    );
    sheet.appendChild(
      buildMetaList([
        { label: "Ref. No.", value: "RIO/66/—" },
        { label: "Case", value: state.caseData.title },
        { label: "Submitted by", value: "D.I., C Division" },
      ])
    );

    const form = document.createElement("form");
    form.className = "report-form-fields";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitReport();
    });

    REPORT_FIELDS.forEach((field) => form.appendChild(buildReportField(field)));

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "report-submit";
    submit.textContent = "File Report";
    form.appendChild(submit);

    sheet.appendChild(form);
    return sheet;
  }

  function buildReportField(field) {
    const wrap = document.createElement("div");
    wrap.className = "report-field";

    const label = document.createElement("label");
    label.className = "report-field-label";
    label.htmlFor = "report-input-" + field.key;
    label.textContent = field.number + ". " + field.label.toUpperCase() + ":";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "report-input-" + field.key;
    input.className = "report-field-input";
    input.autocomplete = "off";
    input.value = state.reportDraft[field.key] || "";
    input.addEventListener("input", () => {
      state.reportDraft[field.key] = input.value;
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    return wrap;
  }

  function submitReport() {
    state.reportAttempts += 1;

    const solution = state.caseData.solution;
    let supported = 0;

    REPORT_FIELDS.forEach((field) => {
      if (isSupported(field.key, state.reportDraft[field.key], solution)) {
        supported++;
      }
    });

    state.byId.memo = buildMemoDoc(supported, REPORT_FIELDS.length);
    state.activeId = "memo";
    refresh();
  }

  function isSupported(key, rawInput, solution) {
    const typed = (rawInput || "").trim().toLowerCase();
    if (!typed) return false;

    const spec = solution[key];

    // A binary field is not free prose. Match the whole answer against a small
    // whitelist so that "Unknown" and "cannot say" cannot slip through on the
    // strength of containing the letters of "no".
    if (BINARY_FIELDS.indexOf(key) !== -1) {
      const answer = typed.replace(/[.,;:!]+$/, "").replace(/\s+/g, " ");
      const expected = expectedBoolean(spec);
      if (expected === null) return false;
      if (AFFIRMATIVE.indexOf(answer) !== -1) return expected === true;
      if (NEGATIVE.indexOf(answer) !== -1) return expected === false;
      return false;
    }

    const accepted = (spec && spec.accepted) || [];
    return accepted.some((variant) => variantMatches(typed, variant.toLowerCase()));
  }

  // Short variants match as whole words only — "no" should not fire inside
  // "unknown". Longer ones stay substrings so "steal" still reaches "stealing".
  function variantMatches(typed, variant) {
    if (variant.length <= SHORT_VARIANT_LENGTH) {
      return new RegExp("\\b" + escapeRegExp(variant) + "\\b").test(typed);
    }
    return typed.indexOf(variant) !== -1;
  }

  function expectedBoolean(spec) {
    if (typeof spec === "boolean") return spec;
    if (spec && typeof spec.value === "boolean") return spec.value;

    if (spec && Array.isArray(spec.accepted)) {
      const listed = spec.accepted.map((s) => s.toLowerCase());
      if (listed.some((s) => NEGATIVE.indexOf(s) !== -1)) return false;
      if (listed.some((s) => AFFIRMATIVE.indexOf(s) !== -1)) return true;
    }

    return null;
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildMemoDoc(supported, total) {
    const ref = "IM/66/0" + (40 + state.reportAttempts);
    const body =
      "Detective Inspector,\n\n" +
      "I have your report on " + state.caseData.title + " before me.\n\n" +
      "Of the " + total + " findings you have submitted, " + supported + " of " + total +
      " are supported by the evidence presently on file. This office does not indicate which.\n\n" +
      "If you are not satisfied, revise your report and submit again.\n\n" +
      "(Signed) Supt. G. Marchant\nC Division";

    return {
      id: "memo",
      type: "internal-memo",
      letterhead: "Metropolitan Police — C Division",
      subhead: "Internal Memorandum — Office of the Superintendent",
      meta: [
        { label: "Ref. No.", value: ref },
        { label: "To", value: "D.I., C Division" },
        { label: "From", value: "Supt. G. Marchant" },
        { label: "Re", value: state.caseData.title },
      ],
      body: body,
    };
  }

  /* ---------------- shared pieces ---------------- */

  function buildLetterhead(org, sub) {
    const letterhead = document.createElement("header");
    letterhead.className = "letterhead";

    const orgEl = document.createElement("p");
    orgEl.className = "letterhead-org";
    orgEl.textContent = org;

    const subEl = document.createElement("p");
    subEl.className = "letterhead-sub";
    subEl.textContent = sub;

    letterhead.appendChild(orgEl);
    letterhead.appendChild(subEl);
    return letterhead;
  }

  function buildMetaList(rows) {
    const meta = document.createElement("dl");
    meta.className = "doc-meta";

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "doc-meta-row";

      const label = document.createElement("dt");
      label.className = "doc-meta-label";
      label.textContent = row.label + ":";

      const value = document.createElement("dd");
      value.className = "doc-meta-value";
      value.textContent = row.value;

      rowEl.appendChild(label);
      rowEl.appendChild(value);
      meta.appendChild(rowEl);
    });

    return meta;
  }

  function renderBody(text) {
    const fragment = document.createDocumentFragment();
    const paragraphs = text.split("\n\n");

    paragraphs.forEach((para) => {
      const p = document.createElement("p");
      if (para.trim().startsWith("(Signed)")) {
        p.className = "signature-line";
      }
      p.innerHTML = inlineFormat(para);
      fragment.appendChild(p);
    });

    return fragment;
  }

  function inlineFormat(text) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escaped
      .replace(/~~(.+?)~~/g, "<s>$1</s>")
      .replace(/\n/g, "<br>");
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return day + " " + MONTHS[month - 1] + " " + year;
  }

  function formatLongDate(date) {
    return date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();
  }
})();
