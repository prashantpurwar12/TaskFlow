# Team Task Manager

A full-stack team task management app with authentication, project and team management, task assignment, status tracking, dashboards, and role-based access control.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Lucide Icons
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT, bcrypt
- Deployment: Railway

## Features

- Signup and login
- Admin and member roles
- First registered user becomes Admin; later public signups become Members
- Project creation and member management
- Task creation, assignment, due dates, priority, and status
- Dashboard with task totals, status breakdown, overdue tasks, and recent tasks
- REST APIs with validation and protected routes

## Local Setup

```bash
npm install
cp server/.env.example server/.env
npm run dev
```

Set `MONGODB_URI` and `JWT_SECRET` in `server/.env`.

## Seed Demo Data

```bash
npm run seed
```

Demo accounts:

- Admin: `admin@example.com` / `Password123!`
- Member: `member@example.com` / `Password123!`

## Railway Deployment

1. Push this repo to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add a MongoDB service in Railway or use MongoDB Atlas.
4. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
5. Railway should run:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
6. Open the Railway public URL.

## API Overview

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/users`
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/:id/members`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/dashboard`

## Submission Checklist

- Live URL: add Railway URL here
- GitHub repo: add repository URL here
- README: included
- Demo video: record a 2-5 minute walkthrough showing login, project creation, task assignment, dashboard, and role restrictions
