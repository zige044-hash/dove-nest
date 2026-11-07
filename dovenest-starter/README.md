# 鳩巢 DoveNest

一個以米白、灰藍、鴿子與文學意象為主題的小說平台起始專案。

## 目前包含
- 響應式首頁、閱讀書架、搜尋與分類
- 小說閱讀頁面
- 創作編輯表單
- Google 登入程式骨架（需自行設定 Firebase）
- 作者頁面

## 重要：目前尚未完成的正式功能
這是網站起始專案，不是已上線網站。作品資料目前只存在前端記憶體中，重新整理會消失。正式公開前，必須完成 Firestore 資料庫、使用者權限、作品永久保存、內容檢舉/管理、隱私政策與測試。

## 本機啟動
需要 Node.js 20 或更新版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

開啟 http://localhost:3000

## 設定 Google 登入（Firebase）
1. 在 Firebase Console 建立專案。
2. 在 Authentication > Sign-in method 啟用 Google provider。
3. 建立 Web App，複製 Firebase 設定值到 `.env.local`。
4. Authentication > Settings > Authorized domains 加入部署網域。
5. 不要把任何管理員私鑰或服務帳戶金鑰放進前端環境變數或公開程式碼。

`.env.local` 變數名稱請參考 `.env.example`。

## 部署到 Vercel
1. 將專案上傳到你自己的 GitHub repository。
2. 在 Vercel 匯入該 repository。
3. 在 Vercel 專案設定中加入 `.env.example` 列出的環境變數。
4. 部署完成後，將 Vercel 提供的網域加入 Firebase Authorized domains。
5. 重新部署並測試 Google 登入。

## 上線前的安全事項
- 加入 Firestore Security Rules，確保作者只能編輯自己的作品。
- 設計檢舉、封鎖、管理員審核與刪除流程。
- 不公開使用者的私人 email 或其他聯絡資料。
- 設定隱私政策、服務條款及適齡內容規範。
- 先以測試帳號驗證登入、登出、權限與資料存取。
