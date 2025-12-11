import {Component, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import {NgIf} from '@angular/common';
import {PermissionService} from '../services/permission.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [
    RouterLink,
    NgIf
  ],
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit{
  roomUrl: string | null = null;

  constructor(private router: Router) {}

  async ngOnInit() {
  }

  createRoom() {
    const id = uuidv4();
    this.roomUrl = `/meet/${id}`; // только относительный путь!
  }

  get fullRoomUrl(): string {
    return `${window.location.origin}${this.roomUrl}`;
  }

  joinRoom(roomId: string) {
    if (!roomId.trim()) return;
    this.router.navigate(['/meet', roomId]);
  }

  copyUrl() {
    if (this.roomUrl) {
      navigator.clipboard.writeText(this.roomUrl);
      alert('Ссылка скопирована!');
    }
  }
}
