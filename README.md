# Gumapa - React + Vite + Supabase

Sistema administrativo para una empresa pequena que fabrica y vende yogurt y helados.

## Modulos

- Login
- Clientes
- Productos
- Pedidos
- Inventario
- Entregas
- Facturacion
- Contabilidad general
- Reportes

## Requisitos

- Node.js
- Cuenta de Supabase
- Cuenta de GitHub

## Instalar y correr

```bash
npm install
npm run dev
```

Abrir la URL que muestre Vite. Normalmente:

```text
http://localhost:5180
```

Si ese puerto ya esta ocupado, Vite mostrara otro puerto como `http://localhost:5181`.

No abrir `index.html` con doble clic ni con Live Server. Este proyecto usa React + Vite y debe correrse con `npm run dev`; si se abre como HTML normal, el navegador intentara cargar `src/main.jsx` sin transformar y mostrara un error de MIME `text/jsx`.

Login:

```text
Configura el usuario y la contrasena en .env.
```

## Supabase

1. Crear un proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar el archivo `supabase/schema.sql`.
4. Copiar `.env.example` como `.env`.
5. Completar:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
VITE_APP_LOGIN_USER=gumapa
VITE_APP_LOGIN_PASSWORD=gumapa2026
```

Las tablas inician vacias. El sistema muestra ejemplos en pantalla para guiar, pero no inserta datos demo automaticamente.

Si ya habias ejecutado una version anterior del esquema, ejecuta tambien `supabase/migrations/20260526_inventario_y_facturas.sql`.


## Pedidos con varios productos

En Pedidos puedes seleccionar un cliente y agregar varios productos antes de guardar. El sistema calcula el total, valida inventario por cada producto y descuenta cada producto vendido como una salida de inventario.
## Inventario

Inventario registra:

- Producto
- Tipo de movimiento
- Cantidad
- Lote
- Fecha de creacion
- Fecha de vencimiento
- Motivo

El inventario se calcula con movimientos:

- Cuando se agrega un producto con stock inicial, se crea una entrada.
- Cuando se crea un pedido, se crea una salida y baja el stock.
- Las existencias se muestran por producto.

En Productos, la categoria se selecciona desde una lista:

- Yogurt
- Helados

## Facturacion

El sistema maneja facturas internas simples enlazadas con pedidos y contabilidad:

- Crear factura manual.
- Crear factura desde pedido.
- Contabilizar factura.
- Eliminar factura y su asiento contable enlazado.
- Abrir OviTribuCR para emitir la factura electronica fuera del sistema.

Enlace usado en la app:

```text
https://ovitribucr.hacienda.go.cr/home/
```

## Contabilidad general

La contabilidad usa estructura de doble partida:

- `contabilidad_cuentas`: catalogo de cuentas.
- `contabilidad_asientos`: encabezado del asiento.
- `contabilidad_lineas`: lineas de debe y haber.
- `contabilidad_periodos`: periodos/cierres mensuales.

Cada asiento debe cuadrar: total debe igual a total haber.

Las facturas se pueden contabilizar desde el modulo de facturacion, creando un asiento enlazado a la factura.
Si una factura se crea con estado `Pagada`, el sistema crea automaticamente el asiento de ingreso.
Para que eliminar facturas/clientes funcione en Supabase, ejecuta la migracion `supabase/migrations/20260526_inventario_y_facturas.sql`.

Automatizaciones contables incluidas:

- Crea cuentas base si no existen: Caja/Banco, Cuentas por cobrar, Ventas y Gasto general.
- Factura `Pendiente`: registra venta contra cuentas por cobrar.
- Factura `Pagada`: registra ingreso contra Caja/Banco.
- Boton `Pagada`: registra el cobro de una factura pendiente.
- Gasto rapido: registra gasto y asiento automatico.
- Eliminar gasto/factura: elimina tambien sus asientos relacionados.

## GitHub

```bash
git init
git add .
git commit -m "Proyecto inicial Gumapa en React"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gumapa-gestion.git
git push -u origin main
```

## Dominio y publicacion

Este proyecto usa Vite, asi que se puede publicar en Vercel, Netlify, Cloudflare Pages o GitHub Pages.

En Vercel/Netlify:

1. Conectar el repositorio de GitHub.
2. Framework: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Agregar variables de entorno de Supabase.
6. Configurar el dominio personalizado desde el panel del proveedor.
# GUMAPA-GESTION



