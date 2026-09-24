// MarIAna · juego completo
// Este archivo se irá partiendo en módulos en las fases M2 a M5.

// =====================================================
//  MarIAna — FASE 6: niveles, meta, sonidos, récord y pausa
//  Juego completo hecho por fases con ayuda de la IA
// =====================================================

// 1) Preparar el lienzo
const canvas = document.getElementById('juego');
const ctx = canvas.getContext('2d');
const ANCHO = canvas.width;    // 800
const ALTO = canvas.height;    // 450

// 2) EL MAPA DEL NIVEL (NUEVO EN LA FASE 3)
//    Cada letra es un cuadro (baldosa) de 45 × 45 píxeles.
//    '#' = tierra con césped   '=' = plataforma amarilla
//    '~' = agua del río        '.' = aire
//    OBJETOS (NUEVO EN LA FASE 4):
//    'o' = moneda (10)  'f' = fruta (20)   'l' = libro (30)
//    'p' = lapicero (15) 'b' = billete (50) 'c' = celular (100)
//    OBSTÁCULOS (NUEVO EN LA FASE 5), en MAYÚSCULA:
//    'N' = hoja con mala nota (vuela arriba y abajo)
//    'T' = pila de tareas (camina de un lado a otro)
//    'R' = reloj despertador (salta)
//    'P' = globo «¡A estudiar!» (persigue a Mariana si se acerca)
//    ¡Puedes cambiar el nivel editando estas filas! (todas deben tener el mismo largo)
//    'M' = META: la bandera del colegio (NUEVO EN LA FASE 6)
// LOS NIVELES (NUEVO EN LA FASE 6): cada nivel tiene nombre, mapa y decorado
const NIVELES = [
  {
    nombre: 'Nivel 1 · El colegio',
    mapa: [
      '........................................................',
      '........................................................',
      '..................................................bc....',
      '..........................................N......====...',
      '....................Tlb...............lb.olo..f.........',
      '......f.......N.....====.....opo......##.===..==........',
      '................oo........f..===.....###............P...',
      '...ooo..lR.p.......f...T..#......ooR####.....f....Tpo.M.',
      '################..##########.....########...############',
      '################..##########~~~~~########...############',
    ],
    decorado: decoradoColegio
  },
  {
    nombre: 'Nivel 2 · El campo',
    mapa: [
      '................................................................',
      '....................................................bc..........',
      '....................................................===.........',
      '...................................N............................',
      '..............olo..N.........f..oo.l........N.....l.............',
      '...........o..===....b......###.==###.....o..o...===............',
      '...........=.........=.....####...###.....=..=..........oo......',
      '...oof..p.......Too.....fR#####...###.olo.......b.P..pT...Rfo.M.',
      '##########...#######...########...#######......#########..######',
      '##########~~~#######...########...#######~~~~~~#########..######',
    ],
    decorado: decoradoCampo
  }
];
let nivelActual = 0;
let MAPA = NIVELES[0].mapa;
const BALDOSA = 45;
let FILAS = MAPA.length;
let COLUMNAS = MAPA[0].length;
let ANCHO_MUNDO = COLUMNAS * BALDOSA;      // cambia según el nivel
const SUELO = 8 * BALDOSA;                 // altura del piso principal (fila 8)

// Leer qué hay en una casilla (fuera del mapa se considera aire)
function casilla(col, fila) {
  if (fila < 0 || fila >= FILAS || col < 0 || col >= COLUMNAS) return '.';
  return MAPA[fila][col];
}
// ¿Esa casilla es sólida (no se puede atravesar)?
function esSolida(col, fila) {
  const c = casilla(col, fila);
  return c === '#' || c === '=';
}

// OBJETOS PARA RECOGER (NUEVO EN LA FASE 4)
// Tabla con los puntos y el nombre de cada tipo de objeto
const TIPOS = {
  o: { nombre: 'Moneda',   puntos: 10 },
  f: { nombre: 'Fruta',    puntos: 20 },
  l: { nombre: 'Libro',    puntos: 30 },
  p: { nombre: 'Lapicero', puntos: 15 },
  b: { nombre: 'Billete',  puntos: 50 },
  c: { nombre: 'Celular',  puntos: 100 },
};

// Al cargar un nivel, buscamos las letras de objetos en el mapa y creamos una lista
let objetos = [];
let TOTAL_LIBROS = 0;
function crearObjetos() {
objetos = [];
for (let f = 0; f < MAPA.length; f++) {
  for (let c = 0; c < MAPA[f].length; c++) {
    const letra = MAPA[f][c];
    if (TIPOS[letra]) {
      objetos.push({
        tipo: letra,
        x: c * BALDOSA + BALDOSA / 2,   // centro del objeto
        y: f * BALDOSA + BALDOSA / 2,
        recogido: false,
        fase: Math.random() * 6         // para que no todos floten al mismo ritmo
      });
    }
  }
}
TOTAL_LIBROS = objetos.filter(o => o.tipo === 'l').length;
}

let puntos = 0;
let libros = 0;          // libros del nivel actual
let librosJuego = 0;     // libros de toda la partida

// META (NUEVO EN LA FASE 6): la bandera al final de cada nivel
let meta = { x: 0, y: 0 };
function buscarMeta() {
  for (let f = 0; f < MAPA.length; f++) {
    const c = MAPA[f].indexOf('M');
    if (c >= 0) meta = { x: c * BALDOSA + BALDOSA / 2, y: (f + 1) * BALDOSA };
  }
}

// RÉCORD (NUEVO EN LA FASE 6): se guarda en el navegador con localStorage
let record = 0;
try { record = parseInt(localStorage.getItem('mariana-record') || '0', 10) || 0; } catch (e) {}
function guardarRecord() {
  if (puntos > record) {
    record = puntos;
    try { localStorage.setItem('mariana-record', String(record)); } catch (e) {}
    return true;
  }
  return false;
}
document.getElementById('recordInicio').textContent = record > 0 ? 'Récord: ' + record + ' puntos' : '';

// SONIDOS (NUEVO EN LA FASE 6): se crean con la Web Audio API, sin archivos
let audio = null;
let volumenGeneral = null;   // controla el volumen de todo
let volumenMusica = null;    // controla solo la música
let sonidoActivo = true;
let musicaActiva = true;

// Crear (o despertar) el sistema de sonido. Los navegadores solo lo permiten
// después de que el jugador toca la pantalla o presiona una tecla.
function activarAudio() {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      volumenGeneral = audio.createGain();
      volumenGeneral.gain.value = 0.9;
      volumenGeneral.connect(audio.destination);
      volumenMusica = audio.createGain();
      volumenMusica.gain.value = 0.55;
      volumenMusica.connect(volumenGeneral);
    }
    if (audio.state === 'suspended') audio.resume();
  } catch (e) { audio = null; }
}
window.addEventListener('pointerdown', activarAudio);
window.addEventListener('keydown', activarAudio);
window.addEventListener('touchstart', activarAudio);

// Tocar una nota: frecuencia (Hz), cuándo empieza, cuánto dura, tipo de onda y volumen
function nota(frecuencia, inicio, duracion, tipo, volumen, salida, enTiempo) {
  if (!audio) return;
  const t0 = (enTiempo !== undefined ? enTiempo : audio.currentTime) + inicio;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = tipo || 'square';
  osc.frequency.setValueAtTime(frecuencia, t0);
  vol.gain.setValueAtTime(0.0001, t0);
  vol.gain.linearRampToValueAtTime(volumen || 0.18, t0 + 0.01);      // ataque suave, sin "clic"
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
  osc.connect(vol);
  vol.connect(salida || volumenGeneral);
  osc.start(t0);
  osc.stop(t0 + duracion + 0.05);
}

