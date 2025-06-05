const callButton = document.getElementById('callButton');
const localVideo = document.getElementById('localVideo');
const leaveMeetingButton = document.getElementById('leave-meeting');
const videoGrid = document.getElementById('video-grid');

let localStream1;
let localStream2;

let peerConnections = {};
const socket = io();

let userOrder;
let positionSet = false;
let position;

const switchCameraButton = document.getElementById('switchCameraButton');
let isStream1Primary = true;


// const configuration = {
//     iceServers: [
//         {
//           urls: "turn:150.136.172.70",
//           username: "guest",
//           credential: "somepassword",
//         },
//         {
//           urls: "turn:150.136.172.70?transport=tcp",
//           username: "guest",
//           credential: "somepassword",
//         }

//     ],
//     iceTransportPolicy: "relay",
// };

const configuration = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "7441ca2e7cc0f1b0ffbdc41f",
            credential: "SOTwjWXK9OdAQkgS",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "7441ca2e7cc0f1b0ffbdc41f",
            credential: "SOTwjWXK9OdAQkgS",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "7441ca2e7cc0f1b0ffbdc41f",
            credential: "SOTwjWXK9OdAQkgS",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "7441ca2e7cc0f1b0ffbdc41f",
            credential: "SOTwjWXK9OdAQkgS",
        },
    ],
};

window.onload = start;

leaveMeetingButton.onclick = leaveMeeting;

let availableCameras = [];
let selectedCameras = { left: null, right: null };
let currentClickedVideo = null;

const cameraSelectionModalHTML = `
<div id="cameraSelectionModal" class="modal hidden">
    <div class="modal-content">
        <button id="closeCameraModal" class="close-btn">&times;</button>
        <h6 class="main__header">Select Camera</h6>
        <div id="cameraList" class="camera-list">
            <!-- Camera options will be populated here -->
        </div>
    </div>
</div>`;

const cameraModalCSS = `
.camera-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 15px;
}

.camera-option {
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    background: #f9f9f9;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
}

.camera-option:hover {
    border-color: #007bff;
    background: #e7f3ff;
}

.camera-option.selected {
    background: #e7f3ff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.camera-option.in-use {
    border-color: #28a745;
    background: #d4edda;
}

.camera-preview {
    width: 80px;
    height: 60px;
    border-radius: 4px;
    object-fit: cover;
}

.camera-info {
    flex: 1;
}

.camera-name {
    font-weight: bold;
    margin-bottom: 4px;
}

.camera-status {
    font-size: 12px;
    color: #666;
}
`;

async function start() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');

        console.log('Available cameras:', availableCameras);

        if (availableCameras.length >= 2) {
            selectedCameras.left = availableCameras[0].deviceId;
            selectedCameras.right = availableCameras[1].deviceId;
        } else if (availableCameras.length === 1) {
            selectedCameras.left = availableCameras[0].deviceId;
            selectedCameras.right = availableCameras[0].deviceId;
        } else {
            selectedCameras.left = undefined;
            selectedCameras.right = undefined;
        }

        await initializeCameraStreams();

        setupVideoClickListeners();

        insertCameraModal();

        setupOutputDeviceSelection();

    } catch (e) {
        console.error('Error accessing media devices.', e);
    }
    joinRoom();
}
let currentOutputDeviceId = null;
let audioOutputDevices = [];

function setupOutputDeviceSelection() {
    const settings = document.getElementById('settings_block');

    settings.addEventListener('click', () => showOutputDeviceModal());
}



