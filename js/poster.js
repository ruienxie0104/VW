// poster.js - Canvas 海報生成邏輯（完全防禦版）
// 所有 DOM 元素查詢都延遲到函數內部執行，避免頂層錯誤導致整個腳本崩潰

console.log('[poster.js] 腳本開始載入...');

// ========== 海報生成主入口 ==========
window.initPosterView = async function() {
    console.log('[poster.js] initPosterView 被呼叫了');
    
    var generatingEl, posterContainer, genText;
    
    try {
        generatingEl = document.getElementById('poster-generating');
        posterContainer = document.getElementById('poster-container');
        genText = document.getElementById('generating-text');
    } catch(e) {
        alert('找不到海報頁面元素: ' + e.message);
        return;
    }
    
    // 顯示生成中狀態
    if (generatingEl) generatingEl.classList.remove('hidden');
    if (posterContainer) posterContainer.classList.add('hidden');
    if (genText) genText.innerText = '正在準備生成...';
    
    try {
        var state = window.getAppState();
        console.log('[poster.js] 取得 appState，capturedPhoto 長度:', 
            state.capturedPhoto ? state.capturedPhoto.length : 'null');
        
        await generatePoster(state, genText);
        
        console.log('[poster.js] 海報生成完成！');
        
        // 顯示海報
        if (generatingEl) generatingEl.classList.add('hidden');
        if (posterContainer) {
            posterContainer.classList.remove('hidden');
            posterContainer.classList.add('fade-in');
        }
        
    } catch (err) {
        console.error('[poster.js] 海報生成失敗:', err);
        if (generatingEl) generatingEl.classList.add('hidden');
        if (genText) genText.innerText = '生成失敗：' + (err.message || '未知錯誤');
        alert('海報合成發生錯誤：' + (err.message || '未知錯誤'));
    }
};

console.log('[poster.js] initPosterView 已定義，typeof =', typeof window.initPosterView);

