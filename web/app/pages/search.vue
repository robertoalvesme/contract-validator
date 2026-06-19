<template>
  <div class="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">

    <!-- ── Sidebar ─────────────────────────────────────────────────────────── -->
    <aside class="w-72 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 overflow-y-auto">

      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="font-semibold text-sm text-white">Contract Finder</span>
        </div>
        <button
          class="text-xs text-gray-400 hover:text-red-400 transition-colors"
          @click="logout"
        >Logout</button>
      </div>

      <!-- User badge -->
      <div class="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <p class="text-xs text-gray-500">Signed in as <span class="text-gray-300">{{ auth.handle }}</span></p>
      </div>

      <!-- Form -->
      <div class="flex-1 p-4 space-y-5">

        <!-- ── Customer FL ───────────────────────────────────────────── -->
        <section>
          <label class="section-label">Customer FL</label>
          <input
            v-model="fl"
            type="text"
            placeholder="e.g. 0051849434"
            class="form-input"
          />
          <label class="mt-2 flex items-center gap-2 cursor-pointer group">
            <input
              v-model="searchParent"
              type="checkbox"
              class="checkbox"
            />
            <span class="text-sm text-gray-400 group-hover:text-gray-300 select-none transition-colors">
              Also search Parent FLs
            </span>
          </label>
        </section>

        <div class="divider" />

        <!-- ── Search Type ────────────────────────────────────────────── -->
        <section>
          <label class="section-label">Search Type</label>
          <div class="flex gap-4">
            <label class="radio-label">
              <input v-model="searchMode" type="radio" value="Skill" class="radio" />
              <span>Skill</span>
            </label>
            <label class="radio-label">
              <input v-model="searchMode" type="radio" value="Product" class="radio" />
              <span>Product</span>
            </label>
          </div>
        </section>

        <!-- Searchable dropdown -->
        <section>
          <label class="section-label">
            {{ searchMode === 'Skill' ? 'Skill' : 'Product' }}
          </label>
          <SearchableSelect
            v-model="activeTerm"
            :options="searchMode === 'Skill' ? skills : products"
            :disabled="searchMode === 'Product' && customEnabled"
            :placeholder="`Type to filter ${searchMode === 'Skill' ? 'skills' : 'products'}…`"
          />

          <!-- Custom product toggle (Product mode only) -->
          <label v-if="searchMode === 'Product'" class="mt-2 flex items-center gap-2 cursor-pointer group">
            <input v-model="customEnabled" type="checkbox" class="checkbox" />
            <span class="text-sm text-gray-400 group-hover:text-gray-300 select-none transition-colors">
              Enter custom product name
            </span>
          </label>
          <input
            v-if="searchMode === 'Product' && customEnabled"
            v-model="customTerm"
            type="text"
            placeholder="Product name…"
            class="form-input mt-2"
          />
        </section>

        <div class="divider" />

        <!-- ── Version filter ─────────────────────────────────────────── -->
        <section>
          <label class="section-label">Version Filter <span class="text-gray-600 font-normal">(optional)</span></label>
          <input
            v-model="version"
            type="text"
            placeholder="e.g. 8, 9, 10"
            class="form-input"
          />
        </section>
      </div>

      <!-- ── Buttons + Log ─────────────────────────────────────────────── -->
      <div class="p-4 space-y-2 border-t border-gray-800">
        <button
          :disabled="isSearching"
          class="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all focus:outline-none"
          :class="isSearching
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-green-700 hover:bg-green-600 active:bg-green-800 text-white'"
          @click="startSearch"
        >
          {{ isSearching ? '⏳  Searching…' : '▶  Start Search' }}
        </button>

        <button
          :disabled="!isSearching"
          class="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all focus:outline-none"
          :class="isSearching
            ? 'bg-red-800 hover:bg-red-700 text-white'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'"
          @click="stopSearch"
        >
          ■  Stop
        </button>

        <button
          class="w-full py-2 px-4 rounded-lg text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 transition-all"
          @click="clearResults"
        >
          ✕  Clear Results
        </button>

        <!-- ── Log panel ──────────────────────────────────────────────── -->
        <div class="mt-1">
          <!-- Empty / ready state -->
          <div
            v-if="logs.length === 0"
            class="px-3 py-2 rounded-lg text-xs bg-gray-800 text-gray-500 border border-gray-700"
          >
            Ready
          </div>

          <!-- Log panel with messages -->
          <div
            v-else
            class="rounded-lg overflow-hidden border transition-colors"
            :class="logBorderClass"
          >
            <!-- Latest message (highlighted) -->
            <div class="px-3 py-2 text-xs font-medium" :class="logTextClass">
              {{ logs[logs.length - 1] }}
            </div>

            <!-- History (previous messages) -->
            <div
              v-if="logs.length > 1"
              ref="logPanel"
              class="border-t px-3 py-2 max-h-40 overflow-y-auto"
              :class="logDividerClass"
            >
              <p
                v-for="(msg, i) in logs"
                :key="i"
                class="text-[11px] leading-snug py-0.5"
                :class="i === logs.length - 1 ? 'text-gray-300' : 'text-gray-500'"
              >
                <span class="text-gray-600 select-none font-mono">{{ String(i + 1).padStart(2) }}.</span>
                {{ msg }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ── Results area ───────────────────────────────────────────────────── -->
    <main class="flex-1 flex flex-col overflow-hidden">

      <!-- Results header -->
      <div class="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <h2 class="font-semibold text-gray-200">
          Contracts Found
          <span v-if="results.length > 0" class="ml-2 text-sm font-normal text-blue-400">
            {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
          </span>
        </h2>
        <span v-if="isSearching" class="flex items-center gap-2 text-xs text-orange-400">
          <span class="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          Searching…
        </span>
      </div>

      <!-- Scroll area -->
      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-2">

        <!-- Empty state -->
        <div v-if="results.length === 0 && !isSearching" class="flex flex-col items-center justify-center h-full text-center">
          <div class="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p class="text-gray-500 text-sm">No results yet</p>
          <p class="text-gray-600 text-xs mt-1">Fill in the form and start a search</p>
        </div>

        <!-- Result cards -->
        <div
          v-for="(r, i) in results"
          :key="i"
          class="flex items-stretch bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
        >
          <!-- Left accent -->
          <div class="w-1 bg-blue-600 shrink-0" />

          <!-- Info -->
          <div class="flex-1 px-4 py-3 min-w-0">
            <!-- Row 1: FL badge + skill -->
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800 text-blue-300 text-xs font-mono font-semibold">
                FL {{ r.fl }}
              </span>
              <span class="text-xs text-gray-400 truncate">{{ r.skill }}</span>
            </div>
            <!-- Row 2: Asset + material -->
            <div class="flex items-baseline gap-3 flex-wrap">
              <span class="font-semibold text-gray-100 text-sm font-mono">{{ r.contractNum }}</span>
              <span class="text-gray-400 text-xs truncate">{{ r.description }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 px-3 py-3 shrink-0">
            <a
              :href="r.url"
              target="_blank"
              rel="noopener"
              class="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Open ↗
            </a>
            <button
              class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-lg transition-colors relative"
              @click="copy(r, i)"
            >
              {{ copiedIdx === i ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth   = useAuthStore()
const router = useRouter()

// ── Skills / Products (loaded from API) ─────────────────────────────────────
const { data: skillsData } = await useFetch('/api/skills')
const skills   = computed(() => skillsData.value?.skills   ?? [])
const products = computed(() => skillsData.value?.products ?? [])

// ── Form state ───────────────────────────────────────────────────────────────
const fl             = ref('')
const searchMode     = ref<'Skill' | 'Product'>('Skill')
const skillTerm      = ref('')
const productTerm    = ref('')
const customEnabled  = ref(false)
const customTerm     = ref('')
const version        = ref('')
const searchParent   = ref(false)

const activeTerm = computed({
  get: ()  => searchMode.value === 'Skill' ? skillTerm.value : productTerm.value,
  set: (v) => searchMode.value === 'Skill'
    ? (skillTerm.value = v)
    : (productTerm.value = v),
})

watch(searchMode, (mode) => {
  if (mode === 'Skill' && !skillTerm.value && skills.value.length)
    skillTerm.value = skills.value[0]
  if (mode === 'Product' && !productTerm.value && products.value.length)
    productTerm.value = products.value[0]
  customEnabled.value = false
})

onMounted(() => {
  if (!skillTerm.value && skills.value.length)
    skillTerm.value = skills.value[0]
})

// ── Search state ─────────────────────────────────────────────────────────────
interface ContractResult {
  fl: string
  skill: string
  contractNum: string
  description: string
  url: string
}

const results     = ref<ContractResult[]>([])
const logs        = ref<string[]>([])
const statusColor = ref<'gray' | 'orange' | 'green' | 'red'>('gray')
const isSearching = ref(false)
const copiedIdx   = ref<number | null>(null)
const logPanel    = ref<HTMLElement | null>(null)
let   es: EventSource | null = null

// Auto-scroll log panel to bottom when new messages arrive
watch(logs, () => {
  nextTick(() => {
    if (logPanel.value) {
      logPanel.value.scrollTop = logPanel.value.scrollHeight
    }
  })
}, { deep: true })

// Log panel color classes
const logBorderClass = computed(() => ({
  'border-orange-900/40 bg-orange-950/30': statusColor.value === 'orange',
  'border-green-900/40 bg-green-950/30':   statusColor.value === 'green',
  'border-red-900/40 bg-red-950/30':       statusColor.value === 'red',
  'border-gray-700 bg-gray-800':           statusColor.value === 'gray',
}))

const logTextClass = computed(() => ({
  'text-orange-300': statusColor.value === 'orange',
  'text-green-400':  statusColor.value === 'green',
  'text-red-400':    statusColor.value === 'red',
  'text-gray-500':   statusColor.value === 'gray',
}))

const logDividerClass = computed(() => ({
  'border-orange-900/30 bg-orange-950/20': statusColor.value === 'orange',
  'border-green-900/30 bg-green-950/20':   statusColor.value === 'green',
  'border-red-900/30 bg-red-950/20':       statusColor.value === 'red',
  'border-gray-700 bg-gray-900/50':        statusColor.value === 'gray',
}))

const effectiveTerm = computed(() => {
  if (searchMode.value === 'Product' && customEnabled.value) return customTerm.value.trim()
  return activeTerm.value
})

// ── Actions ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  logs.value.push(msg)
}

function startSearch() {
  const term = effectiveTerm.value
  if (!fl.value.trim()) {
    logs.value        = ['Please enter a Customer FL.']
    statusColor.value = 'red'
    return
  }
  if (!term) {
    logs.value        = ['Please select or enter a search term.']
    statusColor.value = 'red'
    return
  }

  results.value     = []
  logs.value        = ['Connecting…']
  copiedIdx.value   = null
  isSearching.value = true
  statusColor.value = 'orange'

  const params = new URLSearchParams({
    fl:           fl.value.trim(),
    mode:         searchMode.value,
    term,
    version:      version.value ?? '',
    searchParent: searchParent.value ? '1' : '0',
    user:         auth.handle,
    pass:         auth.password,
  })

  es = new EventSource(`/api/search?${params}`)

  es.addEventListener('status', (e) => {
    log(JSON.parse(e.data).message)
    statusColor.value = 'orange'
  })

  es.addEventListener('result', (e) => {
    results.value.push(JSON.parse(e.data))
  })

  es.addEventListener('done', (e) => {
    const { total } = JSON.parse(e.data)
    log(`Done — ${total} contract${total !== 1 ? 's' : ''} found`)
    statusColor.value = total > 0 ? 'green' : 'gray'
    isSearching.value = false
    closeStream()
  })

  es.addEventListener('error', (e) => {
    try {
      log(`Error: ${JSON.parse((e as any).data).message}`)
    } catch {
      log('An error occurred during the search.')
    }
    statusColor.value = 'red'
    isSearching.value = false
    closeStream()
  })

  es.onerror = () => {
    if (isSearching.value) {
      log('Connection lost. The search may have timed out.')
      statusColor.value = 'red'
      isSearching.value = false
    }
    closeStream()
  }
}

function stopSearch() {
  closeStream()
  isSearching.value = false
  log('Search stopped by user.')
  statusColor.value = 'red'
}

function clearResults() {
  results.value     = []
  logs.value        = []
  statusColor.value = 'gray'
  copiedIdx.value   = null
}

function closeStream() {
  es?.close()
  es = null
}

function copy(r: ContractResult, idx: number) {
  const text = [
    'Contract Found',
    `FL: ${r.fl}`,
    `Skill: ${r.skill}`,
    `Asset Number: ${r.contractNum}`,
    `Contract URL:\n${r.url}`,
  ].join('\n')
  navigator.clipboard.writeText(text)
  copiedIdx.value = idx
  setTimeout(() => { if (copiedIdx.value === idx) copiedIdx.value = null }, 2000)
}

function logout() {
  closeStream()
  auth.logout()
  router.push('/login')
}

onUnmounted(closeStream)
</script>

<style scoped>
@reference "tailwindcss";

.section-label {
  @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2;
}
.form-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
         placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
         transition-colors;
}
.divider {
  @apply border-t border-gray-800;
}
.checkbox {
  @apply w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600
         focus:ring-blue-500 focus:ring-offset-0 cursor-pointer;
}
.radio {
  @apply w-4 h-4 border-gray-600 bg-gray-800 text-blue-600
         focus:ring-blue-500 focus:ring-offset-0 cursor-pointer;
}
.radio-label {
  @apply flex items-center gap-2 text-sm text-gray-300 cursor-pointer;
}
</style>
