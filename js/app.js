// 全域錯誤捕獲，協助在行動端與瀏覽器除錯
window.addEventListener('error', function(e) {
    alert('偵測到 JS 錯誤: ' + e.message + '\n檔案: ' + e.filename + '\n行號: ' + e.lineno);
});

// app.js - Main Application Logic

const PASSCODE = 'TROC2026';

// State Management
let appState = {
    entryType: 'tech', // 'tech' or 'design'
    currentStep: 0,
    techCompleted: false,
    designCompleted: false,
    passcodeVerified: false,
    capturedPhoto: null,
    formData: null,
    posterGenerated: false
};

// Flow Definitions (index maps to logical steps)
// 'landing' is always step 0
// 'poster' is always the last step
const FLOWS = {
    tech: ['landing', 'tech', 'design', 'form', 'poster'], // A 流程
    design: ['landing', 'design', 'landing', 'tech', 'form', 'poster'] // B 流程
};

let currentFlow = [];

// DOM Elements
let sections = {};
let commonHeader = null;

function initApp() {
    sections = {
        landing: document.getElementById('page-landing'),
        tech: document.getElementById('page-tech'),
        design: document.getElementById('page-design'),
        form: document.getElementById('page-form'),
        poster: document.getElementById('page-poster')
    };
    commonHeader = document.getElementById('common-header');

    // 每次重新打開或刷新頁面時，清除 LocalStorage，以確保流程是全新的
    localStorage.removeItem('vwTrocState');
    
    // 重置 appState 為初始狀態
    appState = {
        entryType: 'tech', 
        currentStep: 0,
        techCompleted: false,
        designCompleted: false,
        passcodeVerified: false,
        capturedPhoto: null,
        formData: null,
        posterGenerated: false
    };
    saveState();
    
    // Parse URL query string for entry type
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('entry')) {
        const entry = urlParams.get('entry');
        if (entry === 'tech' || entry === 'design') {
            appState.entryType = entry;
        }
    }
    
    currentFlow = FLOWS[appState.entryType];
    
    bindEvents();
    
    // Resume at current step, or start at 0
    showPage(appState.currentStep);
}

// Local Storage handling
function saveState() {
    localStorage.setItem('vwTrocState', JSON.stringify(appState));
}

function loadState() {
    const saved = localStorage.getItem('vwTrocState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState = { ...appState, ...parsed };
        } catch (e) {
            console.error('Failed to parse saved state', e);
        }
    }
}

// Navigation Logic
function showPage(stepIndex) {
    if (stepIndex < 0 || stepIndex >= currentFlow.length) return;
    
    appState.currentStep = stepIndex;
    saveState();
    
    const pageId = currentFlow[stepIndex];
    
    // Hide all sections
    Object.values(sections).forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('fade-in');
    });
    
    // Show target section
    const targetSection = sections[pageId];
    if (targetSection) {
        targetSection.classList.remove('hidden');
        // trigger reflow
        void targetSection.offsetWidth;
        targetSection.classList.add('fade-in');
    }
    
    // Handle Common Header visibility
    if (pageId === 'landing' || pageId === 'form' || pageId === 'poster') {
        commonHeader.classList.add('hidden');
        if (pageId === 'landing') {
            const btnStartLabel = document.querySelector('#btn-start .btn-start-label');
            if (btnStartLabel) {
                if (appState.entryType === 'design' && stepIndex === 2) {
                    btnStartLabel.innerText = '繼續體驗';
                } else {
                    btnStartLabel.innerText = '立即開始';
                }
            }
        }
    } else {
        commonHeader.classList.remove('hidden');
    }
    
    // 觸發特定頁面的初始化
    if (pageId === 'design' && window.initCameraView) {
        try {
            window.initCameraView();
        } catch(e) {
            console.error('initCameraView 錯誤:', e);
        }
    }
    if (pageId === 'poster') {
        if (typeof window.initPosterView === 'function') {
            try {
                window.initPosterView();
            } catch(e) {
                console.error('initPosterView 錯誤:', e);
                alert('海報初始化錯誤: ' + e.message);
            }
        } else {
            console.error('window.initPosterView 未定義！poster.js 可能載入失敗');
            var genText = document.getElementById('generating-text');
            if (genText) {
                genText.innerText = '錯誤：poster.js 載入失敗，請重新整理頁面';
                genText.style.color = '#ff6b6b';
            }
            alert('poster.js 載入失敗！請打開瀏覽器開發者工具 Console 查看錯誤訊息，並重新整理頁面。');
        }
    }
}

