# finanzas

App de finanzas personales en un solo archivo (`index.html`) que se sincroniza con una hoja de Google mediante Apps Script.

## Plan financiero (Plan › Mi plan · Metas · Presupuesto)

- **Saldos reales**: en vez de exigir que registres cada gasto, puedes escribir el saldo que ves en tu banco (débito, efectivo, tarjetas, préstamos). La diferencia se guarda como un movimiento con `fuente: 'ajuste'`:
  - si falta dinero o hay más deuda en una tarjeta → categoría *Gasto no registrado* (cuenta como gasto variable, o solo corrige el saldo si así lo eliges);
  - en los demás casos → *Ajuste de saldo* (solo corrige, no cuenta como ingreso ni como gasto).
- **Plan**: con ingreso, gastos fijos, gasto variable (incluido lo no registrado), deudas, tasas y fondo de emergencia, la app simula mes a mes y reparte el margen en cascada: colchón → deudas caras (avalancha o bola de nieve) → fondo de emergencia → metas → inversión. Si las deudas comprometen mucho el ingreso, casi todo el margen va a ellas.
- **Metas** (casa, auto, anillo, boda…): con costo, fecha y lo ya ahorrado calcula el aporte mensual, si es viable con tu plan y la fecha estimada.

### Datos nuevos en la hoja

No se agregaron hojas ni columnas. Todo vive en la hoja `ajustes`, como texto JSON:

- `plan_cfg`: mes típico escrito a mano, fondo de emergencia, estrategia de deudas, tasas por cuenta y fechas en que se verificó cada saldo.
- `plan_metas`: lista de metas.

Los ajustes de saldo son movimientos normales en `movs` (columnas existentes: `fuente`, `categoria`, `notas`).

Si tu Apps Script solo guarda ajustes que ya conoce, la app lo detecta: conserva el plan en el dispositivo y muestra un aviso en Plan. En ese caso hay que permitir `plan_cfg` y `plan_metas` en el script.

## Widget para iPhone (`widget/finanzas-widget.js`)

Widget para la app [Scriptable](https://scriptable.app) que muestra un consejo para hoy (qué hacer, qué evitar y cuánto falta), no solo saldos. Usa el mismo motor que la app (`M.consejos`), así ambos dicen lo mismo.

1. Instala Scriptable, crea un script nuevo, pega el archivo y llámalo "Finanzas".
2. Ábrelo una vez y escribe la URL `/exec` de tu script, tu clave y la dirección donde abres la app. Se guardan en el llavero del iPhone.
3. Agrega un widget de Scriptable (chico, mediano o grande) y elige el script "Finanzas".

Solo lee (`accion=datos`); no cambia nada en tu hoja. Se actualiza cada 30 minutos y, sin señal, muestra la última copia.
