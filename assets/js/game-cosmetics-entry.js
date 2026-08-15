import { GameStorage } from "./storage.js";
import { CosmeticSystem, COSMETIC_STORAGE_KEY } from "./cosmetic-system.js";
import { mountSceneRenderer } from "./scene-renderer.js?v=20260815-blue-scholar-gridfix1";

/**
 * Connect persisted cosmetics to the single layered PNG scene renderer.
 * Only the currently equipped outfit, tool, jar and toad are requested.
 */
export function mountGameScene(root, { storage = null } = {}) {
  if (!root) throw new Error("게임 장면을 연결할 루트가 없습니다.");
  if (root.__mountedGameScene) return root.__mountedGameScene;

  const gameStorage = storage || new GameStorage();
  const cosmetics = new CosmeticSystem(gameStorage);
  cosmetics.apply(root);

  const renderer = mountSceneRenderer(root, {
    cosmetics: cosmetics.visualState()
  });

  function applyLatestCosmetics() {
    cosmetics.data = cosmetics.load();
    cosmetics.apply(root);
    renderer.setCosmetics(cosmetics.visualState());
  }

  function handleStorage(event) {
    if (event.key === COSMETIC_STORAGE_KEY || event.key == null) {
      applyLatestCosmetics();
    }
  }

  addEventListener("cosmetic:equipped", applyLatestCosmetics);
  addEventListener("storage", handleStorage);

  const mounted = {
    renderer,
    cosmetics,
    ready: renderer.ready,
    apply: applyLatestCosmetics,
    destroy() {
      removeEventListener("cosmetic:equipped", applyLatestCosmetics);
      removeEventListener("storage", handleStorage);
      renderer.destroy();
      root.__mountedGameScene = null;
    }
  };

  root.__mountedGameScene = mounted;
  return mounted;
}
