import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/shared/PageLayout';

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-gray-900 mt-12 mb-3 first:mt-0 scroll-mt-20">
      {children}
    </h2>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mb-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
          <span className="text-indigo-500 mt-0.5 flex-shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — VSNotes</title>
        <meta
          name="description"
          content="Kebijakan privasi VSNotes: data yang dikumpulkan, cara penggunaan, layanan pihak ketiga, dan hak pengguna."
        />
        <meta property="og:title" content="Privacy Policy — VSNotes" />
        <meta property="og:description" content="Kebijakan privasi VSNotes." />
        <meta property="og:url" content="https://vsnotes.space/privacy" />
        <link rel="canonical" href="https://vsnotes.space/privacy" />
      </Helmet>

      <PageLayout
        title="Privacy Policy"
        description="Kebijakan privasi untuk aplikasi dan website VSNotes"
      >
        <p className="text-xs text-gray-400 mb-10">Terakhir diperbarui: 1 Juni 2026</p>

        <Para>
          VSNotes ("kami") berkomitmen melindungi privasi pengguna. Dokumen ini menjelaskan data
          apa yang kami kumpulkan, bagaimana kami menggunakannya, dan hak-hak Anda sebagai pengguna.
        </Para>

        <hr className="border-gray-100 my-8" />

        {/* 1 */}
        <SectionHeading id="data-dikumpulkan">1. Data yang Kami Kumpulkan</SectionHeading>
        <Para>Kami mengumpulkan data berikut saat Anda menggunakan VSNotes:</Para>
        <BulletList
          items={[
            'Akun: alamat email dan nama yang Anda daftarkan untuk autentikasi.',
            'Metadata sesi: judul video, nama aplikasi sumber, waktu mulai dan selesai, durasi.',
            'Audio rekaman: potongan audio sistem 30 detik yang dikirim ke server untuk ditranskripsi. Audio dihapus setelah proses selesai.',
            'Transkrip: teks hasil konversi audio yang disimpan bersama sesi.',
            'Catatan: teks catatan otomatis (Auto-Notes) maupun catatan manual yang Anda tambahkan.',
            'Rangkuman: teks rangkuman yang dihasilkan AI atas permintaan Anda.',
          ]}
        />

        <hr className="border-gray-100 my-8" />

        {/* 2 */}
        <SectionHeading id="cara-penggunaan">2. Cara Kami Menggunakan Data</SectionHeading>
        <Para>Data yang dikumpulkan digunakan semata-mata untuk:</Para>
        <BulletList
          items={[
            'Menyediakan layanan transkripsi dan rangkuman AI.',
            'Menyimpan dan menyinkronkan catatan antar perangkat Anda.',
            'Mengautentikasi identitas Anda dan mengamankan akun.',
            'Meningkatkan kualitas layanan (agregat anonim, tanpa identifikasi individu).',
          ]}
        />
        <Para>
          Kami <strong>tidak</strong> menjual, menyewakan, atau membagikan data pribadi Anda kepada
          pihak ketiga untuk tujuan pemasaran.
        </Para>

        <hr className="border-gray-100 my-8" />

        {/* 3 */}
        <SectionHeading id="pihak-ketiga">3. Layanan Pihak Ketiga</SectionHeading>
        <Para>VSNotes menggunakan layanan pihak ketiga berikut:</Para>
        <div className="space-y-4 mb-3">
          {[
            {
              name: 'Google Gemini API',
              purpose:
                'Transkripsi audio dan pembuatan rangkuman AI. Audio dan teks transkrip dikirim ke Gemini API sesuai kebijakan privasi Google.',
              link: 'https://policies.google.com/privacy',
              linkLabel: 'Kebijakan Privasi Google',
            },
            {
              name: 'MongoDB Atlas',
              purpose:
                'Penyimpanan data pengguna (sesi, catatan, transkrip) di server terenkripsi. Data disimpan di region Asia Pasifik.',
              link: 'https://www.mongodb.com/legal/privacy-policy',
              linkLabel: 'Kebijakan Privasi MongoDB',
            },
          ].map((service) => (
            <div
              key={service.name}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50"
            >
              <p className="text-sm font-semibold text-gray-800 mb-1">{service.name}</p>
              <p className="text-sm text-gray-600 leading-relaxed mb-1.5">{service.purpose}</p>
              <a
                href={service.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded"
              >
                {service.linkLabel} ↗
              </a>
            </div>
          ))}
        </div>

        <hr className="border-gray-100 my-8" />

        {/* 4 */}
        <SectionHeading id="keamanan">4. Keamanan Data</SectionHeading>
        <BulletList
          items={[
            'Seluruh komunikasi antara aplikasi dan server menggunakan HTTPS/TLS.',
            'Token autentikasi JWT dienkripsi AES-256 dan disimpan lokal di perangkat Anda.',
            'Setiap query data di server selalu difilter berdasarkan ID pengguna (data isolation).',
            'Token tidak pernah dicatat di log server dan otomatis dihapus dari memori setelah 1 jam tidak aktif.',
          ]}
        />

        <hr className="border-gray-100 my-8" />

        {/* 5 */}
        <SectionHeading id="retensi">5. Retensi Data</SectionHeading>
        <Para>
          Data Anda disimpan selama akun aktif. Sesi yang telah selesai lebih dari 1 tahun dapat
          dihapus secara otomatis untuk menjaga efisiensi penyimpanan — Anda akan diberitahu
          sebelumnya melalui email.
        </Para>
        <Para>
          File audio rekaman dihapus dari server segera setelah proses transkripsi selesai.
          Tidak ada audio yang disimpan secara permanen.
        </Para>

        <hr className="border-gray-100 my-8" />

        {/* 6 */}
        <SectionHeading id="hak-pengguna">6. Hak Pengguna</SectionHeading>
        <Para>Anda berhak untuk:</Para>
        <BulletList
          items={[
            'Mengakses semua data yang tersimpan di akun Anda melalui aplikasi.',
            'Mengekspor semua catatan kapan saja (format PDF, Markdown, atau TXT).',
            'Menghapus sesi atau catatan tertentu secara individual.',
            'Menghapus seluruh akun beserta datanya melalui menu Pengaturan di aplikasi.',
            'Meminta laporan lengkap data Anda melalui email.',
          ]}
        />

        <hr className="border-gray-100 my-8" />

        {/* 7 */}
        <SectionHeading id="perubahan">7. Perubahan Kebijakan</SectionHeading>
        <Para>
          Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan signifikan
          akan diberitahukan melalui email terdaftar atau notifikasi di aplikasi setidaknya 7 hari
          sebelum berlaku.
        </Para>

        <hr className="border-gray-100 my-8" />

        {/* 8 */}
        <SectionHeading id="kontak">8. Kontak</SectionHeading>
        <Para>
          Untuk pertanyaan seputar privasi atau permintaan penghapusan data, hubungi kami di:
        </Para>
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-sm text-indigo-800">
            <strong>Email:</strong>{' '}
            <a
              href="mailto:agung.alfatah43@gmail.com"
              className="underline hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded"
            >
              agung.alfatah43@gmail.com
            </a>
          </p>
        </div>
      </PageLayout>
    </>
  );
}
