import { Router } from 'express';
import { createUser, listUsers } from '../controllers/userController.js';
import { basicAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = Router();

// Public registration
router.post('/', createUser);

// Admin-only list users
router.get('/', basicAuth, requireAdmin, listUsers);

export default router;
