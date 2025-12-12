import { Component } from '@angular/core';
import { ChatRoom, RoomService } from '../services/room.service';
import { Router } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rooms',
  imports: [
    NgIf,
    NgForOf,
    FormsModule
  ],
  templateUrl: './rooms.html',
  styleUrl: './rooms.css'
})
export class Rooms {
  rooms: ChatRoom[] = [];
  newRoomName = '';
  roomLink = ''; // ← добавили поле

  constructor(private roomService: RoomService, private router: Router) {}

  async ngOnInit() {
    this.rooms = await this.roomService.loadRooms();
  }
  copyRoomLink(room: any) {
    const link = `${window.location.origin}/meet/${room.id}`;

    navigator.clipboard.writeText(link)
      .then(() => {
        console.log("Ссылка скопирована:", link);
      })
      .catch(err => console.error("Ошибка копирования:", err));
  }

  async renameRoom(room: ChatRoom) {
    const newName = prompt('Введите новое имя комнаты:', room.name);

    if (!newName || !newName.trim()) return;

    await this.roomService.renameRoom(room.id, newName.trim());
    this.rooms = await this.roomService.loadRooms();
  }
  openRoom(room: ChatRoom) {
    this.router.navigate(['/meet', room.id]);
  }
  async deleteRoom(room: ChatRoom) {
    await this.roomService.deleteRoom(room.id);
    this.rooms = await this.roomService.loadRooms();
  }

  async addRoomByLink() {
    if (!this.roomLink.trim()) return;

    let id = this.roomLink.trim().replace(/.*\/meet\//, '');

    if (!id || id.includes('/')) {
      alert('Некорректная ссылка на комнату');
      return;
    }

    await this.roomService.ensureRoomExists(id);

    this.rooms = await this.roomService.loadRooms();
    this.roomLink = '';
  }

  async addRoom() {
    if (!this.newRoomName.trim()) return;

    await this.roomService.createRoom(this.newRoomName);

    this.rooms = await this.roomService.loadRooms();
    this.newRoomName = '';
  }
}
