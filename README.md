# HTTP / HTTPS сервери на сирих сокетах

Обидва сервери побудовані **без** модулів `http` та `https` — лише `node:net` і `node:tls`,
розбір і збірка HTTP-повідомлень зроблені вручну.

## Генерація self-signed сертифіката

```bash
openssl req -x509 -newkey rsa:2048 -keyout server-key.pem -out server-cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
```

Ключ і сертифікат до репозиторію не потрапляють — `*.pem`, `*.key`, `*.crt` перелічені в `.gitignore`.

## Запуск

```bash
npm start                # HTTP  на :3000        (HTTP_PORT)
npm run start:https      # HTTPS на :3443        (HTTPS_PORT)
```

Кожна точка входу підіймає лише свій сервер — їх можна запускати окремо або обидві разом.

## Структура

| Файл | Призначення |
|---|---|
| `src/core.js` | перевикористовувані частини: `createConnectionHandler`, `Controller`, `buildRequest`, `buildResponse`, `isEnded` |
| `src/app.js` | конкретний застосунок — інстанс роутера і його маршрути (`/`, `/headers`) |
| `src/server.js` | точка входу HTTP: порт + `net.createServer` + `listen` |
| `src/https-server.js` | точка входу HTTPS: порт + сертифікат + `tls.createServer` + `listen` |

`createConnectionHandler(controller)` спільний для обох транспортів — `net.Socket` і
`tls.TLSSocket` мають однаковий інтерфейс потоку, тому логіка читання запиту не дублюється.

Відповідь збирається білдером `buildResponse(req)` з чейнінгом:

```js
res.addStatus('200 OK')
   .addHeader('Content-Type', 'text/plain')
   .addBody(body)
   .send()
```

## Маршрути

| Маршрут | Відповідь |
|---|---|
| `GET /` | `200 OK`, `Content-Type: text/plain`, порожнє тіло |
| `GET /headers` | `200 OK`, `text/plain`, тіло — розібрані заголовки рядками `ключ: значення` (ключі в lower-case) |
| будь-що інше | `404 Not Found` |

## 5. Debug-сесія

```console
$ openssl s_client -connect localhost:3443 -servername localhost </dev/null
depth=0 CN = localhost
verify error:num=18:self-signed certificate
verify return:1
depth=0 CN = localhost
verify return:1
CONNECTED(00000003)
---
Certificate chain
 0 s:CN = localhost
   i:CN = localhost
   a:PKEY: rsaEncryption, 2048 (bit); sigalg: RSA-SHA256
   v:NotBefore: Aug  3 18:44:10 2026 GMT; NotAfter: Aug  3 18:44:10 2027 GMT
---
Server certificate
-----BEGIN CERTIFICATE-----
[... тіло base64 сертифіката згорнуто ...]
-----END CERTIFICATE-----
subject=CN = localhost
issuer=CN = localhost
---
No client certificate CA names sent
Peer signing digest: SHA256
Peer signature type: RSA-PSS
Server Temp Key: X25519, 253 bits
---
SSL handshake has read 1359 bytes and written 391 bytes
Verification error: self-signed certificate
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Server public key is 2048 bit
Secure Renegotiation IS NOT supported
Compression: NONE
Expansion: NONE
No ALPN negotiated
Early data was not sent
Verify return code: 18 (self-signed certificate)
---
DONE
```

**Що означає код 18** (`X509_V_ERR_DEPTH_ZERO_SELF_SIGNED_CERT`): сертифікат на глибині 0
(тобто сам серверний) підписаний власним же ключем — його `issuer` збігається з `subject`
(`CN = localhost` в обох полях), тому ланцюжок довіри ні до якого відомого CA не веде
і OpenSSL не може його перевірити.

Для self-signed сертифіката це **очікувана** помилка, а не збій сервера: рукостискання
успішно завершилось (`New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384`), провалилась лише
перевірка довіри. Обійти її можна, вказавши сам сертифікат як довірений корінь:

```bash
openssl s_client -connect localhost:3443 -servername localhost -CAfile server-cert.pem </dev/null
# -> Verify return code: 0 (ok)
```
