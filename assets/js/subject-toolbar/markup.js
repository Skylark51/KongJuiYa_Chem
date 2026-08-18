const NAV_ITEMS = Object.freeze([
  Object.freeze({ view: "home", icon: "\u2302", label: "\ud648" }),
  Object.freeze({ view: "jars", icon: "\u7515", label: "\uc7a5\ub3c5\ub300" }),
  Object.freeze({ view: "records", icon: "\u518a", label: "\uae30\ub85d" })
]);

function viewControl(item, activeView) {
  const current = item.view === activeView ? ' aria-current="page"' : "";
  return '<button type="button" data-view-target="' + item.view + '"' + current + '><span aria-hidden="true">' + item.icon + "</span>" + item.label + "</button>";
}

export function createSubjectToolbarMarkup({ subject, shopHref, portalHref, activeView = "home" }) {
  const title = "\ucf69\uc950\uc57c \uc918\ub54c\uc368 - " + subject.shortTitle;
  const mobileNav = NAV_ITEMS.map(item => viewControl(item, activeView)).join("");
  const desktopNav = NAV_ITEMS.map(item => {
    const current = item.view === activeView ? ' aria-current="page"' : "";
    return '<button type="button" data-view-target="' + item.view + '"' + current + ">" + item.label + "</button>";
  }).join("");

  return {
    top: [
      '<header class="subject-topbar lobby-topbar" data-subject-toolbar="top">',
      '<a class="subject-brand app-brand" href="?view=home" data-view-target="home" aria-label="' + subject.name + '\ud3b8 \ud648\uc73c\ub85c \uc774\ub3d9">',
      '<span class="brand-seal" aria-hidden="true">' + subject.icon + '</span>',
      '<span class="subject-brand-copy"><strong data-game-title>' + title + '</strong><small>Group Resolution: \uacfc\ud559 \ud6c8\ub828\uc758 \uc0c8\ub85c\uc6b4 \ud328\ub7ec\ub2e4\uc784</small></span></a>',
      '<nav class="subject-desktop-nav desktop-tabs" aria-label="' + subject.name + '\ud3b8 \uc8fc\uc694 \uba54\ub274">' + desktopNav + '<a href="' + shopHref + '">\ucf69 \uc0c1\uc810</a></nav>',
      '<div class="subject-top-actions topbar-actions">',
      '<a class="science-portal-link" href="' + portalHref + '" aria-label="\uacfc\ud559 \ud1b5\ud569\uad00\uc73c\ub85c \uc774\ub3d9">\uc804\uccb4 \uacfc\ubaa9</a>',
      '<a class="bean-wallet" href="' + shopHref + '" aria-label="\ucf69 \uc0c1\uc810\uc73c\ub85c \uc774\ub3d9"><small>\ubcf4\uc720 \ucf69</small><strong id="headerBeans" data-shared-beans>0</strong></a>',
      '<button id="settingsButton" class="settings-button topbar-icon" type="button" data-settings-open aria-label="\uc124\uc815 \uc5f4\uae30">\u2699</button>',
      '</div></header>'
    ].join(""),
    bottom: [
      '<nav class="subject-mobile-nav mobile-bottom-nav" data-subject-toolbar="bottom" aria-label="' + subject.name + '\ud3b8 \uc8fc\uc694 \uba54\ub274">',
      mobileNav,
      '<a href="' + shopHref + '"><span aria-hidden="true">\u8c46</span>\uc0c1\uc810</a>',
      '<button id="bottomSettingsButton" type="button" data-settings-open aria-label="\uc124\uc815 \uc5f4\uae30"><span aria-hidden="true">\u2699</span>\uc124\uc815</button>',
      '</nav>'
    ].join("")
  };
}

function elementFromMarkup(doc, markup) {
  const template = doc.createElement("template");
  template.innerHTML = markup;
  return template.content.firstElementChild;
}

export function replaceSubjectToolbars(doc, markup) {
  const currentTop = doc.querySelector("[data-subject-toolbar=top],.lobby-topbar,.subject-topbar");
  const currentBottom = doc.querySelector("[data-subject-toolbar=bottom],.mobile-bottom-nav,.subject-mobile-nav");
  if (currentTop) currentTop.replaceWith(elementFromMarkup(doc, markup.top));
  if (currentBottom) currentBottom.replaceWith(elementFromMarkup(doc, markup.bottom));
}
