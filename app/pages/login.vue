<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">

      <!-- Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/40">
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Contract Finder</h1>
        <p class="text-sm text-gray-400 mt-1">Avaya Siebel Reports</p>
      </div>

      <!-- Card -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
        <h2 class="text-base font-semibold text-white mb-5">Sign in to continue</h2>

        <!-- Error -->
        <div
          v-if="error"
          class="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400 text-sm"
        >
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Username / Handle</label>
            <input
              v-model="handle"
              type="text"
              placeholder="your.handle"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              @keyup.enter="passwordEl?.focus()"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Password</label>
            <input
              ref="passwordEl"
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              @keyup.enter="login"
            />
          </div>

          <label class="flex items-center gap-2.5 cursor-pointer group">
            <input
              v-model="remember"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900 cursor-pointer"
            />
            <span class="text-sm text-gray-400 group-hover:text-gray-300 transition-colors select-none">
              Remember my username on this device
            </span>
          </label>
        </div>

        <button
          class="mt-6 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          @click="login"
        >
          Sign in
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth   = useAuthStore()
const router = useRouter()

if (auth.isLoggedIn) {
  await navigateTo('/search')
}

const passwordEl = ref<HTMLInputElement>()
const handle     = ref('')
const password   = ref('')
const remember   = ref(false)
const error      = ref('')

onMounted(() => {
  const saved = auth.loadSavedHandle()
  if (saved) {
    handle.value  = saved
    remember.value = true
  }
})

function login() {
  if (!handle.value.trim() || !password.value.trim()) {
    error.value = 'Please enter both username and password.'
    return
  }
  error.value = ''
  auth.setCredentials(handle.value.trim(), password.value.trim(), remember.value)
  router.push('/search')
}
</script>
