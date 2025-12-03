import { loadState, saveState, statusLabels, tagLabels, STORAGE_KEY } from './data.js';

const sessionKey = 'chgk-session';
let state = loadState();

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const ui = {
  navigate(page) {
    window.location.href = page;
  },
  toast(message) {
    alert(message);
  }
};

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function setSession(payload) {
  localStorage.setItem(sessionKey, JSON.stringify(payload));
}

function getSession() {
  const raw = localStorage.getItem(sessionKey);
  return raw ? JSON.parse(raw) : null;
}

function requireUser() {
  const session = getSession();
  if (!session || !session.userId) {
    ui.navigate('index.html');
    return null;
  }
  return state.users.find(u => u.id === session.userId);
}

function requireHost() {
  const session = getSession();
  if (!session || session.role !== 'host') {
    ui.navigate('index.html');
    return false;
  }
  return true;
}

function persist() {
  saveState(state);
}

async function fileToDataUrl(file) {
  if (!file) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.toString());
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

class AvatarCropper {
  constructor(input, canvas, preview, scaleInput, offsetXInput, offsetYInput, saveBtn, targetUser) {
    this.input = input;
    this.canvas = canvas;
    this.preview = preview;
    this.scaleInput = scaleInput;
    this.offsetXInput = offsetXInput;
    this.offsetYInput = offsetYInput;
    this.saveBtn = saveBtn;
    this.targetUser = targetUser;
    this.image = null;
    this.ctx = canvas.getContext('2d');
    this.bind();
  }
  bind() {
    this.input?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await fileToDataUrl(file);
      this.image = new Image();
      this.image.onload = () => this.draw();
      this.image.src = url;
    });
    [this.scaleInput, this.offsetXInput, this.offsetYInput].forEach(ctrl => {
      ctrl?.addEventListener('input', () => this.draw());
    });
    this.saveBtn?.addEventListener('click', () => {
      const data = this.canvas.toDataURL('image/png');
      this.preview.src = data;
      this.targetUser.avatar = data;
      persist();
      ui.toast('Фото обновлено');
    });
  }
  draw() {
    if (!this.image) return;
    const scale = Number(this.scaleInput?.value || 1);
    const offsetX = Number(this.offsetXInput?.value || 0);
    const offsetY = Number(this.offsetYInput?.value || 0);
    const size = this.canvas.width;
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    this.ctx.clip();
    const w = this.image.width * scale;
    const h = this.image.height * scale;
    const x = (size - w) / 2 + offsetX;
    const y = (size - h) / 2 + offsetY;
    this.ctx.drawImage(this.image, x, y, w, h);
    this.ctx.restore();
  }
}

function renderTabs() {
  const tabContainers = document.querySelectorAll('[data-tabs]');
  tabContainers.forEach(container => {
    const buttons = container.querySelectorAll('.tab');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tabTarget;
        document.querySelectorAll('[data-tab-panel]').forEach(panel => {
          panel.classList.toggle('hidden', panel.id !== target);
        });
      });
    });
  });
}

function renderLanding() {
  renderTabs();
  const hostPasswordEl = document.querySelector('[data-host-password]');
  if (hostPasswordEl) hostPasswordEl.textContent = state.hostPassword;

  const authForms = document.querySelectorAll('[data-auth-form]');
  authForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const type = form.getAttribute('data-auth-form');

      if (type === 'signup') {
        const id = generateId('u');
        const user = {
          id,
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
          telegram: formData.get('telegram'),
          tags: (formData.get('tags') || '').toString().split(',').map(t => t.trim()).filter(Boolean),
          avatar: '',
          role: 'viewer',
          expert: !!formData.get('asExpert'),
          status: 'новичок',
          captain: false,
          notifications: [],
          archivedNews: [],
          archivedPolls: [],
          votes: {},
          assignedGames: [],
        };
        state.users.push(user);
        persist();
        setSession({ userId: id, role: 'user' });
        ui.navigate('user.html');
      }

      if (type === 'login') {
        const email = formData.get('email');
        const password = formData.get('password');
        const user = state.users.find(u => u.email === email && u.password === password);
        if (!user) return ui.toast('Пользователь не найден или пароль неверный');
        setSession({ userId: user.id, role: 'user', remember: formData.get('remember') });
        ui.navigate('user.html');
      }

      if (type === 'host') {
        const password = formData.get('password');
        if (password !== state.hostPassword) return ui.toast('Неверный пароль ведущего');
        setSession({ role: 'host' });
        ui.navigate('host.html');
      }
    });
  });
}

