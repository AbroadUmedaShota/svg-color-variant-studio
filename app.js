const SVG_NS = "http://www.w3.org/2000/svg";
const STORAGE_KEY = "svg-color-variant-studio-board-v1";
const SOURCE_FILE = "speedad-login-header-logo.svg";
const PAINT_SELECTOR = "g,path,polygon,polyline,circle,ellipse,rect,line";

const PREVIEW_MODES = {
  transparent: { label: "透明", exportBackground: null },
  white: { label: "白", exportBackground: "#ffffff" },
  black: { label: "黒", exportBackground: "#05070a" },
  darkHeader: { label: "濃色ヘッダー", exportBackground: "#111827" },
  lightHeader: { label: "淡色ヘッダー", exportBackground: "#f8fafc" },
  loginHeader: { label: "ログインヘッダー", exportBackground: "#111827" },
};

const PRESETS = [
  ["白抜き", "#ffffff", "#050505", "#111827", "darkHeader"],
  ["反転", "#111827", "#ffffff", "#ffffff", "white"],
  ["SPEEDブルー", "#0f7ccf", "#073b66", "#f8fafc", "lightHeader"],
  ["シアン", "#19c2d1", "#0f3f46", "#101827", "darkHeader"],
  ["シグナルレッド", "#ef4444", "#7f1d1d", "#fff7f7", "lightHeader"],
  ["オレンジ", "#f97316", "#7c2d12", "#111827", "darkHeader"],
  ["ライム", "#a3e635", "#365314", "#101827", "darkHeader"],
  ["ゴールド", "#f4c542", "#7a4f00", "#111827", "darkHeader"],
  ["グラファイト", "#334155", "#020617", "#f8fafc", "lightHeader"],
  ["スレート枠線", "#f8fafc", "#334155", "#ffffff", "white"],
  ["ログイン白", "#ffffff", "#0ea5b7", "#111827", "loginHeader"],
  ["ソフトモノ", "#e2e8f0", "#475569", "#0f172a", "darkHeader"],
];

const LEGACY_PRESET_NAMES = new Map([
  ["White out", "白抜き"],
  ["Reverse", "反転"],
  ["Speed Blue", "SPEEDブルー"],
  ["Cyan", "シアン"],
  ["Signal Red", "シグナルレッド"],
  ["Orange", "オレンジ"],
  ["Lime", "ライム"],
  ["Gold", "ゴールド"],
  ["Graphite", "グラファイト"],
  ["Slate Outline", "スレート枠線"],
  ["Login White", "ログイン白"],
  ["Soft Mono", "ソフトモノ"],
  ["New variant", "新しい候補"],
  ["SVG logo variant", "SVGロゴ候補"],
  ["Variant", "候補"],
]);