async function showOutputDeviceModal() {
    const modal = document.getElementById('outputDeviceModal');
    const deviceList = document.getElementById('outputDeviceList');

    deviceList.innerHTML = '';

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');

        if (audioOutputDevices.length === 0) {
            deviceList.innerHTML = '<p>No audio output devices found or permission denied.</p>';
        } else {
            audioOutputDevices.forEach(device => {
                const deviceOption = document.createElement('div');
                deviceOption.className = 'output-device-option';
                deviceOption.textContent = device.label || `Audio Device ${device.deviceId.substring(0, 8)}`;
                deviceOption.dataset.deviceId = device.deviceId;

                if (device.deviceId === currentOutputDeviceId) {
                    deviceOption.classList.add('selected');
                }

                deviceOption.addEventListener('click', () => selectOutputDevice(device.deviceId, deviceOption));
                deviceList.appendChild(deviceOption);
            });
        }
    } catch (error) {
        console.log('Error enumerating devices:', error);
        deviceList.innerHTML = '<p>Error accessing audio devices. Please check permissions.</p>';
    }

    modal.style.display = 'block';
}

async function selectOutputDevice(deviceId, element) {
    document.querySelectorAll('.output-device-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    currentOutputDeviceId = deviceId;

    await applyOutputDeviceToAllAudio(deviceId);

    console.log('Output device changed to:', deviceId);
}

async function applyOutputDeviceToAllAudio(deviceId) {
    const allVideos = document.querySelectorAll('video');

    for (const video of allVideos) {
        if (video.setSinkId && typeof video.setSinkId === 'function') {
            try {
                await video.setSinkId(deviceId);
                console.log(`Applied output device to video element: ${video.id}`);
            } catch (error) {
                console.error(`Failed to set sink ID for ${video.id}:`, error);
            }
        }
    }
}

async function testAudio() {
    const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmccDjiTzOzLdSMFLIHN6pFSGAhFi9bvzb8gKSVJiNqwRjcQD3+80erZ9x8l6Q==');

    if (currentOutputDeviceId && testAudio.setSinkId) {
        try {
            await testAudio.setSinkId(currentOutputDeviceId);
            testAudio.play();
        } catch (error) {
            console.error('Error playing test audio:', error);
            testAudio.play();
        }
    } else {
        testAudio.play();
    }
}

document.getElementById('closeOutputDeviceModal').addEventListener('click', () => {
    document.getElementById('outputDeviceModal').style.display = 'none';
});

document.getElementById('testAudioButton').addEventListener('click', testAudio);

document.getElementById('outputDeviceModal').addEventListener('click', (e) => {
    if (e.target.id === 'outputDeviceModal') {
        document.getElementById('outputDeviceModal').style.display = 'none';
    }
});

async function initializeCameraStreams() {
    try {
        if (localStream1) {
            localStream1.getTracks().forEach(track => track.stop());
        }
        if (localStream2) {
            localStream2.getTracks().forEach(track => track.stop());
        }

        const constraints1 = {
            video: selectedCameras.left ? { deviceId: selectedCameras.left } : true,
            audio: { echoCancellation: true }
        };

        const constraints2 = {
            video: selectedCameras.right ? { deviceId: selectedCameras.right } : true,
            audio: { echoCancellation: true }
        };

        localStream1 = await navigator.mediaDevices.getUserMedia(constraints1);
        localStream2 = await navigator.mediaDevices.getUserMedia(constraints2);

        const localVideo1 = document.getElementById('localVideo1');
        const localVideo2 = document.getElementById('localVideo2');

        localVideo1.srcObject = localStream1;
        localVideo2.srcObject = localStream2;

        console.log('Camera streams initialized successfully');

        updatePeerConnections();

    } catch (e) {
        console.error('Error initializing camera streams:', e);
    }
}

function setupVideoClickListeners() {
    const localVideo1 = document.getElementById('localVideo1');
    const localVideo2 = document.getElementById('localVideo2');

    localVideo1.addEventListener('click', () => {
        currentClickedVideo = 'left';
        openCameraSelectionModal();
    });

    localVideo2.addEventListener('click', () => {
        currentClickedVideo = 'right';
        openCameraSelectionModal();
    });

    localVideo1.style.cursor = 'pointer';
    localVideo2.style.cursor = 'pointer';

    localVideo1.addEventListener('mouseenter', () => {
        localVideo1.style.opacity = '0.8';
    });
    localVideo1.addEventListener('mouseleave', () => {
        localVideo1.style.opacity = '1';
    });

    localVideo2.addEventListener('mouseenter', () => {
        localVideo2.style.opacity = '0.8';
    });
    localVideo2.addEventListener('mouseleave', () => {
        localVideo2.style.opacity = '1';
    });
}

function insertCameraModal() {
    document.body.insertAdjacentHTML('beforeend', cameraSelectionModalHTML);

    const style = document.createElement('style');
    style.textContent = cameraModalCSS;
    document.head.appendChild(style);

    document.getElementById('closeCameraModal').addEventListener('click', closeCameraSelectionModal);

    document.getElementById('cameraSelectionModal').addEventListener('click', (e) => {
        if (e.target.id === 'cameraSelectionModal') {
            closeCameraSelectionModal();
        }
    });
}

async function openCameraSelectionModal() {
    const modal = document.getElementById('cameraSelectionModal');
    const cameraList = document.getElementById('cameraList');

    cameraList.innerHTML = '';

    for (let i = 0; i < availableCameras.length; i++) {
        const camera = availableCameras[i];
        const option = document.createElement('div');
        option.className = 'camera-option';
        option.dataset.deviceId = camera.deviceId;

        const isCurrentlySelected = (currentClickedVideo === 'left' && selectedCameras.left === camera.deviceId) ||
            (currentClickedVideo === 'right' && selectedCameras.right === camera.deviceId);

        const isInUseByOther = (currentClickedVideo === 'left' && selectedCameras.right === camera.deviceId) ||
            (currentClickedVideo === 'right' && selectedCameras.left === camera.deviceId);

        if (isCurrentlySelected) {
            option.classList.add('selected');
        }
        if (isInUseByOther) {
            option.classList.add('in-use');
        }

        const preview = document.createElement('video');
        preview.className = 'camera-preview';
        preview.autoplay = true;
        preview.muted = true;

        try {
            const previewStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: camera.deviceId },
                audio: false
            });
            preview.srcObject = previewStream;

            preview.addEventListener('loadedmetadata', () => {
                setTimeout(() => {
                    if (previewStream) {
                        previewStream.getTracks().forEach(track => track.stop());
                    }
                }, 3000); 
            });
        } catch (e) {
            console.error('Error getting camera preview:', e);
        }

        const info = document.createElement('div');
        info.className = 'camera-info';

        const name = document.createElement('div');
        name.className = 'camera-name';
        name.textContent = camera.label || `Camera ${i + 1}`;

        const status = document.createElement('div');
        status.className = 'camera-status';
        if (isCurrentlySelected) {
            status.textContent = 'Currently selected';
        } else if (isInUseByOther) {
            status.textContent = `In use by ${currentClickedVideo === 'left' ? 'right' : 'left'} stream`;
        } else {
            status.textContent = 'Available';
        }

        info.appendChild(name);
        info.appendChild(status);

        option.appendChild(preview);
        option.appendChild(info);

        option.addEventListener('click', () => selectCamera(camera.deviceId));

        cameraList.appendChild(option);
    }

    modal.classList.remove('hidden');
    modal.style.display = 'block';
}

