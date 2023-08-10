---
title: フロントエンドの新しいテストツールとか
description: フロントエンドのテストでほしいことを考えたり、Storybookのアップデートでさまざまな考えが出てきたのでまとめました。
date: 2023-05-10
image: /assets/articles/frontend-testing-tools/cover.webp
tags: ["frontend", "testing"]
---

今までのフロントエンドのテストツールといえば Jest と Testing Library が 1 つの主流でしたが、Storybook v7 の登場や Playwright の登場で環境が変わるのかなぁというモチベーションで様々試してみました。

## Storybook play 関数

Storybook 7 では CSF 3.0 が利用でき、オブジェクトを利用した記法になりました。その中に play というキーがあり、そこでインタラクションが定義できます。ストーリー含めて大まかに下記のように書いていきます。 定義した play 部分が playbook で該当コンポーネントを開いた時にインタラクションとして実行されます。Testing Library の書き方とほぼ同じ(canvas からいろいろしてるのがちょっとだけ違う)なのであまり迷うことなく書けるため触り心地が良いです。

```tsx
import { expect } from "@storybook/jest";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/testing-library";
import { Checkbox } from "./";

const meta: Meta<typeof Checkbox> = {
  component: Checkbox,
};
type Story = StoryObj<typeof Checkbox>;

export default meta;

export const Index: Story = {
  args: {
    id: "greeting",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  },
};
```

実行結果はこのような形で表示されます。
![execution image](/assets/articles/frontend-testing-tools/interaction-01.webp)

また、より型安全にしたい場合は satisfies 演算子を利用することで Story オブジェクトの定義時に必要な props が抜けていると TypeScript の警告が出るようになります。

```tsx
const meta = {
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

type Story = StoryObj<typeof Checkbox>;
```

インタラクションの結果は Storybook 上でもそのまま反映されるため、チェックボックスを押下したならチェックされた状態のままになります。なのでチェックしていない状態にしたい場合はインタラクションを追加します。下記のサンプルでは再度クリックすることでチェックされてないことの確認含めて実装しています。

```tsx
export const Index: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  },
};
```

userEvent は何も指定しないと高速で実行されるため、入力などでインタラクションをユーザの実行速度に近づけつつ見るにはオプショで delay を指定します。

```tsx
export const Input: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("email", {
      selector: "input",
    });

    await userEvent.type(input, "ex@ example.com", {
      delay: 100,
    });
  },
};
```

Jest で describe を利用してその中で複数のケースを書くみたいこともできます。step という引数があるのでそれでケースを別々に分けることができます。
外部リンクの場合に別タブを開くみたいなコンポーネントがあるとして step で分けると綺麗にテストケースを分けることができます。

```tsx
export const Steps: Story = {
  render: () => (
    <div className="flex gap-4">
      <Link link="/path/to/link">内部リンク</Button>
      <Link link="https://example.com/">外部リンク</Button>
    </div>
  ),

  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('it should have internal link', () => {
      const text = '内部リンク'
      const url = '/path/to/link'
      const link = canvas.getByText(text).closest('a')
      expect(link).toHaveTextContent(text)
      expect(link).toHaveAttribute('href', url)
    })

    await step('it should have external https link', () => {
      const text = '外部リンク'
      const url = 'https://example.com/'
      const link = canvas.getByText(text).closest('a')
      expect(link).toHaveTextContent(text)
      expect(link).toHaveAttribute('href', url)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  },
}
```

実行結果はこのようになります。しっかりと分けられてるので何に対するテストかが分かりやすくなります。

![execution image](/assets/articles/frontend-testing-tools/interaction-02.webp)

オブジェクトなのでコンポジションも可能です。再利用性の高いインタラクションを書いて実行したりとかもできたりします。

```tsx
export const Combined: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await GreetingStroy.play({ canvasElement });
    await AnotherStory.play({ canvasElement });
  },
};
```

ただし、 testing-library 自体がエラーを吐くパターンについて Storybook 上だと fail の表示になってしまいます。 test-storybook やインタラクション的には通ってるので少しだけ不思議な感じになります。

```tsx
export const Index: Story = {
  args: {
    children: "ボタン",
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);

    expect(() => canvas.getByLabelText("ボタヌ")).toThrow(
      /Unable to find a label/,
    );
  },
};
```

![execution image](/assets/articles/frontend-testing-tools/interaction-03.webp)

