import { body } from 'express-validator';
export const registerValidator = [
    body('email', 'Неверный формат почты').isEmail(),
    body('password', 'Пароль должен быть минимум 5 символов').isLength({ min: 5 }),
    body('firstName', 'Имя должно быть минимум 3 символов').isLength({ min: 3 }),
  ];