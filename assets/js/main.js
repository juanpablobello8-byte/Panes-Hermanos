/* =========================================
   CONFIGURACIÓN DE LA API
   ========================================= */
const API_URL = 'http://172.21.64.1:8000'; // Reemplaza esto con la IP que te dio David

/* =========================================
   ESTADO DE LA APLICACIÓN (Datos)
   ========================================= */
// Uso prefijos específicos para Panes Hermanos en LocalStorage para no interferir con NiceAdmin
let inventario = JSON.parse(localStorage.getItem('ph_inventario')) || [];
let empleados = JSON.parse(localStorage.getItem('ph_empleados')) || [];
let ventas = JSON.parse(localStorage.getItem('ph_ventas')) || [];
let carrito = [];

function guardarDatos() {
    localStorage.setItem('ph_inventario', JSON.stringify(inventario));
    localStorage.setItem('ph_empleados', JSON.stringify(empleados));
    localStorage.setItem('ph_ventas', JSON.stringify(ventas));
}

/* =========================================
   NAVEGACIÓN Y UI
   ========================================= */
function cambiarModulo(idModulo) {
    // Ocultar todos
    let modulos = document.querySelectorAll('.modulo');
    modulos.forEach(modulo => modulo.style.display = 'none');
    
    // Mostrar seleccionado
    document.getElementById(idModulo).style.display = 'block';
    
    // Actualizar estado activo en sidebar
    actualizarSidebar(idModulo);
    
    actualizarVistas();
}

function actualizarSidebar(idModuloActive) {
    const links = document.querySelectorAll('.sidebar-nav .nav-link');
    links.forEach(link => link.classList.add('collapsed'));

    // Mapeo rudimentario de módulo a índice de sidebar
    let indice = 0;
    if(idModuloActive === 'modulo-inventario') indice = 1;
    if(idModuloActive === 'modulo-empleados') indice = 2;
    if(idModuloActive === 'modulo-reportes') indice = 3;

    if(links[indice]) {
        links[indice].classList.remove('collapsed');
    }
}

function actualizarVistas() {
    renderizarInventario();
    renderizarEmpleados();
    renderizarProductosVenta();
    renderizarReportes();
}

/* =========================================
   MÓDULO: INVENTARIO
   ========================================= */
function agregarProducto(evento) {
    evento.preventDefault(); 
    
    let nombre = document.getElementById('inv-nombre').value;
    let precio = parseFloat(document.getElementById('inv-precio').value);
    let stock = parseInt(document.getElementById('inv-stock').value);

    let nuevoProducto = {
        id: Date.now(), 
        nombre: nombre,
        precio: precio,
        stock: stock
    };

    inventario.push(nuevoProducto);
    guardarDatos();
    actualizarVistas();
    document.getElementById('form-inventario').reset();
}

function eliminarProducto(id) {
    if(confirm('¿Seguro que deseas eliminar este producto?')) {
        inventario = inventario.filter(producto => producto.id !== id);
        guardarDatos();
        actualizarVistas();
    }
}

function editarProducto(id) {
    let producto = inventario.find(p => p.id === id);
    if(producto) {
        let nuevoNombre = prompt("Nuevo nombre:", producto.nombre) || producto.nombre;
        let nuevoPrecio = prompt("Nuevo precio:", producto.precio) || producto.precio;
        let nuevoStock = prompt("Nuevo stock:", producto.stock) || producto.stock;

        producto.nombre = nuevoNombre;
        producto.precio = parseFloat(nuevoPrecio);
        producto.stock = parseInt(nuevoStock);

        guardarDatos();
        actualizarVistas();
    }
}

