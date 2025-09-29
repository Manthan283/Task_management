# Task Management System — RESTful API (Node.js + Express + MongoDB)

A clean, production-ready REST API for managing **Users** and **Tasks** with:

- **Express** app structured by feature (models/controllers/routes/middleware/utils)
- **MongoDB** via **Mongoose**
- **HTTP Basic Auth** + **bcrypt** password hashing
- **Role-based access control** (admin/user)
- **Ownership checks** (only assigned user or admin can update/delete)
- **Pagination** for listing tasks
- Well-commented code, `.env.example`, tests, and troubleshooting notes

> **Note:** This repo intentionally does **not** include Docker instructions. Run locally with Node.js and MongoDB.

---

## Quick Start (Local)

```bash
# 1) Install deps
npm install

# 2) Configure environment
cp .env.example .env
# Edit .env with your values

# 3) Start MongoDB locally (ensure it's running)
# e.g., default: mongodb://localhost:27017

# 4) Run the server
npm run dev   # dev with nodemon
# or
npm start     # plain node
```

Server will listen on `PORT` (defaults to **3000**). MongoDB connection uses `MONGO_URI`.

---

## Environment
Create `.env` (see `.env.example`):

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/task_api
BCRYPT_SALT_ROUNDS=10
NODE_ENV=development
```

- **Commit** `.env.example` (template only, no secrets).
- **Do not commit** `.env` — it contains real secrets and is ignored via `.gitignore`.

---

## Authentication

This API uses **HTTP Basic Auth** for all endpoints **except** `POST /users` (user self‑registration).

- Send the header: `Authorization: Basic <base64(username:password)>`
- Passwords are hashed with **bcrypt**; the middleware resolves the user and attaches `req.user`.

### Roles
- `admin`: can assign tasks to any user; can list users; can update/delete any task.
- `user`: can create tasks (assigned only to themselves), list tasks, and update/delete **only** tasks assigned to them.

---

## Models

### User
```
{ id, username, passwordHash, role }  // role: 'admin' | 'user'
```

### Task
```
{ id, title, description, assignedTo(User._id), status('open'|'in_progress'|'done'), createdAt, updatedAt }
```

> `createdAt`/`updatedAt` are managed by Mongoose timestamps.

---

## Endpoints

### Users
- **POST /users** — Create a user (public). Body:
  ```json
  { "username": "alice", "password": "secret" }
  ```
  Response (201): user summary without password hash.

- **GET /users** — List users (**admin only**).
  Response: array of `{ id, username, role, createdAt }`.

### Tasks
- **POST /tasks** — Create a task.
  - **Admin** can set `assignedTo` to any user id.
  - **User**: `assignedTo` is forced to their own id.
  Body example:
  ```json
  { "title":"Fix bug", "description":"…", "assignedTo":"<userId>", "status":"open" }
  ```

- **GET /tasks** — Paginated list.
  - Query: `page` (default 1), `limit` (default 10)
  - Response:
    ```json
    {
      "data": [ /* tasks */ ],
      "pagination": {
        "totalCount": 42,
        "page": 1,
        "limit": 10,
        "totalPages": 5
      }
    }
    ```

- **GET /tasks/:id** — Get task by id.

- **PUT /tasks/:id** — Update task (only admin or assigned user). Users cannot reassign; only admin can change `assignedTo`.

- **DELETE /tasks/:id** — Delete task (only admin or assigned user).

> All task routes require authentication.

---

## Pagination Semantics
- Query params: `page`, `limit`
- Defaults: `page=1`, `limit=10`
- Returns `totalCount`, `totalPages`.

---

## Example cURL

```bash
# Create user (public)
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret"}'

# List users (admin only)
curl http://localhost:3000/users \
  -H "Authorization: Basic $(printf 'admin:adminpass' | base64)"

# Create task (as user; assignedTo forced to self)
curl -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -H "Authorization: Basic $(printf 'alice:secret' | base64)" \
  -d '{"title":"Fix bug","description":"…"}'

# List tasks with pagination
curl 'http://localhost:3000/tasks?page=1&limit=5' \
  -H "Authorization: Basic $(printf 'alice:secret' | base64)"
```

---

## Project Structure
```
.
├── src
│   ├── app.js
│   ├── server.js
│   ├── config
│   │   └── db.js
│   ├── controllers
│   │   ├── taskController.js
│   │   └── userController.js
│   ├── middleware
│   │   ├── auth.js
│   │   └── authorize.js
│   ├── models
│   │   ├── Task.js
│   │   └── User.js
│   ├── routes
│   │   ├── taskRoutes.js
│   │   └── userRoutes.js
│   └── utils
│       ├── hash.js
│       └── pagination.js
├── tests
│   └── test.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Running Tests

This repo uses **Jest** + **Supertest**.

```bash
npm test
```

If you see ESM-related errors (e.g., *Cannot use import statement outside a module*), use the following in `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "test": "cross-env NODE_OPTIONS=--experimental-vm-modules node ./node_modules/jest/bin/jest.js --runInBand"
  }
}
```

And keep a minimal `jest.config.cjs`:

```js
module.exports = {
  testEnvironment: 'node',
  transform: {},
};
```

---

## Security Notes
- Passwords are **never** stored in plaintext; only bcrypt hashes are stored.
- Basic Auth requires TLS in production — terminate HTTPS at a proxy or use a platform that enforces HTTPS.
- Public registration always creates `role = 'user'`.


