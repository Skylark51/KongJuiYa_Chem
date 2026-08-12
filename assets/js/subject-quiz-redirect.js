import { siteUrl } from "./site-routing.js";

export function mountSharedQuiz({ subjectId, trainingId }) {
  const target = new URL(siteUrl("콩쥐야_줘때써.html"));
  target.searchParams.set("subject", subjectId);
  target.searchParams.set("training", trainingId);
  document.documentElement.dataset.subjectQuizRedirect = "true";
  location.replace(target.href);
  return target.href;
}
