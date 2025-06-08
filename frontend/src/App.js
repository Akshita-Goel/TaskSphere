import React, { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:3001';

const CacheManager = {
  CACHE_KEY: 'tasksphere_tasks',
  CACHE_TIMESTAMP_KEY: 'tasksphere_tasks_timestamp',
  CACHE_EXPIRY_TIME: 5 * 60 * 1000,

  getCachedTasks: () => {
    try {
      const cachedTasks = localStorage.getItem(CacheManager.CACHE_KEY);
      const timestamp = localStorage.getItem(CacheManager.CACHE_TIMESTAMP_KEY);
      
      if (cachedTasks && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge < CacheManager.CACHE_EXPIRY_TIME) {
          return JSON.parse(cachedTasks);
        } else {
          CacheManager.clearCache();
        }
      }
      return null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      CacheManager.clearCache();
      return null;
    }
  },

  setCachedTasks: (tasks) => {
    try {
      localStorage.setItem(CacheManager.CACHE_KEY, JSON.stringify(tasks));
      localStorage.setItem(CacheManager.CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  },

  clearCache: () => {
    try {
      localStorage.removeItem(CacheManager.CACHE_KEY);
      localStorage.removeItem(CacheManager.CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  isCacheValid: () => {
    const timestamp = localStorage.getItem(CacheManager.CACHE_TIMESTAMP_KEY);
    if (timestamp) {
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < CacheManager.CACHE_EXPIRY_TIME;
    }
    return false;
  }
};

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheStatus, setCacheStatus] = useState('idle');

  const makeRequest = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Something went wrong');
      }

      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || 'Network error occurred');
      setLoading(false);
      throw err;
    }
  }, []);

  return { makeRequest, loading, error, setError, cacheStatus, setCacheStatus };
};

const CacheStatusIndicator = ({ cacheStatus, onRefresh, loading }) => {
  const getCacheStatusColor = () => {
    switch (cacheStatus) {
      case 'loaded_from_cache': return 'text-green-600 bg-green-50 border-green-200';
      case 'loaded_from_server': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'cache_fallback': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (cacheStatus) {
      case 'loaded_from_cache': return 'Loaded from cache';
      case 'loaded_from_server': return 'Loaded from server';
      case 'cache_fallback': return 'Using cached data (server error)';
      case 'error': return 'Error loading data';
      case 'fetching': return 'Fetching from server...';
      default: return 'Ready';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`px-2 py-1 rounded border ${getCacheStatusColor()}`}>
        Status: {getStatusText()}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? '⟳' : '↻'} Refresh Cache
      </button>
    </div>
  );
};

// Task status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-red-100 text-red-800 border-red-200';
      case 'in progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

// Task card component
const TaskCard = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description,
    status: task.status
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      title: task.title,
      description: task.description,
      status: task.status
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      title: task.title,
      description: task.description,
      status: task.status
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(task.id, editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Task title"
              required
            />
          </div>
          <div className="mb-4">
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Task description"
              rows="3"
              required
            />
          </div>
          <div className="mb-4">
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todo">To Do</option>
              <option value="in progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>
      <p className="text-gray-600 mb-4">{task.description}</p>
      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
        {task.updatedAt !== task.createdAt && (
          <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleEdit}
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Add task form component
const AddTaskForm = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(formData);
      setFormData({ title: '', description: '', status: 'todo' });
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Task title"
            required
          />
        </div>
        <div className="mb-4">
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Task description"
            rows="3"
            required
          />
        </div>
        <div className="mb-4">
          <select
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="todo">To Do</option>
            <option value="in progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Task
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Error notification component
const ErrorNotification = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium">Error</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 ml-2"
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-sm">{error}</p>
    </div>
  );
};

