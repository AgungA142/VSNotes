/**
 * Notes Endpoints Swagger Documentation
 */

/**
 * @swagger
 * /sessions/{id}/notes:
 *   get:
 *     tags:
 *       - Notes
 *     summary: Daftar catatan sesi
 *     description: >
 *       Mengambil semua catatan (auto dan manual) untuk sesi, diurutkan berdasarkan
 *       timestampSec ascending. Gunakan query param `type` untuk filter berdasarkan jenis catatan.
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [auto, manual]
 *         description: Filter berdasarkan jenis catatan (opsional)
 *     responses:
 *       200:
 *         description: Daftar catatan berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NoteList'
 *             example:
 *               success: true
 *               status_code: 200
 *               data:
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 notes:
 *                   - noteId: 65a1b2c3d4e5f6a7b8c9d0e1
 *                     sessionId: 507f1f77bcf86cd799439011
 *                     userId: 507f191e810c19729de860ea
 *                     timestampSec: 45
 *                     text: TypeScript memiliki pengecekan tipe statis
 *                     type: auto
 *                     createdAt: '2024-01-15T10:31:00.000Z'
 *                     updatedAt: '2024-01-15T10:31:00.000Z'
 *                   - noteId: 65a1b2c3d4e5f6a7b8c9d0e2
 *                     sessionId: 507f1f77bcf86cd799439011
 *                     userId: 507f191e810c19729de860ea
 *                     timestampSec: 120
 *                     text: Perlu dicoba di proyek sendiri
 *                     type: manual
 *                     createdAt: '2024-01-15T10:32:00.000Z'
 *                     updatedAt: '2024-01-15T10:32:00.000Z'
 *                 total: 2
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
 * /sessions/{id}/notes:
 *   post:
 *     tags:
 *       - Notes
 *     summary: Tambah catatan manual
 *     description: Menambahkan catatan manual ke sesi. Timestamp diambil dari request body.
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
 *             $ref: '#/components/schemas/CreateNoteRequest'
 *           example:
 *             text: Konsep interface di TypeScript mirip dengan abstract class di Java
 *             timestampSec: 183
 *     responses:
 *       201:
 *         description: Catatan berhasil ditambahkan
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 201
 *               message: Catatan berhasil ditambahkan
 *               data:
 *                 noteId: 65a1b2c3d4e5f6a7b8c9d0e3
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 userId: 507f191e810c19729de860ea
 *                 timestampSec: 183
 *                 text: Konsep interface di TypeScript mirip dengan abstract class di Java
 *                 type: manual
 *                 createdAt: '2024-01-15T10:33:03.000Z'
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
 *       404:
 *         description: Sesi tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 */

/**
 * @swagger
 * /notes/{id}:
 *   patch:
 *     tags:
 *       - Notes
 *     summary: Edit catatan manual
 *     description: Mengubah teks catatan. Hanya catatan dengan type `manual` yang dapat diedit. Catatan `auto` tidak dapat diubah.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID catatan
 *         example: 65a1b2c3d4e5f6a7b8c9d0e2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNoteRequest'
 *           example:
 *             text: Konsep interface di TypeScript mirip dengan abstract class di Java — perlu dipelajari lebih lanjut
 *     responses:
 *       200:
 *         description: Catatan berhasil diperbarui
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Catatan berhasil diperbarui
 *               data:
 *                 noteId: 65a1b2c3d4e5f6a7b8c9d0e2
 *                 sessionId: 507f1f77bcf86cd799439011
 *                 userId: 507f191e810c19729de860ea
 *                 timestampSec: 183
 *                 text: Konsep interface di TypeScript mirip dengan abstract class di Java — perlu dipelajari lebih lanjut
 *                 type: manual
 *                 createdAt: '2024-01-15T10:32:00.000Z'
 *                 updatedAt: '2024-01-15T10:35:00.000Z'
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
 *       403:
 *         description: Catatan auto tidak dapat diedit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 403
 *               error:
 *                 code: NOTE_NOT_EDITABLE
 *                 message: Hanya catatan manual yang dapat diedit
 *       404:
 *         description: Catatan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               error:
 *                 code: NOTE_NOT_FOUND
 *                 message: Catatan tidak ditemukan
 */

/**
 * @swagger
 * /notes/{id}:
 *   delete:
 *     tags:
 *       - Notes
 *     summary: Hapus catatan manual
 *     description: Menghapus catatan secara permanen. Hanya catatan dengan type `manual` yang dapat dihapus. Catatan `auto` tidak dapat dihapus.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID catatan
 *         example: 65a1b2c3d4e5f6a7b8c9d0e2
 *     responses:
 *       200:
 *         description: Catatan berhasil dihapus
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Catatan berhasil dihapus
 *               data: null
 *       401:
 *         description: Token tidak valid atau tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Catatan auto tidak dapat dihapus
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 403
 *               error:
 *                 code: NOTE_NOT_DELETABLE
 *                 message: Hanya catatan manual yang dapat dihapus
 *       404:
 *         description: Catatan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               error:
 *                 code: NOTE_NOT_FOUND
 *                 message: Catatan tidak ditemukan
 */

export {};
