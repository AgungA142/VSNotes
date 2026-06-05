/**
 * Transcription Endpoints Swagger Documentation
 */

/**
 * @swagger
 * /sessions/{id}/audio:
 *   post:
 *     tags:
 *       - Transcription
 *     summary: Upload chunk audio
 *     description: >
 *       Menerima chunk audio 30 detik dalam format WAV (base64), memasukkan ke antrian transkripsi,
 *       dan memproses secara asinkron via Gemini API. Retry otomatis 2x jika gagal.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sesi aktif
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UploadAudioChunkRequest'
 *           example:
 *             audioData: UklGRiQAAABXQVZFZm10IBAAAA...
 *             durationSec: 30
 *             capturedAt: '2024-01-15T10:32:00.000Z'
 *     responses:
 *       202:
 *         description: Audio diterima dan sedang diproses
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 202
 *               message: Audio diterima dan sedang diproses
 *               data:
 *                 jobId: 65a1b2c3d4e5f6a7b8c9d0e1
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 status: queued
 *                 timestampSec: 120
 *       400:
 *         description: Format audio tidak valid atau sesi tidak aktif
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: SESSION_NOT_ACTIVE
 *                 message: Hanya sesi aktif yang bisa menerima audio
 *       401:
 *         description: Token tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Sesi tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 */

/**
 * @swagger
 * /sessions/{id}/transcript:
 *   get:
 *     tags:
 *       - Transcription
 *     summary: Ambil transkripsi sesi
 *     description: Mengambil semua segmen transkripsi sesi, diurutkan berdasarkan timestamp ascending.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sesi
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Transkripsi berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               data:
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 totalSegments: 3
 *                 segments:
 *                   - segmentId: 65a1b2c3d4e5f6a7b8c9d0e1
 *                     timestampSec: 0
 *                     text: Selamat datang di tutorial TypeScript ini.
 *                     language: id
 *                     createdAt: '2024-01-15T10:30:30.000Z'
 *                   - segmentId: 65a1b2c3d4e5f6a7b8c9d0e2
 *                     timestampSec: 30
 *                     text: Pada bagian pertama kita akan membahas tipe data dasar.
 *                     language: id
 *                     createdAt: '2024-01-15T10:31:00.000Z'
 *       401:
 *         description: Token tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Sesi tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 */

export {};
