<script setup lang="ts">
/**
 * Native <dialog> confirmation for destructive or bulk changes. Infinite
 * Heroes uses window.confirm for deletes; this does the same job with the
 * details visible and a cancel that is as big as the confirm.
 */
const props = withDefaults(
  defineProps<{ open: boolean; title: string; confirmLabel?: string; danger?: boolean; busy?: boolean }>(),
  { confirmLabel: 'Confirm', danger: false, busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const d = dialog.value
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  },
  { flush: 'post' },
)
onMounted(() => {
  if (props.open) dialog.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(92vw,28rem)] rounded-lg border border-white/15 bg-nc-coal p-0 text-white backdrop:bg-black/70"
    @cancel.prevent="emit('cancel')"
    @close="emit('cancel')"
  >
    <form method="dialog" class="p-5 sm:p-6" @submit.prevent="emit('confirm')">
      <h2 class="font-display text-2xl font-bold">{{ title }}</h2>
      <div class="mt-3 text-[0.9375rem] text-white/80"><slot /></div>
      <div class="mt-6 grid grid-cols-2 gap-3">
        <AdminButton variant="outline" size="lg" @click="emit('cancel')">Cancel</AdminButton>
        <AdminButton :variant="danger ? 'red' : 'white'" size="lg" type="submit" :busy="busy">{{ confirmLabel }}</AdminButton>
      </div>
    </form>
  </dialog>
</template>
