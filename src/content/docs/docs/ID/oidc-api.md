---
title: OIDC API リファレンス
description: ねくたりしょん ID の OpenID Connect (OIDC) API エンドポイントリファレンス (Relying Party 実装向け)
---

このドキュメントは、ねくたりしょん ID プロバイダーを使用した OpenID Connect Relying Party (RP) 実装に必要な包括的な API リファレンスを提供します。

## 概要

ねくたりしょん ID は OpenID Connect Core 1.0 プロトコルを実装しており、以下の機能を提供します：

- **Authorization Endpoint**: 認可コードフロー
- **Token Endpoint**: アクセストークンと ID トークンの発行
- **UserInfo Endpoint**: ユーザー情報の取得
- **Token Revocation**: トークンの無効化
- **Token Introspection**: トークンの検証
- **PKCE サポート**: Proof Key for Code Exchange を使用した認可コードフロー

## クライアント登録について

### 登録方法

ねくたりしょん ID を OIDC プロバイダーとして使用するには、事前にクライアント（アプリケーション）の登録が必要です。

**クライアント登録は申請式となっています。** アプリケーションを登録したい開発者の方は、以下の連絡先までお問い合わせください：

📧 **info@nectarition.jp**

登録が受理されると、以下の情報が提供されます：
- `client_id`
- `client_secret`

これらの認証情報を使用して、ねくたりしょん ID の OIDC API を利用することができます。

## 設定ディスカバリ

### OpenID Configuration

well-known エンドポイントから OpenID Connect 設定を取得します。

**リクエスト:**
```
GET /.well-known/openid-configuration
```

**レスポンス:**
```json
{
  "issuer": "https://idapi.nectarition.jp",
  "authorization_endpoint": "https://idapi.nectarition.jp/oidc/authorize",
  "token_endpoint": "https://idapi.nectarition.jp/oidc/token",
  "userinfo_endpoint": "https://idapi.nectarition.jp/oidc/userinfo",
  "revocation_endpoint": "https://idapi.nectarition.jp/oidc/revoke",
  "introspection_endpoint": "https://idapi.nectarition.jp/oidc/introspect",
  "jwks_uri": "https://idapi.nectarition.jp/.well-known/jwks.json",
  "scopes_supported": ["openid", "profile", "email"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "code_challenge_methods_supported": ["plain", "S256"]
}
```

### JSON Web Key Set (JWKS)

ID トークンの署名検証用の公開鍵を取得します。

**リクエスト:**
```
GET /.well-known/jwks.json
```

**レスポンス:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-id",
      "alg": "RS256",
      "n": "modulus",
      "e": "exponent"
    }
  ]
}
```

## 認証フロー

### 1. Authorization Endpoint

認可リクエストを実行して認証フローを開始します。

**リクエスト:**
```
GET /oidc/authorize?
  client_id={client_id}&
  redirect_uri={redirect_uri}&
  response_type=code&
  scope={scopes}&
  state={state}&
  nonce={nonce}&
  code_challenge={code_challenge}&
  code_challenge_method={code_challenge_method}
```

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `client_id` | string | はい | ID プロバイダーに登録されたクライアント識別子 |
| `redirect_uri` | string | はい | 認証後にユーザーがリダイレクトされるコールバック URL。クライアントに登録されている必要があります |
| `response_type` | string | はい | `code` である必要があります（認可コードフローのみサポート） |
| `scope` | string | いいえ | スペース区切りのスコープリスト。利用可能なスコープ: `openid`、`profile`、`email` |
| `state` | string | いいえ | CSRF 攻撃を防ぐための不透明な状態値。コールバック時に検証が必要です |
| `nonce` | string | いいえ | リプレイ攻撃を防ぐために ID トークンに含まれるランダム値 |
| `code_challenge` | string | いいえ | PKCE コードチャレンジ。PKCE を使用する場合は必須です |
| `code_challenge_method` | string | いいえ | PKCE チャレンジメソッド: `plain` または `S256`。`code_challenge` が指定される場合、デフォルトは `plain` です |

**レスポンス:**

ユーザーは認可同意ページにリダイレクトされます。ユーザーが承認または拒否した後：

```
{redirect_uri}?
  code={authorization_code}&
  state={state}
