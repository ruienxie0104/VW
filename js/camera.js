// camera.js - Camera and Photo Capture Logic

let currentStream = null;
let currentFacingMode = 'environment'; // Default to rear camera
let isCameraInitialized = false;

const videoEl = document.getElementById('camera-video');
const previewImg = document.getElementById('camera-preview');
const canvasEl = document.getElementById('camera-canvas');
const loadingEl = document.getElementById('camera-loading');
const fallbackEl = document.getElementById('camera-fallback');

const actionsVideo = document.getElementById('camera-actions-video');
const actionsPreview = document.getElementById('camera-actions-preview');

window.initCameraView = function() {
    // If we already have a photo, show preview mode instead
    const appState = window.getAppState();
    if (appState.capturedPhoto) {
        showPreview(appState.capturedPhoto);
    } else {
        startCamera();
    }
};

async function startCamera() {
    loadingEl.classList.remove('hidden');
    fallbackEl.classList.add('hidden');
    
    showVideoMode();

    if (currentStream) {
        stopCamera();
    }

    const constraints = {
        video: {
            facingMode: currentFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = currentStream;
        
        // 根據鏡頭模式決定是否啟用鏡像（自拍鏡頭才鏡像）
        if (currentFacingMode === 'user') {
            videoEl.classList.add('mirror');
        } else {
            videoEl.classList.remove('mirror');
        }
        
        // Wait for video to be ready
        videoEl.onloadedmetadata = () => {
            videoEl.play();
            loadingEl.classList.add('hidden');
            isCameraInitialized = true;
        };
    } catch (err) {
        console.error('Camera access failed:', err);
        loadingEl.classList.add('hidden');
        showFallback();
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    isCameraInitialized = false;
}

function switchCamera() {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera();
}

function takePhoto() {
    if (!currentStream) return;
    
    // Set reasonable max dimensions to prevent huge data URLs
    const MAX_WIDTH = 1080;
    let targetW = videoEl.videoWidth;
    let targetH = videoEl.videoHeight;
    
    if (targetW > MAX_WIDTH) {
        targetH = Math.floor(targetH * (MAX_WIDTH / targetW));
        targetW = MAX_WIDTH;
    }
    
    // Set canvas dimensions
    canvasEl.width = targetW;
    canvasEl.height = targetH;
    
    const ctx = canvasEl.getContext('2d');
    
    // If using front camera, flip horizontally
    if (currentFacingMode === 'user') {
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
    }
    
    // Draw current frame to canvas
    ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    
    // Get base64 image data (jpeg, 80% quality to save space in localStorage)
    const dataURL = canvasEl.toDataURL('image/jpeg', 0.8);
    
    // Save to state
    window.setAppState({ capturedPhoto: dataURL });
    
    showPreview(dataURL);
    stopCamera();
}

function retakePhoto() {
    window.setAppState({ capturedPhoto: null });
    startCamera();
}

function showPreview(dataURL) {
    loadingEl.classList.add('hidden'); // 確保預覽時隱藏載入中動畫
    videoEl.classList.add('hidden');
    previewImg.src = dataURL;
    previewImg.classList.remove('hidden');
    
    actionsVideo.classList.add('hidden');
    actionsPreview.classList.remove('hidden');
}

function showVideoMode() {
    previewImg.classList.add('hidden');
    videoEl.classList.remove('hidden');
    
    actionsPreview.classList.add('hidden');
    actionsVideo.classList.remove('hidden');
}

function showFallback() {
    videoEl.classList.add('hidden');
    fallbackEl.classList.remove('hidden');
}

// Event Listeners
document.getElementById('btn-shutter').addEventListener('click', takePhoto);
document.getElementById('btn-switch-camera').addEventListener('click', switchCamera);
document.getElementById('btn-retake').addEventListener('click', retakePhoto);

// File Upload Fallback
document.getElementById('fallback-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Can be quite large, might want to compress it in a real app
            // For now, save directly to state
            const dataURL = e.target.result;
            window.setAppState({ capturedPhoto: dataURL });
            
            fallbackEl.classList.add('hidden');
            showPreview(dataURL);
        };
        reader.readAsDataURL(file);
    }
});

// Clean up when leaving page
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopCamera();
    } else {
        // If we were on camera view and not in preview mode, restart
        const state = window.getAppState();
        const currentPage = window.FLOWS ? window.FLOWS[state.entryType][state.currentStep] : null;
        if (currentPage === 'design' && !state.capturedPhoto) {
            startCamera();
        }
    }
});
