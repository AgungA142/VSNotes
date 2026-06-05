/**
 * Summaries Endpoints Swagger Documentation
 */

/**
 * @swagger
 * /sessions/{id}/summary:
 *   post:
 *     tags:
 *       - Summaries
 *     summary: Generate rangkuman sesi
 *     description: >
 *       Membuat rangkuman otomatis dari transkripsi sesi menggunakan Gemini AI.
 *       Memerlukan minimal satu segmen transkripsi. Jika rangkuman sudah ada,
 *       akan di-regenerate dengan preferensi panjang yang baru.
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
 *       - in: query
 *         name: length
 *         schema:
 *           type: string
 *           enum: [short, medium, long]
 *           default: medium
 *         description: Preferensi panjang rangkuman
 *     responses:
 *       201:
 *         description: Rangkuman berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryResponse'
 *             example:
 *               success: true
 *               status_code: 201
 *               message: Rangkuman berhasil dibuat
 *               data:
 *                 summaryId: 65a1b2c3d4e5f6a7b8c9d0e1
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 content: >
 *                   Video ini membahas konsep dasar TypeScript mulai dari tipe data,
 *                   interface, hingga generics. Penonton diajarkan cara mengintegrasikan
 *                   TypeScript ke proyek JavaScript yang sudah ada.
 *                 keyPoints:
 *                   - TypeScript adalah superset JavaScript dengan pengecekan tipe statis
 *                   - Interface digunakan untuk mendefinisikan bentuk objek
 *                   - Generics memungkinkan kode yang reusable dan type-safe
 *                   - TypeScript dikompilasi ke JavaScript standar
 *                 lengthPref: medium
 *                 createdAt: '2024-01-15T11:30:00.000Z'
 *       400:
 *         description: Belum ada transkripsi untuk sesi ini
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: NO_TRANSCRIPT
 *                 message: Rangkuman membutuhkan transkripsi. Belum ada transkripsi untuk sesi ini.
 *       401:
 *         description: Token tidak valid atau tidak ada
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
 * /sessions/{id}/summary:
 *   get:
 *     tags:
 *       - Summaries
 *     summary: Ambil rangkuman sesi
 *     description: Mengambil rangkuman yang sudah dibuat untuk sesi. Mengembalikan 404 jika rangkuman belum di-generate.
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
 *         description: Rangkuman berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               data:
 *                 summaryId: 65a1b2c3d4e5f6a7b8c9d0e1
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 content: >
 *                   Video ini membahas konsep dasar TypeScript mulai dari tipe data,
 *                   interface, hingga generics.
 *                 keyPoints:
 *                   - TypeScript adalah superset JavaScript dengan pengecekan tipe statis
 *                   - Interface digunakan untuk mendefinisikan bentuk objek
 *                   - Generics memungkinkan kode yang reusable dan type-safe
 *                 lengthPref: medium
 *                 createdAt: '2024-01-15T11:30:00.000Z'
 *       401:
 *         description: Token tidak valid atau tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Sesi atau rangkuman tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               error:
 *                 code: SUMMARY_NOT_FOUND
 *                 message: Rangkuman belum dibuat untuk sesi ini
 */

export {};
