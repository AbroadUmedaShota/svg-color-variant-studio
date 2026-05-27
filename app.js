const SVG_NS = "http://www.w3.org/2000/svg";
const STORAGE_KEY = "svg-color-variant-studio-board-v1";
const SOURCE_FILE = "speedad-login-header-logo.svg";
const PAINT_SELECTOR = "g,path,polygon,polyline,circle,ellipse,rect,line";

const PREVIEW_MODES = {
  transparent: { label: "Transparent", exportBackground: null },
  white: { label: "White", exportBackground: "#ffffff" },
  black: { label: "Black", exportBackground: "#05070a" },
  darkHeader: { label: "Dark Header", exportBackground: "#111827" },
  lightHeader: { label: "Light Header", exportBackground: "#f8fafc" },
  loginHeader: { label: "Login Header", exportBackground: "#111827" },
};

const PRESETS = [
  ["White out", "#ffffff", "#050505", "#111827", "darkHeader"],
  ["Reverse", "#111827", "#ffffff", "#ffffff", "white"],
  ["Speed Blue", "#0f7ccf", "#073b66", "#f8fafc", "lightHeader"],
  ["Cyan", "#19c2d1", "#0f3f46", "#101827", "darkHeader"],
  ["Signal Red", "#ef4444", "#7f1d1d", "#fff7f7", "lightHeader"],
  ["Orange", "#f97316", "#7c2d12", "#111827", "darkHeader"],
  ["Lime", "#a3e635", "#365314", "#101827", "darkHeader"],
  ["Gold", "#f4c542", "#7a4f00", "#111827", "darkHeader"],
  ["Graphite", "#334155", "#020617", "#f8fafc", "lightHeader"],
  ["Slate Outline", "#f8fafc", "#334155", "#ffffff", "white"],
  ["Login White", "#ffffff", "#0ea5b7", "#111827", "loginHeader"],
  ["Soft Mono", "#e2e8f0", "#475569", "#0f172a", "darkHeader"],
];

const state = {
  sourceDoc: null,
  sourceName: SOURCE_FILE,
  sourceWarnings: [],
  current: {
    fill: "#ffffff",
    stroke: "#050505",
    strokeWidth: 2.4,
    background: "#111827",
    previewMode: "darkHeader",
  },
  variants: [],
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindControls();
  renderPresetSwatches();
  state.variants = loadSavedVariants() || createDefaultVariants();
  await loadInitialSvg();
  syncControlsFromState();
  renderAll();
}

function cacheElements() {
  Object.assign(els, {
    sourceStatus: document.getElementById("source-status"),
    fileInput: document.getElementById("svg-file-input"),
    fillPicker: document.getElementById("fill-picker"),
    fillInput: document.getElementById("fill-input"),
    strokePicker: document.getElementById("stroke-picker"),
    strokeInput: document.getElementById("stroke-input"),
    backgroundPicker: document.getElementById("background-picker"),
    backgroundInput: document.getElementById("background-input"),
    strokeWidthRange: document.getElementById("stroke-width-range"),
    strokeWidthInput: document.getElementById("stroke-width-input"),
    previewModeControls: document.getElementById("preview-mode-controls"),
    presetSwatches: document.getElementById("preset-swatches"),
    variantNameInput: document.getElementById("variant-name-input"),
    addVariantButton: document.getElementById("add-variant-button"),
    copyPaletteButton: document.getElementById("copy-palette-button"),
    copyCssButton: document.getElementById("copy-css-button"),
    copyInlineButton: document.getElementById("copy-inline-button"),
    exportSvgButton: document.getElementById("export-svg-button"),
    exportPngButton: document.getElementById("export-png-button"),
    resetButton: document.getElementById("reset-button"),
    clearBoardButton: document.getElementById("clear-board-button"),
    previewMeta: document.getElementById("preview-meta"),
    previewStage: document.getElementById("preview-stage"),
    logoMount: document.getElementById("logo-mount"),
    statusStrip: document.getElementById("status-strip"),
    variantGrid: document.getElementById("variant-grid"),
    variantCount: document.getElementById("variant-count"),
    pngScaleSelect: document.getElementById("png-scale-select"),
    pngBackgroundCheckbox: document.getElementById("png-background-checkbox"),
  });
}

