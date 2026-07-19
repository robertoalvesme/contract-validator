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
        <span class="text-xs font-medium text-white whitespace-nowrap py-0.5">Skills</span>
        <span class="text-gray-700 text-xs px-1">·</span>
        <NuxtLink
          to="/subscription-plans"
          class="text-xs text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap py-0.5"
        >
          Subscription Plans
        </NuxtLink>
      </div>
    </header>

    <!-- ── Content ────────────────────────────────────────────────────────── -->
    <main class="flex-1 px-4 sm:px-6 py-5 sm:py-6 max-w-6xl w-full mx-auto">

      <!-- Page header -->
      <div class="flex items-center justify-between mb-5 gap-3">
        <div class="min-w-0">
          <h1 class="text-base sm:text-lg font-semibold text-white">Skills &amp; Products</h1>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ skills.length }} skill{{ skills.length !== 1 ? 's' : '' }} registered
          </p>
        </div>
        <button
          class="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          @click="openAdd"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden xs:inline">Add </span>Skill
        </button>
      </div>

      <!-- Filter -->
      <div class="mb-4">
        <input
          v-model="filter"
          type="text"
          placeholder="Filter by name…"
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
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Skill</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Related Skills</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Materials (keywords)</th>
                <th class="px-4 py-3 w-20 sm:w-24"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              <tr v-if="filtered.length === 0">
                <td colspan="4" class="px-4 py-10 text-center text-gray-500 text-sm">No skills found</td>
              </tr>
              <tr
                v-for="s in filtered"
                :key="s.id"
                class="transition-colors"
                :class="deleteConfirm === s.id ? 'bg-red-950/40' : 'hover:bg-gray-900/60'"
              >
                <!-- Name -->
                <td class="px-4 py-3.5 font-medium text-gray-100">
                  <div>{{ s.name }}</div>
                  <!-- Materials visible only on mobile (collapsed into name cell) -->
                  <div class="md:hidden flex flex-wrap gap-1 mt-1.5">
                    <span
                      v-for="m in s.relatedMaterials.slice(0, 4)"
                      :key="m"
                      class="px-1.5 py-0.5 rounded text-xs bg-gray-800 border border-gray-700 text-gray-400"
                    >{{ m }}</span>
                    <span v-if="s.relatedMaterials.length > 4" class="text-xs text-gray-600">
                      +{{ s.relatedMaterials.length - 4 }} more
                    </span>
                    <span v-if="!s.relatedMaterials.length" class="text-gray-600 text-xs">No materials</span>
                  </div>
                </td>

                <!-- Related skills (desktop) -->
                <td class="px-4 py-3.5 hidden lg:table-cell">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="rs in s.relatedSkills"
                      :key="rs"
                      class="px-1.5 py-0.5 rounded text-xs bg-blue-950 border border-blue-900 text-blue-300"
                    >{{ rs }}</span>
                    <span v-if="!s.relatedSkills.length" class="text-gray-600 text-xs">—</span>
                  </div>
                </td>

                <!-- Materials (tablet+) -->
                <td class="px-4 py-3.5 hidden md:table-cell">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="m in s.relatedMaterials"
                      :key="m"
                      class="px-1.5 py-0.5 rounded text-xs bg-gray-800 border border-gray-700 text-gray-300"
                    >{{ m }}</span>
                    <span v-if="!s.relatedMaterials.length" class="text-gray-600 text-xs">—</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-3 sm:px-4 py-3.5">
                  <div v-if="deleteConfirm !== s.id" class="flex items-center gap-1 justify-end">
                    <button
                      class="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                      title="Edit"
                      @click="openEdit(s)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      class="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete"
                      @click="deleteConfirm = s.id"
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
                      @click="doDelete(s.id)"
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
              <h2 class="font-semibold text-white">{{ editTarget ? 'Edit Skill' : 'New Skill' }}</h2>
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
                  placeholder="Skill name (e.g. Gateways)"
                  @keydown.enter.prevent
                />
              </div>

              <!-- Related Skills -->
              <div>
                <label class="field-label">
                  Related Skills
                  <span class="text-gray-600 font-normal normal-case">— also searched when this skill is selected</span>
                </label>

                <div v-if="form.relatedSkills.length" class="flex flex-wrap gap-1 mb-2">
                  <span
                    v-for="rs in form.relatedSkills"
                    :key="rs"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-950 border border-blue-800 text-blue-300 text-xs"
                  >
                    {{ rs }}
                    <button type="button" class="hover:text-white leading-none" @click="removeRelatedSkill(rs)">×</button>
                  </span>
                </div>

                <div class="relative">
                  <input
                    v-model="skillSearch"
                    class="field-input"
                    placeholder="Search skill to add…"
                    @focus="showSkillDrop = true"
                    @blur="scheduleCloseSkillDrop"
                  />
                  <div
                    v-if="showSkillDrop && filteredSkillOpts.length"
                    class="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg max-h-44 overflow-y-auto shadow-xl"
                  >
                    <div
                      v-for="opt in filteredSkillOpts"
                      :key="opt"
                      class="px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                      @mousedown.prevent="addRelatedSkill(opt)"
                    >{{ opt }}</div>
                  </div>
                </div>
              </div>

              <!-- Materials -->
              <div>
                <label class="field-label">
                  Materials
                  <span class="text-gray-600 font-normal normal-case">— keywords used in product search</span>
                </label>

                <div
                  class="flex flex-wrap gap-1 p-2 border border-gray-700 rounded-lg bg-gray-800 cursor-text focus-within:border-blue-500 transition-colors min-h-[2.75rem]"
                  @click="materialInputEl?.focus()"
                >
                  <span
                    v-for="m in form.relatedMaterials"
                    :key="m"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700 border border-gray-600 text-gray-300 text-xs"
                  >
                    {{ m }}
                    <button type="button" class="hover:text-white leading-none" @click.stop="removeMaterial(m)">×</button>
                  </span>
                  <input
                    ref="materialInputEl"
                    v-model="materialInput"
                    class="flex-1 min-w-28 bg-transparent outline-none text-sm text-white placeholder-gray-500 py-0.5"
                    placeholder="Type and press Enter…"
                    @keydown.enter.prevent="addMaterial"
                    @keydown="handleMaterialComma"
                    @blur="addMaterial"
                  />
                </div>
                <p class="text-xs text-gray-600 mt-1">Press Enter or comma to add</p>
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
                :disabled="!form.name.trim() || saving"
                @click="saveSkill"
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