function closeCameraSelectionModal() {
    const modal = document.getElementById('cameraSelectionModal');
    modal.classList.add('hidden');
    modal.style.display = 'none';

    const previews = modal.querySelectorAll('.camera-preview');
    previews.forEach(preview => {
        if (preview.srcObject) {
            preview.srcObject.getTracks().forEach(track => track.stop());
        }
    });
}

async function selectCamera(deviceId) {
    if (!currentClickedVideo) return;

    selectedCameras[currentClickedVideo] = deviceId;

    console.log(`Selected camera for ${currentClickedVideo} stream:`, deviceId);

    closeCameraSelectionModal();

    await initializeCameraStreams();
}

async function updatePeerConnections() {
    const promises = Object.keys(peerConnections).map(async (socketId) => {
        const peerConnection = peerConnections[socketId];

        try {
            const senders = peerConnection.getSenders();

            const left = pickCamera(socketId);
            const streamToSend = left ?
                (isStream1Primary ? localStream1 : localStream2) :
                (isStream1Primary ? localStream2 : localStream1);

            const videoTrack = streamToSend.getVideoTracks()[0];
            const audioTrack = streamToSend.getAudioTracks()[0];

            for (const sender of senders) {
                if (sender.track) {
                    if (sender.track.kind === 'video' && videoTrack) {
                        await sender.replaceTrack(videoTrack);
                        console.log(`Replaced video track for ${socketId}`);
                    } else if (sender.track.kind === 'audio' && audioTrack) {
                        await sender.replaceTrack(audioTrack);
                        console.log(`Replaced audio track for ${socketId}`);
                    }
                }
            }

        } catch (error) {
            console.error(`Error updating peer connection for ${socketId}:`, error);

            await recreatePeerConnection(socketId);
        }
    });

    await Promise.all(promises);
    console.log('Updated all peer connections with new camera streams');
}