```

エラーの場合：

```
{redirect_uri}?
  error={error_code}&
  error_description={error_description}&
  state={state}
```

**可能なエラーコード:**

| エラー | 説明 |
|-------|-------------|
| `invalid_request` | 無効なリクエストパラメータ |
| `unsupported_response_type` | サポートされていないレスポンスタイプ（`code` のみサポート） |
| `redirect_uri_mismatch` | リダイレクト URI が登録済み URI と一致しません |
| `unsupported_code_challenge_method` | サポートされていないコードチャレンジメソッド |
| `access_denied` | ユーザーが認可を拒否したか、必要な権限がありません |
| `server_error` | サーバー側でエラーが発生しました |

### 2. Token Endpoint

認可コードをトークンと交換します。

**リクエスト:**
```
POST /oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={authorization_code}&
redirect_uri={redirect_uri}&
code_verifier={code_verifier}&
client_id={client_id}&
client_secret={client_secret}
```

**認証方法:**

このエンドポイントはクライアント認証が必須です。以下の認証方法がサポートされています：

1. **HTTP Basic 認証（推奨）:**
   ```
   Authorization: Basic {base64(client_id:client_secret)}
   ```

2. **リクエストボディ:**
   ```
   client_id={client_id}&
   client_secret={client_secret}
   ```

認証に失敗した場合、`invalid_client` エラーが返却されます。

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `grant_type` | string | はい | `authorization_code` または `refresh_token` である必要があります |
| `code` | string | はい* | authorize エンドポイントから取得した認可コード (*`authorization_code` グラントの場合は必須) |
| `redirect_uri` | string | はい | 認可リクエストで使用した redirect_uri と一致する必要があります |
| `code_verifier` | string | いいえ | PKCE コードベリファイア。authorize リクエストで `code_challenge` を使用した場合は必須です |
| `refresh_token` | string | はい* | リフレッシュトークン (*`refresh_token` グラントの場合は必須) |
| `client_id` | string | はい | クライアント識別子 |
| `client_secret` | string | はい | クライアントシークレット |

**レスポンス (成功 - 200 OK):**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "scope": "openid profile email"
}
```

**レスポンス (エラー - 400 Bad Request):**
```json
{
  "error": "invalid_grant",
  "error_description": "認可コードが無効であるか、期限が切れています"
}
```

**可能なエラーコード:**

| エラー | 説明 |
|-------|-------------|
| `invalid_client` | クライアント認証に失敗しました |
| `invalid_grant` | 認可コードが無効、期限切れ、または別のクライアントのために発行されたものです |
| `invalid_request` | 必須パラメータが不足しているか、コードベリファイアが無効です |
| `unsupported_grant_type` | サポートされていないグラントタイプ |

**トークン有効期限:**

- アクセストークン: 3600 秒（1 時間）
- ID トークン: 3600 秒（1 時間）
- 認可コード: 300 秒（5 分）
- リフレッシュトークン: 2592000 秒（30 日）

### 3. Refresh Token Grant

リフレッシュトークンを使用して新しいアクセストークンと ID トークンを取得します。

**リクエスト:**
```
POST /oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token={refresh_token}&
redirect_uri={redirect_uri}&
client_id={client_id}&
client_secret={client_secret}
```

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `grant_type` | string | はい | `refresh_token` である必要があります |
| `refresh_token` | string | はい | token エンドポイントから取得したリフレッシュトークン |
| `redirect_uri` | string | はい | 認可リクエストで使用した redirect_uri と同じである必要があります |
| `client_id` | string | はい | クライアント識別子 |
| `client_secret` | string | はい | クライアントシークレット |

**レスポンス:**

認可コード token エンドポイントのレスポンスと同じです。

## ユーザー情報

### UserInfo Endpoint

認証されたユーザー情報を取得します。

**リクエスト:**
```
GET /oidc/userinfo
Authorization: Bearer {access_token}
```

**レスポンス (成功 - 200 OK):**
```json
{
  "sub": "hash_encoded_user_id",
  "name": "太郎 山田",
  "email": "yamada@example.com",
  "email_verified": true,
  "scope": "openid profile email"
}
```