function showPasscodeOverlay() {
    const overlay = document.getElementById('passcode-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const input = document.getElementById('passcode-input');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function hidePasscodeOverlay() {
    const overlay = document.getElementById('passcode-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    const passcodeError = document.getElementById('passcode-error');
    if (passcodeError) {
        passcodeError.classList.remove('show');
        passcodeError.style.opacity = '0';
    }
}

function nextStep() {
    // Validation before moving next
    const currentPage = currentFlow[appState.currentStep];
    
    if (currentPage === 'tech' && !appState.passcodeVerified) {
        showPasscodeOverlay();
        return;
    }
    if (currentPage === 'design' && !appState.capturedPhoto) {
        alert('請先拍照或上傳照片');
        return;
    }
    if (currentPage === 'form') {
        if (!validateForm()) return;
    }
    
    if (appState.currentStep < currentFlow.length - 1) {
        showPage(appState.currentStep + 1);
    }
}

function prevStep() {
    // If passcode overlay is open, back button closes it
    const overlay = document.getElementById('passcode-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
        hidePasscodeOverlay();
        return;
    }

    if (appState.currentStep > 0) {
        showPage(appState.currentStep - 1);
    }
}

// Event Binding
function bindEvents() {
    // Start Button
    document.getElementById('btn-start').addEventListener('click', () => {
        nextStep();
    });
    
    // Global Prev/Next buttons
    document.querySelectorAll('.btn-nav-back').forEach(btn => {
        btn.addEventListener('click', prevStep);
    });
    
    // Section specific Next buttons
    sections.tech.querySelector('.btn-nav-forward').addEventListener('click', () => {
        // If passcode overlay is active, clicking next verifies the passcode
        const overlay = document.getElementById('passcode-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            const passcodeInput = document.getElementById('passcode-input');
            const passcodeError = document.getElementById('passcode-error');
            const val = passcodeInput.value.toUpperCase();
            if (val === PASSCODE) {
                if (passcodeError) {
                    passcodeError.classList.remove('show');
                    passcodeError.style.opacity = '0';
                }
                appState.passcodeVerified = true;
                appState.techCompleted = true;
                saveState();
                hidePasscodeOverlay();
                nextStep();
            } else {
                if (passcodeError) {
                    passcodeError.classList.add('show');
                    passcodeError.style.opacity = '1';
                }
            }
            return;
        }

        appState.techCompleted = true;
        saveState();
        nextStep();
    });
    
    // Passcode Verification Overlay Input
    const passcodeInput = document.getElementById('passcode-input');
    const passcodeError = document.getElementById('passcode-error');
    
    if (passcodeInput) {
        passcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = passcodeInput.value.toUpperCase();
                if (val === PASSCODE) {
                    if (passcodeError) {
                        passcodeError.classList.remove('show');
                        passcodeError.style.opacity = '0';
                    }
                    appState.passcodeVerified = true;
                    saveState();
                    hidePasscodeOverlay();
                    nextStep();
                } else {
                    if (passcodeError) {
                        passcodeError.classList.add('show');
                        passcodeError.style.opacity = '1';
                    }
                }
            }
        });
    }
    
    // Camera Preview Next
    const btnPhotoNext = document.getElementById('btn-photo-next');
    if (btnPhotoNext) {
        btnPhotoNext.addEventListener('click', () => {
            appState.designCompleted = true;
            saveState();
            nextStep();
        });
    }
    
    // Form Submission
    document.getElementById('btn-submit-form').addEventListener('click', () => {
        nextStep(); // will trigger validateForm()
    });
    
    // Add input formatting for phone
    const phoneInput = document.getElementById('form-phone');
    phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 10) val = val.slice(0, 10);
        
        if (val.length > 4 && val.length <= 7) {
            val = val.slice(0,4) + '-' + val.slice(4);
        } else if (val.length > 7) {
            val = val.slice(0,4) + '-' + val.slice(4,7) + '-' + val.slice(7);
        }
        e.target.value = val;
    });
    
    // Add input formatting for DOB
    const dobInput = document.getElementById('form-dob');
    dobInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^\d]/g, '');
        if (val.length > 8) val = val.slice(0, 8);
        
        if (val.length > 4 && val.length <= 6) {
            val = val.slice(0,4) + ' / ' + val.slice(4);
        } else if (val.length > 6) {
            val = val.slice(0,4) + ' / ' + val.slice(4,6) + ' / ' + val.slice(6);
        }
        e.target.value = val;
    });
}

