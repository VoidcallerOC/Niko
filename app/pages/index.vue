<template>
  <div id="top">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-nc-ink"
    >
      Skip to content
    </a>
    <StarField />
    <div class="relative z-10">
      <SiteHeader />
      <main id="main" tabindex="-1">
        <HeroSection />
        <FeaturedSection />
        <FeedSection />
        <ShowsSection />
        <UpdatesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </div>
  </div>
</template>