// EFECTOS DE SONIDO
function sonido(cual) {
  if (!audio || !sonidoActivo) return;
  if (cual === 'salto')    { nota(330, 0, 0.15, 'square', 0.16); nota(560, 0.05, 0.12, 'square', 0.14); }
  if (cual === 'moneda')   { nota(988, 0, 0.09, 'square', 0.16); nota(1319, 0.07, 0.2, 'square', 0.16); }
  if (cual === 'libro')    { nota(523, 0, 0.12, 'triangle', 0.3); nota(659, 0.08, 0.12, 'triangle', 0.3); nota(784, 0.16, 0.25, 'triangle', 0.3); }
  if (cual === 'celular')  { [880, 1109, 1319, 1760].forEach((f, i) => nota(f, i * 0.07, 0.15, 'square', 0.16)); }
  if (cual === 'superar')  { nota(220, 0, 0.1, 'square', 0.2); nota(660, 0.06, 0.15, 'square', 0.18); }
  if (cual === 'dano')     { nota(300, 0, 0.18, 'sawtooth', 0.2); nota(150, 0.12, 0.3, 'sawtooth', 0.2); }
  if (cual === 'agua')     { [700, 550, 420, 300].forEach((f, i) => nota(f, i * 0.05, 0.12, 'sine', 0.3)); }
  if (cual === 'meta')     { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => nota(f, i * 0.12, 0.25, 'triangle', 0.3)); }
  if (cual === 'ganar')    { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.14, 0.3, 'square', 0.14)); }
  if (cual === 'fin')      { [392, 330, 262, 196].forEach((f, i) => nota(f, i * 0.22, 0.35, 'triangle', 0.3)); }
}

// MÚSICA DE FONDO (melodías originales para MarIAna)
// Cada nota es [nombre, duración en corcheas]. '-' es un silencio.
const FREC = { C3:131, D3:147, E3:165, F3:175, G3:196, A3:220, B3:247,
  G2:98, A2:110, B2:123,
  C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, B4:494,
  C5:523, D5:587, E5:659, F5:698, G5:784, A5:880, B5:988, C6:1047 };
const CANCIONES = [
  { // Nivel 1: alegre, como un día de colegio
    tempo: 138,
    melodia: [['C5',1],['E5',1],['G5',1],['E5',1],['F5',1],['A5',1],['G5',2],
              ['E5',1],['G5',1],['C6',1],['B5',1],['A5',1],['G5',1],['E5',2],
              ['D5',1],['F5',1],['A5',1],['F5',1],['G5',1],['E5',1],['C5',2],
              ['D5',1],['E5',1],['F5',1],['D5',1],['C5',2],['-',2]],
    bajo: ['C3','G3','F3','G3','C3','G3','A3','E3','D3','A3','C3','G3','G2','B2','C3','G2']
  },
  { // Nivel 2: más movida, para el campo
    tempo: 152,
    melodia: [['G4',1],['B4',1],['D5',1],['G5',1],['E5',1],['D5',1],['B4',2],
              ['C5',1],['E5',1],['G5',1],['E5',1],['D5',2],['-',2],
              ['G4',1],['A4',1],['B4',1],['D5',1],['E5',1],['G5',1],['A5',2],
              ['G5',1],['E5',1],['D5',1],['B4',1],['G4',2],['-',2]],
    bajo: ['G2','D3','G2','D3','C3','G3','G2','D3','E3','B3','C3','G3','D3','A3','G2','D3']
  }
];
let musicaSonando = false;
let temporizadorMusica = null;
let posMelodia = 0, posBajo = 0, tiempoMelodia = 0, tiempoBajo = 0;

function iniciarMusica() {
  if (!audio || musicaSonando) return;
  musicaSonando = true;
  posMelodia = 0; posBajo = 0;
  tiempoMelodia = tiempoBajo = audio.currentTime + 0.1;
  // Cada 50 ms programamos las notas que tocan en el próximo cuarto de segundo
  temporizadorMusica = setInterval(programarMusica, 50);
}
function detenerMusica() {
  musicaSonando = false;
  clearInterval(temporizadorMusica);
}
function programarMusica() {
  if (!audio) return;
  const cancion = CANCIONES[nivelActual % CANCIONES.length];
  const corchea = 60 / cancion.tempo / 2;
  const limite = audio.currentTime + 0.25;
  const suena = musicaActiva && sonidoActivo;
  while (tiempoMelodia < limite) {
    const [n, dur] = cancion.melodia[posMelodia % cancion.melodia.length];
    if (n !== '-' && suena) nota(FREC[n], 0, corchea * dur * 0.9, 'square', 0.07, volumenMusica, tiempoMelodia);
    tiempoMelodia += corchea * dur;
    posMelodia++;
  }
  while (tiempoBajo < limite) {
    const n = cancion.bajo[posBajo % cancion.bajo.length];
    if (suena) nota(FREC[n], 0, corchea * 1.8, 'triangle', 0.22, volumenMusica, tiempoBajo);
    tiempoBajo += corchea * 2;
    posBajo++;
  }
}
let recogidos = 0;
const textosFlotantes = [];   // los "+10" que suben y desaparecen

// OBSTÁCULOS (NUEVO EN LA FASE 5)
// Se crean a partir de las letras N, T, R y P del mapa
const TAM_OBSTACULO = {
  N: { ancho: 34, alto: 34 },
  T: { ancho: 34, alto: 36 },
  R: { ancho: 32, alto: 32 },
  P: { ancho: 86, alto: 38 },
};
let obstaculos = [];
function crearObstaculos() {
  obstaculos = [];
  for (let f = 0; f < MAPA.length; f++) {
    for (let c = 0; c < MAPA[f].length; c++) {
      const letra = MAPA[f][c];
      if (!TAM_OBSTACULO[letra]) continue;
      const cx = c * BALDOSA + BALDOSA / 2;
      obstaculos.push({
        tipo: letra,
        x: cx, y: (f + 1) * BALDOSA,          // (x, y) = centro de la base, igual que Mariana
        inicioX: cx, inicioY: (f + 1) * BALDOSA,
        ancho: TAM_OBSTACULO[letra].ancho, alto: TAM_OBSTACULO[letra].alto,
        vel: letra === 'T' ? -1 : 0,          // velocidad horizontal
        vy: 0, enSuelo: false,
        t: Math.random() * 6,                 // reloj propio para animar
        espera: 60 + Math.floor(Math.random() * 60),
        vivo: true
      });
    }
  }
}
crearObstaculos();

let vidas = 3;

// 3) Datos de Mariana
const INICIO = { x: 90, y: SUELO };
const mariana = {
  x: INICIO.x, y: INICIO.y,
  ancho: 24,         // tamaño de su "caja de choque"
  alto: 88,
  vel: 0, velMax: 3.4, acel: 0.35, friccion: 0.8,
  mira: 1, paso: 0,
  vy: 0, gravedad: 0.55, fuerzaSalto: -13, caidaMax: 14,   // salto un poco más alto que en la fase 2
  enSuelo: true,
  parpadeo: 0        // cuadros que parpadea después de caer al río o a un hueco
};

// 4) CÁMARA (NUEVO EN LA FASE 3): qué parte del mundo se ve en la pantalla
let camaraX = 0;

// 5) Teclado y botones
const teclas = { izq: false, der: false, salto: false };
let jugando = false;
let mensaje = '', tiempoMensaje = 0;

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izq = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.der = true;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (!teclas.salto) saltar();
    teclas.salto = true;
  }
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izq = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.der = false;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') teclas.salto = false;
});

function saltar() {
  if (!jugando || !mariana.enSuelo) return;
  mariana.vy = mariana.fuerzaSalto;
  mariana.enSuelo = false;
  sonido('salto');
}