function renderUserNavigation() {
  const buttons = $$('[data-section]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.section;
      document.querySelectorAll('[data-section-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.sectionPanel !== target);
      });
    });
  });
}

function renderProfile(user) {
  const preview = $('[data-avatar-preview]');
  const canvas = $('[data-avatar-canvas]');
  const input = $('[data-avatar-input]');
  const scale = $('[data-avatar-scale]');
  const offsetX = $('[data-avatar-offset-x]');
  const offsetY = $('[data-avatar-offset-y]');
  const saveBtn = $('[data-save-avatar]');
  if (preview) preview.src = user.avatar || 'https://placehold.co/180x180?text=Фото';
  if (scale) scale.value = 1;
  if (offsetX) offsetX.value = 0;
  if (offsetY) offsetY.value = 0;
  new AvatarCropper(input, canvas, preview, scale, offsetX, offsetY, saveBtn, user);

  const form = $('[data-profile-form]');
  if (form) {
    form.name.value = user.name;
    form.email.value = user.email;
    form.telegram.value = user.telegram;
    form.tags.value = user.tags.join(', ');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      user.name = form.name.value;
      user.email = form.email.value;
      user.telegram = form.telegram.value;
      user.tags = form.tags.value.split(',').map(t => t.trim()).filter(Boolean);
      persist();
      renderUserMeta(user);
      renderProfileTags(user);
      ui.toast('Профиль обновлён');
    });
  }

  renderProfileTags(user);
  renderUserMeta(user);
}

function renderProfileTags(user) {
  const flairs = $('[data-user-flairs]');
  if (!flairs) return;
  flairs.innerHTML = '';
  const badges = [
    `Роль: ${user.role === 'viewer' ? 'телезритель' : 'знаток'}`,
    user.expert ? 'Дополнительная роль: знаток' : 'Без роли знатока',
    `Статус: ${user.status}`,
    user.captain ? 'Капитан' : 'Без капитанства'
  ];
  badges.concat(user.tags).forEach(text => {
    const span = document.createElement('span');
    span.className = 'pill';
    span.textContent = text;
    flairs.appendChild(span);
  });
  const rolePill = $('[data-user-role]');
  if (rolePill) rolePill.textContent = user.captain ? 'Капитан команды' : (user.expert ? 'Знаток' : 'Телезритель');
}

function renderUserMeta(user) {
  const meta = $('[data-user-meta]');
  if (!meta) return;
  meta.innerHTML = `
    <strong>${user.name}</strong>
    <div class="card__meta">
      <span>Telegram: <a class="link" href="https://t.me/${user.telegram.replace('@', '')}" target="_blank">${user.telegram}</a></span>
      <span>Статус: ${user.status}</span>
      <span>Роль: ${user.role === 'viewer' ? 'телезритель' : 'знаток'}${user.captain ? ' · капитан' : ''}</span>
      <span>Сферы знаний: ${user.tags.join(', ') || 'не указаны'}</span>
    </div>
    <div class="stack">
      ${user.notifications.map(n => `<div class="notification${n.important ? ' pill--orange' : ''}">🔔 ${n.text}</div>`).join('')}
    </div>
  `;
}

