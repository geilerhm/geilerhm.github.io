# MarIAna

Juego de plataformas hecho en la I.E. María Auxiliadora (Lomitas · La Cumbre)
con ayuda de la IA, por fases.

## Cómo jugar

- **Rápido:** doble clic en `index.html`.
- **Recomendado (y necesario desde la fase M2):** servir la carpeta.
  - Con VS Code: instala la extensión **Live Server**, clic derecho en `index.html` → *Open with Live Server*.
  - Sin VS Code, en esta carpeta: `python -m http.server 8000` y abre `http://localhost:8000`.

**Controles:** ← → o A D para caminar · Espacio, ↑ o W para saltar · P pausa · M sonido · N música.

## Estructura

```
mariana/
├── index.html      la página: canvas, menús y botones
├── estilos.css     colores y diseño de la página
├── js/
│   ├── principal.js   TODO el código del juego (se partirá en M2–M5)
│   ├── motor/         (M2) física, choques, cámara, entrada, audio, dibujo
│   ├── juego/         (M2–M4) jugador, enemigos, objetos, poderes, nivel
│   ├── interfaz/      (M2) menús y marcador
│   └── datos/         (M3) niveles, personajes, enemigos, preguntas
├── imagenes/       escudo.png y mariana.png
└── editor/         (M6) editor de niveles
```

## Reglas del proyecto

1. Un archivo, un tema. Si pasa de 200 líneas, se parte.
2. Los datos (niveles, personajes) no son código: van en `js/datos/`.
3. El motor no sabe nada de Mariana ni del colegio.
4. Nada de variables sueltas: el estado se pasa como parámetro.
5. Todo en español: nombres y comentarios.
6. Antes de publicar se corre la lista de `PRUEBAS.md`.

## Publicar

Sube **toda la carpeta** `mariana/` a Netlify (app.netlify.com/drop) o arrastra el zip del proyecto.

## Versiones

- **1.0** — Juego completo en un solo archivo HTML (fases 1 a 6).
- **1.1** — M0 y M1: imágenes afuera y código separado en `index.html`, `estilos.css` y `js/principal.js`.
