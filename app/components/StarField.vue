<script setup lang="ts">
/*
 * Atmospheric starfield behind the page.
 *
 * - One canvas, three depth layers of small stars; slow drift, gentle twinkle
 *   on a minority of stars, a few warm/red tinted ones.
 * - Pointer parallax on fine-pointer devices only.
 * - prefers-reduced-motion: a single static frame, no animation loop.
 * - Pauses when the tab is hidden; ~30fps on coarse-pointer (touch) devices.
 * - Never catches input (pointer-events: none) and is aria-hidden.
 */
interface Star {
  x: number
  y: number
  r: number
  a: number
  layer: number
  twinkle: number // 0 = steady, else phase
  rate: number
  color: [number, number, number]
}

const LAYERS = [
  { depth: 0.25, size: [0.45, 0.95], alpha: [0.2, 0.45], drift: 0.35, share: 0.5 },
  { depth: 0.55, size: [0.75, 1.3], alpha: [0.35, 0.7], drift: 0.7, share: 0.3 },
  { depth: 1, size: [1.1, 1.9], alpha: [0.55, 0.95], drift: 1.1, share: 0.2 },
] as const

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const el = canvas.value
  const ctx = el?.getContext('2d', { alpha: true })
  if (!el || !ctx) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const frameInterval = finePointer.matches ? 0 : 1000 / 30

  let w = 0
  let h = 0
  let stars: Star[] = []
  let raf = 0
  let last = 0
  let paused = false
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

  const rand = (a: number, b: number) => a + Math.random() * (b - a)

  function build() {
    w = window.innerWidth
    h = window.innerHeight
    el!.width = Math.round(w * dpr)
    el!.height = Math.round(h * dpr)
    el!.style.width = `${w}px`
    el!.style.height = `${h}px`
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    const total = Math.round(Math.min(Math.max((w * h) / 4200, 60), 420))
    stars = []
    LAYERS.forEach((L, layer) => {
      const n = Math.round(total * L.share)
      for (let i = 0; i < n; i++) {
        const roll = Math.random()
        const color: [number, number, number] = roll < 0.04 ? [240, 92, 97] : roll < 0.1 ? [255, 236, 222] : [255, 255, 255]
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(L.size[0], L.size[1]),
          a: rand(L.alpha[0], L.alpha[1]),
          layer,
          twinkle: Math.random() < 0.18 ? Math.random() * Math.PI * 2 : 0,
          rate: rand(0.5, 1.3),
          color,
        })
      }
    })
  }

  function draw(t: number, dt: number) {
    ctx!.clearRect(0, 0, w, h)
    pointer.x += (pointer.tx - pointer.x) * 0.04
    pointer.y += (pointer.ty - pointer.y) * 0.04
    for (const s of stars) {
      const L = LAYERS[s.layer]!
      if (dt) {
        s.x += 1.2 * L.drift * dt
        s.y -= 2.2 * L.drift * dt
        if (s.x > w + 2) s.x = -2
        if (s.y < -2) s.y = h + 2
      }
      const alpha = s.twinkle ? s.a * (0.7 + 0.3 * Math.sin(t * s.rate + s.twinkle)) : s.a
      const px = s.x + pointer.x * 12 * L.depth
      const py = s.y + pointer.y * 8 * L.depth
      ctx!.beginPath()
      ctx!.arc(px, py, s.r, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${alpha.toFixed(3)})`
      ctx!.fill()
    }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    if (paused) return
    if (frameInterval && now - last < frameInterval) return
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
    last = now
    draw(now / 1000, dt)
  }

  function start() {
    cancelAnimationFrame(raf)
    last = 0
    if (reduceMotion.matches) {
      draw(0, 0)
      return
    }
    raf = requestAnimationFrame(loop)
  }

  let resizeTimer = 0
  const onResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      build()
      if (reduceMotion.matches) draw(0, 0)
    }, 150)
  }
  const onVisibility = () => {
    paused = document.visibilityState !== 'visible'
    if (!paused) last = 0
  }
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / w - 0.5) * 2
    pointer.ty = (e.clientY / h - 0.5) * 2
  }
  const onMotionChange = () => start()

  build()
  start()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  reduceMotion.addEventListener('change', onMotionChange)
  if (finePointer.matches) window.addEventListener('pointermove', onPointer, { passive: true })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
    reduceMotion.removeEventListener('change', onMotionChange)
    window.removeEventListener('pointermove', onPointer)
  })
})
</script>

<template>
  <canvas
    ref="canvas"
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-0 h-svh w-full"
    data-starfield
  />
</template>