function botonTactil(id, nombre, alPresionar) {
  const b = document.getElementById(id);
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (alPresionar) alPresionar();
    teclas[nombre] = true;
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    b.addEventListener(ev, () => { teclas[nombre] = false; }));
}
botonTactil('tIzq', 'izq');
botonTactil('tDer', 'der');
botonTactil('tSalto', 'salto', saltar);

document.getElementById('btnOtraVez').addEventListener('click', () => {
  reiniciarJuego();
  document.getElementById('fin').hidden = true;
  jugando = true;
  activarAudio();
  iniciarMusica();
  document.getElementById('btnOtraVez').blur();
});

// PAUSA (NUEVO EN LA FASE 6)
let pausado = false;
function cambiarPausa() {
  const enJuego = document.getElementById('inicio').hidden && document.getElementById('fin').hidden;
  if (!enJuego) return;
  pausado = !pausado;
  jugando = !pausado;
  teclas.izq = teclas.der = teclas.salto = false;
  document.getElementById('pausa').hidden = !pausado;
  if (pausado) detenerMusica(); else iniciarMusica();
}
function cambiarSonido() {
  sonidoActivo = !sonidoActivo;
  document.getElementById('btnSonido').textContent = 'Sonido: ' + (sonidoActivo ? 'sí' : 'no') + ' (M)';
}
function cambiarMusica() {
  musicaActiva = !musicaActiva;
  document.getElementById('btnMusica').textContent = 'Música: ' + (musicaActiva ? 'sí' : 'no') + ' (N)';
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') cambiarPausa();
  if (e.key === 'm' || e.key === 'M') cambiarSonido();
  if (e.key === 'n' || e.key === 'N') cambiarMusica();
});
document.getElementById('btnPausa').addEventListener('click', (e) => { cambiarPausa(); e.currentTarget.blur(); });
document.getElementById('tPausa').addEventListener('click', cambiarPausa);
document.getElementById('btnSeguir').addEventListener('click', (e) => { cambiarPausa(); e.currentTarget.blur(); });
document.getElementById('btnSonido').addEventListener('click', (e) => { cambiarSonido(); e.currentTarget.blur(); });
document.getElementById('btnMusica').addEventListener('click', (e) => { cambiarMusica(); e.currentTarget.blur(); });
// Si el jugador cambia de pestaña, el juego se pausa solo
document.addEventListener('visibilitychange', () => { if (document.hidden && jugando) cambiarPausa(); });

document.getElementById('btnJugar').addEventListener('click', () => {
  // El navegador solo permite sonidos después de que el jugador toca algo
  activarAudio();
  cargarNivel(0);
  iniciarMusica();
  sonido('meta');
  document.getElementById('inicio').hidden = true;
  jugando = true;
  document.getElementById('btnJugar').blur();
});

// 6) CHOQUES CON LAS BALDOSAS (NUEVO EN LA FASE 3)
//    Mariana es una caja. Buscamos las baldosas sólidas que toca y la sacamos de ellas.
//    Se hace en dos pasos: primero el movimiento horizontal y luego el vertical.
function cajaDe(m) {
  return { izq: m.x - m.ancho / 2, der: m.x + m.ancho / 2, arriba: m.y - m.alto, abajo: m.y };
}

function moverHorizontal(m) {
  m.x += m.vel;
  const c = cajaDe(m);
  const filaIni = Math.floor(c.arriba / BALDOSA);
  const filaFin = Math.floor((c.abajo - 1) / BALDOSA);
  if (m.vel > 0) {                                  // va a la derecha: revisar su lado derecho
    const col = Math.floor(c.der / BALDOSA);
    for (let f = filaIni; f <= filaFin; f++) {
      if (esSolida(col, f)) { m.x = col * BALDOSA - m.ancho / 2 - 0.01; m.vel = 0; break; }
    }
  } else if (m.vel < 0) {                           // va a la izquierda: revisar su lado izquierdo
    const col = Math.floor(c.izq / BALDOSA);
    for (let f = filaIni; f <= filaFin; f++) {
      if (esSolida(col, f)) { m.x = (col + 1) * BALDOSA + m.ancho / 2 + 0.01; m.vel = 0; break; }
    }
  }
  // Bordes del mundo
  if (m.x < m.ancho / 2) { m.x = m.ancho / 2; m.vel = 0; }
  if (m.x > ANCHO_MUNDO - m.ancho / 2) { m.x = ANCHO_MUNDO - m.ancho / 2; m.vel = 0; }
}

function moverVertical(m) {
  m.y += m.vy;
  m.enSuelo = false;
  const c = cajaDe(m);
  const colIni = Math.floor(c.izq / BALDOSA);
  const colFin = Math.floor((c.der - 0.01) / BALDOSA);
  if (m.vy > 0) {                                   // cayendo: revisar debajo de los pies
    const fila = Math.floor(c.abajo / BALDOSA);
    for (let col = colIni; col <= colFin; col++) {
      if (esSolida(col, fila)) { m.y = fila * BALDOSA; m.vy = 0; m.enSuelo = true; break; }
    }
  } else if (m.vy < 0) {                            // subiendo: revisar encima de la cabeza
    const fila = Math.floor(c.arriba / BALDOSA);
    for (let col = colIni; col <= colFin; col++) {
      if (esSolida(col, fila)) { m.y = (fila + 1) * BALDOSA + m.alto; m.vy = 0; break; }
    }
  }
}

// ¿Mariana está tocando el agua?
function tocaAgua(m) {
  const c = cajaDe(m);
  const fila = Math.floor((c.abajo - 5) / BALDOSA);
  for (let col = Math.floor(c.izq / BALDOSA); col <= Math.floor(c.der / BALDOSA); col++) {
    if (casilla(col, fila) === '~') return true;
  }
  return false;
}

// Volver al inicio del nivel (caer al río o a un hueco también quita una vida)
function reiniciarPosicion(texto) {
  mariana.x = INICIO.x; mariana.y = INICIO.y;
  mariana.vel = 0; mariana.vy = 0; mariana.enSuelo = true;
  mensaje = texto; tiempoMensaje = 110;
  perderVida();
}

// PERDER UNA VIDA (NUEVO EN LA FASE 5)
function perderVida() {
  vidas--;
  mariana.parpadeo = 120;                           // 2 segundos sin recibir más daño
  if (vidas <= 0) {
    detenerMusica();
    sonido('fin');
    mostrarFinal('Fin del juego');
  } else {
    sonido('dano');
  }
}

// PANTALLA FINAL: sirve para "Fin del juego" y para "¡Ganaste!"
function mostrarFinal(titulo) {
  jugando = false;
  const nuevoRecord = guardarRecord();
  document.getElementById('finTitulo').textContent = titulo;
  document.getElementById('finTexto').innerHTML =
    'Mariana hizo <b>' + puntos + '</b> puntos y recogió ' + librosJuego + ' libros.<br>' +
    (nuevoRecord ? '<b style="color:#F5C518">¡Nuevo récord!</b>' : 'Récord: ' + record + ' puntos');
  document.getElementById('fin').hidden = false;
  document.getElementById('btnOtraVez').focus();
}

// CARGAR UN NIVEL (NUEVO EN LA FASE 6)
function cargarNivel(n) {
  nivelActual = n;
  MAPA = NIVELES[n].mapa;
  FILAS = MAPA.length;
  COLUMNAS = MAPA[0].length;
  ANCHO_MUNDO = COLUMNAS * BALDOSA;
  crearObjetos();
  crearObstaculos();
  buscarMeta();
  libros = 0; recogidos = 0;
  mariana.x = INICIO.x; mariana.y = INICIO.y;
  mariana.vel = 0; mariana.vy = 0; mariana.enSuelo = true; mariana.parpadeo = 60;
  camaraX = 0;
  mensaje = NIVELES[n].nombre; tiempoMensaje = 150;
}

