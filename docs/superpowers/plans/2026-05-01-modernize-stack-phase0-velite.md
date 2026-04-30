# Stack Modernization Phase 0: Velite 検証 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Velite を導入し、`content/posts/**/index.md` を Zod スキーマで型安全にパースして、shiki によるハイライトと OGP リンクカード変換を経た本文 HTML を生成する。既存 Next.js アプリには手を入れない。Phase 0 が完了すると、後続 Phase で TanStack Start に乗せる「型付きコンテンツ層」が手に入る。

**Architecture:** `velite build` を独立したビルドステップとして追加し、`.velite/` に `Post[]` の JS と `.d.ts` を出力する。既存の remark/rehype パイプライン（`rehype-pretty-code`、`rehype-link-card`）は Velite の `markdown` 拡張ポイントに移植する。画像は `public/images/posts/<slug>/` へコピーし、本文中の相対パスを公開 URL に書き換える。出力件数・パース失敗・URL 構造を検証するスクリプトを別途追加する。

**Tech Stack:** velite, zod, rehype-pretty-code, rehype-link-card（既存）, gray-matter（Velite 内部）, TypeScript 5.8

---

## File Structure

### Create
- `velite.config.ts` — Velite 全体設定（コレクション・スキーマ・パイプライン）
- `lib/content/schema.ts` — `Post` の Zod スキーマ定義（`velite.config.ts` から import）
- `lib/content/markdown.ts` — Velite の markdown プロセッサ設定（rehype プラグインの組み立て）
- `scripts/verify-velite.ts` — Velite 出力と既存 `getAllPosts()` を突き合わせる検証スクリプト
- `scripts/inspect-paths.ts` — `content/posts/**/index.md` の `frontmatter.path` を集計し、slug との関係を出力するスクリプト

### Modify
- `package.json` — `velite` を `devDependencies` に追加、`scripts.velite` / `scripts.verify:velite` / `scripts.inspect:paths` を追加。`scripts.build` は触らない（Next.js のまま）
- `tsconfig.json` — `include` に `velite.config.ts`、`lib/content/**`、`scripts/**` を追加。`exclude` に `.velite/` を追加
- `.gitignore` — `.velite/` を追加
- `biome.json` — `files.includes` に `scripts/**`、`lib/content/**` を追加

### Untouched
- `app/`、`components/`、`next.config.mjs`、`lib/posts.ts`、`lib/image-utils.ts`、`lib/rehype-link-card.ts`、`lib/link-card.ts` — Phase 0 では既存 Next.js アプリは触らない

---

## Conventions

- Velite プロジェクトのルートは `velite.config.ts` のあるディレクトリ。`root` には `content` を指定する
- Zod スキーマは Velite が再エクスポートする `s` を使う（`s` は zod に Velite の `image()` `markdown()` `excerpt()` などを足したもの）
- 検証スクリプトは `tsx` で実行する（既に dev 依存に含まれていなければ追加）

---

## Task 1: Velite と検証スクリプト用ランタイムの追加

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 0: 専用ブランチを切る**

Run: `git fetch -p origin && git checkout -b modernize-stack-phase0 origin/main`
Expected: 新ブランチに切り替わり、`origin/main` の最新を起点にしている

- [ ] **Step 1: Velite と tsx を devDependencies に追加**

```bash
pnpm add -D velite@^0.3 tsx@^4
```

- [ ] **Step 2: `package.json` の scripts に Velite 関連を追加**

`package.json` の `scripts` を以下のキーで拡張する（既存キーは保持）:

```json
{
  "scripts": {
    "velite": "velite",
    "velite:build": "velite build",
    "velite:dev": "velite dev",
    "verify:velite": "tsx scripts/verify-velite.ts",
    "inspect:paths": "tsx scripts/inspect-paths.ts"
  }
}
```

- [ ] **Step 3: `.gitignore` に `.velite/` を追加**

`.gitignore` の末尾に以下を追加:

```
# Velite generated content layer
.velite/
```

- [ ] **Step 4: コマンドが存在することを確認**

Run: `pnpm exec velite --help`
Expected: usage 表示で exit 0

