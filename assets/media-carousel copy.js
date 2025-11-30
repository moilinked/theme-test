class MediaCarousel extends HTMLElement {
  constructor() {
    super();
    this.sliderWrapper = this.querySelector('[id^="Carousel-"]');
    this.sliderItems = this.querySelectorAll('[id^="Carousel-Slide-"]');
    this.buttons = this.querySelectorAll('[id^="Carousel-Button-"]'); //- 切换按钮
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');
    this.currentIndex = 1;
    this.slideWidth = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startScrollLeft = 0;
    this.animationId = null;
  }

  connectedCallback() {
    this.setup();
    this.setupArrows();
    this.setupDrag();
    window.addEventListener("resize", () => this.updateWidth());
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

  setupArrows() {
    this.prevButton.addEventListener("click", () => this.prev());
    this.nextButton.addEventListener("click", () => this.next());
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
}

customElements.define("media-carousel", MediaCarousel);
