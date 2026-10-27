# 曙島 Dawn Isle

給課堂一起走的低多邊形小島。學生用 Google 帳號登入，在第三人身的島上走動，並合力解開五座物理站。進度是全班共用的：有人答對，島上的燈、花和燈塔就會亮給大家看。

畫面的氣氛參考了柔和、低多邊形、奶油色介面的島嶼場景，幾何、題目和名稱都是原創的。

English notes are at the bottom.

## Kenney Platformer Kit 場景

目前首頁遊戲場景使用 `public/assets/platformer-kit` 的 Kenney Platformer Kit GLB 模型，並以四個區域組成參考微縮場景：左側森林、中央雪山、前方雪谷與右上森林高台。場景物件配置位於 [`sceneConfig.ts`](./src/game/platformerKit/sceneConfig.ts)，每個物件都包含 `assetId`、`position`、`rotation`、`scale` 與區域名稱；載入器只透過 [`registry.ts`](./src/game/platformerKit/registry.ts) 解析實際存在的模型。

Asset Inventory 盤點結果與完整相對路徑見 [`platformer-kit-asset-inventory.md`](./docs/platformer-kit-asset-inventory.md)。下載包目前包含 153 個 GLB、沒有 GLTF。所有對應的模型縮圖可在 <http://localhost:3000/platformer-kit-gallery> 查看。

相機使用 Three.js `OrthographicCamera` 呈現等角微縮視角；未進入遊戲時可用 `OrbitControls` 旋轉、縮放與平移場景，進入遊戲後則切換為角色跟隨鏡頭。場景不依賴 Blender 或手動擺放，修改配置檔即可重建相同場景。

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

- 用途：只給 migration。執行中的網站不會讀它。本機的 `npm run db:migrate`，以及 `main` 上的自動 migration，都用這條。
- 誰看得到：僅伺服器。選填，但建議填。
- 怎麼取得：同一個 **Connect** 視窗，把連線字串改成 **Direct connection**。主機名稱沒有 `-pooler`。Neon 的 Vercel integration 把這條叫做 `DATABASE_URL_UNPOOLED`。
- 沒填時，migration 會退回使用 `DATABASE_URL`。Pooled 連線偶爾會讓 migration 失敗，所以建議還是填直接連線。
- 放哪裡：`.env.local`，以及 GitHub 倉庫 **Settings → Secrets and variables → Actions** 的密鑰 `DATABASE_URL_UNPOOLED`。Vercel 上若 integration 已經寫入，留著即可；不必在 Vercel 跑 migration。

## 資料表與 migration

Better Auth 需要 `user`、`session`、`account`、`verification`。全班進度在 `island_progress`。結構在 `src/db/schema.ts`（`src/db/auth-schema.ts` 由 Better Auth CLI 產生，並加了一組帳號唯一索引）。

在已經填好 `.env.local` 的電腦上：

```bash
npm run db:migrate
```

### 共用場景編輯器

首頁場景會先由伺服器讀取 `scene_object` 資料表，再交給 Three.js 渲染。資料庫沒有場景資料時，會暫時使用 `sceneConfig.ts` 的預設場景；第一次儲存後，資料庫就成為正式來源。

執行 migration 後，先將自己的登入帳號設為管理員（把 Email 換成自己的 Google 帳號）：

```sql
UPDATE "user" SET "role" = 'admin' WHERE "email" = 'teacher@example.com';
```

管理員登入後按 `F2` 開啟編輯模式，可以選取、移動、旋轉、縮放、新增或刪除 Platformer Kit 素材。調整完成後按「儲存場景」，整份場景會以 transaction 寫入資料庫；其他玩家重新載入後會看到新的共用場景。一般使用者仍只能讀取場景。

`scene-editor-overrides.json` 只作為既有本機調整值的 fallback／初始 seed，不是正式環境的渲染來源。

這會用 `DATABASE_URL_UNPOOLED`（沒有則用 `DATABASE_URL`）把 `drizzle/` 裡的 SQL 送到 Neon。沒有 `.env.local` 時改讀環境變數；同一個變數若環境裡已經有值，以環境為準。自動套用見下一節。資料庫只由伺服器存取，不需要 RLS 腳本。

答題由 `POST /api/answer` 在伺服器核對 `data/questions.json` 的答案，再寫進 `island_progress`。瀏覽器拿不到正確選項的索引。沒有登入 session、但 Google 登入已設定時，這個路由會回 401。

確認登入服務有起來：設定完成並重啟後，`GET /api/auth/ok` 應回 `{"status":"ok"}`。沒設定時，`/api/auth/*` 會回 **503** 和 `auth_not_configured`，頁面不會整個壞掉。`GET /api/status` 會列出還沒填的變數名稱，不會回傳密鑰內容。

## 自動 migration

`drizzle.config.ts` 連線時先讀 `DATABASE_URL_UNPOOLED`，沒有才用 `DATABASE_URL`。改表請照這個順序：

1. 改 `src/db/schema.ts`。帳號表在 `src/db/auth-schema.ts`。
2. 本機執行 `npm run db:generate`，把 `drizzle/` 裡新的 SQL 和 `drizzle/meta` 一起提交。
3. 合併到 `main`。這次提交若動到 `drizzle/`、`drizzle.config.ts` 或 `src/db/`，GitHub Actions 的 **Migrate database** 會對 Neon 正式庫執行 `npm run db:migrate`。連線用倉庫密鑰 `DATABASE_URL_UNPOOLED`（直接連線，主機名稱沒有 `-pooler`）。不要用 pooled 連線跑 migration。
4. Vercel 仍會部署 `main`，部署本身不跑 migration。`npm run db:migrate` 與 `drizzle-kit migrate` 一樣，只套用還沒記在 `drizzle.__drizzle_migrations` 的檔案，不會重建或清空資料表。