// LLEGAR A LA META (NUEVO EN LA FASE 6)
function revisarMeta(m) {
  const c = cajaDe(m);
  if (c.der > meta.x - 6 && c.izq < meta.x + 60 && c.abajo > meta.y - 130) {
    const bono = 200 + vidas * 100;
    puntos += bono;
    sonido('meta');
    if (nivelActual + 1 < NIVELES.length) {
      cargarNivel(nivelActual + 1);
      mensaje = '¡Nivel superado! +' + bono + ' · ' + NIVELES[nivelActual].nombre;
      tiempoMensaje = 200;
    } else {
      detenerMusica();
      sonido('ganar');
      mostrarFinal('¡Ganaste!');
    }
  }
}

// EMPEZAR DE NUEVO: todo vuelve a como estaba al principio
function reiniciarJuego() {
  vidas = 3; puntos = 0; librosJuego = 0;
  teclas.izq = teclas.der = teclas.salto = false;
  cargarNivel(0);
}

// MOVER LOS OBSTÁCULOS (NUEVO EN LA FASE 5)
function moverObstaculos() {
  for (const e of obstaculos) {
    if (!e.vivo) continue;
    e.t += 1 / 60;

    if (e.tipo === 'N') {
      // Hoja con mala nota: vuela arriba y abajo siguiendo una onda
      e.y = e.inicioY + Math.sin(e.t * 2) * 40;

    } else if (e.tipo === 'T') {
      // Pila de tareas: camina y da la vuelta al chocar con un muro o al llegar a un borde
      e.vy += 0.55;
      const antes = e.vel;
      moverHorizontal(e);
      moverVertical(e);
      if (e.vel === 0) e.vel = -antes;                          // chocó con un muro
      const colAdelante = Math.floor((e.x + Math.sign(e.vel) * (e.ancho / 2 + 2)) / BALDOSA);
      const filaPiso = Math.floor(e.y / BALDOSA);
      if (e.enSuelo && !esSolida(colAdelante, filaPiso)) e.vel = -e.vel;   // borde: no se cae

    } else if (e.tipo === 'R') {
      // Despertador: espera un rato y da un salto
      e.vy += 0.55;
      if (e.enSuelo) {
        e.vel = 0;
        e.espera--;
        if (e.espera <= 0) {
          e.vy = -9;
          e.vel = (e.x > e.inicioX ? -1 : 1) * 1.2;           // se queda cerca de su lugar
          e.espera = 70;
        }
      }
      moverHorizontal(e);
      moverVertical(e);

    } else if (e.tipo === 'P') {
      // Globo «¡A estudiar!»: si Mariana está cerca, la persigue despacio
      const dx = mariana.x - e.x;
      if (Math.abs(dx) < 320) {
        e.x += Math.sign(dx) * 1.3;
        const objetivoY = mariana.y - 30;
        e.y += Math.max(-1, Math.min(1, (objetivoY - e.y) * 0.03));
      }
      e.y += Math.sin(e.t * 3) * 0.4;                         // flota
    }
  }
}

// ¿MARIANA CHOCÓ CON UN OBSTÁCULO? (NUEVO EN LA FASE 5)
function revisarObstaculos(m, piesAntes) {
  const c = cajaDe(m);
  for (const e of obstaculos) {
    if (!e.vivo) continue;
    const o = cajaDe(e);
    const seCruzan = c.der > o.izq + 4 && c.izq < o.der - 4 && c.abajo > o.arriba && c.arriba < o.abajo;
    if (!seCruzan) continue;

    // Si venía cayendo y sus pies estaban encima del obstáculo: ¡lo aplasta!
    if (m.vy > 0 && piesAntes <= o.arriba + 12) {
      e.vivo = false;
      puntos += 50;
      textosFlotantes.push({ texto: '¡Superado! +50', x: e.x, y: o.arriba - 10, vida: 60 });
      sonido('superar');
      m.vy = -8;                                     // rebote
      m.enSuelo = false;
    } else if (m.parpadeo === 0) {
      // Si lo toca de lado: pierde una vida y sale empujada hacia atrás
      m.vel = (m.x < e.x ? -1 : 1) * 6;
      m.vy = -5;
      mensaje = '¡Auch! Mariana perdió una vida'; tiempoMensaje = 90;
      perderVida();
    }
  }
}


// RECOGER OBJETOS (NUEVO EN LA FASE 4)
// Si la caja de Mariana se cruza con la caja de un objeto, lo recoge.
function revisarObjetos(m) {
  const c = cajaDe(m);
  const r = 16;                                    // "radio" de la caja del objeto
  for (const ob of objetos) {
    if (ob.recogido) continue;
    const seCruzan = c.der > ob.x - r && c.izq < ob.x + r &&
                     c.abajo > ob.y - r && c.arriba < ob.y + r;
    if (seCruzan) {
      ob.recogido = true;
      const valor = TIPOS[ob.tipo].puntos;
      puntos += valor;
      recogidos++;
      if (ob.tipo === 'l') { libros++; librosJuego++; }
      sonido(ob.tipo === 'l' ? 'libro' : ob.tipo === 'c' ? 'celular' : 'moneda');
      textosFlotantes.push({ texto: '+' + valor, x: ob.x, y: ob.y - 10, vida: 50 });
      if (ob.tipo === 'c') { mensaje = '¡Encontraste el celular! +100'; tiempoMensaje = 120; }
    }
  }
}

// 7) ACTUALIZAR
function actualizar() {
  if (!jugando) return;
  const m = mariana;

  if (teclas.izq) { m.vel -= m.acel; m.mira = -1; }
  if (teclas.der) { m.vel += m.acel; m.mira = 1; }
  if (!teclas.izq && !teclas.der) m.vel *= m.friccion;
  m.vel = Math.max(-m.velMax, Math.min(m.velMax, m.vel));
  if (Math.abs(m.vel) < 0.05) m.vel = 0;

  // Gravedad
  m.vy += m.gravedad;
  if (!teclas.salto && m.vy < -4) m.vy = -4;
  if (m.vy > m.caidaMax) m.vy = m.caidaMax;

  const piesAntes = m.y;
  moverHorizontal(m);
  moverVertical(m);

  // Obstáculos (NUEVO EN LA FASE 5)
  moverObstaculos();
  revisarObstaculos(m, piesAntes);
  if (!jugando) return;

  // ¿Llegó a la bandera? (NUEVO EN LA FASE 6)
  revisarMeta(m);
  if (!jugando) return;

  // ¿Cayó al río o por un hueco?
  if (tocaAgua(m)) { sonido('agua'); reiniciarPosicion('¡Splash! Mariana cayó al río'); }
  else if (m.y > ALTO + 100) reiniciarPosicion('¡Uy! Mariana cayó por un hueco');

  // ¿Tocó algún objeto?
  revisarObjetos(m);
  for (const tf of textosFlotantes) { tf.y -= 0.8; tf.vida--; }
  while (textosFlotantes.length && textosFlotantes[0].vida <= 0) textosFlotantes.shift();

  if (m.parpadeo > 0) m.parpadeo--;
  if (tiempoMensaje > 0) tiempoMensaje--;

  if (m.vel !== 0 && m.enSuelo) m.paso += Math.abs(m.vel) * 0.12;
  else if (m.enSuelo) m.paso = 0;

  // La cámara sigue a Mariana suavemente, sin salirse del mundo
  const objetivo = Math.max(0, Math.min(ANCHO_MUNDO - ANCHO, m.x - ANCHO * 0.4));
  camaraX += (objetivo - camaraX) * 0.12;
}

