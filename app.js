const SVG_NS = "http://www.w3.org/2000/svg";
const STORAGE_KEY = "svg-color-variant-studio-board-v1";
const BOARD_COLLAPSED_STORAGE_KEY = "svg-color-variant-studio-board-collapsed-v1";
const THEME_STORAGE_KEY = "svg-color-variant-studio-theme-v1";
const SOURCE_FILE = "speedad-login-header-logo.svg";
const PAINT_SELECTOR = "g,path,polygon,polyline,circle,ellipse,rect,line";
const PART_SELECTOR = "path,polygon,polyline,circle,ellipse,rect,line";

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

const PART_LABELS = {
  path: "パス",
  polygon: "多角形",
  polyline: "折れ線",
  circle: "円",
  ellipse: "楕円",
  rect: "矩形",
  line: "線",
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
    paintTarget: "all",
    selectedPartId: null,
    partOverrides: {},
  },
  variants: [],
  sourceParts: [],
  parts: [],
  expandedPartIds: {},
  boardCollapsed: false,
  theme: "light",
  hoveredPartId: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  state.theme = loadTheme();
  applyTheme();
  bindControls();
  renderPresetSwatches();
  state.variants = loadSavedVariants() || createDefaultVariants();
  state.boardCollapsed = loadBoardCollapsed();
  await loadInitialSvg();
  syncControlsFromState();
  renderAll();
}

function cacheElements() {
  Object.assign(els, {
    studioShell: document.querySelector(".studio-shell"),
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
    validationPanel: document.getElementById("validation-panel"),
    paintTargetControls: document.getElementById("paint-target-controls"),
    partList: document.getElementById("part-list"),
    selectedPartSummary: document.getElementById("selected-part-summary"),
    partEditSummary: document.getElementById("part-edit-summary"),
    splitPartButton: document.getElementById("split-part-button"),
    clearPartOverrideButton: document.getElementById("clear-part-override-button"),
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
    themeToggleButton: document.getElementById("theme-toggle-button"),
    resetButton: document.getElementById("reset-button"),
    variantPanel: document.getElementById("variant-panel"),
    toggleBoardButton: document.getElementById("toggle-board-button"),
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
    setActiveStrokeWidth(toStrokeWidth(els.strokeWidthRange.value));
    els.strokeWidthInput.value = String(getActivePaintValues().strokeWidth);
    renderAll();
  });

  els.strokeWidthInput.addEventListener("input", () => {
    setActiveStrokeWidth(toStrokeWidth(els.strokeWidthInput.value));
    els.strokeWidthRange.value = String(getActivePaintValues().strokeWidth);
    renderAll();
  });

  bindPaintTargetGroup(els.paintTargetControls);
  bindPreviewModeGroup(els.previewModeControls);
  bindPreviewModeGroup(els.previewModeTabs);

  els.addVariantButton.addEventListener("click", addCurrentVariant);
  els.copyPaletteButton.addEventListener("click", copyPaletteJson);
  els.copyCssButton.addEventListener("click", copyCssVariables);
  els.copyInlineButton.addEventListener("click", () => copyText(serializeCurrentSvg(), "インラインSVGをコピーしました"));
  els.exportSvgButton.addEventListener("click", () => exportSvg(state.current, getCurrentVariantName()));
  els.exportPngButton.addEventListener("click", () => exportPng(state.current, getCurrentVariantName()));
  els.themeToggleButton.addEventListener("click", toggleTheme);
  els.resetButton.addEventListener("click", resetCurrentControls);
  els.toggleBoardButton.addEventListener("click", toggleVariantBoard);
  els.clearBoardButton.addEventListener("click", clearBoard);
  els.splitPartButton.addEventListener("click", toggleSelectedPartSplit);
  els.clearPartOverrideButton.addEventListener("click", clearSelectedPartOverride);
  els.partList.addEventListener("click", handlePartListClick);
  els.partList.addEventListener("mouseover", handlePartListPointerOver);
  els.partList.addEventListener("mouseout", handlePartListPointerOut);
  els.partList.addEventListener("focusin", handlePartListFocusIn);
  els.partList.addEventListener("focusout", handlePartListFocusOut);
  els.logoMount.addEventListener("click", handlePreviewPartClick);
  els.logoMount.addEventListener("keydown", handlePreviewPartKeydown);
  els.logoMount.addEventListener("mouseover", handlePreviewPartPointerOver);
  els.logoMount.addEventListener("mouseout", handlePreviewPartPointerOut);
  els.logoMount.addEventListener("focusin", handlePreviewPartFocusIn);
  els.logoMount.addEventListener("focusout", handlePreviewPartFocusOut);

  els.variantGrid.addEventListener("click", handleVariantAction);
  els.variantGrid.addEventListener("input", handleVariantEdit);
  els.variantGrid.addEventListener("change", handleVariantEdit);
}

