# SnoopyStudy
Convierte tus metas académicas en logros. Frontend HTML/CSS/JS + backend en Supabase (auth, base de datos) + IA tutora.

## Probar
Abre `index.html`. Sin configurar nada funciona en modo demo (admin: admin@snoopy.com / snoopy123).

## Backend real (Supabase, gratis)
1. Crea un proyecto en supabase.com → SQL Editor → pega `supabase.sql` → Run.
2. Authentication → Users → crea tu usuario admin. En Settings desactiva "Allow new users to sign up".
3. Project Settings → API: copia URL y anon key en las primeras líneas de `script.js`.

## GitHub + Pages
```
git init
git add .
git commit -m "feat: estructura inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/snoopystudy.git
git push -u origin main
```
Repo → Settings → Pages → Branch `main` / root. Haz commits pequeños al avanzar (mínimo 15): landing, estilos, responsive, metas, XP, tienda, chat, tarjetas, contacto, login, panel admin, SQL, README, imágenes de Snoopy, pruebas.