function bindControls() {
  els.fileInput.addEventListener("change", handleFileUpload);
  bindColorPair(els.fillPicker, els.fillInput, "fill");
  bindColorPair(els.strokePicker, els.strokeInput, "stroke");
  bindColorPair(els.backgroundPicker, els.backgroundInput, "background");

  els.strokeWidthRange.addEventListener("input", () => {
    state.current.strokeWidth = toStrokeWidth(els.strokeWidthRange.value);
    els.strokeWidthInput.value = String(state.current.strokeWidth);
    renderAll();
  });

  els.strokeWidthInput.addEventListener("input", () => {
    state.current.strokeWidth = toStrokeWidth(els.strokeWidthInput.value);
    els.strokeWidthRange.value = String(state.current.strokeWidth);
    renderAll();
  });

  els.previewModeControls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    state.current.previewMode = button.dataset.mode;
    renderAll();
  });

  els.addVariantButton.addEventListener("click", addCurrentVariant);
  els.copyPaletteButton.addEventListener("click", copyPaletteJson);
  els.copyCssButton.addEventListener("click", copyCssVariables);
  els.copyInlineButton.addEventListener("click", () => copyText(serializeCurrentSvg(), "Inline SVG copied"));
  els.exportSvgButton.addEventListener("click", () => exportSvg(state.current, getCurrentVariantName()));
  els.exportPngButton.addEventListener("click", () => exportPng(state.current, getCurrentVariantName()));
  els.resetButton.addEventListener("click", resetCurrentControls);
  els.clearBoardButton.addEventListener("click", clearBoard);

  els.variantGrid.addEventListener("click", handleVariantAction);
  els.variantGrid.addEventListener("input", handleVariantEdit);
  els.variantGrid.addEventListener("change", handleVariantEdit);
}

function bindColorPair(picker, input, key) {
  picker.addEventListener("input", () => {
    state.current[key] = normalizeHex(picker.value, state.current[key]);
    input.value = state.current[key].toUpperCase();
    renderAll();
  });

  input.addEventListener("input", () => {
    const normalized = normalizeHex(input.value, null);
    if (!normalized) return;
    state.current[key] = normalized;
    picker.value = normalized;
    input.value = normalized.toUpperCase();
    renderAll();
  });
}

