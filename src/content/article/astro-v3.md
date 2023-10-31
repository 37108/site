---
title: Astro v3 にアップデートしました
description: ブログの核であるAstroを更新したので、View Transition 周りの調整について書きます。
date: 2023-10-31
image: /assets/articles/astro-v3/cover.webp
tags: ["frontend", "astro"]
---

Astro の v3 が出たのはだいぶ前ではあるのですが、View Transition の調整が必要だったためv2のままにしてました。
ドキュメントを読んで必要な設定が無事に終わり、アップデートできたので備忘録として残しておきます。

View Transition API のとてもざっくりとした概要としては、まず `document.startViewTransition` を呼び出すことで現在のスナップショットを作成します。
`startViewTransition` 関数がコールバック関数を引数として受け取るので、それを実行します。
その上でDOM変化後の状態をスナップショットとして作成して、新旧のスナップショットをクロスフェードで変化させるのがとても大まかな仕組みになります。

また、スナップショットなどはCSSの擬似要素として表現されるため、それらにスタイリングを施すことでアニメーションすることも容易に行えます。1個の関数と遷移関連の擬似要素だけで画面遷移を表現できるのは圧巻ですね。

## 変更した箇所について

Tailwind でのダークモード対応のため、`html` 要素に `dark` というクラスをlocalStorageの値を参考に付与しています。
この一連の流れをbody要素以下にあるスクリプトを実行する形で対応しているのですが、v3に上げてからスクリプトが一度しか発火されず、ページ遷移後にはlocalStorageの値に関わらず常にライトモード (dark クラスが付与されない)状態になってしまいました...。

結論を書くと `astro:after-swap` というページの置き換わるタイミングで発生するイベントがあるのでそこに処理を加えれば想定通りの動作になりました。
ドキュメントにちゃんと書いてあるので全部読むべきでした...。コードの中身的にはこんな感じです。

```html
<script is:inline>
  function setup() {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }
  // 初回ロード時にはイベントが発生しないので実行する
  setup();
  document.addEventListener("astro:after-swap", setup);
</script>
```

## 補足

スクリプトがタグに書いても初回以降発火しないことについて、ここからは補足になります。

Astro の挙動として、サイト内リンクである a要素のクリックや、戻る・進むボタンを押下した時にブラウザ側の標準の挙動ではなく、Astroが提供する router での処理としてオーバーラップされます。
先に書いているように `document.startViewTransition` を呼び出すのが　router の主な役割ではありますが、その前後でさまざまな処理が挟まれています。

[router.ts](https://github.com/withastro/astro/blob/35cd810f0f988010fbb8e6d7ab205de5d816e2b2/packages/astro/src/transitions/router.ts#L128-L147) のコードに書かれているように `data-astro-exec` というカスタムデータ属性を見て、ページ読み込みで新たにスクリプト実行するかどうかを判断しています。

```typescript
for (const script of Array.from(document.scripts)) {
  // ここの部分で評価している
  if (script.dataset.astroExec === "") continue;
  // ...
}
```

ここの処理分岐によって自前で実装したスクリプトはページ遷移時に再度実行されないため、問題が起きていたわけです。
だからイベントリスナを利用して実行する必要があったんですね。

## さいごに

View Transition API のインタフェース自体はシンプルであるものの、コールバック関数の実装や、フォールバック、アニメーションなどの実装が大変であること、そしてドキュメントを読めばどうするべきかは明確だったので非常に良い体験ではあったのですが、どうしてそのようになるかでモヤモヤしてました。
同じモヤモヤを抱えてる人の助けになれば幸いです。

## 参考

- [astro docs view transitions](https://docs.astro.build/en/guides/view-transitions/#client-side-navigation-process)
- [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
