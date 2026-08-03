(function () {
  "use strict";

  const docListEl = document.getElementById("doc-list");
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

  const BROWSE_PLACEHOLDER =
    '<p class="placeholder">Select a document from the folder to begin reading.</p>';

  const state = {
    byId: {},
    activeId: null,
    pinnedId: null,
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

    const letterhead = document.createElement("header");
    letterhead.className = "letterhead";

    const org = document.createElement("p");
    org.className = "letterhead-org";
    org.textContent = doc.letterhead;

    const sub = document.createElement("p");
    sub.className = "letterhead-sub";
    sub.textContent = doc.subhead;

    letterhead.appendChild(org);
    letterhead.appendChild(sub);

    const meta = document.createElement("dl");
    meta.className = "doc-meta";
    doc.meta.forEach((row) => {
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

    const body = document.createElement("div");
    body.className = "doc-body";
    body.appendChild(renderBody(doc.body));

    sheet.appendChild(pinToggle);
    sheet.appendChild(letterhead);
    sheet.appendChild(meta);
    sheet.appendChild(body);

    return sheet;
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
