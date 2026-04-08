/* =========================================
   CONFIGURACIÓN DE LA API
   ========================================= */
const IP_LOCAL = 'http://localhost'; 
const API_INVENTARIO = `${IP_LOCAL}:8000`;
const API_VENTAS = `${IP_LOCAL}:8002`;
const API_REPORTES = `${IP_LOCAL}:8003`;

/* =========================================
   ESTADO DE LA APLICACIÓN (Datos locales temporales)
   ========================================= */
let inventario = []; 
let empleados = JSON.parse(localStorage.getItem('ph_empleados')) || []; // Empleados sigo en local por ahora
let carrito = [];

function guardarDatosEmpleados() {
    localStorage.setItem('ph_empleados', JSON.stringify(empleados));
}

/* =========================================
   NAVEGACIÓN Y UI
   ========================================= */
function cambiarModulo(idModulo) {
    let modulos = document.querySelectorAll('.modulo');
    modulos.forEach(modulo => modulo.style.display = 'none');
    document.getElementById(idModulo).style.display = 'block';
    actualizarSidebar(idModulo);
    actualizarVistas();
}

function actualizarSidebar(idModuloActive) {
    const links = document.querySelectorAll('.sidebar-nav .nav-link');
    links.forEach(link => link.classList.add('collapsed'));
    let indice = 0;
    if(idModuloActive === 'modulo-inventario') indice = 1;
    if(idModuloActive === 'modulo-empleados') indice = 2;
    if(idModuloActive === 'modulo-reportes') indice = 3;
    if(links[indice]) links[indice].classList.remove('collapsed');
}

async function actualizarVistas() {
    await obtenerInventarioDeServidor();
    renderizarInventario();
    renderizarEmpleados();
    renderizarProductosVenta();
    renderizarReportes();
}

/* =========================================
   MÓDULO: INVENTARIO (Conectado a FastAPI :8000)
   ========================================= */
async function obtenerInventarioDeServidor() {
    try {
        const respuesta = await fetch(`${API_INVENTARIO}/productos`);
        if(respuesta.ok) {
            inventario = await respuesta.json();
        }
    } catch (e) {
        console.error("Error obteniendo inventario:", e);
    }
}

async function agregarProducto(evento) {
    evento.preventDefault(); 
    let nombre = document.getElementById('inv-nombre').value;
    let precio = parseFloat(document.getElementById('inv-precio').value);
    let stock = parseInt(document.getElementById('inv-stock').value);

    let nuevoProductoReq = {
        nombre: nombre,
        precio: precio,
        cantidad_en_stock: stock,
        categoria: "Pan Dulce" // Categoria por defecto
    };

    try {
        const respuesta = await fetch(`${API_INVENTARIO}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProductoReq)
        });
        if(respuesta.ok) {
            document.getElementById('form-inventario').reset();
            await actualizarVistas();
        }
    } catch (e) {
        console.error("Error al crear producto:", e);
    }
}

async function eliminarProducto(id) {
    if(confirm('¿Seguro que deseas eliminar este producto en la base de datos?')) {
        try {
            const respuesta = await fetch(`${API_INVENTARIO}/productos/${id}`, {
                method: 'DELETE'
            });
            if(respuesta.ok || respuesta.status === 204) {
                await actualizarVistas();
            }
        } catch (e) {
            console.error("Error eliminando producto:", e);
        }
    }
}

async function editarProducto(id) {
    let producto = inventario.find(p => p.id === id);
    if(producto) {
        let nuevoNombre = prompt("Nuevo nombre:", producto.nombre) || producto.nombre;
        let nuevoPrecio = prompt("Nuevo precio:", producto.precio) || producto.precio;
        let nuevoStock = prompt("Nuevo stock:", producto.cantidad_en_stock) || producto.cantidad_en_stock;

        let productoActualizado = {
            nombre: nuevoNombre,
            precio: parseFloat(nuevoPrecio),
            cantidad_en_stock: parseInt(nuevoStock),
            categoria: producto.categoria || "General"
        };
        
        try {
            const respuesta = await fetch(`${API_INVENTARIO}/productos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productoActualizado)
            });
            if(respuesta.ok) {
                await actualizarVistas();
            }
        } catch (e) {
            console.error("Error actualizando producto:", e);
        }
    }
}

