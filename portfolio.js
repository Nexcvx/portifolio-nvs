'use strict';

const projects = [...document.querySelectorAll('.project[data-video]')];
const filters = [...document.querySelectorAll('.work-filter-btn')];

function matchesFilter(project, filter) {
  return filter === 'all' || project.dataset.category.split(/\s+/).includes(filter);
}

function filterProjects(selected) {
  filters.forEach(button => {
    const active = button === selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  projects.forEach(project => {
    project.hidden = !matchesFilter(project, selected.dataset.filter);
  });
}

filters.forEach(button => {
  const count = projects.filter(project => matchesFilter(project, button.dataset.filter)).length;
  button.querySelector('.count').textContent = count;
  button.addEventListener('click', () => filterProjects(button));
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
let currentFilm = 0;

function showFeatured(index) {
  const next = (index + featured.length) % featured.length;
  const changed = next !== currentFilm;
  currentFilm = next;
  const project = featured[currentFilm];
  const title = project.querySelector('.project-title').textContent;
  const poster = project.dataset.poster || project.querySelector('img')?.getAttribute('src');
  heroImage.src = currentFilm === 0 ? cover : (poster || cover);
  if (changed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroImage.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 360, easing: 'ease-out' });
  }
  document.getElementById('heroTitle').textContent = title;
  const category = document.getElementById('heroCategory');
  if (category) category.textContent = project.querySelector('.project-type').textContent;
  document.getElementById('heroIndex').textContent = String(currentFilm + 1).padStart(2, '0');
  heroPlay.setAttribute('aria-label', `Assistir a ${title}`);
}

document.getElementById('heroPrev').addEventListener('click', () => showFeatured(currentFilm - 1));
document.getElementById('heroNext').addEventListener('click', () => showFeatured(currentFilm + 1));
heroPlay.addEventListener('click', () => openProject(featured[currentFilm], heroPlay));
showFeatured(0);
