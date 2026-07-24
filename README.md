# 2026 Volkswagen The all-new T-Roc Roadshow 互動網站

這是一個專為 The all-new T-Roc Roadshow 現場活動設計的純前端靜態互動網站。
賓客掃描 QR Code 後，可體驗活動介紹、通關密碼解鎖、現場拍照、填寫資料，並生成可下載/分享的專屬電子海報。

## 網站特性

- **純靜態架構**：僅使用 HTML, CSS, 原生 JavaScript 打造，不依賴後端或任何複雜框架。
- **狀態持久化**：使用 `localStorage`，即使重新整理頁面，使用者的流程進度與資料也不會遺失。
- **響應式設計**：以手機版 (9:16) 為優先設計，桌機瀏覽時會自動置中並限制寬度，呈現如手機 APP 般的體驗。
- **硬體功能串接**：支援原生相機拍攝、前後鏡頭切換，以及備用照片上傳功能。
- **Canvas 海報合成**：使用 Canvas API 實時將使用者照片與品牌視覺合成 1080x1920 高畫質海報。
- **原生分享**：支援 Web Share API 直接分享至社群平台（依裝置支援度）。

## 如何測試與開啟

> **⚠️ 重要提醒：相機功能限制**
> 瀏覽器的安全政策規定，**必須在 `localhost` 或 `HTTPS` 環境下才能存取相機**。若直接點擊兩下開啟 `index.html` (即 `file://` 協定)，相機功能將會失敗並轉為「上傳備用照片」模式。

### 建議的測試方式

1. **使用 VS Code Live Server (最推薦)**
   - 在 VS Code 中開啟本專案資料夾 (`VW`)。
   - 點擊右下角的 `Go Live` 按鈕。
   - 瀏覽器會自動開啟 `http://127.0.0.1:5500/`，此時相機即可正常運作。

2. **使用 Python 內建伺服器**
   - 開啟終端機 (Terminal)，切換到本專案目錄。
   - 執行 `python3 -m http.server 8000`
   - 在瀏覽器輸入 `http://localhost:8000`

### 測試不同活動入口

本活動有兩種不同的起點，請透過修改 URL 的 Query String 來模擬掃描不同的 QR Code：

1. **Tech & Comfort 入口 (預設流程)**
   - 網址：`http://localhost:8000/index.html?entry=tech`
   - 流程：首頁 → Tech & Comfort → 密碼 → 拍照 → 表單 → 海報

2. **Design & Quality 入口**
   - 網址：`http://localhost:8000/index.html?entry=design`
   - 流程：首頁 → 拍照 → Tech & Comfort → 密碼 → 表單 → 海報

### 清除進度 (重新測試)

若要清除先前的測試紀錄重新開始，請在瀏覽器的主控台 (Console) 輸入：
```javascript
resetApp()
```
或者手動清除瀏覽器的 Local Storage。

## 素材替換指南

所有靜態素材皆放在 `assets/` 資料夾內。未來可直接覆蓋同名檔案進行更新：

- `assets/background.png`：全站共用主視覺背景 (深藍/紅藍幾何圖形)。
- `assets/interior.jpg`：Tech & Comfort 頁面與密碼頁面使用的內裝圖片。
- `assets/vw-logo.svg`：目前為模擬的佔位 Logo。取得正式授權 Logo 後，直接將檔名改為 `vw-logo.svg` 覆蓋即可。若正式 Logo 為 PNG 格式，請記得同步修改 `index.html` 與 `js/poster.js` 中的對應路徑。

*(註：目前海報尚未加入 T-Roc 實車外觀圖，若未來有此需求，可將去背車圖加入 `assets/` 並於 `js/poster.js` 的 Canvas 繪製流程中增加 `drawImage` 步驟。)*

## 參數與資料修改

### 修改通關密碼
開啟 `js/app.js`，修改最上方的常數：
```javascript
const PASSCODE = 'T-ROC';
```

### 修改經銷商清單
開啟 `index.html`，尋找 `<select id="form-dealer">` 區塊，直接修改或新增 `<option>` 標籤：
```html
<option value="新的經銷商名稱">新的經銷商名稱</option>
```
