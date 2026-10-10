<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Owner sign-in — Nino’s Collectibles', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const setup = reactive({ code: '', email: '', password: '', confirm: '' })
const { data: session } = await useAdminSession()

const next = computed(() => {
  const n = typeof route.query.next === 'string' ? route.query.next : '/admin'
  return n.startsWith('/admin') && !n.startsWith('//') && n !== '/admin/login' ? n : '/admin'
})
if (session.value?.signedIn) await navigateTo(next.value, { replace: true })

const squareHref = computed(() => `/api/admin/auth/square/start?next=${encodeURIComponent(next.value)}`)
const callbackErrors: Record<string, string> = {
  denied: 'Square sign-in was cancelled.',
  state: 'That sign-in link expired. Try again.',
  square: 'Square did not complete the sign-in. Try again in a moment.',
  notowner: 'That Square account is not the one linked to this admin.',
  nosquare: 'No Square account is linked yet. Sign in with your email and password, then connect Square from the Square page.',
  notconfigured: 'Square sign-in is not set up on this site yet.',
  noowner: 'Create the owner account first.',
}
const callbackError = computed(() => (typeof route.query.error === 'string' ? callbackErrors[route.query.error] ?? 'Sign-in failed.' : ''))

async function after(action: () => Promise<unknown>) {
  error.value = ''
  busy.value = true
  try {
    await action()
    await refreshNuxtData('admin-session')
    await navigateTo(next.value, { replace: true })
  } catch (e) {
    error.value = errorMessage(e)
    password.value = ''
  } finally {
    busy.value = false
  }
}
// Untyped post: Nitro's typed-route inference recurses on these two routes.
const post = (url: string, body: Record<string, unknown>) => ($fetch as unknown as (u: string, o: { method: 'POST'; body: unknown }) => Promise<unknown>)(url, { method: 'POST', body })
const runSetup = () => after(() => post('/api/admin/auth/setup', { ...setup }))
const submit = () => after(() => post('/api/admin/auth/login', { email: email.value, password: password.value }))
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-nc-ink px-4 py-10 text-white">
    <div class="w-full max-w-sm">
      <div class="mx-auto w-32"><BrandMark variant="full" /></div>
      <h1 class="mt-6 text-center font-display text-4xl font-bold">{{ session?.methods.setup ? 'Set up your admin' : 'Owner sign-in' }}</h1>
      <p class="mt-2 text-center text-sm text-nc-mist">
        <template v-if="session?.methods.setup">First visit. Enter the setup code Nick gave you, then choose the email and password you will sign in with. Nobody else sees your password.</template>
        <template v-else>Private. Sign-in is checked on the server; this browser keeps only a locked session cookie.</template>
      </p>

      <div v-if="session?.demo" class="mt-6 rounded-md border border-nc-red/60 bg-nc-red/10 p-3 text-sm text-white/90">
        <strong>Demo mode.</strong> Password <code class="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-white">demo-nino</code>. Everything inside is labelled SAMPLE data kept in memory; no real account or Square data is used.
      </div>

      <div v-if="session?.blocked" class="mt-6 rounded-md border border-nc-red/60 bg-nc-red/10 p-4 text-sm" role="alert" data-blocked>
        <strong>The admin isn’t ready yet.</strong>
        <p class="mt-1 text-white/80">{{ session.blocked }}</p>
      </div>

      <p v-if="callbackError" class="mt-6 rounded-md border border-nc-red/60 bg-nc-red/10 p-3 text-sm font-semibold text-white" role="alert">{{ callbackError }}</p>

      <!-- First visit: create the owner account -->
      <form v-if="session?.methods.setup" class="mt-6 grid gap-4" data-setup @submit.prevent="runSetup">
        <AdminField v-model="setup.code" label="Setup code" autocomplete="one-time-code" hint="The one-time code from Nick. It stops working once your account exists." />
        <AdminField v-model="setup.email" label="Your email" type="email" inputmode="email" autocomplete="username" hint="You’ll sign in with this." />
        <AdminField v-model="setup.password" label="Choose a password" type="password" autocomplete="new-password" hint="At least 12 characters. Stored only as a one-way hash." />
        <AdminField v-model="setup.confirm" label="Repeat the password" type="password" autocomplete="new-password" />
        <p v-if="error" class="text-sm font-semibold text-nc-red-bright" role="alert">{{ error }}</p>
        <AdminButton type="submit" variant="red" size="lg" block :busy="busy" :disabled="!setup.code || !setup.email || !setup.password || !setup.confirm">Create my owner account</AdminButton>
      </form>

      <template v-else-if="session?.methods.password">
        <div v-if="session.methods.square" class="mt-6 grid gap-3">
          <a :href="squareHref" class="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-white px-5 text-base font-semibold text-nc-ink transition-colors hover:bg-white/85" data-square-login>
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1.5 3.5v13h13v-13h-13zM9 9h6v6H9z" /></svg>
            Sign in with Square
          </a>
          <div class="flex items-center gap-3 text-xs text-white/45" aria-hidden="true"><span class="h-px flex-1 bg-white/15" />or<span class="h-px flex-1 bg-white/15" /></div>
        </div>
        <form class="grid gap-4" :class="session.methods.square ? 'mt-3' : 'mt-6'" data-login @submit.prevent="submit">
          <AdminField v-if="!session.demo" v-model="email" label="Email" type="email" inputmode="email" autocomplete="username" />
          <AdminField v-model="password" label="Password" type="password" autocomplete="current-password" />
          <p v-if="error" class="text-sm font-semibold text-nc-red-bright" role="alert">{{ error }}</p>
          <AdminButton type="submit" variant="red" size="lg" block :busy="busy" :disabled="!password || (!session.demo && !email)">Sign in</AdminButton>
        </form>
      </template>
      <!-- For Nick: confirm the Preview is configured before sending Nino the link -->
      <details v-if="session?.setupCheck && !session.signedIn" class="mt-8 rounded-md border border-white/15 bg-nc-char p-4 text-sm" data-setup-check :open="!!session.blocked">
        <summary class="min-h-11 cursor-pointer font-semibold">Setup check (for Nick)</summary>
        <ul class="mt-2 grid gap-1.5">
          <li v-for="item in session.setupCheck.items" :key="item.key" class="flex items-start gap-2">
            <span aria-hidden="true" class="mt-0.5 font-bold" :class="item.ok ? 'text-white' : 'text-nc-red-bright'">{{ item.ok ? '✓' : '✗' }}</span>
            <span :class="item.ok ? 'text-white/80' : 'text-white'">{{ item.label }}<span class="sr-only">{{ item.ok ? ' (ok)' : ' (needs attention)' }}</span></span>
          </li>
        </ul>
        <p class="mt-3 text-white/70">Register this exact Redirect URL on the Square app’s OAuth page:</p>
        <code class="mt-1 block rounded-sm bg-white/10 px-2 py-1.5 font-mono text-xs break-all text-white" data-callback-url>{{ session.setupCheck.callbackUrl }}</code>
        <ul v-if="session.setupCheck.squareProblems.length" class="mt-3 list-disc pl-5 text-white/70">
          <li v-for="p in session.setupCheck.squareProblems" :key="p">{{ p }}</li>
        </ul>
        <p class="mt-3 text-xs text-white/50">This list disappears once Nino’s account exists. It shows settings names only, never their values.</p>
      </details>
      <p class="mt-8 text-center text-sm"><NuxtLink to="/" class="nav-link">Back to the site</NuxtLink></p>
    </div>
  </div>
</template>
