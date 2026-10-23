# Real Samaria CP — Seguimiento de jugadoras

Panel del club: login, jugadoras, pagos, ingresos/gastos y goles en torneo.

Stack: Next.js (App Router) + Tailwind, Supabase (base de datos y autenticación), despliegue en Vercel.

## Configuración local

1. Instalar dependencias: `npm install`
2. Crear `.env.local` con las variables de Supabase (ver abajo).
3. Ejecutar: `npm run dev` y abrir http://localhost:3000

Variables de entorno requeridas (en `.env.local` y en Vercel → Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
```

Sin estas variables el login muestra un aviso de configuración pendiente; el resto de la app compila igual.

## Estado actual

- [x] Login con correo y contraseña (`app/login`)
- [x] Logo del club en la pantalla de acceso
- [ ] Protección de rutas (middleware de sesión)
- [ ] Registro de jugadoras, pagos, ingresos/gastos, goles
- [ ] Alertas y recordatorios por WhatsApp