async function recreatePeerConnection(socketId) {
    console.log(`Recreating peer connection for ${socketId}`);

    if (peerConnections[socketId]) {
        peerConnections[socketId].close();
    }

    await createPeerConnection(socketId, true);

    const offer = await peerConnections[socketId].createOffer();
    await peerConnections[socketId].setLocalDescription(offer);
    socket.emit('offer', offer, 'webrtc-room', socketId);
}

function switchCamera() {
    if (!localStream1 || !localStream2) {
        console.error('Local streams are not initialized.');
        return;
    }

    isStream1Primary = !isStream1Primary;

    const localVideo1 = document.getElementById('localVideo1');
    const localVideo2 = document.getElementById('localVideo2');

    localVideo1.srcObject = isStream1Primary ? localStream1 : localStream2;
    localVideo2.srcObject = isStream1Primary ? localStream2 : localStream1;

    console.log('Switched cameras: Stream 1 is now', isStream1Primary ? 'localStream1' : 'localStream2');

    updatePeerConnections();
}

function addCameraLabels() {
    const leftLabel = document.createElement('div');
    leftLabel.style.position = 'absolute';
    leftLabel.style.top = '5px';
    leftLabel.style.left = '5px';
    leftLabel.style.background = 'rgba(0,0,0,0.7)';
    leftLabel.style.color = 'white';
    leftLabel.style.padding = '2px 6px';
    leftLabel.style.borderRadius = '3px';
    leftLabel.style.fontSize = '12px';
    leftLabel.style.zIndex = '10';
    leftLabel.textContent = 'Left Camera';
    leftLabel.id = 'leftCameraLabel';

    const rightLabel = document.createElement('div');
    rightLabel.style.position = 'absolute';
    rightLabel.style.top = '5px';
    rightLabel.style.right = '5px';
    rightLabel.style.background = 'rgba(0,0,0,0.7)';
    rightLabel.style.color = 'white';
    rightLabel.style.padding = '2px 6px';
    rightLabel.style.borderRadius = '3px';
    rightLabel.style.fontSize = '12px';
    rightLabel.style.zIndex = '10';
    rightLabel.textContent = 'Right Camera';
    rightLabel.id = 'rightCameraLabel';

    const selfVideoGrid = document.getElementById('self-video-grid');
    if (selfVideoGrid) {
        selfVideoGrid.style.position = 'relative';
        selfVideoGrid.appendChild(leftLabel);
        selfVideoGrid.appendChild(rightLabel);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    addCameraLabels();
});

window.onload = start;

function joinRoom() {
    const room = 'webrtc-room';
    socket.emit('join-room', room);
}

function leaveMeeting() {
    window.location.href = 'waiting-room.html';
}

function muteUnmute() {
    if (!localStream1 || !localStream2) return;

    const isAudioEnabled = localStream1.getAudioTracks()[0].enabled;

    localStream1.getAudioTracks().forEach(track => track.enabled = !isAudioEnabled);
    localStream2.getAudioTracks().forEach(track => track.enabled = !isAudioEnabled);

    const muteButton = document.querySelector('.main__mute_button i');
    const muteText = document.querySelector('.main__mute_button span');

    if (isAudioEnabled) {
        muteButton.classList.replace('fa-microphone-lines', 'fa-microphone-slash');
        muteText.textContent = 'Unmute';
    } else {
        muteButton.classList.replace('fa-microphone-slash', 'fa-microphone-lines');
        muteText.textContent = 'Mute';
    }

    console.log(`Audio ${isAudioEnabled ? 'muted' : 'unmuted'}`);
}

