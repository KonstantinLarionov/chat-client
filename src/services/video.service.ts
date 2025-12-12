import { Injectable } from '@angular/core';
import {
  Room,
  RoomEvent,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteVideoTrack, createLocalVideoTrack
} from 'livekit-client';
import { BehaviorSubject } from 'rxjs';

export interface ParticipantVM {
  id: string;
  name?: string;
  videoStream?: MediaStream;
  hasVideo: boolean;
}

@Injectable({ providedIn: 'root' })
export class VideoChatService {

  private room?: Room;

  private participants = new Map<string, ParticipantVM>();
  // 🔥 Был EventEmitter, делаем BehaviorSubject
  participants$ = new BehaviorSubject<ParticipantVM[]>([]);

  private localVideoTrack?: LocalVideoTrack;
  private localAudioTrack?: LocalAudioTrack;
  private localVideoStream: MediaStream | null = null;

  private TOKEN_SERVER = 'https://chat-cignalserver.onrender.com/token';
  private LIVEKIT_URL = 'wss://chatidichat-nnk40qaj.livekit.cloud';
  get isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // ===== JOIN =====
  async join(roomId: string, userId: string) {
    const res = await fetch(
      `${this.TOKEN_SERVER}?room=${roomId}&user=${userId}`
    );
    const { token } = await res.json();

    this.room = new Room({
      adaptiveStream: false,
      dynacast: true, // <---- ВОТ ЭТО!,
      publishDefaults: {
        simulcast: !this.isMobile, // ← выключить simulcast на телефоне
      }
    });


    this.bindRoomEvents();
    await this.room.connect(this.LIVEKIT_URL, token);

    console.log('JOIN', roomId, userId, 'roomID:', this.room.name);

    // 🔥 Подхватываем тех, кто уже в комнате
    this.initExistingParticipants();
  }

  // ===== ИНИЦИАЛИЗАЦИЯ УЧАСТНИКОВ УЖЕ В КОМНАТЕ =====
  private initExistingParticipants() {
    if (!this.room) return;

    for (const p of this.room.remoteParticipants.values()) {
      const vm = this.ensureParticipant(p);

      // если уже есть опубликованный видео-трек
      const pub = [...p.videoTrackPublications.values()].find(x => x.track);
      if (pub && pub.track) {
        vm.videoStream = new MediaStream([pub.track.mediaStreamTrack]);
        vm.hasVideo = true;
      } else {
        vm.videoStream = undefined;
        vm.hasVideo = false; // 🔹 в этом случае на фронте покажется заглушка
      }
    }

    this.emit();
  }

  async startMedia() {
    if (!this.room) return;

    try {
      // 1) LiveKit просит явно дернуть startAudio из обработчика жеста
      await this.room.startAudio();
      console.log('[LK] AudioContext started');

      // 2) Пробуем запустить все видео на странице
      document.querySelectorAll('video').forEach(v => {
        // локальное обычно muted, remote — нет
        v.play().catch(err => {
          console.warn('[video] play() after user gesture failed:', err);
        });
      });
    } catch (e) {
      console.error('[LK] startMedia error', e);
    }
  }


  // ===== EVENTS =====
  private bindRoomEvents() {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, p => {
      // @ts-ignore
      if (p.isLocal) return;

      console.log("ParticipantConnected", p.identity);
      this.ensureParticipant(p);
      this.emit();
    });

    this.room.on(RoomEvent.ParticipantDisconnected, p => {
      // @ts-ignore
      if (p.isLocal) return;

      console.log('[LK] ParticipantDisconnected', p.identity);
      this.participants.delete(p.identity);
      this.emit();
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, pub, p) => {
      console.log('[REMOTE] track subscribed', track.sid, track.kind);
// если видео
      if (track.kind === Track.Kind.Video) {
        // если устройство - мобильное → занижаем качество
        if (this.isMobile) {
          pub.setVideoQuality(1); // low / medium / high
        }
      }
      // ❗ игнорируем локального участника
      // @ts-ignore
      if (p.isLocal) return;
      if (track.kind !== Track.Kind.Video) return;

      const vm = this.ensureParticipant(p);
      vm.hasVideo = true;
      vm.videoStream = new MediaStream([track.mediaStreamTrack]);
      this.emit();
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
      // @ts-ignore
      if (participant.isLocal) return;
      if (track.kind !== Track.Kind.Video) return;

      console.log('[LK] TrackUnsubscribed video from', participant.identity);

      const vm = this.participants.get(participant.identity);
      if (!vm) return;

      vm.videoStream = undefined;
      vm.hasVideo = false;
      this.emit();
    });

