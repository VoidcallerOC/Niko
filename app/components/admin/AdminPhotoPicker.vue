<script setup lang="ts">
import type { PhotoRef } from '~~/server/utils/admin/types'

/**
 * Photos for a card. "Take photo" opens the phone camera directly
 * (capture="environment"); "Choose" opens the library. Uploads go straight to
 * /api/admin/uploads so a half-finished form never loses its photos.
 */
const props = defineProps<{ modelValue: PhotoRef[]; capture?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: PhotoRef[]] }>()
const { call } = useAdminApi()
const toast = useAdminToast()
const busy = ref(false)
const camera = ref<HTMLInputElement | null>(null)
const library = ref<HTMLInputElement | null>(null)

/**
 * Phone cameras produce 3–12 MB images. Shrink to 1600px on the long side as
 * JPEG before upload so the durable store stays small and uploads are quick on
 * show-floor data. Falls back to the original file if the browser can't decode it.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  busy.value = true
  try {
    const added: PhotoRef[] = []
    for (const file of files.slice(0, 6)) {
      const form = new FormData()
      const blob = await shrink(file)
      form.append('file', blob, blob === file ? file.name : file.name.replace(/\.[^.]+$/, '') + '.jpg')
      const res = await call<{ id: string; src: string }>('/api/admin/uploads', { body: form })
      if (res) added.push({ id: res.id, src: res.src, alt: '' })
    }
    emit('update:modelValue', [...props.modelValue, ...added])
    if (added.length) toast.saved(added.length === 1 ? 'Photo added' : `${added.length} photos added`)
  } finally {
    busy.value = false
  }
}
function remove(id: string) {
  emit('update:modelValue', props.modelValue.filter((p) => p.id !== id))
}
function makeFirst(id: string) {
  const p = props.modelValue.find((x) => x.id === id)
  if (p) emit('update:modelValue', [p, ...props.modelValue.filter((x) => x.id !== id)])
}
</script>

<template>
  <div>
    <ul v-if="modelValue.length" role="list" class="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      <li v-for="(p, i) in modelValue" :key="p.id" class="relative overflow-hidden rounded-md bg-nc-char">
        <img :src="p.src" :alt="p.alt || ''" class="aspect-[3/4] w-full object-cover">
        <span v-if="i === 0" class="absolute top-1 left-1 rounded-sm bg-nc-ink/85 px-1.5 py-0.5 text-[0.625rem] font-bold text-white uppercase">Main</span>
        <div class="absolute inset-x-0 bottom-0 grid grid-cols-2 bg-nc-ink/85 text-xs font-semibold">
          <button v-if="i !== 0" type="button" class="min-h-11 text-white/85 hover:bg-white/10" @click="makeFirst(p.id)">Main</button>
          <span v-else />
          <button type="button" class="min-h-11 text-nc-red-bright hover:bg-white/10" @click="remove(p.id)">Remove</button>
        </div>
      </li>
    </ul>
    <div class="grid grid-cols-2 gap-2">
      <AdminButton variant="white" size="lg" :busy="busy" @click="camera?.click()">
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        Take photo
      </AdminButton>
      <AdminButton variant="outline" size="lg" :busy="busy" @click="library?.click()">Choose photo</AdminButton>
    </div>
    <input ref="camera" type="file" accept="image/*" capture="environment" multiple class="sr-only" tabindex="-1" aria-hidden="true" @change="onFiles">
    <input ref="library" type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" tabindex="-1" aria-hidden="true" @change="onFiles">
    <p class="mt-2 text-xs text-white/50">Photos are resized on your phone before upload. The first photo is the one shown on the site.</p>
  </div>
</template>