function computeQuestionStats(user) {
  const userQuestions = state.questions.filter(q => q.authorId === user.id);
  const stats = { pending: 0, approved: 0, selected: 0, played: 0 };
  userQuestions.forEach(q => stats[q.status] = (stats[q.status] || 0) + 1);
  return stats;
}

function renderQuestionStats(user) {
  const container = $('[data-question-stats]');
  if (!container) return;
  const stats = computeQuestionStats(user);
  container.innerHTML = '';
  Object.entries(stats).forEach(([key, value]) => {
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.textContent = `${statusLabels[key]}: ${value}`;
    container.appendChild(pill);
  });
}

function renderUserQuestions(user) {
  renderQuestionStats(user);
  const form = $('[data-question-form]');
  const cardsContainer = $('[data-question-cards]');
  if (!form || !cardsContainer) return;
  form.author.value = user.name;
  form.telegram.value = user.telegram;
  form.email.value = user.email;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const newQuestion = {
      id: generateId('q'),
      authorId: user.id,
      text: data.get('question'),
      answer: data.get('answer'),
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
      tag: 'блиц',
      questionImage: await fileToDataUrl(data.get('questionImage')),
      answerImage: await fileToDataUrl(data.get('answerImage')),
      gameId: null,
    };
    state.questions.unshift(newQuestion);
    persist();
    renderUserQuestions(user);
    ui.toast('Вопрос отправлен и ожидает проверки ведущего');
    form.reset();
  });

  const userQuestions = state.questions.filter(q => q.authorId === user.id);
  cardsContainer.innerHTML = '';
  userQuestions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="question-card__header">
        <strong>${q.text}</strong>
        <span class="status-chip" data-status="${q.status}">${statusLabels[q.status]}</span>
      </div>
      <div class="card__meta">
        <span>Ответ скрыт до проверки ведущим</span>
        ${q.questionImage ? `<img src="${q.questionImage}" class="news-image" alt="Фото вопроса">` : ''}
        ${q.status === 'played' ? `<span>Статус игры: ${q.gameId ? 'сыгран' : 'не взят'}</span>` : ''}
      </div>
      <div class="question-card__footer">
        <span class="pill">${q.tag || 'без тега'}</span>
        ${q.gameId ? `<span class="pill pill--orange">Выбран для игры</span>` : ''}
      </div>
    `;
    cardsContainer.appendChild(card);
  });
}

function renderNewsFeed(user) {
  const feed = $('[data-news-feed]');
  if (!feed) return;
  feed.innerHTML = '<h3>Новости клуба</h3>';
  state.news.forEach(item => {
    if (!item.views.includes(user.id)) {
      item.views.push(user.id);
      persist();
    }
    const hidden = user.archivedNews.includes(item.id);
    const container = document.createElement('article');
    container.className = 'feed-item';
    container.innerHTML = `
      <div class="feed-item__header">
        <div>
          <p class="eyebrow">${new Date(item.createdAt).toLocaleDateString('ru-RU')}</p>
          <strong>${item.title}</strong>
        </div>
        <div class="feed-item__actions">
          <button class="btn ghost" data-action="${hidden ? 'restore' : 'hide'}" data-id="${item.id}">${hidden ? 'Вернуть' : 'Архивировать'}</button>
        </div>
      </div>
      <p class="muted">${item.text}</p>
      ${item.image ? `<img src="${item.image}" class="news-image" alt="">` : ''}
      ${item.buttonUrl ? `<a class="btn" href="${item.buttonUrl}" target="_blank">${item.buttonLabel || 'Открыть'}</a>` : ''}
    `;
    feed.appendChild(container);
  });

  feed.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'hide') {
      user.archivedNews.push(id);
    } else {
      user.archivedNews = user.archivedNews.filter(n => n !== id);
    }
    persist();
    renderNewsFeed(user);
  });
}

function renderPolls(user) {
  const container = $('[data-polls]');
  if (!container) return;
  container.innerHTML = '<h3>Опросы</h3>';
  state.polls.forEach(poll => {
    const archived = user.archivedPolls.includes(poll.id);
    const voted = user.votes[poll.id] || [];
    const now = new Date();
    const closed = poll.deadline && new Date(poll.deadline) < now;
    const item = document.createElement('article');
    item.className = 'feed-item';
    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0) || 1;
    item.innerHTML = `
      <div class="feed-item__header">
        <strong>${poll.text}</strong>
        <div class="feed-item__actions">
          <button class="btn ghost" data-poll-archive data-id="${poll.id}">${archived ? 'Вернуть' : 'Архивировать'}</button>
        </div>
      </div>
      <div class="poll-options">
        ${poll.options.map(o => `
          <div class="poll-option">
            <label>
              <input type="${poll.multi ? 'checkbox' : 'radio'}" name="${poll.id}" value="${o.id}" ${voted.includes(o.id) ? 'checked' : ''} ${closed ? 'disabled' : ''}>
              ${o.text}
            </label>
            <span>${o.votes.length}</span>
          </div>
          <div class="progress"><div class="progress__bar" style="width:${(o.votes.length / totalVotes) * 100}%"></div></div>
        `).join('')}
      </div>
      ${closed ? '<div class="pill pill--dark">Голосование завершено</div>' : ''}
      <button class="btn" data-poll-reset data-id="${poll.id}" ${closed ? 'disabled' : ''}>Отменить голос</button>
    `;
    container.appendChild(item);
  });

  container.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const pollId = input.name;
    const optionId = input.value;
    const poll = state.polls.find(p => p.id === pollId);
    if (!poll) return;
    poll.options.forEach(o => {
      o.votes = o.votes.filter(v => v !== user.id);
    });
    if (input.type === 'checkbox') {
      const formOptions = $$(`input[name="${pollId}"]:checked`, container);
      formOptions.forEach(opt => {
        const targetOption = poll.options.find(o => o.id === opt.value);
        if (targetOption) targetOption.votes.push(user.id);
      });
      user.votes[pollId] = formOptions.map(o => o.value);
    } else {
      const targetOption = poll.options.find(o => o.id === optionId);
      if (targetOption) targetOption.votes.push(user.id);
      user.votes[pollId] = [optionId];
    }
    persist();
    renderPolls(user);
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.hasAttribute('data-poll-archive')) {
      const id = btn.dataset.id;
      if (user.archivedPolls.includes(id)) {
        user.archivedPolls = user.archivedPolls.filter(p => p !== id);
      } else {
        user.archivedPolls.push(id);
      }
      persist();
      renderPolls(user);
    }
    if (btn.hasAttribute('data-poll-reset')) {
      const id = btn.dataset.id;
      const poll = state.polls.find(p => p.id === id);
      if (!poll) return;
      poll.options.forEach(o => o.votes = o.votes.filter(v => v !== user.id));
      user.votes[id] = [];
      persist();
      renderPolls(user);
    }
  });
}

function renderGamesForUser(user) {
  const container = $('[data-game-list]');
  if (!container) return;
  container.innerHTML = '';
  const games = state.games.filter(g => g.experts.includes(user.id));
  if (!games.length) {
    container.innerHTML = '<p class="muted">Вы пока не приглашены в игры.</p>';
    return;
  }
  games.forEach(game => {
    const important = user.notifications.some(n => n.important && n.text.includes(game.title));
    const card = document.createElement('div');
    card.className = 'feed-item';
    card.innerHTML = `
      <div class="feed-item__header">
        <div>
          <p class="eyebrow">${new Date(game.date).toLocaleDateString('ru-RU')}</p>
          <strong>${game.title}</strong>
        </div>
        ${important ? '<div class="pill pill--dark">Важно</div>' : ''}
      </div>
      <p class="muted">Вопросов в игре: ${game.questions.length}</p>
      <p>Роль: ${game.captain === user.id ? 'Капитан' : 'Знаток'}</p>
      <div class="list">${game.questions.map(qid => {
        const q = state.questions.find(qq => qq.id === qid);
        return `<div class="question-card"><strong>${q?.text || 'Вопрос'}</strong></div>`;
      }).join('')}</div>
    `;
    container.appendChild(card);
  });
}

function renderHostNavigation() {
  const buttons = $$('[data-section]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.section;
      document.querySelectorAll('[data-section-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.sectionPanel !== target);
      });
    });
  });
}

function renderHostQuestions() {
  const container = $('[data-host-questions]');
  const statusFilter = $('[data-filter-status]');
  const gameFilter = $('[data-filter-game]');
  if (!container) return;

  const selectedStatus = statusFilter?.value || 'all';
  const selectedGame = gameFilter?.value || 'all';
  let questions = [...state.questions];
  if (selectedStatus !== 'all') questions = questions.filter(q => q.status === selectedStatus);
  if (selectedGame !== 'all') questions = questions.filter(q => q.gameId === selectedGame);

  container.innerHTML = '';
  questions.forEach(q => {
    const author = state.users.find(u => u.id === q.authorId);
    const card = document.createElement('article');
    card.className = 'question-card';
    const answerHidden = true;
    card.innerHTML = `
      <div class="question-card__header">
        <div>
          <strong>${q.text}</strong>
          <div class="card__meta">
            <span>Автор: ${author?.name || '—'}</span>
            <span>Email: ${author?.email || ''}</span>
            <a class="link" target="_blank" href="https://t.me/${author?.telegram?.replace('@', '')}">Диалог в Telegram</a>
          </div>
        </div>
        <span class="status-chip" data-status="${q.status}">${statusLabels[q.status]}</span>
      </div>
      ${q.questionImage ? `<img src="${q.questionImage}" class="news-image" alt="Фото вопроса">` : ''}
      <details>
        <summary>Показать ответ</summary>
        <p><strong>Ответ:</strong> ${q.answer}</p>
        ${q.answerImage ? `<img src="${q.answerImage}" class="news-image" alt="Фото ответа">` : ''}
      </details>
      <div class="question-card__footer">
        <select data-question-status="${q.id}">
          ${Object.entries(statusLabels).map(([key, label]) => `<option value="${key}" ${q.status === key ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <select data-question-tag="${q.id}">
          ${tagLabels.map(t => `<option value="${t}" ${q.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <select data-question-game="${q.id}">
          <option value="">Не выбрана игра</option>
          ${state.games.map(g => `<option value="${g.id}" ${q.gameId === g.id ? 'selected' : ''}>${g.title}</option>`).join('')}
        </select>
      </div>
    `;
    container.appendChild(card);
  });

  container.onchange = (e) => {
    const select = e.target;
    if (!(select instanceof HTMLSelectElement)) return;
    const id = select.dataset.questionStatus || select.dataset.questionTag || select.dataset.questionGame;
    const q = state.questions.find(quest => quest.id === id);
    if (!q) return;
    if (select.hasAttribute('data-question-status')) q.status = select.value;
    if (select.hasAttribute('data-question-tag')) q.tag = select.value;
    if (select.hasAttribute('data-question-game')) q.gameId = select.value || null;
    persist();
    renderUserStatsForHost();
    renderHostQuestions();
  };
}

function renderUserCardsForHost() {
  const container = $('[data-host-users]');
  if (!container) return;
  container.innerHTML = '';
  state.users.forEach(user => {
    const card = document.createElement('article');
    card.className = 'feed-item';
    card.innerHTML = `
      <div class="feed-item__header">
        <div>
          <strong>${user.name}</strong>
          <p class="muted">${user.email}</p>
        </div>
        <div class="pill-list">
          <span class="pill">${user.role === 'viewer' ? 'Телезритель' : 'Знаток'}</span>
          ${user.expert ? '<span class="pill pill--green">Знаток</span>' : ''}
          ${user.captain ? '<span class="pill pill--dark">Капитан</span>' : ''}
        </div>
      </div>
      <div class="card__meta">
        <span>Telegram: <a class="link" href="https://t.me/${user.telegram.replace('@', '')}" target="_blank">${user.telegram}</a></span>
        <span>Статус: ${user.status}</span>
        <span>Сферы знаний: ${user.tags.join(', ') || 'не указаны'}</span>
      </div>
      <div class="feed-item__actions">
        <button class="btn" data-toggle-expert="${user.id}">${user.expert ? 'Убрать роль знатока' : 'Назначить знатоком'}</button>
        <button class="btn" data-toggle-captain="${user.id}">${user.captain ? 'Снять капитана' : 'Назначить капитаном'}</button>
        <select data-user-status="${user.id}">
          ${['новичок', 'опытный', 'магистр'].map(s => `<option value="${s}" ${user.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="card__meta">Вопросов: ${state.questions.filter(q => q.authorId === user.id).length}</div>
    `;
    container.appendChild(card);
  });

  container.onclick = (e) => {
    const btn = e.target.closest('button');
    if (btn?.hasAttribute('data-toggle-expert')) {
      const user = state.users.find(u => u.id === btn.dataset.toggleExpert);
      user.expert = !user.expert;
      persist();
      renderUserCardsForHost();
      return;
    }
    if (btn?.hasAttribute('data-toggle-captain')) {
      const user = state.users.find(u => u.id === btn.dataset.toggleCaptain);
      user.captain = !user.captain;
      persist();
      renderUserCardsForHost();
      return;
    }
  };

  container.onchange = (e) => {
    const select = e.target;
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.hasAttribute('data-user-status')) {
      const user = state.users.find(u => u.id === select.dataset.userStatus);
      if (user) {
        user.status = select.value;
        persist();
        renderUserCardsForHost();
      }
    }
  };
}

function renderNewsForHost() {
  const form = $('[data-news-form]');
  const container = $('[data-host-news]');
  if (!form || !container) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const editingId = form.dataset.editing;
    if (editingId) {
      const item = state.news.find(n => n.id === editingId);
      if (item) {
        item.title = data.get('title');
        item.text = data.get('text');
        item.buttonLabel = data.get('buttonLabel');
        item.buttonUrl = data.get('buttonUrl');
        const newImage = await fileToDataUrl(data.get('image'));
        if (newImage) item.image = newImage;
      }
      form.dataset.editing = '';
      form.querySelector('button[type="submit"]').textContent = 'Опубликовать новость';
    } else {
      const news = {
        id: generateId('n'),
        title: data.get('title'),
        text: data.get('text'),
        image: await fileToDataUrl(data.get('image')),
        buttonLabel: data.get('buttonLabel'),
        buttonUrl: data.get('buttonUrl'),
        views: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.news.unshift(news);
    }
    persist();
    form.reset();
    renderNewsForHost();
  };

  container.innerHTML = '<h3>Все новости</h3>';
  state.news.forEach(item => {
    const card = document.createElement('article');
    card.className = 'feed-item';
    card.innerHTML = `
      <div class="feed-item__header">
        <strong>${item.title}</strong>
        <div class="feed-item__actions">
          <button class="btn" data-edit-news="${item.id}">Редактировать</button>
          <button class="btn ghost" data-delete-news="${item.id}">Удалить</button>
        </div>
      </div>
      <p>${item.text}</p>
      <p class="muted">Просмотры: ${item.views.length}</p>
      ${item.views.length ? `<small class="muted">Посмотрели: ${item.views.map(id => state.users.find(u => u.id === id)?.name || id).join(', ')}</small>` : ''}
    `;
    container.appendChild(card);
  });

  container.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.hasAttribute('data-delete-news')) {
      const id = btn.dataset.deleteNews;
      state.news = state.news.filter(n => n.id !== id);
      state.users.forEach(u => u.archivedNews = u.archivedNews.filter(n => n !== id));
      persist();
      renderNewsForHost();
    }
    if (btn.hasAttribute('data-edit-news')) {
      const id = btn.dataset.editNews;
      const item = state.news.find(n => n.id === id);
      if (item) {
        form.title.value = item.title;
        form.text.value = item.text;
        form.buttonLabel.value = item.buttonLabel || '';
        form.buttonUrl.value = item.buttonUrl || '';
        form.dataset.editing = id;
        form.querySelector('button[type="submit"]').textContent = 'Сохранить изменения';
      }
    }
  };

  form.addEventListener('reset', () => {
    form.dataset.editing = '';
    form.querySelector('button[type="submit"]').textContent = 'Опубликовать новость';
  });
}

