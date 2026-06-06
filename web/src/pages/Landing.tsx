import React, { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { LANDING_CONFIG } from '../config/landing.config';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import BenefitsSection from '../components/landing/BenefitsSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import ErrorBoundary from '../components/shared/ErrorBoundary';

const DownloadSection = lazy(() => import('../components/landing/DownloadSection'));
const Footer = lazy(() => import('../components/landing/Footer'));

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>{LANDING_CONFIG.seo.title}</title>
        <meta name="description" content={LANDING_CONFIG.seo.description} />
        <meta name="keywords" content={LANDING_CONFIG.seo.keywords} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={LANDING_CONFIG.seo.title} />
        <meta property="og:description" content={LANDING_CONFIG.seo.description} />
        <meta property="og:image" content={LANDING_CONFIG.seo.ogImage} />
        <meta property="og:url" content={LANDING_CONFIG.seo.url} />
        <meta property="og:locale" content="id_ID" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={LANDING_CONFIG.seo.title} />
        <meta name="twitter:description" content={LANDING_CONFIG.seo.description} />
        <meta name="twitter:image" content={LANDING_CONFIG.seo.ogImage} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={LANDING_CONFIG.seo.url} />
      </Helmet>

      <ErrorBoundary>
        <div className="bg-white text-slate-900">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-brand-600 text-white px-4 py-2 rounded-lg"
          >
            Lewati ke konten utama
          </a>

          <main id="main-content">
            <HeroSection />
            <FeaturesSection />
            <BenefitsSection />
            <HowItWorksSection />
            <Suspense fallback={<div className="h-64" />}>
              <DownloadSection />
              <Footer />
            </Suspense>
          </main>
        </div>
      </ErrorBoundary>
    </>
  );
}
