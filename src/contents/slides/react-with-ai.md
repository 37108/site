---
title: React アプリを AI で開発する小さなコツ
date: 2026-02-20
---

### React アプリを AI で開発する小さなコツ

2026/02/20

---

### AI にフロントエンドを書かせると…

フロントエンドは **暗黙の条件** が非常に多い

- デバイスサイズ（モバイル / タブレット / デスクトップ）
- インタラクション状態（hover, focus, active ...）
- レイアウト制御（absolute, fixed, sticky ...）
- 非同期状態（loading, error, empty, success）

---

### ベストプラクティスが定まりにくい

- バックエンドにはクリーンアーキテクチャ等の定番がある
- フロントエンドは「状況による」が多い
- AI はコンテキストなしだと **場当たり的に** コードを書く

---

### 一貫性のないコードベースが出来上がる

AI は指示がなければ毎回違う書き方をする

人間が **設計指針** を持って AI を導く必要がある

---

### 今日話すこと

1. コロケーションを意識する
2. ロジックを集約する
3. UI の実装方針を決める
4. MCP でコンテキストを渡す

---

### 1. コロケーションを意識する

`components/` と `hooks/` が肥大化する典型的な構成

```text
src/
  components/
    UserProfile.tsx, UserPosts.tsx, GreetingCard.tsx ...
  hooks/
    useUser.ts, usePosts.ts, useGreeting.ts ...
```

↓ 機能単位でまとめる

```text
features/
  greeting/
    index.tsx        // コンポーネント
    use-greeting.ts  // 専用の hook
    constants.ts     // 定数
  user-profile/
    index.tsx
    use-profile.ts
```

---

### 1.1 Bulletproof React を小さく採用する

- 機能単位で `features/` にまとめるアーキテクチャ
- バレルによる re-export はしない
- 全てを採用する必要はなく、コロケーションの思想だけ借りる

AI に「この `features/` 配下にファイルを作って」と指示できる

---

### 1.2 コンポーネントの粒度は大きく始める

- ファットなコンポーネントから始めて、分割が必要になったらする
- 最初から細かくしても大抵の場合再利用が望めない
- AI は「この部分を切り出して」というリファクタリング指示に従いやすい

---

### 2. ロジックを集約する

$$UI = f(State)$$

条件分岐やデータ取得を **一箇所に集める**

---

### 2.1 コンテナパターン

$UI = f(State)$ ── 親でデータを集め、子は描画に専念する

```tsx
// 親: ロジックを集約
function UserPage({ id }: { id: string }) {
  const user = useUser(id);
  const posts = usePosts(id);
  const canEdit = user.role === "admin";
  return <UserProfile user={user} posts={posts} canEdit={canEdit} />;
}

// 子: props を受け取って描画するだけ
function UserProfile({ user, posts, canEdit }: Props) {
  return (
    <div>
      <h1>{user.name}</h1>
      {canEdit && <EditButton />}
      <PostList posts={posts} />
    </div>
  );
}
```

---

### 2.1.1 form だけは例外

form はバリデーション等が UI に密結合しているので子に閉じ込める

```tsx
// 親: submit ハンドラーだけ渡す
function UserEditPage({ id }: { id: string }) {
  const updateUser = useUpdateUser(id);
  return <UserForm onSubmit={(data) => updateUser(data)} />;
}

// 子: スキーマもバリデーションも内部で完結
function UserForm({ onSubmit }: Props) {
  const form = useForm({ resolver: zodResolver(schema) });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
    </form>
  );
}
```

---

### 2.2 コンテナパターンの問題

親のデータ取得が **全て完了するまで** 子は何も描画できない

```tsx
function UserPage({ id }: { id: string }) {
  const user = useUser(id);   // 50ms で返る
  const posts = usePosts(id); // 2000ms かかる ← 全体がブロック
  return <UserProfile user={user} posts={posts} />;
}
```

---

### 2.3 Async React

$$UI = \textit{await}\; f(\textit{await}\; State)$$

コンポーネント自身がデータを取得し、Suspense で表示を制御する

```tsx
function UserPage({ id }: { id: string }) {
  return (
    <div>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile id={id} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts id={id} />
      </Suspense>
    </div>
  );
}
```

Suspense の境界ごとに **独立してローディングが制御** される

---

### 2.4 どちらを選んでも

プロジェクトルールに **明示** する

```markdown
## データ取得の方針
- データ取得は必ずページコンポーネントで行い、子には props で渡す
- 子コンポーネントでは useEffect によるデータ取得を行わない
- フォームのみ、内部で状態管理する（onSubmit を props で受け取る）
```

混在させると AI は余計に一貫性のないコードを書く

---

### 3. UI の実装

- 対応するデバイスサイズを **最初に決めて制限** する
- モバイルファーストで実装し、ブレイクポイントの微調整は人間がやる
- UI コンポーネント（Shadcn 等）の組み合わせで完結させる
- AI にはコンポーネントの「組み立て」だけを任せる

---

### 3.1 レイアウトの責任を親に持たせる

コンポーネント自身にマージンを持たせず、`className` で外から渡す

```tsx
// コンポーネント: 見た目だけ定義、margin は持たない
function UserCard({ user, className }: Props) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <h2>{user.name}</h2>
    </div>
  );
}

// 利用側: 文脈に応じたレイアウトを渡す
<UserCard user={user} className="sticky top-4" />
<UserCard user={user} className="rounded-none border-0" />
```

---

### 4. MCP でコンテキストを渡す

AI はコードは読めるが **画面は見えていない**

- **Chrome DevTools MCP** ── DOM やスタイルを参照しながら修正
- **Playwright MCP** ── ログイン後のスクリーンショット取得・E2E テスト
- **Figma MCP** ── デザイントークンの抽出・Tailwind 設定への反映
- **Serena** ── コード検索の質向上・トークン量削減

---

### 4.1 MCP / CLI で開発フローを自動化する

設計指針が明文化されていれば issue → PR まで AI に任せられる

- **GitHub MCP / CLI** ── issue → 実装 → PR → レビュー対応
- **GitLab CLI（glab）** ── issue → 実装 → MR 作成

指針がないと AI は毎回違う書き方をするのでレビューコストが増える

---

### まとめ

1. **コロケーション** でファイル構造を整理する
2. **$UI = f(State)$** でロジックの集約パターンを統一する
3. **UI の実装方針** を事前に決めて AI の裁量を制限する
4. **MCP** で AI にコンテキストを渡し、精度を上げる

AI が書こうが人間が書こうが、大事なのは **一貫性を保ち続けること**