// Form Validation
function validateForm() {
    let isValid = true;
    
    const nameInput = document.getElementById('form-name');
    const dobInput = document.getElementById('form-dob');
    const phoneInput = document.getElementById('form-phone');
    const dealerSelect = document.getElementById('form-dealer');
    const subscribeRadios = document.getElementsByName('subscribe');
    
    // Name
    if (nameInput.value.trim().length < 2) {
        showError(nameInput, true);
        isValid = false;
    } else {
        showError(nameInput, false);
    }
    
    // DOB
    const dobPattern = /^\d{4}\s\/\s\d{2}\s\/\s\d{2}$/;
    if (!dobPattern.test(dobInput.value)) {
        showError(dobInput, true);
        isValid = false;
    } else {
        showError(dobInput, false);
    }
    
    // Phone
    const phoneVal = phoneInput.value.replace(/\D/g, '');
    if (!/^09\d{8}$/.test(phoneVal)) {
        showError(phoneInput, true);
        isValid = false;
    } else {
        showError(phoneInput, false);
    }
    
    // Dealer
    if (!dealerSelect.value) {
        showError(dealerSelect, true);
        isValid = false;
    } else {
        showError(dealerSelect, false);
    }
    
    // Subscribe
    let subscribeSelected = false;
    let subscribeValue = '';
    for (let i = 0; i < subscribeRadios.length; i++) {
        if (subscribeRadios[i].checked) {
            subscribeSelected = true;
            subscribeValue = subscribeRadios[i].value;
            break;
        }
    }
    
    const subscribeError = document.getElementById('subscribe-error');
    if (!subscribeSelected) {
        subscribeError.classList.remove('hidden');
        subscribeError.classList.add('show');
        isValid = false;
    } else {
        subscribeError.classList.add('hidden');
        subscribeError.classList.remove('show');
    }
    
    if (isValid) {
        appState.formData = {
            name: nameInput.value.trim(),
            dob: dobInput.value,
            phone: phoneInput.value,
            dealer: dealerSelect.value,
            subscribe: subscribeValue === 'yes'
        };
        saveState();
    }
    
    return isValid;
}

function showError(element, show) {
    // 尋找鄰近的 .form-error：先從 parent 找，如果找不到，就到 parent 的 parent 找
    let errEl = element.parentElement.querySelector('.form-error');
    if (!errEl && element.parentElement.parentElement) {
        errEl = element.parentElement.parentElement.querySelector('.form-error');
    }
    
    if (errEl) {
        if (show) {
            errEl.classList.remove('hidden');
            errEl.classList.add('show');
            element.classList.add('border-error');
        } else {
            errEl.classList.add('hidden');
            errEl.classList.remove('show');
            element.classList.remove('border-error');
        }
    }
}

// Allow global reset for testing
window.resetApp = function() {
    localStorage.removeItem('vwTrocState');
    window.location.reload();
};

// Export appState for other modules
window.getAppState = () => appState;
window.setAppState = (newState) => {
    appState = { ...appState, ...newState };
    saveState();
};

// Start
document.addEventListener('DOMContentLoaded', initApp);
