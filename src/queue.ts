import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "dotenv";

config();

export const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});

export const imageQueue = new Queue("image-processing", {
  connection
});
