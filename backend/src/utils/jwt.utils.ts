import 'dotenv/config';
import jwt from 'jsonwebtoken';

const getSecrets = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseSecret = process.env.JWT_SECRET;
  
  const accessSecret = process.env.JWT_ACCESS_SECRET || (baseSecret ? `${baseSecret}_access` : (isProduction ? '' : 'dev_access_secret_123'));
  const refreshSecret = process.env.JWT_REFRESH_SECRET || (baseSecret ? `${baseSecret}_refresh` : (isProduction ? '' : 'dev_refresh_secret_123'));

  if (isProduction && (!accessSecret || !refreshSecret || accessSecret === 'dev_access_secret_123')) {
    throw new Error('[Security Exception]: JWT_SECRET or (JWT_ACCESS_SECRET and JWT_REFRESH_SECRET) must be securely configured in production environment.');
  }

  return {
    JWT_ACCESS_SECRET: accessSecret || 'dev_access_secret_123',
    JWT_REFRESH_SECRET: refreshSecret || 'dev_refresh_secret_123',
  };
};

const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = getSecrets();

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string, sessionId: string) => {
  return jwt.sign({ userId, sessionId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string, sessionId: string };
  } catch (error) {
    return null;
  }
};
