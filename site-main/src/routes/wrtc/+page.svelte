<script>
    let localStream;
    let remoteVideo;
    let pc;
    let socket;
    async function start(isBroadcaster) {
      socket = new WebSocket("ws://192.168.1.140:8080"); // ← replace this with actual IP
  
      pc = new RTCPeerConnection();
  
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.send(JSON.stringify({ type: 'candidate', candidate }));
      };
  
      pc.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        };
  
      socket.onmessage = async (event) => {
        let msg;

        if (typeof event.data === "string") {
            msg = JSON.parse(event.data);
        } else if (event.data instanceof Blob) {
            const text = await event.data.text();
            msg = JSON.parse(text);
        } else {
            console.warn("Unknown message type:", event.data);
            return;
        }
  
        if (msg.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: 'answer', answer }));
        } else if (msg.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        } else if (msg.type === 'candidate') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (e) { console.error(e); }
        }
      };
  
      if (isBroadcaster) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.send(JSON.stringify({ type: 'offer', offer }));
      }
    }
  </script>
  
  <main>
    <h1>WebRTC Broadcast</h1>
    <button on:click={() => start(true)}>Start Broadcast</button>
    <button on:click={() => start(false)}>View Stream</button>
    <video bind:this={remoteVideo} autoplay playsinline></video>
  </main>
  
  <style>
    video {
      width: 100%;
      max-height: 60vh;
      background: black;
    }
  </style>
  