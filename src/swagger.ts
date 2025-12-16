import { Options } from "swagger-jsdoc";

export const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Async Image Processing API",
      version: "1.0.0",
      description: "Redis + BullMQ based async image processing"
    }
  },
  apis: [
    "./src/swagger/**/*.ts"
  ]
};
