import swaggerJsDoc from "swagger-jsdoc"
/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required:
 *         - title
 *         - author
 *         - published
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the book
 *         author:
 *           type: string
 *           descripton: Name of the author of the book
 *         published:
 *           type: boolean
 *           descripton: If the book is published or not
 *       example:
 *         title: A great book
 *         author: John
 *         published: true
 *     BookUpdate:
 *       type: object
 *       optional:
 *         - title
 *         - author
 *         - published
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the book
 *         author:
 *           type: string
 *           descripton: Name of the author of the book
 *         published:
 *           type: boolean
 *           descripton: If the book is published or not
 *       example:
 *         title: An updated book title
 *         author: A new author
 *         published: true
 *
 * @swagger
 *  tags:
 *    name: Books
 */
const swaggerSpec = swaggerJsDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Text Generation API',
      version: '1.0.0',
      description: 'API для работы с текстовыми нейросетями',
    },
  },
  apis: ['./src/index.ts'], // Путь до вашего файла с аннотациями
});

export default swaggerSpec;