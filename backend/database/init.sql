SELECT 'CREATE DATABASE tasksphere'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tasksphere')\gexec
\c tasksphere;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'taskuser') THEN
        CREATE USER taskuser WITH PASSWORD 'taskpass123';
    END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE tasksphere TO taskuser;
GRANT ALL ON SCHEMA public TO taskuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO taskuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO taskuser;

CREATE EXTENSION IF NOT EXISTS vector;

SELECT * FROM pg_extension WHERE extname = 'vector';