const STATUS_LABELS = {
  draft: "下書き",
  candidate: "候補",
  approved: "採用",
};

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
    previewModeTabs: document.getElementById("preview-mode-tabs"),
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

  bindPreviewModeGroup(els.previewModeControls);
  bindPreviewModeGroup(els.previewModeTabs);

  els.addVariantButton.addEventListener("click", addCurrentVariant);
  els.copyPaletteButton.addEventListener("click", copyPaletteJson);
  els.copyCssButton.addEventListener("click", copyCssVariables);
  els.copyInlineButton.addEventListener("click", () => copyText(serializeCurrentSvg(), "インラインSVGをコピーしました"));
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
  let label = "内蔵フォールバック";

  if (location.protocol !== "file:") {
    try {
      const response = await fetch(SOURCE_FILE, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      sourceText = await response.text();
      label = SOURCE_FILE;
    } catch (error) {
      state.sourceWarnings.push(`${SOURCE_FILE} を取得できなかったため、内蔵フォールバックを使用しています。`);
    }
  } else {
    state.sourceWarnings.push("ローカルファイルとして開いているため、ブラウザ制約により内蔵フォールバックを使用しています。");
  }

  try {
    const result = sanitizeSvg(sourceText, label);
    state.sourceDoc = result.doc;
    state.sourceName = label;
    state.sourceWarnings = [...state.sourceWarnings, ...result.warnings];
  } catch (error) {
    const result = sanitizeSvg(fallbackText, "内蔵フォールバック");
    state.sourceDoc = result.doc;
    state.sourceName = "内蔵フォールバック";
    state.sourceWarnings.push(`ソース読み込み失敗: ${error.message}`);
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
    throw new Error(`${sourceLabel} は有効なSVG XMLではありません。`);
  }

  const svg = doc.documentElement;
  if (!svg || svg.localName.toLowerCase() !== "svg") {
    throw new Error("アップロードされたファイルはSVGではありません。");
  }

  const warnings = [];
  const imageCount = doc.getElementsByTagName("image").length;
  if (imageCount > 0) {
    throw new Error("PNGなどのラスタ画像を埋め込んだSVGは、ベクター保持の色編集対象外です。");
  }

  ["script", "foreignObject", "iframe", "object", "embed", "audio", "video", "canvas"].forEach((tag) => {
    const nodes = Array.from(doc.getElementsByTagName(tag));
    nodes.forEach((node) => node.remove());
    if (nodes.length > 0) warnings.push(`安全でない <${tag}> 要素を ${nodes.length} 件削除しました。`);
  });

  const allElements = Array.from(svg.getElementsByTagName("*"));
  allElements.unshift(svg);

  allElements.forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
        warnings.push(`イベント属性 ${attribute.name} を削除しました。`);
        return;
      }
      if (["href", "xlink:href", "src"].includes(name) && /^(https?:|data:|javascript:)/i.test(value)) {
        node.removeAttribute(attribute.name);
        warnings.push(`外部参照属性 ${attribute.name} を削除しました。`);
        return;
      }
      if (name === "style" && /url\s*\(|expression\s*\(/i.test(value)) {
        node.removeAttribute(attribute.name);
        warnings.push("安全でないインラインスタイルを削除しました。");
      }
    });
  });

  if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", SVG_NS);
  if (!svg.getAttribute("role")) svg.setAttribute("role", "img");
  if (!svg.getAttribute("aria-label")) svg.setAttribute("aria-label", "アップロードSVGロゴ");
  if (!svg.querySelector("title")) {
    const title = doc.createElementNS(SVG_NS, "title");
    title.textContent = svg.getAttribute("aria-label") || "アップロードSVGロゴ";
    svg.insertBefore(title, svg.firstChild);
  }

  const pathCount = doc.getElementsByTagName("path").length;
  if (pathCount === 0) {
    warnings.push("<path> 要素がありません。編集可能な図形要素があれば色変更します。");
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
  Array.from(els.previewModeTabs.querySelectorAll("button[data-mode]")).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.current.previewMode));
  });
}

function bindPreviewModeGroup(group) {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    state.current.previewMode = button.dataset.mode;
    renderAll();
  });
}

function renderPreview() {
  const svgText = serializeCurrentSvg();
  els.logoMount.innerHTML = svgText;
  els.previewStage.dataset.mode = state.current.previewMode;
  els.previewStage.style.backgroundColor =
    state.current.previewMode === "transparent" ? state.current.background : "";

  const facts = getSourceFacts();
  els.previewMeta.textContent = `${facts.viewBoxLabel} | path ${facts.pathCount}件`;
  const warningSuffix = state.sourceWarnings.length ? ` | 警告 ${state.sourceWarnings.length}件` : "";
  els.sourceStatus.textContent = `${state.sourceName}${warningSuffix}`;
}