    // камера выключена (mute), трек остаётся
    // @ts-ignore
    this.room.on(RoomEvent.TrackMuted, (pub: RemoteTrackPublication, p: RemoteParticipant) => {
      console.log('[REMOTE] track muted', pub.kind, 'from', p.identity);

      // @ts-ignore
      if (p.isLocal) return;   // <--- вот эта строка важна

      if (pub.kind !== Track.Kind.Video) return;
      console.log('[LK] TrackMuted (video) from', p.identity);

      const vm = this.participants.get(p.identity);
      if (!vm) return;

      vm.hasVideo = false;
      vm.videoStream = undefined;
      this.emit();
    });

    // камера включена обратно (unmute)
    // @ts-ignore
    this.room.on(RoomEvent.TrackUnmuted, (pub: RemoteTrackPublication, p: RemoteParticipant) => {
      console.log('[REMOTE] track unmuted', pub.kind, 'from', p.identity);

      // @ts-ignore
      if (p.isLocal) return;   // <--- вот эта строка важна

      if (pub.kind !== Track.Kind.Video) return;
      console.log('[LK] TrackUnmuted (video) from', p.identity);

      const track = pub.track as RemoteVideoTrack | null;
      if (!track) return;

      const vm = this.ensureParticipant(p);
      vm.videoStream = new MediaStream([track.mediaStreamTrack]);
      vm.hasVideo = true;
      this.emit();
    });
  }

  private addParticipant(p: RemoteParticipant) {
    this.participants.set(p.identity, {
      id: p.identity,
      name: p.name,
      hasVideo: false,
      videoStream: undefined
    });
  }

  private ensureParticipant(p: RemoteParticipant): ParticipantVM {
    if (!this.participants.has(p.identity)) {
      this.addParticipant(p);
    }
    return this.participants.get(p.identity)!;
  }

  private emit() {
    this.participants$.next([...this.participants.values()]);
  }


  async enableCamera() {
    if (!this.room) return;

    // Если трек уже есть — сначала закрыть
    if (this.localVideoTrack) {
      this.disableCamera();
    }

    // 1️⃣ Создаём локальный видеотрек (БЕЗ simulcast)
    const track = await createLocalVideoTrack({
      resolution: { width: 1280, height: 720 },
      facingMode: 'user',
    });

    // 2️⃣ Публикуем его с simulcast
    await this.room.localParticipant.publishTrack(track, {
      simulcast: true,     // ← simulcast указывается ТОЛЬКО здесь!
    });

    // 3️⃣ Сохраняем локальный предпросмотр
    this.localVideoTrack = track;
    this.localVideoStream = new MediaStream([
      track.mediaStreamTrack
    ]);
  }

  disableCamera() {
    if (!this.room) return;

    // 1️⃣ Отписываем трек у участника
    this.room.localParticipant.videoTrackPublications.forEach(pub => {
      if (pub.track) {
        this.room!.localParticipant.unpublishTrack(pub.track);
      }
    });

    // 2️⃣ Останавливаем сам медиатрек (важно!)
    if (this.localVideoTrack) {
      this.localVideoTrack.mediaStreamTrack.stop();
    }

    // 3️⃣ Чистим локальные ссылки
    this.localVideoTrack = undefined;
    this.localVideoStream = null;
  }


  async enableMic() {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(true);

    this.localAudioTrack =
      [...this.room.localParticipant.audioTrackPublications.values()]
        .find(p => p.track)?.track as LocalAudioTrack | undefined;
  }

  setMicMuted(mute: boolean) {
    this.room?.localParticipant.setMicrophoneEnabled(!mute);
  }

  async toggleScreenShare(enable: boolean) {
    await this.room?.localParticipant.setScreenShareEnabled(enable);
  }


  getLocalVideoStream(): MediaStream | null {
    return this.localVideoStream;
  }


  leaveRoom() {
    if (this.room) {
      console.log('[LK] leaveRoom, disconnect');
      this.room.disconnect();
    }
    this.room = undefined;
    this.localVideoTrack = undefined;
    this.localAudioTrack = undefined;
    this.participants.clear();
    this.emit();
  }
}
