import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

@Directive({
  selector: 'video[appVideoStream]'
})
export class VideoStreamDirective implements OnChanges {
  @Input('appVideoStream') stream: MediaStream | undefined;

  constructor(private el: ElementRef<HTMLVideoElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    const videoEl = this.el.nativeElement;
    videoEl.muted = true;
    videoEl.controls = false;

    // если стрим поменялся
    if (changes['stream']) {
      if (this.stream) {
        if (videoEl.srcObject !== this.stream) {
          videoEl.srcObject = this.stream;
        }

        videoEl.muted = true;           // <--- ОБЯЗАТЕЛЬНО
        videoEl.playsInline = true;
        // пробуем явно запустить воспроизведение
        const p = videoEl.play();
        if (p !== undefined) {
          p.catch(err => {
            console.warn('[video] autoplay blocked / play() error:', err);
          });
        }
      } else {
        // стрима нет — чистим
        if (videoEl.srcObject) {
          videoEl.srcObject = null;
        }
      }
    }
  }
}