密鑰名稱是 `DATABASE_URL_UNPOOLED`，放在倉庫的 Actions secrets。工作流程不會把連線字串印出來。同一個 concurrency group 會讓兩次 migration 排隊，不會同時跑。

要手動再跑一次：打開 **Actions** → **Migrate database** → **Run workflow**，分支選 `main`。選別的分支會直接失敗，避免把還沒合併的 SQL 送進正式庫。

Pull request 若改了 schema、`drizzle/` 或 `drizzle.config.ts`，**Check migrations** 會跑 `npm run db:check`，再跑 `npm run db:generate`，確認沒有未提交的 migration。這一步不連資料庫。

## 學生怎麼玩

1. 打開正式站，按 **以 Google 帳號進入**。共用電腦時 Google 會先讓人選擇帳號。
2. 島上的名字預設是 Google 顯示名稱，頭像用 Google 大頭貼。點右上角自己的名字可以改 **暱稱**（最多 16 字，留白就回到 Google 名稱）和角色顏色。Email 不會顯示在島上。
3. `WASD` 或方向鍵移動，按住 Shift 跑步。滑鼠拖曳轉動鏡頭，滾輪拉遠近。手機用左下搖桿，靠近站點時按「調查」。
4. 聊天在右下角，訊息會出現在角色頭上大約六秒。聊天不寫入資料庫，目前只在同一個瀏覽器的分頁之間傳送。
5. 五座站要照 `data/questions.json` 的 `stage` 順序解。伺服器核對答案後才解鎖下一站，答題的人 +10 分，徽章顯示在右側。答錯可以重試，不會先公布答案。有資料庫時，約每 10 秒向伺服器核對一次全班進度。
6. 右側的「我的房間」可以照顧寵物。答題分數可在寵物店換飼料（5 分一份）；超過一天沒餵會生病，超過兩天沒餵會離世。寵物照護狀態會跟著本機進度，登入並完成資料庫 migration 後也會跨裝置保存。
7. 「我的房間」中的寵物是可互動的 3D 模型。健康時會待機、走動與被點擊跳躍；生病時會坐下、晃動並顯示 🤒；離世時會顯示墓碑。房間中的表情與行為會依寵物狀態變化。

### 3D 寵物資產

專案使用 Kenney 的 **Cube Pets** GLB 模型，來源頁面標示為 Creative Commons CC0，可用於個人或商業專案。模型檔案放在 [`public/pets`](./public/pets)，房間由 [`PetRoom3D.tsx`](./src/components/PetRoom3D.tsx) 使用 Three.js 與 `GLTFLoader` 載入。

目前模型對應如下：

| 遊戲類型 | 使用模型 | 檔案 |
| --- | --- | --- |
| `bunny` | Chick（小雞） | [`chick.glb`](./public/pets/chick.glb) |
| `cat` | Cat（貓） | [`cat.glb`](./public/pets/cat.glb) |
| `dog` | Dog（狗） | [`dog.glb`](./public/pets/dog.glb) |

模型來源：[Kenney Cube Pets](https://kenney.nl/assets/cube-pets)。模型索引與 GLB 路徑也可參考 [Kenney CC0 asset catalog](https://github.com/Hidencod/tge-assets)。

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

專案已接在 Vercel，**production branch 是 `main`**，正式網址是 <https://threejs3dgame.vercel.app>。推上 `main` 會部署正式站，其他分支是 preview。Vercel 只負責建置與發布，不跑資料庫 migration；正式庫見「自動 migration」。

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
- **Neon Postgres** 與 **Drizzle**。執行期用 pooled `DATABASE_URL` 和 postgres.js（`prepare: false`）；migration 用 `DATABASE_URL_UNPOOLED`，合併到 `main` 後由 GitHub Actions 套用。
- **Three.js** 畫島和角色。
- **Three.js GLTFLoader** 載入 CC0 GLB 寵物模型，並在房間中播放 `idle`、`walk`、`sit` 動畫。
- 即時多人同步先不接。同一個瀏覽器的分頁用 `BroadcastChannel`。

## English

Dawn Isle is a third-person Three.js island for a class. Students sign in with Google through Better Auth. Neon Postgres stores users, nicknames, avatar colors, and shared station progress. The server re-checks answers before writing scores. Live multiplayer is not connected yet; same-browser tabs still see each other through `BroadcastChannel`. Without env vars the site still builds and falls back to guest mode. Copy `.env.example` to `.env.local`, then run `npm run db:migrate` (uses `DATABASE_URL_UNPOOLED`, or `DATABASE_URL` if that is unset). If `.env.local` is missing, the same command reads those variables from the environment. Production URL: `https://threejs3dgame.vercel.app`. Google redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://threejs3dgame.vercel.app/api/auth/callback/google`

To change the schema, edit `src/db/schema.ts`, run `npm run db:generate`, commit `drizzle/`, and merge to `main`. The **Migrate database** workflow then runs `npm run db:migrate` on Neon with the `DATABASE_URL_UNPOOLED` GitHub secret (direct connection, not the pooled URL). That command applies only pending files in `drizzle/` and does not drop or recreate tables. Vercel still deploys `main` and does not migrate. Run it by hand from **Actions → Migrate database → Run workflow** and choose `main`. Pull requests that touch the schema or `drizzle/` also run **Check migrations**, which does not connect to a database. The workflow never prints the connection string.
