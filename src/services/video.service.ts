import { Injectable, EventEmitter } from '@angular/core';
import { io } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class VideoChatService {
  private socket = io("https://chat-cignalserver.onrender.com");
  private peers: { [id: string]: RTCPeerConnection } = {};
  private localStream?: MediaStream;

  public remoteVideoAdded = new EventEmitter<MediaStream>();

  async initLocalVideo(videoElement: HTMLVideoElement) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoElement.srcObject = this.localStream;
    videoElement.muted = true; // 🔑 обязательно, чтобы не слышать себя
  }

  join(room: string) {
    this.socket.emit("join", room);

    this.socket.on("new-user", async (id: string) => {
      const pc = this.createPeerConnection(id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit("offer", { to: id, sdp: offer });
    });

    // @ts-ignore
    this.socket.on("offer", async ({ from, sdp }) => {
      const pc = this.createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit("answer", { to: from, sdp: answer });
    });

    // @ts-ignore
    this.socket.on("answer", async ({ from, sdp }) => {
      await this.peers[from].setRemoteDescription(new RTCSessionDescription(sdp));
    });

    // @ts-ignore
    this.socket.on("candidate", async ({ from, candidate }) => {
      await this.peers[from].addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  private createPeerConnection(id: string) {
    const pc = new RTCPeerConnection();
    this.localStream?.getTracks().forEach(track => pc.addTrack(track, this.localStream!));

    pc.onicecandidate = e => {
      if (e.candidate) {
        this.socket.emit("candidate", { to: id, candidate: e.candidate });
      }
    };

    pc.ontrack = e => {

      this.remoteVideoAdded.emit(e.streams[0]);
    };

    this.peers[id] = pc;
    return pc;
  }
}