function bindColorPair(picker, input, key) {
  picker.addEventListener("input", () => {
    setActiveColor(key, normalizeHex(picker.value, getActivePaintValues()[key]));
    input.value = getActivePaintValues()[key].toUpperCase();
    renderAll();
  });

  input.addEventListener("input", () => {
    const normalized = normalizeHex(input.value, null);
    if (!normalized) return;
    setActiveColor(key, normalized);
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
    rebuildParts();
  } catch (error) {
    const result = sanitizeSvg(fallbackText, "内蔵フォールバック");
    state.sourceDoc = result.doc;
    state.sourceName = "内蔵フォールバック";
    state.sourceWarnings.push(`ソース読み込み失敗: ${error.message}`);
    rebuildParts();
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
  renderValidation();
  renderParts();
  renderVariants();
  syncPartInteractionState();
}

function syncControlsFromState() {
  renderThemeControl();
  const activePaint = getActivePaintValues();
  els.fillPicker.value = activePaint.fill;
  els.fillInput.value = activePaint.fill.toUpperCase();
  els.strokePicker.value = activePaint.stroke;
  els.strokeInput.value = activePaint.stroke.toUpperCase();
  els.backgroundPicker.value = state.current.background;
  els.backgroundInput.value = state.current.background.toUpperCase();
  els.strokeWidthRange.value = String(activePaint.strokeWidth);
  els.strokeWidthInput.value = String(activePaint.strokeWidth);
  Array.from(els.paintTargetControls.querySelectorAll("button[data-target]")).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.target === state.current.paintTarget));
  });
  Array.from(els.previewModeControls.querySelectorAll("button[data-mode]")).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.current.previewMode));
  });
  Array.from(els.previewModeTabs.querySelectorAll("button[data-mode]")).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.current.previewMode));
  });
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveTheme();
  showToast(state.theme === "dark" ? "ダークモードに切り替えました" : "ライトモードに切り替えました");
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  renderThemeControl();
}

function renderThemeControl() {
  if (!els.themeToggleButton) return;
  const isDark = state.theme === "dark";
  els.themeToggleButton.setAttribute("aria-pressed", String(isDark));
  els.themeToggleButton.textContent = isDark ? "ライトモード" : "ダークモード";
  els.themeToggleButton.title = isDark ? "ライトモードへ切り替え" : "ダークモードへ切り替え";
}

function bindPaintTargetGroup(group) {
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-target]");
    if (!button) return;
    setPaintTarget(button.dataset.target);
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
  const svgText = serializeCurrentSvg({ annotateParts: true });
  els.logoMount.innerHTML = svgText;
  els.previewStage.dataset.mode = state.current.previewMode;
  els.previewStage.style.backgroundColor =
    state.current.previewMode === "transparent" ? state.current.background : "";

  const facts = getSourceFacts();
  els.previewMeta.textContent = `${facts.viewBoxLabel} | パス${facts.pathCount}件 | 詳細候補${facts.subpathCount}件`;
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

function renderValidation() {
  const validation = assessVariantVisibility(state.current);
  els.validationPanel.innerHTML = `
    <div class="validation-summary">
      <span class="validation-badge is-${validation.rating}">${escapeHtml(validation.label)}</span>
      <span>${escapeHtml(validation.backgroundLabel)} / ${escapeHtml(validation.background.toUpperCase())}</span>
    </div>
    <div class="validation-metrics" aria-label="現在の色検証結果">
      ${validationMetric("塗り対背景", validation.fillContrast)}
      ${validationMetric("線対背景", validation.strokeContrast)}
      ${validationMetric("塗り対線", validation.fillStrokeContrast)}
    </div>
    <p class="validation-note">${escapeHtml(validation.warnings[0] || "現在の背景で主要色は確認しやすい状態です。")}</p>
  `;
}