interface SkillDto {
  id: string
  name: string
  relatedSkills: string[]
  relatedMaterials: string[]
}

// ── Data ────────────────────────────────────────────────────────────────────────

const { data, pending, refresh } = await useFetch<SkillDto[]>('/api/admin/skills')
const skills = computed(() => data.value ?? [])

// ── Table filter ────────────────────────────────────────────────────────────────

const filter = ref('')
const filtered = computed(() => {
  const q = filter.value.toLowerCase()
  return q ? skills.value.filter(s => s.name.toLowerCase().includes(q)) : skills.value
})

// ── Modal state ─────────────────────────────────────────────────────────────────

const showModal     = ref(false)
const editTarget    = ref<SkillDto | null>(null)
const saving        = ref(false)
const deleteConfirm = ref<string | null>(null)

const form = ref({ name: '', relatedSkills: [] as string[], relatedMaterials: [] as string[] })

// Related-skills search dropdown
const skillSearch       = ref('')
const showSkillDrop     = ref(false)
const filteredSkillOpts = computed(() => {
  const q = skillSearch.value.toLowerCase()
  return skills.value
    .map(s => s.name)
    .filter(n => n !== form.value.name && !form.value.relatedSkills.includes(n) && n.toLowerCase().includes(q))
    .slice(0, 20)
})

function scheduleCloseSkillDrop() { setTimeout(() => { showSkillDrop.value = false }, 150) }

function addRelatedSkill(name: string) {
  if (!form.value.relatedSkills.includes(name)) form.value.relatedSkills.push(name)
  skillSearch.value  = ''
  showSkillDrop.value = false
}

function removeRelatedSkill(name: string) {
  form.value.relatedSkills = form.value.relatedSkills.filter(s => s !== name)
}

// Materials tag input
const materialInput   = ref('')
const materialInputEl = ref<HTMLInputElement | null>(null)

function addMaterial() {
  const val = materialInput.value.trim().replace(/,+$/, '')
  if (val && !form.value.relatedMaterials.includes(val)) form.value.relatedMaterials.push(val)
  materialInput.value = ''
}

function handleMaterialComma(e: KeyboardEvent) {
  if (e.key === ',') { e.preventDefault(); addMaterial() }
}

function removeMaterial(m: string) {
  form.value.relatedMaterials = form.value.relatedMaterials.filter(x => x !== m)
}

// ── Open / close modal ──────────────────────────────────────────────────────────

function openAdd() {
  editTarget.value = null
  form.value = { name: '', relatedSkills: [], relatedMaterials: [] }
  skillSearch.value   = ''
  materialInput.value = ''
  showModal.value = true
}

function openEdit(s: SkillDto) {
  editTarget.value = s
  form.value = { name: s.name, relatedSkills: [...s.relatedSkills], relatedMaterials: [...s.relatedMaterials] }
  skillSearch.value   = ''
  materialInput.value = ''
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  showModal.value = false
}

// ── CRUD ─────────────────────────────────────────────────────────────────────────

async function saveSkill() {
  const pending = materialInput.value.trim()
  if (pending) { materialInput.value = ''; addMaterial() }

  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      relatedSkills: form.value.relatedSkills,
      relatedMaterials: form.value.relatedMaterials,
    }

    if (editTarget.value) {
      await $fetch(`/api/admin/skills/${editTarget.value.id}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/admin/skills', { method: 'POST', body: payload })
    }

    await refresh()
    showModal.value = false
  } catch (e: any) {
    alert(e?.data?.message ?? e.message ?? 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function doDelete(id: string) {
  try {
    await $fetch(`/api/admin/skills/${id}`, { method: 'DELETE' })
    deleteConfirm.value = null
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message ?? e.message ?? 'Failed to delete')
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
