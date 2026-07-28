# Fotos de produto na VPS (fora do Supabase Storage)

## Quem faz o quê

| Você (VPS) | Código (já no repo) |
|---|---|
| Pasta `/var/www/product-images` | Upload do backend → VPS |
| Copiar esta pasta para `/opt/evolution-api/product-images` | Compressão com `sharp` |
| Colar serviço no `docker-compose.yml` + priorities | Vars no Render/`.env` |
| `docker compose up -d --build` | — |

## 1. Na VPS

```bash
mkdir -p /var/www/product-images
# Copie o conteúdo de vps/product-images deste repo para:
# /opt/evolution-api/product-images/
```

No `/opt/evolution-api/docker-compose.yml`:

1. Cole o serviço de `docker-compose.snippet.yml`
2. Nas labels da `evolution-api`, adicione:
   ```yaml
   - "traefik.http.routers.evolution-api.priority=1"
   - "traefik.http.routers.evolution-api-http.priority=1"
   ```
3. Troque `UPLOAD_TOKEN` por um segredo forte

```bash
cd /opt/evolution-api
docker compose up -d --build product-images
docker compose up -d traefik evolution-api
```

Teste:
- `https://143.95.210.104/product-images/health` → `{"ok":true}`
- Ou grave um arquivo em `/var/www/product-images/teste.txt` e abra a URL

## 2. No Render / .env do backend

```env
VPS_IMAGE_BASE_URL=https://143.95.210.104/product-images
VPS_IMAGE_UPLOAD_URL=https://143.95.210.104/product-images/upload
VPS_IMAGE_UPLOAD_TOKEN=mesmo_token_do_compose
# Se o certificado do IP for problemático:
VPS_IMAGE_TLS_INSECURE=true
```

Com essas 3 vars preenchidas, **novos uploads** vão para a VPS (não para o Supabase Storage).
O banco Supabase continua guardando só a URL em `image_url`.
