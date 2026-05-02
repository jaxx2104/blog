# Stack Modernization Phase 5: 仕上げ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** modernize-stack 移行の仕上げとして、(1) React 18 → 19 へのアップグレード、(2) `package.json` メタデータの実態整流、(3) Phase 4 で半端に残った `build.sh` ラッパーのコメント整理、(4) `tsc -p .` が CI で必須化されている事実の確認、(5) Phase 2 比のバンドルサイズ／初回ロード計測、を一連のコミットで完了させる。完了後、design spec の Phase 5 セクションに Gate 完了を追記して移行プロジェクトを締める。

**Architecture:** 5 つの仕上げ項目はそれぞれ独立しているため、影響範囲とリスクが小さい順に並べて 1 task = 1 commit でまとめる。最大リスクは React 19 アップグレード（TanStack Start / Velite / shiki / rehype-pretty-code との互換）で、これは独立した task に隔離し、失敗時には spec section 11 の方針通り「React 18 のまま完了させ、19 化は別 PR に分離」へフォールバックできる構造にする。バンドル計測は Phase 2 当時のベースラインが spec に残っていないため、現行 main（Phase 4 完了直後）の値と、`out/`（Next.js 時代の最終ビルド成果物がワーキングツリーに残存）の値の両方を baseline として記録する。

**Tech Stack:** pnpm 9, Vite 8, TanStack Start 1.x, Velite 0.3, React 18 → 19, Biome 2.4, TypeScript 5.8

---

## File Structure

### Modify
- `package.json` — `react` / `react-dom` を 19 系に bump、`@types/react` を 19 系に bump、`@types/react-dom` を必要に応じて追加。`description` を `"Simple starter for Gatsby"` → `"A static blog by jaxx2104"` に修正。`keywords` から `"nextjs"` を削除。
- `pnpm-lock.yaml` — `pnpm install` で自動更新
- `build.sh` — Phase 4 で分岐ロジックは消えたが、コメントが Next.js / `pnpm build:vite` 時代の経緯を引きずっているため、現状（main = TanStack Start prerender、`pnpm build` のみ）に合わせて簡潔化
- `docs/superpowers/specs/2026-05-01-modernize-stack-design.md` — Phase 5 セクションに Gate 完了を追記、バンドル計測結果を Section 12 もしくは新設「Phase 5 結果」節に記録
- `CLAUDE.md` — `react": "18.3.1"` 等のバージョン記載があれば 19 系に更新（現状の CLAUDE.md には個別バージョンの言及がないが、念のため確認）

### Untouched
- `app/**` — React 19 への型・ランタイム移行は基本的に non-breaking（`<Suspense>` / `useId` / `forwardRef` 撤去等の deprecation はあるが、本リポジトリで現役利用ゼロを Task 4 Step 1 で grep 確認）
- `lib/**`, `components/**`, `styles/**` — 同上
- `wrangler.toml` — Cloudflare Pages の `pages_build_output_dir = "./dist/client/"` は本ブランチでも main でも有効。Phase 5 で触らない
- `.github/workflows/test.yml` — `pnpm test` step が既に `tsc -p ./tsconfig.json` を呼んでおり、Phase 5 の「`tsc -p .` を CI で必須化」要件は満たし済み。Task 5 で確認のみ

---

## Conventions

- 各 task ごとに 1 commit。途中の各 commit で `pnpm install && pnpm build && pnpm test && pnpm lint:ci` がすべて exit 0 を返すことを確認する（壊れた中間状態を残さない）
- バージョン bump は `pnpm update` ではなく `pnpm add <pkg>@<version>` で明示的に指定する（lockfile の意図しない巻き添え更新を防ぐ）
- コミットメッセージは英語で、modernize-stack 系の既存 commit 慣習（`Phase N: ...` または `chore: ...` / `feat: ...` の Conventional Commits）に揃える
- ブランチ命名は spec の慣習に揃え `modernize-stack-phase5` とする
- バンドルサイズ計測は `du -sh dist/client` と `find dist/client -name "*.js" -exec du -b {} +` の合計値の 2 種を記録し、再現性のあるコマンドを spec に併記する

---

## Task 1: ブランチ準備 + ベースライン計測

Phase 4 完了直後の現行 main を起点に branch を切り、以後のバンドル比較で使う baseline 値を取得する。Phase 2 当時の数値が spec に残っていないため、ここで記録する Phase 4 完了時点の値を以後の基準とする。

