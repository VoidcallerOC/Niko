<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Owner sign-in — Nino’s Collectibles', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const setup = reactive({ email: '', password: '', confirm: '', code: '' })
interface SessionInfo {
  signedIn: boolean
  mode: 'password' | 'demo' | 'unconfigured'
  reason: string | null
  methods: { password: boolean; emailRequired: boolean; square: boolean; squareDemo: boolean; setup: boolean; setupCodeRequired: boolean }
  owner: { bound: boolean; email?: string; businessName?: string; source?: string; hasPassword?: boolean; squareLinked?: boolean }
}
const { data: session } = await useAsyncData('admin-session', () => useRequestFetch()<SessionInfo>('/api/admin/auth/session'))

const next = computed(() => {
  const n = typeof route.query.next === 'string' ? route.query.next : '/admin'
  return n.startsWith('/admin') ? n : '/admin'
})
if (session.value?.signedIn) await navigateTo(next.value, { replace: true })

const squareHref = computed(() => `/api/admin/auth/square/start?next=${encodeURIComponent(next.value)}`)
const callbackErrors: Record<string, string> = {
  denied: 'Square sign-in was cancelled.',
  state: 'That sign-in link expired. Try again.',
  square: 'Square did not complete the sign-in. Try again in a moment.',
  notowner: 'That Square account is not the owner account for this site.',
  linkemail: 'That Square account’s email does not match the owner email. Sign in with your password first, then link Square from Settings.',
}
const callbackError = computed(() => (typeof route.query.error === 'string' ? callbackErrors[route.query.error] ?? 'Sign-in failed.' : ''))
const nothingConfigured = computed(() => !!session.value && !session.value.methods.password && !session.value.methods.square && !session.value.methods.setup)

async function runSetup() {
  error.value = ''
  busy.value = true
  try {
    await $fetch('/api/admin/auth/setup', { method: 'POST', body: { ...setup } })
    await refreshNuxtData('admin-session')
    await navigateTo(next.value, { replace: true })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await $fetch('/api/admin/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
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
      <p class="mt-2 text-center text-sm text-nc-mist">{{ session?.methods.setup ? 'First visit. Set up the owner account: this email and password become the admin login.' : 'Private. Sign-in is checked on the server; nothing is stored in this browser except a locked session cookie.' }}</p>

      <div v-if="nothingConfigured" class="mt-6 rounded-md border border-nc-red/60 bg-nc-red/10 p-4 text-sm" role="alert">
        <strong>Sign-in is not set up yet.</strong>
        <p class="mt-1 text-white/80">{{ session?.reason || 'Set NUXT_SESSION_SECRET plus either a Square app (NUXT_SQUARE_APP_ID / NUXT_SQUARE_APP_SECRET) or a password hash.' }}</p>
      </div>

      <p v-if="callbackError" class="mt-6 rounded-md border border-nc-red/60 bg-nc-red/10 p-3 text-sm font-semibold text-white" role="alert">{{ callbackError }}</p>

      <div v-if="session?.methods.square" class="mt-6 grid gap-3">
        <a :href="squareHref" class="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-white px-5 text-base font-semibold text-nc-ink transition-colors hover:bg-white/85" data-square-login>
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1.5 3.5v13h13v-13h-13zM9 9h6v6H9z" /></svg>
          Sign in with Square{{ session.methods.squareDemo ? ' (demo)' : '' }}
        </a>
        <p class="text-center text-xs text-white/55">
          <template v-if="session.owner.bound">Owner: {{ session.owner.email || session.owner.businessName || 'bound Square account' }}<template v-if="session.owner.source === 'demo'"> (sample)</template>. Only that Square account can sign in.</template>
          <template v-else-if="session.methods.setup">Or skip the form: the first Square account to sign in becomes the owner, with its email as the admin login.</template>
          <template v-else>The first Square account to sign in becomes the owner. Its email is kept as the admin login.</template>
        </p>
        <div v-if="session.methods.password" class="flex items-center gap-3 text-xs text-white/45" aria-hidden="true"><span class="h-px flex-1 bg-white/15" />or use the password<span class="h-px flex-1 bg-white/15" /></div>
      </div>

      <form v-if="session?.methods.setup" class="grid gap-4" :class="session.methods.square ? 'mt-3' : 'mt-6'" data-setup @submit.prevent="runSetup">
        <AdminField v-model="setup.email" label="Your email" type="email" inputmode="email" autocomplete="username" hint="Used to sign in, and to match your Square account later." />
        <AdminField v-model="setup.password" label="Choose a password" type="password" autocomplete="new-password" hint="At least 12 characters. Nobody else knows it; it is stored only as a hash." />
        <AdminField v-model="setup.confirm" label="Repeat the password" type="password" autocomplete="new-password" />
        <AdminField v-if="session.methods.setupCodeRequired" v-model="setup.code" label="Setup code" autocomplete="one-time-code" hint="The one-time code you were given." />
        <p v-if="error" class="text-sm font-semibold text-nc-red-bright" role="alert">{{ error }}</p>
        <AdminButton type="submit" variant="red" size="lg" block :busy="busy" :disabled="!setup.email || !setup.password || !setup.confirm">Create owner account</AdminButton>
      </form>

      <form v-else-if="session?.methods.password" class="grid gap-4" :class="session.methods.square ? 'mt-3' : 'mt-6'" @submit.prevent="submit">
        <AdminField v-if="session.methods.emailRequired" v-model="email" label="Email" type="email" inputmode="email" autocomplete="username" />
        <div v-if="session?.mode === 'demo'" class="rounded-md border border-white/15 bg-nc-char p-3 text-sm text-white/80">
          Demo mode. Password: <code class="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-white">demo-nino</code>. Everything inside is labelled sample data.
        </div>
        <AdminField v-model="password" label="Password" type="password" autocomplete="current-password" />
        <p v-if="error" class="text-sm font-semibold text-nc-red-bright" role="alert">{{ error }}</p>
        <AdminButton type="submit" variant="red" size="lg" block :busy="busy" :disabled="!password || (session.methods.emailRequired && !email)">Sign in</AdminButton>
      </form>
      <p class="mt-8 text-center text-sm"><NuxtLink to="/" class="nav-link">Back to the site</NuxtLink></p>
    </div>
  </div>
</template>
