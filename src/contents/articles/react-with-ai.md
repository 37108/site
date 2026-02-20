---
title: React アプリを AI で開発するための設計指針
description: AI にフロントエンドのコードを書かせると一貫性のないコードベースが出来上がりがちです。コロケーション、ロジックの集約、UI の実装方針、MCP の活用という 4 つの設計指針で AI を導く方法をまとめました。
date: 2026-02-20
image: /assets/og/default.webp
tags: ["frontend", "react"]
---

AI にフロントエンドのコードを書かせる機会が増えてきました。バックエンドのコードであればそこそこ良い結果が得られる一方で、フロントエンドを任せるとどうにも一貫性のないコードベースが出来上がりやすいと感じています。その理由と、個人的に実践している設計指針について登壇でお話しした内容を記事としてまとめます。

## なぜフロントエンドは AI と相性が悪いのか

フロントエンドには暗黙の条件が非常に多く存在します。デバイスサイズ（モバイル・タブレット・デスクトップ）、インタラクション状態（hover, focus, active）、レイアウト制御（absolute, fixed, sticky）、非同期状態（loading, error, empty, success）など、1 つのコンポーネントが考慮するべき条件の組み合わせが膨大です。

バックエンドであればクリーンアーキテクチャのように「こう書けば大きく外さない」という定番のアーキテクチャが存在します。しかしフロントエンドでは「状況による」が多く、確立されたベストプラクティスが定まりにくい領域です。React のプロジェクトひとつとっても、ディレクトリ構成、状態管理の手法、データフェッチの方針など、チームや規模によって正解が異なります。

AI はコンテキストが与えられなければ場当たり的にコードを書きます。あるファイルではコンテナパターンで書き、別のファイルでは Suspense を使い、また別のファイルでは useEffect でデータを取得する、といった具合です。結果として、人間が設計指針を持って AI を導く必要があります。

本記事では以下の 4 つの指針について掘り下げていきます。

1. コロケーションを意識する
2. ロジックを集約する
3. UI の実装方針を決める
4. MCP でコンテキストを渡す

## 1. コロケーションを意識する

コロケーションとは、関連するファイルを物理的に近くに配置することです。フロントエンドの機能はビジネスロジックが絡まない限り大抵は特定のコンポーネント専用になるため、共通の `hooks/` や `components/` にばらまくより、機能単位でまとめた方が見通しが良くなります。

まず典型的な構成を見てみます。

```
src/
  components/
    UserProfile.tsx
    UserPosts.tsx
    GreetingCard.tsx
    ...
  hooks/
    useUser.ts
    usePosts.ts
    useGreeting.ts
    ...
```

この構成だと `components/` と `hooks/` が肥大化していきます。`UserProfile.tsx` が `useUser.ts` を使っていることはファイル名から推測できますが、20 個 30 個とファイルが増えたときに何がどこで使われているかを追うのが辛くなります。AI にとってもこの構成は厄介です。「ユーザープロフィール機能を修正して」と指示したときに `components/`、`hooks/`、場合によっては `utils/` や `types/` まで横断的に変更が入り、diff が散らばって人間のレビューが大変になります。

機能単位でまとめると以下のようになります。

```
features/
  greeting/
    index.tsx           // コンポーネント
    use-greeting.ts     // 専用の hook
    constants.ts        // 定数
  user-profile/
    index.tsx
    use-profile.ts
```

greeting 機能に変更が入ったときに触るファイルは `features/greeting/` の中だけで済みます。コードレビューでも変更範囲が明確ですし、AI に対しても「`features/greeting/` 配下にファイルを作って」と具体的に指示ができます。

### Bulletproof React を小さく採用する

