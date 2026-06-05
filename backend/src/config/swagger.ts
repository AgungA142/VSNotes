/**
 * Swagger API Documentation Configuration
 * Setup swagger-jsdoc and swagger-ui-express
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

// Import schema definitions from routes/swagger/schemas
import { commonSchemas } from '../routes/swagger/schemas/common.schemas';
import { authSchemas } from '../routes/swagger/schemas/auth.schemas';
import { sessionSchemas } from '../routes/swagger/schemas/session.schemas';
import { noteSchemas } from '../routes/swagger/schemas/note.schemas';
import { summarySchemas } from '../routes/swagger/schemas/summary.schemas';
import { usersSchemas } from '../routes/swagger/schemas/users.schemas';

// Import tag definitions from routes/swagger
import { tags } from '../routes/swagger/tags';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'VSNotes API',
    version: '1.0.0',
    description:
      'REST API untuk aplikasi VSNotes - sistem yang secara otomatis mendeteksi video, membuat transkripsi, rangkuman, dan catatan otomatis.',
    contact: {
      name: 'API Support',
      email: 'support@vsnotes.app',
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.vsnotes.app/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token untuk autentikasi. Format: Bearer <token>',
      },
    },
    schemas: {
      // Common schemas
      ...commonSchemas,
      // Module-specific schemas
      ...authSchemas,
      ...sessionSchemas,
      ...noteSchemas,
      ...summarySchemas,
      ...usersSchemas,
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags,
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  // Path to Swagger documentation files with JSDoc comments
  apis: ['./src/routes/swagger/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