// ========== 海報生成核心邏輯 ==========
async function generatePoster(state, genText) {
    function updateStatus(msg) {
        console.log('[poster.js]', msg);
        if (genText) genText.innerText = msg;
    }
    
    // 取得 canvas
    var canvas = document.getElementById('poster-canvas');
    if (!canvas) {
        throw new Error('找不到 poster-canvas 元素');
    }
    
    var ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('無法取得 canvas 2d context');
    }
    
    var previewImg = document.getElementById('poster-preview-img');
    if (!previewImg) {
        throw new Error('找不到 poster-preview-img 元素');
    }
    
    // 1. 等待字體（加逾時保護）
    updateStatus('等待字體載入中...');
    try {
        if (document.fonts && document.fonts.ready) {
            await Promise.race([
                document.fonts.ready,
                new Promise(function(resolve) { setTimeout(resolve, 500); })
            ]);
        }
    } catch (e) {
        console.warn('[poster.js] 字體載入超時或錯誤', e);
    }
    
    // 2. 清除畫布
    updateStatus('清理畫布中...');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 3. 繪製背景
    updateStatus('載入背景圖片中...');
    try {
        var bgImg = await loadImage('info/背景.png');
        updateStatus('繪製背景中...');
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } catch(e) {
        console.warn('[poster.js] 背景圖載入失敗，使用純色背景', e);
        // 使用漸層背景作為 fallback
        var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1040');
        gradient.addColorStop(0.5, '#2a1a5e');
        gradient.addColorStop(1, '#c8401e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 4. 繪製標題
    // 4. 繪製使用者照片 (先畫照片，這樣文字才能壓在照片上)
    updateStatus('處理使用者照片...');
    if (state.capturedPhoto) {
        try {
            updateStatus('載入使用者照片...');
            var userImg = await loadImage(state.capturedPhoto);
            
            updateStatus('繪製使用者照片...');
            // 照片尺寸與位置 (靠右，沒有白色邊框)
            var photoX = 420, photoY = 260, photoW = 560, photoH = 780;
            
            // 計算裁切 (cover 模式)
            var imgAspect = userImg.width / userImg.height;
            var targetAspect = photoW / photoH;
            var sx, sy, sw, sh;
            
            if (imgAspect > targetAspect) {
                sh = userImg.height;
                sw = userImg.height * targetAspect;
                sx = (userImg.width - sw) / 2;
                sy = 0;
            } else {
                sw = userImg.width;
                sh = userImg.width / targetAspect;
                sx = 0;
                sy = (userImg.height - sh) / 2;
            }
            
            if (sw > 0 && sh > 0) {
                ctx.drawImage(userImg, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
            }
        } catch (e) {
            console.error('[poster.js] 使用者照片載入失敗:', e);
            // 不中斷，繼續繪製其他部分
        }
    }

    // 5. 繪製標題文字 (壓在照片上方，創造設計感)
    updateStatus('繪製標題與文字中...');
    ctx.fillStyle = '#ffffff';
    ctx.font = '68px "VWProductFont", sans-serif';
    
    try {
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '2px';
        }
    } catch(e) { /* 忽略不支援的瀏覽器 */ }
    
    ctx.fillText('THE', 100, 320);
    ctx.fillText('ALL-NEW', 100, 440);
    ctx.fillText('T-ROC', 100, 560);
    
    try {
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '0px';
        }
    } catch(e) { /* 忽略 */ }
    
    // 繪製直排文字（魅力·自成焦點）帶有金黃到白色的漸層感
    ctx.font = '35px "Noto Sans TC", sans-serif';
    var verticalGrad = ctx.createLinearGradient(120, 650, 120, 1060);
    verticalGrad.addColorStop(0, '#e8a000');     // 頂部：金黃色
    verticalGrad.addColorStop(0.5, '#ffd25e');   // 中間：亮金黃
    verticalGrad.addColorStop(1, '#ffffff');     // 底部：漸變至純白
    
    ctx.fillStyle = verticalGrad;
    var verticalChars = ['魅', '力', '·', '自', '成', '焦', '點'];
    var charY = 680;
    for (var i = 0; i < verticalChars.length; i++) {
        ctx.fillText(verticalChars[i], 120, charY);
        charY += 60;
    }
    
    // 7. 繪製 T-Roc 小檔案區塊
    updateStatus('繪製底版與介紹...');
    // 不繪製黑色半透明底版，保持與設計圖一致的通透感
    
    // 標題顏色改為 #c8bb9b
    ctx.fillStyle = '#c8bb9b';
    ctx.font = 'bold 45px "Noto Sans TC", sans-serif';
    ctx.fillText('T-Roc 小檔案', 120, 1180);
    
    // 分隔線
    ctx.beginPath();
    ctx.moveTo(120, 1220);
    ctx.lineTo(960, 1220);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 特色介紹
    var col1X = 100, col2X = 590;
    var featureY = 1300;
    
    var features = [
        { title: '德式美學 自信展現', desc: '勇於展現自我，以鮮明設計成為眾人焦點', col: 1 },
        { title: '空間升級 舒適隨行', desc: '擁抱更多可能，如靈活空間滿足不同生活需求', col: 2 },
        { title: '風格獨特 魅力出眾', desc: '擁有獨特品味，辨識度十足展現獨特魅力', col: 1 },
        { title: '靈敏操控 駕馭樂趣', desc: '享受挑戰與突破，帶來靈活暢快的駕馭體驗', col: 2 },
        { title: '智慧科技 安全守護', desc: '智慧守護每段旅程，讓每次出發都安心', col: 1 }
    ];
    
    for (var fi = 0; fi < features.length; fi++) {
        var f = features[fi];
        var fx = f.col === 1 ? col1X : col2X;
        var fy = f.col === 1 ? featureY : featureY - 140;
        
        ctx.fillStyle = '#c8bb9b';
        ctx.font = 'bold 28px "Noto Sans TC", sans-serif';
        ctx.fillText(f.title, fx, fy);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '18px "Noto Sans TC", sans-serif';
        wrapText(ctx, f.desc, fx, fy + 40, 470, 32);
        
        if (f.col === 1 && fi < features.length - 1) {
            featureY += 140;
        }
    }
    
    // 8. VW Logo
    updateStatus('載入Logo...');
    try {
        var logoImg = await loadImage('assets/logo.svg');
        ctx.drawImage(logoImg, 880, 1720, 100, 100);
    } catch (e) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('VW', 900, 1780);
    }
    
    // 9. 產生最終預覽圖
    updateStatus('產生最終預覽圖...');
    var dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    previewImg.src = dataUrl;
    
    window.setAppState({ posterGenerated: true });
    updateStatus('完成！');
}