[Bulletproof React](https://github.com/alan2207/bulletproof-react) は機能単位で `features/` にコードをまとめるアーキテクチャです。以前に [Reactを利用したアプリのディレクトリを設計する](/articles/react-architecture) でも触れましたが、このアーキテクチャの全てを採用する必要はありません。コロケーションの思想だけを借りるのが現実的です。

具体的には以下の点だけ意識します。

- 機能単位で `features/` にコードをまとめる
- バレルによる re-export はしない（依存関係が不明瞭になるため）
- 共通で利用する部品だけを `components/` や `hooks/` に昇格させる

バレルについて補足します。`features/greeting/index.ts` から内部モジュールを re-export する運用は、どのモジュールが外部に公開されているのかが曖昧になりがちです。Bulletproof React では ESLint ルールでバレル経由のインポートを強制する手法が紹介されていますが、[以前の記事](/articles/react-architecture)で書いたように相対パスでのインポートを完全に防ぐのは難しく、ルールの維持コストに見合わないケースもあります。AI はバレルの存在を考慮せずにインポートパスを書くことが多いため、re-export しない方がトラブルが少ないです。

### コンポーネントの粒度は大きく始める

AI にコンポーネントを生成させるとき、最初から細かく分割するよう指示するのはおすすめしません。[Better to write bad code](/articles/better-to-write-bad-code) でも書きましたが、大きなコンポーネントから始めて分割が必要になったら分割する方が現実的です。

理由は単純で、最初から細かく分割しても大抵の場合再利用が望めないからです。AI が生成した 5 つの小さなコンポーネントのうち、実際に他でも使われるのは 1 つあるかないかでしょう。残りの 4 つは不必要な抽象化としてコードベースに残り、変更のたびに複数ファイルを行き来する羽目になります。

そもそも要件を見ながらどこを分割するかを検討しながら書くより、PoC のように要件を満たすコードをまず書くのが1番簡単です。まずはファットなコンポーネントを AI に書かせて、動作を確認する。そこから人間の目で「この部分は他でも使いそうだ」「このロジックは複雑だから hook に切り出そう」と判断して分割箇所を決めればよいです。大きなコンポーネントを分割するリファクタリングは、小さなコンポーネントを統合するよりも遥かに容易です。そして AI は「この部分を別コンポーネントに切り出して」という具体的なリファクタリング指示にはよく従います。最初から完璧な粒度を目指すより、動くコードを起点に育てていく方が結果として良いコードになります。

## 2. ロジックを集約する

React のコンポーネントは突き詰めると `UI = f(State)` という関数です。状態を入力として受け取り、UI を出力する。この考え方を徹底するとコードの見通しが良くなります。

[React で状態をあつかう](/articles/handle-state-in-react) で書いたように、宣言型 UI ではイベントハンドラが状態を更新し、コンポーネントが状態に応じて「どの状態だから表示がこうあるべき」という決定に従い描画します。この原則をどの粒度で適用するかによって、大きく 2 つのアプローチに分かれます。

### コンテナパターン: UI = f(State)

親コンポーネント（多くの場合ページコンポーネント）でデータの取得や判定条件を全て集め、子コンポーネントには描画に必要な情報だけを props として渡すパターンです。

```tsx
// 親: ロジックを集約する
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

この例では `UserPage` がデータの取得（`useUser`, `usePosts`）と判定ロジック（`canEdit`）を全て引き受けています。`UserProfile` は受け取った props に応じてレンダリングするだけの純粋な描画コンポーネントです。

このパターンの利点はロジックの所在が明確なことです。「編集権限の判定ロジックはどこにあるか」と聞かれたら `UserPage` を見れば良い。新しい条件（例えばアカウントが停止中なら編集不可にする）を追加する場合も `UserPage` だけを修正すれば済みます。子コンポーネントは `canEdit` が `true` か `false` かだけを知っていれば良いので、変更の影響範囲が親に閉じます。

もうひとつの利点は、状態の変更理由が追跡しやすいことです。データ取得もイベントハンドラも親に集約されているので、「何が原因で再レンダーが起きたのか」を追うときに確認する範囲が限定されます。以前の記事で「再レンダーを引き起こせる対象と再レンダーによって影響を受ける対象を最小にすること」が大事だと書きましたが、コンテナパターンはまさにそれを実現する構造です。

AI に対しても指示がシンプルになります。「`UserPage` にデータ取得のロジックを集めて、`UserProfile` には props だけ渡して」。これだけで一貫したコードが生成されます。

### form だけは例外

ただし form はこのパターンに当てはまりにくい例外です。なぜかというと、フォームはバリデーション、エラー状態、フィールドの登録、dirty 判定など、UI に密結合した状態が非常に多いからです。

例えば react-hook-form を使う場合を考えます。`useForm` が返す `register` 関数は各入力フィールドに ref を紐づけるために使われます。`formState.errors` はどのフィールドにエラーがあるかをリアルタイムに追跡します。これらは全てフォームの描画と密接に関わっていて、親に切り出すと `register` の戻り値を子に渡して、エラーオブジェクトも渡して、ハンドラも渡して...と props が爆発的に増えます。フォームライブラリが想定している使い方とも乖離するので、型の整合性を取るだけでも一苦労です。

なのでフォームについては、スキーマ定義やバリデーションロジックを子コンポーネント側で閉じ込め、親からは submit ハンドラーだけを受け取る形にするのが良いです。

```tsx
// 親: submit ハンドラーだけ渡す
function UserEditPage({ id }: { id: string }) {
  const updateUser = useUpdateUser(id);
  return <UserForm onSubmit={(data) => updateUser(data)} />;
}

// 子: スキーマもバリデーションも内部で完結
function UserForm({ onSubmit }: { onSubmit: (data: UserInput) => void }) {
  const form = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      <input {...form.register("email")} />
      {form.formState.errors.email && (
        <span>{form.formState.errors.email.message}</span>
      )}
      <button type="submit" disabled={form.formState.isSubmitting}>
        保存
      </button>
    </form>
  );
}
```

親の `UserEditPage` は「データをどこに送るか」だけを知っていて、フォームの内部状態には一切関与しません。子の `UserForm` はスキーマ定義、バリデーション、エラー表示、送信中の制御を全て内部で完結させています。この分離であれば、AI にフォームを生成させるときも「`UserForm` コンポーネントを作って、バリデーションは zod で定義、`onSubmit` だけ props で受け取って」と指示すれば、ロジックの境界が明確なコードが出てきます。

### Async React: UI = await f(await State)

コンテナパターンの問題点から話を始めます。コンテナパターンでは親がデータを全て集約するので、親のデータ取得が全て完了するまで子は何も描画できません。ユーザー情報と投稿一覧を両方取得するページであれば、片方のレスポンスが遅いだけでページ全体がローディング状態になります。

```tsx
// コンテナパターン: 全てのデータが揃うまでページ全体がローディング
function UserPage({ id }: { id: string }) {
  const user = useUser(id);     // 50ms で返る
  const posts = usePosts(id);   // 2000ms かかる ← これを待つ間、何も見えない
  return <UserProfile user={user} posts={posts} />;
}
```

これは小規模なアプリでは問題になりにくいのですが、データソースが増えたり、レスポンスに時間がかかる API が混ざってくると、ユーザー体験が目に見えて悪くなります。

Async React はこの問題に対するアプローチです。React 19 以降で本格的に使えるようになった Server Components と Suspense を組み合わせて、コンポーネント自身が自分に必要なデータを非同期に取得します。

```tsx
// 各コンポーネントが自分のデータを取得する
async function UserPosts({ id }: { id: string }) {
  const posts = await fetchPosts(id);
  return <PostList posts={posts} />;
}
```

通常の React コンポーネントは同期的な関数ですが、Server Components では `async function` として定義できます。コンポーネントの中で直接 `await` してデータを取得し、その結果をそのまま JSX で返す。`useEffect` でデータを取得してステートに詰めて...という従来の儀式的なコードが不要になります。

ここで Suspense が重要な役割を果たします。親コンポーネントは Suspense で子を包むことで「この子がデータ取得中のあいだ何を見せるか」という表示の境界を定義します。

```tsx
function UserPage({ id }: { id: string }) {
  return (
    <div>
      {/* ユーザー情報は先に表示される */}
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile id={id} />
      </Suspense>

      {/* 投稿一覧は時間がかかっても、他の部分の表示をブロックしない */}
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts id={id} />
      </Suspense>
    </div>
  );
}
```

コンテナパターンではページ全体が 1 つのローディング状態でしたが、Async React では Suspense の境界ごとに独立してローディングが制御されます。ユーザー情報の API が先に返ればプロフィール部分が先に表示され、投稿一覧はまだスケルトンのまま、という段階的な表示ができます。つまり、親がデータを集約する代わりに、親は「どの単位で表示の準備完了を待つか」を Suspense で宣言するのが役割になります。

ただし、このパターンにはトレードオフがあります。コンテナパターンではロジックが親に集まるため「どこを見ればいいか」が明確でした。Async React ではデータ取得がそれを必要とするコンポーネントに分散します。「このページで何の API を叩いているか」を把握するには、各コンポーネントの中身を見なければなりません。コードベースが大きくなるにつれて、この分散がどれだけ影響するかはプロジェクト次第です。

また [React で状態をあつかう](/articles/handle-state-in-react) で触れたように、状態の変更理由を把握しやすい環境づくりは重要です。Async React ではデータ取得の状態管理を Suspense が暗黙的に行うため、「なぜこのコンポーネントが再レンダーしたのか」の追跡がコンテナパターンよりやや難しくなります。エラーハンドリングについても、[React アプリでエラーハンドリングと付き合う](/articles/handle-error-on-react) で書いた Error Boundary を Suspense と組み合わせて各境界ごとに配置する設計が必要になります。

```tsx
function UserPage({ id }: { id: string }) {
  return (
    <div>
      <ErrorBoundary fallback={<ProfileError />}>
        <Suspense fallback={<ProfileSkeleton />}>
          <UserProfile id={id} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<PostsError />}>
        <Suspense fallback={<PostsSkeleton />}>
          <UserPosts id={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

Suspense の各境界に ErrorBoundary を配置することで、投稿一覧の取得が失敗してもプロフィール部分は表示され続けます。このきめ細かな制御は Async React の強みですが、配置する境界の設計は人間が行う必要があります。

まとめると、コンテナパターンはロジックの所在が明確で AI への指示もシンプルになる反面、表示のきめ細かな制御が難しい。Async React は表示の最適化に優れる反面、ロジックが分散して全体の把握がやや困難になる。どちらが良いかではなく、プロジェクトの規模や要件に応じてどちらかを選び、それを一貫して適用することが重要です。

### どちらを選ぶにしても一貫性が重要

コンテナパターンと Async React のどちらを選ぶかはプロジェクトの要件次第ですが、重要なのはプロジェクト内でどちらか一方に統一することです。

AI への指示でもパターンを明示しましょう。例えば CLAUDE.md や .cursorrules のようなプロジェクトルールに書いておくのが効果的です。

```markdown
## データ取得の方針
- データ取得は必ずページコンポーネントで行い、子には props で渡す
- 子コンポーネントでは useEffect によるデータ取得を行わない
- フォームコンポーネントのみ、内部で状態を管理する（onSubmit を props で受け取る）
```

このような明文化されたルールがあれば、AI は一貫したコードを生成しやすくなります。パターンが混在すると AI はコンテキストに応じてどちらの書き方もするため、コードベースの一貫性がさらに崩れます。

## 3. UI の実装方針を決める

ロジックの設計と同じくらい重要なのが、UI をどう実装するかの方針です。AI に UI の実装を任せるとき、何も制約を与えなければ AI は自由にスタイルを書きます。あるコンポーネントでは Tailwind のユーティリティクラスを使い、別のコンポーネントではインラインスタイルを使い、また別のコンポーネントでは CSS Modules を使う、といった状態が実際に起こります。

スタイリングはロジック以上に「正解がない」領域です。同じ見た目を実現する方法が何通りもあるので、AI は毎回違うアプローチを取りえます。だからこそ事前に方針を決めて AI の裁量を制限する必要があります。

### 対応するデバイスサイズを制限する

全てのデバイスサイズに完璧に対応しようとすると、ブレイクポイントの制御だけで膨大な作業量になります。最初に対応するデバイスサイズを明確に決めて、それ以外は切り捨てる判断をしましょう。

例えば「モバイル（375px）とデスクトップ（1280px）の 2 つだけ対応する」と決めるだけで、考慮するべきレイアウトパターンが大幅に減ります。AI への指示も「モバイルとデスクトップの 2 サイズだけ対応して」と明確に伝えられますし、中間のタブレットサイズで微妙に崩れるレイアウトに頭を悩ませる時間も減ります。

ここで大事なのは、対応しないサイズを意識的に「捨てる」という決断です。AI は指示がなければ全てのサイズに対応しようとして、結果として中途半端なレスポンシブ対応になりがちです。「768px 以下はモバイル表示、それ以上はデスクトップ表示、間は考えなくていい」と明示するだけでアウトプットが安定します。

### モバイルファーストで実装する

Tailwind を使うのであれば、モバイルファーストで実装してデスクトップ向けのスタイルをブレイクポイントで上書きする方針に統一します。AI に何も指示しないとデスクトップファーストで書いたりモバイルファーストで書いたりが混在しがちです。

```tsx
// モバイルファースト: デフォルトがモバイル、md: 以降でデスクトップ
function Card({ title, description }: Props) {
  return (
    <div className="flex flex-col gap-2 p-4 md:flex-row md:gap-6 md:p-8">
      <h2 className="text-lg md:text-2xl">{title}</h2>
      <p className="text-sm text-gray-600 md:text-base">{description}</p>
    </div>
  );
}
```

クラス名を見るだけで「モバイルでは縦並び（`flex-col`）・デスクトップでは横並び（`md:flex-row`）」という意図が読み取れます。プレフィックスなしのクラスがモバイルのスタイルで、`md:` 付きがデスクトップの上書き。この規約を統一するだけで、誰が書いたコンポーネントでも同じ読み方ができます。

ただし、ブレイクポイント前後の微妙なレイアウト崩れは AI が検知しにくい部分です。テキストが 1 行に収まらなくなって折り返す、要素同士が重なる、スクロールが発生するといった問題は、実際のブラウザで目視しないとわかりません。モバイルファーストで大枠を AI に書かせて、ブレイクポイント付近の微調整は人間がやる、という役割分担が現実的です。

### UI コンポーネントの組み合わせで完結させる

AI の生成するスタイルの質を最も安定させるのが、[Shadcn/ui](https://ui.shadcn.com/) のようなコンポーネントライブラリを導入し、その組み合わせだけで UI を構築する方針です。

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <Avatar>
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{user.bio}</p>
        <Button variant="outline" size="sm">
          プロフィールを見る
        </Button>
      </CardContent>
    </Card>
  );
}
```

このコードには独自の CSS が一行もありません。`Card`、`Avatar`、`Button` というライブラリ提供のコンポーネントを組み合わせているだけです。AI には「Shadcn の Card と Button と Avatar を使ってユーザーカードを組み立てて」と指示するだけで、このようなコードが生成されます。`variant` や `size` といった props で見た目を制御するため、デザインの一貫性もライブラリ側が担保してくれます。

ここで重要なのは、AI に独自の CSS を書かせる領域を最小化するという考え方です。自前で UI コンポーネントを用意している場合も同じです。ベースとなるコンポーネント（ボタン、カード、モーダルなど）を人間が作り込んでおき、AI にはその組み合わせだけを任せる。コンポーネントの「中身」は人間が品質を担保し、コンポーネントの「組み立て」は AI に任せる。この分担が UI の品質を安定させるコツです。

### レイアウトの責任を親に持たせる

UI コンポーネントの組み合わせで完結させると言いましたが、現実にはコンポーネント同士の間隔や配置の調整が必要になります。ここでありがちな問題が、コンポーネント自身に `margin` や `absolute` といったレイアウトに関わるスタイルをハードコードしてしまうことです。

```tsx
// 問題: コンポーネント自身が margin を持っている
function UserCard({ user }: { user: User }) {
  return (
    <div className="mt-4 mb-8">
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </div>
  );
}
```

この `UserCard` は上に `16px`、下に `32px` のマージンを常に持ちます。一見問題なさそうですが、このコンポーネントをカードの一覧で並べたい場合、モーダルの中に表示したい場合、サイドバーに小さく配置したい場合で、それぞれ適切な余白は異なります。コンポーネント自身がマージンを持っていると、利用箇所ごとに上書きが必要になり、AI は `!important` や負のマージンといった荒技に頼り始めます。

解決策はシンプルで、コンポーネントに `className` を props として受け取らせ、レイアウトの責任を親に委ねることです。

```tsx
import { cn } from "@/lib/utils";

function UserCard({ user, className }: { user: User; className?: string }) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <h2 className="text-lg font-bold">{user.name}</h2>
      <p className="text-sm text-gray-600">{user.bio}</p>
    </div>
  );
}
```

コンポーネント自身は見た目（`rounded-lg border p-4`）だけを定義し、マージンや配置は持ちません。`cn` は [clsx](https://github.com/lukeed/clsx) と [tailwind-merge](https://github.com/dcastil/tailwind-merge) を組み合わせたユーティリティで、Shadcn/ui でもお馴染みのパターンです。クラス名の結合と Tailwind クラスの衝突解決を行います。

親が利用するときに、その文脈に応じたレイアウトを `className` で渡します。

このパターンが AI との開発で効くのは、責任の境界が明確だからです。AI に「`UserCard` コンポーネントを作って」と指示するときに「マージンは含めないで、`className` prop を受け取れるようにして」と一言添えるだけで、どこで使っても柔軟に配置できるコンポーネントが出来上がります。配置の調整が必要になったときも、コンポーネントの中身を触る必要はなく、利用側の `className` を変えるだけで済むので影響範囲が限定されます。

## 4. MCP でコンテキストを渡す

ここまでコードの書き方や設計の話をしてきましたが、AI にフロントエンドを書かせるうえでもう一つ見落とされがちな観点があります。「AI に何が見えているか」です。

AI はコードは読めます。しかし、そのコードが実際にブラウザでどう表示されているか、デザインカンプがどうなっているかは知りません。人間の開発者であれば、ブラウザの DevTools を開いて「このボタンの `padding` が `8px` になっているから `12px` に変えよう」と判断できます。しかし AI にとってはコードを読むことと画面を見ることは別の話です。「余白がおかしい」とテキストで伝えても、何の余白がどう問題なのかを正確に把握するのは難しい。

MCP（Model Context Protocol）を使って AI にブラウザやデザインの情報を直接渡すことで、この問題を緩和できます。

### ブラウザの状態を渡す

[Chrome DevTools MCP](https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-chrome-devtools) を使うと、AI が実際のページの DOM やスタイルを参照しながらコードを修正できます。例えば「このボタンの余白がおかしい」という指示に対して、AI が DevTools で現在の computed style を確認し、`padding` が `8px` であることを検知して `12px` に修正する、という流れが可能になります。人間が DevTools で確認してから修正するのと同じプロセスを AI が自律的に行えるようになるわけです。

私がよく使うのは、AI にコードを修正させた後に Chrome DevTools MCP でページの状態を確認させるというフローです。「この修正でレイアウトが崩れていないか確認して」と指示すると、AI が DOM 構造やスタイルを見て問題を検知し、必要であれば追加の修正を行います。コードを書くだけでなく、その結果を自分で検証できるのが大きな利点です。

ただしログインが必要なページでは、Chrome DevTools MCP でセッションを維持できない場合があります。認証が絡む画面では [Playwright MCP](https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-playwright) の方が確実です。Playwright はブラウザ操作を自動化するツールなので、ログイン操作を行ってからスクリーンショットを取得する、という手順を AI に任せられます。E2E テストの実行もできるので、「コードを修正して、テストを走らせて、スクリーンショットで結果を確認して」というフィードバックループを AI に回させることが可能です。

### デザインの情報を渡す

[Figma MCP](https://github.com/nichochar/figma-mcp) を使えば Figma 上のデザイントークン（カラーパレット、タイポグラフィ、スペーシング）を AI に渡せます。

実務で特に便利なのは、Figma のデザイントークンを Tailwind の設定ファイルに落とし込む作業です。デザイナーが Figma で定義した色（`primary-500: #3B82F6`）やフォントサイズ（`heading-lg: 24px`）を `tailwind.config.ts` の `theme.extend` に反映するのは、1 つ 1 つは単純な作業ですが量が多いと時間がかかりますし、手作業だとタイポも起きます。Figma MCP でトークンを取得して AI に設定ファイルを生成させれば、正確かつ網羅的に反映できます。

