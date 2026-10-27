# 曙島 Dawn Isle

給課堂一起走的低多邊形小島。學生用 Google 帳號登入，在第三人身的島上走動，並合力解開五座物理站。進度是全班共用的：有人答對，島上的燈、花和燈塔就會亮給大家看。

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

沒有金鑰時，登入卡會列出還沒設定的變數，並提供**訪客模式**。訪客可以在同一個瀏覽器的不同分頁裡看到彼此（`BroadcastChannel`）。填好下面的變數並重新啟動後，才會變成 Google 登入；答題進度會寫進 Neon。跨裝置的即時位置還沒接上。

```bash
npm run build
npm start
```

`npm run build` 在沒有任何環境變數時也必須成功。登入與資料庫連線只發生在請求當下。

## 環境變數

每一個變數都要放在兩個地方：

1. 自己電腦的 `.env.local`（不要提交；`.env` 與 `.env.local` 已在 `.gitignore`）。
2. Vercel 專案 **threejs3dgame** → **Settings** → **Environment Variables**。正式站勾 **Production**。Preview 的例外寫在各變數下面。這些變數都只在伺服器讀取，沒有 `NEXT_PUBLIC_`。

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
- 誰看得到：兩支都是僅伺服器。
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

- 用途：執行中的網站連到 Neon。Better Auth 把使用者、session、Google 帳號、暱稱和角色顏色放在這裡；答對的站與分數寫進 `island_progress`。
- 誰看得到：僅伺服器。
- 何時必填：要啟用 Google 登入，以及要把全班進度存進資料庫時必填。
- 放哪裡：`.env.local` 與 Vercel Production / Preview。

資料庫是 **Neon Postgres**。瀏覽器不連資料庫，也沒有即時同步的金鑰。

1. 打開 [Neon Console](https://console.neon.tech/)。
2. **New project**。區域可以選離學生較近的。免費方案就夠一個班。
3. 等專案可用後，打開該專案，按 **Connect**。
4. **Connection string** 選 **Pooled connection**。主機名稱裡會有 `-pooler`。
5. 把整段 URI 貼到 `DATABASE_URL`。密碼裡若有 `@`、`#` 等字元，要先做 URL encode。保留 `?sslmode=require`。

如果是從 Vercel 的 Neon integration 接上，它會自己寫入 `DATABASE_URL`（pooled）和 `DATABASE_URL_UNPOOLED`。名稱與這裡相同，不必再改名。

應用程式用 `postgres`（postgres.js）連這條 pooled URL，並關閉 prepared statements，所以可以給 Vercel serverless 用。Better Auth 需要交易，這條連線做得到。

### `DATABASE_URL_UNPOOLED`

- 用途：只給本機執行 `npm run db:migrate`。執行中的網站不會讀它。
- 誰看得到：僅伺服器。選填，但建議填。
- 怎麼取得：同一個 **Connect** 視窗，把連線字串改成 **Direct connection**。主機名稱沒有 `-pooler`。Neon 的 Vercel integration 把這條叫做 `DATABASE_URL_UNPOOLED`。
- 沒填時，migration 會退回使用 `DATABASE_URL`。Pooled 連線偶爾會讓 migration 失敗，所以建議還是填直接連線。
- 放哪裡：`.env.local`。Vercel 上若 integration 已經寫入，留著即可；平常不必在 Vercel 跑 migration。

## 資料表與 migration

Better Auth 需要 `user`、`session`、`account`、`verification`。全班進度在 `island_progress`。結構在 `src/db/schema.ts`（`src/db/auth-schema.ts` 由 Better Auth CLI 產生，並加了一組帳號唯一索引）。

在已經填好 `.env.local` 的電腦上：

```bash
npm run db:migrate
```

這會用 `DATABASE_URL_UNPOOLED`（沒有則用 `DATABASE_URL`）把 `drizzle/` 裡的 SQL 送到 Neon。資料庫只由伺服器存取，不需要 RLS 腳本。

答題由 `POST /api/answer` 在伺服器核對 `data/questions.json` 的答案，再寫進 `island_progress`。瀏覽器拿不到正確選項的索引。沒有登入 session、但 Google 登入已設定時，這個路由會回 401。

確認登入服務有起來：設定完成並重啟後，`GET /api/auth/ok` 應回 `{"status":"ok"}`。沒設定時，`/api/auth/*` 會回 **503** 和 `auth_not_configured`，頁面不會整個壞掉。`GET /api/status` 會列出還沒填的變數名稱，不會回傳密鑰內容。

## 學生怎麼玩

1. 打開正式站，按 **以 Google 帳號進入**。共用電腦時 Google 會先讓人選擇帳號。
2. 島上的名字預設是 Google 顯示名稱，頭像用 Google 大頭貼。點右上角自己的名字可以改 **暱稱**（最多 16 字，留白就回到 Google 名稱）和角色顏色。Email 不會顯示在島上。
3. `WASD` 或方向鍵移動，按住 Shift 跑步。滑鼠拖曳轉動鏡頭，滾輪拉遠近。手機用左下搖桿，靠近站點時按「調查」。
4. 五座站要照 `data/questions.json` 的 `stage` 順序解。伺服器核對答案後才解鎖下一站，答題的人 +10 分，徽章顯示在右側。答錯可以重試，不會先公布答案。有資料庫時，約每 10 秒向伺服器核對一次全班進度。

## 修改題目

編輯 [`data/questions.json`](./data/questions.json)。這個檔不會直接送給瀏覽器。`id` 必須是這五個，才對得上島上的位置：

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
| 沒有 `DATABASE_URL` | 答題仍由伺服器核對，進度只存在這台瀏覽器 |
| 即時連線 | 尚未提供。同一個瀏覽器的分頁仍看得到彼此的位置 |

`src/game/net.ts` 的 `RealtimeTransport` 是以後接上即時服務的接口。現在只實作 `BroadcastChannel`。

本機進度存在 `localStorage`。有 Neon 且已跑過 migration 時，登入後的答題會另外寫進 `island_progress`，換裝置也還在。

## 技術選型

- **Next.js** 放頁面，以及 Vercel 上的 Better Auth 路由 `app/api/auth/[...all]`。
- **Better Auth** 加 Google 社交登入。暱稱與角色顏色在 `user` 表。
- **Neon Postgres** 與 **Drizzle**。執行期用 pooled `DATABASE_URL` 和 postgres.js（`prepare: false`）；migration 用 `DATABASE_URL_UNPOOLED`。
- **Three.js** 畫島和角色。
- 即時多人同步先不接。同一個瀏覽器的分頁用 `BroadcastChannel`。

## English

Dawn Isle is a third-person Three.js island for a class. Students sign in with Google through Better Auth. Neon Postgres stores users, nicknames, avatar colors, and shared station progress. The server re-checks answers before writing scores. Live multiplayer is not connected yet; same-browser tabs still see each other through `BroadcastChannel`. Without env vars the site still builds and falls back to guest mode. Copy `.env.example` to `.env.local`, then run `npm run db:migrate` (uses `DATABASE_URL_UNPOOLED`, or `DATABASE_URL` if that is unset). Production URL: `https://threejs3dgame.vercel.app`. Google redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://threejs3dgame.vercel.app/api/auth/callback/google`