**Files:**
- Create: `.tmp/phase5-baseline.txt`（commit しないテンポラリ）

- [ ] **Step 1: 専用ブランチを切る**

Run: `git fetch -p origin && git checkout -b modernize-stack-phase5 origin/main`
Expected: 新ブランチに切り替わり、`origin/main` の最新（`0db6390 Phase 4: drop legacy reader and obsolete deps` 以降）を起点にしている

- [ ] **Step 2: クリーンビルドで baseline を取得**

Run:

```bash
rm -rf node_modules .velite dist tsconfig.tsbuildinfo
pnpm install
pnpm build
```

Expected: 3 コマンドすべて exit 0。`dist/client/` が生成される

- [ ] **Step 3: baseline 値を記録**

Run:

```bash
mkdir -p .tmp
{
  echo "=== Phase 5 baseline (post-Phase 4 main, React 18) ==="
  echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "--- dist/client (TanStack Start prerender) ---"
  du -sh dist/client
  du -sh dist/client/assets
  echo "html_count: $(find dist/client -name "*.html" | wc -l | tr -d ' ')"
  echo "js_total_bytes: $(find dist/client -name "*.js" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')"
  echo "css_total_bytes: $(find dist/client -name "*.css" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')"
  echo
  echo "--- out/ (Next.js legacy export, on disk only) ---"
  if [ -d out ]; then
    du -sh out
    echo "html_count: $(find out -name "*.html" | wc -l | tr -d ' ')"
    echo "js_total_bytes: $(find out -name "*.js" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')"
    echo "css_total_bytes: $(find out -name "*.css" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')"
  else
    echo "out/ not present"
  fi
} > .tmp/phase5-baseline.txt
cat .tmp/phase5-baseline.txt
```

Expected: 出力が `.tmp/phase5-baseline.txt` に保存され、コンソールにも表示される。`dist/client` の `html_count` は 111 以上、`js_total_bytes` は数百 KB オーダー。`out/` が残っていれば（`.gitignore` 対象だがワーキングツリーにある）併記される

> 注: `.tmp/` は既存の `.gitignore` にカバーされている（`.tmp/` ディレクトリがすでに存在し commit されていない）。記録ファイルは Task 6 で spec に転記し終えたら破棄する

- [ ] **Step 4: 初回ロード時間の計測（任意・ベストエフォート）**

Run:

```bash
pnpm start &
START_PID=$!
sleep 2
curl -s -o /dev/null -w "TTFB:%{time_starttransfer}s total:%{time_total}s size:%{size_download}\n" http://localhost:4173/ | tee -a .tmp/phase5-baseline.txt
curl -s -o /dev/null -w "TTFB:%{time_starttransfer}s total:%{time_total}s size:%{size_download}\n" http://localhost:4173/profile/ | tee -a .tmp/phase5-baseline.txt
curl -s -o /dev/null -w "TTFB:%{time_starttransfer}s total:%{time_total}s size:%{size_download}\n" http://localhost:4173/php-replace-lf/ | tee -a .tmp/phase5-baseline.txt
kill $START_PID
```

Expected: 3 URL すべて `TTFB` / `total` / `size` が出力され、`.tmp/phase5-baseline.txt` に追記される

> 注: ローカル `vite preview` の数値は本番 Cloudflare Pages の値とは別物。Phase 2 比較は同じ環境（ローカル preview）で取得した数値同士で比較するため、参考値として記録するに留める

- [ ] **Step 5: Commit はしない（baseline はテンポラリ）**

Task 1 では commit を作らず、計測ファイルを `.tmp/` に保持したまま Task 2 へ進む。最終的に Task 6 で spec に転記し、`.tmp/phase5-baseline.txt` は git 管理外のまま破棄する。

---

## Task 2: package.json メタデータの整流

`description` と `keywords` を実態に合わせる。Next.js 撤去後も残っていた `"nextjs"` キーワードと、Gatsby 時代から流用されたままの `description` を修正する。

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 現状確認**

Run: `grep -E '"description"|"keywords"' package.json`
Expected:

```
  "description": "Simple starter for Gatsby",
  "keywords": [
```

- [ ] **Step 2: `description` を修正**

`package.json` の 3 行目:

```json
  "description": "Simple starter for Gatsby",
```

を以下に置換:

```json
  "description": "A static blog by jaxx2104",
```

- [ ] **Step 3: `keywords` から `"nextjs"` を削除**

`package.json` の `keywords` 配列:

```json
  "keywords": [
    "blog",
    "nextjs",
    "typescript"
  ],
```

を以下に置換:

```json
  "keywords": [
    "blog",
    "typescript"
  ],
```

- [ ] **Step 4: 静的検査**

Run: `pnpm test && pnpm lint:ci`
Expected: 両方 exit 0（package.json メタデータ変更は型・lint に影響しないが、念のため確認）

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore(pkg): fix description and drop nextjs keyword (post-modernization cleanup)"
```

---

## Task 3: build.sh ラッパーのコメント整理

Phase 4 で `CF_PAGES_BRANCH` ベースの分岐は既に削除済み。残るのは Cloudflare Pages dashboard が `bash build.sh` を build command として呼んでいる事実だけなので、wrapper は維持しつつコメントを現状（main = TanStack Start prerender、`pnpm build` のみを呼ぶ）に合わせて簡潔化する。

**Files:**
- Modify: `build.sh`

- [ ] **Step 1: 現状の `build.sh` を確認**

Run: `cat build.sh`
Expected: 以下の内容（Phase 4 完了時点）:

```bash
#!/bin/bash
# Cloudflare Pages build entry.
#
# After Phase 2 of the stack modernization, `pnpm build` is the
# TanStack Start prerender (dist/client/). On main (which still ships
# Next.js until the migration merges), `pnpm build` resolves to
# `next build` from main's package.json — same script name, branch-
# specific behavior. We keep this thin wrapper so Cloudflare's dashboard
# build command does not need to change between branches.
set -euo pipefail
branch="${CF_PAGES_BRANCH:-main}"
echo "build.sh: branch=$branch -> pnpm build"
pnpm build
```

- [ ] **Step 2: コメントを post-Phase 4 の実態に合わせて簡潔化**

`build.sh` 全体を以下に置換:

```bash
#!/bin/bash
# Cloudflare Pages build entry.
#
# This thin wrapper exists because the Cloudflare Pages dashboard build
# command is set to `bash build.sh`. After the Phase 4 modernization
# completed, `pnpm build` is the only build path (velite + vite prerender
# to dist/client/). The branch-aware logic that lived here during the
# migration was removed once main switched fully to TanStack Start.
set -euo pipefail
echo "build.sh: pnpm build"
pnpm build
```

- [ ] **Step 3: 実行可能ビットを確認**

Run: `ls -l build.sh`
Expected: `-rwxr-xr-x` 等で実行ビットが立っている。立っていなければ `chmod +x build.sh` で復元（Phase 1 で commit 済みのはず）

- [ ] **Step 4: ローカルで build.sh を実行して機能回帰なしを確認**

Run: `bash build.sh`
Expected: `build.sh: pnpm build` が echo され、velite build → vite build が走り、`dist/client/` が再生成され exit 0

- [ ] **Step 5: Commit**

```bash
git add build.sh
git commit -m "chore(build.sh): simplify wrapper comments after phase 4 (single-branch pnpm build)"
```

---

## Task 4: React 18 → 19 アップグレード

modernize-stack 移行の最後の難所。`@tanstack/react-start` の peer は `react: >=18.0.0 || >=19.0.0` を許容するため互換性は確保されているが、Velite が rehype-pretty-code と shiki 経由で内部に React 型を引き込んでいる経路は無いはずなので、実機の `pnpm test` / `pnpm build` がグリーンであれば本タスクは成立する。

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`（自動）

- [ ] **Step 1: React 19 deprecation の影響を grep で事前確認**

React 19 で挙動が変わる主要 API（`forwardRef`、`useContext` の Context value、`PropTypes`、`defaultProps` on function components、`legacy ref string`、`ReactDOM.render`、`ReactDOM.hydrate`、`createFactory`）の利用有無を確認:

```bash
grep -rn -E 'forwardRef|defaultProps|PropTypes|ReactDOM\.render|ReactDOM\.hydrate|createFactory' \
  --include="*.ts" --include="*.tsx" \
  app components lib styles 2>/dev/null
```

Expected: ヒットゼロ。`forwardRef` だけは使う場面があるが本リポジトリでは Phase 3 の CSS Modules 化で残っていないはず

