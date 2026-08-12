import { subjectById } from "../../data/subjects.js";
import { subjectLobbyUrl } from "./site-routing.js";

const requested = new URL(location.href).searchParams.get("from") || "chemistry";
const subject = subjectById(requested) || subjectById("chemistry");
document.documentElement.dataset.returnSubject = subject.id;

const route = view => subjectLobbyUrl(subject.id, view);
const navigation = document.querySelectorAll(".desktop-tabs a, .mobile-bottom-nav a");
navigation.forEach(link => {
  const text = link.textContent.trim();
  if (text === "홈") link.href = route("home");
  if (text === "장독대") link.href = route("jars");
  if (text === "기록") link.href = route("records");
});

const brand = document.querySelector(".app-brand");
if (brand) {
  brand.href = route("home");
  brand.setAttribute("aria-label", subject.name + "편 홈으로 이동");
  const title = brand.querySelector("strong");
  if (title) title.textContent = "콩쥐야 줘때써 - " + subject.name + "편";
}

const settingsTitle = document.getElementById("settingsTitle");
if (settingsTitle) settingsTitle.textContent = "콩쥐야 줘때써 - " + subject.name + "편 설정";
