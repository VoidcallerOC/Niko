<script setup lang="ts">
/** Label + control with phone-sized hit area. Optional fields say so. */
const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string | number | null
    type?: 'text' | 'number' | 'url' | 'date' | 'email' | 'tel' | 'password' | 'textarea' | 'select'
    options?: readonly { value: string; label: string }[]
    placeholder?: string
    hint?: string
    optional?: boolean
    inputmode?: 'text' | 'decimal' | 'numeric' | 'url' | 'email' | 'tel'
    autocomplete?: string
    rows?: number
    prefix?: string
    list?: string
    /** Codes and keys: no auto-capitalising, autocorrect or spellcheck, so phones keep it exactly as typed. */
    verbatim?: boolean
  }>(),
  { type: 'text', options: () => [], placeholder: '', hint: '', optional: false, inputmode: undefined, autocomplete: 'off', rows: 3, prefix: '', list: undefined, verbatim: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const value = computed({
  get: () => (props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue)),
  set: (v: string) => emit('update:modelValue', v),
})
const base = 'w-full rounded-md border border-white/20 bg-nc-char px-3.5 text-base text-white placeholder:text-white/35 focus:border-nc-red focus:outline-none'
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-semibold text-white/85">
      <span>{{ label }}</span>
      <span v-if="optional" class="text-xs font-normal text-white/45">optional</span>
    </label>
    <textarea v-if="type === 'textarea'" :id="id" v-model="value" :rows="rows" :placeholder="placeholder" :class="[base, 'min-h-24 py-3 leading-relaxed']" />
    <select v-else-if="type === 'select'" :id="id" v-model="value" :class="[base, 'min-h-12']">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <div v-else class="relative">
      <span v-if="prefix" aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-white/60">{{ prefix }}</span>
      <input
        :id="id"
        v-model="value"
        :type="type"
        :inputmode="inputmode"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :list="list"
        :autocapitalize="verbatim ? 'none' : undefined"
        :autocorrect="verbatim ? 'off' : undefined"
        :spellcheck="verbatim ? false : undefined"
        :class="[base, 'min-h-12', prefix ? 'pl-8' : '', verbatim ? 'font-mono tracking-wide' : '']"
      >
    </div>
    <p v-if="hint" class="mt-1 text-xs text-white/50">{{ hint }}</p>
  </div>
</template>
