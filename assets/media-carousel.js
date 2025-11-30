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
    console.log("onSlideChanged=====>", event);
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

class CarouselComponent extends HTMLElement {
  constructor() {
    super();
    //- elements
    this.sliderWrapper = this.querySelector('[id^="Carousel-"]');
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');
    this.buttons = this.querySelectorAll('[id^="Carousel-Button-"]');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    //- state
    this.currentIndex = 1;
    this.slideWidth = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startScrollLeft = 0;
    this.animationId = null;
  }

  connectedCallback() {
    this.initPages();
  }

  initPages() {
    this.setup();
    this.setupDrag();
    this.handleResize = debounce(() => {
      requestAnimationFrame(() => this.updateWidth());
    }, 250);
    window.addEventListener("resize", this.handleResize);

    this.dispatchEvent(
      new CustomEvent("carouselSlideChanged", {
        detail: {
          currentPage: this.currentIndex,
          currentElement: this.sliderItems[this.currentIndex],
        },
      })
    );
  }

  //- 重置内容
  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');
    this.initPages();
  }

  //- 清理函数
  disconnectedCallback() {
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
    }
    if (this.prevButton && this.prev) {
      this.prevButton.removeEventListener("click", this.prev);
    }
    if (this.nextButton && this.next) {
      this.nextButton.removeEventListener("click", this.next);
    }
  }

  setup() {
    this.sliderWrapper = this.querySelector('[id^="Carousel-"]');
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');

    //- 克隆头尾
    const first = this.sliderItems[0].cloneNode(true);
    const last = this.sliderItems[this.sliderItems.length - 1].cloneNode(true);

    this.sliderWrapper.prepend(last);
    this.sliderWrapper.append(first);

    this.sliderItems = Array.from(this.sliderWrapper.children);

    this.updateWidth();
    this.jumpToIndex(this.currentIndex);

    if (this.prevButton) {
      this.prevButton.addEventListener("click", () => this.prev());
    }
    if (this.nextButton) {
      this.nextButton.addEventListener("click", () => this.next());
    }
  }

  updateWidth() {
    this.slideWidth = this.sliderWrapper.clientWidth;
    this.jumpToIndex(this.currentIndex);
  }

  jumpToIndex(i) {
    this.sliderWrapper.scrollLeft = i * this.slideWidth;
  }

  animateToIndex(i, duration = 250) {
    cancelAnimationFrame(this.animationId);

    const start = this.sliderWrapper.scrollLeft;
    const target = i * this.slideWidth;
    const change = target - start;
    const startTime = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = progress * (2 - progress); // easeOutQuad

      this.sliderWrapper.scrollLeft = start + change * ease;

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.onScrollEnd(i);
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  onScrollEnd(i) {
    const total = this.sliderItems.length - 2;
    if (i === 0) i = total;
    if (i === total + 1) i = 1;
    this.currentIndex = i;
    this.jumpToIndex(i);
  }

  next() {
    this.animateToIndex(++this.currentIndex);
  }

  prev() {
    this.animateToIndex(--this.currentIndex);
  }

  setupDrag() {
    const el = this.sliderWrapper;

    el.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.startX = e.clientX;
      this.startScrollLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      if (!this.isDragging) return;
      const diff = e.clientX - this.startX;
      el.scrollLeft = this.startScrollLeft - diff;
    });

    el.addEventListener("pointerup", (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const diff = this.startX - e.clientX;

      if (Math.abs(diff) > this.slideWidth * 0.2) {
        diff > 0 ? this.next() : this.prev();
      } else {
        this.animateToIndex(this.currentIndex); // 回弹
      }
    });
  }

  //- 判断元素是否在视口内
  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide =
      this.sliderWrapper.clientWidth + this.sliderWrapper.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.sliderWrapper.scrollLeft
    );
  }
}

