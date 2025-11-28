class MediaCarousel extends HTMLElement {
  constructor() {
    super()
    this.elements = {
      liveRegion: this.querySelector('[id^="CarouselStatus"]'), //- 播报当前图片位置
      viewer: this.querySelector('[id^="CarouselViewer"]'), //- 轮播
      thumbnails: this.querySelector('[id^="CarouselThumbnails"]') //- 缩略图
    }
    this.mql = window.matchMedia('(min-width: 767px)') //- mobile size

    this.currentActive = ''

    if (!this.elements.thumbnails) return
    this.elements.viewer.addEventListener('carouselSlideChanged', debounce(this.onSlideChanged.bind(this), 500))
    this.elements.thumbnails.querySelectorAll('[data-target]').forEach(mediaToSwitch => {
      mediaToSwitch
        .querySelector('button')
        .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false))
    })
  }

  //- 轮播图切换时，设置当前激活的图片
  onSlideChanged(event) {
    const thumbnail = this.elements.thumbnails.querySelector(
      `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
    )
    this.currentActive = `Slide-${event.detail.currentElement.dataset.mediaId}`
    this.setActiveThumbnail(thumbnail)
  }

  //- 设置当前激活的图片
  setActiveMedia(mediaId, prepend) {
    const activeMedia =
      this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
      this.elements.viewer.querySelector('[data-media-id]')
    console.log('setActiveMedia=====>', activeMedia)
    if (!activeMedia) {
      return
    }
    this.elements.viewer.querySelectorAll('[data-media-id]').forEach(element => {
      element.classList.remove('is-active')
    })
    activeMedia.classList.add('is-active')

    //* ? 如果 prepend 为 true，则将当前图片添加到父元素的第一个位置
    if (prepend) {
      activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia)

      if (this.elements.thumbnails) {
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`)
        activeThumbnail.parentElement.firstChild !== activeThumbnail &&
          activeThumbnail.parentElement.prepend(activeThumbnail)
      }

      if (this.elements.viewer.slider) this.elements.viewer.resetPages()
    }

    window.setTimeout(() => {
      //- 非移动端的情况下，将缩略图滑动到视口
      if (!this.mql.matches || this.elements.thumbnails) {
        activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft })
      }
      const activeMediaRect = activeMedia.getBoundingClientRect()
      //- 如果图片已经在视口，则不滚动
      if (activeMediaRect.top > -0.5) return
      const top = activeMediaRect.top + window.scrollY
      window.scrollTo({ top, behavior: 'smooth' })
    })
    this.playActiveMedia(activeMedia)

    if (!this.elements.thumbnails) return
    //- 设置当前激活的缩略图
    const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`)
    this.setActiveThumbnail(activeThumbnail)
    this.announceLiveRegion(activeThumbnail.dataset.mediaPosition)
  }

  //- 设置当前激活的缩略图
  setActiveThumbnail(thumbnail) {
    if (!this.elements.thumbnails || !thumbnail) return

    this.elements.thumbnails.querySelectorAll('button').forEach(element => element.removeAttribute('aria-current'))
    thumbnail.querySelector('button').setAttribute('aria-current', true)
    if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return

    this.elements.thumbnails.slider?.scrollTo({ left: thumbnail.offsetLeft, behavior: 'smooth' })
  }

  //- ARIA 播报当前图片位置
  announceLiveRegion(position) {
    this.elements.liveRegion.setAttribute('aria-hidden', false)
    this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position)
    setTimeout(() => {
      this.elements.liveRegion.setAttribute('aria-hidden', true)
    }, 2000)
  }

  playActiveMedia(activeItem) {
    window.pauseAllMedia()
    const deferredMedia = activeItem.querySelector('.deferred-media')
    if (deferredMedia) deferredMedia.loadContent(false)
  }
}

class CarouselComponent extends HTMLElement {
  constructor() {
    super()
    this.sliderWrapper = this.querySelector('[id^="Carousel-"]') //- wrapper
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]') //- items
    this.enableSliderLooping = false
    this.prevButton = this.querySelector('button[name="previous"]')
    this.nextButton = this.querySelector('button[name="next"]')

    if (!this.sliderWrapper || !this.nextButton) return

    this.initPages()
    const resizeObserver = new ResizeObserver(_ => this.initPages())
    resizeObserver.observe(this.sliderWrapper)

    this.sliderWrapper.addEventListener('scroll', this.update.bind(this))
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this))
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this))
  }

  //- 初始化轮播列表
  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0)
    //- 如果列表长度小于 2，则不进行初始化
    if (this.sliderItemsToShow.length < 2) return

    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft
    this.slidesPerPage = Math.floor(
      (this.sliderWrapper.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
    )
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1
    this.update()
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]')
    this.initPages()
  }

  update() {
    if (!this.sliderWrapper || !this.nextButton) return

    const previousPage = this.currentPage
    this.currentPage = Math.round(this.sliderWrapper.scrollLeft / this.sliderItemOffset) + 1
    console.log('this.currentPage=====>', this.currentPage)

    //- 触发轮播图切换事件
    if (this.currentPage !== previousPage) {
      this.dispatchEvent(
        new CustomEvent('carouselSlideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1]
          }
        })
      )
    }

    //- 如果启用轮播图循环，则不处理左右切换按钮状态
    if (this.enableSliderLooping) return

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.sliderWrapper.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled')
    } else {
      this.prevButton.removeAttribute('disabled')
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled')
    } else {
      this.nextButton.removeAttribute('disabled')
    }
  }

  //- 判断元素是否在视口内
  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.sliderWrapper.clientWidth + this.sliderWrapper.scrollLeft - offset
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.sliderWrapper.scrollLeft
    )
  }

  //- 左右切换按钮点击事件
  onButtonClick(event) {
    event.preventDefault()
    //- 一次切换步长
    const step = event.currentTarget.dataset.step || 1
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.sliderWrapper.scrollLeft + step * this.sliderItemOffset
        : this.sliderWrapper.scrollLeft - step * this.sliderItemOffset
    this.setSlidePosition(this.slideScrollPosition)
  }

  //- 设置轮播图位置
  setSlidePosition(left) {
    this.sliderWrapper.scrollTo({ left, behavior: 'smooth' })
  }
}

if (!customElements.get('media-carousel')) {
  customElements.define('media-carousel', MediaCarousel)
  customElements.define('carousel-component', CarouselComponent)
}
