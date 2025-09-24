import { Injectable, EventEmitter } from '@angular/core';
import { io } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class VideoChatService {
  private socket = io("https://chat-cignalserver.onrender.com");
  private peers: { [id: string]: RTCPeerConnection } = {};
  private localStream?: MediaStream;

  public remoteVideoAdded = new EventEmitter<MediaStream>();
  private localVideoElement?: HTMLVideoElement;

  async initLocalVideo(videoElement: HTMLVideoElement) {
    this.localVideoElement = videoElement; // 🔑 сохранили
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    videoElement.srcObject = this.localStream;
    videoElement.muted = true;
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
  }

  isScreenSharing = false;

  async toggleScreenShare() {
    if (this.isScreenSharing) {
      // вернуть камеру
      if (!this.localStream || !this.localVideoElement) return;
      const cameraTrack = this.localStream.getVideoTracks()[0];

      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(cameraTrack);
      }

      // 🔑 вернуть отображение камеры в localVideo
      this.localVideoElement.srcObject = this.localStream;

      this.isScreenSharing = false;
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        for (const pc of Object.values(this.peers)) {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        }

        // 🔑 показать экран локально
        if (this.localVideoElement) {
          this.localVideoElement.srcObject = screenStream;
        }

        // если пользователь сам закрыл шаринг
        screenTrack.onended = () => this.toggleScreenShare();

        this.isScreenSharing = true;
      } catch (err) {
        console.error("Ошибка при шаринге экрана:", err);
      }
    }
  }



  async shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      for (const pc of Object.values(this.peers)) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => this.stopScreenShare();
    } catch (err) {
      console.error("Ошибка при шаринге экрана:", err);
    }
  }

  private stopScreenShare() {
    if (!this.localStream) return;
    const cameraTrack = this.localStream.getVideoTracks()[0];
    for (const pc of Object.values(this.peers)) {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(cameraTrack);
    }
  }


  private createPeerConnection(id: string) {
    // 🔑 добавляем STUN сервер
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // прикрепляем локальные треки
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
      // 🔑 защита: не добавлять свой же поток
      if (this.localStream && stream.id === this.localStream.id) return;
      this.remoteVideoAdded.emit(stream);
    };

    this.peers[id] = pc;
    return pc;
  }
}
