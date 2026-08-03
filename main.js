(function () {
  "use strict";

  const docListEl = document.getElementById("doc-list");
  const reportEntryEl = document.getElementById("report-entry");
  const readingAreaEl = document.getElementById("reading-area");
  const pinnedPaneEl = document.getElementById("pinned-pane");
  const browsePaneEl = document.getElementById("browse-pane");
  const caseTitleEl = document.getElementById("case-title");
  const caseOpensEl = document.getElementById("case-opens");

  const TYPE_LABELS = {
    "post-mortem": "Post-mortem report",
    "witness-statement": "Witness statement",
    "forensic": "Forensic report",
  };

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

  // Accepted variants at or below this length must match on word boundaries.
  const SHORT_VARIANT_LENGTH = 3;

  const BROWSE_PLACEHOLDER =
    '<p class="placeholder">Select a document from the folder to begin reading.</p>';

  const state = {
    caseData: null,
    byId: {},
    activeId: null,
    pinnedId: null,
    reportDraft: {},
    reportAttempts: 0,
  };

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
    caseTitleEl.textContent = caseData.title;
    caseOpensEl.textContent = "Opened " + formatDate(caseData.opens);

    caseData.documents.forEach((doc) => {
      state.byId[doc.id] = doc;

      const item = document.createElement("li");
      item.className = "doc-list-item";
      item.dataset.docId = doc.id;

      const typeLabel = document.createElement("span");
      typeLabel.className = "doc-type-label";
      typeLabel.textContent = TYPE_LABELS[doc.type] || doc.type;

      const titleLabel = document.createElement("span");
      titleLabel.className = "doc-title-label";
      titleLabel.textContent = doc.title;

      const pinFlag = document.createElement("span");
      pinFlag.className = "pin-flag";
      pinFlag.textContent = "Pinned";

      item.appendChild(typeLabel);
      item.appendChild(titleLabel);
      item.appendChild(pinFlag);
      item.addEventListener("click", () => setActive(doc.id));

      docListEl.appendChild(item);
    });

    reportEntryEl.addEventListener("click", () => setActive("REPORT_FORM"));

    if (caseData.documents.length > 0) {
      setActive(caseData.documents[0].id);
    }
  }

  function setActive(id) {
    state.activeId = id;
    refresh();
  }

  function togglePin(id) {
    state.pinnedId = state.pinnedId === id ? null : id;
    refresh();
  }

  function refresh() {
    refreshListClasses();
    refreshPinnedPane();
    refreshBrowsePane();
  }

  function refreshListClasses() {
    docListEl.querySelectorAll(".doc-list-item").forEach((item) => {
      const id = item.dataset.docId;
      item.classList.toggle("active", id === state.activeId);
      item.classList.toggle("pinned", id === state.pinnedId);
    });

    reportEntryEl.classList.toggle(
      "active",
      state.activeId === "REPORT_FORM" || state.activeId === "memo"
    );
  }

  function refreshPinnedPane() {
    pinnedPaneEl.innerHTML = "";

    if (!state.pinnedId) {
      readingAreaEl.classList.remove("split");
      return;
    }

    readingAreaEl.classList.add("split");
    pinnedPaneEl.appendChild(buildDocumentSheet(state.byId[state.pinnedId]));
  }

  function refreshBrowsePane() {
    browsePaneEl.innerHTML = "";

    if (!state.activeId) {
      browsePaneEl.innerHTML = BROWSE_PLACEHOLDER;
      return;
    }

    if (state.activeId === "REPORT_FORM") {
      browsePaneEl.appendChild(buildReportForm());
      return;
    }

    browsePaneEl.appendChild(buildDocumentSheet(state.byId[state.activeId]));
  }

  function buildDocumentSheet(doc) {
    const sheet = document.createElement("article");
    sheet.className = "document-sheet";
    sheet.dataset.type = doc.type;
    sheet.style.setProperty("--tilt", tiltForId(doc.id) + "deg");

    const isPinned = doc.id === state.pinnedId;

    const pinToggle = document.createElement("button");
    pinToggle.type = "button";
    pinToggle.className = "pin-toggle" + (isPinned ? " pinned" : "");
    pinToggle.textContent = isPinned ? "Unpin" : "Pin";
    pinToggle.addEventListener("click", () => togglePin(doc.id));

    const body = document.createElement("div");
    body.className = "doc-body";
    body.appendChild(renderBody(doc.body));

    sheet.appendChild(pinToggle);
    sheet.appendChild(buildLetterhead(doc.letterhead, doc.subhead));
    sheet.appendChild(buildMetaList(doc.meta));
    sheet.appendChild(body);

    return sheet;
  }

  function buildReportForm() {
    const sheet = document.createElement("article");
    sheet.className = "document-sheet";
    sheet.dataset.type = "report-form";
    sheet.style.setProperty("--tilt", tiltForId("report-form") + "deg");

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
      value.style.margin = "0";

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

  function tiltForId(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) % 1000;
    }
    return (hash / 1000) * 3 - 1.5;
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return day + " " + months[month - 1] + " " + year;
  }
})();