socket.on('update-user-order', (newUserOrder, socketId) => {
    userOrder = newUserOrder;
    if (!positionSet) {
        positionSet = true;
        position = userOrder.length - 1;
        console.log('Position: ' + position);
    }
    console.log('Updated user order:', userOrder);
});

socket.on('new-user', (socketId) => {
    createPeerConnection(socketId, true);
});

socket.on('offer', async (offer, socketId) => {
    console.log(`Received offer from ${socketId}`);

    await createPeerConnection(socketId, false);
    await peerConnections[socketId].setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnections[socketId].createAnswer();
    await peerConnections[socketId].setLocalDescription(answer);

    socket.emit('answer', answer, socketId);
});

socket.on('answer', async (answer, socketId) => {
    console.log(`Received answer from ${socketId}`);
    await peerConnections[socketId].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('redirectHome', () => {
    leaveMeeting();
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

    }

    const remoteVideo = document.getElementById(`remoteVideo-${socketId}`);
    if (remoteVideo) {
        const videoContainer = remoteVideo.parentElement;
        if (videoContainer) {
            videoContainer.remove();
        }
    }

    rearrangeVideoGrid();
});

function pickCamera(userToConnectToId) {
    let positionToConnectTo = 0;
    while (userOrder[positionToConnectTo] !== userToConnectToId) {
        positionToConnectTo++;
    }

    console.log('Pair: ' + position + ' ' + positionToConnectTo);

    if (position == 0 && positionToConnectTo == 1) {
        return false;
    } else if (position == 0 && positionToConnectTo == 2) {
        return true;
    } else if (position == 1 && positionToConnectTo == 0) {
        return true;
    } else if (position == 1 && positionToConnectTo == 2) {
        return false;
    } else if (position == 2 && positionToConnectTo == 0) {
        return false;
    } else if (position == 2 && positionToConnectTo == 1) {
        return true;
    }

}

function rearrangeVideoGrid() {
    const videoContainers = document.querySelectorAll('.video-container');

    if (videoContainers.length === 2) {
        const leftContainers = [];
        const rightContainers = [];

        videoContainers.forEach(videoContainer => {
            const labelText = videoContainer.querySelector('.video-label').innerText;

            if (labelText.includes('true')) {
                leftContainers.push(videoContainer);
            } else if (labelText.includes('false')) {
                rightContainers.push(videoContainer);
            }
        });

        while (videoGrid.firstChild) {
            videoGrid.firstChild.remove();
        }

        leftContainers.forEach(container => videoGrid.appendChild(container));
        rightContainers.forEach(container => videoGrid.appendChild(container));
    }

}

const segments = window.location.pathname.split('/');
const lastSegment = segments[segments.length - 1];

let isParamOn = false;

if (lastSegment === '1') {
  isParamOn = true;
} else if (lastSegment === '0') {
  isParamOn = false;
}

let panAmount = 1;

console.log("Param ON:", isParamOn);

if (isParamOn) {
    panAmount = 1;
} else {
    panAmount = 0;
}




const panCheckbox = document.getElementById('panCheckbox');

document.getElementById('outputDeviceModal').addEventListener('transitionend', () => {
    panCheckbox.checked = panAmount == 1;
});

panCheckbox.addEventListener('change', () => {
    panAmount = panCheckbox.checked ? 1 : 0;
    console.log('panAmount updated to:', panAmount);
});


async function createPeerConnection(socketId, isInitiator) {
    peerConnections[socketId] = new RTCPeerConnection(configuration);

    let left = pickCamera(socketId);

    if (left && isStream1Primary) {
        localStream1.getTracks().forEach(track => peerConnections[socketId].addTrack(track, localStream1));
    } else if (!left && isStream1Primary) {
        localStream2.getTracks().forEach(track => peerConnections[socketId].addTrack(track, localStream2));
    } else if (left && !isStream1Primary) {
        localStream2.getTracks().forEach(track => peerConnections[socketId].addTrack(track, localStream2));
    } else {
        localStream1.getTracks().forEach(track => peerConnections[socketId].addTrack(track, localStream1));
    }


    let isPanningEnabled = true;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    peerConnections[socketId].ontrack = (event) => {
        let remoteVideo = document.getElementById(`remoteVideo-${socketId}`);

        if (!remoteVideo) {
            remoteVideo = document.createElement('video');
            remoteVideo.autoplay = true;
            remoteVideo.muted = false;
            remoteVideo.id = `remoteVideo-${socketId}`;

            const videoContainer = document.createElement('div');
            videoContainer.classList.add('video-container');

            const isLeft = left;

            const labelContainer = document.createElement('div');
            labelContainer.classList.add('label-container');

            const videoLabel = document.createElement('p');
            videoLabel.classList.add('video-label');
            videoLabel.innerText = `${remoteVideo.id} ${isLeft ? 'left' : 'right'}`;

            videoContainer.appendChild(labelContainer);
            videoContainer.appendChild(remoteVideo);
            videoContainer.appendChild(videoLabel);
            videoGrid.append(videoContainer);

            rearrangeVideoGrid();

            if (isPanningEnabled && event.streams[0].getAudioTracks().length > 0) {
                const source = audioContext.createMediaStreamSource(event.streams[0]);
                const panner = audioContext.createStereoPanner();
                panner.pan.value = isLeft ? -1 * panAmount : 1 * panAmount;
                source.connect(panner).connect(audioContext.destination);
            }
        }

        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };



    peerConnections[socketId].onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, socketId);
        }
    };

    if (isInitiator) {
        const offer = await peerConnections[socketId].createOffer();
        await peerConnections[socketId].setLocalDescription(offer);
        socket.emit('offer', offer, 'webrtc-room', socketId);
    }

}

