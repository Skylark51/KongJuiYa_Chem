/*
 * Compatibility map for scene assets renamed by the 2026-08-17 Korean asset migration.
 * Runtime scene manifests may keep historical paths, but every request is normalized
 * here to the canonical Korean-path asset. Remove entries only after all manifests
 * and saved scene definitions have been migrated.
 */

const LEGACY_TOAD_EXPRESSION_PREFIX = "assets/images/toad-expressions/";
const TOAD_EXPRESSION_PREFIX = "assets/그림/공용/두꺼비/표정/";

const LEGACY_SCENE_ASSET_PATHS = Object.freeze({
  "assets/images/background/courtyard-night.png": "assets/그림/메인/배경/밤-뜰.png",
  "assets/art/source-locked/background/courtyard-night.png": "assets/그림/공용/원본/배경/밤-뜰.png",

  "assets/art/kongjwi/kongjwi-underlayer-cutout.png": "assets/그림/공용/원본/콩쥐/속옷/기본-오려내기.png",
  "assets/art/kongjwi/kongjwi-classic-red-cutout.png": "assets/그림/공용/원본/콩쥐/고전-홍색-한복/기본-오려내기.png",
  "assets/art/kongjwi/kongjwi-blue-scholar-cutout.png": "assets/그림/공용/원본/콩쥐/청색-학자복/기본-오려내기.png",
  "assets/art/kongjwi/kongjwi-field-work-cutout.png": "assets/그림/공용/원본/콩쥐/농사일-작업복/기본-오려내기.png",
  "assets/art/kongjwi/kongjwi-ragged-cutout.png": "assets/그림/공용/원본/콩쥐/누더기옷/기본-오려내기.png",
  "assets/art/kongjwi/kongjwi-night-court-cutout.png": "assets/그림/공용/원본/콩쥐/야간-궁중복/기본-오려내기.png",

  "assets/art/kongjwi-tools/wood.png": "assets/그림/공용/원본/바가지/나무-바가지.png",
  "assets/art/kongjwi-tools/brass.png": "assets/그림/공용/원본/바가지/놋쇠-바가지.png",
  "assets/art/kongjwi-tools/celadon.png": "assets/그림/공용/원본/바가지/청자-바가지.png",
  "assets/art/kongjwi-tools/moon.png": "assets/그림/공용/원본/바가지/월광-바가지.png",

  "assets/art/jars/onggi/lid-open.png": "assets/그림/공용/원본/장독대/옹기/열림.png",
  "assets/art/jars/onggi/thumbnail-no-toad.png": "assets/그림/공용/원본/장독대/옹기/닫힘.png",
  "assets/art/jars/celadon/lid-open.png": "assets/그림/공용/원본/장독대/청자/열림.png",
  "assets/art/jars/celadon/thumbnail-no-toad.png": "assets/그림/공용/원본/장독대/청자/닫힘.png",
  "assets/art/jars/moon-white/lid-open.png": "assets/그림/공용/원본/장독대/달빛-백색/열림.png",
  "assets/art/jars/moon-white/thumbnail-no-toad.png": "assets/그림/공용/원본/장독대/달빛-백색/닫힘.png",
  "assets/art/jars/night-lacquer/lid-open.png": "assets/그림/공용/원본/장독대/밤-칠기/열림.png",
  "assets/art/jars/night-lacquer/thumbnail-no-toad.png": "assets/그림/공용/원본/장독대/밤-칠기/닫힘.png"
});

export function resolveSceneAssetPath(path) {
  if (!path) return path;
  if (path.startsWith(LEGACY_TOAD_EXPRESSION_PREFIX)) {
    return `${TOAD_EXPRESSION_PREFIX}${path.slice(LEGACY_TOAD_EXPRESSION_PREFIX.length)}`;
  }
  return LEGACY_SCENE_ASSET_PATHS[path] || path;
}