Run: `pnpm exec tsx --version`
Expected: バージョン番号で exit 0

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: add velite and tsx for content layer migration"
```

---

## Task 2: Zod スキーマ定義（`lib/content/schema.ts`）

既存 `PostData` フィールドに対応する Zod スキーマを定義する。すべての記事 109 件をパースしてエラー件数を可視化することが目的なので、緩めの定義で始める（`updated_at` 任意、`category` 任意、`tags` 配列既定 `[]`）。

**Files:**
- Create: `lib/content/schema.ts`

- [ ] **Step 1: `lib/content/schema.ts` を作成**

```typescript
import { s } from "velite"

export const postSchema = s
  .object({
    title: s.string().min(1),
    created_at: s.isodate(),
    updated_at: s.isodate().optional(),
    path: s.string().regex(/^\/.+/, "path must start with '/'").optional(),
    category: s.string().optional(),
    tags: s.array(s.string()).default([]),
    slug: s.path(),
    body: s.markdown(),
    excerpt: s.excerpt({ length: 40 }),
  })
  .transform((data) => ({
    ...data,
    permalink: data.path ?? `/${data.slug.split("/").pop()}/`,
  }))

export type Post = ReturnType<typeof postSchema.parse>
```

`s.isodate()` が `created_at: "2013-08-06T00:22:48+00:00"` のようなタイムゾーン付き ISO 文字列も受けることを Velite ドキュメントで確認しておく（受けない場合は `s.string().datetime({ offset: true })` に置換）。

- [ ] **Step 2: TS で構文エラーがないことを確認**

Run: `pnpm exec tsc --noEmit -p tsconfig.json`
Expected: エラーなし（このファイルが `tsconfig.json` の `include` に入っていることが前提。Task 4 で追加するので、ここでは `--project tsconfig.json` ではなく単独で型を確認しても可）

代替で単独確認:

Run: `pnpm exec tsc --noEmit --target ES2022 --moduleResolution bundler --esModuleInterop lib/content/schema.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/content/schema.ts
git commit -m "feat(content): add zod post schema for velite"
```

---

## Task 3: Markdown パイプライン定義（`lib/content/markdown.ts`）

既存の `rehypePrettyCode` 設定（dracula テーマ、`keepBackground: true`）と `rehypeLinkCard` を Velite の markdown プロセッサに渡せる形にまとめる。

**Files:**
- Create: `lib/content/markdown.ts`

- [ ] **Step 1: `lib/content/markdown.ts` を作成**

```typescript
import rehypePrettyCode from "rehype-pretty-code"
import rehypeLinkCard from "../rehype-link-card"

// Do NOT seal with `as const` — velite's MarkdownOptions expects mutable
// PluggableList; a readonly literal fails to assign (verified against
// velite v0.3.1 dist/index.d.ts).
export const markdownConfig = {
  remarkPlugins: [],
  rehypePlugins: [
    [
      rehypePrettyCode,
      {
        theme: "dracula",
        keepBackground: true,
        defaultLang: "plaintext",
      },
    ],
    rehypeLinkCard,
  ],
}
```

- [ ] **Step 2: 型チェック**

Run: `pnpm exec tsc --noEmit --target ES2022 --moduleResolution bundler --esModuleInterop --jsx preserve lib/content/markdown.ts`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add lib/content/markdown.ts
git commit -m "feat(content): extract markdown pipeline config for velite"
```

---

## Task 4: Velite の最小構成で起動

スキーマと markdown 設定を `velite.config.ts` でつなぎ、`pnpm velite:build` がエラーなく完走することを確認する。画像コピーは Task 5 で扱う。

