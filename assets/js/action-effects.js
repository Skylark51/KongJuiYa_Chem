import { safeLocalStorage } from "./safe-storage.js";

const localStorage = safeLocalStorage;
const ACTIONS = ["spoon-hit","bucket-smash","lid-drop","water-cannon","combo-finisher","critical-hit"];
const HIT_WORDS = ["깡!", "딱!", "퍽!", "쨍!"];
const WRONG_ACTIONS = ["jar-crush", "eye-pop", "leak-burst", "bucket-drop", "slip", "lid-drop", "spoon-hit", "nope"];
const MAX_PARTICLES = 24;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion");
const lowPower = () => document.documentElement.dataset.deviceLayout === "mobile" && (navigator.hardwareConcurrency || 4) <= 4;
const choose = list => list[Math.floor(Math.random() * list.length)];
const SOUND = {correct:[620,820],wrong:[180,110],timeout:[420,220,120],"water-pour":[480,620],"spoon-hit":[240,150],"bucket-smash":[170,90],"fever-start":[440,660,880],"fever-end":[660,330],"critical-water":[700,950],"game-over":[300,190,90],"game-clear":[520,660,820]};
function sound(name){const volume=Number(globalThis.KongJuiYaGame?.storage?.data?.settings?.volume??.8);if(!volume||!SOUND[name])return;try{const C=window.AudioContext||window.webkitAudioContext,ctx=sound.ctx||(sound.ctx=new C());SOUND[name].forEach((frequency,index)=>{const o=ctx.createOscillator(),g=ctx.createGain(),start=ctx.currentTime+index*.065;o.type="square";o.frequency.value=frequency;g.gain.setValueAtTime(Math.min(.08,volume*.08),start);g.gain.exponentialRampToValueAtTime(.001,start+.11);o.connect(g).connect(ctx.destination);o.start(start);o.stop(start+.12)})}catch{}}
export function initActionEffects(app, { vibrate = false } = {}) {
  const stage = document.getElementById("visualStage"); if (!app || !stage) return null;
  const layer = document.createElement("div"); layer.id = "ui-actionLayer"; layer.className = "action-layer"; layer.setAttribute("aria-hidden", "true");
  const banner = document.createElement("div"); banner.id = "ui-feverBanner"; banner.className = "fever-banner"; banner.setAttribute("role", "status"); banner.setAttribute("aria-live", "assertive");
  stage.append(layer, banner);
  let cleanupTimer = 0;
  function clearSoon(ms = 900) { clearTimeout(cleanupTimer); cleanupTimer = setTimeout(() => { layer.replaceChildren(); app.classList.remove(...[...app.classList].filter(x => x.startsWith("action-"))); }, ms); }
  function piece(className, text = "") { const node = document.createElement("i"); node.className = className; node.textContent = text; layer.append(node); return node; }
  function burst(kind, count = 12) { if (reduced()) return; const cap = lowPower() ? 8 : MAX_PARTICLES; for (let i=0;i<Math.min(count,cap);i++) { const p=piece(`action-particle ${kind}`); p.style.setProperty("--x", `${(Math.random()-.5)*330}px`); p.style.setProperty("--y", `${-40-Math.random()*230}px`); p.style.setProperty("--r", `${(Math.random()-.5)*600}deg`); } }
  function play(name, detail = {}) {
    layer.replaceChildren(); app.classList.remove(...ACTIONS.map(x=>`action-${x}`), ...WRONG_ACTIONS.map(x=>`action-${x}`)); app.classList.add(`action-${name}`);
    const word = detail.word || (name.includes("water") ? "촤아악!" : choose(HIT_WORDS)); piece("impact-word", word);
    if (name === "spoon-hit") piece("prop spoon-prop"); if (name === "bucket-smash") piece("prop smash-bucket"); if (name === "lid-drop") piece("prop falling-lid"); if (name === "water-cannon") piece("water-cannon-beam");
    burst(name.includes("water") ? "water" : "star", name === "critical-hit" ? 24 : 14);
    sound(name === "water-cannon" ? "critical-water" : name);
    if ((vibrate || localStorage.getItem("kongjuiya-vibration")==="on") && navigator.vibrate) navigator.vibrate(name === "critical-hit" ? [30,30,60] : 35);
    clearSoon(name === "lid-drop" ? 900 : 720);
  }
  function wrong(timeout = false) { const name = timeout ? "leak-burst" : choose(WRONG_ACTIONS); sound(timeout ? "timeout" : "wrong"); play(name, { word: timeout ? "시간 다 됐다!" : name === "nope" ? "이건 아니지!" : undefined }); }
  function rare(){if(reduced()||Math.random()>.035)return;const events=[["rare-crown","왕두꺼비 등장!"],["rare-fish","물고기다!"],["rare-ufo","뚜껑 UFO!"]],event=choose(events);app.classList.add(event[0]);piece("rare-prop",event[1]);setTimeout(()=>app.classList.remove(event[0]),1000)}
  function upgrade(detail = {}) { const values = detail.upgrades || detail; for (const key of ["bucket_level","spoon_level","jar_level","toad_armor_level","water_power_level","fever_level"]) { const level = Math.max(0, Math.min(5, Number(values[key]) || 0)); app.setAttribute(`data-${key.replaceAll("_", "-")}`, String(level)); } }
  for (const name of ACTIONS) addEventListener(`action:${name}`, event => play(name, event.detail || {}));
  addEventListener("answer:wrong", () => wrong(false)); addEventListener("answer:timeout", () => wrong(true));
  addEventListener("answer:correct", event => { sound("correct"); rare(); const combo=event.detail?.combo||0; if (app.classList.contains("is-fever")) play("water-cannon"); else if (combo && combo%5===0) play("combo-finisher"); });
  addEventListener("fever:start", event => { sound("fever-start"); const tier=event.detail?.tier||event.detail?.level||1; app.dataset.feverTier=String(tier); banner.textContent=`황금 두꺼비 FEVER ${tier}`; banner.classList.add("is-visible"); });
  addEventListener("fever:end", () => { sound("fever-end"); banner.classList.remove("is-visible"); delete app.dataset.feverTier; });
  addEventListener("game:over", () => {sound("game-over");app.classList.add("action-toad-eject")}); addEventListener("game:clear", () => {sound("game-clear");app.classList.add("action-toad-victory")});
  addEventListener("upgrade:change", event => upgrade(event.detail || {})); addEventListener("upgrades:loaded", event => upgrade(event.detail || {}));
  const shortcutObserver=new MutationObserver(()=>document.querySelectorAll("#ui-choiceOptions button").forEach((button,index)=>{button.dataset.shortcut=String(index+1)+" ";button.setAttribute("aria-keyshortcuts",String(index+1))}));shortcutObserver.observe(document.body,{childList:true,subtree:true});
  upgrade(globalThis.KongJuiYaGame?.storage?.data?.upgrades || {});
  return { play, upgrade, destroy(){clearTimeout(cleanupTimer);shortcutObserver.disconnect();layer.remove();banner.remove()} };
}