**返却される Claims:**

| Claim | 型 | 含まれる条件 | 説明 |
|-------|------|---------------|-------------|
| `sub` | string | 常に | Subject 識別子（一意のユーザー ID） |
| `name` | string | `profile` スコープ | ユーザーの氏名 |
| `email` | string | `email` スコープ | ユーザーのメールアドレス |
| `email_verified` | boolean | `email` スコープ | メールアドレス検証ステータス |
| `scope` | string | 常に | 付与されたスコープ（スペース区切り） |

**レスポンス (エラー - 401 Unauthorized):**
```json
{
  "error": "invalid_token",
  "error_description": "アクセストークンが無効であるか、期限が切れています"
}
```

## トークン管理

### Token Revocation

アクセストークンまたはリフレッシュトークンを無効化します。

**リクエスト:**
```
POST /oidc/revoke
Authorization: Basic {base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded

token={token}&
grant_type={grant_type}
```

**認証:**

このエンドポイントはクライアント認証が必須です。HTTP Basic 認証またはリクエストボディでクライアント認証情報を指定してください。

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `token` | string | はい | 無効化するトークン（access_token または refresh_token） |
| `grant_type` | string | いいえ | トークンタイプのヒント: `refresh_token` またはその他 |

**レスポンス (成功 - 200 OK):**
```json
{}
```

**注記:**

- 無効化は冪等です - 存在しないまたは既に無効化されたトークンを無効化しても 200 OK が返されます
- 無効化後、トークンは API 呼び出しに使用できなくなります
- クライアント認証に失敗した場合は 401 エラーが返却されます

### Token Introspection

トークンを検証してそのメタデータを取得します。

**リクエスト:**
```
POST /oidc/introspect
Authorization: Basic {base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded

token={token}
```

**認証:**

このエンドポイントはクライアント認証が必須です。HTTP Basic 認証またはリクエストボディでクライアント認証情報を指定してください。

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|----------|-------------|
| `token` | string | はい | 検証するトークン |

**レスポンス (トークンが有効 - 200 OK):**
```json
{
  "active": true,
  "sub": "hash_encoded_user_id",
  "exp": 1645123456
}
```

**レスポンス (トークンが無効/期限切れ - 200 OK):**
```json
{
  "active": false
}
```

**注記:**

- アクセストークンのみサポート（ID トークンの検証には対応していません）
- クライアント認証に失敗した場合は 401 エラーが返却されます

## ID Token Claims

ID Token は RS256 アルゴリズムで署名された JWT です。以下の Claims を含みます：

| Claim | 型 | 説明 |
|-------|------|-------------|
| `iss` | string | Issuer 識別子（ねくたりしょん ID プロバイダー URL） |
| `sub` | string | Subject 識別子（一意のユーザー ID） |
| `aud` | string | Audience（client_id） |
| `exp` | number | 有効期限（Unix タイムスタンプ） |
| `iat` | number | 発行時刻（Unix タイムスタンプ） |
| `auth_time` | number | 認証時刻（Unix タイムスタンプ） |
| `nonce` | string | 認可リクエストで指定された Nonce（提供された場合） |
| `name` | string | ユーザーの氏名（`profile` スコープが含まれている場合） |
| `email` | string | ユーザーのメールアドレス（`email` スコープが含まれている場合） |
| `email_verified` | boolean | メールアドレス検証ステータス（`email` スコープが含まれている場合） |

**ID Token の例（デコード済み）:**
```json
{
  "iss": "https://idapi.nectarition.jp",
  "sub": "user_hash_abc123",
  "aud": "client_id_xyz",
  "exp": 1645123456,
  "iat": 1645119856,
  "auth_time": 1645119846,
  "nonce": "random_nonce_value",
  "name": "太郎 山田",
  "email": "yamada@example.com",
  "email_verified": true
}
```

## スコープ

サポートされているスコープは、要求されるユーザー情報と返却される情報を決定します。

| スコープ | 説明 |
|-------|-------------|
| `openid` | 必須スコープ。OpenID Connect 認証を示します |
| `profile` | ユーザープロフィール情報（氏名）をリクエストします |
| `email` | ユーザーメール情報（メールアドレス、メール検証状態）をリクエストします |

