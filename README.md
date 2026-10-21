# 🚕 Línea Los Patriotas — Módulo de Tarifas Trimonetario y Despacho Inteligente

Sistema integral de cotización de tarifas de transporte y despacho para la **Línea de Taxis Los Patriotas**, con base central de operaciones en **Táriba** (Municipio Cárdenas, Estado Táchira, Venezuela).

---

## 🌟 Características Principales

- **Conversión Trimonetaria en Tiempo Real:** Cotización en **COP** (Pesos Colombianos, moneda base de referencia), **USD** y **VES** (Bolívares a tasa oficial BCV).
- **Catálogo Oficial Completo (270 Rutas):**
  - **141 Rutas Base:** Destinos urbanos y suburbanos con salida desde Base Táriba (Hoja 6).
  - **54 Combinaciones Oficiales:** Rutas pactadas directas con `/` entre sectores específicos.
  - **75 Viajes Largos:** Trayectos intermunicipales y nacionales (Hoja 4).
- **Motor de Despacho Radial y Triangulación:**
  - **Despacho Radial:** Cálculo automático para viajes con origen distinto a Táriba: Tramo 1 (Recogida Táriba → Origen) + Tramo 2 (Traslado Origen → Destino).
  - **Inferencia Topográfica para Puntos Fuera de Matriz:** Triangulación mediante el ancla oficial más cercana, gradiente de terreno (**Urbano**, **Troncal**, **Montaña**, **Frontera**) y factor de curvas andinas ($1.38\times$).
- **API con Ruteo Vial y Asistente IA:** Integración con OpenStreetMap (Nominatim), OSRM para kilometraje real por carretera, y Vercel AI SDK para interpretación de solicitudes en lenguaje natural.
- **Recargos y Extras Configurables:** Nocturno (+20%), Lluvia (+10%), Feriados (+15%), paradas adicionales y minutos de espera.
- **Utilidad para WhatsApp:** Generador de texto formateado listo para copiar y enviar al cliente con un solo clic.

---

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **UI & Componentes:** React 19, [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **IA y Ruteo:** [Vercel AI SDK](https://sdk.vercel.ai/), [OSRM](https://project-osrm.org/), [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- **Lenguaje:** TypeScript 5.7

---

## 🚀 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jagc3763/patriotastarif.git
   cd patriotastarif
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   # o con npm:
   npm install
   ```

3. **Ejecutar el servidor de desarrollo:**
   ```bash
   pnpm dev
   # o con npm:
   npm run dev
   ```

4. **Abrir en el navegador:**
   Visita [http://localhost:3000](http://localhost:3000)

---

## 📡 Endpoints de la API

- `GET /api/tarifas/calcular?origen=Táriba&destino=Pueblo+Nuevo&tasaCop=3800&tasaBcv=45.0`
- `POST /api/tarifas/calcular`: Cálculo determinístico con parámetros personalizados.
- `POST /api/tarifas/inteligente`: Inferencia avanzada con geocodificación OSM, ruteo OSRM y análisis IA.

---

## 📄 Licencia

Proyecto privado desarrollado para **Línea de Taxis Los Patriotas** — Táriba, Estado Táchira, Venezuela.
