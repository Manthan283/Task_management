import { Router } from 'express';
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from '../controllers/taskController.js';
import { enforceAssignmentRules, blockReassignmentForUsers, requireTaskAccess } from '../middleware/authorize.js';

const router = Router();

// Create task (auth applied at app level). Admin can assign; users forced to self.
router.post('/', enforceAssignmentRules, createTask);

// List tasks with pagination
router.get('/', getTasks);

// Get one
router.get('/:id', getTaskById);

// Update (ownership check) and block reassignment for regular users
router.put('/:id', requireTaskAccess, blockReassignmentForUsers, updateTask);

// Delete (ownership check)
router.delete('/:id', requireTaskAccess, deleteTask);

export default router;
