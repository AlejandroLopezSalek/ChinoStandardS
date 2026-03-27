# PandaLatam — Características de la Plataforma

> Plataforma educativa de chino para hispanohablantes, desarrollada por **ODL (Organización de Desarrollo Latino)**.
> URL: [chinolatino.club](https://chinolatino.club)

---

## 🏠 Página Principal

- **Tarjetas de nivel** (A1 → C1) con acceso directo a cada nivel de aprendizaje
- **Carrusel en móvil**: las tarjetas se deslizan horizontalmente con indicadores táctiles
- **Acceso rápido a la comunidad**: tarjeta destacada que lleva a las lecciones de la comunidad
- **Banner informativo**: enlace al dashboard del proyecto y hoja de ruta

---

## 📚 Niveles de Aprendizaje (A1 / A2 / B1 / B2 / C1)

Cada nivel tiene su propia página con:

- **Lecciones estructuradas** cargadas dinámicamente desde la base de datos
- **Modal de lección** con contenido enriquecido (texto, tablas, audio, ejercicios)
- **Audio por palabra**: palabras marcadas para pronunciación dentro del editor
- **Filtro por nivel** en las páginas de comunidad
- **Botón de eliminación** para administradores (visible solo con sesión de admin)

---

## 👥 Lecciones de la Comunidad (`/Community-Lessons/`)

- **Búsqueda en tiempo real** con debounce de 300 ms (sin flash en cada tecla)
- **Filtros de tipo**: Todos | 📚 Libros | 📝 Lecciones
- **Filtros de nivel**: Todas / A1 / A2 / B1 / B2 / C1
- **Paginación** estilo HuggingFace (6 ítems por página, para libros y lecciones por separado)
- **Libros PDF** compartidos por la comunidad con metadatos (nivel, idioma, formato)
- **Botón de contribución** que redirige al editor de lecciones

---

## 🌟 Palabra del Día (`/Gramatica/`)

Widget interactivo generado con IA (Groq / LLaMA 3.3 70B):

| Campo | Descripción |
|-------|-------------|
| Palabra turca | Término del día con nivel (A1–C1) |
| Pronunciación | Guía fonética en español |
| Ejemplo | Frase de uso en turco + traducción |
| Quiz | El usuario escribe la traducción y recibe feedback inmediato |
| Revelar | Botón para ver la traducción si no se sabe |
| Tip | Consejo de aprendizaje específico para esa palabra |

- Se pre-genera automáticamente cada medianoche vía Cron
- Generación inicial al arrancar el servidor
- Caché en Redis con prefijo único `CHINO:` para evitar colisiones
- Fallback a "你好" si la IA falla

---

## 📖 Gramática (`/Gramatica/`)

- **Palabra del Día widget** (ver arriba)
- **Recursos gramaticales** externos organizados por categoría:
  - Gramática: Quizlet, Elon, TurkishTextBook, HepTürkçe, Apitwist
  - Diccionarios: Sozluk.gov.tr, WordReference

---

- Chat con asistente de chino basado en **Groq / Moonshot AI (Kimi)**
- Contexto de las lecciones cargadas (HSK 1–6) para respuestas relevantes
- Historial de conversación en sesión
- **Rate limiting**: 50 peticiones por hora por IP para prevenir abuso
- Logging de interacciones (solo para usuarios autenticados)

---

## 🧪 Laboratorio de IA (`/Lab/`)

Experimentos avanzados de aprendizaje personalizados:

### 🧬 ADN Lingüístico
- Análisis morfológico profundo de caracteres chinos.
- Descomposición en radicales y significados individuales.
- Explicación de la etimología y mnemotecnia para memorización.

### 📚 Story Lab
- Historias interactivas generadas por IA con dificultad progresiva.
- Segmentación por palabras para facilitar la lectura inmediata.
- El usuario toma decisiones que afectan el curso de la historia.

### 📝 Exam Lab
- Generación automática de exámenes nivel HSK (1-6).
- Tres secciones críticas: Escucha (con audio IA), Lectura y Escritura.
- Calificación automática y feedback pedagógico del asistente Panda.

---

## ✏️ Editor de Lecciones (`/Contribute/`)

Editor de texto enriquecido para crear y editar lecciones:

| Herramienta | Función |
|-------------|---------|
| Negritas / Cursiva / Subrayado | Formato básico |
| Encabezados H1–H3 | Estructura del contenido |
| Listas | Ordenadas y sin orden |
| Tablas | Filas/columnas configurables |
| Código | Bloque de código monoespacio |
| Sonido | Marca palabras para audio de pronunciación |
| Imagen | Inserción de imágenes |
| Deshacer / Rehacer | Historial de edición |

- Compatible con **modo oscuro**
- Guardado como HTML sanitizado en la base de datos

---

## 📤 Contribuciones (`/Contribute/`)

Flujo para que usuarios registrados aporten contenido:

1. El usuario escribe o edita una lección con el editor enriquecido
2. Envía la contribución con título, descripción y nivel
3. Queda en estado **pendiente de revisión**
4. Un administrador aprueba o rechaza desde el panel admin
5. Las lecciones aprobadas se publican automáticamente

También se pueden compartir **libros en PDF** con enlace externo.

---

## 🛡️ Panel de Administración (`/Admin-Contributions/`)

Acceso exclusivo para administradores autenticados:

- **Vista de solicitudes pendientes**: filtro por tipo (todas / ediciones / libros)
- **Modal de revisión**: previsualización del contenido + editor inline para ajustes
- **Aprobación / Rechazo** con motivo de rechazo opcional
- **Gestión de lecciones publicadas**: lista, búsqueda, edición, eliminación
- **Historial de versiones**: ver todas las versiones anteriores de una lección
- **Reversión**: restaurar cualquier versión anterior con un clic
- **Estadísticas**: total de solicitudes pendientes, aprobadas y rechazadas

---

## 👤 Cuenta de Usuario

### Registro (`/register/`)
- Formulario con validación de nombre de usuario, email y contraseña
- Hash seguro de contraseña en el servidor

### Inicio de Sesión (`/login/`)
- Autenticación con JWT (token en `localStorage`)
- Redirección a página de origen tras login
- Detección automática de sesión expirada

### Perfil (`/Perfil/`)
- Datos personales del usuario
- Estado de cuenta y actividad

---

## 🌐 Recursos Externos (`/Recursos/`)

- **italki**: enlace destacado para clases con profesores nativos de turco (válido para todos los niveles A1–C1)
- Sección con nota sobre ODL y próximas integraciones (Babel, Preply)

---

## 🔔 Notificaciones y UX

- **Progressive Web App (PWA)**: instalable en móvil y escritorio
- **Service Worker**: caché offline para recursos estáticos
- **Modo oscuro / claro**: adaptación automática al sistema operativo
- **Toast notifications**: mensajes de éxito/error no bloqueantes
- **Cache manager**: versionado de caché con actualización automática

---

## 🔒 Seguridad

- Autenticación JWT con verificación en cada petición protegida
- Rate limiting en todas las rutas de IA (50 req/hora por IP)
- Sanitización de inputs contra inyección NoSQL (MongoDB)
- Escape de HTML en todas las plantillas de inserción dinámica (`escHtml`)
- `Content-Security-Policy`, `CORS`, `Helmet` en el servidor
- Sin credenciales hardcodeadas en el código

---

## 🛠️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + Vanilla JS + Tailwind CSS |
| SSG | Eleventy (11ty) |
| Backend | Node.js + Express |
| Base de datos | MongoDB (Mongoose) + Redis (Cache) |
| IA | Groq / Vercel AI SDK (Kimi / LLaMA 3.3) |
| Vector DB | Qdrant (Docker) |
| Auth | JWT & Google OAuth2 |
| Hosting | Oracle Cloud (2GB RAM) + PM2 (1 instance) + Nginx |

---

## 🏗️ Workflows y DevOps

Infraestructura robusta para escalabilidad y mantenimiento:

- **VM Setup**: Guía de instalación automatizada para dependencias (Node, Mongo, Redis).
- **Optimización de Recursos**: Configuración PM2 ajustada a 1 instancia para maximizar la estabilidad en entornos de 2GB RAM.
- **Redis Prefixing**: Aislamiento de sesiones y caché mediante prefijos (`CHINO:`) para permitir múltiples apps en un mismo servidor.
- **RAG Capability**: Sistema de recuperación de información basado en vectores (Qdrant).
- **WSL Connectivity**: Flujo de trabajo optimizado para desarrollo en Windows/WSL2.
