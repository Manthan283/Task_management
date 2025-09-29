import { Buffer } from 'node:buffer';
import User from '../models/User.js';
import { verifyPassword } from '../utils/hash.js';

/*
    HTTP Basic Auth middleware.
    Parses Authorization header
    Looks up user by username
    Verifies password with bcrypt
    Attaches req.user
 */
export async function basicAuth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) {
      return res.status(401).set('WWW-Authenticate', 'Basic realm="TaskAPI"').json({ message: 'Authentication required' });
    }

    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');
    if (!username || !password) {
      return res.status(401).json({ message: 'Invalid authorization header' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
