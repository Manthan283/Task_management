import Task from '../models/Task.js';

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
}

// Ensure the requester is admin or assigned user for a given task id
export async function requireTaskAccess(req, res, next) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignee = task.assignedTo?.toString() === req.user.id;
    if (!isAdmin && !isAssignee) return res.status(403).json({ message: 'Forbidden' });

    req.task = task; // stash for controller
    next();
  } catch (err) {
    next(err);
  }
}

// Only admins may set or change assignedTo. Users are forced to themselves
export function enforceAssignmentRules(req, res, next) {
  if (req.user.role === 'admin') return next();

  // For regular users, ignore provided assignedTo and force to self
  req.body.assignedTo = req.user.id;
  next();
}

// Prevent non-admins from changing assignedTo during updates
export function blockReassignmentForUsers(req, res, next) {
  if (req.user.role !== 'admin' && 'assignedTo' in req.body) {
    delete req.body.assignedTo;
  }
  next();
}
