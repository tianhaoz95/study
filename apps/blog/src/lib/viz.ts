const WORDS = [
  'attention', 'diffusion', 'speculate', 'distill',
  'transform', 'gradient', 'quantize', 'softmax',
  'token',     'latent',   'denoise',   'logits',
  'embed',     'sparse',   'sample',    'forward',
]

export function initViz() {
  const container = document.getElementById('hero-viz')
  if (!container) return

  container.innerHTML = `
    <div class="viz-panel">
      <div class="viz-header">
        <span class="viz-label">diffusion.unmask()</span>
        <span class="viz-step" id="viz-step">0 / ${WORDS.length}</span>
      </div>
      <div class="viz-grid" id="viz-grid">${
        WORDS.map(w => `
          <div class="viz-token">
            <span class="viz-mask"></span>
            <span class="viz-word">${w}</span>
          </div>`).join('')
      }</div>
      <div class="viz-footer">
        <div class="viz-progress"><div class="viz-fill" id="viz-fill"></div></div>
      </div>
    </div>
  `

  const tokenEls = [...container.querySelectorAll<HTMLElement>('.viz-token')]
  const stepEl   = container.querySelector<HTMLElement>('#viz-step')!
  const fillEl   = container.querySelector<HTMLElement>('#viz-fill')!
  let timer: ReturnType<typeof setTimeout>

  function runCycle() {
    tokenEls.forEach(el => el.classList.remove('revealed', 'flash'))
    stepEl.textContent = `0 / ${WORDS.length}`
    fillEl.style.width = '0%'

    const order = tokenEls.map((_, i) => i).sort(() => Math.random() - 0.5)

    order.forEach((idx, step) => {
      setTimeout(() => {
        const el = tokenEls[idx]
        el.classList.add('revealed', 'flash')
        const n = step + 1
        stepEl.textContent = `${n} / ${WORDS.length}`
        fillEl.style.width = `${(n / WORDS.length) * 100}%`
      }, step * 170)
    })

    timer = setTimeout(runCycle, WORDS.length * 170 + 2200)
  }

  timer = setTimeout(runCycle, 700)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer)
    else runCycle()
  })
}