// 8) DIBUJAR EL FONDO (se mueve más lento que el nivel para dar profundidad)
let nubesX = 0;
function dibujarCielo() {
  const g = ctx.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, '#6EC1F0');
  g.addColorStop(1, '#D6F0FB');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  nubesX += 0.15;
  ctx.fillStyle = '#FFFFFF';
  [[80, 60, 1], [380, 40, 0.8], [640, 80, 1.1], [930, 55, 0.9]].forEach(([x, y, t]) => {
    const nx = ((x + nubesX - camaraX * 0.1) % 1000 + 1000) % 1000 - 100;
    nube(nx, y, t);
  });
}
function nube(x, y, t) {
  [[0, 0, 18], [22, -8, 22], [46, 0, 18]].forEach(([dx, dy, r]) => {
    ctx.beginPath(); ctx.arc(x + dx * t, y + dy * t, r * t, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillRect(x, y, 46 * t, 18 * t);
}

function dibujarMontanas() {
  // Montañas lejanas: se mueven al 20 % de la velocidad de la cámara
  const d1 = -(camaraX * 0.2) % 800;
  ctx.fillStyle = '#6FAF8E';
  for (let k = 0; k < 2; k++) {
    const o = d1 + k * 800;
    ctx.beginPath();
    ctx.moveTo(o, 250);
    ctx.quadraticCurveTo(o + 120, 140, o + 240, 220);
    ctx.quadraticCurveTo(o + 360, 120, o + 500, 210);
    ctx.quadraticCurveTo(o + 640, 130, o + 800, 250);
    ctx.lineTo(o + 800, ALTO); ctx.lineTo(o, ALTO);
    ctx.fill();
  }
  // Montañas cercanas: al 40 %
  const d2 = -(camaraX * 0.4) % 800;
  ctx.fillStyle = '#3F9A5E';
  for (let k = 0; k < 2; k++) {
    const o = d2 + k * 800;
    ctx.beginPath();
    ctx.moveTo(o, 290);
    ctx.quadraticCurveTo(o + 180, 215, o + 330, 280);
    ctx.quadraticCurveTo(o + 540, 205, o + 800, 290);
    ctx.lineTo(o + 800, ALTO); ctx.lineTo(o, ALTO);
    ctx.fill();
  }
}

// 9) DECORADOS DEL MUNDO (se dibujan en coordenadas del mundo)
function dibujarColegio(x) {
  const y = SUELO - 150, w = 400, h = 150;
  ctx.fillStyle = '#F1E8D4';
  ctx.fillRect(x + 20, y - 70, 44, 80);
  ctx.fillStyle = '#B5552F';
  ctx.beginPath(); ctx.moveTo(x + 14, y - 70); ctx.lineTo(x + 42, y - 105); ctx.lineTo(x + 70, y - 70); ctx.fill();
  ctx.fillStyle = '#5B4A3A';
  ctx.fillRect(x + 40, y - 128, 4, 24);
  ctx.fillRect(x + 34, y - 120, 16, 4);
  ctx.fillStyle = '#2D6E93';
  ctx.fillRect(x + 34, y - 50, 16, 20);

  ctx.fillStyle = '#F1E8D4';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2D6E93';
  ctx.fillRect(x, y + h - 45, w, 45);
  ctx.fillStyle = '#B5552F';
  ctx.fillRect(x - 12, y - 14, w + 24, 18);
  ctx.fillStyle = '#9A4526';
  ctx.fillRect(x - 12, y + 2, w + 24, 4);
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue;
    const vx = x + 100 + i * 58;
    ctx.fillStyle = '#1E4F6B';
    ctx.fillRect(vx, y + 30, 36, 50);
    ctx.fillStyle = '#F1E8D4';
    ctx.fillRect(vx + 17, y + 30, 2, 50);
    ctx.fillRect(vx, y + 54, 36, 2);
  }
  ctx.fillStyle = '#6B3F22';
  ctx.fillRect(x + 212, y + 50, 42, h - 50);
  ctx.fillStyle = '#F5C518';
  ctx.fillRect(x + 246, y + 100, 4, 4);
  ctx.fillStyle = '#15317E';
  ctx.fillRect(x + 150, y - 40, 170, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('I.E. MARÍA AUXILIADORA', x + 235, y - 23);
}

function dibujarArbol(x) {
  ctx.fillStyle = '#6B4A2B';
  ctx.fillRect(x - 7, SUELO - 90, 14, 90);
  ctx.fillStyle = '#2E7D46';
  [[0, -110, 42], [-34, -90, 28], [34, -92, 30]].forEach(([dx, dy, r]) => {
    ctx.beginPath(); ctx.arc(x + dx, SUELO + dy, r, 0, Math.PI * 2); ctx.fill();
  });
}

function dibujarFlores(desde, hasta) {
  const colores = ['#D7282F', '#F5C518', '#FFFFFF', '#E86AA0'];
  for (let fx = desde, i = 0; fx < hasta; fx += 31, i++) {
    ctx.fillStyle = '#2E9E5B';
    ctx.fillRect(fx, SUELO - 12, 2, 12);
    ctx.fillStyle = colores[i % colores.length];
    ctx.beginPath(); ctx.arc(fx + 1, SUELO - 14, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function dibujarHuerta(x) {
  // Surcos con matas de la huerta escolar
  for (let i = 0; i < 6; i++) {
    const hx = x + i * 26;
    ctx.fillStyle = '#6B4A2B';
    ctx.fillRect(hx, SUELO - 6, 20, 6);
    ctx.fillStyle = '#3F9A3F';
    ctx.beginPath(); ctx.moveTo(hx + 10, SUELO - 24); ctx.lineTo(hx + 2, SUELO - 6); ctx.lineTo(hx + 18, SUELO - 6); ctx.fill();
    ctx.fillStyle = i % 2 ? '#D7282F' : '#F08A1C';
    ctx.beginPath(); ctx.arc(hx + 10, SUELO - 14, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Letrero
  ctx.fillStyle = '#6B4A2B';
  ctx.fillRect(x - 20, SUELO - 50, 4, 50);
  ctx.fillStyle = '#F5C518';
  ctx.fillRect(x - 50, SUELO - 62, 64, 20);
  ctx.fillStyle = '#0F2461';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HUERTA', x - 18, SUELO - 48);
}

function dibujarGranja(x) {
  const y = SUELO - 120;
  // Establo rojo
  ctx.fillStyle = '#B83A32';
  ctx.fillRect(x, y, 150, 120);
  ctx.fillStyle = '#8E2B25';
  ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 75, y - 55); ctx.lineTo(x + 162, y); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 50, y + 50, 50, 70);
  ctx.strokeStyle = '#B83A32'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + 50, y + 50); ctx.lineTo(x + 100, y + 120);
  ctx.moveTo(x + 100, y + 50); ctx.lineTo(x + 50, y + 120); ctx.stroke();
  // Cerca
  ctx.fillStyle = '#EDE3CF';
  for (let i = 0; i < 8; i++) ctx.fillRect(x + 170 + i * 22, SUELO - 34, 6, 34);
  ctx.fillRect(x + 166, SUELO - 28, 170, 5);
  ctx.fillRect(x + 166, SUELO - 14, 170, 5);
  // Una vaca sencilla
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 360, SUELO - 34, 44, 22);
  ctx.fillRect(x + 400, SUELO - 42, 16, 14);
  ctx.fillStyle = '#2B2B2B';
  ctx.fillRect(x + 368, SUELO - 30, 10, 8);
  ctx.fillRect(x + 388, SUELO - 24, 8, 8);
  ctx.fillRect(x + 364, SUELO - 12, 5, 12);
  ctx.fillRect(x + 394, SUELO - 12, 5, 12);
}

// 10) DIBUJAR LAS BALDOSAS DEL MAPA (solo las que se ven en pantalla)
let olas = 0;
function dibujarMapa() {
  olas += 0.05;
  const colIni = Math.max(0, Math.floor(camaraX / BALDOSA));
  const colFin = Math.min(COLUMNAS - 1, Math.floor((camaraX + ANCHO) / BALDOSA));
  for (let f = 0; f < FILAS; f++) {
    for (let c = colIni; c <= colFin; c++) {
      const x = c * BALDOSA, y = f * BALDOSA, t = MAPA[f][c];
      if (t === '#') {
        ctx.fillStyle = '#8B5A2B';                            // tierra
        ctx.fillRect(x, y, BALDOSA, BALDOSA);
        ctx.fillStyle = '#7A4E24';
        ctx.fillRect(x + 8, y + 22, 6, 5);
        ctx.fillRect(x + 28, y + 34, 7, 5);
        if (!esSolida(c, f - 1)) {                            // césped encima
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(x, y, BALDOSA, 10);
          ctx.fillStyle = '#3E9444';
          ctx.fillRect(x, y + 10, BALDOSA, 3);
        }
      } else if (t === '=') {
        ctx.fillStyle = '#F5C518';                            // plataforma amarilla
        ctx.fillRect(x, y, BALDOSA, BALDOSA);
        ctx.fillStyle = '#1B3A8C';                            // borde azul
        ctx.fillRect(x, y, BALDOSA, 5);
        ctx.fillRect(x, y + BALDOSA - 4, BALDOSA, 4);
        ctx.fillStyle = '#D9A90E';
        ctx.fillRect(x + BALDOSA - 3, y + 5, 3, BALDOSA - 9);
        ctx.fillRect(x + 10, y + 16, 25, 3);
        ctx.fillRect(x + 10, y + 26, 25, 3);
      } else if (t === '~') {
        ctx.fillStyle = '#3FA9E0';                            // agua del río
        ctx.fillRect(x, y + 8, BALDOSA, BALDOSA - 8);
        ctx.strokeStyle = '#D6F0FB';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= BALDOSA; k += 5) {
          const oy = y + 10 + Math.sin(olas + (x + k) * 0.08) * 2;
          if (k === 0) ctx.moveTo(x + k, oy); else ctx.lineTo(x + k, oy);
        }
        ctx.stroke();
      }
    }
  }
}

// DIBUJOS DE LOS OBJETOS (NUEVO EN LA FASE 4)
// Cada función dibuja el objeto centrado en (x, y)
function dibujarMoneda(x, y, giro) {
  const ancho = Math.abs(Math.cos(giro)) * 11 + 2;   // parece que gira
  ctx.fillStyle = '#C99A06';
  ctx.beginPath(); ctx.ellipse(x, y, ancho + 1.5, 12.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F5C518';
  ctx.beginPath(); ctx.ellipse(x, y, ancho, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF3B0';
  ctx.fillRect(x - ancho * 0.3, y - 6, Math.max(1, ancho * 0.25), 12);
}
function dibujarFruta(x, y, cual) {
  ctx.fillStyle = cual ? '#D7282F' : '#F08A1C';        // manzana roja o naranja
  ctx.beginPath(); ctx.arc(x, y + 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6B4A2B';
  ctx.fillRect(x - 1, y - 13, 2, 6);
  ctx.fillStyle = '#2E9E5B';
  ctx.beginPath(); ctx.ellipse(x + 5, y - 10, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
}
function dibujarLibro(x, y) {
  ctx.fillStyle = '#1B3A8C';                          // tapa azul
  ctx.fillRect(x - 13, y - 10, 26, 20);
  ctx.fillStyle = '#FFFFFF';                          // hojas
  ctx.fillRect(x - 11, y - 8, 10, 16);
  ctx.fillRect(x + 1, y - 8, 10, 16);
  ctx.fillStyle = '#9AA7C7';
  for (let k = 0; k < 3; k++) { ctx.fillRect(x - 9, y - 4 + k * 4, 6, 1); ctx.fillRect(x + 3, y - 4 + k * 4, 6, 1); }
  ctx.fillStyle = '#F5C518';                          // separador amarillo
  ctx.fillRect(x + 5, y - 10, 3, 14);
}
function dibujarLapicero(x, y) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-0.7);
  ctx.fillStyle = '#1B3A8C'; ctx.fillRect(-14, -3, 22, 6);   // cuerpo
  ctx.fillStyle = '#D7282F'; ctx.fillRect(-16, -3, 4, 6);    // tapa
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-8, -3, 1, 6);     // gancho
  ctx.fillStyle = '#EDE3CF';
  ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(15, 0); ctx.lineTo(8, 3); ctx.fill();
  ctx.fillStyle = '#26262E'; ctx.fillRect(14, -1, 3, 2);     // punta
  ctx.restore();
}
function dibujarBillete(x, y) {
  ctx.fillStyle = '#2E9E5B';
  ctx.fillRect(x - 16, y - 9, 32, 18);
  ctx.strokeStyle = '#1E6B3C'; ctx.lineWidth = 2;
  ctx.strokeRect(x - 14, y - 7, 28, 14);
  ctx.fillStyle = '#BFE8CF';
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1E6B3C';
  ctx.font = 'bold 8px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('$', x, y + 3);
}
function dibujarCelular(x, y, brillo) {
  ctx.fillStyle = 'rgba(245,197,24,' + (0.25 + 0.2 * brillo) + ')';   // brillo alrededor
  ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#26262E';
  roundRect(x - 9, y - 15, 18, 30, 3);
  ctx.fillStyle = '#6EC1F0';
  ctx.fillRect(x - 7, y - 12, 14, 21);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x - 5, y - 9, 6, 2);
  ctx.fillRect(x - 5, y - 5, 9, 2);
  ctx.fillStyle = '#9AA7C7';
  ctx.fillRect(x - 2, y + 11, 4, 2);
}

function dibujarObjeto(tipo, x, y, t, indice) {
  if (tipo === 'o') dibujarMoneda(x, y, t * 3);
  else if (tipo === 'f') dibujarFruta(x, y, indice % 2);
  else if (tipo === 'l') dibujarLibro(x, y);
  else if (tipo === 'p') dibujarLapicero(x, y);
  else if (tipo === 'b') dibujarBillete(x, y);
  else if (tipo === 'c') dibujarCelular(x, y, Math.sin(t * 4) * 0.5 + 0.5);
}

let reloj = 0;
function dibujarObjetos() {
  reloj += 1 / 60;
  objetos.forEach((ob, i) => {
    if (ob.recogido) return;
    if (ob.x < camaraX - 40 || ob.x > camaraX + ANCHO + 40) return;   // fuera de la pantalla
    const flotar = Math.sin(reloj * 3 + ob.fase) * 3;                 // sube y baja suavemente
    dibujarObjeto(ob.tipo, ob.x, ob.y + flotar, reloj + ob.fase, i);
  });
  // Textos "+10" que suben
  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  for (const tf of textosFlotantes) {
    ctx.globalAlpha = Math.max(0, tf.vida / 50);
    ctx.fillStyle = '#0F2461';
    ctx.fillText(tf.texto, tf.x + 1, tf.y + 1);
    ctx.fillStyle = '#F5C518';
    ctx.fillText(tf.texto, tf.x, tf.y);
  }
  ctx.globalAlpha = 1;
}

// DIBUJOS DE LOS OBSTÁCULOS (NUEVO EN LA FASE 5)
function ojos(x, y, separacion) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(x - separacion, y, 4.5, 0, Math.PI * 2); ctx.arc(x + separacion, y, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1B2233';
  const mira = Math.sign(mariana.x - x) * 1.5;      // los ojos miran hacia Mariana
  ctx.beginPath(); ctx.arc(x - separacion + mira, y + 1, 2.2, 0, Math.PI * 2); ctx.arc(x + separacion + mira, y + 1, 2.2, 0, Math.PI * 2); ctx.fill();
}

function dibujarNota(e) {
  const x = e.x, y = e.y - e.alto / 2;
  const aleteo = Math.sin(e.t * 14) * 6;
  ctx.fillStyle = '#E3EAF5';                          // alas
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 30, y - 10 - aleteo); ctx.lineTo(x - 16, y + 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 30, y - 10 - aleteo); ctx.lineTo(x + 16, y + 8); ctx.fill();
  ctx.fillStyle = '#FFFFFF';                          // hoja
  ctx.fillRect(x - 16, y - 17, 32, 34);
  ctx.fillStyle = '#C9D3E6';
  ctx.beginPath(); ctx.moveTo(x + 8, y - 17); ctx.lineTo(x + 16, y - 9); ctx.lineTo(x + 8, y - 9); ctx.fill();
  ctx.strokeStyle = '#9AA7C7'; ctx.lineWidth = 1; ctx.strokeRect(x - 16, y - 17, 32, 34);
  ctx.fillStyle = '#D7282F';                          // la mala nota
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('1.0', x, y + 13);
  ojos(x, y - 5, 6);
}

function dibujarTareas(e) {
  const x = e.x, y = e.y;
  const paso = Math.sin(e.t * 12) * 3;
  ctx.fillStyle = '#1B2233';                          // patas
  ctx.fillRect(x - 10, y - 6 + (paso > 0 ? 0 : 2), 4, 6);
  ctx.fillRect(x + 6, y - 6 + (paso > 0 ? 2 : 0), 4, 6);
  const colores = ['#D7282F', '#2E9E5B', '#1B3A8C'];  // tres cuadernos apilados
  colores.forEach((col, i) => {
    const cy = y - 14 - i * 10;
    ctx.fillStyle = col; ctx.fillRect(x - 17 + (i % 2) * 2, cy, 34, 9);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 17 + (i % 2) * 2 + 30, cy + 1, 3, 7);
  });
  ctx.fillStyle = '#F5C518';
  ctx.fillRect(x - 13, y - 44, 26, 9);
  ctx.fillStyle = '#0F2461';
  ctx.font = 'bold 8px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('TAREA', x, y - 37);
  ojos(x, y - 24, 7);
}

function dibujarReloj(e) {
  const x = e.x, y = e.y - 16;
  const temblor = e.enSuelo && e.espera < 20 ? Math.sin(e.t * 60) * 2 : 0;   // tiembla antes de saltar
  ctx.save(); ctx.translate(x + temblor, y);
  ctx.fillStyle = '#F5C518';                          // campanas
  ctx.beginPath(); ctx.arc(-11, -13, 6, 0, Math.PI * 2); ctx.arc(11, -13, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1B2233';                          // patas
  ctx.fillRect(-11, 12, 4, 5); ctx.fillRect(7, 12, 4, 5);
  ctx.fillStyle = '#D7282F';                          // cuerpo
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1B2233'; ctx.lineWidth = 2;     // manecillas
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -8); ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(e.t * 4) * 6, Math.sin(e.t * 4) * 6); ctx.stroke();
  ctx.restore();
  if (!e.enSuelo) {                                   // "¡RIIING!" cuando salta
    ctx.fillStyle = '#D7282F';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('¡RIIING!', x, y - 26);
  }
}

