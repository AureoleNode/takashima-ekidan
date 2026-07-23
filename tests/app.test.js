"use strict";

const assert = require("node:assert/strict");
const {
  analyzeLines,
  copyText,
  hexagramFromBits,
  movingLineName,
  recordToMarkdown
} = require("../app.js");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("64 种阴阳组合映射到 64 个不同卦序", () => {
  const numbers = new Set();
  for (let value = 0; value < 64; value += 1) {
    const bits = Array.from({ length: 6 }, (_, index) => (value >> index) & 1);
    numbers.add(hexagramFromBits(bits).number);
  }
  assert.equal(numbers.size, 64);
  assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));
});

test("六阳爻为乾，六阴爻为坤", () => {
  assert.equal(analyzeLines([7, 7, 7, 7, 7, 7]).primary.number, 1);
  assert.equal(analyzeLines([8, 8, 8, 8, 8, 8]).primary.number, 2);
});

test("六个老阴由坤变乾", () => {
  const result = analyzeLines([6, 6, 6, 6, 6, 6]);
  assert.equal(result.primary.number, 2);
  assert.equal(result.changed.number, 1);
  assert.deepEqual(result.moving.map((line) => line.name), ["初六", "六二", "六三", "六四", "六五", "上六"]);
});

test("动爻名称按初爻到上爻生成", () => {
  assert.equal(movingLineName(9, 0), "初九");
  assert.equal(movingLineName(6, 3), "六四");
  assert.equal(movingLineName(9, 5), "上九");
});

test("复制和导出共用的 Markdown 包含问题、卦象与原始数列", () => {
  const lines = [7, 8, 7, 8, 9, 6];
  const markdown = recordToMarkdown({
    question: "未来三个月是否继续当前方案？",
    castTime: "2026-07-23T12:00",
    lines,
    result: analyzeLines(lines)
  });
  assert.match(markdown, /# 问题/);
  assert.match(markdown, /未来三个月是否继续当前方案？/);
  assert.match(markdown, /# 卦象/);
  assert.match(markdown, /原始数列：7、8、7、8、9、6（自下而上）/);
});

async function testClipboardFallback() {
  const previousDocument = global.document;
  let selectedText = "";
  const textarea = {
    value: "",
    style: {},
    setAttribute() {},
    select() { selectedText = this.value; },
    setSelectionRange() {},
    remove() {}
  };

  global.document = {
    createElement(tagName) {
      assert.equal(tagName, "textarea");
      return textarea;
    },
    body: { appendChild() {} },
    execCommand(command) {
      assert.equal(command, "copy");
      return true;
    }
  };

  try {
    await copyText("# 示例卦象");
    assert.equal(selectedText, "# 示例卦象");
    console.log("✓ 离线兼容方式可复制 Markdown");
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
}

testClipboardFallback()
  .then(() => console.log("全部核心逻辑检查通过。"))
  .catch((error) => {
    console.error("✗ 离线兼容方式可复制 Markdown");
    console.error(error);
    process.exitCode = 1;
  });
