require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tasksphere',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 10;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connected successfully');
      return true;
    } catch (error) {
      retries++;
      console.log(`Database connection attempt ${retries}/${maxRetries} failed:`, error.message);
      
      if (retries === maxRetries) {
        console.error('Failed to connect to database after maximum retries');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000)));
    }
  }
};

// Initialize database and pgvector extension
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Enable pgvector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('pgvector extension enabled');
    
    // Check if tasks table exists, if not the schema.sql should have created it
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating tasks table...');
      await pool.query(`
        CREATE TABLE tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          status VARCHAR(50) NOT NULL CHECK (status IN ('todo', 'in progress', 'done')),
          embedding vector(384),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);');
    }
    
    // Check if we have any data
    const { rows } = await pool.query('SELECT COUNT(*) FROM tasks');
    const taskCount = parseInt(rows[0].count);
    
    if (taskCount === 0) {
      console.log('Inserting sample tasks...');
      await insertSampleTasks();
    } else if (taskCount > 0) {
      console.log('Updating embeddings for existing tasks...');
      await updateMissingEmbeddings();
    }
    
    if (taskCount >= 5) {
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS tasks_embedding_idx 
          ON tasks USING ivfflat (embedding vector_cosine_ops) 
          WITH (lists = 10);
        `);
        console.log('Vector index created');
      } catch (error) {
        console.log('Vector index creation skipped:', error.message);
      }
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000', 'http://frontend:3000']
    : true
}));
app.use(express.json({ limit: '10mb' }));

let tasks = [
  {
    id: 1,
    title: "Finish report",
    description: "Complete Q3 summary",
    status: "todo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Team meeting",
    description: "Discuss project goals",
    status: "done",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Code review",
    description: "Review pull requests from team",
    status: "in progress",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let nextId = 4;

const validateTask = (task) => {
  const errors = [];
  
  if (!task.title || typeof task.title !== 'string' || task.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (!task.description || typeof task.description !== 'string') {
    errors.push('Description is required and must be a string');
  }
  
  if (!task.status || !['todo', 'in progress', 'done'].includes(task.status)) {
    errors.push('Status must be one of: todo, in progress, done');
  }
  
  return errors;
};

const findTaskById = (id) => {
  const taskId = parseInt(id);
  return tasks.find(task => task.id === taskId);
};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const { status, sort } = req.query;
    
    let filteredTasks = [...tasks];
    
    // Filter by status if provided
    if (status && ['todo', 'in progress', 'done'].includes(status)) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    
    // Sort tasks
    if (sort === 'newest') {
      filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'title') {
      filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    res.json({
      tasks: filteredTasks,
      total: filteredTasks.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch tasks'
    });
  }
});

// Get task by ID
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = findTaskById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found',
        message: `Task with ID ${req.params.id} does not exist`
      });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch task'
    });
  }
});

app.get('/api/tasks/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const queryEmbedding = await generateEmbedding(query);

    const result = await pool.query(
      `SELECT id, title, description, status, created_at, updated_at,
              1 - (embedding <#> $1::vector) AS similarity
         FROM tasks
        ORDER BY embedding <#> $1::vector
        LIMIT 3`,
      [queryEmbedding]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Create new task
app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, status = 'todo' } = req.body;
    
    const taskData = { title, description, status };
    const validationErrors = validateTask(taskData);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        messages: validationErrors
      });
    }
    
    const newTask = {
      id: nextId++,
      title: title.trim(),
      description: description.trim(),
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    
    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create task'
    });
  }
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const task = findTaskById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found',
        message: `Task with ID ${req.params.id} does not exist`
      });
    }
    
    const { title, description, status } = req.body;
    const updates = {};
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    
    const updatedTask = { ...task, ...updates };
    const validationErrors = validateTask(updatedTask);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        messages: validationErrors
      });
    }
    
    // Apply updates
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    
    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update task'
    });
  }
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const taskIndex = tasks.findIndex(task => task.id === parseInt(req.params.id));
    
    if (taskIndex === -1) {
      return res.status(404).json({ 
        error: 'Task not found',
        message: `Task with ID ${req.params.id} does not exist`
      });
    }
    
    const deletedTask = tasks.splice(taskIndex, 1)[0];
    
    res.json({
      message: 'Task deleted successfully',
      task: deletedTask
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete task'
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong on the server'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TaskSphere API running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/tasks`);
});