コンポーネントに対するテストが実装できてかつ、Storybook 上で確認できるのでとても革新的に感じます。

## Playwright Component testing

Playwright も試験的な段階ですがコンポーネントに対するテスト方法を提供しています。
testing-library の記法ではなく Playwright に則って書くので個人的には迷いつつもドキュメントを見ながら書くことができました。

```tsx
test("event should work", async ({ mount }) => {
  let clicked = false;

  const component = await mount(<Form />);

  const username = searchComponent.locator("#username");
  await username.fill("john");

  await expect(username).toHaveValue("john");
});
```

testing-libary + jest + jsdom は Node.js 上での実行になるため、実際のブラウザでの動作を検証できるのがとても強いメリットになってきます。
また Safari や Chrome での実行、デバイスの指定などもできるため 1 回のテストで複数の動作を確認できたり、スナップショットをとることでより堅牢なコンポーネント作りができそうです。

一方で既に Jest や Storybook を導入している環境に関しては Storybook 7 でブラウザ上での実行をインタラクションで試すことができるのでどちらを選択するかは好みが分かれそうかなぁと思っています。個人的には Storybook でインタラクションを書く方がツール的にも馴染みがあるのでし易い印象でした。

## 何をテストしたいのか検討する

Storybook のインタラクションであっても Playwright のコンポーネントテストであっても導入するにあたって考えるべきは「何をしたいか」と「何ができるか」です。
私が確認したい項目は大まかに 3 点です。

- コンポーネントに渡す props で何が変わるか
- コンポーネントが必要な機能を満たしているか
- 各種ブラウザで正しく動作すること

「コンポーネントに渡す props で何が変わるか」はたとえば、`Label` というコンポーネントがあり、 `variant` という props に `filled` と `outlined` が渡せるとします。
その時に見た目がどのように変わるかを確認したいのです。story を書けば props の変更ができるのでブラウザ上で目視ができ、スナップショットを撮れば画像単位で確認することもできます。
「`filled` を渡した時に `bg-gray-400` というクラスが付与される」と「`ouotlined` を渡した時に `border-gray-400` というクラスが付与される」といった形で単体テストを書くことも可能ですが、可読性があまりよくないことと、「クラスが付与される」ことではなく「見た目が変化する」ことを確認したいので実際のケースにあってないとも感じます。
また、スナップショットより story の方がブラウザですぐ確認できるので楽です。実際に見ながらコーディングすることもでき、ホバー時やクリック時の挙動などもあわせて確認できます。
なのでこの項目は story を書くことで対応ができます。

「コンポーネントが必要な機能を満たしているか」はたとえば、 `Form` というコンポーネントがあった時に必要な input が用意されているか、ボタンクリック時の動作が正しいかなどです。
今まで Jest + Testing Library で賄えてた部分でありますがここが、新しく Storybook のインタラクションや Playwright のコンポーネントテストで実装できそうな部分です。Storybook で書いていれば見た目の部分を確認しつつ、コンポーネントに求める動作が何かもテストケースで一貫して確認できるのでかなり楽になりそうだと思っています。
その一方で hooks や普通の関数などをテストする方では jest の実行が必要になったりとテストだけでツールが増えてしまうのが少しだけ懸念点であったりします。ローカルでは特に問題ないとは思っていますが、CI の実行時間が少しだけ伸びそうではありつつ、気にするほどでもないという部分で迷っていたりします。

「各種ブラウザで正しく動作すること」はそのままで Chrome、Firefox、Safari でコンポーネントが思ったように動作するかを確認したいのです。Playwright を利用すれば複数のエミュレーターで実行することができますが、機能面ではなく見た目の部分はどうしても目視で確認するしかないです。結局のところ機能に関する部分は自動でテストができますが、コンポーネント自体の見た目やインタラクションの結果に対する見た目についてはどれだけ頑張っても人の目で確認するしかありません。その上で退化が起きて内科については VRT を書くのがベストかなぁとは思っています。

## さいごに

便利なツールが一気に登場していますが、自分達が何をしたいのかとツールに何を求めるのかを今一度考えて導入するべきだと考えました。

## 参考

- [How to test UIs with Storybook](https://storybook.js.org/docs/react/writing-tests/introduction)
- [Improved type safety in Storybook 7](https://storybook.js.org/blog/improved-type-safety-in-storybook-7/)
- [components](https://playwright.dev/docs/test-components)
