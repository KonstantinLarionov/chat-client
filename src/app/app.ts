import {Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import {VideoChatService} from '../services/video.service';
import {NgClass, NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [NgForOf, NgIf, NgClass]
})
export class App implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;

  remoteStreams: MediaStream[] = [];
  screenStream: MediaStream | null = null;

  room = "demo-room";
  micEnabled = true;
  cameraEnabled = true;

  constructor(public chat: VideoChatService) {}

  ngOnInit() {
    this.chat.remoteVideoAdded.subscribe(stream => {
      if (!stream) {
        this.screenStream = null;
        return;
      }

      if ((stream as any).isScreen) {
        this.screenStream = stream; // всегда заменяем текущий экран
      } else {
        if (!this.remoteStreams.find(s => s.id === stream.id)) {
          this.remoteStreams.push(stream);
        }
      }
    });
  }

  async start() {
    try {
      await this.chat.initLocalVideo(this.localVideo.nativeElement);
      this.localVideo.nativeElement.srcObject = this.chat.localStream!;
    } catch (e) {
      this.cameraEnabled = false;
    }
    this.chat.join(this.room);
  }


  toggleCamera() {
    const track = this.chat.localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.cameraEnabled = track.enabled;

      // всегда привязываем srcObject обратно к localStream
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = this.chat.localStream!;
      }
    } else {
      this.cameraEnabled = false;
    }
  }

  toggleMic() {
    const track = this.chat.localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.micEnabled = track.enabled;
    } else {
      this.micEnabled = false;
    }
  }



  toggleScreen() {
    this.chat.toggleScreenShare(this.localVideo.nativeElement);
  }

  leave() {
    window.location.reload();
  }
}

