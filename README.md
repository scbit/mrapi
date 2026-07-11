# MRAPI CAM Dental

Software CAM dental web para preparar discos dentales, importar STL, hacer nesting manual, agregar soportes/pines y preparar simulaciones CAM futuras para fresadoras dentales de 3, 4 y 5 ejes.

## URL oficial

https://mrapi-cam-604957912671.europe-west1.run.app

Esta URL debe usarse como referencia fija de pruebas del proyecto.

## Stack actual

- Google Cloud Run
- Node.js
- functions-framework `helloHttp`
- Three.js
- STLLoader
- OrbitControls
- TransformControls
- Dockerfile
- GitHub + Cloud Build + Cloud Run

## Estado actual del proyecto

El proyecto ya tiene implementadas o en progreso estas capacidades:

- Visualizador STL
- Disco dental / stock
- Importacion STL
- Varias piezas en el mismo disco
- Seleccion individual de piezas
- Movimiento X/Y/Z por pieza
- Rotacion por pieza
- Z controlado
- Validacion dentro/fuera del disco
- Colision basica entre piezas
- Soportes/pines conectados a piezas
- Modos CAD / Preparacion y CAM / Fresado
- Guardar/cargar proyecto JSON
- Simulacion CAM demo
- Toolpath demo
- Herramienta visual demo
- Material removido demo

## Convenciones de ejes

- X = izquierda / derecha
- Y = adelante / atras
- Z = altura
- Disco dental centrado en Z = 0
- Si el disco mide 20 mm:
  - cara superior = +10 mm
  - cara inferior = -10 mm
- En modo 3 ejes, la herramienta debe estar vertical en Z.
- La punta de la herramienta debe representar el punto de corte.
- La punta de la herramienta debe verse claramente, idealmente color rosa.

## Modos principales

### CAD / Preparacion

- Importar STL
- Nesting manual
- Mover/rotar/Z
- Soportes
- Validaciones
- JSON

### CAM / Fresado

- Herramientas
- Estrategias
- Trayectorias
- Simulacion
- Stock removido
- Stock remanente
- Resultado mecanizado aproximado
- Comparacion futura
- G-code futuro

## Reglas para Codex / agentes

- No romper Cloud Run.
- Mantener functions-framework `helloHttp`.
- No cambiar la URL oficial.
- No implementar G-code real sin confirmacion.
- No tocar CAD si el pedido es solo CAM.
- No tocar soportes si el pedido es solo simulacion.
- No reescribir todo el `index.js` si se puede hacer patch pequeno.
- Antes de cambios grandes, preferir refactor modular.
- Mantener compatibilidad con guardar/cargar JSON.
- No hacer pruebas con archivos locales salvo que se pida explicitamente.
- No abrir la URL salvo que se pida explicitamente.
- El usuario prueba manualmente y reporta.
- No hacer que el resultado mecanizado sea una copia perfecta del STL si la trayectoria no lo justifica.
- El CAM debe distinguir entre:
  - STL disenado objetivo
  - stock inicial
  - material removido
  - stock remanente
  - resultado mecanizado aproximado

## Arquitectura objetivo

```text
mrapi-cam/
├── Dockerfile
├── package.json
├── index.js
└── public/
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── state.js
    ├── scene.js
    ├── cad.js
    ├── supports.js
    ├── cam.js
    ├── project.js
    └── geometry.js
```

Actualmente puede estar todo en `index.js`, pero la estructura objetivo es modular.

## Roadmap

### Modulo 1

- Visualizador STL + disco

### Modulo 2

- Nesting manual + Z controlado

### Modulo 2.1

- Multipieza

### Modulo 3

- Soportes/pines por pieza

### Modulo 3.1

- Separar CAD / CAM

### Modulo 4

- Simulacion CAM demo

### Modulo 4.1

- Stock/remocion realista demo

### Modulo 5

- Refactor modular

### Modulo 6

- CAM 2.5D / heightmap inicial

### Modulo 7

- Simulacion por voxels

### Modulo 8

- G-code experimental

### Modulo 9

- Postprocesadores

### Modulo 10

- 4 ejes / 5 ejes

## Como correr localmente

```bash
npm install
npm start
```

Cloud Run usa `PORT=8080`.

## Como desplegar

- El despliegue se hace por GitHub + Cloud Build + Cloud Run.
- Push a `main` dispara deploy.
- No cambiar `Dockerfile` salvo que sea necesario.

## Archivos de prueba del usuario

Referencias locales del usuario, no incluidas en el repo:

```text
C:\Users\facun\OneDrive\Escritorio\zub.stl
C:\Users\facun\OneDrive\Escritorio\zub - copia.stl
C:\Users\facun\OneDrive\Escritorio\zub - copia - copia.stl
```

Estos archivos no estan en GitHub.
