// API Base URL
const API_URL = '/api';

// DOM Elements
let taskForm, taskInput, taskList, statsContainer;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    taskForm = document.getElementById('task-form');
    taskInput = document.getElementById('task-input');
    taskList = document.getElementById('task-list');
    statsContainer = document.getElementById('stats');

    // Event listeners
    if (taskForm) {
        taskForm.addEventListener('submit', handleAddTask);
    }

    // Load initial data
    loadTasks();
    loadStats();
});

// Load all tasks
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const tasks = await response.json();
        displayTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks');
    }
}

// Display tasks in the UI
function displayTasks(tasks) {
    if (!taskList) return;
    
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
        taskList.innerHTML = '<li class="task-item">No tasks yet. Add one above!</li>';
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="task-content">
                <strong>${escapeHtml(task.title)}</strong>
                ${task.priority ? `<span class="priority-${task.priority}">[${task.priority}]</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-small btn-success" onclick="toggleTask('${task.id}', ${!task.completed})">
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteTask('${task.id}')">
                    Delete
                </button>
            </div>
        `;
        taskList.appendChild(li);
    });
}

// Add new task
async function handleAddTask(e) {
    e.preventDefault();
    
    const title = taskInput.value.trim();
    if (!title) return;

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, priority: 'medium' })
        });

        if (!response.ok) throw new Error('Failed to add task');

        taskInput.value = '';
        loadTasks();
        loadStats();
    } catch (error) {
        console.error('Error adding task:', error);
        showError('Failed to add task');
    }
}

// Toggle task completion
async function toggleTask(taskId, completed) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed })
        });

        if (!response.ok) throw new Error('Failed to update task');

        loadTasks();
        loadStats();
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task');
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete task');

        loadTasks();
        loadStats();
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();
        displayStats(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Display statistics
function displayStats(stats) {
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${stats.total || 0}</div>
            <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.completed || 0}</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${stats.pending || 0}</div>
            <div class="stat-label">Pending</div>
        </div>
    `;
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
