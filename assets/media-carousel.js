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
    
    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      // 使用 requestAnimationFrame 确保在布局更新后重新计算
      requestAnimationFrame(() => this.initPages())
    })
    resizeObserver.observe(this.sliderWrapper)
    
    // 监听窗口大小变化（处理方向改变等情况）
    this.handleResize = debounce(() => {
      requestAnimationFrame(() => this.initPages())
    }, 250)
    window.addEventListener('resize', this.handleResize)

    // 绑定事件处理函数，保存引用以便后续清理
    this.boundUpdate = this.update.bind(this)
    this.boundOnButtonClick = this.onButtonClick.bind(this)
    
    this.sliderWrapper.addEventListener('scroll', this.boundUpdate)
    this.prevButton.addEventListener('click', this.boundOnButtonClick)
    this.nextButton.addEventListener('click', this.boundOnButtonClick)
  }

  // 清理函数，在组件销毁时调用
  disconnectedCallback() {
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize)
    }
    if (this.sliderWrapper && this.boundUpdate) {
      this.sliderWrapper.removeEventListener('scroll', this.boundUpdate)
    }
    if (this.prevButton && this.boundOnButtonClick) {
      this.prevButton.removeEventListener('click', this.boundOnButtonClick)
    }
    if (this.nextButton && this.boundOnButtonClick) {
      this.nextButton.removeEventListener('click', this.boundOnButtonClick)
    }
  }

  //- 初始化轮播列表
  initPages() {
    // 重新获取所有项目，确保获取最新的DOM状态
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]')
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0)
    
    //- 如果列表长度小于 1，则不进行初始化
    if (this.sliderItemsToShow.length < 1) {
      // 如果只有一个项目，禁用导航按钮
      if (this.prevButton) this.prevButton.setAttribute('disabled', 'disabled')
      if (this.nextButton) this.nextButton.setAttribute('disabled', 'disabled')
      return
    }

    // 如果只有一个项目，禁用导航按钮
    if (this.sliderItemsToShow.length === 1) {
      if (this.prevButton) this.prevButton.setAttribute('disabled', 'disabled')
      if (this.nextButton) this.nextButton.setAttribute('disabled', 'disabled')
      return
    }

    // 计算每个项目的实际宽度（包括margin等）
    const firstItem = this.sliderItemsToShow[0]
    const secondItem = this.sliderItemsToShow[1]
    
    // 获取第一个项目的实际宽度（包括margin）
    const firstItemRect = firstItem.getBoundingClientRect()
    const secondItemRect = secondItem.getBoundingClientRect()
    
    // 计算项目之间的偏移量（包括间距）
    this.sliderItemOffset = secondItemRect.left - firstItemRect.left || firstItem.offsetWidth
    
    // 如果偏移量为0，使用项目宽度作为默认值
    if (this.sliderItemOffset <= 0) {
      this.sliderItemOffset = firstItem.offsetWidth || firstItemRect.width
    }

    // 计算每页可以显示的项目数量
    const containerWidth = this.sliderWrapper.clientWidth
    const firstItemLeft = firstItem.offsetLeft
    
    // 计算可见区域可以容纳多少个完整项目
    this.slidesPerPage = Math.max(1, Math.floor(
      (containerWidth - firstItemLeft) / this.sliderItemOffset
    ))
    
    // 计算总页数
    this.totalPages = Math.max(1, this.sliderItemsToShow.length - this.slidesPerPage + 1)
    
    // 更新按钮状态
    this.update()
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]')
    this.initPages()
  }

  update() {
    if (!this.sliderWrapper || !this.nextButton || !this.sliderItemOffset) return

    const previousPage = this.currentPage
    const scrollLeft = this.sliderWrapper.scrollLeft
    
    // 计算当前页（基于滚动位置和项目偏移量）
    // 添加一个小偏移量以避免边界问题
    this.currentPage = Math.max(1, Math.round(scrollLeft / this.sliderItemOffset) + 1)
    
    // 确保当前页不超过总页数
    if (this.totalPages && this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }

    //- 触发轮播图切换事件
    if (this.currentPage !== previousPage && this.sliderItemsToShow && this.sliderItemsToShow.length > 0) {
      const currentIndex = Math.min(this.currentPage - 1, this.sliderItemsToShow.length - 1)
      const currentElement = this.sliderItemsToShow[currentIndex]
      
      if (currentElement) {
        this.dispatchEvent(
          new CustomEvent('carouselSlideChanged', {
            detail: {
              currentPage: this.currentPage,
              currentElement: currentElement
            }
          })
        )
      }
    }

    //- 如果启用轮播图循环，则不处理左右切换按钮状态
    if (this.enableSliderLooping) return

    // 更新按钮状态
    if (this.sliderItemsToShow && this.sliderItemsToShow.length > 0) {
      const isAtStart = scrollLeft <= 0 || (this.isSlideVisible(this.sliderItemsToShow[0]) && scrollLeft === 0)
      const isAtEnd = this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])
      
      if (this.prevButton) {
        if (isAtStart) {
          this.prevButton.setAttribute('disabled', 'disabled')
        } else {
          this.prevButton.removeAttribute('disabled')
        }
      }
      
      if (this.nextButton) {
        if (isAtEnd) {
          this.nextButton.setAttribute('disabled', 'disabled')
        } else {
          this.nextButton.removeAttribute('disabled')
        }
      }
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
