import {Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';

import {VideoChatService} from '../services/video.service';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [
    NgForOf
  ],
  styleUrl: './app.css'
})
export class App implements OnInit{
  protected readonly title = signal('chat-client');

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  remoteStreams: MediaStream[] = [];
  room = "demo-room";

  constructor(private chat: VideoChatService) {}

  async ngOnInit() {
    this.chat.remoteVideoAdded.subscribe(stream => {
      this.remoteStreams.push(stream);
    });
  }

  async start() {
    await this.chat.initLocalVideo(this.localVideo.nativeElement);
    this.chat.join(this.room);
  }
}