function validationMetric(label, value) {
  return `
    <span class="validation-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${formatContrast(value)}:1</strong>
    </span>
  `;
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

function renderParts() {
  const selectedPart = getSelectedPart();
  const selectedHasOverride = selectedPart ? hasPartOverride(selectedPart.id) : false;
  els.selectedPartSummary.textContent = selectedPart
    ? `選択中: ${selectedPart.label} / ${getPartOverrideLabel(selectedPart.id)}`
    : "パーツを選択すると個別に色を変更できます。";
  els.clearPartOverrideButton.disabled = !selectedPart || !selectedHasOverride;
  renderSplitControl(selectedPart);
  renderPartEditSummary(selectedPart);

  if (state.parts.length === 0) {
    els.partList.innerHTML = '<p class="hint">編集できるSVGパーツがありません。</p>';
    return;
  }

  els.partList.innerHTML = state.parts.map((part) => {
    const colors = getPartPaintValues(part.id);
    const selected = part.id === state.current.selectedPartId;
    const hovered = part.id === state.hoveredPartId;
    const splitCountText = part.subpathCount > 1 && !part.isSubpath ? ` / 詳細${part.subpathCount}件` : "";
    return `
      <button class="part-button" type="button" role="option" data-part-id="${part.id}" data-part-hovered="${hovered}" data-part-kind="${part.isSubpath ? "subpath" : "base"}" aria-selected="${selected}" title="${escapeAttribute(part.label)}">
        <span>
          <strong>${escapeHtml(part.label)}</strong>
          <small class="part-live-state">${escapeHtml(getPartStateLabel(part.id))}${escapeHtml(splitCountText)}</small>
        </span>
        <span class="part-color-dots" aria-hidden="true">
          <span style="background:${colors.fill}"></span>
          <span style="background:${colors.stroke}"></span>
        </span>
      </button>
    `;
  }).join("");
}

function renderSplitControl(selectedPart) {
  const splitTarget = getSplitTargetPart(selectedPart);
  const canSplit = Boolean(splitTarget && splitTarget.subpathCount > 1);
  els.splitPartButton.disabled = !canSplit;
  if (!canSplit) {
    els.splitPartButton.textContent = "詳細分割";
    els.splitPartButton.title = "複数サブパスを持つパスだけ詳細分割できます";
    return;
  }
  const expanded = Boolean(state.expandedPartIds[splitTarget.id]);
  els.splitPartButton.textContent = expanded ? "分割を閉じる" : "詳細分割";
  els.splitPartButton.title = expanded
    ? `${splitTarget.label} の詳細分割を閉じます`
    : `${splitTarget.label} を ${splitTarget.subpathCount} 個のサブパスへ分割します`;
}

function getPartStateLabel(partId) {
  const overrideText = getPartOverrideLabel(partId);
  if (partId === state.current.selectedPartId) return `選択中 / ${overrideText}`;
  if (partId === state.hoveredPartId) return `ホバー中 / ${overrideText}`;
  return overrideText;
}

function getPartOverrideLabel(partId) {
  if (hasPartOverride(partId)) return "個別指定あり";
  if (!isSubpathPartId(partId) && hasSubpathOverride(partId)) return "詳細指定あり";
  return "全体色";
}

function renderPartEditSummary(selectedPart) {
  if (!selectedPart) {
    els.partEditSummary.hidden = true;
    els.partEditSummary.innerHTML = "";
    return;
  }

  const colors = getPartPaintValues(selectedPart.id);
  const overrideText = getPartOverrideLabel(selectedPart.id);
  const splitText = selectedPart.isSubpath
    ? "詳細分割パーツ"
    : selectedPart.subpathCount > 1
      ? `詳細分割可: ${selectedPart.subpathCount}件`
      : "通常パーツ";
  const hasEvenOddWarning = selectedPart.parentHasEvenOdd || selectedPart.hasEvenOdd;
  els.partEditSummary.hidden = false;
  els.partEditSummary.innerHTML = `
    <div class="part-edit-title">
      <strong>編集中: ${escapeHtml(selectedPart.label)}</strong>
      <span>${escapeHtml(overrideText)}</span>
    </div>
    <p class="part-edit-note">${escapeHtml(splitText)}${hasEvenOddWarning ? " / 分割時は見た目差分に注意" : ""}</p>
    <div class="part-edit-values" aria-label="選択中パーツの色">
      ${partEditChip("塗り", colors.fill)}
      ${partEditChip("線", colors.stroke)}
      ${partEditChip("線幅", String(colors.strokeWidth))}
    </div>
  `;
}

function partEditChip(label, value) {
  return `
    <span class="part-edit-chip">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value.toUpperCase ? value.toUpperCase() : value)}</strong>
    </span>
  `;
}

function renderVariants() {
  els.variantCount.textContent = `候補 ${state.variants.length}件`;
  els.variantGrid.innerHTML = state.variants.map(renderVariantCard).join("");
  renderBoardCollapsedState();
}

function renderVariantCard(variant) {
  const svgText = serializeVariantSvg(variant);
  const previewBackground = variant.previewMode === "transparent" ? variant.background : resolvePreviewBackground(variant);
  const validation = assessVariantVisibility(variant);
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
        <span class="visibility-badge is-${validation.rating}" title="${escapeAttribute(validation.warnings.join(" / ") || "視認性は良好です")}">
          視認性 ${escapeHtml(validation.label)} ${formatContrast(Math.max(validation.fillContrast, validation.strokeContrast))}:1
        </span>
        ${partOverrideCount(variant) > 0 ? `<span class="part-summary">部分塗り ${partOverrideCount(variant)}件</span>` : ""}
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

function handlePartListClick(event) {
  const button = event.target.closest("button[data-part-id]");
  if (!button) return;
  selectPart(button.dataset.partId);
}

function handlePartListPointerOver(event) {
  const button = event.target.closest("button[data-part-id]");
  if (!button || !els.partList.contains(button)) return;
  setHoveredPart(button.dataset.partId);
}

function handlePartListPointerOut(event) {
  const button = event.target.closest("button[data-part-id]");
  if (!button || !els.partList.contains(button)) return;
  const nextButton = event.relatedTarget?.closest?.("button[data-part-id]");
  setHoveredPart(nextButton && els.partList.contains(nextButton) ? nextButton.dataset.partId : null);
}

function handlePartListFocusIn(event) {
  const button = event.target.closest("button[data-part-id]");
  if (!button || !els.partList.contains(button)) return;
  setHoveredPart(button.dataset.partId);
}

function handlePartListFocusOut(event) {
  const nextButton = event.relatedTarget?.closest?.("button[data-part-id]");
  setHoveredPart(nextButton && els.partList.contains(nextButton) ? nextButton.dataset.partId : null);
}

function handlePreviewPartClick(event) {
  const target = event.target.closest("[data-part-id]");
  if (!target || !els.logoMount.contains(target)) return;
  selectPart(target.dataset.partId);
}

function handlePreviewPartKeydown(event) {
  if (!["Enter", " "].includes(event.key)) return;
  const target = event.target.closest("[data-part-id]");
  if (!target || !els.logoMount.contains(target)) return;
  event.preventDefault();
  selectPart(target.dataset.partId);
}

function handlePreviewPartPointerOver(event) {
  const target = event.target.closest("[data-part-id]");
  if (!target || !els.logoMount.contains(target)) return;
  setHoveredPart(target.dataset.partId);
}

function handlePreviewPartPointerOut(event) {
  const target = event.target.closest("[data-part-id]");
  if (!target || !els.logoMount.contains(target)) return;
  const nextTarget = event.relatedTarget?.closest?.("[data-part-id]");
  setHoveredPart(nextTarget && els.logoMount.contains(nextTarget) ? nextTarget.dataset.partId : null);
}

function handlePreviewPartFocusIn(event) {
  const target = event.target.closest("[data-part-id]");
  if (!target || !els.logoMount.contains(target)) return;
  setHoveredPart(target.dataset.partId);
}

function handlePreviewPartFocusOut(event) {
  const nextTarget = event.relatedTarget?.closest?.("[data-part-id]");
  setHoveredPart(nextTarget && els.logoMount.contains(nextTarget) ? nextTarget.dataset.partId : null);
}

function selectPart(partId) {
  if (!getKnownPartIds().has(partId)) return;
  if (isSubpathPartId(partId)) {
    state.expandedPartIds[getParentPartId(partId)] = true;
    rebuildVisibleParts();
  }
  state.current.selectedPartId = partId;
  state.current.paintTarget = "part";
  state.hoveredPartId = null;
  renderAll();
}

function setPaintTarget(target) {
  state.current.paintTarget = target === "part" ? "part" : "all";
  if (state.current.paintTarget === "part" && !getSelectedPart() && state.parts.length > 0) {
    state.current.selectedPartId = state.parts[0].id;
  }
  state.hoveredPartId = null;
  renderAll();
}

function toggleSelectedPartSplit() {
  const splitTarget = getSplitTargetPart(getSelectedPart());
  if (!splitTarget || splitTarget.subpathCount <= 1) return;

  const expanded = Boolean(state.expandedPartIds[splitTarget.id]);
  if (expanded) {
    delete state.expandedPartIds[splitTarget.id];
    if (state.current.selectedPartId === splitTarget.id || getParentPartId(state.current.selectedPartId) === splitTarget.id) {
      state.current.selectedPartId = splitTarget.id;
    }
    state.hoveredPartId = null;
    rebuildVisibleParts();
    renderAll();
    showToast(`${splitTarget.label} の詳細分割を閉じました`);
    return;
  }

  state.expandedPartIds[splitTarget.id] = true;
  state.current.paintTarget = "part";
  state.current.selectedPartId = makeSubpathPartId(splitTarget.id, 0);
  state.hoveredPartId = null;
  rebuildVisibleParts();
  renderAll();
  showToast(`${splitTarget.label} を ${splitTarget.subpathCount}件に詳細分割しました`);
}

function setHoveredPart(partId) {
  const nextPartId = state.parts.some((part) => part.id === partId) ? partId : null;
  if (state.hoveredPartId === nextPartId) return;
  state.hoveredPartId = nextPartId;
  syncPartInteractionState();
}

function syncPartInteractionState() {
  const selectedPart = getSelectedPart();
  const hoveredPart = state.parts.find((part) => part.id === state.hoveredPartId) || null;

  Array.from(els.partList.querySelectorAll("button[data-part-id]")).forEach((button) => {
    const hovered = button.dataset.partId === state.hoveredPartId;
    const selected = button.dataset.partId === state.current.selectedPartId;
    button.dataset.partHovered = String(hovered);
    button.setAttribute("aria-selected", String(selected));
    const stateLabel = button.querySelector(".part-live-state");
    if (stateLabel) stateLabel.textContent = getPartStateLabel(button.dataset.partId);
  });

  Array.from(els.logoMount.querySelectorAll("[data-part-id]")).forEach((node) => {
    const hovered = node.getAttribute("data-part-id") === state.hoveredPartId;
    const selected = node.getAttribute("data-part-id") === state.current.selectedPartId;
    node.toggleAttribute("data-part-hovered", hovered);
    node.toggleAttribute("data-part-selected", selected);
  });

  appendPartHighlightLayer(els.logoMount.querySelector("svg"));
  renderPreviewPartBadge(hoveredPart, selectedPart);
}

function renderPreviewPartBadge(hoveredPart, selectedPart) {
  els.logoMount.querySelector(".part-edit-badge")?.remove();
  const hoveringDifferentPart = hoveredPart && hoveredPart.id !== selectedPart?.id;
  const activePart = hoveringDifferentPart ? hoveredPart : selectedPart || hoveredPart;
  if (!activePart) return;

  const badge = document.createElement("div");
  badge.className = "part-edit-badge";
  badge.textContent = `${hoveringDifferentPart ? "確認中" : "編集中"}: ${activePart.label}`;
  els.logoMount.appendChild(badge);
}

function clearSelectedPartOverride() {
  const selectedPart = getSelectedPart();
  if (!selectedPart) return;
  delete state.current.partOverrides[selectedPart.id];
  renderAll();
  showToast(`${selectedPart.label}の個別指定を解除しました`);
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
    partOverrides: clonePartOverrides(state.current.partOverrides),
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
    state.variants.unshift({
      ...variant,
      id: createId(),
      name: `${variant.name} のコピー`,
      partOverrides: clonePartOverrides(variant.partOverrides),
      status: "draft",
    });
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

function toggleVariantBoard() {
  state.boardCollapsed = !state.boardCollapsed;
  saveBoardCollapsed();
  renderBoardCollapsedState();
  showToast(state.boardCollapsed ? "候補ボードを折りたたみました" : "候補ボードを展開しました");
}

function renderBoardCollapsedState() {
  els.studioShell.classList.toggle("board-collapsed", state.boardCollapsed);
  els.variantPanel.classList.toggle("is-collapsed", state.boardCollapsed);
  els.toggleBoardButton.setAttribute("aria-expanded", String(!state.boardCollapsed));
  els.toggleBoardButton.textContent = state.boardCollapsed ? "展開" : "折りたたむ";
  els.variantGrid.hidden = state.boardCollapsed;
  els.clearBoardButton.hidden = state.boardCollapsed;
}

function resetCurrentControls() {
  Object.assign(state.current, {
    fill: "#ffffff",
    stroke: "#050505",
    strokeWidth: 2.4,
    background: "#111827",
    previewMode: "darkHeader",
    paintTarget: "all",
    selectedPartId: null,
    partOverrides: {},
  });
  state.expandedPartIds = {};
  state.hoveredPartId = null;
  rebuildVisibleParts();
  els.variantNameInput.value = "新しい候補";
  renderAll();
  showToast("設定をリセットしました");
}

function serializeCurrentSvg(options = {}) {
  return serializeVariantSvg(state.current, options);
}

function serializeVariantSvg(variant, options = {}) {
  const svg = createPaintedSvgElement(variant, options);
  return serializeSvgElement(svg);
}

function createPaintedSvgElement(variant, options = {}) {
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

  Array.from(svg.querySelectorAll(PART_SELECTOR)).forEach((node, index) => {
    const sourcePart = state.sourceParts[index] || createFallbackPart(index, node.localName);
    if (shouldSplitSourcePart(sourcePart, variant, options)) {
      replaceNodeWithSubpaths(node, sourcePart, variant, options);
      return;
    }

    const override = variant.partOverrides?.[sourcePart.id];
    if (override) {
      applyPartOverride(node, override, sourcePart);
    }
    if (options.annotateParts) {
      annotatePartNode(node, sourcePart.id, sourcePart.label);
    }
  });

  if (options.annotateParts) {
    appendPartHighlightLayer(svg);
  }

  return svg;
}

function appendPartHighlightLayer(svg) {
  if (!svg) return;
  svg.querySelector(".part-highlight-layer")?.remove();

  const highlights = [];
  if (state.current.selectedPartId) {
    highlights.push({ id: state.current.selectedPartId, kind: "selected" });
  }
  if (state.hoveredPartId && state.hoveredPartId !== state.current.selectedPartId) {
    highlights.push({ id: state.hoveredPartId, kind: "hovered" });
  }
  if (highlights.length === 0) return;

  const partNodes = new Map();
  Array.from(svg.querySelectorAll("[data-part-id]")).forEach((node) => {
    const partId = node.getAttribute("data-part-id");
    if (!partNodes.has(partId)) partNodes.set(partId, []);
    partNodes.get(partId).push(node);
  });
  const layer = svg.ownerDocument.createElementNS(SVG_NS, "g");
  layer.setAttribute("class", "part-highlight-layer");
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("focusable", "false");

  highlights.forEach(({ id, kind }) => {
    const sourceNodes = partNodes.get(id) || [];
    sourceNodes.forEach((sourceNode) => {
      const clone = sourceNode.cloneNode(true);
      ["data-part-id", "data-part-hovered", "data-part-selected", "tabindex", "role", "aria-label"].forEach((attribute) => {
        clone.removeAttribute(attribute);
      });
      clone.setAttribute("class", `part-highlight-outline is-${kind}`);
      clone.setAttribute("fill", "none");
      clone.setAttribute("pointer-events", "none");
      clone.setAttribute("vector-effect", "non-scaling-stroke");
      layer.appendChild(clone);
    });
  });

  if (layer.childNodes.length > 0) {
    svg.appendChild(layer);
  }
}

function shouldSplitSourcePart(sourcePart, variant, options = {}) {
  if (!sourcePart || sourcePart.localName !== "path" || sourcePart.subpathCount <= 1) return false;
  if (options.annotateParts && state.expandedPartIds[sourcePart.id]) return true;
  return hasSubpathOverride(sourcePart.id, variant);
}

function replaceNodeWithSubpaths(node, sourcePart, variant, options = {}) {
  const parent = node.parentNode;
  if (!parent || !sourcePart.subpaths?.length) return;

  sourcePart.subpaths.forEach((subpath, subpathIndex) => {
    const subpathPart = createSubpathPart(sourcePart, subpathIndex);
    const subpathNode = node.cloneNode(false);
    subpathNode.setAttribute("d", subpath.d);

    const sourceOverride = variant.partOverrides?.[sourcePart.id];
    if (sourceOverride) {
      applyPartOverride(subpathNode, sourceOverride, sourcePart);
    }

    const override = variant.partOverrides?.[subpathPart.id];
    if (override) {
      applyPartOverride(subpathNode, override, sourcePart);
    }

    if (options.annotateParts) {
      const annotateAsSubpath = Boolean(state.expandedPartIds[sourcePart.id]);
      annotatePartNode(
        subpathNode,
        annotateAsSubpath ? subpathPart.id : sourcePart.id,
        annotateAsSubpath ? subpathPart.label : sourcePart.label,
      );
    }

    parent.insertBefore(subpathNode, node);
  });

  parent.removeChild(node);
}

function annotatePartNode(node, partId, label) {
  node.setAttribute("data-part-id", partId);
  node.setAttribute("tabindex", "0");
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", `${label}を選択`);
  if (partId === state.hoveredPartId) {
    node.setAttribute("data-part-hovered", "true");
  }
  if (partId === state.current.selectedPartId) {
    node.setAttribute("data-part-selected", "true");
  }
}

function applyPartOverride(node, override, sourcePart) {
  removePaintStyleProperties(node);
  const localName = node.localName.toLowerCase();
  const canFill = !["line", "polyline"].includes(localName) && !sourcePart?.sourceFillNone;
  if (override.fill && canFill) node.setAttribute("fill", override.fill);
  if (override.stroke) node.setAttribute("stroke", override.stroke);
  if (Number.isFinite(Number(override.strokeWidth))) node.setAttribute("stroke-width", String(override.strokeWidth));
}

function createFallbackPart(index, localName) {
  const normalizedName = String(localName || "path").toLowerCase();
  return {
    id: `part-${index + 1}`,
    label: `${PART_LABELS[normalizedName] || "パーツ"}${index + 1}`,
    localName: normalizedName,
    sourceIndex: index,
    isSubpath: false,
    subpaths: [],
    subpathCount: 0,
    hasEvenOdd: false,
    sourceFillNone: false,
  };
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
    ...formatPartCssVariables(state.current.partOverrides),
    "}",
  ].join("\n");
  copyText(css, "CSS変数をコピーしました");
}

function formatPartCssVariables(partOverrides) {
  return Object.entries(normalizePartOverrides(partOverrides)).flatMap(([partId, override]) => {
    const cssPartId = formatCssPartId(partId);
    const lines = [];
    if (override.fill) lines.push(`  --logo-${cssPartId}-fill: ${override.fill};`);
    if (override.stroke) lines.push(`  --logo-${cssPartId}-stroke: ${override.stroke};`);
    if (override.strokeWidth !== undefined) lines.push(`  --logo-${cssPartId}-stroke-width: ${override.strokeWidth};`);
    return lines;
  });
}

function formatCssPartId(partId) {
  return String(partId || "part")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "part";
}

function copyPaletteJson() {
  const payload = {
    source: state.sourceName,
    generatedAt: new Date().toISOString(),
    variants: state.variants.map(({ id, ...variant }) => ({
      ...variant,
      validation: assessVariantVisibility(variant),
    })),
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
    state.current.paintTarget = "all";
    state.current.selectedPartId = null;
    state.current.partOverrides = {};
    state.expandedPartIds = {};
    state.hoveredPartId = null;
    rebuildParts();
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
    partOverrides: {},
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

function loadBoardCollapsed() {
  try {
    return localStorage.getItem(BOARD_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveBoardCollapsed() {
  try {
    localStorage.setItem(BOARD_COLLAPSED_STORAGE_KEY, String(state.boardCollapsed));
  } catch {
    showToast("候補ボードの開閉状態を保存できませんでした");
  }
}

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveTheme() {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  } catch {
    showToast("表示モードをローカル保存できませんでした");
  }
}

function rebuildParts() {
  const typeCounts = {};
  state.sourceParts = Array.from(state.sourceDoc.documentElement.querySelectorAll(PART_SELECTOR)).map((node, index) => {
    const localName = node.localName.toLowerCase();
    typeCounts[localName] = (typeCounts[localName] || 0) + 1;
    return createSourcePart(node, index, typeCounts[localName]);
  });

  state.expandedPartIds = Object.fromEntries(
    Object.entries(state.expandedPartIds || {}).filter(([partId]) => {
      const sourcePart = getSourcePart(partId);
      return sourcePart?.subpathCount > 1;
    }),
  );

  if (isSubpathPartId(state.current.selectedPartId) && getKnownPartIds().has(state.current.selectedPartId)) {
    state.expandedPartIds[getParentPartId(state.current.selectedPartId)] = true;
  }

  rebuildVisibleParts();

  if (!getKnownPartIds().has(state.current.selectedPartId)) {
    state.current.selectedPartId = null;
  }
  state.current.partOverrides = prunePartOverrides(state.current.partOverrides);
  state.variants = state.variants.map((variant) => ({
    ...variant,
    partOverrides: prunePartOverrides(variant.partOverrides),
  }));
}

function createSourcePart(node, index, typeIndex) {
  const localName = node.localName.toLowerCase();
  const subpaths = localName === "path" ? splitPathDataIntoSubpaths(node.getAttribute("d")) : [];
  const fillRule = (node.getAttribute("fill-rule") || "").toLowerCase();
  return {
    id: `part-${index + 1}`,
    label: `${PART_LABELS[localName] || "パーツ"}${typeIndex}`,
    localName,
    sourceIndex: index,
    isSubpath: false,
    subpaths,
    subpathCount: subpaths.length,
    hasEvenOdd: fillRule === "evenodd",
    sourceFillNone: node.getAttribute("fill") === "none",
  };
}

function rebuildVisibleParts() {
  const visibleParts = [];
  state.sourceParts.forEach((sourcePart) => {
    if (state.expandedPartIds[sourcePart.id] && sourcePart.subpathCount > 1) {
      sourcePart.subpaths.forEach((_, subpathIndex) => {
        visibleParts.push(createSubpathPart(sourcePart, subpathIndex));
      });
      return;
    }
    visibleParts.push(sourcePart);
  });
  state.parts = visibleParts;
}

function createSubpathPart(sourcePart, subpathIndex) {
  return {
    id: makeSubpathPartId(sourcePart.id, subpathIndex),
    label: `${sourcePart.label}-${subpathIndex + 1}`,
    localName: "path",
    sourceIndex: sourcePart.sourceIndex,
    isSubpath: true,
    parentId: sourcePart.id,
    subpathIndex,
    subpathCount: 1,
    parentHasEvenOdd: sourcePart.hasEvenOdd,
    sourceFillNone: sourcePart.sourceFillNone,
  };
}

function splitPathDataIntoSubpaths(pathData) {
  if (typeof pathData !== "string" || !pathData.trim()) return [];
  const tokens = pathData.match(/[AaCcHhLlMmQqSsTtVvZz][^AaCcHhLlMmQqSsTtVvZz]*/g) || [];
  if (tokens.length === 0 || tokens.some((token) => token[0] === "m")) return [];

  const subpaths = [];
  let current = [];
  tokens.forEach((token) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    if (trimmed[0] === "M") {
      if (current.length > 0) subpaths.push(current.join(" ").trim());
      current = [trimmed];
      return;
    }
    if (current.length > 0) current.push(trimmed);
  });
  if (current.length > 0) subpaths.push(current.join(" ").trim());
  return subpaths
    .filter((subpath) => /^M/i.test(subpath))
    .map((subpath, index) => ({ index, d: subpath }));
}

function makeSubpathPartId(parentId, subpathIndex) {
  return `${parentId}-sub-${subpathIndex + 1}`;
}

function isSubpathPartId(partId) {
  return /^part-\d+-sub-\d+$/.test(String(partId || ""));
}

function getParentPartId(partId) {
  const match = String(partId || "").match(/^(part-\d+)-sub-\d+$/);
  return match ? match[1] : partId;
}

function getSubpathIndex(partId) {
  const match = String(partId || "").match(/^part-\d+-sub-(\d+)$/);
  return match ? Number(match[1]) - 1 : -1;
}

function getKnownPartIds() {
  const ids = new Set();
  state.sourceParts.forEach((sourcePart) => {
    ids.add(sourcePart.id);
    sourcePart.subpaths.forEach((_, subpathIndex) => {
      ids.add(makeSubpathPartId(sourcePart.id, subpathIndex));
    });
  });
  return ids;
}

function setActiveColor(key, value) {
  if (key === "background" || state.current.paintTarget !== "part" || !getSelectedPart()) {
    state.current[key] = value;
    return;
  }
  const override = ensurePartOverride(state.current.selectedPartId);
  override[key] = value;
}

function setActiveStrokeWidth(value) {
  if (state.current.paintTarget !== "part" || !getSelectedPart()) {
    state.current.strokeWidth = value;
    return;
  }
  const override = ensurePartOverride(state.current.selectedPartId);
  override.strokeWidth = value;
}

function getActivePaintValues() {
  if (state.current.paintTarget === "part" && getSelectedPart()) {
    return getPartPaintValues(state.current.selectedPartId);
  }
  return {
    fill: state.current.fill,
    stroke: state.current.stroke,
    strokeWidth: state.current.strokeWidth,
    background: state.current.background,
  };
}

function getPartPaintValues(partId, variant = state.current) {
  const override = variant.partOverrides?.[partId] || {};
  return {
    fill: normalizeHex(override.fill, variant.fill),
    stroke: normalizeHex(override.stroke, variant.stroke),
    strokeWidth: toStrokeWidth(override.strokeWidth ?? variant.strokeWidth),
    background: variant.background,
  };
}

function ensurePartOverride(partId) {
  if (!state.current.partOverrides[partId]) state.current.partOverrides[partId] = {};
  return state.current.partOverrides[partId];
}

function hasPartOverride(partId, variant = state.current) {
  const override = variant.partOverrides?.[partId];
  return Boolean(override && Object.keys(override).length > 0);
}

function hasSubpathOverride(parentId, variant = state.current) {
  return Object.entries(variant.partOverrides || {}).some(([partId, override]) => {
    return getParentPartId(partId) === parentId && isSubpathPartId(partId) && Object.keys(override || {}).length > 0;
  });
}

function partOverrideCount(variant) {
  return Object.values(variant.partOverrides || {}).filter((override) => Object.keys(override).length > 0).length;
}

function getSelectedPart() {
  return getPartById(state.current.selectedPartId);
}

function getPartById(partId) {
  if (!partId) return null;
  return state.parts.find((part) => part.id === partId) || getHiddenSubpathPart(partId) || getSourcePart(partId);
}

function getSourcePart(partId) {
  if (!partId) return null;
  const sourcePartId = isSubpathPartId(partId) ? getParentPartId(partId) : partId;
  return state.sourceParts.find((part) => part.id === sourcePartId) || null;
}

function getHiddenSubpathPart(partId) {
  if (!isSubpathPartId(partId)) return null;
  const sourcePart = getSourcePart(partId);
  const subpathIndex = getSubpathIndex(partId);
  if (!sourcePart || subpathIndex < 0 || subpathIndex >= sourcePart.subpaths.length) return null;
  return createSubpathPart(sourcePart, subpathIndex);
}

function getSplitTargetPart(part = getSelectedPart()) {
  if (!part) return null;
  return part.isSubpath ? getSourcePart(part.parentId) : getSourcePart(part.id);
}

function clonePartOverrides(input) {
  return JSON.parse(JSON.stringify(normalizePartOverrides(input)));
}

function prunePartOverrides(input) {
  const knownIds = getKnownPartIds();
  return Object.fromEntries(Object.entries(normalizePartOverrides(input)).filter(([partId]) => knownIds.has(partId)));
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
    partOverrides: normalizePartOverrides(input.partOverrides),
    note: localizeStoredText(String(input.note || "")).slice(0, 160),
    status: ["draft", "candidate", "approved"].includes(input.status) ? input.status : "draft",
  };
}

function normalizePartOverrides(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).flatMap(([partId, override]) => {
    if (!override || typeof override !== "object" || Array.isArray(override)) return [];
    const normalized = {};
    const fill = normalizeHex(override.fill, null);
    const stroke = normalizeHex(override.stroke, null);
    if (fill) normalized.fill = fill;
    if (stroke) normalized.stroke = stroke;
    if (override.strokeWidth !== undefined) normalized.strokeWidth = toStrokeWidth(override.strokeWidth);
    return Object.keys(normalized).length ? [[partId, normalized]] : [];
  }));
}

function pickVariantControls(variant) {
  return {
    fill: variant.fill,
    stroke: variant.stroke,
    strokeWidth: variant.strokeWidth,
    background: variant.background,
    previewMode: variant.previewMode,
    paintTarget: state.current.paintTarget,
    selectedPartId: state.current.selectedPartId,
    partOverrides: clonePartOverrides(variant.partOverrides),
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

function assessVariantVisibility(variant) {
  const background = resolveExportBackground(variant);
  const backgroundLabel = PREVIEW_MODES[variant.previewMode]?.label || "確認背景";
  const reports = [createVisibilityReport(variant.fill, variant.stroke, background, "")];

  Object.keys(normalizePartOverrides(variant.partOverrides)).forEach((partId) => {
    const partPaint = getPartPaintValues(partId, variant);
    const part = getPartById(partId);
    reports.push(createVisibilityReport(partPaint.fill, partPaint.stroke, background, part?.label || partId));
  });

  const worstReport = reports.reduce((worst, report) => {
    if (visibilityRank(report.rating) > visibilityRank(worst.rating)) return report;
    if (visibilityRank(report.rating) < visibilityRank(worst.rating)) return worst;
    return Math.max(report.fillContrast, report.strokeContrast) < Math.max(worst.fillContrast, worst.strokeContrast) ? report : worst;
  }, reports[0]);

  const warnings = uniqueWarnings(reports.flatMap((report) => report.warnings)).slice(0, 4);
  return {
    rating: worstReport.rating,
    label: worstReport.label,
    background,
    backgroundLabel,
    fillContrast: roundContrast(worstReport.fillContrast),
    strokeContrast: roundContrast(worstReport.strokeContrast),
    fillStrokeContrast: roundContrast(worstReport.fillStrokeContrast),
    warnings,
  };
}

function createVisibilityReport(fill, stroke, background, targetLabel) {
  const fillContrast = contrastRatio(fill, background);
  const strokeContrast = contrastRatio(stroke, background);
  const fillStrokeContrast = contrastRatio(fill, stroke);
  const strongestBackgroundContrast = Math.max(fillContrast, strokeContrast);
  const rating = strongestBackgroundContrast >= 4.5 ? "good" : strongestBackgroundContrast >= 3 ? "caution" : "poor";
  const label = rating === "good" ? "良好" : rating === "caution" ? "注意" : "要調整";
  const prefix = targetLabel ? `${targetLabel}: ` : "";
  const warnings = [];
  if (fillContrast < 3) warnings.push(`${prefix}塗りが背景に沈みやすい可能性があります`);
  if (strokeContrast < 3) warnings.push(`${prefix}線が背景に沈みやすい可能性があります`);
  if (fillStrokeContrast < 1.5) warnings.push(`${prefix}塗りと線の差が弱い可能性があります`);
  return { rating, label, fillContrast, strokeContrast, fillStrokeContrast, warnings };
}

function visibilityRank(rating) {
  return { good: 0, caution: 1, poor: 2 }[rating] ?? 2;
}

function uniqueWarnings(warnings) {
  return Array.from(new Set(warnings.filter(Boolean)));
}

function contrastRatio(hexA, hexB) {
  const luminanceA = relativeLuminance(hexToRgb(hexA));
  const luminanceB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance({ r, g, b }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex, "#000000").slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function roundContrast(value) {
  return Math.round(value * 10) / 10;
}

function formatContrast(value) {
  return roundContrast(value).toFixed(1);
}

function getSourceFacts() {
  const svg = state.sourceDoc.documentElement;
  const serialized = serializeSvgElement(svg);
  return {
    viewBoxLabel: svg.getAttribute("viewBox") ? `viewBox ${svg.getAttribute("viewBox")}` : "viewBox未設定",
    pathCount: svg.getElementsByTagName("path").length,
    subpathCount: state.sourceParts.reduce((total, part) => total + (part.subpathCount || 0), 0),
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