function renderStatus() {
  const facts = getSourceFacts();
  const messages = [
    { type: facts.imageCount === 0 ? "ok" : "error", text: facts.imageCount === 0 ? "ベクター安全" : "ラスタ画像あり" },
    { type: "ok", text: "スクリプト除去済み" },
    { type: facts.hasBase64 ? "error" : "ok", text: facts.hasBase64 ? "Base64をブロック" : "PNG埋め込みなし" },
    { type: "ok", text: "PNG出力準備完了" },
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
  els.variantCount.textContent = `候補 ${state.variants.length}件`;
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
          <input type="text" data-field="name" value="${escapeAttribute(variant.name)}" aria-label="候補名" maxlength="48" />
          ${iconButton("duplicate", "候補を複製", duplicateIcon())}
          ${iconButton("delete", "候補を削除", deleteIcon(), "danger")}
        </div>
        <div class="chip-row" aria-label="候補カラー">
          ${colorChip("塗り", variant.fill)}
          ${colorChip("線", variant.stroke)}
          ${colorChip("背景", variant.background)}
        </div>
        <textarea data-field="note" aria-label="候補メモ" maxlength="160">${escapeHtml(variant.note || "")}</textarea>
        <div class="variant-actions">
          <select data-field="status" aria-label="候補ステータス">
            ${["draft", "candidate", "approved"]
              .map((status) => `<option value="${status}" ${variant.status === status ? "selected" : ""}>${STATUS_LABELS[status]}</option>`)
              .join("")}
          </select>
          <span>
            ${iconButton("apply", "この候補を適用", applyIcon())}
            ${iconButton("export-svg", "SVG出力", downloadIcon())}
            ${iconButton("export-png", "PNG出力", imageIcon())}
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
  showToast("候補を追加しました");
}

function handleVariantAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".variant-card");
  const variant = findVariant(card?.dataset.id);
  if (!variant) return;

  const action = button.dataset.action;
  if (action === "duplicate") {
    state.variants.unshift({ ...variant, id: createId(), name: `${variant.name} のコピー`, status: "draft" });
    saveVariants();
    renderVariants();
    showToast("候補を複製しました");
  }
  if (action === "delete") {
    state.variants = state.variants.filter((item) => item.id !== variant.id);
    saveVariants();
    renderVariants();
    showToast("候補を削除しました");
  }
  if (action === "apply") {
    Object.assign(state.current, pickVariantControls(variant));
    els.variantNameInput.value = variant.name;
    renderAll();
    showToast("候補を適用しました");
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
  showToast("候補ボードをクリアしました");
}

function resetCurrentControls() {
  Object.assign(state.current, {
    fill: "#ffffff",
    stroke: "#050505",
    strokeWidth: 2.4,
    background: "#111827",
    previewMode: "darkHeader",
  });
  els.variantNameInput.value = "新しい候補";
  renderAll();
  showToast("設定をリセットしました");
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
    showToast("出力を中止しました: ラスタ埋め込みを検出しました");
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
  copyText(css, "CSS変数をコピーしました");
}

function copyPaletteJson() {
  const payload = {
    source: state.sourceName,
    generatedAt: new Date().toISOString(),
    variants: state.variants.map(({ id, ...variant }) => variant),
  };
  copyText(JSON.stringify(payload, null, 2), "パレットJSONをコピーしました");
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
  showToast(`${filename} をダウンロードしました`);
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
    showToast("SVGファイルのみ対応しています");
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
    showToast("SVGを読み込みました");
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
    note: index < 4 ? "初期レビュー候補" : "",
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
    showToast("候補ボードをローカル保存できませんでした");
  }
}

function normalizeVariant(input) {
  if (!input || typeof input !== "object") return null;
  return {
    id: String(input.id || createId()),
    name: localizeStoredText(String(input.name || "候補")).slice(0, 48),
    fill: normalizeHex(input.fill, "#ffffff"),
    stroke: normalizeHex(input.stroke, "#050505"),
    strokeWidth: toStrokeWidth(input.strokeWidth),
    background: normalizeHex(input.background, "#111827"),
    previewMode: PREVIEW_MODES[input.previewMode] ? input.previewMode : "darkHeader",
    note: localizeStoredText(String(input.note || "")).slice(0, 160),
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
    viewBoxLabel: svg.getAttribute("viewBox") ? `viewBox ${svg.getAttribute("viewBox")}` : "viewBox未設定",
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
  return els.variantNameInput.value.trim() || "SVGロゴ候補";
}

function localizeStoredText(value) {
  if (LEGACY_PRESET_NAMES.has(value)) return LEGACY_PRESET_NAMES.get(value);
  if (value === "Initial review candidate") return "初期レビュー候補";
  return value;
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
  return String(value || "svg-logo-kouho")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "svg-logo-kouho";
}

function createId(seed = "") {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `variant-${seed}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
