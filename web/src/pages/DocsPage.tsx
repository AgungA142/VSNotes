import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/shared/PageLayout';

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-gray-900 mt-12 mb-4 first:mt-0 scroll-mt-20">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-0.5">{title}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ReqRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-6 text-sm font-medium text-gray-600 whitespace-nowrap">{label}</td>
      <td className="py-2.5 text-sm text-gray-700">{value}</td>
    </tr>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-6 whitespace-nowrap">
        <kbd className="inline-block font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-0.5 text-gray-700">
          {keys}
        </kbd>
      </td>
      <td className="py-2.5 text-sm text-gray-600">{desc}</td>
    </tr>
  );
}

const TOC = [
  { href: '#mulai-cepat', label: 'Mulai Cepat' },
  { href: '#persyaratan-sistem', label: 'Persyaratan Sistem' },
  { href: '#cara-menggunakan', label: 'Cara Menggunakan' },
  { href: '#fitur-utama', label: 'Fitur Utama' },
  { href: '#shortcut', label: 'Shortcut Keyboard' },
];

export default function DocsPage() {
  return (
    <>
      <Helmet>
        <title>Dokumentasi — VSNotes</title>
        <meta
          name="description"
          content="Panduan lengkap menggunakan VSNotes: instalasi, persyaratan sistem, cara penggunaan, fitur, dan shortcut keyboard."
        />
        <meta property="og:title" content="Dokumentasi — VSNotes" />
        <meta property="og:description" content="Panduan lengkap menggunakan VSNotes." />
        <meta property="og:url" content="https://vsnotes.space/docs" />
        <link rel="canonical" href="https://vsnotes.space/docs" />
      </Helmet>

      <PageLayout
        title="Dokumentasi"
        description="Panduan lengkap untuk menginstal dan menggunakan VSNotes"
      >
        {/* Table of contents */}
        <nav aria-label="Daftar isi" className="mb-10 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Daftar Isi</p>
          <ol className="space-y-1.5">
            {TOC.map((item, i) => (
              <li key={item.href} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4">{i + 1}.</span>
                <a
                  href={item.href}
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1. Mulai Cepat */}
        <SectionHeading id="mulai-cepat">1. Mulai Cepat</SectionHeading>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Ikuti langkah-langkah berikut untuk mulai menggunakan VSNotes dalam beberapa menit.
        </p>
        <Step number={1} title="Download installer">
          Kunjungi halaman <a href="/#download" className="text-indigo-600 hover:underline">Download</a> dan klik tombol "Download untuk Windows". File <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">VSNotes-Setup-1.0.0.exe</code> (~120 MB) akan otomatis terunduh.
        </Step>
        <Step number={2} title="Jalankan installer">
          Buka file yang telah diunduh dan ikuti wizard instalasi. Windows mungkin menampilkan peringatan SmartScreen — klik "More info" lalu "Run anyway" untuk melanjutkan.
        </Step>
        <Step number={3} title="Buka VSNotes">
          Setelah instalasi selesai, buka VSNotes dari Start Menu atau shortcut di Desktop.
        </Step>
        <Step number={4} title="Daftar atau login">
          Buat akun baru atau login dengan akun yang sudah ada untuk menyimpan catatan ke cloud.
        </Step>
        <Step number={5} title="Berikan izin">
          Saat diminta, berikan izin <strong>screen recording</strong> dan <strong>audio capture</strong> agar VSNotes dapat mendeteksi dan merekam video.
        </Step>

        <hr className="border-gray-100 my-10" />

        {/* 2. Persyaratan Sistem */}
        <SectionHeading id="persyaratan-sistem">2. Persyaratan Sistem</SectionHeading>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              <ReqRow label="Sistem Operasi" value="Windows 10 64-bit atau Windows 11" />
              <ReqRow label="RAM" value="Minimal 4 GB (disarankan 8 GB)" />
              <ReqRow label="Storage" value="500 MB ruang kosong" />
              <ReqRow label="Koneksi Internet" value="Diperlukan untuk transkripsi dan rangkuman AI" />
              <ReqRow label="Izin Aplikasi" value="Screen recording, audio capture (WASAPI loopback)" />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Versi macOS sedang dalam pengembangan. Daftar notifikasi di halaman <a href="/#download" className="text-indigo-600 hover:underline">Download</a>.
        </p>

        <hr className="border-gray-100 my-10" />

        {/* 3. Cara Menggunakan */}
        <SectionHeading id="cara-menggunakan">3. Cara Menggunakan</SectionHeading>

        <SubHeading>Memulai sesi rekaman</SubHeading>
        <Step number={1} title="Buka video">
          Putar video di YouTube, Netflix, VLC, atau pemutar video lainnya. VSNotes memantau aplikasi aktif secara otomatis.
        </Step>
        <Step number={2} title="Konfirmasi popup">
          Popup konfirmasi akan muncul: "Video terdeteksi — Mulai rekam?" Klik <strong>Mulai Rekam</strong> untuk memulai sesi. Popup auto-dismiss dalam 15 detik jika tidak ada respons.
        </Step>
        <Step number={3} title="Rekaman berlangsung">
          VSNotes merekam audio sistem secara otomatis setiap 30 detik dan mengirimnya ke server untuk ditranskripsi. Anda dapat melanjutkan menonton tanpa gangguan.
        </Step>

        <SubHeading>Mengelola sesi aktif</SubHeading>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Selama sesi aktif, panel utama menampilkan catatan yang sedang terkumpul. Anda dapat:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            'Klik Jeda untuk menghentikan rekaman sementara',
            'Klik Akhiri Sesi untuk menyelesaikan sesi',
            'Tambah catatan manual dengan shortcut Ctrl+Shift+N',
            'Melihat transkripsi real-time di panel kiri',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-indigo-500 mt-0.5 flex-shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>

        <SubHeading>Setelah sesi selesai</SubHeading>
        <Step number={1} title="Generate rangkuman">
          Di panel kanan, pilih panjang rangkuman (Singkat / Sedang / Panjang) lalu klik <strong>Generate Rangkuman</strong>. Proses biasanya memakan waktu 10–30 detik.
        </Step>
        <Step number={2} title="Export catatan">
          Klik tombol <strong>Export</strong> di header sesi dan pilih format: <strong>PDF</strong>, <strong>Markdown</strong>, atau <strong>TXT</strong>.
        </Step>

        <hr className="border-gray-100 my-10" />

        {/* 4. Fitur Utama */}
        <SectionHeading id="fitur-utama">4. Fitur Utama</SectionHeading>
        <div className="space-y-5">
          {[
            {
              title: 'Deteksi Video Otomatis',
              desc: 'VSNotes memantau aplikasi aktif setiap 3 detik. Saat video terdeteksi (berdasarkan nama proses dan judul window), popup konfirmasi muncul otomatis.',
            },
            {
              title: 'Transkripsi Audio',
              desc: 'Audio sistem direkam via WASAPI loopback (tanpa virtual audio device) dalam format WAV 30 detik, kemudian dikirim ke Gemini API untuk dikonversi menjadi teks dengan timestamp.',
            },
            {
              title: 'Rangkuman AI',
              desc: 'Setelah sesi selesai, Gemini AI menganalisis seluruh transkrip dan menghasilkan rangkuman beserta poin-poin utama. Tersedia tiga pilihan panjang: Singkat, Sedang, dan Panjang.',
            },
            {
              title: 'Auto-Notes',
              desc: 'AI secara otomatis membuat catatan pada momen-momen penting selama rekaman berlangsung, lengkap dengan timestamp.',
            },
            {
              title: 'Catatan Manual',
              desc: 'Tekan Ctrl+Shift+N kapan saja selama sesi aktif untuk menambah catatan manual. Catatan akan disimpan dengan timestamp saat itu.',
            },
            {
              title: 'Export Fleksibel',
              desc: 'Export semua catatan dan rangkuman ke PDF (siap cetak), Markdown (untuk Notion/Obsidian), atau TXT (teks polos) dengan satu klik.',
            },
          ].map((feat) => (
            <div key={feat.title} className="flex gap-3">
              <div className="w-1.5 rounded-full bg-indigo-600 flex-shrink-0 mt-1.5" style={{ height: 'calc(100% - 6px)' }} />
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-0.5">{feat.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <hr className="border-gray-100 my-10" />

        {/* 5. Shortcut Keyboard */}
        <SectionHeading id="shortcut">5. Shortcut Keyboard</SectionHeading>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400 pr-6">Shortcut</th>
                <th className="pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Fungsi</th>
              </tr>
            </thead>
            <tbody>
              <ShortcutRow keys="Ctrl+Shift+N" desc="Tambah catatan manual saat sesi aktif" />
              <ShortcutRow keys="Ctrl+Shift+P" desc="Jeda / lanjutkan rekaman" />
              <ShortcutRow keys="Ctrl+Shift+E" desc="Akhiri sesi rekaman" />
            </tbody>
          </table>
        </div>

        <div className="mt-10 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-sm text-indigo-700">
            Ada pertanyaan lain? Lihat halaman{' '}
            <a href="/faq" className="font-semibold underline hover:text-indigo-900">FAQ</a>{' '}
            atau hubungi kami di{' '}
            <a href="mailto:rampung.space@gmail.com" className="font-semibold underline hover:text-indigo-900">
              rampung.space@gmail.com
            </a>.
          </p>
        </div>
      </PageLayout>
    </>
  );
}