const chatInput = document.getElementById("chat_message");
const messagesList = document.querySelector(".messages");

chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
        const message = chatInput.value.trim();
        socket.emit("message", message, socket.id);
        appendMessage(`You: ${message}`, "right");
        chatInput.value = "";
    }
});

socket.on("createMessage", (message, socketId) => {
    const shortenedId = socketId.substring(0, 4);
    appendMessage(`${shortenedId}: ${message}`, "left");
});

function appendMessage(message, align) {
    const messageElement = document.createElement("li");
    messageElement.textContent = message;
    messageElement.style.textAlign = align;
    messagesList.appendChild(messageElement);

    const chatWindow = document.querySelector(".main__chat_window");
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

const chatButton = document.getElementById("chatButton");
const chatBox = document.querySelector(".main__right");
const mainLeft = document.querySelector(".main__left");

chatButton.addEventListener("click", () => {
    if (chatBox.classList.contains("hidden")) {
        chatBox.classList.remove("hidden");
        chatBox.style.flex = "0.2";
        mainLeft.style.flex = "0.8";
    } else {
        chatBox.classList.add("hidden");
        chatBox.style.flex = "0";
        mainLeft.style.flex = "1";
    }
});

const participantsButton = document.getElementById("participantsButton");
const participantsModal = document.getElementById("participantsModal");
const participantsList = document.getElementById("participantsList");

participantsButton.addEventListener("click", () => {
    if (participantsModal.classList.contains("hidden")) {
        participantsModal.classList.remove("hidden");
        participantsModal.style.display = "block";
        updateParticipantsList();
    } else {
        participantsModal.classList.add("hidden");
        participantsModal.style.display = "none";
    }
});

function updateParticipantsList() {
    participantsList.innerHTML = "";
    let counter = 0;

    const videoContainers = document.querySelectorAll('.video-container');
    const leftUser = document.querySelector('.leftuser');
    const rightUser = document.querySelector('.rightuser');

    leftUser.innerHTML = "";
    rightUser.innerHTML = "";

    videoContainers.forEach(videoContainer => {
        const labelText = videoContainer.querySelector('.video-label').innerText;

        const extractedName = labelText.split('remoteVideo-')[1].split('true')[0].split('false')[0];
        const shortenedName = extractedName.substring(0, 5);
        if (labelText.includes('true')) {
            const leftName = document.createElement("p");
            leftName.textContent = shortenedName;
            leftUser.appendChild(leftName);
        }
        else if (labelText.includes('false')) {
            const rightName = document.createElement("p");
            rightName.textContent = shortenedName;
            rightUser.appendChild(rightName);
        }
    });


    userOrder.forEach((user) => {
        let you = "";
        if (counter == position) {
            you = " (You)";
            const listItem = document.createElement("p");
            listItem.textContent = user + you;
            participantsList.appendChild(listItem);
        }
        counter++;
    });
}

document.getElementById('closeParticipantsModal').addEventListener('click', function () {
    participantsModal.classList.add('hidden');
    participantsModal.style.display = "none";

});


const helpButton = document.getElementById("helpButton");
const helpModal = document.getElementById("helpModal");

helpButton.addEventListener("click", () => {
    if (helpModal.classList.contains("hidden")) {
        helpModal.classList.remove("hidden");
        helpModal.style.display = "block";
    } else {
        helpModal.classList.add("hidden");
        helpModal.style.display = "none";
    }
});


document.getElementById('closeHelpModal').addEventListener('click', function () {
    helpModal.classList.add('hidden');
    helpModal.style.display = "none";

});

const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");

settingsButton.addEventListener("click", () => {
    if (settingsModal.classList.contains("hidden")) {
        settingsModal.classList.remove("hidden");
        settingsModal.style.display = "block";
    } else {
        settingsModal.classList.add("hidden");
        settingsModal.style.display = "none";
    }
});


document.getElementById('closeSettingsModal').addEventListener('click', function () {
    settingsModal.classList.add('hidden');
    settingsModal.style.display = "none";

});

// let isPanningEnabled = true; // Flag to track panning state
// let audioContext = new AudioContext();


// function stopPanning() {
//     isPanningEnabled = false; // Disable panning

//     // Loop through all remote videos and stop their panning effect
//     const remoteVideos = document.querySelectorAll('.video-container video');
//     remoteVideos.forEach(remoteVideo => {
//         audioContext = new AudioContext();
//         const source = audioContext.createMediaStreamSource(remoteVideo.srcObject);
//         const panner = audioContext.createStereoPanner();
//         panner.pan.value = 0; // Set pan to neutral (center)

//         source.connect(panner).connect(audioContext.destination); // Reconnect audio without panning
//     });

//     console.log('Panning stopped');
// }



// function startPanning() {
//     isPanningEnabled = true; // Enable panning

//     // Loop through all remote videos and stop their panning effect
//     const remoteVideos = document.querySelectorAll('.video-container video');
//     remoteVideos.forEach(remoteVideo => {
//         const source = audioContext.createMediaStreamSource(remoteVideo.srcObject);
//         const panner = audioContext.createStereoPanner();
//         panner.pan.value = -1000000; // Set pan to neutral (center)

//         source.connect(panner).connect(audioContext.destination); // Reconnect audio without panning
//     });

//     console.log('Panning started');
// }

// const stopPanningButton = document.getElementById('stopPanningButton');
// stopPanningButton.addEventListener('click', () => {
//     if (isPanningEnabled) {
//         stopPanning(); // Call function to stop panning
//         document.getElementById('stopPanningButton').innerHTML = '<i class="fa-solid fa-play"></i><span>Start Panning</span>';
//     } else {
//         // Optionally implement the function to start panning again
//         startPanning();
//         document.getElementById('stopPanningButton').innerHTML = '<i class="fa-solid fa-stop"></i><span>Stop Panning</span>';

//     }
// });

