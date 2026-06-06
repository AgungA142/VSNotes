import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import PageLayout from '../components/shared/PageLayout';

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQGroup {
  id: string;
  title: string;
  items: FAQItem[];
}

const FAQ_GROUPS: FAQGroup[] = [
  {
    id: 'umum',
    title: 'Umum',
    items: [
      {
        q: 'Apakah VSNotes gratis?',
        a: 'Ya, VSNotes sepenuhnya gratis tanpa biaya berlangganan. Anda hanya perlu membuat akun untuk menyimpan catatan ke cloud.',
      },
      {
        q: 'Platform apa yang didukung?',
        a: (
          <>
            Saat ini VSNotes tersedia untuk <strong>Windows 10/11 64-bit</strong>. Versi macOS sedang dalam pengembangan —
            daftarkan email Anda di halaman{' '}
            <a href="/#download" className="text-indigo-600 hover:underline">Download</a>{' '}
            untuk mendapat notifikasi saat tersedia.
          </>
        ),
      },
      {
        q: 'Apakah perlu koneksi internet?',
        a: 'Koneksi internet diperlukan untuk fitur transkripsi dan rangkuman AI. Catatan yang dibuat saat offline akan otomatis disinkronkan ke cloud saat koneksi tersedia kembali.',
      },
      {
        q: 'Video apa saja yang dapat dideteksi?',
        a: 'VSNotes mendeteksi video berdasarkan nama proses aplikasi (Chrome, Firefox, VLC, dll.) dan judul window. YouTube, Netflix, dan sebagian besar media player lokal didukung.',
      },
    ],
  },
  {
    id: 'instalasi',
    title: 'Instalasi',
    items: [
      {
        q: 'Bagaimana cara menginstal VSNotes?',
        a: (
          <>
            Download file installer dari halaman{' '}
            <a href="/#download" className="text-indigo-600 hover:underline">Download</a>,
            jalankan <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">VSNotes-Setup-1.0.0.exe</code>,
            dan ikuti wizard instalasi. Proses berlangsung kurang dari 2 menit.
          </>
        ),
      },
      {
        q: 'Windows memunculkan peringatan saat instalasi, apakah aman?',
        a: 'Ya, aman. Peringatan SmartScreen muncul karena installer belum memiliki sertifikat code signing berbayar. Klik "More info" → "Run anyway" untuk melanjutkan. File installer di-host langsung di GitHub Releases.',
      },
      {
        q: 'Izin apa saja yang dibutuhkan aplikasi?',
        a: 'VSNotes membutuhkan izin screen recording (untuk mendeteksi aplikasi aktif berdasarkan judul window) dan audio capture (untuk merekam audio sistem via WASAPI loopback). Tidak ada screenshot layar yang diambil — hanya metadata window.',
      },
    ],
  },
  {
    id: 'penggunaan',
    title: 'Penggunaan',
    items: [
      {
        q: 'Bagaimana cara memulai sesi rekaman?',
        a: 'Cukup buka video di browser atau media player. VSNotes akan otomatis mendeteksi dan menampilkan popup konfirmasi. Klik "Mulai Rekam" untuk memulai, atau biarkan 15 detik untuk auto-dismiss.',
      },
      {
        q: 'Format export apa yang tersedia?',
        a: (
          <>
            Tersedia tiga format: <strong>PDF</strong> (siap cetak),{' '}
            <strong>Markdown</strong> (kompatibel dengan Notion, Obsidian, dll.), dan{' '}
            <strong>TXT</strong> (teks polos).
          </>
        ),
      },
      {
        q: 'Berapa lama proses transkripsi?',
        a: 'Setiap segmen audio 30 detik biasanya ditranskrip dalam 10–30 detik tergantung koneksi internet dan panjang konten.',
      },
      {
        q: 'Apakah bisa pause rekaman?',
        a: (
          <>
            Ya. Klik tombol <strong>Jeda</strong> di panel sesi atau gunakan shortcut{' '}
            <kbd className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">Ctrl+Shift+P</kbd>{' '}
            untuk menghentikan sementara. Tekan shortcut yang sama atau klik tombol untuk melanjutkan.
          </>
        ),
      },
    ],
  },
  {
    id: 'privasi',
    title: 'Privasi & Keamanan',
    items: [
      {
        q: 'Data apa yang dikumpulkan VSNotes?',
        a: 'VSNotes mengumpulkan: email dan nama untuk autentikasi, metadata sesi (judul video, durasi, timestamp), audio rekaman sementara untuk transkripsi, serta catatan yang Anda buat atau dibuat AI.',
      },
      {
        q: 'Apakah audio saya disimpan di cloud?',
        a: 'Audio hanya dikirim ke server untuk diproses menggunakan Gemini API (Google). Setelah transkripsi selesai, file audio dihapus dari server. Yang tersimpan secara permanen hanya teks transkripsinya.',
      },
      {
        q: 'Bagaimana cara menghapus semua data saya?',
        a: (
          <>
            Hapus akun Anda melalui menu Pengaturan di aplikasi. Seluruh data (sesi, catatan, transkrip) akan dihapus permanen dari server.
            Anda juga dapat menghubungi{' '}
            <a href="mailto:rampung.space@gmail.com" className="text-indigo-600 hover:underline">
              rampung.space@gmail.com
            </a>{' '}
            untuk permintaan penghapusan manual.
          </>
        ),
      },
    ],
  },
];

function AccordionItem({ item, groupId }: { item: FAQItem; groupId: string }) {
  const [open, setOpen] = useState(false);
  const id = `${groupId}-${item.q.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-medium text-gray-800 hover:text-indigo-700 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
      >
        <span className="pr-4">{item.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  return (
    <>
      <Helmet>
        <title>FAQ — VSNotes</title>
        <meta
          name="description"
          content="Pertanyaan umum tentang VSNotes: instalasi, penggunaan, privasi, dan troubleshooting."
        />
        <meta property="og:title" content="FAQ — VSNotes" />
        <meta property="og:description" content="Pertanyaan umum tentang VSNotes." />
        <meta property="og:url" content="https://vsnotes.space/faq" />
        <link rel="canonical" href="https://vsnotes.space/faq" />
      </Helmet>

      <PageLayout
        title="Pertanyaan Umum"
        description="Temukan jawaban atas pertanyaan yang sering diajukan tentang VSNotes"
      >
        <div className="space-y-10">
          {FAQ_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`faq-group-${group.id}`}>
              <h2
                id={`faq-group-${group.id}`}
                className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1"
              >
                {group.title}
              </h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 px-4">
                {group.items.map((item) => (
                  <AccordionItem key={item.q} item={item} groupId={group.id} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-sm text-indigo-700">
            Tidak menemukan jawaban yang dicari? Lihat{' '}
            <a href="/docs" className="font-semibold underline hover:text-indigo-900">Dokumentasi</a>{' '}
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