また、特定のコンポーネントのデザインを Figma から参照しながらコードを生成させることもできます。「この Figma のフレームを見て、同じ見た目のコンポーネントを Shadcn を使って作って」という指示が成り立つようになります。セクション 3 で述べた UI コンポーネントの組み合わせ方針と組み合わせると、デザインからコードへの変換がかなりスムーズになります。

### コード検索の質を上げる

[Serena](https://github.com/nicobailon/serena) はコード検索の質の向上やトークン量の削減を目的とした MCP サーバーです。

大きなコードベースで AI にコードを書かせると、AI はまずコードベースを理解するために多くのファイルを読み込みます。このときに不要なファイルまでコンテキストに含めてしまうと、2 つの問題が起きます。1 つはトークンの消費が激しくなりコストが上がること。もう 1 つは、関係ないコードに引きずられて AI が不適切な実装をすることです。例えば、古いパターンで書かれたファイルをコンテキストに含めてしまうと、AI がそのパターンに倣って書いてしまう。

Serena のようなツールを使ってコード検索を効率化し、必要な情報だけを AI に渡せるようにすると、生成されるコードの質も上がりますしコストも抑えられます。

### 開発フローを自動化する

MCP や CLI ツールを活用すると、issue の確認から実装、PR の作成までを AI に任せるフローも現実的になってきます。

- **GitHub MCP / CLI** ── issue を読み取って内容を理解し、実装して PR を作成し、レビューコメントへの対応まで行う
- **GitLab CLI（glab）** ── 同様に issue から実装、MR の作成までを自動化する

ここで重要なのは、このフローがうまく機能するのは本記事で述べた設計指針が前提にあるからだということです。コロケーションでファイルの配置先が決まっていて、ロジックの集約パターンが統一されていて、UI の実装方針が明確で、プロジェクトルールとしてドキュメント化されている。その土台があって初めて、AI が issue を受け取ってからルールに沿ったコードを生成し、PR まで作るという一連の流れが成り立ちます。設計指針のないプロジェクトで同じフローを回すと、AI は毎回違う書き方でコードを生成するので、レビューコストがかえって増えてしまいます。

## さいごに

AI にフロントエンドのコードを書かせるうえで大事なのは、AI に自由に書かせないことだと思っています。コロケーションでファイルの置き場所を決め、ロジックの集約パターンを統一し、UI の実装方針を事前に定め、MCP で必要なコンテキストを渡す。人間が設計の枠を作り、その中で AI に作業させることで、一貫性のあるコードベースが維持できます。

AI は指示がなければ毎回違う書き方をします。逆に言えば、明確なルールさえ与えれば驚くほど一貫したコードを書いてくれます。プロジェクトの設計指針をドキュメントに残し、AI にも人間にも同じルールで開発してもらう。

結局のところ大事なのは、設計において一貫性を保ち続けることです。以前の記事でも何度か書いてきましたが、AI 時代になってもこの本質は変わりません。むしろ AI が加わることで一貫性の重要度は増しています。人間だけのチームであれば、暗黙の了解やコードレビューで統一感を保てることもありました。しかし AI はそういった空気を読みません。だからこそ明文化されたルールが必要で、そのルールを作るのは人間の仕事です。

## 参考文献

- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Chrome DevTools MCP](https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-chrome-devtools)
- [Playwright MCP](https://github.com/anthropics/anthropic-quickstarts/tree/main/mcp-playwright)
- [Figma MCP](https://github.com/nichochar/figma-mcp)
- [Serena](https://github.com/nicobailon/serena)