function renderPollsForHost() {
  const form = $('[data-poll-form]');
  const container = $('[data-host-polls]');
  if (!form || !container) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const editingId = form.dataset.editing;
    if (editingId) {
      const poll = state.polls.find(p => p.id === editingId);
      if (poll) {
        poll.text = data.get('text');
        const newOptions = data.get('options').toString().split('\n').filter(Boolean);
        poll.options = newOptions.map((text, idx) => {
          const existing = poll.options[idx];
          return { id: existing?.id || `o${idx}`, text, votes: existing?.votes || [] };
        });
        poll.multi = !!data.get('multi');
        poll.deadline = data.get('deadline');
      }
      form.dataset.editing = '';
      form.querySelector('button[type="submit"]').textContent = 'Создать опрос';
    } else {
      const poll = {
        id: generateId('p'),
        text: data.get('text'),
        options: data.get('options').toString().split('\n').filter(Boolean).map((text, idx) => ({ id: `o${idx}`, text, votes: [] })),
        multi: !!data.get('multi'),
        deadline: data.get('deadline'),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.polls.unshift(poll);
    }
    persist();
    form.reset();
    renderPollsForHost();
  };

  container.innerHTML = '<h3>Опросы</h3>';
  state.polls.forEach(poll => {
    const card = document.createElement('article');
    card.className = 'feed-item';
    card.innerHTML = `
      <div class="feed-item__header">
        <strong>${poll.text}</strong>
        <div class="feed-item__actions">
          <button class="btn" data-edit-poll="${poll.id}">Редактировать</button>
          <button class="btn ghost" data-delete-poll="${poll.id}">Удалить</button>
        </div>
      </div>
      <p class="muted">Голосов: ${poll.options.reduce((sum, o) => sum + o.votes.length, 0)}</p>
      <div class="card__meta">
        ${poll.options.map(o => `<div>${o.text} — ${o.votes.length} (${o.votes.map(v => state.users.find(u => u.id === v)?.name || v).join(', ') || 'нет голосов'})</div>`).join('')}
      </div>
    `;
    container.appendChild(card);
  });

  container.onclick = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.hasAttribute('data-delete-poll')) {
      const id = btn.dataset.deletePoll;
      state.polls = state.polls.filter(p => p.id !== id);
      state.users.forEach(u => delete u.votes[id]);
      persist();
      renderPollsForHost();
    }
    if (btn.hasAttribute('data-edit-poll')) {
      const id = btn.dataset.editPoll;
      const poll = state.polls.find(p => p.id === id);
      if (poll) {
        form.text.value = poll.text;
        form.options.value = poll.options.map(o => o.text).join('\n');
        form.multi.checked = poll.multi;
        form.deadline.value = poll.deadline || '';
        form.dataset.editing = id;
        form.querySelector('button[type="submit"]').textContent = 'Сохранить изменения';
      }
    }
  };

  form.addEventListener('reset', () => {
    form.dataset.editing = '';
    form.querySelector('button[type="submit"]').textContent = 'Создать опрос';
  });
}

