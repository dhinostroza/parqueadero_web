# 🅿️ Sistema de Control de Parqueadero - Hospital Pablo Arturo Suárez

Aplicación web progresiva (SPA) orientada a la gestión, control y auditoría de los espacios de estacionamiento en el Hospital Pablo Arturo Suárez. Diseñada para operar de manera resiliente, incluso en redes inestables, con soporte para bases de datos relacionales (Supabase/PostgreSQL) y un modo de respaldo sin conexión (`localStorage`).

## 🧬 Origen del Proyecto (Migración desde REDCap)

Este proyecto nació con el objetivo de modernizar la estructura de recolección de datos que originalmente se manejaba mediante **REDCap**.
La base de este nuevo sistema y su modelo de base de datos se infirieron analizando la estructura del archivo `Parqueadero_2026-03-02_2307.REDCap.xml` heredado.
El rediseño permite una interfaz táctil, veloz, independiente, y elimina las restricciones visuales y de interacción del formulario REDCap original (como la capacidad del guardia de reportar incidentes con cámara in situ y visualizar mapas), manteniendo compatibilidad a futuro para ingestar lotes de "usuarios autorizados" provenientes del departamento de HR que todavía use REDCap en el hospital.

## ✨ Características Principales

*   **Gestión de Guardias y Accesos:** Interfaz optimizada y rápida para que los guardias de seguridad manejen el flujo de entrada y salida mediante búsqueda por número de cédula o placa.
*   **Módulo de Infracciones:** Capacidad para que el guardia reporte vehículos mal estacionados o que ocupen múltiples espacios. Permite bloqueo automático del usuario durante 3 días y subida de evidencia fotográfica.
*   **Control de Flota Institucional:** Flujos específicos para Ambulancias y Camiones del hospital. Obliga a registrar kilometraje y conductor responsable en cada salida e ingreso.
*   **Auditoría y Analítica VIsual:** Tablero detallado para la Gerencia (Backoffice). Genera gráficas automáticas para medir uso por zonas y resalta en rojo recorridos anómalos de fin de semana superiores a 50 km para los vehículos institucionales.
*   **Accesos Temporales:** Emisión de pases exprés (45 minutos) para visitantes o proveedores no anunciados.
*   **Mapa Interactivo (En Desarrollo):** Mapeo de lotes asignados y zonas VIP/Discapacitados para visibilizar ocupación en tiempo real.

## 🛠️ Stack Tecnológico

*   **Frontend:** Vanilla JavaScript (ESModules), HTML5 semántico, CSS3 moderno (Variables, Flexbox, Grid).
*   **Empaquetador:** [Vite](https://vitejs.dev/) (Rendimiento extremo en desarrollo y HMR).
*   **Visualización de Datos:** [Chart.js](https://www.chartjs.org/) para reportes analíticos.
*   **Backend & Base de Datos (Opcional/Configurado):** [Supabase](https://supabase.com/) (PostgreSQL + API REST/Realtime + Autenticación).
*   **Contenedores:** Docker y Docker Compose para fácil despliegue local o en servidores propios alojando réplicas de bases de datos o pasarelas.

## 🚀 Despliegue y Ejecución

### Opción 1: Desarrollo Local (Node.js)

Requisitos: Node.js 18+

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Levanta el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
4. Visita `http://localhost:5173`. Las credenciales por defecto activando localStorage logica son (`admin` / `123`, o un usuario de base de datos si configuras Supabase).

### Opción 2: Conexión con Supabase (Nube)

1. Renombra el archivo `.env.docker` a `.env` (o crea uno).
2. Coloca en ese archivo tus claves de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
3. Ejecuta el script SQL incluido (`supabase-schema.sql`) en el editor SQL de tu instancia de Supabase para inicializar las tablas necesarias (`parking_logs`, `drivers`, `infractions`).
4. Reanuda tu entorno de dev local con `npm run dev`.

### Opción 3: Contenedores (Docker)

El proyecto incluye un entorno Docker pre-configurado que levanta una capa NGINX y opciones de volumen.

```bash
docker-compose up --build -d
```

La aplicación quedará servida internamente en el puerto configurado y enlazada al entorno Nginx local del contenedor.

## 🤝 Contribución y Próximos pasos
*   **Sync REDCap:** Integración pendiente vía CronJob para mantener actualizada la tabla de usuarios autorizados.
*   **Mapa de Lotes:** Actualización del plano vectorial de estacionamientos una vez la Gerencia delimite los espacios totales.

---
*Hospital Pablo Arturo Suárez - Departamento de Tecnologías de la Información*
