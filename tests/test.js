import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import { hashPassword } from '../src/utils/hash.js';

const authHeader = (u, p) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

let admin, alice, bob; // users captured for ids
let aliceTaskId;      // a task owned by alice

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/task_api_test';
  await connectDB();
  await mongoose.connection.db.dropDatabase();

  // seed admin and users
  admin = await User.create({ username: 'admin', passwordHash: await hashPassword('adminpass'), role: 'admin' });
  alice = await User.create({ username: 'alice', passwordHash: await hashPassword('secret'), role: 'user' });
  bob   = await User.create({ username: 'bob',   passwordHash: await hashPassword('123456'), role: 'user' });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('User registration & auth', () => {
  it('registers a new user (public)', async () => {
    const res = await request(app).post('/users').send({ username: 'charlie', password: 'p@ss' });
    expect(res.statusCode).toBe(201);
    expect(res.body.username).toBe('charlie');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate username', async () => {
    const res = await request(app).post('/users').send({ username: 'alice', password: 'whatever' });
    expect(res.statusCode).toBe(409);
  });

  it('rejects missing username/password', async () => {
    const res = await request(app).post('/users').send({ username: '' });
    expect(res.statusCode).toBe(400);
  });

  it('lists users (admin only)', async () => {
    const res = await request(app).get('/users').set('Authorization', authHeader('admin', 'adminpass'));
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('forbids user list for non-admin', async () => {
    const res = await request(app).get('/users').set('Authorization', authHeader('alice', 'secret'));
    expect(res.statusCode).toBe(403);
  });

  it('requires auth on protected route', async () => {
    const res = await request(app).get('/tasks'); // no auth
    expect(res.statusCode).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/Basic/i);
  });
});

describe('Tasks CRUD & RBAC', () => {
  it('user creates a task assigned to self even if assignedTo provided', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', authHeader('alice', 'secret'))
      .send({ title: 'Self Task', description: 'desc', assignedTo: bob.id }); // should be ignored
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Self Task');
    expect(res.body.assignedTo.username).toBe('alice');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
    aliceTaskId = res.body.id;
  });

  it('rejects creating a task without title', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', authHeader('alice', 'secret'))
      .send({ description: 'no title' });
    expect(res.statusCode).toBe(400);
  });

  it('admin creates a task assigned to any user', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', authHeader('admin', 'adminpass'))
      .send({ title: 'Admin Assigned', description: '...', assignedTo: bob.id, status: 'open' });
    expect(res.statusCode).toBe(201);
    expect(res.body.assignedTo.username).toBe('bob');
  });

  it('rejects invalid status enum', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', authHeader('admin', 'adminpass'))
      .send({ title: 'Bad Status', assignedTo: alice.id, status: 'not_a_status' });
    expect(res.statusCode).toBe(400);
  });

  it('gets a single task by id', async () => {
    const res = await request(app)
      .get(`/tasks/${aliceTaskId}`)
      .set('Authorization', authHeader('alice', 'secret'));
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(aliceTaskId);
  });

  it('returns 404 for missing task', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/tasks/${missingId}`)
      .set('Authorization', authHeader('alice', 'secret'));
    expect(res.statusCode).toBe(404);
  });

  it('lists tasks with pagination metadata', async () => {
    const res = await request(app)
      .get('/tasks?page=1&limit=2')
      .set('Authorization', authHeader('alice', 'secret'));
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('totalCount');
    expect(res.body.pagination).toHaveProperty('totalPages');
  });

  it('prevents non-assignee non-admin from updating a task (403)', async () => {
    // alice owns aliceTaskId; bob tries to update
    const res = await request(app)
      .put(`/tasks/${aliceTaskId}`)
      .set('Authorization', authHeader('bob', '123456'))
      .send({ title: 'Bob tries to edit' });
    expect(res.statusCode).toBe(403);
  });

  it('user cannot change assignedTo on update (ignored)', async () => {
    const res = await request(app)
      .put(`/tasks/${aliceTaskId}`)
      .set('Authorization', authHeader('alice', 'secret'))
      .send({ title: 'Alice edits', assignedTo: bob.id }); // should be stripped
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Alice edits');
    expect(res.body.assignedTo.username).toBe('alice'); // still alice
  });

  it('admin can reassign a task', async () => {
    const res = await request(app)
      .put(`/tasks/${aliceTaskId}`)
      .set('Authorization', authHeader('admin', 'adminpass'))
      .send({ assignedTo: bob.id, status: 'in_progress' });
    expect(res.statusCode).toBe(200);
    expect(res.body.assignedTo.username).toBe('bob');
    expect(res.body.status).toBe('in_progress');
  });

  it('assignee (now bob) can delete the task', async () => {
    const res = await request(app)
      .delete(`/tasks/${aliceTaskId}`)
      .set('Authorization', authHeader('bob', '123456'));
    expect(res.statusCode).toBe(204);

    // verify deleted
    const check = await request(app)
      .get(`/tasks/${aliceTaskId}`)
      .set('Authorization', authHeader('bob', '123456'));
    expect(check.statusCode).toBe(404);
  });
});

describe('Sanity: invalid ObjectId handling', () => {
  it('handles invalid ObjectId on GET /tasks/:id', async () => {
    const res = await request(app)
      .get('/tasks/not-an-objectid')
      .set('Authorization', authHeader('admin', 'adminpass'));
    // Depending on your error handling you may get 400 or 404; assert one:
    expect([400, 404]).toContain(res.statusCode);
  });
});
