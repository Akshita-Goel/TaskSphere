# TaskSphere
A full-stack task management application built with React frontend, Node.js and Express.js backend, Docker containerization including caching mechanism to improve performance by reducing redundant API calls. It also includes PostgreSQL with pgvector for semantic similarity search.

## Setup Instructions
1. Clone the github repository

2. Setup Backend
```bash
cd backend
npm install
npm start
```

3. Setup Frontend 
```bash
cd frontend
npm install
npm run start
```

4. Docker Commands
```bash
# Build and start all services
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Run in background
docker-compose up -d
```

5. Database Setup
- Install PostgreSQL and pgvector:
```bash 
Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
```
- Install pgvector
```bash 
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

- Create Database:
```bash 
CREATE DATABASE tasksphere;
CREATE USER taskuser WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE tasksphere TO taskuser;
```

## Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/tasks
- Health Check: http://localhost:3001/health

## API Endpoints
- GET /api/tasks - Get all tasks (supports filtering and sorting)
- GET /api/tasks/:id - Get specific task
- POST /api/tasks - Create new task
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task

## TASK 1 : Build a Dockerized Web Application

**Frontend** 
- Real-time Task Management: Add, edit, delete, and update task status
- Advanced Filtering: Filter by status (all, todo, in progress, done)
- Search Functionality: Search tasks by title and description
- Sorting Options: Sort by newest, oldest, or alphabetically
- Task Statistics: Dashboard showing task counts by status
- Error Handling: User-friendly error notifications
- Loading States: Visual feedback during API operations

**Backend** 
- RESTful API: Full CRUD operations for tasks
- Input Validation: Server-side validation with detailed error messages
- Error Handling: Comprehensive error handling and logging
- Security: CORS protection and Helmet.js security headers
- Filtering & Sorting: Server-side filtering and sorting support
- Health Check: Endpoint for monitoring application health

**Docker Implementation**
- Multi-container setup with docker-compose
- Separate containers for frontend and backend
- Health checks and proper networking
- Volume mounting for development
- Production-ready configuration

**UI/UX Enhancements**
- Modern Design: Clean, professional interface with Tailwind CSS
- Interactive Cards: Hover effects and smooth transitions
- Status Badges: Color-coded status indicators
- Responsive Grid: Adapts to different screen sizes
- Loading Animations: Spinner and skeleton loading states

**Screenshot**
![tasksphere ss](https://github.com/user-attachments/assets/ecfa9c06-2c2e-46e4-9d98-324490e1f789)


## TASK 2 : Add Basic Caching for Performance

**Smart Cache Management**
- Cache Key: 'tasks' - stores the actual task data
- Timestamp Key: 'tasks_timestamp' - tracks when data was cached
- Expiry Time: 5 minutes (configurable)
- Automatic Cleanup: Expired cache is automatically cleared

**Cache Validation**
- Checks if cached data exists and is within the expiry time
- Falls back to server data if cache is expired or invalid
- Provides graceful degradation when server is unavailable

**Error Handling**
- Falls back to cached data if server requests fail
- Clears corrupted cache data automatically
- Provides user feedback about cache status

**Manual Cache Refresh**
- "Refresh Cache" button to force server fetch
- Clear cache and reload data on demand
- Visual feedback during refresh operations

**Creative Additions**
- Real-time cache status indicator
- Cache information panel
- Loading states and error handling
- Optimistic UI updates

**Performance Benefits**
- Reduced API Calls: Eliminates redundant server requests
- Faster Load Times: Instant data display from cache
- Offline Capability: Graceful degradation when server is unavailable
- Better UX: Immediate feedback and smooth interactions

**Docker Integration**
- The caching system works seamlessly with Docker deployments.
- No additional configuration needed - the cache is stored in the browser's localStorage.

**Security Considerations**
- Cache data is stored in browser localStorage (client-side only)
- No sensitive data is cached
- Cache automatically expires to prevent stale data
- Proper error handling prevents cache corruption

**Screenshot**
![tasksphere ss task 2(1)](https://github.com/user-attachments/assets/9c1ab79d-16cc-4349-be1d-daab61caad54)


**Cached data**

![tasksphere ss task 2(3)](https://github.com/user-attachments/assets/a286bc17-fb65-4494-b3a0-801a24bc3f78)


## TASK 3 : Add a Vector Search Feature

**Vector Search Capabilities**
- Semantic Task Search: Find tasks with similar meanings 
- Similarity Scoring: Each result includes a similarity percentage
- Bulk Similarity Analysis: Discover similar tasks across your entire database
- Smart Filtering: Automatically filters out low-similarity results

**Database Enhancements**
- PostgreSQL Integration: Robust database with ACID compliance
- pgvector Extension: Efficient vector storage and similarity search
- Indexed Searches: Optimized vector queries
- Automatic Embedding Generation: Embeddings created and updated automatically

**Performance Optimization**
- Vector index automatically created for fast searches
- Configurable result limits to prevent overwhelming responses
- Efficient embedding generation and storage

**Smart and Personalized Search Results**
- Results are sorted by semantic similarity score, allowing the most relevant tasks to appear first.
- Each task includes a similarity field to indicate how close it is to the search intent.
- You can further highlight matching scores or group tasks based on similarity in the frontend

**Screenshot**
![tasksphere ss task 3](https://github.com/user-attachments/assets/6a8c55eb-7a1b-4006-bd0b-74f6203a1cfa)
