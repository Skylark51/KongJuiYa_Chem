export class QuestionPresentation {
  constructor(documentRef = document) { this.document = documentRef; }

  render(element, question) {
    if (!question?.presentation) return false;
    const { image: source, imageAlt, sourceLabel } = question.presentation;
    const image = this.document.createElement("img");
    image.className = "subject-question-image";
    image.src = new URL(source, this.document.baseURI).href;
    image.alt = imageAlt || "";
    const label = this.document.createElement("small");
    label.className = "subject-question-source";
    label.textContent = sourceLabel || "";
    const prompt = this.document.createElement("span");
    prompt.className = "subject-question-prompt";
    prompt.textContent = question.prompt || "";
    element.replaceChildren(image, label, prompt);
    return true;
  }
}
