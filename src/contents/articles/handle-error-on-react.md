---
title: React アプリでエラーハンドリングと付き合う
description: React でどのようにエラーを扱うべきかについて考えていました
date: 2023-11-30
image: /assets/articles/handle-error-on-react/cover.webp
tags: ["frontend", "note"]
---

React を利用したアプリケーションを作成する際に例外を投げる形で扱うことが多かったのですが、例外の型が unknown であることもあり、扱いづらいなぁと日々思っていたので一度考えてみようと思い筆を取りました。

## 例外とは

エラーといった時にそれが例外に渡された引数を意味するのか、エラークラスやインスタンスを意味するのかが曖昧になると困るのでまず例外とは何かから振り返ってみます。

JavaScript では例外が発生すると Error を投げます。基本的には Error オブジェクトではありますが、文字列なども同様に投げることができます。なので、TypeScript でも例外の型を unknown にせざるを得ないわけです。

```typescript
function f() {
  const err = new Error("something went wrong !");
  throw err;
}

f();
// Uncaught Error: something went wrong !
```

プログラムで `throw` するとコールスタックの最初の catch ブロックに制御が移ります。catch ブロックがない場合はプログラム自体が終了します。Next.js とかであれば開発環境ではエラーを表示して、本番環境では500ページを表示するみたいな感じの処理になっています。catch ブロックは `try...catch` か `Promise.prototype.catch()` で定義することができます。

```typescript
// try...catch
try {
  throw new Error("something went wrong");
} catch (err) {
  // do something
}

// Promise.prototype.catch()
await f().catch((err) => {
  // do something
});
```

## Error とは

`Error` はオブジェクトになります。`Error()` コンストラクタを呼び出してオブジェクトを生成することもでき、 `Error` クラスを拡張して独自の定義を作成することもできます。
少し面白いのが `Error()` コンストラクタが関数のように呼び出された場合でも同様のオブジェクトが生成されます。そこまで使う知識ではないかもしれませんが、知っておいて損はないですね...。

```typescript
const err = new Error("my error");

// 同一結果
const err = Error("my error");
```

### Error options.cause

catch 節でエラーを扱い再処理をしたもののそれもうまく行かなかった場合、再度例外を投げることが多々あります。この時に「try節で失敗した処理のエラー」と「catch節で失敗したエラー」の情報をチェインしていく方法が今ではなんとあります。`Error()` コンストラクタを呼び出す際に cause に該当エラーを渡してあげることで例外を辿った表示ができます。

```typescript
function f() {
  try {
    connect();
  } catch (err) {
    // try to reconnect, but it does not work well...
    throw new Error("Connecting failed", { cause: err });
  }
}

function main() {
  try {
    f();
  } catch (err) {
    console.log(err);
  }
}

main();
// Error: Connecting failed
//     f debugger eval code:6
//     main debugger eval code:12
//     <anonymous> debugger eval code:1
// Caused by: ReferenceError: connect is not defined
//     f debugger eval code:3
//     main debugger eval code:12
//     <anonymous> debugger eval code:1
```

cause 自体は多くのブラウザでサポートされていますが、チェインしたエラーを `console` で表示できるのは今のところ Firefoxだけなのでそこだけは注意してください。Node.js や Deno などではすでに対応がなされており表示されるはずです。

## コンポーネントで例外を扱う

