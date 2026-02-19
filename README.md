# OAuth 2.0 Mock Authorization Server (Client Credentials)

테스트/개발/통합용 Mock OAuth 2.0 인증 서버. **Client Credentials Grant**로 JWT access token 발급, **클라이언트 등록 API** (`/register`) 제공. Cloudflare Workers + KV.

## Endpoints

- **POST /token** — Client Credentials Grant. `application/x-www-form-urlencoded`: `grant_type=client_credentials`, `client_id`, `client_secret`. 응답: `access_token` (JWT), `token_type`, `expires_in`.
- **POST /register** — 클라이언트 등록. JSON: `client_id`, `client_secret`, `client_name`. 검증: client_id 영숫자·`-`·`_`만, 1~128자, `:` 불가; client_secret 8자 이상.
- **GET /register/:client_id** — 등록된 클라이언트 메타 조회 (client_id, client_name; secret 제외).

## 로컬 실행

1. 의존성 설치: `npm install`
2. KV namespace 생성:
   - Production: `npx wrangler kv:namespace create "CLIENTS_KV"`
   - Preview: `npx wrangler kv:namespace create "CLIENTS_KV" --preview`
3. `wrangler.toml`의 `id`와 `preview_id`를 위에서 출력된 id로 교체.
4. **로컬 시크릿**: `.dev.vars` 파일 생성 (git 제외됨). 예:
   ```
   JWT_SECRET=your-secret-key-at-least-32-chars
   JWT_ISSUER=http://localhost:8787
   JWT_EXPIRES_IN_SECONDS=3600
   ```
5. 실행: `npm run dev` → `http://localhost:8787`

## 프로덕션 배포 (Cloudflare)

- **시크릿**: Cloudflare Dashboard → Workers & Pages → 해당 Worker → Settings → Variables and Secrets에서 `JWT_SECRET`(필수), `JWT_ISSUER`, `JWT_EXPIRES_IN_SECONDS` 설정.
- **배포**: `npm run deploy` 또는 GitHub Repo 연결 후 Cloudflare에서 빌드/배포.

## 환경 변수

| 변수 | 로컬 (.dev.vars) | 프로덕션 (Secrets) | 설명 |
|------|------------------|---------------------|------|
| JWT_SECRET | 필수 | 필수 | JWT 서명용 시크릿 (32자 이상 권장) |
| JWT_ISSUER | 선택 | 선택 | iss 클레임 (미설정 시 요청 origin 사용) |
| JWT_EXPIRES_IN_SECONDS | 선택 (기본 3600) | 선택 | access token 만료(초) |

## License

MIT
