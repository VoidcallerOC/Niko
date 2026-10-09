<template>
  <div id="top">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-nc-black focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>
    <PreviewBanner />
    <SiteHeader />
    <main id="main" tabindex="-1">
      <HeroSection />
      <CardsSection />
      <ShowsSection />
      <AboutSection />
      <ContactSection />
    </main>
    <SiteFooter />
  </div>
</template>
