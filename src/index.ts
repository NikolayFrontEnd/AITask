import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { authMiddleware } from './middleWare/authmiddleware';
import axios from 'axios';
import {registerValidator} from './validation/checkAuth'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './swagger';
const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
app.use("/api-docs",swaggerUi.serve, swaggerUi.setup(swaggerSpec))
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               patronymic:
 *                 type: string
 *               isVip:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Некорректные данные
 *       500:
 *         description: Ошибка на сервере
 */
app.post('/register', registerValidator, async (req: Request, res: Response): Promise<void> => {
try { const errors = validationResult(req);
    if (!errors.isEmpty()) {
res.status(400).json(errors.array());
 return;}

    const { firstName, lastName, email, password, patronymic, isVip } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Пользователь с таким email уже существует' });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await prisma.user.create({
        data: {
         firstName,lastName,email,password: hashedPassword, patronymic, role: isVip ? 'vip' : 'regular', money: 1000, 
        },
      });
    const token = jwt.sign(
      { userId: user.id },
      'secret123',
      { expiresIn: '30d' }
    );
    const { password: _, ...userData } = user;
    res.json({ ...userData, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Не удалось зарегистрироваться' });
  }
});
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Вход в систему
 *     description: Авторизация пользователя с использованием email и пароля.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Электронная почта пользователя.
 *               password:
 *                 type: string
 *                 description: Пароль пользователя.
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Успешная авторизация. Возвращается объект пользователя и JWT токен.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID пользователя
 *                 firstName:
 *                   type: string
 *                   description: Имя пользователя
 *                 lastName:
 *                   type: string
 *                   description: Фамилия пользователя
 *                 email:
 *                   type: string
 *                   description: Электронная почта пользователя
 *                 role:
 *                   type: string
 *                   description: Роль пользователя
 *                 token:
 *                   type: string
 *                   description: JWT токен для дальнейших запросов
 *       400:
 *         description: Неверный логин или пароль.
 *       404:
 *         description: Пользователь не найден.
 *       500:
 *         description: Ошибка на сервере.
 */
app.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя по email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(400).json({ message: 'Неверный логин или пароль' });
      return;
    }

    // Создание JWT токена
    const token = jwt.sign(
      { userId: user.id },
      'secret123',
      { expiresIn: '30d' }
    );

    // Возвращаем данные пользователя и токен
    const { password: _, ...userData } = user;
    res.json({ ...userData, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Не удалось авторизоваться' });
  }
});
/**
 * @swagger
 * /user:
 *   get:
 *     summary: Получить данные текущего пользователя
 *     description: Этот эндпоинт возвращает данные текущего пользователя, используя JWT токен для аутентификации.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []  # Используется JWT токен для аутентификации
 *     responses:
 *       200:
 *         description: Данные пользователя успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID пользователя
 *                 firstName:
 *                   type: string
 *                   description: Имя пользователя
 *                 lastName:
 *                   type: string
 *                   description: Фамилия пользователя
 *                 email:
 *                   type: string
 *                   description: Электронная почта пользователя
 *                 role:
 *                   type: string
 *                   description: Роль пользователя
 *       404:
 *         description: Пользователь не найден
 *       401:
 *         description: Неавторизованный доступ (если JWT токен отсутствует или неверен)
 *       500:
 *         description: Ошибка на сервере
 */
  app.get('/user', authMiddleware, async (req: any, res: any): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId }
    });
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }
    const { password: _, ...userData } = user;
    res.json(userData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Не удалось получить данные пользователя' });
  }
});  
/**
 * @swagger
 * /balance:
 *   get:
 *     summary: Получить баланс пользователя
 *     description: Этот эндпоинт возвращает текущий баланс пользователя, который авторизован в системе.
 *     tags:
 *       - Баланс
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Баланс пользователя успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: integer
 *                   description: Текущий баланс пользователя
 *                   example: 1000
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Пользователь не найден'
 *       500:
 *         description: Ошибка сервера при получении баланса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Не удалось получить баланс'
 */
