import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { swaggerOptions } from "./swagger";

import { imageQueue, connection } from "./queue";

const app = express();
const PORT = 3000;

const upload = multer({
  dest: "uploads/",
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024
  }
});

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

if (!fs.existsSync("processed")) {
  fs.mkdirSync("processed");
}

// Swagger
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post("/process-images", upload.array("images"), async (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No images provided" });
  }

  // Generate a unique batch ID
  const batchId = crypto.randomUUID();

  // Queue each file as a separate job with the batchId
  const jobs = await Promise.all(
    files.map((file) =>
      imageQueue.add("process-image", {
        batchId,
        inputPath: file.path,
        outputPath: path.join("processed", `processed-${file.filename}.jpg`),
        originalName: file.originalname
      })
    )
  );

  // Store batch metadata in Redis (list of job IDs)
  const jobIds = jobs.map((job) => job.id as string);
  await connection.set(`batch:${batchId}`, JSON.stringify({
    jobIds,
    totalFiles: files.length,
    createdAt: new Date().toISOString()
  }));

  res.status(202).json({
    batchId,
    statusUrl: `/batches/${batchId}`,
    totalFiles: files.length
  });
});

app.get("/batches/:batchId", async (req, res) => {
  const { batchId } = req.params;

  // Get batch metadata from Redis
  const batchData = await connection.get(`batch:${batchId}`);

  if (!batchData) {
    return res.status(404).json({ message: "Batch not found" });
  }

  const { jobIds, totalFiles, createdAt } = JSON.parse(batchData);

  // Fetch all jobs in the batch
  const jobs = await Promise.all(
    jobIds.map((id: string) => imageQueue.getJob(id))
  );

  // Aggregate job statuses
  const results = await Promise.all(
    jobs.map(async (job) => {
      if (!job) return null;
      const state = await job.getState();
      return {
        jobId: job.id,
        originalName: job.data.originalName,
        state,
        result: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null
      };
    })
  );

  const validResults = results.filter((r) => r !== null);
  const completed = validResults.filter((r) => r.state === "completed").length;
  const failed = validResults.filter((r) => r.state === "failed").length;
  const active = validResults.filter((r) => r.state === "active").length;
  const waiting = validResults.filter((r) => r.state === "waiting").length;

  // Determine overall batch status
  let batchStatus: string;
  if (failed > 0 && completed + failed === totalFiles) {
    batchStatus = "completed-with-errors";
  } else if (completed === totalFiles) {
    batchStatus = "completed";
  } else if (active > 0) {
    batchStatus = "processing";
  } else if (waiting > 0) {
    batchStatus = "waiting";
  } else {
    batchStatus = "unknown";
  }

  res.json({
    batchId,
    status: batchStatus,
    progress: {
      total: totalFiles,
      completed,
      failed,
      active,
      waiting
    },
    createdAt,
    files: validResults
  });
});

// Keep single job endpoint for backwards compatibility
app.get("/jobs/:jobId", async (req, res) => {
  const job = await imageQueue.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  const state = await job.getState();

  res.json({
    jobId: job.id,
    state,
    progress: job.progress,
    result: job.returnvalue ?? null,
    failedReason: job.failedReason ?? null
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/docs`);
});
