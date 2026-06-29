<template>
  <div class="min-h-dvh bg-gray-950 text-gray-100 flex flex-col">

    <!-- ── Top bar ───────────────────────────────────────────────────────── -->
    <header class="shrink-0 bg-gray-900 border-b border-gray-800">
      <div class="flex items-center gap-3 px-4 py-3">
        <!-- Logo -->
        <div class="flex items-center gap-2 mr-auto min-w-0">
          <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="font-semibold text-sm text-white hidden sm:block">Contract Finder</span>
        </div>
        <!-- User + logout -->
        <p class="hidden md:block text-xs text-gray-500 shrink-0">
          Signed in as <span class="text-gray-300">{{ auth.handle }}</span>
        </p>
        <button class="text-xs text-gray-400 hover:text-red-400 transition-colors shrink-0 py-1" @click="logout">
          Logout
        </button>
      </div>
      <!-- Nav breadcrumb -->
      <div class="flex items-center gap-1 px-4 pb-2.5 overflow-x-auto">
        <NuxtLink
          to="/search"
          class="text-xs text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap flex items-center gap-1 py-0.5"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Search
        </NuxtLink>
        <span class="text-gray-700 text-xs px-1">·</span>
        <NuxtLink
          to="/skills"
          class="text-xs text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap py-0.5"
        >
          Skills
        </NuxtLink>
        <span class="text-gray-700 text-xs px-1">·</span>
        <span class="text-xs font-medium text-white whitespace-nowrap py-0.5">Subscription Plans</span>
      </div>
    </header>

    <!-- ── Content ────────────────────────────────────────────────────────── -->
    <main class="flex-1 px-4 sm:px-6 py-5 sm:py-6 max-w-6xl w-full mx-auto">

      <!-- Page header -->
      <div class="flex items-center justify-between mb-5 gap-3">
        <div class="min-w-0">
          <h1 class="text-base sm:text-lg font-semibold text-white">Subscription Plans</h1>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ plans.length }} plan{{ plans.length !== 1 ? 's' : '' }} registered
          </p>
        </div>
        <button
          class="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          @click="openAdd"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden xs:inline">Add </span>Plan
        </button>
      </div>

      <!-- Filter -->
      <div class="mb-4">
        <input
          v-model="filter"
          type="text"
          placeholder="Filter by name or code…"
          class="w-full sm:max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-16 text-gray-500 text-sm">Loading…</div>

      <!-- Table -->
      <div v-else class="rounded-xl border border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-900 border-b border-gray-800">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Code</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Skills</th>
                <th class="px-4 py-3 w-20 sm:w-24"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              <tr v-if="filtered.length === 0">
                <td colspan="4" class="px-4 py-10 text-center text-gray-500 text-sm">No subscription plans found</td>
              </tr>
              <tr
                v-for="p in filtered"
                :key="p.id"
                class="transition-colors"
                :class="deleteConfirm === p.id ? 'bg-red-950/40' : 'hover:bg-gray-900/60'"
              >
                <!-- Code -->
                <td class="px-4 py-3.5">
                  <span class="font-mono text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300">{{ p.code }}</span>
                </td>

                <!-- Name -->
                <td class="px-4 py-3.5 font-medium text-gray-100">
                  <div>{{ p.name }}</div>
                  <!-- Skills pill summary on mobile -->
                  <div class="md:hidden flex flex-wrap gap-1 mt-1.5">
                    <span
                      v-for="sk in p.skills.slice(0, 3)"
                      :key="sk"
                      class="px-1.5 py-0.5 rounded text-xs bg-blue-950 border border-blue-900 text-blue-300"
                    >{{ sk }}</span>
                    <span v-if="p.skills.length > 3" class="text-xs text-gray-600">
                      +{{ p.skills.length - 3 }} more
                    </span>
                    <span v-if="!p.skills.length" class="text-xs text-gray-600">No skills</span>
                  </div>
                </td>

                <!-- Skills (tablet+) -->
                <td class="px-4 py-3.5 hidden md:table-cell">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="sk in p.skills"
                      :key="sk"
                      class="px-1.5 py-0.5 rounded text-xs bg-blue-950 border border-blue-900 text-blue-300"
                    >{{ sk }}</span>
                    <span v-if="!p.skills.length" class="text-gray-600 text-xs">—</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-3 sm:px-4 py-3.5">
                  <div v-if="deleteConfirm !== p.id" class="flex items-center gap-1 justify-end">
                    <button
                      class="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                      title="Edit"
                      @click="openEdit(p)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      class="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete"
                      @click="deleteConfirm = p.id"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div v-else class="flex items-center gap-1 justify-end">
                    <span class="text-xs text-red-400 hidden sm:inline mr-0.5">Delete?</span>
                    <button
                      class="px-2 py-1.5 text-xs font-medium bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                      @click="doDelete(p.id)"
                    >Yes</button>
                    <button
                      class="px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      @click="deleteConfirm = null"
                    >No</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ── Modal ──────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center sm:p-4 bg-black/70"
          @click.self="closeModal"
        >
          <div class="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-gray-900 sm:rounded-2xl border-0 sm:border border-gray-700 shadow-2xl flex flex-col">

            <!-- Modal header -->
            <div class="px-4 sm:px-6 py-4 border-b border-gray-800 shrink-0 flex items-center justify-between">
              <h2 class="font-semibold text-white">{{ editTarget ? 'Edit Subscription Plan' : 'New Subscription Plan' }}</h2>
              <button
                class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors sm:hidden"
                @click="closeModal"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Modal body -->
            <div class="px-4 sm:px-6 py-5 space-y-5 overflow-y-auto flex-1">

              <!-- Name -->
              <div>
                <label class="field-label">Name <span class="text-red-500">*</span></label>
                <input
                  v-model="form.name"
                  class="field-input"
                  placeholder="e.g. OPERATE STD VOICE AOS"
                  @keydown.enter.prevent
                />
              </div>

              <!-- Code -->
              <div>
                <label class="field-label">Code (identifier) <span class="text-red-500">*</span></label>
                <input
                  v-model="form.code"
                  class="field-input font-mono"
                  placeholder="e.g. PWM"
                  @keydown.enter.prevent
                />
                <p class="text-xs text-gray-600 mt-1">Saved in uppercase</p>
              </div>

              <!-- Skills -->
              <div>
                <label class="field-label">
                  Skills
                  <span class="text-gray-600 font-normal normal-case">— searched when using this plan</span>
                </label>

                <!-- Selected tags -->
                <div v-if="form.skills.length" class="flex flex-wrap gap-1 mb-2">
                  <span
                    v-for="sk in form.skills"
                    :key="sk"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-950 border border-blue-800 text-blue-300 text-xs"
                  >
                    {{ sk }}
                    <button type="button" class="hover:text-white leading-none" @click="toggleSkill(sk)">×</button>
                  </span>
                </div>

                <!-- Filter + checkbox list -->
                <input
                  v-model="skillFilter"
                  class="field-input mb-2"
                  placeholder="Filter skills…"
                />
                <div class="border border-gray-700 rounded-lg max-h-48 overflow-y-auto bg-gray-800/50">
                  <label
                    v-for="sk in filteredAllSkills"
                    :key="sk"
                    class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700/60 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      :checked="form.skills.includes(sk)"
                      class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1 cursor-pointer shrink-0"
                      @change="toggleSkill(sk)"
                    />
                    <span class="text-sm text-gray-200">{{ sk }}</span>
                  </label>
                  <p v-if="!filteredAllSkills.length" class="px-3 py-4 text-xs text-gray-500 text-center">No skills found</p>
                </div>
              </div>

              <!-- Derived products (read-only) -->
              <div v-if="derivedProducts.length">
                <label class="field-label">
                  Derived products
                  <span class="text-gray-600 font-normal normal-case">— from selected skills' materials</span>
                </label>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="prod in derivedProducts"
                    :key="prod"
                    class="px-1.5 py-0.5 rounded text-xs bg-gray-800 border border-gray-700 text-gray-400"
                  >{{ prod }}</span>
                </div>
              </div>
            </div>

            <!-- Modal footer -->
            <div class="px-4 sm:px-6 py-4 border-t border-gray-800 flex justify-end gap-3 shrink-0">
              <button
                class="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                @click="closeModal"
              >Cancel</button>
              <button
                class="px-5 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                :disabled="!form.name.trim() || !form.code.trim() || saving"
                @click="savePlan"
              >{{ saving ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth   = useAuthStore()
const router = useRouter()

interface PlanDto {
  id: string
  name: string
  code: string
  skills: string[]
}

interface SkillDto {
  id: string
  name: string
  relatedMaterials: string[]
}

// ── Data ────────────────────────────────────────────────────────────────────────

const { data, pending, refresh } = await useFetch<PlanDto[]>('/api/admin/contracts')
const plans = computed(() => data.value ?? [])

const { data: skillsData } = await useFetch<SkillDto[]>('/api/admin/skills')
const allSkills = computed(() => skillsData.value ?? [])

// ── Table filter ────────────────────────────────────────────────────────────────

const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.toLowerCase()
  return q
    ? plans.value.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    : plans.value
})