function dibujarGlobo(e) {
  const x = e.x, y = e.y - e.alto / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#1B3A8C'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 38, y - 19); ctx.lineTo(x + 38, y - 19);
  ctx.quadraticCurveTo(x + 45, y - 19, x + 45, y - 10);
  ctx.lineTo(x + 45, y + 10);
  ctx.quadraticCurveTo(x + 45, y + 19, x + 38, y + 19);
  ctx.lineTo(x - 4, y + 19); ctx.lineTo(x - 14, y + 30); ctx.lineTo(x - 14, y + 19);   // colita del globo
  ctx.lineTo(x - 38, y + 19);
  ctx.quadraticCurveTo(x - 45, y + 19, x - 45, y + 10);
  ctx.lineTo(x - 45, y - 10);
  ctx.quadraticCurveTo(x - 45, y - 19, x - 38, y - 19);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#D7282F';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('¡A estudiar!', x, y + 5);
}

function dibujarObstaculos() {
  for (const e of obstaculos) {
    if (!e.vivo) continue;
    if (e.x < camaraX - 80 || e.x > camaraX + ANCHO + 80) continue;
    if (e.tipo === 'N') dibujarNota(e);
    else if (e.tipo === 'T') dibujarTareas(e);
    else if (e.tipo === 'R') dibujarReloj(e);
    else if (e.tipo === 'P') dibujarGlobo(e);
  }
}