// Adaptado para tablas de NiceAdmin
function renderizarInventario() {
    let tbody = document.getElementById('tabla-inventario');
    if(!tbody) return;
    tbody.innerHTML = ''; 

    inventario.forEach(producto => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${producto.nombre}</td>
                <td>$${producto.precio.toFixed(2)}</td>
                <td>${producto.stock}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editarProducto(${producto.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${producto.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

/* =========================================
   MÓDULO: EMPLEADOS
   ========================================= */
function agregarEmpleado(evento) {
    evento.preventDefault();
    
    let nombre = document.getElementById('emp-nombre').value;
    let puesto = document.getElementById('emp-puesto').value;
    let telefono = document.getElementById('emp-telefono').value;

    let nuevoEmpleado = {
        id: Date.now(),
        nombre: nombre,
        puesto: puesto,
        telefono: telefono
    };

    empleados.push(nuevoEmpleado);
    guardarDatos();
    actualizarVistas();
    document.getElementById('form-empleados').reset();
}

function eliminarEmpleado(id) {
    if(confirm('¿Seguro que deseas eliminar este empleado?')) {
        empleados = empleados.filter(empleado => empleado.id !== id);
        guardarDatos();
        actualizarVistas();
    }
}

function renderizarEmpleados() {
    let tbody = document.getElementById('tabla-empleados');
    if(!tbody) return;
    tbody.innerHTML = '';

    empleados.forEach(empleado => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${empleado.nombre}</td>
                <td><span class="badge bg-secondary">${empleado.puesto}</span></td>
                <td>${empleado.telefono}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarEmpleado(${empleado.id})">
                        <i class="bi bi-person-x"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

/* =========================================
   MÓDULO: VENTAS (Punto de Venta)
   ========================================= */

// Renderiza los productos como tarjetas clicables
function renderizarProductosVenta() {
    let contenedor = document.getElementById('contenedor-productos-venta');
    if(!contenedor) return;
    contenedor.innerHTML = '';

    inventario.forEach(producto => {
        if(producto.stock > 0) {
            contenedor.innerHTML += `
                <div class="col-md-4 col-sm-6 col-producto">
                    <div class="tarjeta-producto" onclick="agregarAlCarrito(${producto.id})">
                        <strong>${producto.nombre}</strong>
                        <span class="precio">$${producto.precio.toFixed(2)}</span>
                        <small>Stock: ${producto.stock}</small>
                    </div>
                </div>
            `;
        }
    });
}

function agregarAlCarrito(idProducto) {
    // 1. Buscamos el producto original en el inventario para saber su precio y stock
    let producto = inventario.find(p => p.id === idProducto);
    
    // Si por alguna razón no existe en el inventario, no hacemos nada
    if (!producto) return; 

    // 2. Buscamos si ESTE MISMO producto ya está metido en el carrito
    let itemEnCarrito = carrito.find(item => item.id === idProducto);

    if (itemEnCarrito) {
        // Si ya está en el carrito, verificamos si aún hay stock para agregar uno más
        if (itemEnCarrito.cantidad < producto.stock) {
            itemEnCarrito.cantidad++;
        } else {
            alert(`No hay más stock disponible de ${producto.nombre}.`);
        }
    } else {
        // Si NO está en el carrito, lo agregamos por primera vez
        // Nos aseguramos de guardar la estructura que necesita el frontend Y el backend
        carrito.push({
            id: producto.id,          // Lo usaremos para el frontend y como producto_id para el backend
            nombre: producto.nombre,  // Para mostrarlo en la tablita del cajero
            precio: producto.precio,  // Para mostrarlo y para el precio_unitario del backend
            cantidad: 1               // Inicia en 1
        });
    }
    
    // Actualizamos la tabla visual del carrito en la pantalla
    renderizarCarrito();
}

function quitarDelCarrito(idProducto) {
    carrito = carrito.filter(item => item.id !== idProducto);
    renderizarCarrito();
}

function renderizarCarrito() {
    let tbody = document.getElementById('tabla-carrito');
    if(!tbody) return;
    tbody.innerHTML = '';
    let total = 0;

    carrito.forEach(item => {
        let subtotal = item.precio * item.cantidad;
        total += subtotal;
        tbody.innerHTML += `
            <tr>
                <td class="text-dark">${item.nombre}</td>
                <td>x${item.cantidad}</td>
                <td class="fw-bold">$${subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="quitarDelCarrito(${item.id})">
                        <i class="bi bi-x"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById('total-venta').innerText = total.toFixed(2);
}

async function finalizarVenta() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    // 1. Damos formato a los productos tal como lo pide el modelo "DetalleVentaDB" de Python
    const productosParaBackend = carrito.map(item => {
        return {
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio
        };
    });

    // 2. Armamos el objeto principal (VentaCreate) que espera el router de FastAPI
    const ventaData = {
        empleado_id: 1, // OJO: Aquí pusimos 1 fijo, luego lo cambiaremos por el ID del usuario logueado
        metodo_pago: "Efectivo",
        productos: productosParaBackend
    };

    try {
        // 3. Enviamos la petición POST al servidor
        const respuesta = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Le decimos que enviamos JSON
            },
            body: JSON.stringify(ventaData)
        });

        // Verificamos si el servidor respondió con un error
        if (!respuesta.ok) {
            throw new Error("Error en el servidor al registrar la venta.");
        }

        // Si todo salió bien, el backend nos devuelve la venta creada (VentaOut)
        const ventaGuardada = await respuesta.json();

        // 4. Limpiamos el carrito de la pantalla
        carrito = [];
        actualizarVistas();
        renderizarCarrito(); 
        
        alert(`¡Venta #${ventaGuardada.id} cobrada con éxito por $${ventaGuardada.total}!`);

    } catch (error) {
        console.error("Hubo un problema de conexión:", error);
        alert("No se pudo conectar con el servidor. Revisa si la API está encendida.");
    }
}

/* =========================================
   MÓDULO: REPORTES
   ========================================= */
async function renderizarReportes() {
    let tbody = document.getElementById('tabla-reportes');
    let totalDineroCont = document.getElementById('reporte-total-dinero');
    let totalVentasCont = document.getElementById('reporte-total-ventas');
    
    if(!tbody || !totalDineroCont || !totalVentasCont) return;

    try {
        // Hacemos la petición GET a la API de tu compañero para traer TODAS las ventas
        const respuesta = await fetch(`${API_URL}/ventas`);
        
        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los reportes de ventas.");
        }

        // Convertimos la respuesta de Python a un arreglo de objetos de JavaScript
        const ventasDesdeAPI = await respuesta.json();

        tbody.innerHTML = '';
        let sumaTotalDinero = 0;

        // Iteramos sobre las ventas que nos mandó la base de datos
        // Como vienen ordenadas desde la BD, las invertimos para ver las más nuevas primero
        [...ventasDesdeAPI].reverse().forEach(venta => {
            
            // Solo sumamos el dinero de las ventas que no estén canceladas
            if (venta.estado !== "Cancelada") {
                sumaTotalDinero += venta.total;
            }

            // Formateamos la fecha que nos manda FastAPI (viene como '2026-03-26T18:37:51')
            let fechaFormateada = new Date(venta.fecha).toLocaleString();

            // Decidimos el color de la fila dependiendo de si la venta está completada o cancelada
            let estadoColor = venta.estado === "Cancelada" ? "text-danger text-decoration-line-through" : "text-success";

            tbody.innerHTML += `
                <tr>
                    <td class="text-primary">#${venta.id}</td>
                    <td>${fechaFormateada} <br><small class="text-muted">${venta.estado}</small></td>
                    <td class="fw-bold ${estadoColor}">$${venta.total.toFixed(2)}</td>
                </tr>
            `;
        });

        // Actualizamos los cuadritos de arriba (Dashboard)
        totalDineroCont.innerText = sumaTotalDinero.toFixed(2);
        totalVentasCont.innerText = ventasDesdeAPI.length;

    } catch (error) {
        console.error("Error al cargar reportes:", error);
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error al conectar con el servidor</td></tr>`;
    }
}

window.addEventListener('load', () => {
    actualizarVistas();
});