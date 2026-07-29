import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function readProjectFile(filePath) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

test("CSS entry pages use Suit font", () => {
  // 브라우저 로딩 변수 없이 전역 폰트 연결만 확인한다.
  const fontsCss = readProjectFile("fonts.css");
  expect(fontsCss).toContain('font-family: "Suit"');
  expect(fontsCss).toContain("SUIT-Regular.woff2");
  expect(fontsCss).toContain("SUIT-Heavy.woff2");

  for (const cssFile of ["styles.css", "public-landing.css", "service-shell.css", "launcher.css"]) {
    const css = readProjectFile(cssFile);
    expect(css.startsWith('@import url("./fonts.css");')).toBe(true);
    expect(css).toContain('font-family: "Suit", "Noto Sans KR", sans-serif;');
  }
});

test("Map marker text uses Suit font", () => {
  // 지도 캔버스 텍스트도 같은 폰트 패밀리를 사용한다.
  const appJs = readProjectFile("app.js");
  expect(appJs).toContain('px \\"Suit\\", \\"Apple Color Emoji\\"');
  expect(appJs).toContain('16px \\"Suit\\", sans-serif');
});
