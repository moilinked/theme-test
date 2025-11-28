class SimpleCarousel extends HTMLElement {
  constructor() {
    super()
    this.track = null
    this.slides = []
    this.current = 1
    this.width = 0
  }

  connectedCallback() {
    this.track = this.querySelector('.track')
    if (!this.track) {
      const track = document.createElement('div')
      track.className = 'track'
      while (this.firstChild) track.appendChild(this.firstChild)
      this.appendChild(track)
      this.track = track
    }

    this.slides = Array.from(this.track.children)
    if (this.slides.length <= 1) return

    // 克隆首尾实现无限循环
    const firstClone = this.slides[0].cloneNode(true)
    const lastClone = this.slides[this.slides.length - 1].cloneNode(true)
    this.track.appendChild(firstClone)
    this.track.insertBefore(lastClone, this.slides[0])

    this.allSlides = Array.from(this.track.children)
    this.realCount = this.slides.length

    this.updateWidth()
    window.addEventListener('resize', () => this.updateWidth())

    this.bindDrag()
    requestAnimationFrame(() => this.goTo(this.current, false))
    this.track.addEventListener('transitionend', () => this.loopCheck())
  }

  updateWidth() {
    this.width = this.clientWidth
    this.allSlides.forEach(slide => (slide.style.width = `${this.width}px`))
    this.goTo(this.current, false)
  }

  goTo(index, animate = true) {
    if (!animate) this.track.classList.add('no-transition')
    this.track.style.transform = `translateX(-${this.width * index}px)`
    if (!animate) {
      this.track.offsetHeight // force reflow
      this.track.classList.remove('no-transition')
    }
  }

  loopCheck() {
    if (this.current === 0) this.current = this.realCount
    if (this.current === this.realCount + 1) this.current = 1
    this.goTo(this.current, false)
  }

  bindDrag() {
    let startX = 0
    let currentX = 0
    let dragging = false

    const start = x => {
      dragging = true
      startX = x
      this.track.classList.add('no-transition')
    }

    const move = x => {
      if (!dragging) return
      const delta = x - startX
      this.track.style.transform = `translateX(calc(-${this.width * this.current}px + ${delta}px))`
    }

    const end = () => {
      if (!dragging) return
      dragging = false
      this.track.classList.remove('no-transition')
      const delta = currentX - startX
      if (delta > 50) this.current--
      else if (delta < -50) this.current++
      this.goTo(this.current, true)
    }

    this.addEventListener('mousedown', e => start(e.clientX))
    window.addEventListener('mousemove', e => {
      currentX = e.clientX
      move(e.clientX)
    })
    window.addEventListener('mouseup', end)

    this.addEventListener('touchstart', e => start(e.touches[0].clientX))
    this.addEventListener('touchmove', e => {
      currentX = e.touches[0].clientX
      move(e.touches[0].clientX)
    })
    this.addEventListener('touchend', end)
  }
}

customElements.define('simple-carousel', SimpleCarousel)