function renderGamesForHost() {
  const form = $('[data-game-form]');
  const questionSelect = $('[data-game-question-select]');
  const expertSelect = $('[data-game-expert-select]');
  const captainSelect = $('[data-game-captain-select]');
  const container = $('[data-host-games]');
  if (!form || !questionSelect || !expertSelect || !captainSelect || !container) return;

  function populateOptions() {
    questionSelect.innerHTML = state.questions.map(q => `<option value="${q.id}">${q.text.slice(0, 48)}</option>`).join('');
    expertSelect.innerHTML = state.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    captainSelect.innerHTML = '<option value="">Выберите капитана</option>' + state.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  }
  populateOptions();

  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const selectedQuestions = Array.from(questionSelect.selectedOptions).map(o => o.value);
    const selectedExperts = Array.from(expertSelect.selectedOptions).map(o => o.value);
    const captain = data.get('captain') || selectedExperts[0] || '';
    const game = {
      id: generateId('g'),
      title: data.get('title'),
      date: data.get('date'),
      questions: selectedQuestions,
      experts: selectedExperts,
      captain,
    };
    state.games.push(game);
    selectedExperts.forEach(expertId => {
      const user = state.users.find(u => u.id === expertId);
      if (!user) return;
      user.notifications.push({ id: generateId('n'), text: `Выбраны на игру «${game.title}» как ${captain === expertId ? 'капитан' : 'знаток'}`, date: new Date().toISOString().slice(0, 10), important: true });
      user.assignedGames.push(game.id);
    });
    selectedQuestions.forEach(qid => {
      const q = state.questions.find(q => q.id === qid);
      if (q) q.gameId = game.id;
    });
    persist();
    form.reset();
    populateOptions();
    renderUserStatsForHost();
    renderGamesForHost();
  };

  container.innerHTML = '<h3>Созданные игры</h3>';
  state.games.forEach(game => {
    const card = document.createElement('article');
    card.className = 'feed-item';
    card.innerHTML = `
      <div class="feed-item__header">
        <strong>${game.title}</strong>
        <span class="pill">${new Date(game.date).toLocaleDateString('ru-RU')}</span>
      </div>
      <p>Капитан: ${state.users.find(u => u.id === game.captain)?.name || 'не выбран'}</p>
      <p>Знатоки: ${game.experts.map(id => state.users.find(u => u.id === id)?.name || id).join(', ') || 'нет'}</p>
      <p>Вопросы: ${game.questions.map(id => state.questions.find(q => q.id === id)?.text.slice(0, 40) || id).join(' · ')}</p>
    `;
    container.appendChild(card);
  });
}

