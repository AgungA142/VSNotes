/**
 * Auth Endpoints Swagger Documentation
 * JSDoc comments for auth-related endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: budi@example.com
 *             password: RahasiaKu123!
 *             confirmPassword: RahasiaKu123!
 *             name: Budi Santoso
 *     responses:
 *       201:
 *         description: Registrasi berhasil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               status_code: 201
 *               message: Registrasi berhasil
 *               data:
 *                 userId: 507f1f77bcf86cd799439011
 *                 email: budi@example.com
 *                 name: Budi Santoso
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImJ1ZGlAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDYwNDgwMH0.signature
 *       400:
 *         description: Validasi gagal (email tidak valid, password lemah, confirmPassword tidak cocok)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: confirmPassword
 *                     message: Password dan konfirmasi password tidak cocok
 *       409:
 *         description: Email sudah terdaftar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 409
 *               error:
 *                 code: EMAIL_ALREADY_EXISTS
 *                 message: Email sudah terdaftar
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: budi@example.com
 *             password: RahasiaKu123!
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Login berhasil
 *               data:
 *                 userId: 507f1f77bcf86cd799439011
 *                 email: budi@example.com
 *                 name: Budi Santoso
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImJ1ZGlAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDYwNDgwMH0.signature
 *       400:
 *         description: Validasi gagal (email tidak valid, password kosong)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: email
 *                     message: Email tidak valid
 *       401:
 *         description: Email atau password salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *             example:
 *               success: false
 *               status_code: 401
 *               error:
 *                 code: INVALID_CREDENTIALS
 *                 message: Email atau password salah
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Perbarui JWT token
 *     description: Menerima token yang masih valid dan mengembalikan token baru dengan expiry diperpanjang. Token expired tidak dapat diperbarui — user harus login ulang.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Token berhasil diperbarui
 *               data:
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImJ1ZGlAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDYwNDgwMH0.signature
 *       401:
 *         description: Token tidak valid atau sudah expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *             examples:
 *               token_expired:
 *                 summary: Token expired
 *                 value:
 *                   success: false
 *                   status_code: 401
 *                   error:
 *                     code: TOKEN_EXPIRED
 *                     message: Authentication token has expired
 *               invalid_token:
 *                 summary: Token tidak valid
 *                 value:
 *                   success: false
 *                   status_code: 401
 *                   error:
 *                     code: INVALID_TOKEN
 *                     message: Invalid authentication token
 *               missing_token:
 *                 summary: Token tidak disertakan
 *                 value:
 *                   success: false
 *                   status_code: 401
 *                   error:
 *                     code: UNAUTHORIZED
 *                     message: Token autentikasi diperlukan
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Kirim email reset password
 *     description: |
 *       Mengirim email berisi tautan reset password ke alamat yang diberikan.
 *       Respons selalu `200` terlepas dari apakah email terdaftar atau tidak
 *       (untuk mencegah enumerasi akun).
 *       Tautan di email berlaku selama **15 menit** dan hanya dapat digunakan sekali.
 *       Rate limit: maksimal 3 permintaan per jam per alamat email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *           example:
 *             email: budi@example.com
 *     responses:
 *       200:
 *         description: Permintaan diterima (email dikirim jika alamat terdaftar)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForgotPasswordResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Jika email terdaftar, kami telah mengirim tautan reset password. Periksa kotak masuk Anda.
 *               data: null
 *       400:
 *         description: Format email tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: email
 *                     message: Email tidak valid
 *       429:
 *         description: Terlalu banyak permintaan (lebih dari 3 kali dalam 1 jam)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 429
 *               error:
 *                 code: RATE_LIMIT_EXCEEDED
 *                 message: Terlalu banyak permintaan reset password. Coba lagi dalam 1 jam.
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password dengan token
 *     description: |
 *       Menerapkan password baru menggunakan token yang diterima via email.
 *       Token hanya berlaku selama 15 menit dan hanya dapat digunakan sekali.
 *       Setelah berhasil, semua sesi JWT yang aktif sebelumnya diinvalidasi.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *           example:
 *             token: a3f2c1d4e5b6a3f2c1d4e5b6a3f2c1d4e5b6a3f2c1d4e5b6a3f2c1d4e5b6a3f2
 *             password: PasswordBaru123!
 *             confirmPassword: PasswordBaru123!
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResetPasswordResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: Password berhasil diubah. Silakan login kembali.
 *               data: null
 *       400:
 *         description: Token tidak valid/kadaluarsa atau validasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             examples:
 *               invalid_token:
 *                 summary: Token tidak valid atau sudah kadaluarsa
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   error:
 *                     code: INVALID_OR_EXPIRED_TOKEN
 *                     message: Tautan reset password tidak valid atau sudah kadaluarsa. Silakan minta tautan baru.
 *               validation_error:
 *                 summary: Password tidak memenuhi syarat
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Password minimal 8 karakter
 */

// This file only contains JSDoc comments for Swagger
// Actual route implementations will be in src/routes/auth.routes.ts
export {};
