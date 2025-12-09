import { Injectable, EventEmitter } from '@angular/core';
import { io } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class VideoChatService {
  private socket = io("https://chat-cignalserver.onrender.com");
  private peers: { [id: string]: RTCPeerConnection } = {};
  public localStream?: MediaStream;

  public remoteVideoAdded = new EventEmitter<MediaStream>();
  isScreenSharing = false;

  async initLocalVideo(videoElement: HTMLVideoElement, withVideo: boolean = true): Promise<MediaStream> {
    if (this.localStream) {
      videoElement.srcObject = this.localStream;
      return this.localStream;
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: withVideo,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false // отключаем автоусиление, чтобы не влияло на громкость
      }
    });

    videoElement.srcObject = this.localStream;
    videoElement.muted = true;
    return this.localStream;
  }


  join(room: string) {
    this.socket.emit("join", room);

    this.socket.on("new-user", async (id: string) => {
      const pc = this.createPeerConnection(id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit("offer", { to: id, sdp: offer });
    });

    this.socket.on("offer", async ({ from, sdp }) => {
      const pc = this.createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit("answer", { to: from, sdp: answer });
    });

    this.socket.on("answer", async ({ from, sdp }) => {
      await this.peers[from].setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on("candidate", async ({ from, candidate }) => {
      if (this.peers[from]) {
        try {
          await this.peers[from].addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Ошибка ICE:", err);
        }
      }
    });
    this.socket.on("user-disconnected", (id: string) => {
      console.log("Пользователь отключился:", id);

      // Закрываем peer-соединение
      const pc = this.peers[id];
      if (pc) {
        pc.close();
        delete this.peers[id];
      }

      // Удаляем его поток из списка отображаемых
      this.remoteVideoAdded.emit(null!);
    });
  }
  async toggleScreenShare() {
    if (this.isScreenSharing) {
      if (!this.localStream) return;
      const cameraTrack = this.localStream.getVideoTracks()[0];
      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(cameraTrack);
      }

      this.isScreenSharing = false;
      this.remoteVideoAdded.emit(null!); // вернёмся в p2p
    } else {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(screenTrack);
      }

      this.isScreenSharing = true;
      this.remoteVideoAdded.emit(Object.assign(screenStream, { isScreen: true }));

      screenTrack.onended = async () => {
        if (!this.localStream) return;
        const cameraTrack = this.localStream.getVideoTracks()[0];
        for (const pc of Object.values(this.peers)) {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(cameraTrack);
        }
        this.isScreenSharing = false;
        this.remoteVideoAdded.emit(null!);
      };
    }
  }





  private createPeerConnection(id: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

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
      if (this.localStream && stream.id === this.localStream.id) return;

      // определяем: экран или камера
      if (stream.getVideoTracks()[0]?.label.toLowerCase().includes("screen")) {
        this.remoteVideoAdded.emit(Object.assign(stream, { isScreen: true }));
      } else {
        this.remoteVideoAdded.emit(stream);
      }
    };

    this.peers[id] = pc;
    return pc;
  }
}

