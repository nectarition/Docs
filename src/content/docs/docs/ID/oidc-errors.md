---
title: OIDC エラーコード
description: ねくたりしょん ID の OpenID Connect エラーコードと応答（Relying Party 実装向け）
---

このドキュメントは、ねくたりしょん ID の OIDC 実装で返却されるエラーコードについて説明します。これらのエラーは OAuth 2.0 と OpenID Connect 仕様に従っています。

## エラーレスポンス形式

### Authorization Endpoint でのエラー

Authorization Endpoint でのエラーは URL パラメータとして返却されます：

```
{redirect_uri}?
  error={error_code}&
  error_description={error_description}&
  state={state}
```

**パラメータ:**

| パラメータ | 型 | 説明 |
|-----------|------|-------------|
| `error` | string | OAuth 2.0 仕様に従ったエラーコード |
| `error_description` | string | 人間が読める形式のエラー説明 |
| `state` | string | 元のリクエストから指定された State パラメータ（指定された場合） |

### Token エンドポイントと UserInfo エンドポイントでのエラー

Token エンドポイントと UserInfo エンドポイントでのエラーは JSON として HTTP ステータスコード 400 または 401 で返却されます：

```json
{
  "error": "error_code",
  "error_description": "エラーの説明"
}
```

## エラーコード一覧

### Authorization エラー

認可リクエストまたは同意フロー中に発生するエラーです。

#### `invalid_request`

**HTTP ステータス:** 400 Bad Request

**説明:** リクエストが必須パラメータを欠いているか、無効なパラメータを含んでいます。

**考えられる原因:**
- `client_id` パラメータが不足
- `redirect_uri` パラメータが不足または無効
- パラメータ形式が無効

**レスポンス例:**
```
{redirect_uri}?error=invalid_request&error_description=Missing+client_id&state={state}
```

---

#### `unsupported_response_type`

**HTTP ステータス:** 400 Bad Request

**説明:** 認可サーバーが要求された `response_type` をサポートしていません。

**考えられる原因:**
- `response_type` が `code` ではない
- 認可コードフロー のみがサポートされています

**レスポンス例:**
```
{redirect_uri}?error=unsupported_response_type&error_description=Unsupported+response+type&state={state}
```

---

#### `redirect_uri_mismatch`

**HTTP ステータス:** 400 Bad Request

**説明:** 指定された `redirect_uri` がクライアントに登録されているリダイレクト URI のいずれにも一致しません。

**考えられる原因:**
- リダイレクト URI のタイプミス
- プロトコルの不一致（http vs https）
- ポート番号の不一致
- 末尾のスラッシュの不一致
- リダイレクト URI がクライアントに登録されていない

**レスポンス例:**
```
{redirect_uri}?error=redirect_uri_mismatch&error_description=Redirect+URI+does+not+match&state={state}
```

**対処:** リダイレクト URI（プロトコル、ドメイン、ポート、パスを含む）がクライアント設定に登録されているかどうか確認してください。

---

#### `unsupported_code_challenge_method`

**HTTP ステータス:** 400 Bad Request

**説明:** 指定された PKCE コードチャレンジメソッドはサポートされていません。

**考えられる原因:**
- `code_challenge_method` が `plain` または `S256` ではない
- メソッド名がスペルミスされている

**サポートされているメソッド:**
- `plain`: コードベリファイアがそのまま送信される
- `S256`: コードベリファイアの SHA256 ハッシュ

**レスポンス例:**
```
{redirect_uri}?error=unsupported_code_challenge_method&error_description=Unsupported+code+challenge+method&state={state}
```

---

#### `access_denied`

**HTTP ステータス:** 400 Bad Request

**説明:** ユーザーが認可リクエストを拒否したか、必要な権限がありません。

**考えられる原因:**
- ユーザーが同意画面で「拒否」をクリック
- ユーザーに必要なチームメンバーシップがない
- ユーザーアカウントが非アクティブまたは中断されている

**レスポンス例:**
```
{redirect_uri}?error=access_denied&error_description=User+denied+authorization&state={state}
```

---

#### `server_error`

**HTTP ステータス:** 500 Internal Server Error

**説明:** 認可サーバーが予期しない条件に遭遇しました。

**考えられる原因:**
- データベース接続エラー
- 設定エラー
- 内部サーバーエラー

**レスポンス例:**
```
{redirect_uri}?error=server_error&error_description=An+unexpected+error+occurred&state={state}
```

**対処:** しばらくしてからリクエストをリトライしてください。エラーが継続する場合は、サービスプロバイダーに問い合わせてください。