function renderUserStatsForHost() {
  const gameFilter = $('[data-filter-game]');
  if (gameFilter) {
    gameFilter.innerHTML = '<option value="all">Любая</option>' + state.games.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
  }
}

function bindLogout() {
  $$('[data-action="logout"]').forEach(btn => btn.addEventListener('click', () => {
    localStorage.removeItem(sessionKey);
    ui.navigate('index.html');
  }));
}

function init() {
  const page = document.body.dataset.page;
  if (page === 'landing') {
    renderLanding();
  }
  if (page === 'user') {
    const user = requireUser();
    if (!user) return;
    bindLogout();
    renderUserNavigation();
    renderProfile(user);
    renderUserQuestions(user);
    renderNewsFeed(user);
    renderPolls(user);
    renderGamesForUser(user);
  }
  if (page === 'host') {
    if (!requireHost()) return;
    bindLogout();
    renderHostNavigation();
    renderUserStatsForHost();
    renderHostQuestions();
    renderUserCardsForHost();
    renderNewsForHost();
    renderPollsForHost();
    renderGamesForHost();
    const statusFilter = $('[data-filter-status]');
    const gameFilter = $('[data-filter-game]');
    statusFilter?.addEventListener('change', renderHostQuestions);
    gameFilter?.addEventListener('change', renderHostQuestions);
  }
}

document.addEventListener('DOMContentLoaded', init);
