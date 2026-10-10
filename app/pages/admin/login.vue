<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Owner sign-in — Nino’s Collectibles', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const password = ref('')
const busy = ref(false)
const error = ref('')
const { data: session } = await useAsyncData('admin-session', () => useRequestFetch()<{ signedIn: boolean; mode: 'password' | 'demo' | 'unconfigured'; reason: string | null }>('/api/admin/auth/session'))

const next = computed(() => {
  const n = typeof route.query.next === 'string' ? route.query.next : '/admin'
  return n.startsWith('/admin') ? n : '/admin'
})
if (session.value?.signedIn) await navigateTo(next.value, { replace: true })

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await $fetch('/api/admin/auth/login', { method: 'POST', body: { password: password.value } })
    await refreshNuxtData('admin-session')
    await navigateTo(next.value, { replace: true })
  } catch (e) {
    error.value = errorMessage(e)
    password.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-nc-ink px-4 py-10 text-white">
    <div class="w-full max-w-sm">
      <div class="mx-auto w-32"><BrandMark variant="full" /></div>
      <h1 class="mt-6 text-center font-display text-4xl font-bold">Owner sign-in</h1>
      <p class="mt-2 text-center text-sm text-nc-mist">Private. The password is checked on the server; nothing is stored in this browser except a locked session cookie.</p>

      <div v-if="session?.mode === 'unconfigured'" class="mt-6 rounded-md border border-nc-red/60 bg-nc-red/10 p-4 text-sm" role="alert">
        <strong>Sign-in is not set up yet.</strong>
        <p class="mt-1 text-white/80">{{ session.reason }}</p>
      </div>

      <form v-else class="mt-6 grid gap-4" @submit.prevent="submit">
        <div v-if="session?.mode === 'demo'" class="rounded-md border border-white/15 bg-nc-char p-3 text-sm text-white/80">
          Demo mode. Password: <code class="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-white">demo-nino</code>. Everything inside is labelled sample data.
        </div>
        <AdminField v-model="password" label="Password" type="password" autocomplete="current-password" />
        <p v-if="error" class="text-sm font-semibold text-nc-red-bright" role="alert">{{ error }}</p>
        <AdminButton type="submit" variant="red" size="lg" block :busy="busy" :disabled="!password">Sign in</AdminButton>
      </form>
      <p class="mt-8 text-center text-sm"><NuxtLink to="/" class="nav-link">Back to the site</NuxtLink></p>
    </div>
  </div>
</template>
