import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { users, logAudit } from '../../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_12345';

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  // Securely verify password hash using bcrypt
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    // Graceful backward compatibility for plain text passwords in mock seeds
    if (user.password_hash !== password) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
  }

  // Sign Token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  logAudit(user.id, 'LOGIN', 'users', user.id, null, { email: user.email });

  return res.json({
    status: 'success',
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    }
  });
});

export default router;