function dibujarCorazon(x, y, lleno) {
  ctx.fillStyle = lleno ? '#D7282F' : 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.bezierCurveTo(x - 12, y - 2, x - 6, y - 12, x, y - 5);
  ctx.bezierCurveTo(x + 6, y - 12, x + 12, y - 2, x, y + 6);
  ctx.fill();
}

// Letrero de meta al final (en la fase 6 será la meta de verdad)
function dibujarBandera(x, base) {
  const ondea = Math.sin(reloj * 4) * 3;
  ctx.fillStyle = '#EDE3CF';
  ctx.fillRect(x, base - 130, 5, 130);
  ctx.fillStyle = '#F5C518';
  ctx.beginPath(); ctx.arc(x + 2.5, base - 132, 5, 0, Math.PI * 2); ctx.fill();
  const colores = ['#1B3A8C', '#2E9E5B', '#F5C518', '#FFFFFF', '#D7282F'];
  colores.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x + 5, base - 128 + i * 9);
    ctx.lineTo(x + 59, base - 128 + i * 9 + ondea);
    ctx.lineTo(x + 59, base - 119 + i * 9 + ondea);
    ctx.lineTo(x + 5, base - 119 + i * 9);
    ctx.fill();
  });
  ctx.fillStyle = '#0F2461';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('META', x + 30, base - 138);
}

// CANCHA DE FÚTBOL (como el balón del escudo)
function dibujarCancha(x) {
  ctx.fillStyle = '#5CBF60';
  ctx.fillRect(x, SUELO - 8, 360, 8);
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
  ctx.beginPath();                                   // arco izquierdo
  ctx.moveTo(x + 10, SUELO); ctx.lineTo(x + 10, SUELO - 70); ctx.lineTo(x + 70, SUELO - 70); ctx.lineTo(x + 70, SUELO);
  ctx.moveTo(x + 290, SUELO); ctx.lineTo(x + 290, SUELO - 70); ctx.lineTo(x + 350, SUELO - 70); ctx.lineTo(x + 350, SUELO);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;   // redes
  for (let k = 1; k < 6; k++) {
    ctx.beginPath(); ctx.moveTo(x + 10 + k * 10, SUELO - 70); ctx.lineTo(x + 10 + k * 10, SUELO); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 290 + k * 10, SUELO - 70); ctx.lineTo(x + 290 + k * 10, SUELO); ctx.stroke();
  }
  // Balón
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(x + 180, SUELO - 10, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1B2233';
  ctx.beginPath(); ctx.arc(x + 180, SUELO - 10, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x + 172, SUELO - 12, 3, 3); ctx.fillRect(x + 185, SUELO - 12, 3, 3);
}

// DECORADO DE CADA NIVEL (NUEVO EN LA FASE 6)
function decoradoColegio() {
  dibujarArbol(70);
  dibujarColegio(160);
  dibujarArbol(640);
  dibujarFlores(10, 150);
  dibujarFlores(575, 700);
  dibujarArbol(1240);
  dibujarHuerta(850);
  dibujarCancha(2010);
}
function decoradoCampo() {
  dibujarHuerta(150);
  dibujarArbol(390);
  dibujarFlores(300, 440);
  dibujarArbol(1170);
  dibujarFlores(1680, 1830);
  dibujarGranja(2110);
  dibujarArbol(2740);
  dibujarFlores(2640, 2860);
}

