export const LANDING_CONFIG = {
  app: {
    name: 'VSNotes',
    fullName: 'Video Summary & Auto-Notes',
    tagline: 'Catat otomatis semua video edukasi yang Anda tonton',
    description: 'Ringkasan AI, transkrip lengkap, dan catatan otomatis—tanpa perlu pause video.',
  },
  downloads: {
    windows: {
      version: '1.0.0',
      fileSize: '~120 MB',
      url: 'https://github.com/AgungA142/VSNotes/releases/download/v1.0.0/VSNotes-Setup-1.0.0.exe',
      available: true,
    },
    macos: {
      version: '1.0.0',
      fileSize: '~110 MB',
      url: '',
      available: false,
    },
  },
  contact: {
    email: 'rampung.space@gmail.com',
    docs: '/docs',
    faq: '/faq',
  },
  seo: {
    title: 'VSNotes — Catat Video Otomatis dengan AI',
    description:
      'Aplikasi desktop gratis untuk merekam, mentranskrip, dan merangkum video edukasi secara otomatis. Hemat waktu belajar dengan AI.',
    keywords:
      'video notes, auto notes, ai summary, transkrip video, belajar online, catatan otomatis, vsnotes',
    ogImage: '/og-image.png',
    url: 'https://vsnotes.space',
  },
  features: [
    {
      id: 'auto-detect',
      icon: 'Eye' as const,
      title: 'Deteksi Video Otomatis',
      description: 'Mendeteksi saat Anda menonton video dan mulai merekam secara otomatis.',
    },
    {
      id: 'transcription',
      icon: 'FileText' as const,
      title: 'Transkripsi Audio',
      description: 'Konversi audio video menjadi teks lengkap dengan timestamp akurat.',
    },
    {
      id: 'ai-summary',
      icon: 'Sparkles' as const,
      title: 'Ringkasan AI',
      description: 'Dapatkan ringkasan singkat dan poin-poin penting dari setiap video.',
    },
    {
      id: 'auto-notes',
      icon: 'Bot' as const,
      title: 'Auto-Notes',
      description: 'Catatan otomatis pada momen penting tanpa perlu pause video.',
    },
    {
      id: 'manual-notes',
      icon: 'PenLine' as const,
      title: 'Catatan Manual',
      description: 'Tambah catatan sendiri kapan saja dengan shortcut keyboard (Ctrl+Shift+N).',
    },
    {
      id: 'export',
      icon: 'FileDown' as const,
      title: 'Export Fleksibel',
      description: 'Ekspor catatan ke PDF, Markdown, atau teks biasa dengan satu klik.',
    },
  ],
  benefits: [
    {
      id: 'student',
      emoji: '🎓',
      title: 'Mahasiswa',
      description: 'Belajar dari video kuliah online tanpa takut ketinggalan poin penting.',
    },
    {
      id: 'professional',
      emoji: '💼',
      title: 'Profesional',
      description: 'Ikuti webinar dan workshop — rangkuman langsung tersedia setelah selesai.',
    },
    {
      id: 'learner',
      emoji: '📚',
      title: 'Lifelong Learner',
      description: 'Tonton tutorial dan course sebanyak mungkin tanpa pusing mencatat.',
    },
    {
      id: 'creator',
      emoji: '🎬',
      title: 'Content Creator',
      description: 'Riset konten dari video secara efisien dengan catatan otomatis.',
    },
  ],
  steps: [
    {
      number: 1,
      icon: 'Download' as const,
      title: 'Download & Install',
      description: 'Download installer Windows dan ikuti petunjuk instalasi yang sederhana.',
    },
    {
      number: 2,
      icon: 'Play' as const,
      title: 'Buka Aplikasi',
      description: 'Jalankan VSNotes dan berikan permission screen recording & audio.',
    },
    {
      number: 3,
      icon: 'Eye' as const,
      title: 'Tonton Video',
      description: 'Aplikasi otomatis mendeteksi, merekam, dan membuat catatan untuk Anda.',
    },
  ],
  requirements: {
    os: 'Windows 10 64-bit',
    ram: 'Minimal 4 GB (rekomendasi 8 GB)',
    storage: '500 MB ruang kosong',
    permissions: 'Screen recording, audio capture',
  },
} as const;
