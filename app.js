(function () {
  "use strict";

  const TRIGRAMS = {
    "111": { key: "乾", nature: "天" },
    "110": { key: "兑", nature: "泽" },
    "101": { key: "离", nature: "火" },
    "100": { key: "震", nature: "雷" },
    "011": { key: "巽", nature: "风" },
    "010": { key: "坎", nature: "水" },
    "001": { key: "艮", nature: "山" },
    "000": { key: "坤", nature: "地" }
  };

  const TRIGRAM_ORDER = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
  const KING_WEN_MATRIX = [
    [1, 10, 13, 25, 44, 6, 33, 12],
    [43, 58, 49, 17, 28, 47, 31, 45],
    [14, 38, 30, 21, 50, 64, 56, 35],
    [34, 54, 55, 51, 32, 40, 62, 16],
    [9, 61, 37, 42, 57, 59, 53, 20],
    [5, 60, 63, 3, 48, 29, 39, 8],
    [26, 41, 22, 27, 18, 4, 52, 23],
    [11, 19, 36, 24, 46, 7, 15, 2]
  ];

  const HEXAGRAM_NAMES = [
    "乾为天", "坤为地", "水雷屯", "山水蒙", "水天需", "天水讼", "地水师", "水地比",
    "风天小畜", "天泽履", "地天泰", "天地否", "天火同人", "火天大有", "地山谦", "雷地豫",
    "泽雷随", "山风蛊", "地泽临", "风地观", "火雷噬嗑", "山火贲", "山地剥", "地雷复",
    "天雷无妄", "山天大畜", "山雷颐", "泽风大过", "坎为水", "离为火", "泽山咸", "雷风恒",
    "天山遁", "雷天大壮", "火地晋", "地火明夷", "风火家人", "火泽睽", "水山蹇", "雷水解",
    "山泽损", "风雷益", "泽天夬", "天风姤", "泽地萃", "地风升", "泽水困", "水风井",
    "泽火革", "火风鼎", "震为雷", "艮为山", "风山渐", "雷泽归妹", "雷火丰", "火山旅",
    "巽为风", "兑为泽", "风水涣", "水泽节", "风泽中孚", "雷山小过", "水火既济", "火水未济"
  ];

  const state = { lines: [null, null, null, null, null, null], currentResult: null, castTime: null };

  function baseBit(value) { return value === 7 || value === 9 ? 1 : 0; }
  function isMoving(value) { return value === 6 || value === 9; }
  function changedBit(value) { return isMoving(value) ? 1 - baseBit(value) : baseBit(value); }

  function trigramFromBits(bits) {
    const trigram = TRIGRAMS[bits.join("")];
    if (!trigram) throw new Error("无效的三爻组合");
    return trigram;
  }

  function hexagramFromBits(bits) {
    if (!Array.isArray(bits) || bits.length !== 6) throw new Error("卦象必须包含六爻");
    const lower = trigramFromBits(bits.slice(0, 3));
    const upper = trigramFromBits(bits.slice(3, 6));
    const upperIndex = TRIGRAM_ORDER.indexOf(upper.key);
    const lowerIndex = TRIGRAM_ORDER.indexOf(lower.key);
    const number = KING_WEN_MATRIX[upperIndex][lowerIndex];
    return {
      number,
      name: HEXAGRAM_NAMES[number - 1],
      symbol: String.fromCodePoint(0x4dc0 + number - 1),
      upper,
      lower
    };
  }

  function movingLineName(value, index) {
    const prefix = baseBit(value) ? "九" : "六";
    if (index === 0) return "初" + prefix;
    if (index === 5) return "上" + prefix;
    return prefix + ["", "二", "三", "四", "五"][index];
  }

  function analyzeLines(lines) {
    if (!Array.isArray(lines) || lines.length !== 6 || lines.some((v) => ![6, 7, 8, 9].includes(v))) {
      throw new Error("请先完整录入六爻");
    }
    const primaryBits = lines.map(baseBit);
    const changedBits = lines.map(changedBit);
    const nuclearBits = [primaryBits[1], primaryBits[2], primaryBits[3], primaryBits[2], primaryBits[3], primaryBits[4]];
    const moving = lines.map((value, index) => isMoving(value) ? ({ index, value, name: movingLineName(value, index) }) : null).filter(Boolean);
    return {
      primary: hexagramFromBits(primaryBits),
      changed: hexagramFromBits(changedBits),
      nuclear: hexagramFromBits(nuclearBits),
      moving,
      lines: lines.slice()
    };
  }

  function randomCoinValue() {
    const values = new Uint32Array(3);
    if (globalThis.crypto && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(values);
    } else {
      values[0] = Math.floor(Math.random() * 2);
      values[1] = Math.floor(Math.random() * 2);
      values[2] = Math.floor(Math.random() * 2);
    }
    return Array.from(values, (value) => value % 2 === 0 ? 2 : 3).reduce((sum, value) => sum + value, 0);
  }

  function nowLocalInputValue() {
    const date = new Date();
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
  }

  function safeFilePart(value) {
    return (value || "未命名占问").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").slice(0, 36);
  }

  function getFormData() {
    const result = state.currentResult;
    return {
      castTime: state.castTime || nowLocalInputValue(),
      question: document.getElementById("question").value.trim(),
      lines: state.lines.slice(),
      result: result ? JSON.parse(JSON.stringify(result)) : null
    };
  }

  function resultSummary(result) {
    const change = result.moving.length ? `第${result.changed.number}卦 ${result.changed.name}` : "无动爻，本卦不变";
    const moving = result.moving.length ? result.moving.map((line) => line.name).join("、") : "无";
    return { change, moving };
  }

  function recordToMarkdown(record) {
    const r = record.result;
    const summary = resultSummary(r);
    return `# 问题

${record.question}

# 卦象

- 本卦：${r.primary.symbol} 第 ${r.primary.number} 卦「${r.primary.name}」（上${r.primary.upper.key}${r.primary.upper.nature}、下${r.primary.lower.key}${r.primary.lower.nature}）
- 动爻：${summary.moving}
- 之卦：${r.moving.length ? `${r.changed.symbol} 第 ${r.changed.number} 卦「${r.changed.name}」` : "无动爻，本卦不变"}
- 互卦：${r.nuclear.symbol} 第 ${r.nuclear.number} 卦「${r.nuclear.name}」
- 原始数列：${record.lines.join("、")}（自下而上）
`;
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function setMessage(message, isError) {
    const element = document.getElementById("action-message");
    element.textContent = message;
    element.style.color = isError ? "#a33b2b" : "#234b42";
  }

  function initTheme() {
    const root = document.documentElement;
    const button = document.getElementById("theme-toggle");
    const icon = document.getElementById("theme-icon");
    const label = document.getElementById("theme-label");

    function updateThemeControl() {
      const isDark = root.dataset.theme === "dark";
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "切换为日间模式" : "切换为黑夜模式");
      icon.textContent = isDark ? "☀" : "☾";
      label.textContent = isDark ? "日间" : "黑夜";
    }

    if (!root.dataset.theme) root.dataset.theme = "light";
    updateThemeControl();
    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("takashima-theme", root.dataset.theme); } catch (_) {}
      updateThemeControl();
    });
  }

  function validatedRecord() {
    if (!state.currentResult) { setMessage("请先完整录入六爻。", true); return null; }
    const record = getFormData();
    if (!record.question) { setMessage("请先填写“所占何事”。", true); document.getElementById("question").focus(); return null; }
    return record;
  }

  function renderResult() {
    const complete = state.lines.every((value) => [6, 7, 8, 9].includes(value));
    const empty = document.getElementById("empty-result");
    const content = document.getElementById("result-content");
    const status = document.getElementById("result-status");
    if (!complete) {
      state.currentResult = null;
      empty.hidden = false;
      content.hidden = true;
      status.textContent = "待成卦";
      return;
    }
    const result = analyzeLines(state.lines);
    state.currentResult = result;
    const summary = resultSummary(result);
    empty.hidden = true;
    content.hidden = false;
    status.textContent = result.moving.length ? `${result.moving.length} 个动爻` : "静卦";
    document.getElementById("primary-symbol").textContent = result.primary.symbol;
    document.getElementById("primary-name").textContent = `第${result.primary.number}卦 · ${result.primary.name}`;
    document.getElementById("primary-trigrams").textContent = `上${result.primary.upper.key}${result.primary.upper.nature} · 下${result.primary.lower.key}${result.primary.lower.nature}`;
    document.getElementById("changed-symbol").textContent = result.moving.length ? result.changed.symbol : "—";
    document.getElementById("changed-name").textContent = result.moving.length ? `第${result.changed.number}卦 · ${result.changed.name}` : "无动爻";
    document.getElementById("changed-trigrams").textContent = result.moving.length ? `上${result.changed.upper.key}${result.changed.upper.nature} · 下${result.changed.lower.key}${result.changed.lower.nature}` : "本卦不变";
    document.getElementById("moving-lines").textContent = summary.moving;
    document.getElementById("nuclear-hex").textContent = `${result.nuclear.number} · ${result.nuclear.name}`;
    document.getElementById("raw-lines").textContent = state.lines.join(" · ");
  }

  function updateAll() {
    renderResult();
  }

  function showScreen(name) {
    const showingResult = name === "result";
    document.getElementById("cast-screen").hidden = showingResult;
    document.getElementById("result-screen").hidden = !showingResult;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetCast() {
    state.lines = [null, null, null, null, null, null];
    state.currentResult = null;
    state.castTime = null;
    document.getElementById("question").value = "";
    const castButton = document.getElementById("cast-all");
    castButton.disabled = false;
    castButton.textContent = "一键起卦";
    document.getElementById("coin-message").textContent = "一次问题，只起一卦。";
    document.getElementById("action-message").textContent = "";
    updateAll();
    showScreen("cast");
    document.getElementById("question").focus();
  }

  function init() {
    initTheme();
    document.getElementById("cast-all").addEventListener("click", () => {
      const question = document.getElementById("question");
      if (!question.value.trim()) {
        document.getElementById("coin-message").textContent = "请先写下所占何事。";
        question.focus();
        return;
      }
      state.castTime = nowLocalInputValue();
      state.lines = Array.from({ length: 6 }, randomCoinValue);
      document.getElementById("coin-message").textContent = `成卦：${state.lines.join("、")}（自下而上）`;
      updateAll();
      document.getElementById("cast-all").disabled = true;
      document.getElementById("cast-all").textContent = "已经成卦";
      showScreen("result");
    });
    document.getElementById("back-to-cast").addEventListener("click", resetCast);
    document.getElementById("export-md").addEventListener("click", () => {
      const record = validatedRecord(); if (!record) return;
      const date = (record.castTime || nowLocalInputValue()).slice(0, 10);
      downloadFile(`${date}_${safeFilePart(record.question)}.md`, recordToMarkdown(record), "text/markdown;charset=utf-8");
      setMessage("卦象已导出；请放入本目录的“卦象”文件夹。", false);
    });
    updateAll();
    showScreen("cast");
  }

  const core = { analyzeLines, hexagramFromBits, movingLineName, recordToMarkdown };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof window !== "undefined") window.YijingCore = core;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", init);
}());
