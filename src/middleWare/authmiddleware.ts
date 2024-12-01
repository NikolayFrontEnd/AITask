import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Интерфейс для пользовательских данных в JWT токене
interface IUserPayload {
  userId: number;
}

export const authMiddleware = (req: any, res: any, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(403).json({ message: 'Пользователь не авторизован' });
    }

    const decodedData = jwt.verify(token, 'secret123') as IUserPayload;
    req.user = decodedData; // Добавляем данные о пользователе в объект req
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: 'Пользователь не авторизован' });
  }
};

