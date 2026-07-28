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
  // 신규 변화 분류와 기존 achievements 호환 데이터를 함께 허용한다.
  const snapshotPath = writeSnapshot([
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
      id: "legacy-change",
      title: "운중천 안전통제선 설치",
      contentTab: "achievements",
      lat: 37.391,
      lng: 127.079
    },
    {
      id: "review-closed-issue",
      title: "추진 어려운 현안",
      contentTab: "issues",
      itemType: "issue",
      progressStatus: "review_closed",
      lat: 37.392,
      lng: 127.08
    }
  ]);

  expect(runValidator(snapshotPath)).toContain("Validated 3 public hotspots");
});

test("Public hotspot validator rejects invalid classification combo", () => {
  // 개선 게시물에는 안내 상태를 저장할 수 없다.
  const snapshotPath = writeSnapshot([
    {
      id: "invalid-change",
      title: "잘못된 상태",
      contentTab: "changes",
      itemType: "improvement",
      progressStatus: "active",
      lat: 37.394,
      lng: 127.111
    }
  ]);

  expect(() => runValidator(snapshotPath)).toThrow(/invalid improvement progressStatus/);
});
