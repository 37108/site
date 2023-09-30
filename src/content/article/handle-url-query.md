---
title: JavaScriptでURLのクエリと向き合う
description: 検索ページなどでURLのクエリを取得したり変更したりさまざまなことが起こり得ますが、型のチェックなど結構大変だったので備忘録的な感じでまとめました。
date: 2023-09-30
image: /assets/articles/handle-url-query/cover.webp
tags: ["frontend", "note"]
---

検索ページなどではクエリパラメータを取得してそれを検索条件に反映したり、リンクやナビゲーションにクエリパラメータを反映させることが多々あります。それ以外のページでも似たようなケースで扱うことが多々あります。
そのケースで便利なのが[URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams) というAPIになります。Next.js の AppRouter では `useSearchParams` APIを経由してこのインスタンスを取得するようになってたりします。

## 基本的なユースケース

URLSearchParams インスタンスを生成することができます。オプションとしてクエリパラメータを文字列、オブジェクト、配列などの形で渡すこともできます。

```typescript
var p = new URLSearchParams();

var p = new URLSearchParams("q=greeting");
var p = new URLSearchParams({ q: "greeting" });
var p = new URLSearchParams(["q", "greeting"]);
```

MDN のドキュメントを参照すると、下記が引数として該当するのでMap などを同様に渡すことができたりもします。

> - 文字列
> - 名前を表す文字列と値を表す文字列のペアのリテラル列、もしくはそのような文字列のペアの列を生成するイテレーターを持つ任意のオブジェクト（たとえば FormData のオブジェクト）
> - 文字列のキーと文字列の値からなるレコード
>   https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams#parameters

```typescript
const map = new Map();
map.set("q", "greeting");

const p = new URLSearchParams(map);
```

### URLSearchParams を利用する

利用するといってもメソッドを呼び出すだけですね...。それらのメソッドもJSを触っていれば見慣れたようなものが多いのですんなり入ってくると思います。

まずインスタンスからクエリパラメータを文字列として出力してくれるメソッドです。

```typescript
const p = new URLSearchParams("q=greeting");

console.log(p.toString());
// 'q=greeting'
```

qが複数ある場合の`toString` の出力を見ていきます。`q=greeting&q=foobar` といった形になるため `q[]=greeting&q[]=foobar` などの形を予期している場合はこのまま利用できません。回避策としては `URLSearchParams` インスタンス作成時にキー自体を `q[]` といった形にするのが簡単かなぁと思います。

```typescript
const p = new URLSearchParams([
  ["q", "greeting"],
  ["q", "foobar"],
]);

p.toString();
// 'q=greeting&q=foobar'
```

`append`、 `delete`、 `set`などの基本的な追加/削除の操作もあり、キーに該当する最初の値のみを返す、 `get` とキーに該当するすべての値を返す `getAll` というメソッドもあります。この辺りはとても直感的なインタフェースなので省略します。 `Object.entries` のように、クエリパラメータに含まれるすべてのキーと値をイテラブルに処理できる `entries` というメソッドもあります。またURLの正規化などに利用できる、ソートとして `sort` メソッドも備わっています。この辺りのメソッドはドキュメントを見れば一目瞭然かなと思ったりします。

## ネストへの対応

ここからが本題というか、書きたかった部分なのですが、Next.js の Page Router でクエリパラメータを取得するには `useRouter` の返り値である `router.query` を利用するのが一番簡単なのですが、キーが同一のクエリパラメータが複数ある場合に返ってくるオブジェクトが下記のような指定になります。

```typescript
// router.query
{
  q: ["greeting", "foobar"];
}
```

これをそのまま URLSearchParams のインスタンス生成に使うとネストされた値は考慮されないため下記のように解釈されます。

```typescript
const p = new URLSearchParams({ q: ["greeting", "foobar"] });

p.toString();
// 'q=greeting%2Cfoobar'
```

ここで、先ほど示したように配列であれば問題なく解釈してくれることを利用してオブジェクトを配列に変換することで対応することができます。

```typescript
const o = {
  q: ["greeting", "foobar"],
  r: "routing",
};

const v = [];
for (const [key, value] of Object.entries(o)) {
  if (typeof value === "string") {
    v.push([key, value]);
  } else {
    value.forEach((val) => {
      v.push([key, val]);
    });
  }
}
```

またクエリパラメータだけでなくURLの全体がわかる場合は `URL` インスタンスを経由してより簡単に作成することが可能です。
この辺りは実装時のユースケースに合わせて考えるのが良いかと思います。

```typescript
const u = new URL("https://example.com?q=greeting&q=foobar&r=routing#ddd");
u.searchParams.toString();
// 'q=greeting&q=foobar&r=routing'
```

## さいごに

URLSearchParams だけでなく、 URL や URLPattern といったAPIもあり(URLPatternは一部ブラウが未対応)、標準APIだけでもかなり便利な機能が使えるようになっています。
ぜひさまざま試してみると良いかと思いました。

## 参考

- [URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams)
