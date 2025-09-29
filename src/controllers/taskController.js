import Task from '../models/Task.js';
import { paginateQuery, buildPagination } from '../utils/pagination.js';

export async function createTask(req, res, next) {
  try {
    const { title, description = '', assignedTo, status } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const task = await Task.create({ title, description, assignedTo, status });
    const populated = await task.populate('assignedTo', 'username role');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

export async function getTasks(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { skip, limit: l, page: p } = paginateQuery({}, { page, limit });

    const [items, totalCount] = await Promise.all([
      Task.find().sort({ createdAt: -1 }).skip(skip).limit(l).populate('assignedTo', 'username role').lean(),
      Task.countDocuments(),
    ]);

    res.json({ data: items.map(normalize), pagination: buildPagination({ totalCount, page: p, limit: l }) });
  } catch (err) {
    next(err);
  }
}

export async function getTaskById(req, res, next) {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo', 'username role');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(normalize(task));
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req, res, next) {
  try {
    const updates = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('assignedTo', 'username role');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(normalize(task));
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function normalize(task) {
  const t = task.toJSON ? task.toJSON() : task;
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    assignedTo: t.assignedTo ? { id: t.assignedTo._id || t.assignedTo.id || t.assignedTo, username: t.assignedTo.username } : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
