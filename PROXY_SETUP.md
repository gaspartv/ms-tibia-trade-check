# Configuração de Proxy para FlareSolverr

## Status: ✅ FUNCIONANDO

O proxy da **Polônia (Warsaw)** está funcionando corretamente com o Tibia.com.

## Proxy Ativo

| Campo           | Valor             |
| --------------- | ----------------- |
| **IP**          | 84.247.60.125     |
| **Porta**       | 6095              |
| **Username**    | dtkihkmd          |
| **Password**    | f6h5lyuzn7v6      |
| **Localização** | 🇵🇱 Poland, Warsaw |
| **Status**      | ✅ Working        |

## Comando Docker Atual

```bash
docker run -d \
  --name=flaresolverr \
  -p 8191:8191 \
  -e LOG_LEVEL=info \
  -e PROXY_URL=http://84.247.60.125:6095 \
  -e PROXY_USERNAME=dtkihkmd \
  -e PROXY_PASSWORD=f6h5lyuzn7v6 \
  --restart unless-stopped \
  ghcr.io/flaresolverr/flaresolverr:latest
```

## Proxies Alternativos (Testados)

| IP             | Porta | Localização        | Status       |
| -------------- | ----- | ------------------ | ------------ |
| 84.247.60.125  | 6095  | 🇵🇱 Poland, Warsaw  | ✅ Funciona  |
| 142.111.48.253 | 7030  | 🇺🇸 US, Los Angeles | ❌ Bloqueado |
| 23.95.150.145  | 6114  | 🇺🇸 US, Buffalo     | ❌ Bloqueado |
| 198.23.239.134 | 6540  | 🇺🇸 US, Buffalo     | ❌ Bloqueado |
| 64.137.96.74   | 6641  | 🇬🇧 UK, London      | ❌ Bloqueado |

## Outros Proxies Disponíveis (Não Testados)

| IP              | Porta | Localização         |
| --------------- | ----- | ------------------- |
| 107.172.163.27  | 6543  | 🇺🇸 US, Bloomingdale |
| 198.105.121.200 | 6462  | 🇪🇸 Spain, Madrid    |
| 216.10.27.159   | 6837  | 🇺🇸 US, Dallas       |
| 23.26.71.145    | 5628  | 🇺🇸 US, Orem         |
| 23.27.208.120   | 5830  | 🇺🇸 US, Reston       |

**Credenciais**: `dtkihkmd:f6h5lyuzn7v6`

## Reconfigurar FlareSolverr

Para alternar entre proxies:

```bash
# Parar e remover container atual
docker stop flaresolverr && docker rm flaresolverr

# Iniciar com novo proxy (exemplo com Proxy 1)
docker run -d \
  --name=flaresolverr \
  -p 8191:8191 \
  -e LOG_LEVEL=info \
  -e PROXY_URL=http://142.111.48.253:7030 \
  -e PROXY_USERNAME=dtkihkmd \
  -e PROXY_PASSWORD=f6h5lyuzn7v6 \
  --restart unless-stopped \
  ghcr.io/flaresolverr/flaresolverr:latest
```

## Status do Problema

⚠️ **BLOQUEIO ATIVO**: Ambos os proxies estão sendo bloqueados pelo Cloudflare ao acessar www.tibia.com.

Erro retornado:

```
Error: Error solving the challenge. Cloudflare has blocked this request.
Probably your IP is banned for this site, check in your web browser.
```

### Possíveis Causas

1. Os IPs dos proxies estão na lista negra do Cloudflare para www.tibia.com
2. O Cloudflare detecta que é um proxy devido a características de rede
3. www.tibia.com tem proteção mais agressiva contra proxies residenciais

### Próximos Passos

1. ✅ Testar proxies diferentes (ambos já testados, ambos bloqueados)
2. ⏳ Obter proxies de outro provedor
3. ⏳ Tentar proxies residenciais rotativos
4. ⏳ Considerar serviços de scraping gerenciados (ScrapingBee, ScraperAPI)
5. ⏳ Implementar estratégia de rotação de User-Agent e fingerprinting

## Arquivos de Configuração

### .env

```dotenv
FLARESOLVERR_URL="http://localhost:8191/v1"
# Proxies configurados no Docker, não via .env
PROXY_URL=""
PROXY_USERNAME=""
PROXY_PASSWORD=""
```

### src/config/env.ts

Variáveis opcionais já definidas no schema Zod:

- `PROXY_URL`
- `PROXY_USERNAME`
- `PROXY_PASSWORD`

### src/modules/coins-history/coins-history.service.ts

O código está preparado para usar proxy via API do FlareSolverr em `sessions.create`:

```typescript
const proxyConfig = env.PROXY_URL
  ? {
      proxy: {
        url: env.PROXY_URL,
        ...(env.PROXY_USERNAME && { username: env.PROXY_USERNAME }),
        ...(env.PROXY_PASSWORD && { password: env.PROXY_PASSWORD }),
      },
    }
  : {};
```

## Referências

- [Documentação FlareSolverr - Proxy](https://github.com/FlareSolverr/FlareSolverr#environment-variables)
- [Webshare.io - Provedor de Proxy](https://www.webshare.io/)
