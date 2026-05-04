import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceFiles = [
  "data/daejangdong.wfs.xml",
  "data/baekhyeondong.wfs.xml",
  "data/seogundong.wfs.xml",
  "data/unjungdong.wfs.xml",
  "data/pangyodong.wfs.xml",
  "data/hasanundong.wfs.xml"
];
const outputFile = "data/dong-boundaries.optimized.geojson";
const coordinatePrecision = 6;

function decodeXmlText(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .trim();
}

function readTagText(xmlText, tagName) {
  const pattern = new RegExp("<" + tagName + "\\b[^>]*>([\\s\\S]*?)<\\/" + tagName + ">", "i");
  const match = pattern.exec(xmlText);
  return match ? decodeXmlText(match[1]) : "";
}

function readPosLists(xmlText) {
  const pattern = /<gml:posList\b[^>]*>([\s\S]*?)<\/gml:posList>/g;
  const lists = [];
  let match = pattern.exec(xmlText);
  while (match) {
    lists.push(decodeXmlText(match[1]));
    match = pattern.exec(xmlText);
  }
  return lists;
}

function roundCoordinate(value) {
  return Number(Number(value).toFixed(coordinatePrecision));
}

function parseRing(posListText) {
  const values = String(posListText || "")
    .trim()
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const ring = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    ring.push([roundCoordinate(values[index]), roundCoordinate(values[index + 1])]);
  }
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
  }
  return ring.length >= 4 ? ring : null;
}

function getFeatureMembers(xmlText) {
  const pattern = /<gml:featureMember\b[^>]*>[\s\S]*?<\/gml:featureMember>/g;
  const members = xmlText.match(pattern);
  return members && members.length > 0 ? members : [xmlText];
}

function buildFeature(featureXml, sourceFile, featureIndex) {
  const rings = readPosLists(featureXml)
    .map(parseRing)
    .filter((ring) => Array.isArray(ring) && ring.length >= 4);

  if (rings.length === 0) {
    return null;
  }

  const emdCode = readTagText(featureXml, "emd_cd");
  const fullName = readTagText(featureXml, "full_nm");
  const emdKorName = readTagText(featureXml, "emd_kor_nm");
  const emdEngName = readTagText(featureXml, "emd_eng_nm");
  const properties = {
    emd_cd: emdCode,
    full_nm: fullName,
    emd_kor_nm: emdKorName,
    emd_eng_nm: emdEngName,
    name: emdKorName || fullName || "동 경계 " + String(featureIndex + 1),
    source_file: sourceFile
  };

  return {
    type: "Feature",
    properties,
    geometry: rings.length === 1
      ? {
          type: "Polygon",
          coordinates: [rings[0]]
        }
      : {
          type: "MultiPolygon",
          coordinates: rings.map((ring) => [ring])
        }
  };
}

async function main() {
  const features = [];
  for (const sourceFile of sourceFiles) {
    const xmlText = await readFile(join(rootDir, sourceFile), "utf8");
    const sourceFeatures = getFeatureMembers(xmlText)
      .map((featureXml, featureIndex) => buildFeature(featureXml, sourceFile, featureIndex))
      .filter(Boolean);
    if (sourceFeatures.length === 0) {
      throw new Error(sourceFile + ": 변환 가능한 경계를 찾지 못했습니다.");
    }
    features.push(...sourceFeatures);
  }

  const geojson = {
    type: "FeatureCollection",
    name: "pangyo_dong_boundaries_optimized",
    sourceFiles,
    features
  };
  await writeFile(join(rootDir, outputFile), JSON.stringify(geojson), "utf8");
  console.log(outputFile + " generated (" + String(features.length) + " features)");
}

await main();