// ========== 工具函數 ==========

function loadImage(src) {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        
        // data URL 給更長的逾時
        var timeout = src.startsWith('data:') ? 8000 : 5000;
        
        var timer = setTimeout(function() {
            console.error('[poster.js] 圖片載入逾時:', src.substring(0, 50));
            reject(new Error('圖片載入逾時'));
        }, timeout);

        img.onload = function() {
            clearTimeout(timer);
            console.log('[poster.js] 圖片載入成功:', src.substring(0, 50), 
                '尺寸:', img.width, 'x', img.height);
            resolve(img);
        };
        
        img.onerror = function(err) {
            clearTimeout(timer);
            console.error('[poster.js] 圖片載入失敗:', src.substring(0, 50), err);
            reject(new Error('圖片載入失敗'));
        };
        
        img.src = src;
    });
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    var chars = text.split('');
    var line = '';

    for (var n = 0; n < chars.length; n++) {
        var testLine = line + chars[n];
        var metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = chars[n];
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

function showToast(msg) {
    var toast = document.getElementById('toast-message');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('opacity-0');
    setTimeout(function() {
        toast.classList.add('opacity-0');
    }, 3000);
}

// ========== 按鈕事件（延遲綁定，確保 DOM 已就緒） ==========
function bindPosterButtons() {
    var btnDownload = document.getElementById('btn-download');
    var btnShare = document.getElementById('btn-share');
    
    if (btnDownload) {
        btnDownload.addEventListener('click', function() {
            var canvas = document.getElementById('poster-canvas');
            if (!canvas) return;
            
            canvas.toBlob(function(blob) {
                if (!blob) {
                    showToast('圖片生成失敗，請重試');
                    return;
                }
                
                var state = window.getAppState();
                var userName = state.formData ? state.formData.name : 'VIP';
                var fileName = 'The_all-new_T-Roc_' + userName + '.jpg';
                
                // 檢查是否支援 Web Share API 分享檔案，以便能直接叫起手機系統的「儲存影像」
                var file = new File([blob], fileName, { type: 'image/jpeg' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: 'The all-new T-Roc 專屬海報',
                        text: '我的專屬魅力檔案'
                    }).catch(function(err) {
                        console.log('分享或儲存取消/失敗:', err);
                    });
                } else {
                    // Fallback to traditional download
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = fileName;
                    
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(function() {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                    
                    showToast('圖片已下載！長按上方海報亦可直接儲存至相簿');
                }
            }, 'image/jpeg', 0.95);
        });
    }
    
    if (btnShare) {
        btnShare.addEventListener('click', async function() {
            var canvas = document.getElementById('poster-canvas');
            if (!canvas) return;
            
            canvas.toBlob(async function(blob) {
                if (!blob) return;
                
                var state = window.getAppState();
                var userName = state.formData ? state.formData.name : 'VIP';
                var file = new File([blob], 'The_all-new_T-Roc_' + userName + '.jpg', { type: 'image/jpeg' });
                
                // 1. 優先嘗試原生的檔案分享 (手機端 iOS Safari / Android Chrome 支援時)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: 'The all-new T-Roc 魅力｜自成焦點',
                            text: '這是我專屬的 The all-new T-Roc 魅力海報！',
                            files: [file]
                        });
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') return; // 使用者主動取消分享，直接返回
                    }
                }
                
                // 2. 如果不支援直接分享圖片檔案，則退而求其次分享文字描述與活動網址
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'The all-new T-Roc 魅力｜自成焦點',
                            text: '這是我專屬的 The all-new T-Roc 魅力海報，快來生成你的魅力檔案！',
                            url: window.location.origin + window.location.pathname
                        });
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') return;
                    }
                }
                
                // 3. 若為不支援原生分享的瀏覽器 (例如電腦版、部分通訊軟體內建 Webview)，提示長按儲存/分享
                showToast('您的瀏覽器不支援直接分享，請長按海報圖片以儲存或分享！');
            }, 'image/jpeg', 0.9);
        });
    }
}

// 等 DOM 就緒後才綁定按鈕
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPosterButtons);
} else {
    bindPosterButtons();
}

console.log('[poster.js] 腳本載入完成！');
