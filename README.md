## pitch-demo-day

App web para **controlar el tiempo de un pitch** por etapas (intro / pain / solución / modelo / cierre), con timer, señales sonoras y soporte de recurso visual por etapa.

### Requisitos
- Node.js (recomendado: 18+)

### Correr en local
1. Instala dependencias:
   - `npm install`
2. Ejecuta el servidor de desarrollo:
   - `npm run dev`
3. Abre en el navegador:
   - `http://localhost:3000/`

### Login (opcional)
El proyecto incluye login con Google (Firebase), pero la app también permite **“Continuar como invitado”**.

- **Modo invitado**: guarda tus proyectos en `localStorage`.
- **Con login**: usa Firestore (si tu proyecto Firebase está configurado para ello).

### Estructura del proyecto
- `src/`: frontend React + TypeScript (Vite)
- `src/lib/firebase.ts`: configuración de Firebase/Auth/Firestore

