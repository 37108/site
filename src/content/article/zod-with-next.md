---
title: Next.js で Zod を利用してきた
description: Next.js と Zod を利用する機会があったので備忘録です
date: 2024-01-11
image: /assets/articles/zod-with-next/cover.webp
tags: ["frontend", "zod", "nextjs"]
---

Next.js で Web アプリを作る際に [Zod](https://zod.dev/) を入れたことで HTTP リクエストのためのバリデーションやフォームでのバリデーションと多岐にわたって活躍したので活躍したので備忘録として残しておきます。

後発の [Valibot](https://valibot.dev/) がサイズが小さいなどの利点もあるのですが、プロダクションへの投入や自分で長期にわたってメンテナンスできないこともあり、安定版が出ている Zod を採用しました。

## スキーマを作成する

まずスキーマを作成しないことには何も始まらないので軽く触れいていきます。Zod では単純な文字列型から複雑にネストされたオブジェクトの型まで全てをスキーマと呼称しています。

> I'm using the term "schema" to broadly refer to any data type, from a simple `string` to a complex nested object.

このようにスキーマを作ってあげることで、あるオブジェクトがそのスキーマの定義を満たしているかや、スキーマを元にTypeScript の型を作り上げることができます。この辺りの細かい使い方についてはあまり触れませんが、ドキュメントを読んだりすればするする理解できるかと思います。

```tsx
import { z } from "zod";

// define string schema
const SimpleSchema = z.string();
const ObjectSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().optional(),
});
```

### コンパニオンオブジェクトパターン を活用する

Zod でスキーマを定義した時に、スキーマを使いたい場合もあればそれと同様にTypeScriptの型定義として活用したいタイミングもあります。例えば User を定義するとして、Zod のスキーマは `UserSchema` でそれから抽出する型情報は `User` にするといったことをすると常に2つの名前をつける必要があり冗長になりがちです。TypeScript では値と型に同名をつけて区別なく活用できる、[コンパニオンオブジェクトパターン](https://typescriptbook.jp/tips/companion-object)があります。

下記のように定義してあげればZod Schema として扱っている箇所ではそのように扱われて、型情報として扱われている場所についてはそのようになるという非常に便利な記法です。

```tsx
export const User = z.object({
  id: z.string().uuid(),
  name: z.string().min(5).max(16),
  place: z.string().max(120).optional(),
});
export type User = z.infer<typeof User>;
```

### エラーメッセージの定義

Zod では parse に失敗すると [ZodError](https://zod.dev/ERROR_HANDLING?id=zoderror) を返します。場合にはよりますが、React Hook Formを使っているとエラーを直接扱ってメッセージを表示することはあまりです。ただしエラーメッセージはZodが返したものを表示するため、何もしなかった場合には英語で返ってきます。

```tsx
const name = z.string().min(10);

name.parse("cheetos");
// [
//   { error: "String must contain at least 10 character(s)" },
// ]
```

英語はおしゃれにみえて好きですが、そうは問屋がおろさないので日本語にする必要が大体あります。多言語化対応をするのであれば [zod-i18n](https://github.com/aiji42/zod-i18n) といったパッケージがあるので便利ですが、日本語化するだけだと少し重たいので別の方法を見ていきます。

1つ目として挙げられるのがスキーマの定義時に引数として渡す方法です。下記のようにエラーをメッセージを定義すれば事がうまく運びます。また、 `refine` などのメソッドを利用した場合にも自由なエラーメッセージが定義するのでかなり重宝する手法ではあります。

```tsx
const name = z
  .string({ invalid_type_error: "型が違う" })
  .min(10, { message: "10文字以上でよろしく" });

name.parse("cheetos");
// [
//   { error: "10文字以上でよろしく" },
// ]
```

2つ目の方法は、ZodErrorMap を定義して Zod に渡す方法です。こちらの方法では何度もスキーマ定義時に引数を渡す必要がなくなるためコードが書きやすく可読性も上がる素晴らしい方法です。

```tsx
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  /**...*/
};
z.setErrorMap(customErrorMap);
```

ここの `customErrorMap` を型情報だけで書くのは非常に厳しいので、[Zod のソースコード](https://github.com/colinhacks/zod/blob/master/src/locales/en.ts)をベースに記述するとうまく行くかと思います。

### テストを書く

Zod 標準の機能でスキーマを定義している場合にはテストが必須とは言えませんが、regex や transform、refine などを利用した際にテストが書きたくなります。

Zod のサンプルにありますが、パスワードの入力が一致するかで記載していきます。

```tsx
export const PasswordForm = z
  .object({
    password: z.string(),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"], // path of error
  });
```

上記のようなスキーマがあるとして、parse した時にエラーを投げるかどうかでテストがかけたりします。エラーインスタンスでの比較が冗長で書きづらいとかであれば、メッセージだけの比較でも良いかもしれません。

```tsx
describe("PasswordForm", () => {
  it("should parse", () => {
    const data = {
      password: "1q2w3e",
      confirm: "1q2w3e",
    };
    expect(() => PasswordForm.parse(data)).not.toThrow();
  });
  it("should throw error if password does not match", () => {
    const data = {
      password: "1q2w3e",
      confirm: "e3w2q1",
    };
    // expect(() => PasswordForm.parse(data)).toThrow("Passwords don't match");
    expect(() => PasswordForm.parse(data)).toThrow(
      new ZodError([
        {
          code: "custom",
          message: "Passwords don't match",
          path: ["confirm"],
        },
      ]),
    );
  });
});
```

逐一データを定義するのが面倒な場合は [zod-mock](https://www.npmjs.com/package/@anatine/zod-mock) を活用することで手間が省けます。このライブラリでは Zod のスキーマを元に [@faker-js/faker](https://www.npmjs.com/package/@faker-js/faker) を利用してデータを生成してくれます。オブジェクト生成時に入るデータが何であっても問題ない場合は単純に `generateMock` という関数を利用できます。ただ、今回のように `password` と `confirm` が同一である必要があったり、 `string().startsWith()` などのメソッドを利用した場合でもデフォルトでは faker で生成されたランダムな文字列が入るだけなのでそれが起因でパースに失敗します。その場合には `stringMap` を定義してあげればうまいこと働きます。先ほどあげた `startsWith` もこれを利用して接頭語 + ランダムな文字列などにしてあげれば問題が起こりませんね。

```tsx
const data = generateMock(PasswordForm, {
  stringMap: {
    password: () => "1q2w3e",
    confirm: () => "1q2w3e",
  },
});
```

また、実際にはテストでの利用もしているのですがそれ以上に MSW などのレスポンス生成時に利用することでランダムなレスポンスを返せるようになって非常に便利だったりします。特に配列型のレスポンスをハードコーディングしたり、変更して確認するのに大変な労力を要するので本当に重宝します。

## Next.js でリクエストを検証する

Zod のスキーマを定義してきましたが、これらを活用して Next.js の `getServerSideProps` などでのリクエストを検証してみます。クエリパラメータは当該関数の `req.query` に入っているのでそれを丸ごとZod で対応できるのでかなり楽に検証ができます。

例えば、検索ページで `query` と `limit` と `offset` があるとして、それらがオプショナルである場合は書き方1つで安全にしてくれます。

```tsx
const Query = z.object({
  query: z.coerce.string().optional(),
  limit: z.coerce.number().int().min(1).optional().catch(undefined),
  offset: z.coerce.number().int().positive().optional().catch(undefined),
});
```

それぞれにわたる元の型が `string | string[] | undefined` なのにそれを parse するだけで型を変換してくれます。

`string[]`の変換時のみ `string` と `number` で挙動が変わるので注意が必要です。 `string` の場合は配列長が2以上の場合にはそれぞれの要素をコンマ区切りで結合した文字列を返します。それに対して `number` では配列長が2を超えると `NaN` を渡すためにエラーが起きます。ただしこのスキーマではメソッドチェーンで `catch` 付与しているのでエラーは起きずに `undefined` が返ってきます。この挙動が気に入らないなどあれば [`Preprocess`](https://zod.dev/?id=preprocess) を `coerce` の代わりに使うのが良さそうですね。

## React Hook Form と組み合わせる

[React Hook Form](https://react-hook-form.com/) 本体と [@hookform/resolvers](https://www.npmjs.com/package/@hookform/resolvers) を利用することでフォームの値を検証することができます。useForm に対してスキーマの型を渡した上で resolver を指定するだけで使えます。下記のようにすれば後は input 要素に対して `...methods.register("username")` で展開されるprops を渡してあげるだけで登録からバリデーションまでしてくれます。

```tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const CreateUser = z.object({
  username: z.string().min(5),
  profile: z.string().optional(),
  age: z.number().int().optional(),
  zip: z.string(),
  agreement: z.literal(true),
});

const methods = useForm<z.infer<typeof CreateUser>>({
  defaultValues: undefined,
  mode: "onBlur",
  reValidateMode: "onChange",
  resolver: zodResolver(CreateUser),
});
```

input要素にいつも頭を悩まされているなら想像がつきそうですが、input で受け取った型の変換が一部で思ったように動かないことがあります。それを列挙しながら少し説明していきます。

### 数字や日付の入力

まず、input要素から数値型を受け取りたい場合、先ほどの例だと `age` の場合は Zod には文字列型が渡されるので変換する必要があります。 `coerce` を使えば簡単に変換できそうに見えますが、このメソッドは `null` と `""` を `0` と解釈してしまうため、0が入力できる場合には使えません。その場合は `preprocess` を利用して自前で処理を実装するしかありません…。下記に簡単な例を示しますが、0に解釈されそうなものを先に弾いておけば綺麗にバリデーションが通るようになります。

```tsx
const CreateUser = z.object({
  age: z.preprocess((value) => {
    if (!value) {
      return undefined;
    }
    return Number(value);
  }, z.number().int().optional()),
});
```

これで年齢の入力をしなかったユーザが赤ちゃん返りするのを防げます。また `catch` というメソッドがあるのは紹介しましたが、これを利用してしまうとエラーハンドリングがされるがためにエラーメッセージの表示がされなくなるため場合によっては悪手になるので気をつけましょう。

`type="date"` を利用した日付の入力も空文字の解釈が上手くいかないためバリデーションの実行時にエラーが起きます。なので同様に `preprocess` で不要な場合は `undefined` を返しつつそれ以外の場合は Date を返すなどがベストになってきます。

### Checkbox の入力

checkbox の値は Zod に渡される時にブール値なのでそのままで良いのですが、例えばプライバシーポリシーへの同意を求める場合など、 `true` のみを許容したい場合があります。その場合は [Literals](https://zod.dev/?id=literals) を活用します。名前の通りある値しか受け入れないスキーマになるので true ではない場合にエラーが出るようになります。

```tsx
const PrivacyPolicy = z.literal(true);
```

また、メールマガジンへの購読など、ブール値を利用したい場合は [Booleans](https://zod.dev/?id=booleans) を使います。

```tsx
const Subscription = z.boolean();
```

### File の入力

FileList を扱う型は Zod に標準でないので、[Custom schemas](https://zod.dev/?id=custom-schemas) を利用します。FileList から File を取り出すのは必須ではないのですが、単体のファイルを扱うのであれば非常に有用なので利用しています。その上で、ファイルサイズなどのバリデーションが必要なのであれば下記のように refine で定義することができます。

```tsx
const UserIcon = z
  .custom<FileList>()
  .transform((files) => files[0])
  .optional()
  .refine((file) => !file || file.size < 3_000_000, "maximum size exceeded")
  .refine(
    (file) => !file || ["image/png"].includes(file.type),
    "invalid extension",
  );
```

またこれらの内容もテストをすることは可能ですが、画像を用意せずに行う場合はテストが遅くなったりする原因にもなるのでパフォーマンスを気にするのも重要になってきます。イメージとしてはこのような形です。

```tsx
test("sample", () => {
  const data = new Uint8Array(10 * 1024 * 1024);
  data.fill(0);
  const blob = new Blob([data], { type: "text/plain" });
  const file = new File([blob], "icon.jpeg", {
    type: "image/png",
  });
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("name", "file-upload");
  input.multiple = true;
  const mockFileList = Object.create(input.files);
  mockFileList[0] = file;
  expect(() => UserIcon.parse(mockFileList)).toThrow("maximum size exceeded");
});
```

### 型の変換

例えばフォーム上では苗字と名前で受け取りたいけど、POSTリクエストの際は繋がった状態で投げたいみたいな要望がある場合には、 `[transform](https://zod.dev/?id=transform)` で変換をかけます。

```tsx
const CreateUser = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    zip: z.string().optional(),
  })
  .transform(({ firstName, lastName, ...data }) => ({
    name: `${lastName} ${firstName}`,
    ...data,
  }));
```

このときに、 `z.infer` で推論した型は `{name: string, zip: string | undefined}` になるためuseForm へ渡す型が不適切になってしまいます。`z.input` を代わりに渡すことで変換処理前の型情報を伝えることができます。

```tsx
const {
  handleSubmit,
  register,
  formState: { errors },
} = useForm<z.input<typeof CreateUser>>({
  defaultValues: undefined,
  mode: "onBlur",
  reValidateMode: "onChange",
  resolver: zodResolver(CreateUser),
});
```

ただ、 React Hook Form の v7では、 `handleSubmit` の引数自体は正しく `z.output<typeof CreateUser>` であるのに、型情報はが `z.input<typeof CreateUser>` になるので下記のように変換をかける必要があります ([issue](https://github.com/react-hook-form/react-hook-form/issues/8382))。

```tsx
<form
  onSubmit={handleSubmit((_data) => {
    const data = _data as unknown as z.output<typeof CreateUser>;
    console.log(data);
  })}
>
```

単体での変換であっても存分に力を発揮してくれます。例えば郵便番号をハイフン付きでも受け入れるけど実際にリクエストを投げる際にはハイフンなしにしたいなどで簡単に活用できます。

```tsx
const Zip = z.preprocess(
  (value) => {
    if (!value) {
      return undefined;
    }
    return String(value);
  },
  z
    .string()
    .regex(/^\d{7}$/)
    .or(z.string().regex(/^[0-9]{3}-[0-9]{4}$/))
    .optional()
    .transform((value) => value?.replace("-", "")),
);
```

ただしHTML input 要素で相互に何かをしたい、例えば、「価格」と「税込価格」の2つのフィールドがあり、どちらか一方に入力した時にそれを元に他方の値を更新したいみたいな処理は Zod では扱いきれないのでこの場合は React Hook Form の `register` 関数で `onChange` と `deps` を使うことでハンドルできます。

## Server Actions でバリデーションを実行する

React の Server Actions と組み合わせた際にどのように作用するかを Next.js で実装して試してみます。[Next.js からの引用](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#progressive-enhancement)にはなりますが、Server Actions によってサーバコンポーネントでは JavaScript が無効であっても、クライアントコンポーネントでは JavaScriptが読み込まれる前であってもフォームの発火ができるようになります。

> Server Components support progressive enhancement by default, meaning the form will be submitted even if JavaScript hasn't loaded yet or is disabled.
> In Client Components, forms invoking Server Actions will queue submissions if JavaScript isn't loaded yet, prioritizing client hydration.

このメリットを享受するためにもバリデーションをクライアントコンポーネントでインタラクティブに実行するのではなく Server Actions の中で実行する方がより良さそうですね。

まず、Server Actions をどのように扱うかを今一度確認しましょう。 基本的に `"use server"` ディレクティブを付与した上で FormData を受け取って必要な処理をする形になります。Server Componentsを定義しているファイルであれば同一ファイルで定義することができます。処理をファイルレベルで分離したい場合やClient Components で利用する場合には別ファイルで定義することができます。

```tsx
// actions.ts
"use server";

export const createUser = async (formData: FormData) => {
  const data = Object.fromEntries(formData.entries());
  console.log(data);
};
```

あとはこれをコンポーネント側で呼び出すだけで完了です。非常に簡単です。

```tsx
import { createUser } from "./actions";

export const FormComponent = () => {
  return <form action={createUser} />;
};
```

次に Server Actions でバリデーションを行い、その結果をコンポーネント側に通知する方法をみていきます。
[useFormState](https://ja.react.dev/reference/react-dom/hooks/useFormState) という Hook を利用することで、Action の返り値を経由して自前定義した状態をコンポーネント側で購読できるようになります。
なので今回の場合は下記のような流れでバリデーションをすることができます。

1. useFormState で Action から状態を受けられるようにする
1. Action でバリデーションエラーが起きたら、エラーを返す
1. useFormState の返り値である state を見てエラーを表示する

コンポーネント側での対応はシンプルで action を直接渡すのではなく、`useFormState` の返り値を渡すように変更するだけまずは動きます。

```tsx
import { useFormState } from "react-dom";
import { createUser } from "./actions";

export const Form = () => {
  const [state, action] = useFormState(createUser, {});
  return (
    <form action={action} className="flex flex-col gap-6 w-full">
      {/** some inputs */}
    </form>
  )
```

Actionの方は、引数も返り値の型もガラッと変わるのでそれを見ていきましょう。

```tsx
"use server";
import { z } from "zod";

const CreateUser = z.object({
  username: z.string().regex(/^[a-zA-Z_\d]{6,10}/, {
    message: "should be ^[a-zA-Z_d]{6,10}",
  }),
});

type CreateUser = z.infer<typeof CreateUser>;
type CreateUserState = {
  errors?: z.inferFlattenedErrors<typeof CreateUser>["fieldErrors"];
};

/**
 * Server Action Code
 */
export const createUser = async (
  prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> => {
  const data = Object.fromEntries(formData.entries());
  const validated = CreateUser.safeParse(data);

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
    };
  }
  // do API request...
  return {};
};
```

型定義が頭にあってややこしいですが、Server Actions のインタフェースから見ていきましょう。
第1引数が前回発火時の状態に代わり、第2引数が FormData に代わります。そして返り値の型も同様に状態の型に変更します(非同期関数なのでPromiseつけています)。

上の型定義で何をしているかというと、Zod ではスキーマで起きたエラーを扱いやすい形にする [`flatten`](https://zod.dev/ERROR_HANDLING?id=flattening-errors) というメソッドがあります。今回のスキーマであれば下記のようにハンドリングされます。

```ts
// zod schema type
type CreateUser = {
  username: string;
};

// zod schema errors type
type CreateUserFlattenFieldErrors = {
  username?: string[] | undefined;
};
```

この形で十分に扱いやすいので、これをそのまま formState の型として利用するために、型定義を先頭で行なっていました。もしバリデーションエラー以外にも API リクエストでのエラーを扱いたいなどがあれば、今回は `CreateUserState` の場合を拡張して `message` などのキーを追加するなども可能です。

これで Action の定義もできたので、コンポーネント側でエラーを表示させるように変更します。
`state` の型は `useFormState` が `createUser` の型情報から渡してくれるのでクライアント側では何も意識することなく利用することが可能です。あとはエラーがある場合は表示するといった分岐にすることで非常に楽々と対応することができます。

```tsx
export const Form = () => {
  const [state, action] = useFormState(createUser, {});
  return (
    <form action={action}>
      <label>
        <p>username</p>
        <input id="username" name="username" />
        <p>{state.errors?.username}</p>
      </label>
      <button type="submit" />
    </form>
  );
};
```

### useFormStatus でActionの実行状態を取得する

form での通信なので大抵の場合はActions側で非同期処理がなされそれには時間を要します。利用している Action の状態を取得するには `useFormStatus` が使えます。
例えば Action の実行中は submit ボタンを利用不可にしたいなどのケースで役に立ちます。
引数もない Hook なので利用自体は簡単なのですが、下記例のように `useFormStatus` を実行するコンポーネント(今回はボタン)をFormを定義するコンポーネントの子にする必要があります。

```tsx
import { useFormState, useFormStatus } from "react-dom";
import { createUser } from "./actions";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
    >
      submit
    </button>
  );
}

export const Form = () => {
  const [state, action] = useFormState(createUser, {});
  return (
    <form action={action} className="flex flex-col gap-6 w-full">
      {/** some inputs */}
      <SubmitButton />
    </form>
  )
```

これで action 側で時間を要する処理があったとしてもボタンを再度押されずに済みます。

## さいごに

スキーマが必要な場合はZod を中心に組み立てることができていれば非常に様々なユースケースに対応できること、そしてZod自体のエコシステムの強さを感じられました。これからも機会があったらぜひ使っていきたい次第です。

## 参考文献

- [Zod](https://zod.dev/)
- [コンパニオンオブジェクトパターン](https://typescriptbook.jp/tips/companion-object)
- [Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [useFormState](https://ja.react.dev/reference/react-dom/hooks/useFormState)
- [useFormStatus](https://ja.react.dev/reference/react-dom/hooks/useFormStatus)