**Files:**
- Create: `velite.config.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: `velite.config.ts` を作成**

```typescript
import { defineConfig, defineCollection } from "velite"
import { postSchema } from "./lib/content/schema"
import { markdownConfig } from "./lib/content/markdown"

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/index.md",
  schema: postSchema,
})

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/images/posts",
    base: "/images/posts/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts },
  markdown: markdownConfig,
})
```

- [ ] **Step 2: `tsconfig.json` を更新**

`include` に以下のエントリを追加:

```json
{
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "lib/**/*.tsx",
    "styles/**/*.ts",
    "styles/**/*.tsx",
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "velite.config.ts",
    "scripts/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "public",
    ".cache",
    ".velite",
    "**/*.old/**/*",
    "**/*.bak/**/*"
  ]
}
```

- [ ] **Step 3: `biome.json` を更新**

`files.includes` 配列に以下を追加: `"scripts/**"`、`"velite.config.ts"`。

- [ ] **Step 4: `pnpm velite:build` を実行**

Run: `pnpm velite:build`
Expected:
- 標準出力に `entries 109` 程度の件数が表示される（実数は後で確認）
- `.velite/posts.json`、`.velite/index.js`、`.velite/index.d.ts` が生成される
- exit 0

失敗した場合:
- スキーマ違反のエラーメッセージから、必須の `path` を持たない記事や `created_at` が ISO ではない記事を特定し、`postSchema` をその実体に合わせて緩める（`title.min(1)` を `title.string()` に、`created_at` の検証を `s.string()` にダウングレードするなど）。修正後に再実行する。
- ループしない: 同じパースエラーが 3 周以上続いたら、その記事を `pattern` から `exclude` で外し、残件は別タスクで個別対応する旨を `scripts/verify-velite.ts` の出力に明記する

- [ ] **Step 5: 出力ファイルを確認**

Run: `ls -la .velite/`
Expected: `posts.json`、`index.js`、`index.d.ts` が存在

Run: `head -1 .velite/posts.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d), 'posts');"`
Expected: 数字が表示される（109 前後）

- [ ] **Step 6: Commit**

```bash
git add velite.config.ts tsconfig.json biome.json
git commit -m "feat: wire up velite content layer with shiki + link-card pipeline"
```

---

## Task 5: URL（path）構造の調査

frontmatter の `path` フィールドが各記事でどう設定されているかを集計し、後続 Phase での URL 戦略を確定する。Phase 1 のルーター設計に使う情報。

**Files:**
- Create: `scripts/inspect-paths.ts`

- [ ] **Step 1: `scripts/inspect-paths.ts` を作成**

```typescript
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const postsDir = path.join(process.cwd(), "content/posts")
const dirs = fs.readdirSync(postsDir)

let withPath = 0
let withoutPath = 0
const slashCounts = new Map<number, number>()
const mismatches: { slug: string; path: string }[] = []

for (const dir of dirs) {
  const full = path.join(postsDir, dir, "index.md")
  if (!fs.existsSync(full)) continue
  const { data } = matter(fs.readFileSync(full, "utf8"))
  const fmPath = typeof data.path === "string" ? data.path : undefined

  if (fmPath) {
    withPath += 1
    const slashes = (fmPath.match(/\//g) ?? []).length
    slashCounts.set(slashes, (slashCounts.get(slashes) ?? 0) + 1)

    const slugTail = dir.replace(/^\d{4}-\d{2}-\d{2}-/, "")
    const expected = `/${slugTail}`
    if (fmPath !== expected) {
      mismatches.push({ slug: dir, path: fmPath })
    }
  } else {
    withoutPath += 1
  }
}

console.log("With frontmatter.path:    ", withPath)
console.log("Without frontmatter.path: ", withoutPath)
console.log("Slash counts in path:     ", Object.fromEntries(slashCounts))
console.log(
  "Slugs whose path != /<slug-without-date> :",
  mismatches.length,
)
if (mismatches.length > 0) {
  console.log("Sample mismatches (up to 10):")
  for (const m of mismatches.slice(0, 10)) {
    console.log(`  ${m.slug}  ->  ${m.path}`)
  }
}
```

- [ ] **Step 2: 実行**

Run: `pnpm inspect:paths`
Expected: 統計が表示され exit 0

- [ ] **Step 3: 結果を spec に書き戻す**

`docs/superpowers/specs/2026-05-01-modernize-stack-design.md` の「12. 未決事項」セクションの項目 1 に、Step 2 の出力サマリ（`withPath`、`withoutPath`、`slashCounts`、`mismatches.length`）を追記する。例:

