class MediaCarousel extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      liveRegion: this.querySelector('[id^="CarouselStatus"]'), //- 播报当前图片位置
      viewer: this.querySelector('[id^="CarouselViewer"]'), //- 轮播
      thumbnails: this.querySelector('[id^="CarouselThumbnails"]'), //- 缩略图
    };
    this.mql = window.matchMedia("(min-width: 767px)"); //- mobile size

    this.currentActive = "";

    if (!this.elements.thumbnails) return;
    this.elements.viewer.addEventListener(
      "carouselSlideChanged",
      debounce(this.onSlideChanged.bind(this), 500)
    );
    this.elements.thumbnails
      .querySelectorAll("[data-target]")
      .forEach((mediaToSwitch) => {
        mediaToSwitch
          .querySelector("button")
          .addEventListener(
            "click",
            this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false)
          );
      });
  }

  //- 轮播图切换时，设置当前激活的图片
  onSlideChanged(event) {
    const thumbnail = this.elements.thumbnails.querySelector(
      `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
    );
    this.currentActive = `Slide-${event.detail.currentElement.dataset.mediaId}`;
    this.setActiveThumbnail(thumbnail);
  }

  //- 设置当前激活的图片
  setActiveMedia(mediaId, prepend) {
    const activeMedia =
      this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
      this.elements.viewer.querySelector("[data-media-id]");
    console.log("setActiveMedia=====>", activeMedia);
    if (!activeMedia) {
      return;
    }
    this.elements.viewer
      .querySelectorAll("[data-media-id]")
      .forEach((element) => {
        element.classList.remove("is-active");
      });
    activeMedia.classList.add("is-active");

    //* ? 如果 prepend 为 true，则将当前图片添加到父元素的第一个位置
    if (prepend) {
      activeMedia.parentElement.firstChild !== activeMedia &&
        activeMedia.parentElement.prepend(activeMedia);

      if (this.elements.thumbnails) {
        const activeThumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${mediaId}"]`
        );
        activeThumbnail.parentElement.firstChild !== activeThumbnail &&
          activeThumbnail.parentElement.prepend(activeThumbnail);
      }

      if (this.elements.viewer.slider) this.elements.viewer.resetPages();
    }

    window.setTimeout(() => {
      //- 非移动端的情况下，将缩略图滑动到视口
      if (!this.mql.matches || this.elements.thumbnails) {
        activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
      }
      const activeMediaRect = activeMedia.getBoundingClientRect();
      //- 如果图片已经在视口，则不滚动
      if (activeMediaRect.top > -0.5) return;
      const top = activeMediaRect.top + window.scrollY;
      window.scrollTo({ top, behavior: "smooth" });
    });
    this.playActiveMedia(activeMedia);

    if (!this.elements.thumbnails) return;
    //- 设置当前激活的缩略图
    const activeThumbnail = this.elements.thumbnails.querySelector(
      `[data-target="${mediaId}"]`
    );
    this.setActiveThumbnail(activeThumbnail);
    this.announceLiveRegion(activeThumbnail.dataset.mediaPosition);
  }

  //- 设置当前激活的缩略图
  setActiveThumbnail(thumbnail) {
    if (!this.elements.thumbnails || !thumbnail) return;

    this.elements.thumbnails
      .querySelectorAll("button")
      .forEach((element) => element.removeAttribute("aria-current"));
    thumbnail.querySelector("button").setAttribute("aria-current", true);
    if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

    this.elements.thumbnails.slider?.scrollTo({
      left: thumbnail.offsetLeft,
      behavior: "smooth",
    });
  }

  //- ARIA 播报当前图片位置
  announceLiveRegion(position) {
    this.elements.liveRegion.setAttribute("aria-hidden", false);
    this.elements.liveRegion.innerHTML =
      window.accessibilityStrings.imageAvailable.replace("[index]", position);
    setTimeout(() => {
      this.elements.liveRegion.setAttribute("aria-hidden", true);
    }, 2000);
  }

  playActiveMedia(activeItem) {
    window.pauseAllMedia();
    const deferredMedia = activeItem.querySelector(".deferred-media");
    if (deferredMedia) deferredMedia.loadContent(false);
  }
}

