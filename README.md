# Hokage Chat

Aplicación web de chat con inteligencia artificial inspirada en cuatro personajes del universo de *Naruto*: Naruto, Sasuke, Madara y Kakashi. Cada uno tiene su propia personalidad, una página de presentación y un historial independiente de conversaciones.

## Índice

- [Enlace a la aplicación](#enlace-a-la-aplicación)
- [Capturas](#capturas)
  - [Galería de personajes](#galería-de-personajes)
  - [Inicio de Naruto](#inicio-de-naruto)
  - [Chat con conversaciones guardadas](#chat-con-conversaciones-guardadas)
  - [Acerca de Kakashi](#acerca-de-kakashi)
- [Funcionalidades](#funcionalidades)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Pruebas](#pruebas)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Rutas principales](#rutas-principales)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Almacenamiento y privacidad](#almacenamiento-y-privacidad)
- [Autor](#autor)
- [Documentación: uso de la IA](#documentación-uso-de-la-ia)

## Enlace a la aplicación

[Abrir Hokage Chat](https://chatbotnaruto.vercel.app/home)

## Capturas

### Galería de personajes

![Galería de Naruto, Sasuke, Madara y Kakashi](docs/capturas/galeria-personajes.jpg)

### Inicio de Naruto

![Página de inicio de Naruto](docs/capturas/inicio-naruto.jpg)

### Chat con conversaciones guardadas

![Chat de Madara con varias conversaciones guardadas](docs/capturas/chat-madara.jpg)

### Acerca de Kakashi

![Página Acerca de Kakashi](docs/capturas/acerca-kakashi.jpg)

## Funcionalidades

- Galería para elegir entre Naruto, Sasuke, Madara y Kakashi.
- Vistas de inicio, chat y acerca de para cada personaje.
- Respuestas de Gemini con un contexto y una personalidad propios por personaje.
- Creación, selección y eliminación de varias conversaciones independientes para cada personaje.
- Persistencia del historial en `localStorage`, incluida la migración del formato anterior.
- Indicador de escritura, hora en cada mensaje, envío con Enter y opción para copiar respuestas.
- Modo claro y oscuro con preferencia guardada en el navegador.
- Panel de conversación con altura limitada y scroll interno.
- Diseño adaptable a escritorio, tableta y móvil.
- Límite de 500 caracteres por mensaje; se envían a Gemini hasta los 20 mensajes más recientes de la conversación activa.

## Tecnologías

- HTML semántico, CSS y JavaScript con módulos ES.
- Gemini API para generar respuestas.
- API de Vercel para conectar el navegador con Gemini y mantener la clave fuera del frontend.
- Vercel CLI para el entorno de desarrollo local.
- Vitest para las pruebas del endpoint.

## Requisitos

- Node.js `22.12+`, `24.x` o `26+`.
- npm.
- Una clave de API de Gemini para usar el chat.

## Instalación y ejecución local

1. Clona el repositorio y entra en la carpeta:

   ```bash
   git clone https://github.com/secasospina/ChatBot_Naruto.git
   cd ChatBot_Naruto
   ```

2. Instala las dependencias:

   ```bash
   npm ci
   ```

3. Crea `.env.local` desde el archivo de ejemplo:

   ```bash
   cp .env.example .env.local
   ```

4. Abre `.env.local` y agrega tu clave de Gemini:

   ```env
   GEMINI_API_KEY=tu_clave_de_gemini
   ```

   Mantén esta clave privada. No la incluyas en archivos del frontend ni la subas a GitHub.

5. Inicia la aplicación con Vercel:

   ```bash
   npm run vercel:dev
   ```

   Abre en el navegador la dirección local que muestre la terminal, normalmente `http://localhost:3000`.

## Pruebas

Ejecuta las pruebas unitarias del endpoint con:

```bash
npm test
```

Las pruebas usan una clave simulada y respuestas controladas; no necesitan una clave real de Gemini.

En la última ejecución, las ocho pruebas del endpoint finalizaron correctamente:

![Resultado de Vitest: ocho pruebas aprobadas](docs/capturas/pruebas-endpoint.jpg)

## Despliegue en Vercel

1. Importa el repositorio `secasospina/ChatBot_Naruto` desde GitHub.
2. Mantén `./` como directorio raíz y selecciona el preset `Other`.
3. Agrega `GEMINI_API_KEY` en **Environment Variables** para los entornos que quieras habilitar, como Production y Preview.
4. Despliega el proyecto. Los nuevos cambios enviados a `main` activan despliegues de producción.

No es necesario configurar un comando de build ni una carpeta de salida para esta aplicación. Si cambias una variable de entorno, vuelve a desplegar para que el cambio se aplique.

## Rutas principales

| Sección | Ruta |
| --- | --- |
| Galería | `/home` |
| Inicio de un personaje | `/:personaje/home` |
| Chat de un personaje | `/:personaje/chat` |
| Acerca de un personaje | `/:personaje/about` |

En esas rutas, `:personaje` puede ser `naruto`, `sasuke`, `madara` o `kakashi`. Las rutas antiguas `/chat` y `/about` llevan al chat y a la página Acerca de Naruto.

## Estructura del proyecto

```text
├── api/
│   ├── chat.js              # Endpoint, validación y prompts de Gemini
│   └── chat.test.js         # Pruebas unitarias del endpoint
├── assets/                  # Imágenes de personajes y fondos
├── docs/
│   ├── capturas/            # Imágenes de referencia para este README
│   └── uso-de-ia.md         # Documento para ampliar el uso de IA
├── src/
│   ├── app.js               # Rutas, vistas y navegación
│   ├── characters.js        # Datos y contenido de los personajes
│   ├── chat.js              # Conversaciones, mensajes y almacenamiento local
│   └── styles.css           # Estilos y diseño adaptable
├── .env.example             # Plantilla de variables de entorno
├── index.html               # Documento HTML principal
├── package.json             # Dependencias y comandos
└── vercel.json              # Reescritura de rutas de la aplicación
```

## Almacenamiento y privacidad

Las conversaciones y la preferencia de tema se guardan en el `localStorage` del navegador. No se sincronizan entre dispositivos ni navegadores. La clave de Gemini se configura en Vercel o en `.env.local` y se utiliza desde el endpoint del servidor.

## Autor

Desarrollado por **Sebastián Castaño Ospina**.

- [GitHub](https://github.com/secasospina)
- [LinkedIn](https://www.linkedin.com/in/sebastiancastanoo/)

## Documentación: uso de la IA

El proyecto se realizó con apoyo de herramientas de inteligencia artificial para resolver dudas, explorar el diseño visual y colaborar en la implementación. La [documentación del uso de IA](docs/uso-de-ia.md) describe ese apoyo y el uso de Gemini dentro de la aplicación.
