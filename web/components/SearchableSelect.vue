<template>
  <div ref="root" class="relative">
    <input
      ref="inputEl"
      v-model="query"
      type="text"
      :disabled="disabled"
      :placeholder="placeholder"
      class="w-full px-3 py-2 text-sm rounded-lg border bg-gray-800 text-gray-100 placeholder-gray-500 transition-colors focus:outline-none"
      :class="disabled
        ? 'border-gray-700 opacity-50 cursor-not-allowed'
        : 'border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-text'"
      autocomplete="off"
      @focus="openDropdown"
      @blur="scheduleClose"
      @keydown.down.prevent="moveDown"
      @keydown.up.prevent="moveUp"
      @keydown.enter.prevent="confirmHighlighted"
      @keydown.escape="close"
      @keydown.tab="close"
    />

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-75 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && filtered.length > 0"
        class="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden"
      >
        <ul
          ref="listEl"
          class="max-h-60 overflow-y-auto py-1"
          @mousedown.prevent
        >
          <li
            v-for="(item, idx) in filtered"
            :key="item"
            :class="[
              'px-3 py-1.5 text-sm cursor-pointer select-none truncate',
              idx === activeIdx
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            ]"
            @mouseover="activeIdx = idx"
            @click="select(item)"
          >
            {{ item }}
          </li>
        </ul>
        <div class="px-3 py-1.5 border-t border-gray-700 text-xs text-gray-500">
          {{ filtered.length }} result{{ filtered.length !== 1 ? 's' : '' }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const root    = ref<HTMLElement>()
const inputEl = ref<HTMLInputElement>()
const listEl  = ref<HTMLUListElement>()

const open      = ref(false)
const activeIdx = ref(-1)
const query     = ref(props.modelValue ?? '')

// Keep query in sync when parent changes modelValue externally
watch(() => props.modelValue, (val) => {
  if (val !== query.value) query.value = val ?? ''
})

const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return q
    ? props.options.filter(o => o.toLowerCase().includes(q))
    : props.options
})

function openDropdown() {
  if (!props.disabled) {
    open.value = true
    activeIdx.value = -1
  }
}

function close() {
  open.value = false
}

function scheduleClose() {
  setTimeout(close, 150)
}

function select(item: string) {
  query.value = item
  emit('update:modelValue', item)
  close()
}

function moveDown() {
  openDropdown()
  activeIdx.value = Math.min(activeIdx.value + 1, filtered.value.length - 1)
  scrollIntoView()
}

function moveUp() {
  activeIdx.value = Math.max(activeIdx.value - 1, 0)
  scrollIntoView()
}

function confirmHighlighted() {
  if (activeIdx.value >= 0 && filtered.value[activeIdx.value]) {
    select(filtered.value[activeIdx.value])
  } else if (filtered.value.length === 1) {
    select(filtered.value[0])
  }
}

function scrollIntoView() {
  nextTick(() => {
    const li = listEl.value?.children[activeIdx.value] as HTMLElement
    li?.scrollIntoView({ block: 'nearest' })
  })
}
</script>