---

### Token Endpoint エラー

トークン交換またはリフレッシュ中に発生するエラーです。

#### `invalid_client`

**HTTP ステータス:** 401 Unauthorized

**説明:** クライアント認証に失敗しました。

**考えられる原因:**
- 無効な `client_id`
- 無効な `client_secret`
- 不正な HTTP Basic 認証認証情報
- クライアント認証情報が期限切れ

**レスポンス例:**
```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

**対処:**
1. `client_id` が正しいことを確認してください
2. `client_secret` が正しく、期限切れではないことを確認してください
3. 認証方法が正しい（HTTP Basic またはリクエストボディ）ことを確認してください

---

#### `invalid_grant`

**HTTP ステータス:** 400 Bad Request

**説明:** 認可コード、リフレッシュトークン、または認証情報が無効であるか、別のクライアント用に発行されました。

**考えられる原因:**
- 認可コードが既に使用されている
- 認可コードの有効期限が切れている（5 分の有効期限）
- 認可コードが別のクライアント用に発行されている
- リフレッシュトークンが別のクライアント用に発行されている

**レスポンス例:**
```json
{
  "error": "invalid_grant",
  "error_description": "The authorization code is invalid or expired"
}
```

**対処:**
1. 認可コードエラー: 認可フローを最初からやり直してください
2. リフレッシュトークンエラー: 再認証フローを実装してください

---

#### `invalid_or_used_token`

**HTTP ステータス:** 400 Bad Request

**説明:** トークン（認可コードまたはリフレッシュトークン）が無効であるか、既に使用されています。

**考えられる原因:**
- トークンが既に使用されている
- トークンの有効期限が切れている
- トークンが不正形式またはデータの破損

**レスポンス例:**
```json
{
  "error": "invalid_grant",
  "error_description": "The token is invalid or has been used"
}
```

**対処:**
1. トークン値が正しく完全であることを確認してください
2. 認可フローまたはリフレッシュトークンフローを最初からやり直してください

---

#### `invalid_request`

**HTTP ステータス:** 400 Bad Request

**説明:** リクエストが token エンドポイント用の必須パラメータを欠いているか、無効なパラメータを含んでいます。

**考えられる原因:**
- `grant_type` が不足
- PKCE 使用時に `code_verifier` が不足
- `code_verifier` の形式が無効
- `redirect_uri` が不足
- `redirect_uri` が認可リクエストと一致していない

**一般的なケース:**

**Code Verifier が不足（PKCE が必須）:**
```json
{
  "error": "invalid_request",
  "error_description": "Code verifier is required"
}
```

**Code Verifier が一致していない:**
```json
{
  "error": "invalid_request",
  "error_description": "Code verifier does not match"
}
```

**対処:**
1. すべての必須パラメータが含まれていることを確認してください
2. PKCE の場合: チャレンジで使用した同じ code_verifier が指定されていることを確認してください
3. `redirect_uri` が認可リクエストと正確に一致していることを確認してください

---

#### `unsupported_grant_type`

**HTTP ステータス:** 400 Bad Request

**説明:** 指定された `grant_type` はサポートされていません。

**考えられる原因:**
- `grant_type` が `authorization_code` または `refresh_token` ではない
- グラントタイプのスペルミス

**サポートされているグラントタイプ:**
- `authorization_code`
- `refresh_token`

**レスポンス例:**
```json
{
  "error": "unsupported_grant_type",
  "error_description": "The grant type is not supported"
}
```

---

### UserInfo Endpoint エラー

#### `invalid_token`

**HTTP ステータス:** 401 Unauthorized

**説明:** アクセストークンが無効、期限切れ、または形式が不正です。

**考えられる原因:**
- アクセストークンの有効期限が切れている
- アクセストークン署名検証に失敗した
- アクセストークンが無効化されている
- Authorization ヘッダーが不足または形式が不正

**レスポンス例:**
```json
{
  "error": "invalid_token",
  "error_description": "Access token is invalid or expired"
}
```

**対処:**
1. リフレッシュトークンを使用してアクセストークンをリフレッシュしてください
2. リフレッシュトークンも無効な場合は、認可フローをやり直してください

---

#### `insufficient_scope`

**HTTP ステータス:** 403 Forbidden

**説明:** アクセストークンに必要なスコープがありません。

**考えられる原因:**
- 要求されたユーザー情報が特定のスコープを必要とする
- 必要なスコープなしでアクセストークンが取得された

**レスポンス例:**
```json
{
  "error": "insufficient_scope",
  "error_description": "The access token does not have required scopes"
}
```

**対処:**
1. 必要なスコープで新しいアクセストークンを取得してください
2. 追加のスコープを使用して認可フローをやり直してください

---

## エラーハンドリング例

### 例 1: 認可コードの有効期限が切れている

**リクエスト:**
```
POST /oidc/token
grant_type=authorization_code
code=expired_code_123
redirect_uri=https://app.example.com/callback
client_id=client_abc
client_secret=secret_xyz
```

**レスポンス:**
```json
{
  "error": "invalid_grant",
  "error_description": "The authorization code is invalid or expired"
}
```

**復旧方法:**
- ユーザーが再認証する必要があります
- 最初から認可フローをやり直してください

---

### 例 2: リダイレクト URI の不一致

**リクエスト:**
```
GET /oidc/authorize?
  client_id=client_abc&
  redirect_uri=https://app.example.com/login&
  response_type=code&
  state=xyz