```markdown
1. 既存 slug が階層を含むか
   - 検証結果（2026-05-01 時点）: with-path=N1, without-path=N2, slash-counts={1:N3}, mismatches=N4
   - 結論: ルートには `$.tsx` を採用し、loader 内で frontmatter.path を見て該当記事を選ぶ／slug は日付プレフィックスを除いた tail を使う、を Phase 1 で確定する
```

- [ ] **Step 4: Commit**

```bash
git add scripts/inspect-paths.ts docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "chore(content): inspect frontmatter path structure"
```

---

## Task 6: Velite 出力と既存 `getAllPosts()` の整合検証

Velite の出力件数と既存 `getAllPosts()` の出力件数・主要フィールドが一致することを確認する。これが Phase 0 の Gate。

**Files:**
- Create: `scripts/verify-velite.ts`

- [ ] **Step 1: `scripts/verify-velite.ts` を作成**

```typescript
import { getAllPosts } from "../lib/posts"

type VelitePost = {
  slug: string
  title: string
  created_at: string
  path?: string
  permalink: string
}

async function main() {
  const veliteModule = (await import("../.velite/index.js")) as {
    posts: VelitePost[]
  }
  const velitePosts = veliteModule.posts
  const legacyPosts = await getAllPosts()

  console.log("Velite posts: ", velitePosts.length)
  console.log("Legacy posts: ", legacyPosts.length)

  const veliteSlugs = new Set(velitePosts.map((p) => p.slug))
  const legacySlugs = new Set(legacyPosts.map((p) => p.slug))

  const onlyInVelite = [...veliteSlugs].filter((s) => !legacySlugs.has(s))
  const onlyInLegacy = [...legacySlugs].filter((s) => !veliteSlugs.has(s))

  console.log("Only in Velite: ", onlyInVelite)
  console.log("Only in Legacy: ", onlyInLegacy)

  // Fail loudly if counts mismatch
  if (velitePosts.length !== legacyPosts.length) {
    console.error("FAIL: post counts differ")
    process.exit(1)
  }

  // Spot-check title equality on overlap
  const titleMismatches: string[] = []
  for (const v of velitePosts) {
    const l = legacyPosts.find((p) => p.slug === v.slug)
    if (l && l.title !== v.title) {
      titleMismatches.push(`${v.slug}: "${l.title}" vs "${v.title}"`)
    }
  }
  if (titleMismatches.length > 0) {
    console.error("FAIL: title mismatches:")
    for (const m of titleMismatches) console.error("  " + m)
    process.exit(1)
  }

  console.log("OK: counts and titles match")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Velite を再ビルドしてから検証**

Run: `pnpm velite:build && pnpm verify:velite`
Expected:
- `Velite posts: <N>` と `Legacy posts: <N>` が同数
- `Only in Velite: []`、`Only in Legacy: []`
- `OK: counts and titles match`
- exit 0

差分が出た場合:
- `Only in Legacy` の slug が存在 → スキーマで弾かれている。`pnpm velite:build` の出力で該当記事のエラー理由を確認、`postSchema` を実体に合わせて緩めて再実行
- `Only in Velite` の slug が存在 → 既存 `getAllPosts()` が `index.md` の有無以外で除外していないかを確認（現状は単に `index.md` の有無のみ。基本起こらない）

- [ ] **Step 3: 検証結果を spec に書き戻す**

`docs/superpowers/specs/2026-05-01-modernize-stack-design.md` の「9. 移行ステップ」の Phase 0 に、検証完了済みであることと最終件数を追記:

```markdown
- **Gate 完了**: 2026-05-01 時点で既存 `getAllPosts()` と Velite 出力が <N> 件で一致
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-velite.ts docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "test(content): verify velite output matches legacy getAllPosts"
```

---

## Task 7: 画像処理の Velite 移譲確認

既存 `lib/image-utils.ts` は本文中の `![alt](./img.png)` を `/images/posts/<slug>/img.png` に書き換えてファイルコピーしていた。Velite の `s.markdown()` は内部で markdown 中の画像を asset として処理し、`output.assets` で指定した場所にコピーする。両者の出力先・URL が一致することを確認する。

**Files:**
- Modify: `scripts/verify-velite.ts`

- [ ] **Step 1: `scripts/verify-velite.ts` に画像 URL 検証を追加**

`main()` 内、`OK: counts and titles match` の直前に以下を挿入:

```typescript
  // Image asset check: every body should reference /images/posts/ for local images
  const badAssetRefs: string[] = []
  for (const v of velitePosts as Array<VelitePost & { body: string }>) {
    const matches = [...v.body.matchAll(/<img[^>]+src="([^"]+)"/g)]
    for (const m of matches) {
      const src = m[1]
      if (src.startsWith("http://") || src.startsWith("https://")) continue
      // Skip every absolute path: it's either /images/posts/ (Velite-rewritten)
      // or a legacy WordPress URL like /wp/images/... (externally hosted, not
      // a Velite asset). Relative paths (./img.png, img.png) still fall through
      // to the failure case, which is what we want.
      if (src.startsWith("/")) continue
      badAssetRefs.push(`${v.slug}: ${src}`)
    }
  }
  if (badAssetRefs.length > 0) {
    console.error("FAIL: unexpected asset references:")
    for (const r of badAssetRefs) console.error("  " + r)
    process.exit(1)
  }

  // Confirm at least one post has a copied asset on disk
  const fs = await import("node:fs")
  const path = await import("node:path")
  const assetRoot = path.join(process.cwd(), "public", "images", "posts")
  const assetDirs = fs.existsSync(assetRoot) ? fs.readdirSync(assetRoot) : []
  if (assetDirs.length === 0) {
    console.error("FAIL: no copied assets under public/images/posts")
    process.exit(1)
  }