// ── Modal state ─────────────────────────────────────────────────────────────────

const showModal     = ref(false)
const editTarget    = ref<PlanDto | null>(null)
const saving        = ref(false)
const deleteConfirm = ref<string | null>(null)

const form = ref({ name: '', code: '', skills: [] as string[] })

// Skill checkbox list
const skillFilter       = ref('')
const filteredAllSkills = computed(() => {
  const q = skillFilter.value.toLowerCase()
  return allSkills.value.map(s => s.name).filter(n => n.toLowerCase().includes(q))
})

// Derived products
const derivedProducts = computed(() => {
  const selected = new Set(form.value.skills)
  const mats = allSkills.value
    .filter(s => selected.has(s.name))
    .flatMap(s => s.relatedMaterials)
  return Array.from(new Set(mats)).filter(Boolean).sort()
})

function toggleSkill(name: string) {
  const idx = form.value.skills.indexOf(name)
  if (idx === -1) { form.value.skills.push(name) }
  else { form.value.skills.splice(idx, 1) }
}

// ── Open / close modal ──────────────────────────────────────────────────────────

function openAdd() {
  editTarget.value = null
  form.value = { name: '', code: '', skills: [] }
  skillFilter.value = ''
  showModal.value = true
}

function openEdit(p: PlanDto) {
  editTarget.value = p
  form.value = { name: p.name, code: p.code, skills: [...p.skills] }
  skillFilter.value = ''
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  showModal.value = false
}

// ── CRUD ─────────────────────────────────────────────────────────────────────────

async function savePlan() {
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      code: form.value.code.trim(),
      skills: form.value.skills,
    }

    if (editTarget.value) {
      await $fetch(`/api/admin/contracts/${editTarget.value.id}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/contracts', { method: 'POST', body: payload })
    }

    await refresh()
    showModal.value = false
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? e?.data?.message ?? e.message ?? 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function doDelete(id: string) {
  try {
    await $fetch(`/api/admin/contracts/${id}`, { method: 'DELETE' })
    deleteConfirm.value = null
    await refresh()
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? e?.data?.message ?? e.message ?? 'Failed to delete')
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────────

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
@reference "tailwindcss";

.field-label {
  @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2;
}
.field-input {
  @apply w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white
         placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
         transition-colors;
}
</style>
