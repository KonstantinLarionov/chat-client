import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface ChatRoom {
  id: string;
  name: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private rooms: ChatRoom[] = [];
  private readonly STORAGE_KEY = 'chat_rooms';

  async loadRooms(): Promise<ChatRoom[]> {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });
    this.rooms = value ? JSON.parse(value) : [];
    return [...this.rooms]; // важно — возвращаем копию
  }

  private async save() {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(this.rooms),
    });
  }

  async renameRoom(id: string, newName: string) {
    await this.loadRooms(); // подгружаем актуальный список

    const room = this.rooms.find(r => r.id === id);
    if (room) {
      room.name = newName;
      await this.save();
    }
  }

  async createRoom(name: string): Promise<ChatRoom> {
    const room: ChatRoom = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    };

    this.rooms.push(room);
    await this.save();
    return room;
  }

  async deleteRoom(id: string) {
    this.rooms = this.rooms.filter(r => r.id !== id);
    await this.save();
  }

  async ensureRoomExists(id: string): Promise<ChatRoom> {
    await this.loadRooms();

    let room = this.rooms.find(r => r.id === id);
    if (!room) {
      room = {
        id,
        name: `Комната ${id.slice(0, 6)}`,
        createdAt: Date.now()
      };
      this.rooms.push(room);
      await this.save();
    }
    return room;
  }

  getRooms() {
    return [...this.rooms]; // всегда копия, чтобы компонент не ломал сервис
  }
}