async function loadInitialSvg() {
  const fallbackText = getDefaultTemplateSvgText();
  let sourceText = fallbackText;
  let label = "embedded fallback";

  if (location.protocol !== "file:") {
    try {
      const response = await fetch(SOURCE_FILE, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      sourceText = await response.text();
      label = SOURCE_FILE;
    } catch (error) {
      state.sourceWarnings.push(`Could not fetch ${SOURCE_FILE}; using embedded fallback.`);
    }
  } else {
    state.sourceWarnings.push("Opened as a local file; using embedded fallback for browser file access.");
  }

  try {
    const result = sanitizeSvg(sourceText, label);
    state.sourceDoc = result.doc;
    state.sourceName = label;
    state.sourceWarnings = [...state.sourceWarnings, ...result.warnings];
  } catch (error) {
    const result = sanitizeSvg(fallbackText, "embedded fallback");
    state.sourceDoc = result.doc;
    state.sourceName = "embedded fallback";
    state.sourceWarnings.push(`Source load failed: ${error.message}`);
  }
}

function getDefaultTemplateSvgText() {
  const svg = document.querySelector("#default-logo-template").content.querySelector("svg");
  return new XMLSerializer().serializeToString(svg);
}

function sanitizeSvg(svgText, sourceLabel) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`Invalid SVG XML in ${sourceLabel}`);
  }

  const svg = doc.documentElement;
  if (!svg || svg.localName.toLowerCase() !== "svg") {
    throw new Error("The uploaded file is not an SVG document.");
  }

  const warnings = [];
  const imageCount = doc.getElementsByTagName("image").length;
  if (imageCount > 0) {
    throw new Error("Raster embedded SVG is not supported for vector-safe recoloring.");
  }

  ["script", "foreignObject", "iframe", "object", "embed", "audio", "video", "canvas"].forEach((tag) => {
    const nodes = Array.from(doc.getElementsByTagName(tag));
    nodes.forEach((node) => node.remove());
    if (nodes.length > 0) warnings.push(`Removed ${nodes.length} unsafe <${tag}> element(s).`);
  });

  const allElements = Array.from(svg.getElementsByTagName("*"));
  allElements.unshift(svg);

  allElements.forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
        warnings.push(`Removed event handler attribute ${attribute.name}.`);
        return;
      }
      if (["href", "xlink:href", "src"].includes(name) && /^(https?:|data:|javascript:)/i.test(value)) {
        node.removeAttribute(attribute.name);
        warnings.push(`Removed external reference attribute ${attribute.name}.`);
        return;
      }
      if (name === "style" && /url\s*\(|expression\s*\(/i.test(value)) {
        node.removeAttribute(attribute.name);
        warnings.push("Removed unsafe inline style.");
      }
    });
  });

  if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", SVG_NS);
  if (!svg.getAttribute("role")) svg.setAttribute("role", "img");
  if (!svg.getAttribute("aria-label")) svg.setAttribute("aria-label", "Uploaded SVG logo");
  if (!svg.querySelector("title")) {
    const title = doc.createElementNS(SVG_NS, "title");
    title.textContent = svg.getAttribute("aria-label") || "Uploaded SVG logo";
    svg.insertBefore(title, svg.firstChild);
  }

  const pathCount = doc.getElementsByTagName("path").length;
  if (pathCount === 0) {
    warnings.push("No <path> elements were found; shape elements will still be recolored when possible.");
  }

  return { doc, warnings };
}

function renderAll() {
  if (!state.sourceDoc) return;
  syncControlsFromState();
  renderPreview();
  renderStatus();
  renderVariants();
}

function syncControlsFromState() {
  els.fillPicker.value = state.current.fill;
  els.fillInput.value = state.current.fill.toUpperCase();
  els.strokePicker.value = state.current.stroke;
  els.strokeInput.value = state.current.stroke.toUpperCase();
  els.backgroundPicker.value = state.current.background;
  els.backgroundInput.value = state.current.background.toUpperCase();
  els.strokeWidthRange.value = String(state.current.strokeWidth);
  els.strokeWidthInput.value = String(state.current.strokeWidth);
  Array.from(els.previewModeControls.querySelectorAll("button[data-mode]")).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.current.previewMode));
  });
}

function renderPreview() {
  const svgText = serializeCurrentSvg();
  els.logoMount.innerHTML = svgText;
  els.previewStage.dataset.mode = state.current.previewMode;
  els.previewStage.style.backgroundColor =
    state.current.previewMode === "transparent" ? state.current.background : "";

  const facts = getSourceFacts();
  els.previewMeta.textContent = `${facts.viewBoxLabel} | ${facts.pathCount} path(s)`;
  const warningSuffix = state.sourceWarnings.length ? ` | ${state.sourceWarnings.length} warning(s)` : "";
  els.sourceStatus.textContent = `${state.sourceName}${warningSuffix}`;
}

function renderStatus() {
  const facts = getSourceFacts();
  const messages = [
    { type: facts.imageCount === 0 ? "ok" : "error", text: facts.imageCount === 0 ? "Vector safe" : "Raster image found" },
    { type: "ok", text: "Scripts removed" },
    { type: facts.hasBase64 ? "error" : "ok", text: facts.hasBase64 ? "Base64 blocked" : "No embedded PNG" },
    { type: "ok", text: "PNG export ready" },
  ];

  state.sourceWarnings.forEach((warning) => {
    messages.push({ type: "warn", text: warning });
  });

  els.statusStrip.innerHTML = messages
    .map((message) => `<span class="status-pill ${message.type}">${escapeHtml(message.text)}</span>`)
    .join("");
}

