import {EventEmitter, Injectable} from '@angular/core';
import {io} from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class VideoChatService {
  private socket = io("https://chat-cignalserver.onrender.com");
  private peers: { [id: string]: RTCPeerConnection } = {};
  public localStream?: MediaStream;

  public remoteVideoAdded = new EventEmitter<MediaStream>();
  isScreenSharing = false;

  /** Инициализация: только аудио, камера по умолчанию выключена */
  async initLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: false, // камера НЕ включена
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      this.localStream.getAudioTracks().forEach(t => t.enabled = false);
    } catch (e) {
      console.warn("Нет доступа к аудио. Работаем без локального звука.");
      this.localStream = new MediaStream(); // пустой стрим, чтобы WebRTC работал
    }
  }

  /** Включить камеру вручную */
  async enableCamera(videoElement: HTMLVideoElement) {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = camStream.getVideoTracks()[0];

      this.localStream!.addTrack(videoTrack);
      videoElement.srcObject = this.localStream!;

      // обновляем видео для всех пиров
      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(videoTrack);
        else pc.addTrack(videoTrack, this.localStream!);
      }

      return true;
    } catch (e) {
      console.error("Камера недоступна:", e);
      return false;
    }
  }

  /** Выключить камеру */
  disableCamera() {
    const track = this.localStream?.getVideoTracks()[0];
    if (track) track.stop();
    if (track) this.localStream!.removeTrack(track);

    for (const pc of Object.values(this.peers)) {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(null as any);
    }
  }

  join(room: string) {
    this.socket.emit("join", room);

    this.socket.on("new-user", async (id: string) => {
      console.log("🔥 new-user получен:", id, "мой socket.id:", this.socket.id);

      if (id === this.socket.id) {
        console.log("Игнор self-connection");
        return; // ❗ Не соединяемся сами с собой!
      }

      const pc = this.createPeerConnection(id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit("offer", { to: id, sdp: offer });
    });


    // @ts-ignore
    this.socket.on("offer", async ({ from, sdp }) => {
      if (from === this.socket.id) return;

      const pc = this.createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit("answer", { to: from, sdp: answer });
    });


    // @ts-ignore
    this.socket.on("answer", async ({ from, sdp }) => {
      if (from === this.socket.id) return;

      await this.peers[from].setRemoteDescription(new RTCSessionDescription(sdp));
    });


    // @ts-ignore
    this.socket.on("candidate", async ({ from, candidate }) => {
      if (from === this.socket.id) return;

      if (this.peers[from]) {
        try {
          await this.peers[from].addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Ошибка ICE:", err);
        }
      }
    });
  }

  private createPeerConnection(id: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // добавляем только доступные треки
    this.localStream?.getTracks().forEach(track =>
      pc.addTrack(track, this.localStream!)
    );

    pc.onicecandidate = e => {
      if (e.candidate) {
        this.socket.emit("candidate", { to: id, candidate: e.candidate });
      }
    };

    pc.ontrack = e => {
      const stream = e.streams[0];

      const remoteAudioTracks = stream.getAudioTracks();
      const localAudioTrack = this.localStream?.getAudioTracks()[0];

      // 🔥 Мьютим только свой собственный звук
      if (localAudioTrack) {
        remoteAudioTracks.forEach(t => {
          if (t.id === localAudioTrack.id) {
            console.log("🔇 Отключаю собственный звук");
            t.enabled = false;
          }
        });
      }

      this.remoteVideoAdded.emit(stream);
    };


    this.peers[id] = pc;
    return pc;
  }

  leaveRoom() {
    console.log("Leaving room...");

    // 1. Закрыть peer connections
    for (const id of Object.keys(this.peers)) {
      try {
        this.peers[id].ontrack = null;
        this.peers[id].onicecandidate = null;
        this.peers[id].close();
      } catch {}
      delete this.peers[id];
    }

    // 2. Остановить локальные треки
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
    }
    this.localStream = undefined;

    // 3. Отключиться от комнаты
    this.socket.emit("leave");

    // 4. Закрыть сокет
    try { this.socket.disconnect(); } catch {}

    console.log("Left room fully.");
  }

}
