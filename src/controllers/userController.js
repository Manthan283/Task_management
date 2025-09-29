import User from '../models/User.js';
import { hashPassword } from '../utils/hash.js';

export async function createUser(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ message: 'Username already exists' });

    const passwordHash = await hashPassword(password);
    const user = await User.create({ username, passwordHash, role: 'user' }); // prevent public admin creation

    return res.status(201).json(user.toJSON());
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await User.find({}, { username: 1, role: 1, createdAt: 1 }).sort({ createdAt: -1 });
    res.json(users.map((u) => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })));
  } catch (err) {
    next(err);
  }
}
