-- Study Platform: users table (authentication)
-- Add more features as we need it and can be used to keep schema for other tables in the future
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    semester INT,
    branch TEXT,
    created_at TIMESTAMP DEFAULT now()
);