// Main App component
const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const { makeRequest, loading, error, setError, cacheStatus, setCacheStatus } = useApi();

  // Enhanced fetchTasks with caching
  const fetchTasks = useCallback(async (forceRefresh = false) => {
    setCacheStatus('fetching');
    setError(null);

    try {
      // Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedTasks = CacheManager.getCachedTasks();
        if (cachedTasks) {
          setTasks(cachedTasks);
          setCacheStatus('loaded_from_cache');
          return;
        }
      }

      // Fetch from server
      const response = await makeRequest('/api/tasks');
      const fetchedTasks = response.tasks;
      
      // Update state and cache
      setTasks(fetchedTasks);
      CacheManager.setCachedTasks(fetchedTasks);
      setCacheStatus('loaded_from_server');
      
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      
      // Try to fall back to cache even if server fails
      const cachedTasks = CacheManager.getCachedTasks();
      if (cachedTasks) {
        setTasks(cachedTasks);
        setCacheStatus('cache_fallback');
        setError('Using cached data - server unavailable');
      } else {
        setCacheStatus('error');
      }
    }
  }, [makeRequest, setError, setCacheStatus]);

  // Enhanced addTask with cache update 
  const addTask = async (taskData) => {
    try {
      const response = await makeRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      
      // Update local state
      const updatedTasks = [...tasks, response.task];
      setTasks(updatedTasks);
      
      // Update cache
      CacheManager.setCachedTasks(updatedTasks);
      setCacheStatus('updated');
      
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add task:', error);
      throw error;
    }
  };

  // Enhanced updateTask with cache update 
  const updateTask = async (taskId, updates) => {
    try {
      const response = await makeRequest(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      // Update local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? response.task : task
      );
      setTasks(updatedTasks);
      
      // Update cache
      CacheManager.setCachedTasks(updatedTasks);
      setCacheStatus('updated');
      
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  // Enhanced deleteTask with cache update
  const deleteTask = async (taskId) => {
    try {
      await makeRequest(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      // Update local state
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);
      
      // Update cache
      CacheManager.setCachedTasks(updatedTasks);
      setCacheStatus('updated');
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  // Manual cache refresh
  const handleCacheRefresh = () => {
    CacheManager.clearCache();
    fetchTasks(true);
  };

  useEffect(() => {
    let filtered = tasks;

    if (filter !== 'all') {
      filtered = filtered.filter(task => task.status === filter);
    }

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, filter, sort, searchTerm]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const taskCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in progress': tasks.filter(t => t.status === 'in progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorNotification error={error} onClose={() => setError(null)} />
      
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">TaskSphere</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {showAddForm ? 'Cancel' : 'Add Task'}
            </button>
          </div>
          {/* Cache Status */}
          <CacheStatusIndicator 
            cacheStatus={cacheStatus}
            onRefresh={handleCacheRefresh}
            loading={loading}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Tasks ({taskCounts.all})</option>
                <option value="todo">To Do ({taskCounts.todo})</option>
                <option value="in progress">In Progress ({taskCounts['in progress']})</option>
                <option value="done">Done ({taskCounts.done})</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">By Title</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchTasks(false)}
              disabled={loading}
              className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Add Task Form */}
        {showAddForm && (
          <div className="mb-6">
            <AddTaskForm 
              onAdd={addTask} 
              onCancel={() => setShowAddForm(false)} 
            />
          </div>
        )}

        {/* Task Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-800">{taskCounts.all}</div>
            <div className="text-gray-600">Total Tasks</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-red-600">{taskCounts.todo}</div>
            <div className="text-gray-600">To Do</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-yellow-600">{taskCounts['in progress']}</div>
            <div className="text-gray-600">In Progress</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">{taskCounts.done}</div>
            <div className="text-gray-600">Done</div>
          </div>
        </div>

        {/* Cache Info Panel */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-2 text-gray-800">Cache Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <strong>Cache Status:</strong> {CacheManager.isCacheValid() ? 'Valid' : 'Expired/Empty'}
            </div>
            <div>
              <strong>Cache Expiry:</strong> 5 minutes
            </div>
            <div>
              <strong>Cached Tasks:</strong> {tasks.length}
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading && tasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'No tasks match your criteria' : 'No tasks yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter settings.' 
                : 'Create your first task to get started!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>TaskSphere - Built with React & Node.js (with Caching)</p>
          <p className="mt-1">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskManager;