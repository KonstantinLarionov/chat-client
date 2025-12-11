import {AfterViewChecked, AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {CommonModule, NgIf} from '@angular/common';
import {share} from 'rxjs';
import {VideoChatService} from '../services/video.service';
import {ActivatedRoute, Router} from '@angular/router';
import {PermissionService} from '../services/permission.service';

@Component({
  selector: 'app-meet.component',
  imports: [
    NgIf, CommonModule
  ],
  templateUrl: './meet.component.html',
  styleUrl: './meet.component.css'
})
export class MeetComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('localVideo', { static: false }) localVideo!: ElementRef<HTMLVideoElement>;

  remoteStreams: MediaStream[] = [];
  screenStream: MediaStream | null = null;

  mute = false;
  cam = false;
  share = false;

  viewMode: 'p2p' | 'meet' | 'sharing' = 'meet'; // начальный режим

  room = 'demo-room';

  constructor(public chat: VideoChatService, private route: ActivatedRoute,
              private router: Router,
              private perms: PermissionService) {}

  async ngOnInit() {
    await this.perms.requestPermissions();

    this.room = this.route.snapshot.paramMap.get('id') ?? 'default-room';
    this.chat.remoteVideoAdded.subscribe(stream => {

      console.log("before",this.viewMode);
      if (!stream) {
        this.screenStream = null;
        // Удаляем все потоки, у которых peer больше нет
        this.remoteStreams = this.remoteStreams.filter(s =>
          Object.values(this.chat['peers']).some(pc =>
            Array.from(pc.getReceivers()).some(r => r.track?.id === s.getTracks()[0]?.id)
          )
        );

        this.viewMode = this.remoteStreams.length > 0 ? 'meet' : 'p2p';
        return;
      }

      if ((stream as any).isScreen) {
        this.screenStream = stream;
        this.viewMode = 'sharing';
      } else {
        if (!this.remoteStreams.find(s => s.id === stream.id)) {
          this.remoteStreams.push(stream);
        }
        this.viewMode = this.remoteStreams.length > 1 ? 'meet' : 'meet';
      }

      console.log("after",this.viewMode);
    });
  }

  getGridStyle() {
    const count = this.remoteStreams.length;
    let columns = 1;

    if (count === 2) columns = 2;
    else if (count >= 3 && count <= 4) columns = 2;
    else if (count >= 5 && count <= 6) columns = 3;
    else if (count >= 7) columns = 4;

    return {
      display: 'grid',
      gap: '8px',
      padding: '8px',
      'grid-template-columns': `repeat(${columns}, 1fr)`,
      'grid-auto-rows': '1fr',
      width: '100%',
      height: '100%',
      'justify-content': 'center',
      'align-content': 'center'
    };
  }
  async ngAfterViewInit() {
    await this.chat.initLocalStream(); // без камеры
    this.chat.join(this.room);
  }

  ngAfterViewChecked() {
    if (this.cam && this.localVideo && this.chat.localStream) {
      this.localVideo.nativeElement.srcObject = this.chat.localStream;
    }
  }

  async start() {
    try {
      await this.chat.initLocalStream();
      if (!this.localVideo.nativeElement.srcObject) {
        this.localVideo.nativeElement.srcObject = this.chat.localStream!;
      }
    } catch (e) {
      this.cam = false;
    }
    this.chat.join(this.room);
  }


  async toggleCamera() {
    this.cam = !this.cam;

    // Если хотим включить камеру
    if (this.cam) {
      const ok = await this.chat.enableCamera(this.localVideo.nativeElement);
      if (!ok) {
        this.cam = false;
        console.warn("Камера недоступна");
      }
      return;
    }

    // Если хотим выключить камеру
    this.chat.disableCamera();

    // Обновляем превью
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = this.chat.localStream!;
    }
  }


  toggleMic() {
    const track = this.chat.localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
    }
    this.mute = !this.mute;
    console.log(this.viewMode)
  }

  async toggleScreen() {
    this.share = !this.share;
  }


  leave() {
    this.chat.leaveRoom();
    this.router.navigate(['/rooms']); // или твой путь
  }
}