function renderPresetSwatches() {
  els.presetSwatches.innerHTML = PRESETS.map(([name, fill, stroke, background], index) => {
    return `
      <button class="swatch-button" type="button" data-preset-index="${index}" title="${escapeHtml(name)}">
        <span class="swatch-colors" aria-hidden="true">
          <span style="background:${fill}"></span>
          <span style="background:${stroke}"></span>
          <span style="background:${background}"></span>
        </span>
        ${escapeHtml(name)}
      </button>
    `;
  }).join("");

  els.presetSwatches.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-preset-index]");
    if (!button) return;
    const preset = PRESETS[Number(button.dataset.presetIndex)];
    applyPreset(preset);
  });
}

function renderVariants() {
  els.variantCount.textContent = `${state.variants.length} variant${state.variants.length === 1 ? "" : "s"}`;
  els.variantGrid.innerHTML = state.variants.map(renderVariantCard).join("");
}

function renderVariantCard(variant) {
  const svgText = serializeVariantSvg(variant);
  const previewBackground = variant.previewMode === "transparent" ? variant.background : resolvePreviewBackground(variant);
  return `
    <article class="variant-card" data-id="${variant.id}">
      <div class="variant-preview" style="background:${previewBackground}">
        ${svgText}
      </div>
      <div class="variant-body">
        <div class="variant-title-row">
          <input type="text" data-field="name" value="${escapeAttribute(variant.name)}" aria-label="Variant name" maxlength="48" />
          ${iconButton("duplicate", "Duplicate variant", duplicateIcon())}
          ${iconButton("delete", "Delete variant", deleteIcon(), "danger")}
        </div>
        <div class="chip-row" aria-label="Variant colors">
          ${colorChip("Fill", variant.fill)}
          ${colorChip("Stroke", variant.stroke)}
          ${colorChip("BG", variant.background)}
        </div>
        <textarea data-field="note" aria-label="Variant note" maxlength="160">${escapeHtml(variant.note || "")}</textarea>
        <div class="variant-actions">
          <select data-field="status" aria-label="Variant status">
            ${["draft", "candidate", "approved"]
              .map((status) => `<option value="${status}" ${variant.status === status ? "selected" : ""}>${titleCase(status)}</option>`)
              .join("")}
          </select>
          <span>
            ${iconButton("apply", "Apply variant", applyIcon())}
            ${iconButton("export-svg", "Export SVG", downloadIcon())}
            ${iconButton("export-png", "Export PNG", imageIcon())}
          </span>
        </div>
      </div>
    </article>
  `;
}

function colorChip(label, value) {
  return `
    <span class="chip">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value.toUpperCase())}</strong>
    </span>
  `;
}

function iconButton(action, label, svg, extraClass = "") {
  return `
    <button class="icon-button ${extraClass}" type="button" data-action="${action}" aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}">
      ${svg}
    </button>
  `;
}

function applyPreset([name, fill, stroke, background, previewMode]) {
  Object.assign(state.current, { fill, stroke, background, previewMode });
  els.variantNameInput.value = name;
  renderAll();
}

function addCurrentVariant() {
  state.variants.unshift({
    id: createId(),
    name: getCurrentVariantName(),
    fill: state.current.fill,
    stroke: state.current.stroke,
    strokeWidth: state.current.strokeWidth,
    background: state.current.background,
    previewMode: state.current.previewMode,
    note: "",
    status: "candidate",
  });
  saveVariants();
  renderVariants();
  showToast("Variant added");
}

function handleVariantAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".variant-card");
  const variant = findVariant(card?.dataset.id);
  if (!variant) return;

  const action = button.dataset.action;
  if (action === "duplicate") {
    state.variants.unshift({ ...variant, id: createId(), name: `${variant.name} Copy`, status: "draft" });
    saveVariants();
    renderVariants();
    showToast("Variant duplicated");
  }
  if (action === "delete") {
    state.variants = state.variants.filter((item) => item.id !== variant.id);
    saveVariants();
    renderVariants();
    showToast("Variant deleted");
  }
  if (action === "apply") {
    Object.assign(state.current, pickVariantControls(variant));
    els.variantNameInput.value = variant.name;
    renderAll();
    showToast("Variant applied");
  }
  if (action === "export-svg") exportSvg(variant, variant.name);
  if (action === "export-png") exportPng(variant, variant.name);
}

