/**
 * Sessions Endpoints Swagger Documentation
 */

/**
 * @swagger
 * /sessions:
 *   post:
 *     tags:
 *       - Sessions
 *     summary: Buat sesi baru
 *     description: Membuat sesi perekaman video baru dengan status aktif. Hanya satu sesi aktif yang diizinkan per user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSessionRequest'
 *           example:
 *             videoTitle: Belajar TypeScript dari Nol
 *             sourceApp: Google Chrome
 *             sourceType: streaming
 *             deviceId: desktop-win-001
 *     responses:
 *       201:
 *         description: Sesi berhasil dibuat
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 201
 *               message: Sesi berhasil dibuat
 *               data:
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 userId: 507f191e810c19729de860ea
 *                 videoTitle: Belajar TypeScript dari Nol
 *                 sourceApp: Google Chrome
 *                 sourceType: streaming
 *                 startedAt: '2024-01-15T10:30:00.000Z'
 *                 status: active
 *                 deviceId: desktop-win-001
 *       400:
 *         description: Validasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Token tidak valid atau tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       409:
 *         description: Sudah ada sesi aktif
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 409
 *               error:
 *                 code: ACTIVE_SESSION_EXISTS
 *                 message: Sudah ada sesi aktif. Selesaikan sesi saat ini terlebih dahulu.
 */

/**
 * @swagger
 * /sessions:
 *   get:
 *     tags:
 *       - Sessions
 *     summary: Daftar sesi user
 *     description: Mengambil daftar semua sesi milik user yang terautentikasi, diurutkan dari terbaru.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Nomor halaman
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Jumlah item per halaman
 *     responses:
 *       200:
 *         description: Daftar sesi berhasil diambil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               data:
 *                 sessions:
 *                   - sessionId: 507f1f77bcf86cd799439011
 *                     videoTitle: Belajar TypeScript dari Nol
 *                     sourceApp: Google Chrome
 *                     sourceType: streaming
 *                     status: completed
 *                     startedAt: '2024-01-15T10:30:00.000Z'
 *                     endedAt: '2024-01-15T11:30:00.000Z'
 *                     durationSec: 3600
 *                 total: 1
 *                 page: 1
 *                 pageSize: 20
 *       401:
 *         description: Token tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     tags:
 *       - Sessions
 *     summary: Detail sesi
 *     description: Mengambil detail satu sesi berdasarkan ID. Hanya pemilik sesi yang bisa mengakses.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sesi (MongoDB ObjectId)
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Detail sesi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
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
 *             example:
 *               success: false
 *               status_code: 404
 *               error:
 *                 code: SESSION_NOT_FOUND
 *                 message: Sesi tidak ditemukan
 */

/**
 * @swagger
 * /sessions/{id}:
 *   patch:
 *     tags:
 *       - Sessions
 *     summary: Update status sesi
 *     description: Mengubah status sesi (active → completed atau dismissed). Saat status berubah ke completed, durationSec dihitung otomatis.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSessionRequest'
 *           example:
 *             status: completed
 *             endedAt: '2024-01-15T11:30:00.000Z'
 *     responses:
 *       200:
 *         description: Sesi berhasil diperbarui
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Sesi berhasil diperbarui
 *               data:
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 status: completed
 *                 durationSec: 3600
 *                 endedAt: '2024-01-15T11:30:00.000Z'
 *       400:
 *         description: Validasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
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
 * /sessions/{id}:
 *   delete:
 *     tags:
 *       - Sessions
 *     summary: Hapus sesi
 *     description: Menghapus sesi beserta semua data terkait (catatan, transkrip, rangkuman) secara permanen.
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
 *         description: Sesi berhasil dihapus
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Sesi berhasil dihapus
 *               data: null
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