//* 产品媒体文件无限循环轮播组件
class CarouselComponent extends HTMLElement {
  constructor() {
    super();
    this.sliderWrapper = this.querySelector('[id^="Carousel-"]'); //- wrapper (用于 transform 的容器)
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]'); //- 所有轮播卡片
    this.buttons = this.querySelectorAll('[id^="Carousel-Button-"]'); //- 切换按钮
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.sliderWrapper || !this.buttons) return;

    //- 初始化 translateX 位置
    this.currentTranslateX = 0;
    this.isTransitioning = false;

    this.initPages();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.initPages());
    });
    resizeObserver.observe(this.sliderWrapper);

    this.handleResize = debounce(() => {
      requestAnimationFrame(() => this.initPages());
    }, 250);
    window.addEventListener("resize", this.handleResize);

    this.boundUpdate = this.update.bind(this);
    this.boundOnButtonClick = this.onButtonClick.bind(this);
    this.boundTransitionEnd = this.onTransitionEnd.bind(this);

    //- 使用 transitionend 事件替代 scroll 事件
    this.sliderWrapper.addEventListener("transitionend", this.boundTransitionEnd);
    this.prevButton.addEventListener("click", this.boundOnButtonClick);
    this.nextButton.addEventListener("click", this.boundOnButtonClick);
  }

  //- 清理函数，在组件销毁时调用
  disconnectedCallback() {
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
    }
    if (this.sliderWrapper && this.boundTransitionEnd) {
      this.sliderWrapper.removeEventListener("transitionend", this.boundTransitionEnd);
    }
    if (this.prevButton && this.boundOnButtonClick) {
      this.prevButton.removeEventListener("click", this.boundOnButtonClick);
    }
    if (this.nextButton && this.boundOnButtonClick) {
      this.nextButton.removeEventListener("click", this.boundOnButtonClick);
    }
  }

  //- 初始化轮播列表
  initPages() {
    this.removeClones();

    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');
    //- 过滤掉克隆节点
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(
      (element) =>
        element.clientWidth > 0 && !element.hasAttribute("data-clone")
    );

    //- 如果列表长度小于 1，不需要轮播
    if (this.sliderItemsToShow.length <= 1) {
      this.buttons && this.buttons.classList.add("hidden");
      if (this.prevButton) this.prevButton.setAttribute("disabled", "disabled");
      if (this.nextButton) this.nextButton.setAttribute("disabled", "disabled");
      return;
    }

    this.setupInfiniteLoop();
    //- 包含克隆节点
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');

    //- 计算偏移量（使用第一个和第二个真实项目）
    const firstItem = this.sliderItemsToShow[0];
    const secondItem = this.sliderItemsToShow[1] || firstItem;
    
    //- 使用 offsetLeft 计算项目之间的偏移量（不受 transform 影响）
    this.sliderItemOffset = secondItem.offsetLeft - firstItem.offsetLeft || firstItem.offsetWidth;
    if (this.sliderItemOffset <= 0) {
      this.sliderItemOffset = firstItem.offsetWidth;
    }

    //- 初始化时移动到第一个真实项目
    if (this.sliderItemsToShow.length > 1 && this.firstRealItem) {
      requestAnimationFrame(() => {
        if (this.firstRealItem) {
          const firstRealLeft = this.getItemPosition(this.firstRealItem);
          this.currentTranslateX = -firstRealLeft;
          this.sliderWrapper.style.transform = `translateX(${this.currentTranslateX}px)`;
        }
      });
    } else {
      //- 如果没有项目或只有一个项目，重置位置
      this.currentTranslateX = 0;
      this.sliderWrapper.style.transform = 'translateX(0)';
    }

    //- 更新按钮状态
    this.update();
  }

  //- 获取项目相对于容器的位置（不考虑当前 transform）
  getItemPosition(item) {
    if (!item) return 0;
    //- 使用 offsetLeft 获取项目相对于 sliderWrapper 的位置
    //- offsetLeft 不受 transform 影响，返回的是元素在文档流中的位置
    return item.offsetLeft;
  }

  //- 克隆首尾项目
  setupInfiniteLoop() {
    this.removeClones();

    if (this.sliderItemsToShow.length <= 1) return;

    const firstItem = this.sliderItemsToShow[0];
    const lastItem = this.sliderItemsToShow[this.sliderItemsToShow.length - 1];

    //- 克隆最后一个项目并插入到开头
    this.lastClone = lastItem.cloneNode(true);
    this.lastClone.setAttribute("data-clone", "last");
    this.lastClone.setAttribute("aria-hidden", "true");
    this.sliderWrapper.insertBefore(this.lastClone, firstItem);

    //- 克隆第一个项目并追加到末尾
    this.firstClone = firstItem.cloneNode(true);
    this.firstClone.setAttribute("data-clone", "first");
    this.firstClone.setAttribute("aria-hidden", "true");
    this.sliderWrapper.appendChild(this.firstClone);

    this.firstRealItem = firstItem;
    this.lastRealItem = lastItem;

    this.isJumping = false;
  }

  //- 移除克隆节点
  removeClones() {
    const clones = this.sliderWrapper.querySelectorAll("[data-clone]");
    clones.forEach((clone) => clone.remove());
    this.lastClone = null;
    this.firstClone = null;
  }

  //- 重置内容
  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');
    this.initPages();
  }

  update() {
    if (!this.sliderWrapper || !this.buttons || !this.sliderItemOffset) return;

    const previousPage = this.currentPage;

    //- 获取当前可见的真实项目
    let currentElement = null;
    if (this.sliderItems && this.sliderItems.length > 0) {
      //- currentTranslateX 是负值（向左移动），需要转换为正值来计算位置
      const visibleLeft = -this.currentTranslateX;
      const viewportCenter = this.sliderWrapper.clientWidth / 2;
      const viewportCenterAbsolute = visibleLeft + viewportCenter;
      let minDistance = Infinity;
      let closestIndex = 0;

      //- 找到距离当前视口中心最近的项目
      for (let i = 0; i < this.sliderItems.length; i++) {
        const item = this.sliderItems[i];
        const itemLeft = this.getItemPosition(item);
        const itemCenter = itemLeft + item.offsetWidth / 2;
        const distance = Math.abs(viewportCenterAbsolute - itemCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
          currentElement = item;
        }
      }

      this.currentPage = closestIndex;
    }

    //- 处理无限循环
    this.handleInfiniteLoop();

    //- 触发轮播图切换事件
    if (this.currentPage !== previousPage && currentElement) {
      this.dispatchEvent(
        new CustomEvent("carouselSlideChanged", {
          detail: {
            currentPage: this.currentPage,
            currentElement,
          },
        })
      );
    }
  }

  //- 当移动到克隆节点时,跳转到真实节点
  handleInfiniteLoop() {
    if (
      !this.firstRealItem ||
      !this.lastRealItem ||
      !this.firstClone ||
      !this.lastClone
    )
      return;

    //- 防止重复跳转
    if (this.isJumping) return;

    const currentItem = this.sliderItems[this.currentPage];
    
    //- 如果当前是最后一个克隆节点（firstClone），跳转到第一个真实项目
    if (currentItem === this.firstClone) {
      this.isJumping = true;
      requestAnimationFrame(() => {
        const firstRealLeft = this.getItemPosition(this.firstRealItem);
        this.setTranslateX(-firstRealLeft, false);
        setTimeout(() => {
          this.isJumping = false;
        }, 50);
      });
    }
    //- 如果当前是第一个克隆节点（lastClone），跳转到最后一个真实项目
    else if (currentItem === this.lastClone) {
      this.isJumping = true;
      requestAnimationFrame(() => {
        const lastRealLeft = this.getItemPosition(this.lastRealItem);
        this.setTranslateX(-lastRealLeft, false);
        setTimeout(() => {
          this.isJumping = false;
        }, 50);
      });
    }
  }

  //- 判断元素是否在视口内
  isSlideVisible(element, offset = 0) {
    const currentTranslateX = -this.currentTranslateX;
    const viewportRight = this.sliderWrapper.clientWidth + currentTranslateX - offset;
    const itemLeft = this.getItemPosition(element);
    const itemRight = itemLeft + element.offsetWidth;
    return (
      itemRight <= viewportRight &&
      itemLeft >= currentTranslateX
    );
  }

  //- 左右切换按钮点击事件
  onButtonClick(event) {
    event.preventDefault();

    if (!this.firstRealItem || !this.lastRealItem) return;

    const isNext = event.currentTarget.name === "next";
    let targetIndex;
    if (isNext) {
      targetIndex = Math.min(this.sliderItems.length - 1, this.currentPage + 1);
    } else {
      targetIndex = Math.max(0, this.currentPage - 1);
    }

    //- 移动到目标项目
    const targetItem = this.sliderItems[targetIndex];
    if (targetItem) {
      const targetLeft = this.getItemPosition(targetItem);
      this.setSlidePosition(-targetLeft);
    }
  }

  //- 设置轮播图位置（保留当前功能）
  setSlidePosition(translateX) {
    this.setTranslateX(translateX, true);
  }

  //- transition 结束事件处理
  onTransitionEnd(event) {
    //- 只处理 transform 的 transition
    if (event.propertyName === "transform") {
      this.isTransitioning = false;
      this.update();
    }
  }

  //- 设置 translateX 值
  setTranslateX(translateX, smooth = true) {
    if (!smooth) {
      //- 如果是不平滑的跳转，先移除 transition
      this.sliderWrapper.style.transition = "none";
      this.sliderWrapper.style.transform = `translateX(${translateX}px)`;
      this.currentTranslateX = translateX;
      //- 使用 requestAnimationFrame 确保样式已应用后再恢复 transition
      requestAnimationFrame(() => {
        this.sliderWrapper.style.transition = "";
        this.isTransitioning = false;
      });
    } else {
      //- 平滑过渡（transition 已在 CSS 中设置）
      this.sliderWrapper.style.transform = `translateX(${translateX}px)`;
      this.currentTranslateX = translateX;
      this.isTransitioning = true;
    }
  }
}

if (!customElements.get("media-carousel")) {
  customElements.define("media-carousel", MediaCarousel);
  customElements.define("carousel-component", CarouselComponent);
}
