/**
 * Task Flow Lite - Core Application Logic
 * Pure Vanilla JavaScript (ES6+) - 100% Offline Compatible
 */

const STORAGE_KEY = 'taskflowlite_tasks';

// Application State
let tasks = [];
let currentFilter = 'all';
let selectedCategory = 'General';

// DOM Element Selectors
const elements = {
  taskForm: document.getElementById('taskForm'),
  taskInput: document.getElementById('taskInput'),
  categoryChips: document.getElementById('categoryChips'),
  prioritySelect: document.getElementById('prioritySelect'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  emptyTitle: document.getElementById('emptyTitle'),
  emptySubtitle: document.getElementById('emptySubtitle'),
  totalTasksCount: document.getElementById('totalTasksCount'),
  activeTasksCount: document.getElementById('activeTasksCount'),
  completedTasksCount: document.getElementById('completedTasksCount'),
  progressBarFill: document.getElementById('progressBarFill'),
  progressText: document.getElementById('progressText'),
  badgeAll: document.getElementById('badgeAll'),
  badgeActive: document.getElementById('badgeActive'),
  badgeCompleted: document.getElementById('badgeCompleted'),
  filterTabs: document.getElementById('filterTabs'),
  clearCompletedBtn: document.getElementById('clearCompletedBtn'),
  appYear: document.getElementById('appYear')
};

// Category Emojis Map
const categoryIcons = {
  General: '📌',
  Work: '💼',
  Personal: '🏠',
  Urgent: '⚡'
};

// Priority Badges Map
const priorityIcons = {
  Normal: '🟢',
  Medium: '🟡',
  High: '🔴'
};

/**
 * Loads tasks from localStorage
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      tasks = JSON.parse(stored);
      if (!Array.isArray(tasks)) tasks = [];
    } else {
      tasks = [];
    }
  } catch (err) {
    console.error('Failed to load tasks from localStorage:', err);
    tasks = [];
  }
}

/**
 * Persists tasks to localStorage
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks to localStorage:', err);
  }
}

/**
 * Adds a new task
 */
function addTask(text, category, priority) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text: trimmed,
    completed: false,
    category: category || 'General',
    priority: priority || 'Normal',
    createdAt: Date.now()
  };

  tasks.unshift(newTask);
  saveTasks();
  renderApp();
}

/**
 * Toggles a task's completed status
 */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderApp();
  }
}

/**
 * Deletes a task by ID
 */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderApp();
}

/**
 * Clears all completed tasks
 */
function clearCompletedTasks() {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount === 0) return;

  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderApp();
}

/**
 * Formats relative or short time
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Updates hero stats, progress bar, and badge counts
 */
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (elements.totalTasksCount) elements.totalTasksCount.textContent = total;
  if (elements.activeTasksCount) elements.activeTasksCount.textContent = active;
  if (elements.completedTasksCount) elements.completedTasksCount.textContent = completed;

  if (elements.badgeAll) elements.badgeAll.textContent = total;
  if (elements.badgeActive) elements.badgeActive.textContent = active;
  if (elements.badgeCompleted) elements.badgeCompleted.textContent = completed;

  if (elements.progressBarFill) {
    elements.progressBarFill.style.width = `${percentage}%`;
  }

  if (elements.progressText) {
    if (total === 0) {
      elements.progressText.textContent = "No tasks yet · Add one to get started! 🚀";
    } else if (completed === total) {
      elements.progressText.textContent = "🎉 Awesome! All tasks completed today!";
    } else {
      elements.progressText.textContent = `${percentage}% completed · ${active} pending task${active > 1 ? 's' : ''}`;
    }
  }

  if (elements.clearCompletedBtn) {
    elements.clearCompletedBtn.style.visibility = completed > 0 ? 'visible' : 'hidden';
  }
}

/**
 * Escapes HTML characters for security
 */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * Renders the filtered task list
 */
