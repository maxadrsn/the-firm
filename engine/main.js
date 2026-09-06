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

  const calMonthEl = document.getElementById("cal-month");
  const calDayEl = document.getElementById("cal-day");
  const calYearEl = document.getElementById("cal-year");

  const TYPE_LABELS = {
    "post-mortem": "Post-mortem report",
    "witness-statement": "Witness statement",
    "forensic": "Forensic report",
    "solicitor's letter": "Solicitor's letter",
    "criminal record office extract": "C.R.O. extract",
    "observation report": "Observation report",
    "newspaper clipping": "Press cutting",
    "police report": "Report of officer",
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
  const BROWSE_PLACEHOLDER =
    '<p class="placeholder">Take a document from the folder.</p>';

  const state = {
    caseData: null,
    byId: {},
    activeId: null,
    pinnedId: null,
    reportDraft: {},
    reportAttempts: 0,
    indexQuery: "",
    // Everything under `saved` is persisted to localStorage.
    saved: { highlights: {}, bookmarks: {}, notes: "", drawerOpen: false },
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

  fetch("../cases/case-01.json")
    .then((res) => res.json())
    .then((caseData) => renderCase(caseData))
    .catch((err) => {
      browsePaneEl.innerHTML =
        '<p class="placeholder">Could not load the case file. Are you viewing this over a local server rather than file://?</p>';
      console.error(err);
    });

  function renderCase(caseData) {
    state.caseData = caseData;
    loadSaved();

    caseTitleEl.textContent = caseData.title;
    caseOpensEl.textContent = "Opened " + formatDate(caseData.opens);
    setCalendar(caseData.opens);

    caseData.documents.forEach((doc) => {
      state.byId[doc.id] = doc;
      docListEl.appendChild(buildListItem(doc));
    });

    reportEntryEl.addEventListener("click", () => setActive(REPORT_VIEW));

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

    if (caseData.documents.length > 0) {
      setActive(caseData.documents[0].id);
    }
  }

  function setCalendar(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    calMonthEl.textContent = MONTHS_SHORT[month - 1];
    calDayEl.textContent = String(day);
    calYearEl.textContent = String(year);
  }

  function buildListItem(doc) {
    const item = document.createElement("li");
    item.className = "doc-list-item";
    item.dataset.docId = doc.id;

    const typeLabel = document.createElement("span");
    typeLabel.className = "doc-type-label";
    typeLabel.textContent = TYPE_LABELS[doc.type] || doc.type;

    const titleLabel = document.createElement("span");
    titleLabel.className = "doc-title-label";
    titleLabel.textContent = doc.title;

    const flags = document.createElement("span");
    flags.className = "item-flags";

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

  /* ---------------- navigation ---------------- */

  function setActive(id) {
    state.activeId = id;
    refresh();
  }

  function togglePin(id) {
    state.pinnedId = state.pinnedId === id ? null : id;
    refresh();
  }

  function toggleBookmark(id) {
    if (state.saved.bookmarks[id]) {
      delete state.saved.bookmarks[id];
    } else {
      state.saved.bookmarks[id] = true;
    }
    persist();
    refresh();
  }

  function refresh() {
    hideMarkPopup();
    refreshListClasses();
    refreshPinnedPane();
    refreshBrowsePane();
  }

  function refreshDrawer() {
    const open = state.saved.drawerOpen;
    drawerEl.classList.toggle("open", open);
    deskEl.classList.toggle("drawer-open", open);
    drawerStateEl.textContent = open ? "Close" : "Open";
  }

  function refreshListClasses() {
    docListEl.querySelectorAll(".doc-list-item").forEach((item) => {
      const id = item.dataset.docId;
      item.classList.toggle("active", id === state.activeId);
      item.classList.toggle("pinned", id === state.pinnedId);
      item.classList.toggle("bookmarked", !!state.saved.bookmarks[id]);
    });

    reportEntryEl.classList.toggle(
      "active",
      state.activeId === REPORT_VIEW || state.activeId === "memo"
    );
  }

  function refreshPinnedPane() {
    pinnedPaneEl.innerHTML = "";

    if (!state.pinnedId) {
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

    browsePaneEl.appendChild(buildDocumentSheet(state.byId[state.activeId]));
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

    if ((character.documents || []).length > 0) {
      const refs = document.createElement("p");
      refs.className = "index-card-refs";

      character.documents.forEach((docId) => {
        const doc = state.byId[docId];
        if (!doc) return;
        const link = document.createElement("button");
        link.type = "button";
        link.className = "doc-ref";
        link.textContent = doc.title;
        // The drawer stays open, so a record can be read beside its document.
        link.addEventListener("click", () => setActive(docId));
        refs.appendChild(link);
      });

      card.appendChild(refs);
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
})();
