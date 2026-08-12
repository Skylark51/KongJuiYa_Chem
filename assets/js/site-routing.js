export function siteRoot(documentRef = document) {
  return new URL(documentRef.documentElement.dataset.siteRoot || "./", documentRef.baseURI);
}

export function siteUrl(path, documentRef = document) {
  return new URL(path, siteRoot(documentRef)).href;
}

export function chemistryLobbyUrl(view = "home", documentRef = document) {
  const url = new URL("subjects/chemistry/", siteRoot(documentRef));
  if (view) url.searchParams.set("view", view);
  return url.href;
}

export function subjectLobbyUrl(subjectId, view = "home", documentRef = document) {
  const url = new URL("subjects/" + subjectId + "/", siteRoot(documentRef));
  if (view && view !== "home") url.searchParams.set("view", view);
  return url.href;
}

export function activeSubjectLobbyUrl(view = "home", documentRef = document, locationRef = globalThis.location) {
  const requested = new URL(locationRef.href).searchParams.get("subject");
  const subjectId = documentRef.documentElement.dataset.subject || requested || "chemistry";
  return subjectLobbyUrl(subjectId, view, documentRef);
}
