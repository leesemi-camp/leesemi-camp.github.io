import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function writeSnapshot(hotspots) {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), "hotspots-validator-"));
  const snapshotPath = path.join(dirPath, "hotspots.public.json");
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify({
      source: "firestore",
      collection: "crowd_hotspots",
      count: hotspots.length,
      hotspots
    }, null, 2)
  );
  return snapshotPath;
}

function runValidator(snapshotPath) {
  return execFileSync(
    process.execPath,
    ["scripts/validate-hotspots-public-json.mjs", snapshotPath],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

test("Public hotspot validator accepts new classification fields", () => {
  // 공개 스냅샷은 현안/변화/안내와 확인/완료 상태만 허용한다.
  const snapshotPath = writeSnapshot([
    {
      id: "valid-issue",
      title: "확인할 현안",
      contentTab: "issues",
      itemType: "issue",
      progressStatus: "checking",
      lat: 37.394,
      lng: 127.111
    },
    {
      id: "valid-change",
      title: "보행로 볼라드 보수",
      contentTab: "changes",
      itemType: "improvement",
      progressStatus: "completed",
      lat: 37.394,
      lng: 127.111
    },
    {
      id: "valid-notice",
      title: "공사 안내",
      contentTab: "notices",
      itemType: "notice",
      progressStatus: "completed",
      lat: 37.392,
      lng: 127.08
    }
  ]);

  expect(runValidator(snapshotPath)).toContain("Validated 3 public hotspots");
});

test("Public hotspot validator rejects invalid classification combo", () => {
  // 변화 탭에는 완료 상태만 저장할 수 있다.
  const snapshotPath = writeSnapshot([
    {
      id: "invalid-change",
      title: "잘못된 상태",
      contentTab: "changes",
      itemType: "improvement",
      progressStatus: "checking",
      lat: 37.394,
      lng: 127.111
    }
  ]);

  expect(() => runValidator(snapshotPath)).toThrow(/invalid improvement progressStatus/);
});
