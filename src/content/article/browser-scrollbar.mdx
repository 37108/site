---
title: 横スクロールバーのデザインを調整する
description: サイトのデザインで横スクロールが必要になり、かつ常にスクロールバーを表示したいみたいな要件に対応するためにどのような調整が必要になるかを取りまとめました。
date: 2023-04-21
image: /assets/articles/browser-scrollbar/cover.webp
tags: ["frontend"]
---

サイトのデザインで横スクロールが必要になり、かつ常にスクロールバーを表示したいみたいな要件に対応するためにどのような調整が必要になるかを取りまとめました。

## CSS によるスタイリング

主要なブラウザでいくと Firefox かそれ以外でスクロールバーへのスタイルリングが異なります。Firefox は `scrollbar-width` と `scrollbar-color` というプロパティを利用してスタイリングをしていきます。

サポート状況をみても Firefox 以外は全くサポートされていません。

> [Can I Use scrollbar-width](https://caniuse.com/?search=scrollbar-width)

Chrome や Edge、Safari では `::-webkit-scrollbar` などという擬似要素を用いてスタイリングを行います。ベンダープレフィクスもついてる通り標準ではないものの多くのブラウザでサポートされています。

> [Can I Use webkit-scrollbar](https://caniuse.com/?search=webkit-scrollbar)

ただし擬似要素は 1 個だけでなく、 `::-webkit-scrollbar-thumb` などといったものもあり、これらも利用してスタイルを当てる必要があります。
一部の擬似要素は Safari on iOS ではサポートされてないなど細かい差異でデザインが異なることもあり得るのは念頭においてください。

これを踏まえてスタイリングをどのようにするかを書いていきます。

### スクロールバーのデザイン箇所

主要な部分は 3 箇所から構成されています。

![scrollbar desiggn](/assets/articles/browser-scrollbar/scrollbar-design.webp)

- scrollbar: スクロールバー全体
- scrollbar thumb: スクロールバーのつまみ部分
- acrollbar track: スクロールバーの背景部分

`::-webkit-scrollbar` でも `scrollbar-width` と `scrollbar-color` でも基本的な設定箇所はこれらになります。

### Firefox でのスタイリング

`scrollbar-width` でスクロールバーの幅を、`scrollbar-color` の 1 つ目で thumb を、2 つ目で track を指定します。
下記のようにクラスにスタイルを定義したのであれば `scrollbar` というクラス名を持つ要素のスクロールバーに対してスタイルが定義されます。

```css
.scrollbar {
  scrollbar-width: 6px;
  scrollbar-color: #00060 transparent;
}
```

擬似クラスで、 `scrollbar:hover` のようにしてスタイルを定義することはできます。
しかし MacOS でかつトラックパッドを利用している場合の挙動は下記のようになります。

1. 要素のマウスを乗せた際は何も起こらない
2. 要素からマウスを外してまた要素にマウスを乗せると hover 時のスタイルが適用される
3. 以降はホバー時のスタイルが適用される

一方でマウス操作の場合は正常に動作します。

また、Windows の場合はスクロールバーの両端にデフォルトで矢印がついているデザインであり、ここのデザインを調整することができないのでその点も留意しましょう。

### Chrome などでのスタイリング

Chrome などのブラウザでは `::-webkit-scrollbar` を中心に擬似要素に対してスタイルを加えていきます。
track や thumb が擬似要素であるためできるスタイルの幅が広いこと、記述してはいませんが `::-webkit-scrollbar-button` などの疑似要素もあるためかなり柔軟にスタイリングをすることができます。

```css
.scrollbar::-webkit-scrollbar {
  height: 6px;
}
.scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
  border-radius: 16px;
}
.scrollbar::-webkit-scrollbar-thumb {
  margin-left: 24px;
  background-color: #00060;
  border-radius: 16px;
}
```

## 入力デバイスによる違い

トラックパッドかマウスかで挙動が変わってきます。主に MacOS の話にはなってきますが、MacOS でかつトラックパッドの場合はスクロールバーは表示されません。
MacOS でかつマウス操作の場合はスクロールバーが表示されます。
これに関しては設定があるので変更することで挙動を変えることはできますが、ユーザに対して強制できるものではない(アクセシビリティの問題)ので、そういう設定があると言うことを考慮しましょう。

![macOS config](/assets/articles/browser-scrollbar/macos-config.webp)

Windows の場合はマウスでしか試せていませんが、マウスの場合は Chrome でも Firefox でも常にスクロールバーが表示されます。
デフォルトではどちらのデザインも同様です。そして Chrome の場合は左右の矢印も調整できますが、Firefox の場合はスタイルを当てることができないので調整できず、必ず表示されてしまいます。

![windows scroll](/assets/articles/browser-scrollbar/windows-scroll-01.webp)

`chrome://flags` からできる設定項目に Overlay Scrollbars がありこれを有効にすると若干スクロールバーの表示領域が少なくなりますが、これもユーザ側の設定の話なのでデザイン的にどうにかできる話ではありません。

![Chrome flag](/assets/articles/browser-scrollbar/windows-chrome-config.webp)

スクロールバーのデフォルトデザインが変わりホバー時にやや大きく表示されるようになります。

![windows scroll](/assets/articles/browser-scrollbar/windows-scroll-02.webp)

つまり入力デバイスや OS によって同じブラウザであってもスクロールバーのデザインや表示が切り替わります。

## さいごに

まとめるとこんな感じでしょう。Firefox でのデザインが困難ではあるものの色調調整とかのレベル感であれば対応がしやすいという温度感です。

- Windows / Mouse / Chrome
  - デフォルトでスクロールバー表示される。
  - スクロールバーのデザインは調整可能
- Windows / Mouse / Firefox
  - デフォルトでスクロールバー表示される。
  - スクロールバーは thumb と track のみ制御可能
  - 矢印は必ず表示される
- MacOS / Mouse / Chrome (Safari)
  - デフォルトでスクロールバー表示される。
  - スクロールバーのデザインは調整可能
- MacOS / Mouse / Firefox
  - デフォルトでスクロールバー表示される。
  - スクロールバーは thumb と track のみ制御可能
- MacOS / Trackpad / Chrome (Safari)
  - デフォルトでスクロールバーは表示されない。スクロール時にのみ表示される。
  - スクロールバーのデザインは調整可能
- MacOS / Trackpad / Firefox
  - デフォルトでスクロールバーは表示されない。スクロール時にのみ表示される。
  - スクロールバーは thumb と track のみ制御可能
  - ホバー時の挙動がマウスと異なるので要注意

なので無理に統一しようとせずにデフォルトのままにするのも 1 つの手だと思います。それか非表示で統一してしまうか…。
そもそも横スクロールを採用しないっていうのも検討するべきかと思っています。

## 参考

- [::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar)
- [scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width)
- [scrollbar-color](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color)