// DIBUJAR a Mariana con figuras simples
//    Mide unos 70 px de alto. (x, y) es el punto entre sus pies.
function dibujarMariana(m) {
  const piel = '#F2C9A0', cabello = '#3A2618', blusa = '#F7F0DF', jardinera = '#1F2F5C';
  const enAire = !m.enSuelo;
  const balanceo = enAire ? 0 : Math.sin(m.paso);   // de -1 a 1 mientras camina
  const rebote = (m.vel !== 0 && !enAire) ? Math.abs(Math.sin(m.paso)) * 2 : 0;

  ctx.save();
  ctx.translate(m.x, m.y - rebote);
  const TAM = 1.4;                                 // tamaño de Mariana (1 = normal)
  ctx.scale(m.mira * TAM, TAM);                    // voltear si mira a la izquierda


  // Cabello largo (parte de atrás)
  ctx.fillStyle = cabello;
  roundRect(-13, -66, 20, 40, 8);

  // Piernas y zapatos (se mueven al caminar; en el aire una pierna se dobla)
  const p1 = enAire ? -3 : balanceo * 4, p2 = enAire ? 3 : -balanceo * 4;
  ctx.fillStyle = piel;
  ctx.fillRect(-6 + p1, -16, 5, 13);
  ctx.fillRect(1 + p2, -16, 5, 13);
  ctx.fillStyle = '#26262E';
  ctx.fillRect(-7 + p1, -4, 8, 4);
  ctx.fillRect(0 + p2, -4, 8, 4);

  // Brazo de atrás
  ctx.fillStyle = piel;
  if (enAire) ctx.fillRect(-15, -56, 4, 16);        // brazo arriba al saltar
  else ctx.fillRect(-11 - balanceo * 2, -38, 4, 16);

  // Jardinera azul (vestido)
  ctx.fillStyle = jardinera;
  ctx.beginPath();
  ctx.moveTo(-8, -44); ctx.lineTo(8, -44);
  ctx.lineTo(12, -15); ctx.lineTo(-12, -15);
  ctx.closePath(); ctx.fill();

  // Blusa: mangas cortas y cuello
  ctx.fillStyle = blusa;
  ctx.fillRect(-12, -44, 6, 8);                    // manga de atrás
  ctx.fillRect(5, -44, 7, 8);                      // manga de adelante
  ctx.beginPath();                                 // cuello en V
  ctx.moveTo(-5, -45); ctx.lineTo(0, -37); ctx.lineTo(5, -45); ctx.closePath(); ctx.fill();

  // Brazo de adelante con la manilla amarilla
  ctx.fillStyle = piel;
  if (enAire) {                                     // brazo arriba al saltar
    ctx.fillRect(11, -58, 4, 18);
    ctx.fillStyle = '#F5C518';
    ctx.fillRect(11, -52, 4, 3);
  } else {
    ctx.fillRect(7 + balanceo * 2, -37, 4, 16);
    ctx.fillStyle = '#F5C518';
    ctx.fillRect(7 + balanceo * 2, -26, 4, 3);
  }

  // Cuello y cabeza
  ctx.fillStyle = piel;
  ctx.fillRect(-2, -48, 4, 4);
  ctx.beginPath(); ctx.arc(0, -56, 10, 0, Math.PI * 2); ctx.fill();

  // Cabello de adelante (flequillo y mechón)
  ctx.fillStyle = cabello;
  ctx.beginPath(); ctx.arc(0, -58, 11, Math.PI, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11, -58); ctx.lineTo(-4, -58); ctx.lineTo(-9, -44); ctx.lineTo(-12, -46);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(2, -64, 9, 4);

  // Cara: ojo grande, mejilla y sonrisa
  ctx.fillStyle = '#2A1A10';
  ctx.beginPath(); ctx.ellipse(5, -55, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(5, -57, 1, 1);
  ctx.fillStyle = 'rgba(230,120,120,.55)';
  ctx.beginPath(); ctx.arc(3, -51, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8A3B2B';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(7, -51, 2, 0.2, Math.PI - 0.6); ctx.stroke();

  ctx.restore();
}

// Ayuda: rectángulo con esquinas redondeadas
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.fill();
}



// Sombra de Mariana sobre la baldosa que tiene debajo
function dibujarSombra(m) {
  const col = Math.floor(m.x / BALDOSA);
  let fila = Math.floor(m.y / BALDOSA);
  while (fila < FILAS && !esSolida(col, fila)) fila++;
  if (fila >= FILAS) return;                               // debajo hay un hueco: sin sombra
  const pisoY = fila * BALDOSA;
  const altura = pisoY - m.y;
  const t = Math.max(0.35, 1 - altura / 160);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.2 * t) + ')';
  ctx.beginPath(); ctx.ellipse(m.x, pisoY + 1, 20 * t, 4 * t, 0, 0, Math.PI * 2); ctx.fill();
}

// 11) INFORMACIÓN EN PANTALLA
function dibujarInfo() {
  // Marcador: puntos, libros y objetos recogidos
  ctx.fillStyle = 'rgba(15,36,97,.88)';
  ctx.fillRect(10, 10, 580, 34);
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#CFE3D6';
  ctx.fillText('PUNTOS', 20, 32);
  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#F5C518';
  ctx.fillText(String(puntos).padStart(4, '0'), 76, 34);
  dibujarLibro(150, 27);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(libros + '/' + TOTAL_LIBROS, 170, 34);
  dibujarMoneda(240, 27, 0);
  ctx.fillText(recogidos + '/' + objetos.length, 258, 34);
  // Vidas (NUEVO EN LA FASE 5)
  for (let i = 0; i < 3; i++) dibujarCorazon(365 + i * 26, 27, i < vidas);
  // Récord (va aquí para no chocar con el nombre del nivel)
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#CFE3D6';
  ctx.fillText('RÉCORD', 455, 32);
  ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = '#F5C518';
  ctx.fillText(String(Math.max(record, puntos)), 518, 34);

  // Barra de avance: cuánto ha recorrido Mariana
  const avance = mariana.x / ANCHO_MUNDO;
  ctx.fillStyle = 'rgba(15,36,97,.85)';
  ctx.fillRect(ANCHO - 210, 10, 200, 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ANCHO - 200, 21, 180, 6);
  ctx.fillStyle = '#2E9E5B';
  ctx.fillRect(ANCHO - 200, 21, 180 * avance, 6);
  ctx.fillStyle = '#D7282F';
  ctx.beginPath(); ctx.arc(ANCHO - 200 + 180 * avance, 24, 6, 0, Math.PI * 2); ctx.fill();
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F5C518';
  ctx.fillText(NIVELES[nivelActual].nombre.toUpperCase(), ANCHO - 200, 46);


  if (tiempoMensaje > 0) {
    ctx.globalAlpha = Math.min(1, tiempoMensaje / 20);
    ctx.fillStyle = 'rgba(215,40,47,.92)';
    ctx.fillRect(ANCHO / 2 - 230, 64, 460, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mensaje, ANCHO / 2, 91);
    ctx.globalAlpha = 1;
  }
}

// Preparar el primer nivel antes de empezar
crearObjetos();
crearObstaculos();
buscarMeta();

// 12) BUCLE DEL JUEGO
function bucle() {
  actualizar();

  // Fondo fijo (no depende de la cámara)
  dibujarCielo();
  dibujarMontanas();

  // Todo lo del mundo se dibuja corrido según la cámara
  ctx.save();
  ctx.translate(-Math.round(camaraX), 0);
  NIVELES[nivelActual].decorado();
  dibujarBandera(meta.x - 2, meta.y);
  dibujarMapa();
  dibujarObjetos();
  dibujarObstaculos();
  dibujarSombra(mariana);
  // Mientras parpadea, se dibuja solo en algunos cuadros
  if (mariana.parpadeo === 0 || Math.floor(mariana.parpadeo / 5) % 2 === 0) dibujarMariana(mariana);
  ctx.restore();

  dibujarInfo();
  requestAnimationFrame(bucle);
}
bucle();
