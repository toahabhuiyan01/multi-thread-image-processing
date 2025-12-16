import { Worker } from "bullmq";
import sharp from "sharp";
import { connection } from "./queue";
import os from "os";

// Process up to (CPU cores - 1) images concurrently
const CONCURRENCY = Math.max(1, os.cpus().length - 1);

interface ImageJob {
  inputPath: string;
  outputPath: string;
  originalName: string;
}

new Worker(
  "image-processing",
  async (job) => {
    const { inputPath, outputPath, originalName } = job.data as ImageJob;

    console.log(`Processing: ${originalName}`);

    await sharp(inputPath)
      .resize({ width: 512 })
      .grayscale()
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    console.log(`Completed: ${originalName} -> ${outputPath}`);

    return {
      originalName,
      outputPath
    };
  },
  {
    connection,
    concurrency: CONCURRENCY
  }
);

console.log(`Worker running with concurrency = ${CONCURRENCY} (processing ${CONCURRENCY} images in parallel)`);
