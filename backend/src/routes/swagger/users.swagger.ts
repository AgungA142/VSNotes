/**
 * Users Endpoints Swagger Documentation
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Ambil profil dan pengaturan pengguna
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil pengguna berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               data:
 *                 _id: 507f1f77bcf86cd799439011
 *                 email: budi@example.com
 *                 name: Budi Santoso
 *                 settings:
 *                   summaryLengthPref: medium
 *                   autoStartSession: true
 *                   notificationsEnabled: true
 *                   watchPlatforms:
 *                     - youtube
 *                     - netflix
 *                     - udemy
 *                 createdAt: '2024-01-01T00:00:00.000Z'
 *                 updatedAt: '2024-01-01T00:00:00.000Z'
 *       401:
 *         description: Token tidak valid atau tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *       404:
 *         description: Pengguna tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 */

/**
 * @swagger
 * /users/me/settings:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Perbarui pengaturan pengguna
 *     description: |
 *       Update partial settings — hanya field yang dikirim yang diperbarui.
 *       `watchPlatforms` adalah daftar nama platform streaming (lowercase) yang digunakan
 *       untuk deteksi video otomatis. Nilai duplikat akan dihapus otomatis.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *           examples:
 *             updatePlatforms:
 *               summary: Perbarui daftar platform
 *               value:
 *                 watchPlatforms:
 *                   - youtube
 *                   - netflix
 *                   - udemy
 *                   - coursera
 *                   - khan academy
 *             updateLengthPref:
 *               summary: Perbarui preferensi rangkuman
 *               value:
 *                 summaryLengthPref: long
 *     responses:
 *       200:
 *         description: Pengaturan berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         description: Data tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Data tidak valid
 *       401:
 *         description: Token tidak valid atau tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *       404:
 *         description: Pengguna tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 */