もしコンポーネント側で例外が投げられるのであれば、ErrorBoundaryを利用することで、ハンドリングすることができます。
ErrorBoundaryコンポーネントを自作することもできますが、関数コンポーネントで書く手立てがないので、[react-error-boundaryライブラリ](https://github.com/bvaughn/react-error-boundary)を利用するのをお勧めします。
また、Error Boundary では非同期処理をハンドルすることができませんが、Suspense と組み合わせることでその問題を解消しつつ、非同期処理で必要となるローディング状態の管理も合わせて行えるので非常に便利ですね。

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from "react-error-boundary";
import { Loading, FailedToLoad } from './'

function AlbumDetail() {
  const data = useFetchAlbum();
  return (
    <div>{data}</div>
  )
}

function Page() {
  return (
    <ErrorBoundary fallback={<FailedToLoad />}>
      <Suspense fallback={<FailedToLoad />}>
        <AlbumDetail>
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Next.js で例外を扱う

Next.js の App Router ではPageレベルでErrorBoundary を敷くことができるためそのレベル感では簡単にエラーハンドリングができます。
具体的には 該当ルートに `error.tsx` を定義します。[公式のサンプル](https://nextjs.org/docs/app/building-your-application/routing/error-handling) からの引用にはなりますが、下記のようにすることで、「エラー状態の表示」と「エラーになったコンポーネントの再レンダリング」ができるようになります。

```tsx
"use client"; // Error components must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }>
        Try again
      </button>
    </div>
  );
}
```

このようにReactの機能としては例外を投げていくことで処理するのができるので、コンポーネントで起きるエラーについてはErrorBoundaryを用いて扱うのが良いと考えています。

## 関数でエラーを扱う

何かしらエラーが発生するような処理、多くの場合にはAPIとの通信になりますが、それを関数で定義する時にどのようにエラーを扱うかについてです。コンポーネントのように、Reactの機能として例外を投げると扱いやすいなどはないので最終的にはプロジェクトごとの判断でよしなにするべきではあります。

### 投げられたエラーを安全に取り扱う

例外で触れたように catch 節に渡される引数の型は分かりません。なので、それがどの型であるかを判断してから処理が必要になります。instanceof で型を判断する方法が一番汎的ですね。

```typescript
if (err instanceof Error) {
  // do something
}
```

Error インスタンスの時に `error.message` だけが必要であれば [Get a catch block error message with TypeScript](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript) に記載があるような方法で取得することもできます。
また、axiosのようなライブラリであれば、型ガードが定義されているので、それによって型を判断することも可能です。

```typescript
import { isAxiosError } from "axios";

try {
  // do something
} catch (err) {
  if (isAxiosError(err)) {
    // do something
  }
}
```

ただしこの方法だと関数がどのような例外を投げるかまでは関数で定義することが当然できないので、[jsdocs](https://jsdoc.app/tags-throws)、[tsdocs](https://tsdoc.org/pages/tags/throws/) でわかる範囲で起こり得る例外をドキュメントに記載することで少しだけでも扱いやすくするべきでしょう。
またError オブジェクトが投げられるとして、 `error.message` だけでは情報が足りず、`error.options.cause` に根本のエラー原因がありそれをみる必要があるなどが起きるとよりややこしくなることもあります。

### エラーを return する

例外を投げるのではなく、関数でエラーを返す設計にすることで関数がどのようなエラーを返すか、型情報から理解できる上に、catch節に映らないので処理分岐が比較的分かりやすくなります。

```typescript
function f(): { message: string | undefined; error: Error | undefined } {
  return Math.random() > 0.5
    ? { message: "ok", error: undefined }
    : { message: undefined, error: new Error("something went wrong") };
}

function main() {
  const { message, error } = f();
  if (error) {
    console.log(error.message);
  } else {
    console.log(message);
  }
}
```

タグ付きユニオンを利用した処理でも記載ができます。エラーが起きたら次に進めないぞ感が強いのでその辺はお好みで利用しましょう。

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: Error };

function f(): Result<{ message: string }> {
  if (Math.random() > 0.5) {
    return { success: true, data: { message: "ok" } };
  }
  return { success: false, error: new Error("something went wrong") };
}

function main() {
  const res = f();
  if (!res.success) {
    console.log(res.error.message);
    return;
  }
  console.log(res.data.message);
}
```

エラーを返すようにすると関数の呼び出しに対してどのようなエラーが返ってくるかがわかり、それを処理することを呼び出し元にお願いしやすいので分かりやすくなります。ただし、一連の処理の失敗に対してロールバックをかけたいケースや、どこの失敗であっても同様の処理がしたいなどあれば、例外を投げて catch節で処理するのが吉になる場合もあります。

## 最後に

私はReact コンポーネントに関しては例外を投げてError Boundaryで処理をして、関数については極力例外を投げないようにするという方針でやっていければなぁと思いました。

## 参考資料

- [Error: cause](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
- [エラーをチェインするライブラリと ES2022 Error Cause](https://zenn.dev/pixiv/articles/bb123b2f50cdab#es2022-error-cause)
- [Catching rendering errors with an error boundary ](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [\<Suspense\>](https://react.dev/reference/react/Suspense)
- [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
