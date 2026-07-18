-- Study Platform: users table (authentication)
-- More features will be added in the future, such as user roles, profile pictures, etc.
-- Can add more schemas for other parts of the application, such as courses, assignments, etc.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    semester INT,
    branch TEXT,
    created_at TIMESTAMP DEFAULT now()
);