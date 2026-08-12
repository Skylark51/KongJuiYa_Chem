import { siteUrl } from "./site-routing.js";

const HERO_ART_PATH = "assets/images/background/courtyard-night.png";

function simplifyHomeScreen() {
  const home = document.getElementById("homeView");
  if (!home) return;
  home.querySelector(".quick-start-card")?.remove();
  home.querySelector(".research-summary")?.remove();
}

function removeLegacySelectionPhoto() {
  document.querySelector(".jar-selection-scene")?.remove();
}

export function installLobbyHeroScene() {
  simplifyHomeScreen();
  removeLegacySelectionPhoto();

  const hero = document.getElementById("lobbyTop");
  if (!hero) return;

  const heroArtUrl = siteUrl(HERO_ART_PATH);
  hero.classList.remove("has-scene-art", "has-live-scene", "has-single-photo");
  hero.classList.add("has-stable-background");
  hero.style.setProperty("--hero-photo", `url("${heroArtUrl}")`);
}
