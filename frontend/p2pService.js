// Serviço P2P para jogos de turnos usando WebRTC
// Uso: importar e instanciar P2PService

export default class P2PService {
  constructor(signalingUrl, salaId, onData, onOpen, onClose, onError) {
    this.signalingUrl = signalingUrl;
    this.salaId = salaId;
    this.onData = onData;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.socket = null;
    this.peer = null;
    this.dataChannel = null;
    this.isOfferer = false;
  }

  connect() {
    this.socket = new WebSocket(this.signalingUrl);
    this.socket.onopen = () => {
      this.socket.send(JSON.stringify({ type: 'join', sala: this.salaId }));
    };
    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'init') {
        this.isOfferer = msg.isOfferer;
        this._startPeer();
        if (this.isOfferer) this._createOffer();
      } else if (msg.type === 'signal') {
        this._handleSignal(msg.data);
      }
    };
    this.socket.onerror = this.onError;
    this.socket.onclose = this.onClose;
  }

  _startPeer() {
    this.peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.peer.onicecandidate = (e) => {
      if (e.candidate) {
        this._sendSignal({ candidate: e.candidate });
      }
    };
    if (this.isOfferer) {
      this.dataChannel = this.peer.createDataChannel('game');
      this._setupDataChannel();
    } else {
      this.peer.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this._setupDataChannel();
      };
    }
    this.peer.onconnectionstatechange = () => {
      if (this.peer.connectionState === 'connected' && this.onOpen) this.onOpen();
      if (this.peer.connectionState === 'disconnected' && this.onClose) this.onClose();
    };
  }

  _setupDataChannel() {
    this.dataChannel.onopen = () => { if (this.onOpen) this.onOpen(); };
    this.dataChannel.onclose = () => { if (this.onClose) this.onClose(); };
    this.dataChannel.onerror = this.onError;
    this.dataChannel.onmessage = (e) => {
      if (this.onData) this.onData(JSON.parse(e.data));
    };
  }

  async _createOffer() {
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    this._sendSignal({ sdp: this.peer.localDescription });
  }

  async _createAnswer() {
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    this._sendSignal({ sdp: this.peer.localDescription });
  }

  async _handleSignal(data) {
    if (data.sdp) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === 'offer') {
        await this._createAnswer();
      }
    } else if (data.candidate) {
      await this.peer.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  _sendSignal(data) {
    this.socket.send(JSON.stringify({ type: 'signal', sala: this.salaId, data }));
  }

  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  close() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.peer) this.peer.close();
    if (this.socket) this.socket.close();
  }
} 