app.get('/balance', authMiddleware, async (req: any, res: any) => {
    try {
      const userId = req.user?.userId; const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) { return res.status(404).json({ message: 'Пользователь не найден' });}
      res.json({ balance: user.money });
    } catch (err) {
console.error(err);
res.status(500).json({ message: 'Не удалось получить баланс' });
}
});
/**
 * @swagger
 * /balance:
 *   put:
 *     summary: Обновить баланс пользователя
 *     description: Этот эндпоинт позволяет обновить баланс пользователя. Доступен только для пользователей с ролью "admin".
 *     tags:
 *       - Баланс
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               money:
 *                 type: integer
 *                 description: Новый баланс пользователя
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Баланс пользователя успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedUser:
 *                   type: object
 *                   description: Обновленные данные пользователя
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: ID пользователя
 *                       example: 1
 *                     firstName:
 *                       type: string
 *                       description: Имя пользователя
 *                       example: 'Иван'
 *                     lastName:
 *                       type: string
 *                       description: Фамилия пользователя
 *                       example: 'Иванов'
 *                     money:
 *                       type: integer
 *                       description: Обновленный баланс пользователя
 *                       example: 5000
 *       400:
 *         description: Некорректный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Недостаточно прав'
 *       403:
 *         description: Пользователь не имеет прав для выполнения этого действия
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Недостаточно прав'
 *       500:
 *         description: Ошибка сервера при обновлении баланса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Не удалось обновить баланс'
 */
  app.put('/balance', authMiddleware, async (req: any, res: any) => {
try {
const userId = req.user?.userId;
const { money } = req.body;
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user || user.role !== 'admin') {
return res.status(403).json({ message: 'Недостаточно прав' });
}
const updatedUser = await prisma.user.update({
where: { id: userId },
data: { money },
});
res.json({ updatedUser });
} catch (err) {
console.error(err);
res.status(500).json({ message: 'Не удалось обновить баланс' });
}
});
/**
 * @swagger
 * /generate:
 *   post:
 *     summary: Генерация контента с использованием модели
 *     description: Этот эндпоинт позволяет пользователю сгенерировать контент, используя выбранную модель. Стоимость операции рассчитывается на основе количества использованных токенов. Средства списываются с баланса пользователя.
 *     tags:
 *       - Генерация
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelName:
 *                 type: string
 *                 description: Имя модели, которая будет использоваться для генерации.
 *                 example: 'gpt-3'
 *               tokensUsed:
 *                 type: integer
 *                 description: Количество токенов, которые будут использованы для генерации.
 *                 example: 500
 *     responses:
 *       200:
 *         description: Генерация успешна, средства списаны с баланса.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Сообщение об успешной генерации.
 *                   example: "Генерация успешна! Стоимость: 5 кредитов"
 *       400:
 *         description: Недостаточно средств на счете пользователя или ошибка при вычислении стоимости.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Недостаточно средств"
 *       404:
 *         description: Модель не найдена в системе.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Модель не найдена"
 *       500:
 *         description: Ошибка сервера при генерации контента.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Не удалось выполнить генерацию"
 */
  app.post('/generate', authMiddleware, async (req: any, res: any) => {
const { modelName, tokensUsed } = req.body; 
 const userId = req.user?.userId;
const model = await prisma.model.findUnique({ where: { name: modelName } });
if (!model) {
return res.status(404).json({ message: 'Модель не найдена' });
}
const cost = Math.ceil(tokensUsed / 100) * model.tokenRate; 
  
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user || user.money < cost) {
return res.status(400).json({ message: 'Недостаточно средств' });
                   }

await prisma.user.update({
where: { id: userId },
    data: { money: user.money - cost },
});res.json({ message: `Генерация успешна! Стоимость: ${cost} кредитов` });
  });
/**
 * @swagger
 * /stream:
 *   get:
 *     summary: Стриминг сообщений в реальном времени
 *     description: Этот эндпоинт отправляет сообщения в формате Server-Sent Events (SSE) каждую секунду. Он будет поддерживать открытое соединение до тех пор, пока клиент не закроет соединение.
 *     tags:
 *       - Стриминг
 *     responses:
 *       200:
 *         description: Успешный ответ с потоковыми данными в формате SSE.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Поток сообщений, отправляемых каждую секунду.
 *               example: |
 *                 data: {"message": "Получены токены"}
 *                 data: {"message": "Получены токены"}
 *       500:
 *         description: Ошибка сервера при установлении соединения.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Не удалось начать стриминг"
 */
  app.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ message: "Получены токены" })}\n\n`);
    }, 1000);
  
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });
  const OPENAI_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3YjEyMWFlLWUwZDYtNDliMi1iNjlmLTBkNzE3ODkzYjgzOSIsImlzRGV2ZWxvcGVyIjp0cnVlLCJpYXQiOjE3Mjc2OTA0MTgsImV4cCI6MjA0MzI2NjQxOH0.0_rVXKNuSCBP4MO6hBnTXAE0kE1h52xpwDSGPaR4vGM';
  const OPENAI_ENDPOINT = 'https://bothub.chat/api/v2/openai/v1';
  /**
 * @swagger
 * /generate-text:
 *   post:
 *     summary: Генерация текста с использованием модели
 *     description: Этот эндпоинт генерирует текст с помощью модели OpenAI. Требуется наличие средств на балансе пользователя для генерации. После успешной генерации списываются средства с баланса пользователя.
 *     tags:
 *       - Генерация
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Запрос (текст), который будет отправлен модели для генерации текста.
 *                 example: "Напишите стихотворение о зиме"
 *               modelName:
 *                 type: string
 *                 description: Имя модели для генерации текста (по умолчанию используется 'gpt-4').
 *                 example: "gpt-4"
 *     responses:
 *       200:
 *         description: Успешно сгенерированный текст.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generatedText:
 *                   type: string
 *                   description: Сгенерированный текст.
 *                   example: "Зима, холод и снег... (сгенерированное стихотворение)"
 *       400:
 *         description: Недостаточно средств для генерации текста.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Недостаточно средств для генерации"
 *       500:
 *         description: Ошибка сервера при генерации текста.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при генерации текста"
 */
  app.post('/generate-text', authMiddleware, async (req: any, res: any) => {
    const { prompt, modelName = 'gpt-4' } = req.body; 
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.money < 100) {
      return res.status(400).json({ message: 'Недостаточно средств для генерации' });
    }
    try {
      const response = await axios.post(
        OPENAI_ENDPOINT,
        {
          model: modelName,
          prompt: prompt,
          max_tokens: 100, 
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const generatedText = response.data;
      await prisma.user.update({
        where: { id: userId },
        data: { money: user.money - 100 },
      });
      res.json({ generatedText });
    } catch (error) {
      console.error('Error generating text:', error);
      res.status(500).json({ message: 'Ошибка при генерации текста' });
    }
  });

