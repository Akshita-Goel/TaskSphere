CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('todo', 'in progress', 'done')),
    embedding vector(384), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO tasks (title, description, status) VALUES 
    ('Finish report', 'Complete Q3 summary', 'todo'),
    ('Team meeting', 'Discuss project goals and timeline with development team', 'done'),
    ('Code review', 'Review pull requests from team members and provide feedback', 'in progress'),
    ('Buy groceries', 'Get milk, eggs, bread, and vegetables from the store', 'todo'),
    ('Doctor appointment', 'Annual health checkup and blood work', 'todo'),
    ('Update website', 'Fix bugs and add new features to company website', 'in progress'),
    ('Prepare presentation', 'Create slides for quarterly business review', 'todo')
ON CONFLICT DO NOTHING;

GRANT ALL PRIVILEGES ON TABLE tasks TO taskuser;
GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO taskuser;