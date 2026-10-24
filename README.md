# 曙島 Dawn Isle

給課堂一起走的低多邊形小島。學生用 Google 帳號登入，在第三人身的島上走動、聊天，並合力解開五座物理站。進度是全班共用的：有人答對，島上的燈、花和燈塔就會亮給大家看。

畫面的氣氛參考了柔和、低多邊形、奶油色介面的島嶼場景，幾何、題目和名稱都是原創的。

English notes are at the bottom.

## 本地開發

需要 Node.js 20 以上。

```bash
npm install
cp .env.example .env.local
# 編輯 .env.local。若只想先看畫面，可以先不填，直接：
npm run dev
```

打開 <http://localhost:3000>。

沒有金鑰時，登入卡會列出還沒設定的變數，並提供**訪客模式**。訪客可以在同一個瀏覽器的不同分頁裡看到彼此（`BroadcastChannel`）。填好下面的變數並重新啟動後，才會變成 Google 登入和跨裝置同步。

```bash
npm run build
npm start
```

`npm run build` 在沒有任何環境變數時也必須成功。登入與資料庫連線只發生在請求當下。

## 環境變數

每一個變數都要放在兩個地方：

1. 自己電腦的 `.env.local`（不要提交；`.env` 與 `.env.local` 已在 `.gitignore`）。
2. Vercel 專案 **threejs3dgame** → **Settings** → **Environment Variables**。正式站勾 **Production**。Preview 部署的例外寫在各變數下面。改完 `NEXT_PUBLIC_` 變數要重新部署，它們會在建置時寫進瀏覽器。

範本與一行說明在 [`.env.example`](./.env.example)。

### `BETTER_AUTH_SECRET`

- 用途：簽署登入 cookie。至少 32 字元。
- 誰看得到：僅伺服器。
- 何時必填：要啟用 Google 登入時必填。
- 怎麼取得：在終端機執行

  ```bash
  openssl rand -base64 32
  ```

  把輸出貼上。Production 和本地可以用不同的值。
- 放哪裡：`.env.local`；Vercel 的 Production（Preview 若要測登入也要設同一把或另一把）。

### `BETTER_AUTH_URL`

- 用途：Better Auth 用來組出 Google 的回呼網址。
- 誰看得到：僅伺服器。
- 何時必填：本地開發與 Production 必填。**Vercel Preview 請不要設定**，函式會依該次請求的網址推斷，這樣每個 preview 網址才不會被寫死成正式站。
- 怎麼填：
  - 本地：`http://localhost:3000`
  - Production：`https://threejs3dgame.vercel.app`
- 放哪裡：`.env.local` 用本地網址；Vercel 只在 **Production** 填正式網址。

### `GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET`

- 用途：Google 登入。學生按「以 Google 帳號進入」時使用。
- 誰看得到：兩支都是僅伺服器。不要加上 `NEXT_PUBLIC_`。
- 何時必填：要啟用 Google 登入時兩支都必填。
- 放哪裡：`.env.local` 與 Vercel Production（要在 Preview 測登入時，Preview 也要填，而且 Google 必須登記那個 preview 的回呼網址）。

建立 OAuth 用戶端：

