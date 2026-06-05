/**
 * Export Endpoints Swagger Documentation
 */

/**
 * @swagger
 * /sessions/{id}/export:
 *   get:
 *     tags:
 *       - Export
 *     summary: Ekspor sesi ke file
 *     description: |
 *       Ekspor sesi beserta catatan dan rangkuman ke format yang dipilih.
 *       Format yang didukung: `md` (Markdown) dan `txt` (Plain Text).
 *       PDF akan didukung di update mendatang.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sesi yang akan diekspor
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [md, txt, pdf]
 *           default: md
 *         description: Format file ekspor (md = Markdown, txt = Plain Text, pdf = PDF via Puppeteer)
 *     responses:
 *       200:
 *         description: File ekspor berhasil dibuat
 *         headers:
 *           Content-Disposition:
 *             description: 'Nama file untuk download, contoh: attachment; filename="judul-video-2024-01-15.md"'
 *             schema:
 *               type: string
 *         content:
 *           text/markdown:
 *             example: |
 *               # Judul Video
 *
 *               **Sumber:** Google Chrome
 *               **Tanggal:** 15 Jan 2024, 10:30
 *               **Durasi:** 01:23:45
 *
 *               ---
 *
 *               ## Rangkuman
 *
 *               Isi rangkuman di sini...
 *           text/plain:
 *             example: |
 *               Judul Video
 *               ============================================================
 *               Sumber : Google Chrome
 *               Tanggal: 15 Jan 2024, 10:30
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             description: Binary PDF file — A4, portrait, background printed
 *       400:
 *         description: Format tidak didukung
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               error:
 *                 code: INVALID_FORMAT
 *                 message: 'Format tidak didukung: "pdf". Gunakan md atau txt.'
 *       401:
 *         description: Token tidak valid atau tidak ada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 *       404:
 *         description: Sesi tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BaseErrorResponse'
 */