ヒットがあった場合は React 19 移行ガイド (https://react.dev/blog/2024/04/25/react-19-upgrade-guide) を参照し、各 API の新しい呼び出し形に書き換える task を本 task の前に挿入する。

- [ ] **Step 2: 現行 React / @types/react のバージョン確認**

Run: `pnpm list react react-dom @types/react @types/react-dom 2>/dev/null | grep -E "^(react|@types/react)"`
Expected:

```
react 18.3.1
react-dom 18.3.1
@types/react ^18.3.11
```

`@types/react-dom` が出力に無ければ未インストール。React 19 では `@types/react-dom` を明示インストールする必要がある（v18 では `@types/react` に同梱、v19 では分離）。

- [ ] **Step 3: React 19 系へバージョン bump**

Run:

```bash
pnpm add react@^19 react-dom@^19
pnpm add -D @types/react@^19 @types/react-dom@^19
```

Expected: `package.json` の `dependencies.react` / `dependencies.react-dom` が `^19.x.x` に、`devDependencies."@types/react"` が `^19` に、`devDependencies."@types/react-dom"` が `^19` で新規追加される。`pnpm-lock.yaml` が自動更新される

> 注: `pnpm add` 実行時に peer dependency 警告が出る場合がある。TanStack Start ファミリ (`@tanstack/react-router` / `@tanstack/react-start` / `@tanstack/router-plugin`) は React 19 を許容しているはずだが、`@vitejs/plugin-react` (^6.0.1) も React 19 対応版であることを Step 4 のビルドで実機確認する

- [ ] **Step 4: クリーンインストール + 静的検査 + ビルド**

Run:

```bash
rm -rf node_modules .velite dist tsconfig.tsbuildinfo
pnpm install
pnpm test
pnpm build
pnpm lint:ci
```

Expected: 4 コマンドすべて exit 0
- `pnpm install`: peer warning 0 件、または React 19 関連 peer の許容範囲内
- `pnpm test`: tsc が `@types/react` 19 系で型チェックを通過
- `pnpm build`: velite + vite prerender が成功し、`dist/client/` 配下に 111 件以上の HTML
- `pnpm lint:ci`: Biome がエラーなし

失敗パターンと対応:

1. **tsc が `@types/react` 19 由来の breaking type で落ちる**: 主な変更は `JSX` namespace の `React.JSX` への移動と `useRef<T>` の引数必須化。エラー行を特定し、最小限の型注釈追加で潰せるなら本 task 内で吸収。広範囲（10 ファイル超）に及ぶなら本 task を打ち切り Step 7 のフォールバックへ
2. **`vite build` が `@vitejs/plugin-react` の peer not satisfied で落ちる**: `pnpm list @vitejs/plugin-react` で実バージョンを確認し、React 19 対応のメジャー（v6 系）であれば peer は満たすはず。落ちる場合は `pnpm add -D @vitejs/plugin-react@latest` で更新を試す
3. **TanStack Start の hydration error / runtime warning**: prerender は SSR 相当のため、React 19 で挙動が変わった `useId` の確定値生成や `Suspense` の境界に絡むことがある。`pnpm build` 出力の warning を読み、TanStack Start 側のバージョンも `pnpm add @tanstack/react-start@latest @tanstack/react-router@latest` で最新化を試す

- [ ] **Step 5: ローカル smoke test**

Run: `pnpm start`
別ターミナルで以下を順に確認:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/profile/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/php-replace-lf/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/readme-siri/
```

Expected: 4 URL すべて `200`

ブラウザで `http://localhost:4173/` を開き、以下を目視確認:
- 記事一覧が 109 件以上描画される
- 任意の記事をクリックして詳細遷移が動作する（TanStack Router の client-side navigation）
- ダークモードトグルで `<html data-theme>` が切り替わり、リロード後も保持される
- DevTools Console に `Warning: ` で始まる React 19 関連のエラー / 警告が出ていない

問題があれば Step 4 の対応 1〜3 と同じトラブルシューティング、または Step 7 のフォールバック。

- [ ] **Step 6: prerender 出力数の回帰確認**

Run: `find dist/client -name index.html | wc -l`
Expected: `111` 以上（CI workflow と同じ閾値）

- [ ] **Step 7: フォールバック判定**

ここまでの Step 4〜6 がすべて成功した場合: Step 8 の commit へ進む。

ここまでで失敗が解消できない場合（spec section 11「問題が出たら React 18 のまま完了させ、19 化は別 PR に分離」に従う）:

```bash
git checkout package.json pnpm-lock.yaml
rm -rf node_modules
pnpm install
pnpm test
pnpm build
```

で React 18 状態に巻き戻し、本 task をスキップして Task 5 へ進む。Task 6 の spec 追記で「Phase 5 では React 19 化を見送り、別 PR で対応する」を明記する。Phase 5 の他項目（Task 2 / 3 / 5）は React 18 のまま完了する。

- [ ] **Step 8: Commit**

成功した場合のみ:

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: upgrade to react 19 (modernize-stack phase 5)"
```

---

## Task 5: tsc -p . の CI 必須化を確認

spec section 9 Phase 5 の「`tsc -p .` を CI で必須化（既に Phase 4 時点で test job に組み込まれている）」を実機確認する。コード変更は基本的に発生しない（既に組み込み済みのはず）。万一未組込なら本 task 内で組み込む。

**Files:**
- Modify (条件付き): `.github/workflows/test.yml`

- [ ] **Step 1: 現行 CI workflow の `pnpm test` step を確認**

Run: `grep -n -A1 'pnpm test' .github/workflows/test.yml`
Expected: `pnpm test` が独立した step として `pnpm build` の後に呼ばれている。`package.json` の `scripts.test` は `tsc -p ./tsconfig.json` なので、これがそのまま CI の必須 step になっている

該当行（Phase 4 完了時点で確認済み）:

```yaml
      - name: Build content layer + tanstack start prerender
        run: pnpm build
      - run: pnpm test
```

- [ ] **Step 2: 必須化を裏付けるためローカルで意図的に型エラーを混入し CI 相当 check が落ちることを確認（任意）**

`app/router.tsx` 等の任意のファイルに型エラーを 1 行混入（例: `const x: number = "string";`）し、`pnpm test` を実行:

Run: `pnpm test`
Expected: tsc が exit code 非 0（`error TS2322: Type 'string' is not assignable to type 'number'.`）で落ちる

確認したら混入した行を削除（`git checkout <file>`）して状態を戻す。本 step を省略しても plan の正しさには影響しない（既に Step 1 で組込みは確認済みのため）。

- [ ] **Step 3: 必須化されていなかった場合の修正（条件付き）**

Step 1 で `pnpm test` step が CI から欠落していた場合のみ、`.github/workflows/test.yml` の `pnpm build` step の直後に追加:

```yaml
      - name: Type check
        run: pnpm test
```

Step 1 で組込み済みが確認できていれば本 step はスキップして Step 4 へ。

- [ ] **Step 4: Commit（条件付き）**

Step 3 で修正した場合のみ:

```bash
git add .github/workflows/test.yml
git commit -m "ci: add tsc type check as required step (modernize-stack phase 5)"
```

修正不要だった場合は commit を作らず Task 6 へ進む。

---

## Task 6: Phase 5 完了レポートを spec に追記し PR を準備

spec の Phase 5 セクションに Gate 完了を追記し、バンドル計測結果を記録、modernize-stack 移行プロジェクトを締める。

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: 最終クリーンビルドで全 Gate 確認**

Run:

```bash
rm -rf node_modules .velite dist tsconfig.tsbuildinfo
pnpm install
pnpm build
pnpm test
pnpm lint:ci
pnpm lint:text
```

Expected: 5 コマンドすべて exit 0

- [ ] **Step 2: Phase 5 後のバンドルサイズを計測**

Run:

```bash
{
  echo
  echo "=== Phase 5 final (post-React-19, post-cleanup) ==="
  echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  du -sh dist/client
  du -sh dist/client/assets
  echo "html_count: $(find dist/client -name "*.html" | wc -l | tr -d ' ')"
  echo "js_total_bytes: $(find dist/client -name "*.js" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')"
  echo "css_total_bytes: $(find dist/client -name "*.css" -type f -exec wc -c {} + | tail -1 | awk '{print $1}')"
} >> .tmp/phase5-baseline.txt
cat .tmp/phase5-baseline.txt
```

Expected: `.tmp/phase5-baseline.txt` に Phase 4 baseline と Phase 5 final の 2 セクションが揃う

- [ ] **Step 3: Phase 5 セクションに Gate 完了を追記**

`docs/superpowers/specs/2026-05-01-modernize-stack-design.md` の `### Phase 5: 仕上げ（半日〜1 日）` 見出しを `### Phase 5: 仕上げ（半日〜1 日）（完了: 2026-05-03）` に変更。

セクション末尾の箇条書きの直後に以下を追記:

```markdown
- **Gate 完了**: 2026-05-03 時点で
  - `react` / `react-dom` を 18.3.1 → 19.x に bump、`@types/react` も 19 系に追従、`@types/react-dom` を 19 系で新規追加（または React 19 化で実機ビルドが通らなかったため別 PR に分離した旨を明記）
  - `package.json` の `description` を `"Simple starter for Gatsby"` → `"A static blog by jaxx2104"` に修正、`keywords` から `"nextjs"` を削除
  - `build.sh` の Phase 1〜4 経過を引きずったコメントを post-Phase 4 の実態に整流（branch 分岐ロジックは Phase 4 で削除済み、本フェーズはコメントのみ）
  - `tsc -p .` は Phase 4 時点で `.github/workflows/test.yml` の `pnpm test` step として組込み済みであることを確認（追加変更なし）
  - クリーンインストール (`rm -rf node_modules .velite dist && pnpm install`) 後、`pnpm build && pnpm test && pnpm lint:ci && pnpm lint:text` がすべて exit 0
  - `dist/client/` の prerender 件数 111 を維持
  - バンドルサイズ計測（Phase 4 baseline → Phase 5 final、ローカル `pnpm build` 出力）:
    - `dist/client` 総容量: <Phase 4 値> → <Phase 5 値>
    - `dist/client/assets` 容量: <Phase 4 値> → <Phase 5 値>
    - JS 合計バイト: <Phase 4 値> → <Phase 5 値>
    - CSS 合計バイト: <Phase 4 値> → <Phase 5 値>
    - 参考: Next.js 時代の `out/` 総容量（ワーキングツリー残存）: <値>
  - 初回ロード参考値（ローカル `vite preview` の TTFB / total / size）:
    - `/`: <値>
    - `/profile/`: <値>
    - `/php-replace-lf/`: <値>
```

`<...値>` 部分は Step 2 の `.tmp/phase5-baseline.txt` から Phase 4 baseline / Phase 5 final それぞれを転記する。React 19 化が Task 4 Step 7 でフォールバックされた場合は最初の bullet を「React 19 化は本 PR では見送り、別 PR (#TBD) で対応予定」に書き換える。

- [ ] **Step 4: spec section 12「未決事項」を最終整理**

`### 残課題（Phase 4 以降で解消）` 見出しを `### 残課題（Phase 4〜5 で解消）` に変更し、各 bullet の状態を最新化:

- `OGP 画像の生成パイプライン`: Phase 2 で完結しているため「Phase 2 で完結」と末尾を更新
- `velite.config.ts の tsconfig exclude` と `@ts-expect-error`: Phase 4 Task 6 の結果（exclude を外せたか / 残したか）を反映
- `prerender の crawlLinks 戦略`: Phase 2 で `pages` 配列に切り替え済みのため「Phase 2 で完結」を確認
- `styled-components の SSR FOUC`: Phase 3 で根治済みのため「Phase 3 で完結」を確認
- `<img> element の biome 警告`: Phase 4 で抑制コメントを削除済みのため「Phase 4 で完結」を確認

すでに完結した項目は当該 bullet 末尾に `→ 完了 (Phase N)` と追記する形で残す（履歴として参照できるよう削除しない）。

- [ ] **Step 5: 静的検査一式**

Run: `pnpm test && pnpm lint:ci`
Expected: 両方 exit 0

- [ ] **Step 6: ブランチを push**

Run: `git push -u origin modernize-stack-phase5`
Expected: GitHub Actions の Test ジョブが緑になる

CI が落ちた場合:
- `Verify dist artifacts (phase 2 routes + OGP)` step が失敗 → ローカルで `pnpm build` を再実行し、prerender 出力を確認。React 19 由来の hydration error が prerender 段階で起きていないか `pnpm build` の stderr を確認
- `pnpm test` が失敗 → React 19 の `@types/react` で発生する型エラーを Task 4 Step 4 のトラブルシューティングに沿って修正

- [ ] **Step 7: Commit + PR**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs: record phase 5 completion and bundle metrics in modernize-stack spec"
git push
```

PR 作成は jaxx-pr スキル（または `gh pr create`）で本ブランチから main に向けて。タイトル例:

```
Phase 5: react 19, metadata cleanup, bundle metrics (modernize-stack)
```

PR 本文には以下を含める:
- Phase 5 の全 Gate 完了内容（Step 3 で spec に書いた箇条書きをそのまま）
- Task 1〜6 の commit リスト（`git log --oneline origin/main..HEAD`）
- React 19 化を見送った場合はその経緯と、別 PR で対応予定である旨（必要なら GitHub Issue を併せて起票し、PR 本文からリンクする）

PR がマージされたら modernize-stack 移行プロジェクト全体（Phase 0〜5）が完了。spec の最上部 `**ステータス**: Draft（ユーザーレビュー待ち）` を `**ステータス**: 完了（2026-05-03）` に書き換える last-mile commit を追加するか、別 commit で対応する。

- [ ] **Step 8: テンポラリファイルを破棄**

Run: `rm -f .tmp/phase5-baseline.txt`
Expected: ファイルが削除される。`.tmp/` ディレクトリは git 管理外なので追加 commit は不要

---

## Self-Review チェックリスト

実装完了後に以下を確認:

1. **Spec Phase 5 全項目のカバレッジ**
   - React 18 → 19 → Task 4 でカバー（フォールバック条件も明記）
   - `tsc -p .` を CI で必須化 → Task 5 で確認（既に組込み済み確認）
   - `build.sh` のブランチ分岐撤去 → Task 3 でカバー（実分岐は Phase 4 で除去済みのため、コメント整流のみ）
   - `package.json` の `description` 修正 → Task 2 でカバー
   - `package.json` の `keywords` から `"nextjs"` 削除 → Task 2 でカバー
   - バンドルサイズ / 初回ロード時間の Phase 2 比計測 → Task 1 で baseline、Task 6 で final、spec 転記でカバー

2. **placeholder 残留なし**
   - "TBD"、"TODO"、"後で書く"、"後ほど" がプラン本文にゼロであること（spec 転記時の `<値>` プレースホルダは Step 2 の数値で置換される明示的な穴で、step 3 内に「Step 2 から転記する」と書かれているため OK）

3. **タスク順序の依存関係**
   - Task 1 (baseline 取得) → Task 2〜5 (各種変更) → Task 6 (final 計測 + spec 追記) の順序が守られていること
   - Task 4 (React 19) は他 task と独立しており、フォールバック時に他 task の commit に影響を与えない構造になっていること

4. **CI workflow の整合**
   - 既存の `Verify dist artifacts (phase 2 routes + OGP)` step は React 19 化後も `>= 111` HTML / OGP meta / hashed CSS asset を満たすため、追加変更なしで通ることを確認済み
   - `pnpm build` → `pnpm test` の順序が維持されていること（routeTree.gen.ts の生成依存）

5. **Branch / Git 運用**
   - 全 commit 前に `git fetch -p origin && git checkout -b modernize-stack-phase5 origin/main` でブランチを切ってから作業しているか（Task 1 Step 1）
   - 各 Task 末尾で個別 commit を作成しており、中間状態でも `pnpm build && pnpm test && pnpm lint:ci` が緑

6. **fish shell との互換**
   - すべての shell コマンドが POSIX/fish で同等に動く（Task 1 Step 3 / Task 6 Step 2 の `{ ... }` グループは bash 構文。fish では `begin; ...; end` だが、一連の計測コマンドは `bash -c '...'` で囲むか、`.tmp/phase5-baseline.txt` への追記を `>>` で逐次行う形に分解する。本 plan では `{ }` のままで bash 想定とする — 実行時に `bash` を明示的に呼ぶか、CLAUDE.md の「コマンド実行は fish 経由」に従い `bash -lc '<heredoc>'` でラップする）

7. **React 19 フォールバック経路**
   - Task 4 Step 7 でフォールバック時の手順（`git checkout package.json pnpm-lock.yaml && rm -rf node_modules && pnpm install`）が明文化されていること
   - フォールバック時の spec 追記文言（Task 6 Step 3 の最初の bullet 書き換え）が指示されていること

8. **計測結果の最終転記**
   - Task 6 Step 3 の `<値>` プレースホルダがすべて `.tmp/phase5-baseline.txt` の実値で置換されてから commit されること
   - `.tmp/phase5-baseline.txt` は最終的に Step 8 で破棄され、リポジトリに残らないこと