```

**レスポンス:**
```
https://app.example.com/login?
  error=redirect_uri_mismatch&
  error_description=Redirect+URI+does+not+match&
  state=xyz
```

**復旧方法:**
- 登録されたリダイレクト URI が正確に一致しているか確認してください
- プロトコル（http/https）、ドメイン、ポート、パスの違いをチェックしてください

---

### 例 3: PKCE Code Verifier の不一致

**認可リクエスト:**
```
GET /oidc/authorize?
  ...
  code_challenge=E9Mrozoa2owUednMa2gW61riMZoneKHWr6vX2kgsyg&
  code_challenge_method=S256
```

**誤った Code Verifier を指定した Token リクエスト:**
```
POST /oidc/token
grant_type=authorization_code
code=auth_code_123
code_verifier=wrong_verifier_value
...
```

**レスポンス:**
```json
{
  "error": "invalid_request",
  "error_description": "Code verifier does not match"
}
```

**復旧方法:**
- 認可リクエストで生成した正確な同じ code_verifier が使用されていることを確認してください
- S256 メソッドの場合、SHA256 ハッシングが正しく実装されていることを確認してください

---

## タイムアウト動作

### 認可コードのタイムアウト

- **有効期限:** 5 分（300 秒）
- **有効期限後:** 認可コードをトークンと交換できません
- **エラーレスポンス:** `invalid_grant`
- **復旧方法:** 認可フローをやり直してください

### アクセストークンのタイムアウト

- **有効期限:** 1 時間（3600 秒）
- **有効期限後:** トークンを API 呼び出しに使用できません
- **エラーレスポンス:** `invalid_token`
- **復旧方法:** リフレッシュトークンを使用して新しいアクセストークンを取得してください

### リフレッシュトークンのタイムアウト

- **有効期限:** 30 日（2592000 秒）
- **有効期限後:** リフレッシュトークンを使用できません
- **エラーレスポンス:** `invalid_grant`
- **復旧方法:** ユーザーは再認証する必要があります

---

## エラーハンドリングのベストプラクティス

1. **エラータイプを区別してください：**
   - Authorization エラーはクライアントにリダイレクト（redirect_uri エラーパラメータ）
   - Token エラーは JSON レスポンスを返却
   - 常にレスポンス形式をチェックしてください

2. **リトライロジックを実装してください：**
   - `server_error` では指数バックオフを使用してリトライ
   - `invalid_grant` または `access_denied` ではリトライしないでください

3. **ユーザーフィードバックを提供してください：**
   - `access_denied` には分かりやすいメッセージを表示
   - `invalid_grant` では再認証を促す
   - 予期しないエラーで通知

4. **エラーハンドリングをセキュアにしてください：**
   - 内部エラー詳細をクライアントに公開しないこと
   - デバッグ用にサーバー側でエラーをログに記録
   - エラーメッセージに機密データを含めないこと

5. **トークン有効期限を処理してください：**
   - 有効期限前にアクセストークンを先制的にリフレッシュ
   - `invalid_token` エラーで自動リフレッシュを実装
   - リフレッシュトークンの有効期限を適切に処理

6. **PKCE 検証をしてください：**
   - 常にランダムなコードベリファイアを生成
   - Web アプリではより安全な S256 メソッドを使用
   - コードチャレンジの計算を検証してください

7. **Token Revocation と Introspection エンドポイントのセキュリティ：**
   - これらのエンドポイントはクライアント認証が必須です
   - 無効な認証情報では 401 Unauthorized が返却されます
   - 常に HTTP Basic 認証またはリクエストボディでクライアント認証情報を指定してください
