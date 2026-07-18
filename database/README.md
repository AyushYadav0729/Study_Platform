# Database — Study Platform

## Database used
PostgreSQL, hosted on Supabase.

## Tables

### users
Stores student accounts for login/signup.

| Column        | Type      | Notes                          |
|---------------|-----------|---------------------------------|
| id            | UUID      | Primary key, auto-generated     |
| name          | TEXT      | Student's full name             |
| email         | TEXT      | Must be unique (used to log in) |
| password_hash | TEXT      | Never store raw passwords       |
| semester      | INT       | Current semester                |
| branch        | TEXT      | e.g. CSE, ECE                   |
| created_at    | TIMESTAMP | Auto-set when account is made   |

## How to set up
1. Create a Supabase project.
2. Open the SQL editor in Supabase.
3. Run the contents of `schema.sql`.
4. Copy `.env.example` to `.env` and fill in your real Supabase URL and key (get these from Supabase → Project Settings → API).

## Future expansion
Planned tables: Subjects, Modules, PDFs, Quizzes, Performance — to be added once auth is working.