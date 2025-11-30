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
    this.enableSliderLooping = true
    this.prevButton = this.querySelector('button[name="previous"]')
    this.nextButton = this.querySelector('button[name="next"]')

    if (!this.sliderWrapper || !this.nextButton) return

    this.initPages()
    
    //- 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      //- 使用 requestAnimationFrame 确保在布局更新后重新计算
      requestAnimationFrame(() => this.initPages())
    })
    resizeObserver.observe(this.sliderWrapper)
    
    //- 监听窗口大小变化（处理方向改变等情况）
    this.handleResize = debounce(() => {
      requestAnimationFrame(() => this.initPages())
    }, 250)
    window.addEventListener('resize', this.handleResize)

    //- 绑定事件处理函数，保存引用以便后续清理
    this.boundUpdate = this.update.bind(this)
    this.boundOnButtonClick = this.onButtonClick.bind(this)
    
    this.sliderWrapper.addEventListener('scroll', this.boundUpdate)
    this.prevButton.addEventListener('click', this.boundOnButtonClick)
    this.nextButton.addEventListener('click', this.boundOnButtonClick)
  }

  //- 清理函数，在组件销毁时调用
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
    this.removeClones()
    
    //- 重新获取所有项目，确保获取最新的DOM状态
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]')
    //- 过滤掉克隆节点，只保留真实项目
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => 
      element.clientWidth > 0 && !element.hasAttribute('data-clone')
    )
    
    //- 如果列表长度小于 1，则不进行初始化
    if (this.sliderItemsToShow.length < 1) {
      //- 如果只有一个项目，禁用导航按钮
      if (this.prevButton) this.prevButton.setAttribute('disabled', 'disabled')
      if (this.nextButton) this.nextButton.setAttribute('disabled', 'disabled')
      return
    }

    //- 如果启用循环且项目数量大于1，设置无限循环
    if (this.enableSliderLooping && this.sliderItemsToShow.length > 1) {
      this.setupInfiniteLoop()
      //- 重新获取所有项目（包括新创建的克隆节点）
      this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]')
    }

    //- 计算每个项目的实际宽度（包括margin等）
    const firstItem = this.sliderItemsToShow[0]
    const secondItem = this.sliderItemsToShow[1] || firstItem
    
    //- 获取第一个项目的实际宽度（包括margin）
    const firstItemRect = firstItem.getBoundingClientRect()
    const secondItemRect = secondItem.getBoundingClientRect()
    
    //- 计算项目之间的偏移量（包括间距）
    this.sliderItemOffset = secondItemRect.left - firstItemRect.left || firstItem.offsetWidth
    
    //- 如果偏移量为0，使用项目宽度作为默认值
    if (this.sliderItemOffset <= 0) {
      this.sliderItemOffset = firstItem.offsetWidth || firstItemRect.width
    }

    //- 计算每页可以显示的项目数量
    const containerWidth = this.sliderWrapper.clientWidth
    const firstItemLeft = firstItem.offsetLeft
    
    //- 计算可见区域可以容纳多少个完整项目
    this.slidesPerPage = Math.max(1, Math.floor(
      (containerWidth - firstItemLeft) / this.sliderItemOffset
    ))
    
    //- 计算总页数
    this.totalPages = Math.max(1, this.sliderItemsToShow.length - this.slidesPerPage + 1)
    
    //- 如果启用循环，初始化时滚动到第一个真实项目
    if (this.enableSliderLooping && this.sliderItemsToShow.length > 1 && this.firstRealItem) {
      // 等待DOM更新后滚动到第一个真实项目
      requestAnimationFrame(() => {
        // 确保克隆节点已经渲染完成
        if (this.firstRealItem && this.firstRealItem.offsetLeft > 0) {
          this.sliderWrapper.scrollTo({ left: this.firstRealItem.offsetLeft, behavior: 'auto' })
        }
      })
    }
    
    //- 更新按钮状态
    this.update()
  }

  //- 设置无限循环：克隆首尾项目
  setupInfiniteLoop() {
    //- 移除已存在的克隆节点
    this.removeClones()
    
    if (this.sliderItemsToShow.length < 2) return
    
    const firstItem = this.sliderItemsToShow[0]
    const lastItem = this.sliderItemsToShow[this.sliderItemsToShow.length - 1]
    
    //- 克隆最后一个项目并插入到开头
    this.lastClone = lastItem.cloneNode(true)
    this.lastClone.setAttribute('data-clone', 'last')
    this.lastClone.setAttribute('aria-hidden', 'true') // 隐藏克隆节点，避免重复内容
    this.sliderWrapper.insertBefore(this.lastClone, firstItem)
    
    //- 克隆第一个项目并追加到末尾
    this.firstClone = firstItem.cloneNode(true)
    this.firstClone.setAttribute('data-clone', 'first')
    this.firstClone.setAttribute('aria-hidden', 'true') // 隐藏克隆节点，避免重复内容
    this.sliderWrapper.appendChild(this.firstClone)
    
    //- 保存第一个真实项目的引用
    this.firstRealItem = firstItem
    this.lastRealItem = lastItem
    
    //- 重置跳转标志
    this.isJumping = false
  }

  //- 移除克隆节点
  removeClones() {
    const clones = this.sliderWrapper.querySelectorAll('[data-clone]')
    clones.forEach(clone => clone.remove())
    this.lastClone = null
    this.firstClone = null
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]')
    this.initPages()
  }

  update() {
    if (!this.sliderWrapper || !this.nextButton || !this.sliderItemOffset) return

    const previousPage = this.currentPage
    const scrollLeft = this.sliderWrapper.scrollLeft
    
    //- 如果启用循环，检查是否需要跳转到真实节点
    if (this.enableSliderLooping && this.sliderItemsToShow.length > 1) {
      this.handleInfiniteLoop(scrollLeft)
    }
    
    // 计算当前页（基于滚动位置和项目偏移量）
    // 添加一个小偏移量以避免边界问题
    this.currentPage = Math.max(1, Math.round(scrollLeft / this.sliderItemOffset) + 1)
    
    // 确保当前页不超过总页数
    if (this.totalPages && this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages
    }

    //- 获取当前可见的真实项目
    let currentElement = null
    if (this.sliderItemsToShow && this.sliderItemsToShow.length > 0) {
      const currentScrollLeft = this.sliderWrapper.scrollLeft
      let minDistance = Infinity
      let closestIndex = 0
      
      //- 找到距离当前滚动位置最近的真实项目
      for (let i = 0; i < this.sliderItemsToShow.length; i++) {
        const item = this.sliderItemsToShow[i]
        const itemLeft = item.offsetLeft
        const itemCenter = itemLeft + item.offsetWidth / 2
        const distance = Math.abs(currentScrollLeft + this.sliderWrapper.clientWidth / 2 - itemCenter)
        
        if (distance < minDistance) {
          minDistance = distance
          closestIndex = i
          currentElement = item
        }
      }
      
      //- 如果启用循环，还需要检查克隆节点
      if (this.enableSliderLooping && this.firstClone && this.lastClone) {
        //- 检查是否更接近第一个克隆节点（对应最后一个真实项目）
        const firstCloneCenter = this.firstClone.offsetLeft + this.firstClone.offsetWidth / 2
        const firstCloneDistance = Math.abs(currentScrollLeft + this.sliderWrapper.clientWidth / 2 - firstCloneCenter)
        if (firstCloneDistance < minDistance && this.lastRealItem) {
          currentElement = this.lastRealItem
          closestIndex = this.sliderItemsToShow.length - 1
        }
        
        //- 检查是否更接近最后一个克隆节点（对应第一个真实项目）
        const lastCloneCenter = this.lastClone.offsetLeft + this.lastClone.offsetWidth / 2
        const lastCloneDistance = Math.abs(currentScrollLeft + this.sliderWrapper.clientWidth / 2 - lastCloneCenter)
        if (lastCloneDistance < minDistance && this.firstRealItem) {
          currentElement = this.firstRealItem
          closestIndex = 0
        }
      }
      
      this.currentPage = closestIndex + 1
    }

    //- 触发轮播图切换事件
    if (this.currentPage !== previousPage && currentElement) {
      this.dispatchEvent(
        new CustomEvent('carouselSlideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: currentElement
          }
        })
      )
    }

    //- 如果启用循环，按钮始终可用
    if (this.enableSliderLooping && this.sliderItemsToShow.length > 1) {
      if (this.prevButton) this.prevButton.removeAttribute('disabled')
      if (this.nextButton) this.nextButton.removeAttribute('disabled')
      return
    }

    // 更新按钮状态（非循环模式）
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

  //- 处理无限循环：当滚动到克隆节点时，无缝跳转到真实节点
  handleInfiniteLoop(scrollLeft) {
    if (!this.firstRealItem || !this.lastRealItem || !this.firstClone || !this.lastClone) return
    
    //- 防止重复跳转
    if (this.isJumping) return
    
    const firstRealLeft = this.firstRealItem.offsetLeft
    const lastRealLeft = this.lastRealItem.offsetLeft
    const firstCloneLeft = this.firstClone.offsetLeft
    const lastCloneLeft = this.lastClone.offsetLeft
    const lastCloneRight = lastCloneLeft + this.lastClone.offsetWidth
    
    //- 如果滚动到了最后一个克隆节点（末尾），跳转到第一个真实项目
    if (scrollLeft >= firstCloneLeft - this.sliderItemOffset / 2) {
      this.isJumping = true
      // 使用 requestAnimationFrame 确保在滚动动画完成后跳转
      requestAnimationFrame(() => {
        this.sliderWrapper.scrollTo({ 
          left: firstRealLeft, 
          behavior: 'auto' // 使用 auto 避免动画，实现无缝跳转
        })
        // 短暂延迟后重置标志，避免重复触发
        setTimeout(() => {
          this.isJumping = false
        }, 50)
      })
    }
    //- 如果滚动到了第一个克隆节点（开头），跳转到最后一个真实项目
    else if (scrollLeft <= lastCloneRight + this.sliderItemOffset / 2) {
      this.isJumping = true
      requestAnimationFrame(() => {
        this.sliderWrapper.scrollTo({ 
          left: lastRealLeft, 
          behavior: 'auto' // 使用 auto 避免动画，实现无缝跳转
        })
        // 短暂延迟后重置标志，避免重复触发
        setTimeout(() => {
          this.isJumping = false
        }, 50)
      })
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
    
    //- 如果启用循环，使用循环滚动逻辑
    if (this.enableSliderLooping && this.sliderItemsToShow && this.sliderItemsToShow.length > 1) {
      this.handleLoopButtonClick(event)
      return
    }
    
    //- 一次切换步长
    const step = event.currentTarget.dataset.step || 1
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.sliderWrapper.scrollLeft + step * this.sliderItemOffset
        : this.sliderWrapper.scrollLeft - step * this.sliderItemOffset
    this.setSlidePosition(this.slideScrollPosition)
  }

  //- 处理循环模式下的按钮点击
  handleLoopButtonClick(event) {
    if (!this.firstRealItem || !this.lastRealItem) return
    
    const currentScrollLeft = this.sliderWrapper.scrollLeft
    const step = event.currentTarget.dataset.step || 1
    const isNext = event.currentTarget.name === 'next'
    
    //- 找到当前最接近的真实项目
    let currentIndex = 0
    let minDistance = Infinity
    
    for (let i = 0; i < this.sliderItemsToShow.length; i++) {
      const item = this.sliderItemsToShow[i]
      const distance = Math.abs(item.offsetLeft - currentScrollLeft)
      if (distance < minDistance) {
        minDistance = distance
        currentIndex = i
      }
    }
    
    //- 计算下一个目标索引
    let targetIndex
    if (isNext) {
      targetIndex = (currentIndex + step) % this.sliderItemsToShow.length
    } else {
      targetIndex = (currentIndex - step + this.sliderItemsToShow.length) % this.sliderItemsToShow.length
    }
    
    //- 滚动到目标项目
    const targetItem = this.sliderItemsToShow[targetIndex]
    if (targetItem) {
      this.setSlidePosition(targetItem.offsetLeft)
    }
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
