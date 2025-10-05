import {AfterViewChecked, AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {CommonModule, NgIf} from '@angular/common';
import {share} from 'rxjs';
import {VideoChatService} from '../services/video.service';

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
  cam = true;
  share = false;

  viewMode: 'p2p' | 'meet' | 'sharing' = 'meet'; // начальный режим

  room = 'demo-room';

  constructor(public chat: VideoChatService) {}

  ngOnInit() {
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

  ngAfterViewInit(){
    this.start();
  }
  ngAfterViewChecked() {
    if (this.cam && this.localVideo && this.chat.localStream) {
      this.localVideo.nativeElement.srcObject = this.chat.localStream;
    }
  }

  async start() {
    try {
      await this.chat.initLocalVideo(this.localVideo.nativeElement);
      if (!this.localVideo.nativeElement.srcObject) {
        this.localVideo.nativeElement.srcObject = this.chat.localStream!;
      }
    } catch (e) {
      this.cam = false;
    }
    this.chat.join(this.room);
  }


  toggleCamera() {
    this.cam = !this.cam;
    const track = this.chat.localStream?.getVideoTracks()[0];
    console.log(this.localVideo?.nativeElement);
    if (track) {
      track.enabled = !track.enabled;
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = this.chat.localStream!;
      }
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
    await this.chat.toggleScreenShare();
  }


  leave() {
    window.location.reload();
  }
}