function renderTaskList() {
  let filtered = tasks;
  if (currentFilter === 'active') {
    filtered = tasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = tasks.filter(t => t.completed);
  }

  if (!elements.taskList || !elements.emptyState) return;

  if (filtered.length === 0) {
    elements.taskList.innerHTML = '';
    elements.emptyState.classList.add('visible');

    if (currentFilter === 'completed') {
      elements.emptyTitle.textContent = "No completed tasks yet";
      elements.emptySubtitle.textContent = "Complete your tasks to see them highlighted here!";
    } else if (currentFilter === 'active') {
      elements.emptyTitle.textContent = "All caught up! 🎉";
      elements.emptySubtitle.textContent = "You don't have any pending tasks right now.";
    } else {
      elements.emptyTitle.textContent = "All clear! 🌈";
      elements.emptySubtitle.textContent = "You have no tasks right now. Add one above to kick off your day!";
    }
    return;
  }

  elements.emptyState.classList.remove('visible');

  elements.taskList.innerHTML = filtered.map(task => {
    const catIcon = categoryIcons[task.category] || '📌';
    const priIcon = priorityIcons[task.priority] || '🟢';
    const timeStr = formatTime(task.createdAt);

    return `
      <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-left">
          <div class="custom-checkbox" data-action="toggle" title="${task.completed ? 'Mark pending' : 'Mark completed'}"></div>
          <div class="task-details">
            <span class="task-title">${escapeHtml(task.text)}</span>
            <div class="task-meta">
              <span class="meta-chip">${catIcon} ${escapeHtml(task.category)}</span>
              <span class="meta-chip meta-priority-${task.priority}">${priIcon} ${task.priority}</span>
              <span class="meta-time">${timeStr}</span>
            </div>
          </div>
        </div>
        <button type="button" class="btn-delete" data-action="delete" title="Delete task">
          🗑️
        </button>
      </li>
    `;
  }).join('');
}

/**
 * Master render function
 */
function renderApp() {
  updateStats();
  renderTaskList();
}

/**
 * Sets up all event listeners
 */
function initEvents() {
  // Form submission
  if (elements.taskForm) {
    elements.taskForm.addEventListener('submit', ev => {
      ev.preventDefault();
      const text = elements.taskInput.value;
      const priority = elements.prioritySelect.value;
      addTask(text, selectedCategory, priority);
      elements.taskInput.value = '';
      elements.taskInput.focus();
    });
  }

  // Category chip selector
  if (elements.categoryChips) {
    elements.categoryChips.addEventListener('click', ev => {
      const chip = ev.target.closest('.chip');
      if (chip) {
        document.querySelectorAll('#categoryChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedCategory = chip.dataset.category || 'General';
      }
    });
  }

  // Filter tabs
  if (elements.filterTabs) {
    elements.filterTabs.addEventListener('click', ev => {
      const filterBtn = ev.target.closest('.filter-btn');
      if (filterBtn) {
        document.querySelectorAll('#filterTabs .filter-btn').forEach(b => b.classList.remove('active'));
        filterBtn.classList.add('active');
        currentFilter = filterBtn.dataset.filter || 'all';
        renderTaskList();
      }
    });
  }

  // Clear completed tasks button
  if (elements.clearCompletedBtn) {
    elements.clearCompletedBtn.addEventListener('click', () => {
      clearCompletedTasks();
    });
  }

  // Task list click delegation (toggle and delete)
  if (elements.taskList) {
    elements.taskList.addEventListener('click', ev => {
      const taskItem = ev.target.closest('.task-item');
      if (!taskItem) return;
      const id = taskItem.dataset.id;

      const toggleAction = ev.target.closest('[data-action="toggle"]') || ev.target.closest('.task-title');
      const deleteAction = ev.target.closest('[data-action="delete"]');

      if (deleteAction) {
        deleteTask(id);
      } else if (toggleAction) {
        toggleTask(id);
      }
    });
  }
}

/**
 * App initialization
 */
function init() {
  if (elements.appYear) {
    elements.appYear.textContent = new Date().getFullYear();
  }

  loadTasks();
  initEvents();
  renderApp();
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
