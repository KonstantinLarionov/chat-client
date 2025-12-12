import {
  Component,
  ElementRef,
  OnInit,
  AfterViewChecked,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoChatService, ParticipantVM } from '../services/video.service';
import { PermissionService } from '../services/permission.service';
import { Subscription } from 'rxjs';
import {VideoStreamDirective} from '../services/VideoStreamDirective';

@Component({
  selector: 'app-meet',
  standalone: true,
  imports: [CommonModule, VideoStreamDirective],
  templateUrl: './meet.component.html',
  styleUrl: './meet.component.css'
})
export class MeetComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;

  participants: ParticipantVM[] = [];
  mediaStarted = false;
  async onFirstUserAction() {
    if (this.mediaStarted) return;

    this.mediaStarted = true;
    await this.chat.startMedia();
  }

  cam = false;
  mute = false;
  share = false;

  roomId = '';

  private sub?: Subscription;

  constructor(
    private chat: VideoChatService,
    private route: ActivatedRoute,
    private router: Router,
    private perms: PermissionService
  ) {}

  async ngOnInit() {
    // 🔥 СНАЧАЛА подписка
    this.sub = this.chat.participants$.subscribe(p => {
      this.participants = p;
    });

    await this.perms.requestPermissions();

    this.roomId = this.route.snapshot.paramMap.get('id') ?? 'default';
    const userId =
      localStorage.getItem('lk-user-id')
      ?? crypto.randomUUID();

    localStorage.setItem('lk-user-id', userId);

    // 🔥 Потом join — как только сервис сделает initExistingParticipants(),
    // компонент сразу получит список участников (с видео или заглушками)
    await this.chat.join(this.roomId, userId);
  }

  ngAfterViewChecked() {
    if (!this.cam || !this.localVideo) return;

    const stream = this.chat.getLocalVideoStream();
    const videoEl = this.localVideo.nativeElement;

    if (stream && videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.chat.leaveRoom();
  }

  async toggleCamera() {
    this.cam = !this.cam;
    if (this.cam) {
      await this.chat.enableCamera();
    } else {
      this.chat.disableCamera();
    }
  }

  toggleMic() {
    this.mute = !this.mute;
    this.chat.setMicMuted(this.mute);
  }

  async toggleScreen() {
    this.share = !this.share;
    await this.chat.toggleScreenShare(this.share);
  }

  leave() {
    this.chat.leaveRoom();
    this.router.navigate(['/rooms']);
  }

  getGridStyle() {
    const count = this.participants.length;
    const columns =
      count <= 1 ? 1 :
        count <= 4 ? 2 :
          count <= 6 ? 3 : 4;

    return {
      display: 'grid',
      gap: '8px',
      'grid-template-columns': `repeat(${columns}, 1fr)`,
      width: '100%',
      height: '100%'
    };
  }
}