function handleVariantEdit(event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const variant = findVariant(event.target.closest(".variant-card")?.dataset.id);
  if (!variant) return;
  variant[field] = event.target.value;
  saveVariants();
}

function clearBoard() {
  state.variants = [];
  saveVariants();
  renderVariants();
  showToast("Variant board cleared");
}

function resetCurrentControls() {
  Object.assign(state.current, {
    fill: "#ffffff",
    stroke: "#050505",
    strokeWidth: 2.4,
    background: "#111827",
    previewMode: "darkHeader",
  });
  els.variantNameInput.value = "New variant";
  renderAll();
  showToast("Controls reset");
}

function serializeCurrentSvg() {
  return serializeVariantSvg(state.current);
}

function serializeVariantSvg(variant) {
  const svg = createPaintedSvgElement(variant);
  return serializeSvgElement(svg);
}

function createPaintedSvgElement(variant) {
  const svg = state.sourceDoc.documentElement.cloneNode(true);
  svg.setAttribute("xmlns", SVG_NS);

  Array.from(svg.querySelectorAll(PAINT_SELECTOR)).forEach((node) => {
    removePaintStyleProperties(node);
    const localName = node.localName.toLowerCase();
    if (!["line", "polyline"].includes(localName) && node.getAttribute("fill") !== "none") {
      node.setAttribute("fill", variant.fill);
    }
    node.setAttribute("stroke", variant.stroke);
    node.setAttribute("stroke-width", String(variant.strokeWidth));
  });

  return svg;
}

function removePaintStyleProperties(node) {
  const style = node.getAttribute("style");
  if (!style) return;
  const nextStyle = style
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const property = entry.split(":")[0]?.trim().toLowerCase();
      return !["fill", "stroke", "stroke-width"].includes(property);
    })
    .join("; ");
  if (nextStyle) {
    node.setAttribute("style", nextStyle);
  } else {
    node.removeAttribute("style");
  }
}

function serializeSvgElement(svg) {
  const serialized = new XMLSerializer().serializeToString(svg);
  return serialized.startsWith("<svg") ? `${serialized}\n` : serialized;
}

function exportSvg(variant, name) {
  const svgText = serializeVariantSvg(variant);
  if (/data:image\/png|base64/i.test(svgText)) {
    showToast("Export blocked: embedded raster data found");
    return;
  }
  downloadBlob(`${toFileSlug(name)}.svg`, "image/svg+xml;charset=utf-8", svgText);
}

async function exportPng(variant, name) {
  const scale = Number(els.pngScaleSelect.value) || 2;
  const includeBackground = els.pngBackgroundCheckbox.checked;
  const svgText = serializeVariantSvg(variant);
  const { width, height } = getSvgDimensions(state.sourceDoc.documentElement);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const context = canvas.getContext("2d");
  if (includeBackground) {
    context.fillStyle = resolveExportBackground(variant);
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const image = new Image();
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    downloadBlob(`${toFileSlug(name)}-${scale}x.png`, "image/png", pngBlob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function copyCssVariables() {
  const css = [
    ":root {",
    `  --logo-fill: ${state.current.fill};`,
    `  --logo-stroke: ${state.current.stroke};`,
    `  --logo-stroke-width: ${state.current.strokeWidth};`,
    `  --logo-background: ${state.current.background};`,
    "}",
  ].join("\n");
  copyText(css, "CSS variables copied");
}

function copyPaletteJson() {
  const payload = {
    source: state.sourceName,
    generatedAt: new Date().toISOString(),
    variants: state.variants.map(({ id, ...variant }) => variant),
  };
  copyText(JSON.stringify(payload, null, 2), "Palette JSON copied");
}

function copyText(text, successMessage) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast(successMessage),
      () => fallbackCopy(text, successMessage),
    );
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  showToast(successMessage);
}

function downloadBlob(filename, type, data) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`${filename} downloaded`);
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
    showToast("Only SVG files are supported");
    event.target.value = "";
    return;
  }

  try {
    const text = await file.text();
    const result = sanitizeSvg(text, file.name);
    state.sourceDoc = result.doc;
    state.sourceName = file.name;
    state.sourceWarnings = result.warnings;
    renderAll();
    showToast("SVG loaded");
  } catch (error) {
    state.sourceWarnings = [error.message];
    renderStatus();
    showToast(error.message);
  } finally {
    event.target.value = "";
  }
}

