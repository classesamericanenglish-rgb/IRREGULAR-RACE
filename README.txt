IRREGULAR RACE — Multijugador en tiempo real

ARCHIVOS: public/index.html (interfaz), server.js (servidor multijugador), verbs.json (100 verbos), package.json.

PARA PROBAR LOCALMENTE (requiere Node.js >=18):
1. Abrir terminal en esta carpeta.
2. Ejecutar: npm install
3. Ejecutar: npm start
4. Abrir http://localhost:3000

PARA JUGAR DESDE CELULARES POR INTERNET:
Subir esta carpeta a un hosting de Node.js que soporte conexiones WebSocket, como Render o Railway. Configurar el comando de instalación npm install y comando de inicio npm start. Compartir URL HTTPS del sitio.
No se puede conectar a celulares externos usando localhost.

REGLAS:
Máximo 20 jugadores incluido el profesor; quien crea la sala es profesor/jugador.
Solo el profesor inicia, con cualquier cantidad entre 1 y 20.
Todos empiezan en 0. Correcta +1, incorrecta -5 (mínimo 0).
Sin tiempo para responder. Corrección durante 3 segundos y siguiente pregunta automática.
Cada participante recibe verbos sin repetición hasta agotar los 100, luego se barajan de nuevo.
Se barajan las opciones A/B/C/D; una sola es correcta.
Gana el primero que llega a 100. Ningún nuevo participante puede entrar después de START.
Quien conserva la sesión local del mismo dispositivo puede recuperar su posición tras perder conexión; si se reinicia el servidor, las salas desaparecen.

IMPORTANTE: VERSIÓN BETA. Para producción prolongada se recomienda base de datos persistente, autenticación estable del host, pruebas de carga y guardar las salas entre reinicios del servidor.
