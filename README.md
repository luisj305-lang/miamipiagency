# miamipiagency.com

Sitio estatico de Miami PI Agency. Se despliega solo en Cloudflare Workers
a cada commit en `main`.

## Como funciona el blog

Los articulos los escribe Soro. El circuito es automatico:

```
Soro publica  ->  GitHub Action (9:30 y 21:30 hora de Miami)  ->  commit  ->  Cloudflare despliega
```

- `.github/workflows/blog.yml` lee el feed RSS de Soro dos veces al dia.
- `_tools/generar-blog.py` convierte cada articulo en una pagina HTML real
  en `/<slug>/`, con el diseno del sitio, schema `Article` y enlaces internos
  a las paginas de servicio.
- Tambien reconstruye `/blog/` y anade las URLs nuevas a `sitemap.xml`.
- Si el feed falla, el generador no toca nada.

Para forzarlo a mano: pestana **Actions** -> *Regenerar blog desde Soro* -> **Run workflow**.

La URL del feed vive en el secret `SORO_FEED_URL`, no en el codigo.

## Editar el sitio a mano

Se edita la carpeta local y se sube con GitHub Desktop (**Commit** -> **Push origin**).
Cloudflare despliega solo. Ya no se suben ZIP al panel.

## Que no se publica

`.assetsignore` deja fuera `_tools`, `.github` y las carpetas de respaldo.

## Aviso

Miami PI Agency opera bajo licencia de agencia de Florida #A290026. El trabajo de
campo fuera de Florida lo realizan investigadores licenciados en cada estado.
