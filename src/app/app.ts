import {Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import {VideoChatService} from '../services/video.service';
import {NgClass, NgForOf} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [
    NgForOf
  ]
})
export class App implements OnInit {
  protected readonly title = signal('chat-client');

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  remoteStreams: MediaStream[] = [];
  room = "demo-room";
  micEnabled = true; // по умолчанию включен
  cameraEnabled = true;

  constructor(public chat: VideoChatService) {}

  ngOnInit() {
    this.chat.remoteVideoAdded.subscribe(stream => {
      if (!this.remoteStreams.find(s => s.id === stream.id)) {
        this.remoteStreams.push(stream);
      }
    });
  }

  async start() {
    await this.chat.initLocalVideo(this.localVideo.nativeElement);
    this.chat.join(this.room);
  }

  async shareScreen() {
    await this.chat.shareScreen();
  }

  toggleCamera() {
    const mediaStream = this.localVideo.nativeElement.srcObject as MediaStream | null;
    const track = mediaStream?.getTracks().find(t => t.kind === 'video');
    if (track) {
      track.enabled = !track.enabled;
      this.cameraEnabled = track.enabled;
    }
  }
  toggleMic() {
    console.log('Toggling mic. Current state:', this.micEnabled);
    const mediaStream = this.localVideo.nativeElement.srcObject as MediaStream | null;
    const track = mediaStream?.getTracks().find(t => t.kind === 'audio');
    if (track) {
      track.enabled = !track.enabled;
      this.micEnabled = track.enabled; // 🔑 сохраняем состояние
    }
  }
  toggleScreen() {
    this.chat.toggleScreenShare();
  }


  leave() {
    window.location.reload();
  }
}
