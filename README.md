# ses-template-manager
## 概要
Amazon SES( https://aws.amazon.com/jp/ses/ )にはテンプレートを使用したメール送信の機能がある( https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html )が、その管理はCLIにしか対応していなく、使っていて正直しんどかったのでツール化してみた。
## 前提
AWS SDKが使用できる状態であること(下記は例)。
- `aws configure`によりAWS Access Keyを登録してある
- 適切なロールを割り当てられたEC2インスタンスである
## セットアップ
1. このリポジトリをcloneする。
2. `npm install`

## 使い方
### テンプレートの準備
基本形はこちら。

    {
        "Template": {
            "TemplateName": "MyTemplate",
            "SubjectPart": "Greetings, {{name}}!",
            "HtmlPart": "<h1>Hello {{name}},</h1><p>Your favorite animal is {{favoriteanimal}}.</p>",
            "TextPart": "Dear {{name}},\r\nYour favorite animal is {{favoriteanimal}}."
        }
    }

CLIにて指定するJSONそのままの形式。ファイル名は拡張子が`.json`ならば何でもよいが、`TemplateName`と揃えることをお勧めする。

通常メールテンプレートは改行を多く含むと思われるが、JSONで表す場合は`\r\n`で記述しなければならず全体で一行にせざるを得ない。
そこでJSONでは`TextPart`を記述せずテキストファイルに切り出す形式を使用できる。

    {
        "Template": {
            "TemplateName": "MyTemplate",
            "SubjectPart": "Greetings, {{name}}!",
            "HtmlPart": "<h1>Hello {{name}},</h1><p>Your favorite animal is {{favoriteanimal}}.</p>"
        }
    }

テキストファイル名は`{TemplateName}.txt`とする。(上記の例ではMyTemplate.txt)

    Dear {{name}},
    Your favorite animal is {{favoriteanimal}}.

混同を避けるため、`TextPart`が存在しない場合にのみ`.txt`ファイルを参照する。
同様に`HtmlPart`に`.html`ファイルを適用させることができる。こちらはオプションである。
### テンプレート登録
`npm start`
### テンプレートのdump
`npm dump`
