// Task Manager App Script
(function() {
  'use strict';

  /**
   * Data Model for a Task
   * @typedef {Object} Task
   * @property {string} id - unique id
   * @property {string} title - task title
   * @property {string|null} due - due date (YYYY-MM-DD) or null
   * @property {boolean} completed - completion state
   * @property {number} created - timestamp
   */

  const selectors = {
    form: '#task-form',
    input: '#task-input',
    due: '#task-due',
    list: '#task-list',
    stats: '#task-stats',
    clearCompleted: '#clear-completed',
    clearAll: '#clear-all',
    filters: '.filters',
    filterBtn: '.filter-btn'
  };

  const storageKey = 'taskManager.tasks.v1';
  const themeKey = 'taskManager.theme.v1';
  /** @type {Task[]} */
  let tasks = [];

  const form = document.querySelector(selectors.form);
  const input = document.querySelector(selectors.input);
  const dueInput = document.querySelector(selectors.due);
  const list = document.querySelector(selectors.list);
  const stats = document.querySelector(selectors.stats);
  const clearCompletedBtn = document.querySelector(selectors.clearCompleted);
  const clearAllBtn = document.querySelector(selectors.clearAll);
  const filtersWrap = document.querySelector(selectors.filters);
  let currentFilter = 'all'; // all | pending | completed
  const themeToggleBtn = document.getElementById('theme-toggle');

  let currentTheme = 'dark';

  // Accessibility: announce dynamic changes
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.className = 'visually-hidden';
  document.body.appendChild(announcer);

  function announce(msg) { announcer.textContent = msg; }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        tasks = data.filter(t => typeof t.id === 'string' && typeof t.title === 'string').map(t => ({
          id: t.id,
          title: t.title,
          due: t.due || null,
          completed: !!t.completed,
          created: typeof t.created === 'number' ? t.created : Date.now()
        }));
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
      tasks = [];
    }
  }

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function addTask(title, due) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        announce('Task title is required');
        return;
    }
    input.removeAttribute('aria-invalid');
    const task = { id: uid(), title: trimmedTitle, due: due || null, completed: false, created: Date.now() };
    tasks.push(task);
    save();
    render();
    announce(`Added task: ${task.title}`);
}

  function deleteTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const [removed] = tasks.splice(idx, 1);
      save();
      render();
      announce(`Deleted task: ${removed.title}`);
    }
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      save();
      renderTaskElement(id); // partial re-render
      updateStats();
      announce(`${task.completed ? 'Completed' : 'Reopened'} task: ${task.title}`);
    }
  }

  function clearCompleted() {
    const before = tasks.length;
    tasks = tasks.filter(t => !t.completed);
    const removed = before - tasks.length;
    save();
    render();
    announce(`Cleared ${removed} completed ${removed === 1 ? 'task' : 'tasks'}`);
  }

  function clearAll() {
    const count = tasks.length;
    tasks = [];
    save();
    render();
    announce(`Deleted all ${count} tasks`);
  }

  function formatDue(due) {
    if (!due) return '';
    try {
      const d = new Date(due + 'T00:00:00');
      const now = new Date();
      const diff = (d - now) / 86400000; // days
      const options = { month: 'short', day: 'numeric' };
      const dateStr = d.toLocaleDateString(undefined, options);
      let rel = '';
      if (diff < -1) rel = ' (past due)';
      else if (diff < 0) rel = ' (due today)';
      else if (diff < 1) rel = ' (tomorrow)';
      else if (diff < 7) rel = ` (in ${Math.ceil(diff)}d)`;
      return `${dateStr}${rel}`;
    } catch { return due; }
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;
    if (task.completed) li.classList.add('completed');

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'task-check';
    check.setAttribute('aria-pressed', task.completed ? 'true' : 'false');
    check.setAttribute('aria-label', task.completed ? 'Mark as not completed' : 'Mark as completed');
    check.dataset.checked = task.completed ? 'true' : 'false';
    check.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>';
    check.addEventListener('click', () => toggleTask(task.id));

    const content = document.createElement('div');
    content.className = 'task-content';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.textContent = task.due ? `Due: ${formatDue(task.due)}` : 'Added just now';

    content.appendChild(title);
    content.appendChild(meta);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn delete-btn';
    del.setAttribute('aria-label', `Delete task: ${task.title}`);
    del.innerHTML = '✕';
    del.addEventListener('click', () => deleteTask(task.id));

    li.appendChild(check);
    li.appendChild(content);
    li.appendChild(del);

    // keyboard support: space toggles
    li.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); toggleTask(task.id); }
    });

    return li;
  }

  function render() {
    list.innerHTML = '';
    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No tasks yet. Add one above to get started!';
      list.appendChild(empty);
      updateStats();
      return;
    }
    const frag = document.createDocumentFragment();
    tasks
      .slice()
      .filter(t => {
        if (currentFilter === 'pending') return !t.completed;
        if (currentFilter === 'completed') return t.completed;
        return true; // all
      })
      .sort((a,b) => Number(b.created) - Number(a.created))
      .forEach(t => frag.appendChild(createTaskElement(t)));
    list.appendChild(frag);
    updateStats();
  }

  function renderTaskElement(id) {
    const li = list.querySelector(`[data-id="${id}"]`);
    const task = tasks.find(t => t.id === id);
    if (!li || !task) return render();
    li.classList.toggle('completed', task.completed);
    const check = li.querySelector('.task-check');
    if (check) {
      check.dataset.checked = task.completed ? 'true' : 'false';
      check.setAttribute('aria-pressed', task.completed ? 'true' : 'false');
      check.setAttribute('aria-label', task.completed ? 'Mark as not completed' : 'Mark as completed');
    }
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    const filteredCount = tasks.filter(t => {
      if (currentFilter === 'pending') return !t.completed;
      if (currentFilter === 'completed') return t.completed;
      return true;
    }).length;
    let scope = '';
    if (currentFilter !== 'all') scope = ` | Showing ${filteredCount} ${currentFilter}`;
    stats.textContent = total ? `${remaining} remaining / ${completed} completed (total ${total})${scope}` : 'No tasks';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      announce('Task title is required');
      return;
    }
    input.removeAttribute('aria-invalid');
    addTask(title, dueInput.value || null);
    form.reset();
    input.focus();
  }

  function bindEvents() {
    form.addEventListener('submit', handleSubmit);
    clearCompletedBtn.addEventListener('click', clearCompleted);
    clearAllBtn.addEventListener('click', () => {
      if (!tasks.length) return;
      if (confirm('Delete ALL tasks? This cannot be undone.')) clearAll();
    });
    if (filtersWrap) {
      filtersWrap.addEventListener('click', (e) => {
        const btn = e.target.closest(selectors.filterBtn);
        if (!btn) return;
        const filter = btn.dataset.filter;
        if (!filter || filter === currentFilter) return;
        currentFilter = filter;
        // update button states
        document.querySelectorAll(selectors.filterBtn).forEach(b => {
          const active = b.dataset.filter === currentFilter;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        render();
        announce(`Filter set to ${currentFilter}`);
      });
    }
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
      themeToggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); }
      });
    }
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    if (themeToggleBtn) {
      const isLight = theme === 'light';
      themeToggleBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      themeToggleBtn.setAttribute('aria-label', isLight ? 'Toggle dark mode' : 'Toggle light mode');
      themeToggleBtn.querySelector('.toggle-icon').textContent = isLight ? '☀️' : '🌙';
    }
    try { localStorage.setItem(themeKey, theme); } catch {}
    announce(`${theme === 'light' ? 'Light' : 'Dark'} mode enabled`);
  }

  function toggleTheme() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function initTheme() {
    try {
      const stored = localStorage.getItem(themeKey);
      if (stored === 'light' || stored === 'dark') { applyTheme(stored); return; }
    } catch {}
    // Fallback to system preference
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }

  function init() {
    load();
    initTheme();
    bindEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
