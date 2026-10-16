# 專注小島 Focus Island

一個把任務、專注倒數與種植回饋放在一起的互動網頁。完成一輪專注，讓小島多一點綠意。

## 開啟作品

直接用瀏覽器開啟 `index.html` 即可操作，不需安裝套件。網頁程式、樣式和插畫都在同一檔案內。

先新增一個小任務，再開始專注。想快速確認互動時，可使用「10 秒體驗」；體驗植物會清楚標示，且不計入正式專注統計。資料只保存在目前裝置的此瀏覽器，不會雲端同步。

## 作業材料

- `index.html`：可操作的完整網頁。
- `SPEC.md`：功能、介面、資料規則及驗收條件。
- `AI_NOTES.md`：真實的 AI 協作與修改紀錄。
- `TEST_RESULTS.md`：實際驗證結果與限制。
- `SUBMISSION.md`：可貼到作業文字輸入區的繳交草稿。
- `screenshots/`：完成驗證後保留的介面截圖。
- `tests/timer-check.cjs`：可重現的 14 項計時與保存邏輯測試，使用 Node 執行；網頁本身不需要它。

## GitHub Pages 發布

網站網址：[專注小島](https://xinyou1220.github.io/focus-island/)（已發布並完成公開操作驗證）

原始碼：[GitHub 儲存庫](https://github.com/xinyou1220/focus-island)

![專注小島操作後的介面截圖](screenshots/desktop-verified.jpg)

若使用 GitHub 網站手動上傳：

1. 在自己的 GitHub 建立公開儲存庫，名稱可使用 `focus-island`。
2. 將 `index.html` 上傳到儲存庫最外層並提交。規格、紀錄與截圖可一併上傳供查閱；網頁本身只需要 `index.html`。
3. 開啟儲存庫的 **Settings → Pages**。
4. 在 **Build and deployment** 選擇 **Deploy from a branch**，分支選 `main`、資料夾選 `/(root)`，儲存。
5. 等待部署完成，使用 Pages 頁面顯示的實際網站網址；不要把儲存庫頁面或本機預覽連結當成繳交網址。
6. 用未登入的視窗開啟網站，測試新增任務及 10 秒體驗，再將真實網址填入 `SUBMISSION.md`。

上述發布方式依據 [GitHub 官方：建立 Pages 網站](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) 與 [設定發布來源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 繳交提醒

依作業要求，正常期限為 **2026/10/19 23:59（台灣時間）**，遲交期限為 **2026/10/20 16:00**。在課程的文字輸入區提交標題、公開網站連結、介面截圖及規格文字；不用另做 PDF。
