import { Injectable, EventEmitter } from '@angular/core';
import { io } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class VideoChatService {
  private socket = io("https://chat-cignalserver.onrender.com");
  private peers: { [id: string]: RTCPeerConnection } = {};
  private localStream?: MediaStream;

  public remoteVideoAdded = new EventEmitter<MediaStream>();

  async initLocalVideo(videoElement: HTMLVideoElement) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    videoElement.srcObject = this.localStream;
    videoElement.muted = true; // не слышим себя
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
