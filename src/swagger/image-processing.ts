/**
 * @openapi
 * /process-images:
 *   post:
 *     summary: Queue images for concurrent processing
 *     description: |
 *       Upload one or more images. Each image is processed concurrently.
 *       Returns a single batchId to track all files.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       202:
 *         description: Batch queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                   format: uuid
 *                 statusUrl:
 *                   type: string
 *                 totalFiles:
 *                   type: integer
 */

/**
 * @openapi
 * /batches/{batchId}:
 *   get:
 *     summary: Get batch processing status
 *     description: Returns status of all files in the batch
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Batch status with all file results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [waiting, processing, completed, completed-with-errors]
 *                 progress:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     waiting:
 *                       type: integer
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       jobId:
 *                         type: string
 *                       originalName:
 *                         type: string
 *                       state:
 *                         type: string
 *                       result:
 *                         type: object
 *                         nullable: true
 *                       failedReason:
 *                         type: string
 *                         nullable: true
 *       404:
 *         description: Batch not found
 */

/**
 * @openapi
 * /jobs/{jobId}:
 *   get:
 *     summary: Get single job status
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobId:
 *                   type: string
 *                 state:
 *                   type: string
 *                   enum: [waiting, active, completed, failed]
 *                 progress:
 *                   type: number
 *                 result:
 *                   type: object
 *                   nullable: true
 *                 failedReason:
 *                   type: string
 *                   nullable: true
 *       404:
 *         description: Job not found
 */
export {};
