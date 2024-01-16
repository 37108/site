---
title: HTMLのinput[type=number] の扱いを間違えていた話
description: 自分が思っていた使い方ではなく、どのような要件で利用すべきかのドキュメントまであったのにそれを見落としていたので自戒を込めて記述します。
date: 2023-12-27
image: /assets/articles/html-number-input/cover.webp
tags: ["frontend", "note"]
---

単純なテキスト入力をする場合にはinput要素を使うだけで済みますが、実際のフォームでは数字や日付、入力値の制限などの要件が出てきます。いつも大変だなと思いつつ、都度思い出しながら書いていたので今回は備忘録としてどうするべきかを残しておきます。

## input\[type=number\] が扱いづらい

スピンボタンが必要である場合に `input\[type=number\]` を利用するべきです。MDNのドキュメントにも HTML Living Standard にも同様のことが書かれいます。普段何気なく使っている技術だからこそ、

> \<input type="number"\> 要素の暗黙のロールは spinbutton (en-US) です。もしスピンボタンがフォームコントロールにとって重要な機能でないなら、 type="number" を使用しないよう検討してください。代わりに inputmode="numeric" を使用し、 pattern 属性で文字列を数字とそれに付随する文字に限定してください。 \<input type="number"\> では、ユーザーが何か他のことをしようとしているときに、誤って数値を増加してしまう危険性があります。さらに、ユーザーが数字でないものを入力しようとした場合、何が間違っているのか明示的なフィードバックがありません。

該当要素には暗黙の ARIA ロール で [spinbutton role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/spinbutton_role) が付与されることからも伺えます。そして spinbutton role ではキーボードによるインタラクションを期待しており、例えば `Home` キーの押下で最小値を入力、 `End` キーの押下で最大値を入力することを意味します。
なのでスピンボタンが必要かどうかという問いは、キーボードのインタラクションが有用かどうかという観点に置き換えることができ、そちらの方がわかりやすいかもしれません。
例えば商品の個数選択のようにスピンボタンは必要だが、標準のUIが扱いづらいのであれば、 [spinbutton role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/spinbutton_role) のドキュメントにあるサンプルにならって必要な [WAI-ARIA](https://developer.mozilla.org/ja/docs/Learn/Accessibility/WAI-ARIA_basics) を指定すれば問題を回避することができます。

### 数字の入力をしたい場合

次にクレジットカードの番号のようにスピンボタンが不要で数字を入力する場合です。`inputmode="numeric"` を使用した上で pattern 属性で制約をかけるべきとドキュメントにはあります。先ほど少し WAI ARIA に触れたこともあり合わせて確認しましょう。
inputmode はユーザが使うべき仮想キーボードを提示するための属性なので数字だけであれば `numeric` を指定します。
そして pattern 属性を指定してどのような入力が許可されているかも合わせて伝える必要があります。
pattern 属性でどのような入力を許可しているかをわかりやすく説明するために、title 属性でどのような要素であるかの説明ができます。また、aria-describedby 属性を利用することで視覚的に表示しつつどのような入力が予期されているかを伝える方法もあります。title 属性を利用した場合には、フォームのサブミット時にエラーがあった場合のテキストに title 属性の値が表示されます。aria-describedby 属性の場合は表示されません。エラーの表示は副次的な効果であり、主たる目的は、どのような入力をしてほしいかを伝えることです。

```html
<form>
  <input name="digit" type="text" pattern="[\d]{3}" title="3 digit number" />
  <button>submit</button>
</form>

<form>
  <input
    name="digit"
    type="text"
    pattern="[\d]{3}"
    aria-describedby="digit-description"
  />
  <span id="digit-description">3 digit number</span>
  <button>submit</button>
</form>
```

また、pattern 属性でバリデーションをかけた上で自前でエラーメッセージなど表示したい場合も出てくるかと思います。その場合はエラーメッセージの要素に aria-live 属性に polite を指定して、必要に応じてその表示を切り替えれば表示タイミングでスクリーンリーダにメッセージを伝達してくれます。

```html
<label>
  <input name="digit" type="text" pattern="[\d]{3}" />
  <p role="status" aria-live="polite" aria-hidden="false">
    <span>3 digit number</span>
  </p>
</label>
```

話がかなり横道に逸れてしまいましたが、スピンボタンが不要なのであれば `input\[type=number\]` を使用する必要はありません。そのようなケースは数字を入力した胃ことが多いので、 pattern 属性を中心に適切なマークアップ、必要に応じて WAI ARIA を使うのがベストです。また、つまり扱いづらいのではなく想定していないケースで利用したがためによくない結果に陥ったという、ドキュメントを読み込まなかった自分への自戒です。

### input\[type=date\] が扱いづらい

ちょっとした寄り道にはなりますが、こちらの要素には 暗黙の ARIA ロール がないこと、ブラウザでサポートされていない場合は `input[type=text]` にフォールバックされることからもわかるように、使いづらいのであれば利用しないで良いかと思っています。利用する場合は「保持される値」と「ブラウザの互換性」に注意する必要があります。
まず、保持される値[は日付文字列](https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#date_strings) となり、 `yyyy-mm-dd` 形式の値か空文字になります。
次にブラウザの互換性についてですが、このタイプをサポートしていない場合は単純な文字の入力に変更されます。なのでそのようなブラウザでも正しい値が入力できるように pattern属性で `\d{4}-\d{2}-\d{2}` といった正規表現を指定したり、必要なラベルを付与するのが良いでしょう。

日付の入力が重要な要素なのであればブラウザによってUIが大きく異なり、考慮点がある `input[type=date]` を利用するよりかは、選択可能な入力を select 要素でそれぞれ作成したり、あるいは Date Picker ライブラリの利用や自作を検討した方がたいていの場合で良さそうではあります。

## さいごに

いつも使う技術だからこそドキュメントを読まなかったことが原因でよくない実装をしてしまったことを反省すると同時によりよいUIの実現ができればと思いました。

## 参考文献

- [ARIA: spinbutton role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/spinbutton_role)
- [Date strings](https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#date_strings)
- [WAI-ARIAの基本](https://developer.mozilla.org/ja/docs/Learn/Accessibility/WAI-ARIA_basics)
- [今どきの入力フォームはこう書く！](https://ics.media/entry/11221/)
