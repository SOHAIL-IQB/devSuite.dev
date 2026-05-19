import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const setCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        deviceInfo: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        refreshToken: 'placeholder',
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id, session.id);

    // Update session with real hashed token (in production, we'd hash the refresh token. Here we store raw for simplicity of rotation lookup)
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken },
    });

    setCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        deviceInfo: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        refreshToken: 'placeholder',
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id, session.id);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken },
    });

    setCookies(res, accessToken, refreshToken);

    res.json({
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies.refreshToken;
  
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // Validate session in DB
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session || session.refreshToken !== token || session.expiresAt < new Date()) {
    // If compromised or expired, delete it
    if (session) await prisma.session.delete({ where: { id: session.id } });
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  // Rotate tokens
  const newAccessToken = generateAccessToken(session.userId);
  const newRefreshToken = generateRefreshToken(session.userId, session.id);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  setCookies(res, newAccessToken, newRefreshToken);
  res.json({ success: true });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies.refreshToken;
  
  if (token) {
    const payload = verifyRefreshToken(token);
    if (payload) {
      await prisma.session.delete({ where: { id: payload.sessionId } }).catch(() => {});
    }
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
};