function renderizarInventario() {
    let tbody = document.getElementById('tabla-inventario');
    if(!tbody) return;
    tbody.innerHTML = ''; 

    inventario.forEach(producto => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${producto.nombre}</td>
                <td>$${producto.precio.toFixed(2)}</td>
                <td>${producto.cantidad_en_stock}</td>
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
   MÓDULO: EMPLEADOS (Persistencia Local Temporal)
   ========================================= */
function agregarEmpleado(evento) {
    evento.preventDefault();
    let nombre = document.getElementById('emp-nombre').value;
    let puesto = document.getElementById('emp-puesto').value;
    let telefono = document.getElementById('emp-telefono').value;

    empleados.push({ id: Date.now(), nombre, puesto, telefono });
    guardarDatosEmpleados();
    renderizarEmpleados();
    document.getElementById('form-empleados').reset();
}

function eliminarEmpleado(id) {
    if(confirm('¿Seguro que deseas eliminar este empleado?')) {
        empleados = empleados.filter(empleado => empleado.id !== id);
        guardarDatosEmpleados();
        renderizarEmpleados();
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
   MÓDULO: VENTAS (Conectado a FastAPI :8002)
   ========================================= */
function renderizarProductosVenta() {
    let contenedor = document.getElementById('contenedor-productos-venta');
    if(!contenedor) return;
    contenedor.innerHTML = '';

    inventario.forEach(producto => {
        if(producto.cantidad_en_stock > 0) {
            contenedor.innerHTML += `
                <div class="col-md-4 col-sm-6 col-producto">
                    <div class="tarjeta-producto" onclick="agregarAlCarrito(${producto.id})">
                        <strong>${producto.nombre}</strong>
                        <span class="precio">$${producto.precio.toFixed(2)}</span>
                        <small>Stock: ${producto.cantidad_en_stock}</small>
                    </div>
                </div>
            `;
        }
    });
}

function agregarAlCarrito(idProducto) {
    let producto = inventario.find(p => p.id === idProducto);
    if (!producto) return; 

    let itemEnCarrito = carrito.find(item => item.id === idProducto);
    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad < producto.cantidad_en_stock) {
            itemEnCarrito.cantidad++;
        } else {
            alert(`No hay más stock disponible de ${producto.nombre}.`);
        }
    } else {
        carrito.push({
            id: producto.id,          
            nombre: producto.nombre,  
            precio: producto.precio,  
            cantidad: 1               
        });
    }
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

    const detallesParaBackend = carrito.map(item => {
        return {
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio
        };
    });

    const ventaData = {
        detalles: detallesParaBackend,
        metodo_pago: "Efectivo"
    };

    try {
        const respuesta = await fetch(`${API_VENTAS}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ventaData)
        });

        if (!respuesta.ok) throw new Error("Error registrando venta.");

        const ventaGuardada = await respuesta.json();
        carrito = [];
        await actualizarVistas();
        renderizarCarrito(); 
        
        alert(`¡Venta #${ventaGuardada.id} cobrada con éxito y reportada!`);
    } catch (error) {
        console.error("Hubo un problema de conexión:", error);
        alert("Asegúrate de que la API de Ventas esté corriendo en localhost:8002.");
    }
}

/* =========================================
   MÓDULO: REPORTES (Conectado a FastAPI :8003)
   ========================================= */
async function renderizarReportes() {
    let tbody = document.getElementById('tabla-reportes');
    let totalDineroCont = document.getElementById('reporte-total-dinero');
    let totalVentasCont = document.getElementById('reporte-total-ventas');
    
    if(!tbody || !totalDineroCont || !totalVentasCont) return;

    try {
        const respuestaReportes = await fetch(`${API_REPORTES}/reportes/ventas/resumen`);
        if (respuestaReportes.ok) {
            const resumen = await respuestaReportes.json();
            totalDineroCont.innerText = resumen.total_ingresos ? resumen.total_ingresos.toFixed(2) : "0.00";
            totalVentasCont.innerText = resumen.total_transacciones || "0";
        }

        const respuestaVentas = await fetch(`${API_VENTAS}/ventas`);
        if (!respuestaVentas.ok) throw new Error("No se pudieron cargar el historial.");

        const ventasBD = await respuestaVentas.json();
        tbody.innerHTML = '';
        
        [...ventasBD].reverse().forEach(venta => {
            let fecha = new Date(venta.fecha_venta).toLocaleString();
            tbody.innerHTML += `
                <tr>
                    <td class="text-primary">#${venta.id}</td>
                    <td>${fecha} <br><small class="text-muted">Completada</small></td>
                    <td class="fw-bold text-success">$${venta.total.toFixed(2)}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error al cargar reportes:", error);
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error conectando con localhost:8002 / :8003</td></tr>`;
    }
}

window.addEventListener('load', () => {
    actualizarVistas();
});