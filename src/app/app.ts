import {Component, ElementRef, OnInit, signal, ViewChild} from '@angular/core';
import {VideoChatService} from '../services/video.service';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [NgForOf, NgIf, NgClass, RouterOutlet]
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

  }
}

