#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

let admin;
try {
  admin = require("firebase-admin");
} catch (error) {
  console.error("[error] firebase-admin 패키지가 필요합니다. 예: npm i firebase-admin");
  process.exit(1);
}

function parseArgs(argv) {
  const result = {
    serviceAccountPath: "",
    email: "",
    staff: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--service-account") {
      result.serviceAccountPath = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--email") {
      result.email = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === "--staff") {
      const raw = String(argv[index + 1] || "").trim().toLowerCase();
      result.staff = raw === "true" || raw === "1" || raw === "y" || raw === "yes";
      index += 1;
      continue;
    }
  }

  return result;
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/set-staff-claim.cjs " +
    "--service-account /abs/path/service-account.json " +
    "--email staff@example.com " +
    "[--staff true|false]"
  );
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.serviceAccountPath || !args.email) {
    printUsageAndExit();
  }

  const resolvedPath = path.resolve(args.serviceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error("[error] 서비스계정 파일을 찾을 수 없습니다:", resolvedPath);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(resolvedPath, "utf8");
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawJson);
  } catch (error) {
    console.error("[error] 서비스계정 JSON 파싱 실패:", error.message);
    process.exit(1);
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const auth = admin.auth();
  const user = await auth.getUserByEmail(args.email);
  const existingClaims = Object.assign({}, user.customClaims || {});
  const nextClaims = Object.assign({}, existingClaims);
  if (args.staff) {
    nextClaims.staff = true;
  } else {
    delete nextClaims.staff;
  }

  await auth.setCustomUserClaims(user.uid, nextClaims);

  console.log("[ok] updated user:", args.email);
  console.log("[ok] uid:", user.uid);
  console.log("[ok] staff:", args.staff ? "true" : "false");
  console.log("[ok] claims:", JSON.stringify(nextClaims));
}

main().catch((error) => {
  console.error("[error]", error && error.message ? error.message : String(error));
  process.exit(1);
});