//* 产品媒体文件无限循环轮播组件
class CarouselComponent2 extends HTMLElement {
  constructor() {
    super();
    this.sliderWrapper = this.querySelector('[id^="Carousel-"]'); //- wrapper
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]'); //- 所有轮播卡片
    this.buttons = this.querySelectorAll('[id^="Carousel-Button-"]'); //- 切换按钮
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.sliderWrapper || !this.buttons) return;

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

    this.sliderWrapper.addEventListener("scroll", this.boundUpdate);
    this.prevButton.addEventListener("click", this.boundOnButtonClick);
    this.nextButton.addEventListener("click", this.boundOnButtonClick);
  }

  //- 清理函数，在组件销毁时调用
  disconnectedCallback() {
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
    }
    if (this.sliderWrapper && this.boundUpdate) {
      this.sliderWrapper.removeEventListener("scroll", this.boundUpdate);
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

    const firstItem = this.sliderItemsToShow[1];
    const secondItem = this.sliderItemsToShow[2];
    const firstItemRect = firstItem.getBoundingClientRect();
    const secondItemRect = secondItem.getBoundingClientRect();

    //- 计算偏移量
    this.sliderItemOffset =
      secondItemRect.left - firstItemRect.left || firstItem.offsetWidth;
    if (this.sliderItemOffset <= 0) {
      this.sliderItemOffset = firstItem.offsetWidth || firstItemRect.width;
    }

    //- 如果启用循环，初始化时滚动到第一个真实项目
    if (
      this.currentPage === 1 &&
      this.sliderItemsToShow.length > 1 &&
      this.firstRealItem
    ) {
      requestAnimationFrame(() => {
        if (this.firstRealItem && this.firstRealItem.offsetLeft > 0) {
          this.sliderWrapper.scrollTo({
            left: this.firstRealItem.offsetLeft,
            behavior: "auto",
          });
        }
      });
    }

    //- 更新按钮状态
    this.update();
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
    const scrollLeft = this.sliderWrapper.scrollLeft;

    this.currentPage = Math.max(
      0,
      Math.round(scrollLeft / this.sliderItemOffset) + 1
    );

    //- 获取当前可见的真实项目
    let currentElement = null;
    if (this.sliderItems && this.sliderItems.length > 0) {
      const currentScrollLeft = this.sliderWrapper.scrollLeft;
      let minDistance = Infinity;
      let closestIndex = 0;

      //- 找到距离当前滚动位置最近的真实项目
      for (let i = 0; i < this.sliderItems.length; i++) {
        const item = this.sliderItems[i];
        const itemLeft = item.offsetLeft;
        const itemCenter = itemLeft + item.offsetWidth / 2;
        const distance = Math.abs(
          currentScrollLeft + this.sliderWrapper.clientWidth / 2 - itemCenter
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
          currentElement = item;
        }
      }

      this.currentPage = closestIndex;
    }

    // setTimeout(() => {
    this.handleInfiniteLoop();
    // }, 1000);

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

  //- 当滚动到克隆节点时,跳转到真实节点
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

    const firstRealLeft = this.firstRealItem.offsetLeft;
    const lastRealLeft = this.lastRealItem.offsetLeft;

    //- 如果滚动到了最后一个克隆节点（末尾），跳转到第一个真实项目
    if (this.currentPage === this.sliderItems.length - 1) {
      this.isJumping = true;
      requestAnimationFrame(() => {
        this.sliderWrapper.scrollTo({
          left: firstRealLeft,
          behavior: "instant",
        });
        setTimeout(() => {
          this.isJumping = false;
        }, 50);
      });
    }
    //- 如果滚动到了第一个克隆节点（开头），跳转到最后一个真实项目
    else if (this.currentPage === 0) {
      this.isJumping = true;
      requestAnimationFrame(() => {
        this.sliderWrapper.scrollTo({
          left: lastRealLeft,
          behavior: "instant",
        });
        setTimeout(() => {
          this.isJumping = false;
        }, 50);
      });
    }
  }

  //- 判断元素是否在视口内
  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide =
      this.sliderWrapper.clientWidth + this.sliderWrapper.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.sliderWrapper.scrollLeft
    );
  }

  //- 左右切换按钮点击事件
  onButtonClick(event) {
    event.preventDefault();

    if (!this.firstRealItem || !this.lastRealItem) return;

    const isNext = event.currentTarget.name === "next";
    let targetIndex;
    if (isNext) {
      targetIndex = Math.min(this.sliderItems.length, this.currentPage + 1);
    } else {
      targetIndex = Math.max(0, this.currentPage - 1);
    }

    //- 滚动到目标项目
    const targetItem = this.sliderItems[targetIndex];
    if (targetItem) {
      this.setSlidePosition(targetItem.offsetLeft);
    }
  }

  //- 设置轮播图位置
  setSlidePosition(left) {
    this.sliderWrapper.scrollTo({ left, behavior: "smooth" });
  }
}

if (!customElements.get("media-carousel")) {
  customElements.define("media-carousel", MediaCarousel);
  customElements.define("carousel-component", CarouselComponent);
}
