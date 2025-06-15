# GitHub ArtifactのPDFをブラウザで開くツール

zipファイルを展開して中身をブラウザで開くツールです。

## 構成

npmのworkspaceを使用しています。

### app

- ブラウザで動くアプリケーションです。
- Vite + vanilla TS で構成されています。

### workers

- GitHubのArtifactの署名付きURLを取得するCloudflare Workersのアプリケーションです。

### common

- appとworkersで共通のコードを置くディレクトリです。

## デプロイ

### workers

GitHub Actionsで自動でビルドされ、Cloudflare Workersにデプロイされます。

**Reposiitory secrets**に以下の変数を設定してください。

| Name                  | Value                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| CLOUDFLARE_ACCOUNT_ID | CloudflareのアカウントID                                                           |
| CLOUDFLARE_API_TOKEN  | CloudflareのAPIトークン (Workersの編集権限が必要)                                  |
| WORKER_GITHUB_TOKEN   | GitHubのトークン (Actionsの読み取り権限がついたfine-grained personal access token) |

また、`workers/wrangler.jsonc`の`env`セクションを適切に設定してください。

### app

- GitHub Actionsで自動でビルドされ、GitHub Pagesにデプロイされます。

**Reposiitory variables**に以下の変数を設定してください。

| Name            | Value                                        |
| --------------- | -------------------------------------------- |
| VITE_WORKER_URL | ワーカーのURL (例: https://_._.workers.dev ) |

## 使い方

`https://<GitHubユーザー名>.github.io/artifact-viewer/?owner=<GitHubユーザー名>&repo=<リポジトリ名>&artifact_id=<アーティファクトID>`にアクセスする。

現在の制約として、Artifactの中身にはpdfが1ファイルだけ含まれている必要があります。
また、Artifactのcompression-levelは`0`である必要があります。