1. 打開 [Google Cloud Console](https://console.cloud.google.com/)。
2. 上方選擇或新建一個專案。
3. **APIs & Services** → **OAuth consent screen**。
   - User type 選 **External**。
   - App name 可填 `曙島 Dawn Isle`，填上你的聯絡信箱。
   - Scopes 保持預設的 `openid`、`email`、`profile` 即可。這三個不是敏感範圍。
   - 若發布狀態停在 **Testing**，只有被加進 Test users 的 Google 帳號能登入。課堂使用時，把狀態改成 **In production**（只使用上述三個範圍時，通常不需要額外驗證），學生才不用逐一加入測試名單。
4. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**。
5. Application type 選 **Web application**，名稱可填 `Dawn Isle`。
6. **Authorized JavaScript origins** 加入，不要加路徑、不要加結尾斜線：
   - `http://localhost:3000`
   - `https://threejs3dgame.vercel.app`
7. **Authorized redirect URIs** 必須與下面完全一致：
   - `http://localhost:3000/api/auth/callback/google`
   - `https://threejs3dgame.vercel.app/api/auth/callback/google`
8. 建立後，把 **Client ID** 貼到 `GOOGLE_CLIENT_ID`，**Client secret** 貼到 `GOOGLE_CLIENT_SECRET`。

Preview 網址（`https://something.vercel.app`）每次分支不同。要在某個 preview 上測試 Google 登入，就把該網址的 origin 與 `https://該網址/api/auth/callback/google` 也加進這組設定。平常讓學生走正式站即可。

### `DATABASE_URL`

- 用途：Better Auth 存放使用者、session、Google 帳號連結。應用在 Vercel 上用這條連線。
- 誰看得到：僅伺服器。
- 何時必填：要啟用 Google 登入時必填。
- 放哪裡：`.env.local` 與 Vercel Production / Preview。

這支遊戲用 **Supabase** 同時當作 Postgres 和即時同步，免費方案就夠一個班使用。Better Auth 使用自己的資料表，不會用到 Supabase Auth。

1. 到 [supabase.com/dashboard](https://supabase.com/dashboard) 登入，**New project**。
2. 記住資料庫密碼。區域可以選離學生較近的（例如 Northeast Asia 或 Singapore）。
3. 等專案狀態變成可用。
4. **Project Settings**（齒輪）→ **Database** → **Connection string** → **URI**。
5. 選 **Transaction pooler**，連接埠是 **6543**。使用者名稱通常像 `postgres.你的專案ref`。
6. 把整段 URI 貼到 `DATABASE_URL`。密碼裡若有 `@`、`#` 等字元，要先做 URL encode。

應用程式用 `postgres` 套件並關閉 prepared statements，所以這條 pooler 連線可以給 serverless 用。

### `DIRECT_URL`

- 用途：只給本機執行 `npm run db:migrate`。執行中的網站不會讀它。
- 誰看得到：僅伺服器。選填。
- 怎麼取得：同一個 Database 頁面，改選 **Direct connection**（`db.專案ref.supabase.co`，port **5432**）。若你的網路連不上 IPv6，改用 **Session pooler**（pooler 主機上的 port 5432）。
- 沒填時，migration 會退回使用 `DATABASE_URL`。Transaction pooler 偶爾會讓 migration 失敗，所以建議還是填直接連線。
- 放哪裡：`.env.local` 即可。不必放到 Vercel，除非你在 Vercel 上跑 migration。

### `NEXT_PUBLIC_SUPABASE_URL`

- 用途：瀏覽器訂閱即時位置、聊天和共用進度。
- 誰看得到：會出現在前端打包檔裡。
- 何時必填：選填。沒填時遊戲仍可玩，但只有同一個瀏覽器的分頁互相同步。
- 怎麼取得：Supabase → **Project Settings** → **API**（或 API Keys）→ **Project URL**，形狀是 `https://專案ref.supabase.co`。
- 放哪裡：`.env.local` 與 Vercel Production（Preview 若要測即時同步也要填）。改完要重新部署。

### `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

- 用途：瀏覽器連線 Realtime 與讀寫 `island_progress` 用的公開鑰匙。
- 誰看得到：會出現在前端打包檔裡。這是 publishable / anon 等級，不是 service role，也不要使用 secret key。
- 何時必填：選填。要跨裝置同步時，這支或下面的 anon key 至少填一支。
- 怎麼取得：同一頁 API Keys，複製 **publishable** key（`sb_publishable_...`）。
- 放哪裡：`.env.local` 與 Vercel Production（Preview 若要測即時同步也要填），改完重新部署。

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- 用途：舊版 anon public key 的別名。儀表板若還沒有 publishable key，把 **anon public** key 填在這裡，上一行可以留空。
- 誰看得到：會出現在前端打包檔裡。
- 何時必填：選填。不要把 service role key 放進任何 `NEXT_PUBLIC_` 變數。
- 怎麼取得：同一頁 API Keys，複製 **anon** / **public** key（通常以 `eyJ` 開頭）。
- 放哪裡：`.env.local` 與 Vercel Production（要在 Preview 測跨裝置同步時，Preview 也要填這三支 `NEXT_PUBLIC_`）。改完重新部署。

### 即時頻道還要在 Supabase 確認的一件事

**Realtime** 設定裡的 **Allow public access** 保持開啟（預設就是開）。學生沒有 Supabase 帳號，遊戲使用公開頻道（`private: false`）。Presence 只在加入和改暱稱時更新；走路的座標走 Broadcast，避免觸發 Presence 的頻率限制。

## 資料表與 migration

Better Auth 需要 `user`、`session`、`account`、`verification`。全班進度在 `island_progress`。結構在 `src/db/schema.ts`（`src/db/auth-schema.ts` 由 Better Auth CLI 產生，並加了一組帳號唯一索引）。

在已經填好 `.env.local` 的電腦上：

```bash
npm run db:migrate
```

這會用 `DIRECT_URL`（沒有則用 `DATABASE_URL`）把 `drizzle/` 裡的 SQL 送到資料庫。

接著打開 Supabase → **SQL Editor**，貼上並執行 [`supabase/rls.sql`](./supabase/rls.sql)。它會：

- 對登入相關資料表開啟 RLS，並且不開放給 anon，避免公開鑰匙讀到 email 或 token。Better Auth 用資料庫擁有者連線，不受這些政策擋住。
- 讓 anon / authenticated 可以讀寫 `island_progress`。

`island_progress` 是課堂共用的一列資料。任何拿得到 publishable key 的人都能改進度。這是 v1 的取捨，方便全班一起玩；之後若要收緊，可以再改政策。

確認登入服務有起來：設定完成並重啟後，`GET /api/auth/ok` 應回 `{"status":"ok"}`。沒設定時，`/api/auth/*` 會回 **503** 和 `auth_not_configured`，頁面不會整個壞掉。`GET /api/status` 會列出還沒填的變數名稱，不會回傳密鑰內容。

## 學生怎麼玩

1. 打開正式站，按 **以 Google 帳號進入**。共用電腦時 Google 會先讓人選擇帳號。
2. 島上的名字預設是 Google 顯示名稱，頭像用 Google 大頭貼。點右上角自己的名字可以改 **暱稱**（最多 16 字，留白就回到 Google 名稱）和角色顏色。Email 不會顯示在島上。
3. `WASD` 或方向鍵移動，按住 Shift 跑步。滑鼠拖曳轉動鏡頭，滾輪拉遠近。手機用左下搖桿，靠近站點時按「調查」。
4. 聊天在右下角，訊息會出現在角色頭上大約六秒。聊天內容不寫入資料庫。
5. 五座站要照 `public/questions.json` 的 `stage` 順序解。任何人答對都會解鎖下一站，答題的人 +10 分，徽章顯示在右側。答錯可以重試，不會先公布答案。

## 修改題目

編輯 [`public/questions.json`](./public/questions.json)。`id` 必須是這五個，才對得上島上的位置：

| id | 島上的位置 |
| --- | --- |
| `dock` | 碼頭 |
| `slope` | 斜坡 |
| `observatory` | 觀測台 |
| `greenhouse` | 溫室 |
| `lighthouse` | 燈塔 |

可改 `stage`（解鎖順序）、`title`、`badge`、`prompt`、`choices`、`answer`（正確選項的索引，從 0 開始）、`explain`。存檔後重新整理開發伺服器即可；正式站要提交並部署。

## 部署

專案已接在 Vercel，**production branch 是 `main`**，正式網址是 <https://threejs3dgame.vercel.app>。推上 `main` 會部署正式站，其他分支是 preview。

框架是 Next.js，Vercel 會讀 `npm run build`。請先在 Vercel 把上面的變數設好再給學生網址；沒設也能建置成功，只是會停在「驗證尚未設定」的訪客模式。

## 沒有金鑰時

| 缺少 | 畫面 |
| --- | --- |
| 登入相關變數任一未填 | 登入卡說明尚未設定，可改以訪客進入 |
| 沒有 Supabase URL 或公開鑰匙 | 登入仍可用，移動和聊天只在同一個瀏覽器的分頁之間同步 |
| Supabase 連不上或訂閱逾時 | 自動改成同上的本機分頁模式，並在畫面上說明 |

本機進度存在 `localStorage`。有 Supabase 且已執行過 RLS 腳本時，進度會另外寫進 `island_progress`，換裝置也還在。

## 技術選型

- **Next.js** 放頁面，以及 Vercel 上的 Better Auth 路由 `app/api/auth/[...all]`。
- **Better Auth** 加 Google 社交登入。使用者資料在你自己的 Postgres。
- **Drizzle** 管理 migration。
- **Supabase**：Postgres 給 Better Auth；Realtime Presence + Broadcast 給多人。選它是為了讓老師只開一個免費專案。
- **Three.js** 畫島和角色。

座標大約每秒傳送 5 次，停下時約 4 秒補一次，避免把免費額度用在靜止的人身上。

## English

Dawn Isle is a third-person Three.js island for a class. Students sign in with Google through Better Auth. Supabase Postgres stores users; Supabase Realtime syncs positions, chat, and shared puzzle progress. Without env vars the site still builds and falls back to a guest mode plus same-browser multi-tab sync. Copy `.env.example` to `.env.local`, run `npm run db:migrate`, then run `supabase/rls.sql` in the Supabase SQL editor. Production URL: `https://threejs3dgame.vercel.app`. Google redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://threejs3dgame.vercel.app/api/auth/callback/google`
