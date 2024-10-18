const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const videoGrid = document.getElementById('video-grid'); // For multiple remote videos

let localStream;
let peerConnections = {};  // Store peer connections for all other users
const socket = io();  // Connect to the signaling server

const configuration = {
    iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "639755bf2dd00a5d826179c2",
          credential: "gA8byyIXeomfwbeW",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "639755bf2dd00a5d826179c2",
          credential: "gA8byyIXeomfwbeW",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "639755bf2dd00a5d826179c2",
          credential: "gA8byyIXeomfwbeW",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "639755bf2dd00a5d826179c2",
          credential: "gA8byyIXeomfwbeW",
        },
    ],
};

// Automatically join the room when the page loads
window.onload = start;

hangupButton.onclick = hangup;

async function start() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (e) {
        console.error('Error accessing media devices.', e);
    }
    joinRoom();
}

// Join the room and initialize connections to other users
function joinRoom() {
    const room = 'webrtc-room';  // Static room name for simplicity
    socket.emit('join-room', room);
}

socket.on('new-user', (socketId) => {
    // A new user joined the room, create a connection to them
    createPeerConnection(socketId, true);  // `true` because we are initiating the connection
});

socket.on('offer', async (offer, socketId) => {
    console.log(`Received offer from ${socketId}`);
    await createPeerConnection(socketId, false);  // `false` because we are responding to the offer
    await peerConnections[socketId].setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await peerConnections[socketId].createAnswer();
    await peerConnections[socketId].setLocalDescription(answer);

    socket.emit('answer', answer, socketId);  // Send answer back to the offerer
});

socket.on('answer', async (answer, socketId) => {
    console.log(`Received answer from ${socketId}`);
    await peerConnections[socketId].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (candidate, socketId) => {
    console.log(`Received ICE candidate from ${socketId}`);
    try {
        await peerConnections[socketId].addIceCandidate(candidate);
    } catch (e) {
        console.error('Error adding ICE candidate:', e);
    }
});

socket.on('user-disconnected', (socketId) => {
    console.log(`User ${socketId} disconnected`);
    if (peerConnections[socketId]) {
        peerConnections[socketId].close();
        delete peerConnections[socketId];
        // Optionally, remove the video element for the disconnected user
    }
});

async function createPeerConnection(socketId, isInitiator) {
    peerConnections[socketId] = new RTCPeerConnection(configuration);

    // Add local stream to each peer connection
    localStream.getTracks().forEach(track => peerConnections[socketId].addTrack(track, localStream));

    // When a remote stream is added, create a new video element for it
    peerConnections[socketId].ontrack = (event) => {
        // Check if a video element for this stream already exists
        let remoteVideo = document.getElementById(`remoteVideo-${socketId}`);
        
        if (!remoteVideo) {
            // Create a new video element if it doesn't exist
            remoteVideo = document.createElement('video');
            remoteVideo.autoplay = true;
            remoteVideo.id = `remoteVideo-${socketId}`;

            const videoContainer = document.createElement('div');
            videoContainer.classList.add('video-container');
            const videoLabel = document.createElement('p');
            videoLabel.classList.add('video-label');
            videoLabel.innerText = remoteVideo.id;
            videoContainer.appendChild(remoteVideo);
            videoContainer.appendChild(videoLabel);
            videoGrid.append(videoContainer);  
  
        }
        
        // Set the remote stream as the video source if not already set
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    // Handle ICE candidates
    peerConnections[socketId].onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, socketId);
        }
    };

    // If this is the user initiating the connection, create and send an offer
    if (isInitiator) {
        const offer = await peerConnections[socketId].createOffer();
        await peerConnections[socketId].setLocalDescription(offer);
        socket.emit('offer', offer, 'webrtc-room', socketId);
    }
}

function hangup() {
    // Close all peer connections and clean up
    for (let socketId in peerConnections) {
        peerConnections[socketId].close();
        delete peerConnections[socketId];
    }
    console.log('Call ended');
}