function createDefaultVariants() {
  return PRESETS.map(([name, fill, stroke, background, previewMode], index) => ({
    id: createId(index),
    name,
    fill,
    stroke,
    strokeWidth: index === 1 ? 1.8 : 2.4,
    background,
    previewMode,
    note: index < 4 ? "Initial review candidate" : "",
    status: index < 3 ? "candidate" : "draft",
  }));
}

function loadSavedVariants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(normalizeVariant).filter(Boolean);
  } catch {
    return null;
  }
}

function saveVariants() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.variants));
  } catch {
    showToast("Board could not be saved locally");
  }
}

function normalizeVariant(input) {
  if (!input || typeof input !== "object") return null;
  return {
    id: String(input.id || createId()),
    name: String(input.name || "Variant").slice(0, 48),
    fill: normalizeHex(input.fill, "#ffffff"),
    stroke: normalizeHex(input.stroke, "#050505"),
    strokeWidth: toStrokeWidth(input.strokeWidth),
    background: normalizeHex(input.background, "#111827"),
    previewMode: PREVIEW_MODES[input.previewMode] ? input.previewMode : "darkHeader",
    note: String(input.note || "").slice(0, 160),
    status: ["draft", "candidate", "approved"].includes(input.status) ? input.status : "draft",
  };
}

function pickVariantControls(variant) {
  return {
    fill: variant.fill,
    stroke: variant.stroke,
    strokeWidth: variant.strokeWidth,
    background: variant.background,
    previewMode: variant.previewMode,
  };
}

function findVariant(id) {
  return state.variants.find((variant) => variant.id === id);
}

function resolvePreviewBackground(variant) {
  return PREVIEW_MODES[variant.previewMode]?.exportBackground || variant.background;
}

function resolveExportBackground(variant) {
  return PREVIEW_MODES[variant.previewMode]?.exportBackground || variant.background;
}

function getSourceFacts() {
  const svg = state.sourceDoc.documentElement;
  const serialized = serializeSvgElement(svg);
  return {
    viewBoxLabel: svg.getAttribute("viewBox") ? `viewBox ${svg.getAttribute("viewBox")}` : "viewBox unavailable",
    pathCount: svg.getElementsByTagName("path").length,
    imageCount: svg.getElementsByTagName("image").length,
    hasBase64: /data:image\/png|base64/i.test(serialized),
  };
}

function getSvgDimensions(svg) {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  const width = Number.parseFloat(svg.getAttribute("width")) || 1200;
  const height = Number.parseFloat(svg.getAttribute("height")) || 900;
  return { width, height };
}

function getCurrentVariantName() {
  return els.variantNameInput.value.trim() || "SVG logo variant";
}

function normalizeHex(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  const expanded = trimmed.replace(/^#([0-9a-f]{3})$/i, (_, hex) => {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  });
  if (/^#[0-9a-f]{6}$/i.test(expanded)) return expanded.toLowerCase();
  return fallback;
}

function toStrokeWidth(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 2.4;
  return Math.min(12, Math.max(0, Math.round(number * 10) / 10));
}

function toFileSlug(value) {
  return String(value || "svg-logo-variant")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "svg-logo-variant";
}

function createId(seed = "") {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `variant-${seed}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function duplicateIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M8 8h11v11H8z"/><path d="M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/></svg>';
}

function deleteIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>';
}

function applyIcon() {
  return '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>';
}

function downloadIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
}

function imageIcon() {
  return '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="m4 15 4-4 4 4 3-3 5 5"/><path d="M15 9h.01"/></svg>';
}
