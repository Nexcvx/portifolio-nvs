'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const projects = [...document.querySelectorAll('.project[data-video]')];
const filters = [...document.querySelectorAll('.work-filter-btn')];

function matchesFilter(project, filter) {
  return filter === 'all' || project.dataset.category.split(/\s+/).includes(filter);
}

function filterProjects(selected, animate = false) {
  const previous = new Map();
  if (animate && !reduceMotion.matches) {
    projects.filter(card => !card.hidden).forEach(card => previous.set(card, card.getBoundingClientRect()));
  }
  filters.forEach(button => {
    const active = button === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  projects.forEach(project => {
    project.getAnimations().forEach(animation => animation.cancel());
    project.hidden = !matchesFilter(project, selected.dataset.filter);
  });
  if (!previous.size) return;
  projects.filter(card => !card.hidden).forEach(card => {
    const before = previous.get(card);
    const after = card.getBoundingClientRect();
    const start = before
      ? { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` }
      : { transform: 'translateY(18px) scale(.97)', opacity: .15 };
    card.animate([start, { transform: 'none', opacity: 1 }], {
      duration: 470, easing: 'cubic-bezier(.2,.8,.2,1)'
    });
  });
}

filters.forEach(button => {
  const count = projects.filter(project => matchesFilter(project, button.dataset.filter)).length;
  button.querySelector('.count').textContent = count;
  button.addEventListener('click', () => filterProjects(button, true));
});
filterProjects(filters.find(button => button.classList.contains('active')) || filters[0]);

const tabs = [...document.querySelectorAll('.tab-btn')];
const tabList = tabs[0].parentElement;
tabList.setAttribute('role', 'tablist');
tabList.setAttribute('aria-label', 'Categorias de serviços');

function selectTab(selected) {
  tabs.forEach(tab => {
    const active = tab === selected;
    const panel = document.getElementById('plans-' + tab.dataset.tab);
    tab.setAttribute('aria-selected', String(active));
    tab.classList.toggle('active', active);
    tab.tabIndex = active ? 0 : -1;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
}

tabs.forEach((tab, index) => {
  const panel = document.getElementById('plans-' + tab.dataset.tab);
  tab.id = 'tab-' + tab.dataset.tab;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panel.id);
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tab.id);
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const destinations = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const next = tabs[destinations[event.key]];
    selectTab(next);
    next.focus();
  });
});
selectTab(tabs.find(tab => tab.classList.contains('active')) || tabs[0]);

const questions = [...document.querySelectorAll('.faq-q')];
questions.forEach((question, index) => {
  const answer = question.closest('.faq-item').querySelector('.faq-a');
  answer.id = 'faq-answer-' + (index + 1);
  answer.hidden = true;
  question.setAttribute('aria-controls', answer.id);
  question.setAttribute('aria-expanded', 'false');
  question.addEventListener('click', () => {
    const opening = answer.hidden;
    questions.forEach(button => {
      const active = opening && button === question;
      const item = button.closest('.faq-item');
      item.classList.toggle('open', active);
      item.querySelector('.faq-a').hidden = !active;
      button.setAttribute('aria-expanded', String(active));
    });
  });
});

const ptView = document.getElementById('viewPt');
const enView = document.getElementById('viewEn');
const languageButton = document.getElementById('btnToggleEn');
const languageLabel = languageButton.querySelector('[data-language-label]') || languageButton;
const initialLanguageLabel = languageLabel.textContent;
enView.lang = 'en';
enView.hidden = true;

function setEditingView(english, focusTitle = true) {
  ptView.hidden = english;
  enView.hidden = !english;
  document.body.classList.toggle('show-en', english);
  languageLabel.textContent = english ? 'Portfólio (PT)' : initialLanguageLabel;
  if (focusTitle) {
    const title = (english ? enView : ptView).querySelector('h1');
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

languageButton.addEventListener('click', () => setEditingView(enView.hidden));
document.getElementById('heroBtnEn')?.addEventListener('click', () => setEditingView(true));
document.getElementById('btnBackToPt').addEventListener('click', () => setEditingView(false));
document.querySelectorAll('#nav a[href^="#"], .skip-link').forEach(link => {
  link.addEventListener('click', () => {
    if (!enView.hidden) setEditingView(false, false);
  });
});

const dialog = document.getElementById('lightbox');
const player = document.getElementById('lightboxInner');
const closeButton = document.getElementById('lightboxClose');
const sourceLink = document.getElementById('lightboxSource');
let openedBy;

function openProject(project, trigger) {
  const id = project.dataset.video;
  const instagram = project.dataset.type === 'instagram';
  const platform = instagram ? 'Instagram' : 'YouTube';
  const title = project.querySelector('.project-title').textContent;
  const instagramUrl = `https://www.instagram.com/reel/${id}/`;
  const frame = document.createElement('iframe');
  frame.src = instagram ? instagramUrl + 'embed/' : `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  frame.title = `${title} · ${platform}`;
  frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  document.getElementById('lightboxTitle').textContent = title;
  sourceLink.href = instagram ? instagramUrl : `https://www.youtube.com/watch?v=${id}`;
  sourceLink.textContent = `Abrir no ${platform}`;
  player.classList.toggle('is-short', project.dataset.short === 'true');
  player.replaceChildren(frame);
  openedBy = trigger;
  dialog.showModal();
  closeButton.focus();
}

projects.forEach(project => {
  project.addEventListener('click', () => openProject(project, project));
});
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  player.replaceChildren();
  openedBy?.focus({ preventScroll: true });
});

const featured = ['aDJH6hqLRlk', 'DA_a7z_ofI8', 'DLB5YvgJp1M']
  .map(id => projects.find(project => project.dataset.video === id));
const heroImage = document.getElementById('heroImage');
const cover = heroImage.getAttribute('src');
const heroPlay = document.getElementById('heroPlay');
const heroTitle = document.getElementById('heroTitle');
const picker = document.querySelector('.film-picker');
let currentFilm = 0;
let slices;
let selection = 0;

featured.forEach((project, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'film-tile';
  button.setAttribute('aria-label', 'Destacar ' + project.querySelector('.project-title').textContent);
  const image = new Image();
  image.src = project.dataset.poster;
  image.alt = '';
  button.append(image);
  button.addEventListener('click', () => showFeatured(index));
  picker.append(button);
});

// The outgoing photograph stays in place while the next still decodes.
// Each strip crops the same full-size photograph, so adjacent strips align.
async function changeFrame(source, backwards) {
  const request = ++selection;
  slices?.remove();
  slices = null;
  heroImage.classList.remove('hero-image-intro');
  if (reduceMotion.matches) {
    heroImage.src = source;
    return;
  }

  const outgoing = heroImage.getAttribute('src');
  const still = new Image();
  still.src = source;
  try { await still.decode(); } catch { return; }
  if (request !== selection) return;
  heroImage.src = source;
  if (reduceMotion.matches) return;

  const layer = document.createElement('div');
  layer.className = 'hero-slices';
  slices = layer;
  const finished = [];
  for (let strip = 0; strip < 4; strip++) {
    const frame = new Image();
    frame.className = 'hero-image';
    frame.alt = '';
    frame.src = outgoing;
    layer.append(frame);
    const top = strip * 25;
    const bottom = 75 - top;
    const left = backwards ? '0' : '100%';
    const right = backwards ? '100%' : '0';
    const animation = frame.animate([
      { clipPath: `inset(${top}% 0 ${bottom}% 0)` },
      { clipPath: `inset(${top}% ${right} ${bottom}% ${left})` }
    ], { duration: 650, delay: strip * 55, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'both' });
    finished.push(animation.finished);
  }
  heroImage.after(layer);
  await Promise.allSettled(finished);
  layer.remove();
  if (slices === layer) slices = null;
}

function showFeatured(index, backwards = index < currentFilm) {
  const next = (index + featured.length) % featured.length;
  const project = featured[next];
  if (next !== currentFilm) changeFrame(next === 0 ? cover : project.dataset.poster, backwards);
  currentFilm = next;
  const title = project.querySelector('.project-title').textContent;
  heroTitle.textContent = title;
  document.getElementById('heroIndex').textContent = String(next + 1).padStart(2, '0');
  heroPlay.setAttribute('aria-label', `Assistir a ${title}`);
  [...picker.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === next)));
}

document.getElementById('heroPrev').addEventListener('click', () => showFeatured(currentFilm - 1, true));
document.getElementById('heroNext').addEventListener('click', () => showFeatured(currentFilm + 1, false));
heroPlay.addEventListener('click', () => openProject(featured[currentFilm], heroPlay));
showFeatured(0);

// Keep the heading's accessible name intact while its letters turn into view.
let letterIndex = 0;
document.querySelectorAll('#heroHeading .line-mask > span').forEach(line => {
  const letters = [...line.textContent].map(character => {
    const letter = document.createElement(character === '.' ? 'b' : 'span');
    letter.className = 'title-letter';
    letter.style.setProperty('--letter', letterIndex++);
    letter.textContent = character;
    return letter;
  });
  line.setAttribute('aria-hidden', 'true');
  line.replaceChildren(...letters);
});
heroImage.classList.add('hero-image-intro');

const filmTrack = document.querySelector('.film-track');
const repeatedWords = filmTrack.firstElementChild.cloneNode(true);
repeatedWords.setAttribute('aria-hidden', 'true');
filmTrack.append(repeatedWords);

const frames = projects.map(project => project.querySelector('.project-frame'));
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
function updateLenses() {
  frames.forEach(frame => {
    const lens = frame.querySelector('.project-lens');
    if (reduceMotion.matches || !finePointer.matches) {
      lens?.remove();
      return;
    }
    if (lens) return;
    const overlay = document.createElement('span');
    overlay.className = 'project-lens';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.append(frame.querySelector('img').cloneNode());
    frame.append(overlay);
  });
}

// Keep the source pixel under the pointer fixed as the lens magnifies it.
frames.forEach(frame => {
  frame.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduceMotion.matches) return;
    const box = frame.getBoundingClientRect();
    frame.style.setProperty('--x', ((event.clientX - box.left) / box.width) * 100 + '%');
    frame.style.setProperty('--y', ((event.clientY - box.top) / box.height) * 100 + '%');
  });
});
finePointer.addEventListener('change', updateLenses);
reduceMotion.addEventListener('change', () => {
  updateLenses();
  if (reduceMotion.matches) {
    slices?.remove();
    frames.concat(projects).forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
  }
});
updateLenses();

if ('IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting);
    entering.forEach(({ target }, i) => {
      reveal.unobserve(target);
      if (reduceMotion.matches) return;
      target.animate([
        { clipPath: 'inset(8% 0 64% 0)', transform: 'translateY(20px)' },
        { clipPath: 'inset(0)', transform: 'none' }
      ], { duration: 720, delay: (i % 3) * 65, easing: 'cubic-bezier(.18,.8,.2,1)', fill: 'backwards' });
    });
  }, { threshold: .12 });
  frames.forEach(frame => reveal.observe(frame));
}