**スコープ使用方法:**

```
# すべてのスコープをリクエスト
scope=openid+profile+email

# 基本的な認証のみリクエスト
scope=openid
```

## PKCE (Proof Key for Code Exchange)

PKCE は公開クライアントに推奨され、ねくたりしょん ID でサポートされています。

### サポートされている方法

| 方法 | 説明 |
|--------|-------------|
| `plain` | コードベリファイアはそのまま送信されます |
| `S256` | コードベリファイアは SHA256 でハッシュ化されます |

### 実装手順

1. **コードベリファイアを生成:**
   ```
   code_verifier = ランダム文字列（43-128 文字、URL セーフな base64）
   ```

2. **コードチャレンジを作成 (S256):**
   ```
   code_challenge = base64url(sha256(code_verifier))
   ```

3. **認可リクエスト:**
   ```
   GET /oidc/authorize?
     ...
     code_challenge={code_challenge}&
     code_challenge_method=S256
   ```

4. **Token リクエスト:**
   ```
   POST /oidc/token
     grant_type=authorization_code&
     code={code}&
     code_verifier={code_verifier}&
     ...
   ```

## 一般的な実装パターン

### PKCE を使用した認可コードフロー

Web アプリケーションとネイティブアプリ向けの推奨フロー：

1. コードベリファイアとチャレンジを生成
2. PKCE パラメータを使用して `/oidc/authorize` にユーザーをリダイレクト
3. ユーザーが認証し、スコープに同意
4. ブラウザが認可コード付きで `redirect_uri` にリダイレクト
5. サーバーが code_verifier を使用して `/oidc/token` でコードをトークンと交換
6. サーバーが JWKS エンドポイントの公開鍵を使用して ID Token 署名を検証
7. アクセストークンを使用して `/oidc/userinfo` からユーザー情報を取得

### トークンリフレッシュフロー

アクセストークンが期限切れになった場合：

1. リフレッシュトークンを使用して `/oidc/token` から新しいトークンを取得
2. 保存されたアクセストークンとリフレッシュトークンを更新
3. リフレッシュトークンの有効期限が切れた場合、ユーザーは再認証する必要があります

### ログアウトフロー

1. `/oidc/revoke` を使用してトークンを無効化
2. クライアント側でユーザーセッションをクリア
3. オプション: ユーザーをログアウト後リダイレクト URI にリダイレクト

## ベストプラクティス

1. **PKCE を使用する：**
    - 認可コードが盗聴される攻撃を防ぐため、すべてのクライアントで PKCE の使用が推奨されます。
2. **ID Token 署名を検証する：**
    - JWKS エンドポイントから取得した公開鍵を使用して署名を検証し、改ざんされていないことを確認してください。
3. **Nonce Claim を検証する：**
    - リプレイ攻撃を防ぐため、ID Token の Nonce が認可リクエストで送信した値と一致することを確認してください。
4. **State パラメータを検証する：**
    - CSRF 攻撃を防ぐため、コールバック時に State パラメータが認可リクエストで送信した値と一致することを確認してください。
5. **HTTPS 通信を使用する：** 認証情報とトークンは機密情報です。ねくたりしょん ID プロバイダーとのすべての通信を HTTPS で暗号化してください。
6. **リフレッシュトークンを安全に保存する：**
    - リフレッシュトークンは長期有効です。XSS 攻撃を防ぐため、フロントエンド (JavaScript) ではなくバックエンド側で保管してください。
7. **JWKS をキャッシュする：**
    - パフォーマンス向上のためキャッシュします。キャッシュは署名検証に失敗した場合のみ更新してください。
8. **トークンを事前にリフレッシュする：**
    - アクセストークン有効期限前にリフレッシュし、サービス中断を回避してください。
9. **トークン無効化エラーをハンドルする：**
    - トークン無効化エラーが返却された場合、ユーザーに再認証を促してください。
10. **認証イベントをログに記録する：**
    - セキュリティインシデント調査やデバッグのため、認証成功・失敗などのイベントを記録してください。
    - ただし、トークンやパスワードなどの機密情報はログに記録しないでください。