```

`VelitePost` 型に `body: string` を追加するため、ファイル先頭の型定義を以下に置換:

```typescript
type VelitePost = {
  slug: string
  title: string
  created_at: string
  path?: string
  permalink: string
  body: string
}
```

- [ ] **Step 2: 検証スクリプトを再実行**

Run: `pnpm velite:build && pnpm verify:velite`
Expected: `OK: counts and titles match` で exit 0

失敗した場合:
- 本文 HTML に `./image.png` のような相対 URL が残っていれば、Velite が画像を asset として認識していない。`velite.config.ts` の `output.assets` / `output.base` の設定を見直すか、markdown 内の画像参照記法（`![](image.png)` のようなドット無し）が拾われていない可能性。`s.markdown()` の `copyLinkedFiles: true` 相当の設定を確認

- [ ] **Step 3: 既存出力との競合確認**

既存 `lib/image-utils.ts` も同じ `public/images/posts/` に書き込むため、Phase 0 ではディレクトリは共有される（記事のソース画像は同一なので、同じ最終内容になるはず）。`git status -- public/images/posts/` で差分が出ないことを確認:

Run: `git status -- public/images/posts/`
Expected: 「nothing to commit」もしくはコミット済みの追加分のみ。本タスクで意図しない上書き/欠落が起きていないこと

差分が出た場合:
- Velite の hash 付与（`[name]-[hash:6].[ext]`）が既存ファイル名と衝突している可能性。`output.name` を `[name].[ext]` に変更し再ビルド

`output.name` を `[name].[ext]` に変更した場合、`velite.config.ts` の該当行を以下に修正:

```typescript
    name: "[name].[ext]",
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-velite.ts velite.config.ts
git commit -m "test(content): verify velite asset paths align with legacy output"
```

---

## Task 8: CI での Velite ビルドの暫定組み込み

Phase 0 完了時点では `pnpm build` は依然として Next.js のビルドだが、CI で Velite が壊れていないかを継続的に検出するために、独立して `velite:build` と `verify:velite` を CI で走らせる。

**Files:**
- Modify: `.github/workflows/*.yml`（既存 CI ファイルがある場合のみ）

- [ ] **Step 1: 既存 CI ワークフローを確認**

Run: `ls .github/workflows/ 2>/dev/null && head -50 .github/workflows/*.yml 2>/dev/null`
Expected: ファイル一覧とトリガー部分が表示される。存在しなければ Step 2〜4 はスキップして Step 5 のコミットのみ行う

- [ ] **Step 2: 既存 lint/test のジョブに Velite ステップを挿入**

該当ワークフローの `pnpm lint` などのステップ直後に以下を追加:

```yaml
      - name: Build content layer (velite)
        run: pnpm velite:build

      - name: Verify velite output matches legacy
        run: pnpm verify:velite
```

`Verify velite output matches legacy` ステップは Phase 0 期間限定であり、Phase 4 で legacy `getAllPosts()` を撤去する際に削除される。コメントとして書いておく:

```yaml
      # NOTE: temporary cross-check during stack modernization Phase 0.
      # Remove together with lib/posts.ts legacy reader in Phase 4.
      - name: Verify velite output matches legacy
        run: pnpm verify:velite
```

- [ ] **Step 3: ワークフロー YAML の構文を確認**

Run: `pnpm exec tsx -e "import('yaml').then(m=>console.log('ok'))" 2>/dev/null || echo "skip yaml lint"`
（`yaml` が無ければスキップ可）

ローカルで `act` などがあれば一度実行、なければ目視確認のみ。

- [ ] **Step 4: 変更をプッシュして CI を確認**

Run: `git push origin HEAD:refs/heads/phase0-velite`
Expected: GitHub Actions で `velite:build` と `verify:velite` が緑になる

CI が落ちた場合:
- 依存解決問題なら lockfile を確認
- スクリプトのパス問題なら `package.json` を確認
- どうしても解決しない場合はワークフロー追加だけ revert し、ローカル検証で Phase 0 の Gate を満たしたことを spec に追記して次へ進む（CI 統合は Phase 1 と一緒に行う）

- [ ] **Step 5: Commit（Step 1 で CI が無かった場合はこのコミットだけ作成し、ステップ 2〜4 は Phase 1 に持ち越す旨を spec に追記）**

```bash
git add -A
git commit -m "ci: run velite build and legacy cross-check on push"
```

---

## Task 9: Phase 0 完了レポートを spec に追記

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: 「12. 未決事項」セクションを「12. Phase 0 検証結果と未決事項」に改称し、検証で確定した項目を解消済みとして書き換える**

例（Task 5 / Task 6 の結果を反映）:

```markdown
## 12. Phase 0 検証結果と未決事項

### 解消済み
1. slug の階層構造: 全 N1 件が `/<single-segment>/` 形式（slash 数 1）。splat ルート `$.tsx` で問題なくカバー可能。
2. Velite と既存 getAllPosts の整合: N 件で一致。タイトル・slug の差分なし。
3. 画像コピー先: Velite の `output.assets` を `public/images/posts/`、`output.base` を `/images/posts/` にすることで既存 URL 形状（`/images/posts/<slug>/<file>`）と整合。

### 残課題（Phase 1 以降で解消）
- frontmatter `path` を持つ記事が N 件、持たない記事が M 件。Phase 1 のルーター設計時に「`permalink` フィールドを使ってリンクを統一する」方針で確定する。
- OGP 画像の生成パイプライン（`scripts/`）の確認は Phase 2 で実施。
- `react-share` の利用箇所と styled-components 依存の有無は Phase 3 着手時に再確認。
```

- [ ] **Step 2: Phase 0 のステータスを「完了」に変更**

「9. 移行ステップ」の Phase 0 見出しに `(完了: 2026-05-01)` を追加し、Gate を満たしたことを明記。

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs: record phase 0 verification results in spec"
```

---

## Self-Review チェックリスト

実装完了後に以下を確認:

1. **Spec 全要件のカバレッジ**: spec の Phase 0 ゲート（既存 `getAllPosts()` と件数・主要フィールドが一致）を Task 6 で達成したか
2. **placeholder 残留なし**: タスク内に "TBD"、"TODO"、"後で書く" が残っていないか
3. **型整合**: Task 6・7 で使う `VelitePost` 型が `postSchema` の出力と一致しているか（`permalink`、`body` が含まれている）
4. **シェルとパス整合**: fish 環境で `pnpm` 経由のコマンドが通ること、`$()` などの bash 依存記法を使っていないこと
5. **branch 運用**: 全 commit 前に `git fetch -p origin && git checkout -b modernize-stack-phase0 origin/main` 相当でブランチを切ってから作業しているか（最初に行う）
