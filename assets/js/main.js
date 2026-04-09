/* =========================================
   CONFIGURACIÓN DE LA API UNIFICADA
   ========================================= */
const API_BASE = 'http://localhost:8000/api'; 
const API_INVENTARIO = `${API_BASE}/inventario`;
const API_VENTAS = `${API_BASE}/ventas`;
const API_REPORTES = `${API_BASE}/reportes`;
const API_EMPLEADOS = `${API_BASE}/empleados`;
const API_PROMOCIONES = `${API_BASE}/promociones`;

/* =========================================
   ESTADO DE LA APLICACIÓN
   ========================================= */
let inventario = []; 
let empleados = []; 
let promociones = [];
let carrito = [];

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

    const rol = localStorage.getItem('ph_rol_activo');
    if (rol !== 'Cajero') {
        if(idModuloActive === 'modulo-promociones') indice = 2;
        if(idModuloActive === 'modulo-empleados') indice = 3;
        if(idModuloActive === 'modulo-reportes') indice = 4;
    }
    
    if(links[indice]) links[indice].classList.remove('collapsed');
}

async function actualizarVistas() {
    await obtenerInventarioDeServidor();
    await obtenerEmpleadosDeServidor();
    await obtenerPromocionesDeServidor();
    renderizarInventario();
    renderizarEmpleados();
    renderizarPromociones();
    renderizarProductosVenta();
    renderizarReportes();
    renderizarVentasStats();
}

async function renderizarVentasStats() {
    try {
        const resDia = await fetch(`${API_REPORTES}/reportes/ventas/dia`);
        if (resDia.ok) {
            const dataDia = await resDia.json();
            const elDia = document.getElementById('ventas-dia');
            if (elDia) elDia.innerText = dataDia.total_ingresos.toFixed(2);
        }

        const resMes = await fetch(`${API_REPORTES}/reportes/ventas/mes`);
        if (resMes.ok) {
            const dataMes = await resMes.json();
            const elMes = document.getElementById('ventas-mes');
            if (elMes) elMes.innerText = dataMes.total_ingresos.toFixed(2);
        }
    } catch (e) {
        console.error('Error cargando stats de ventas:', e);
    }
}

/* =========================================
   MÓDULO: INVENTARIO (Supabase)
   ========================================= */
async function obtenerInventarioDeServidor() {
    try {
        const respuesta = await fetch(`${API_INVENTARIO}/productos`);
        if(respuesta.ok) inventario = await respuesta.json();
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
        categoria: "Pan Dulce" 
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
            const respuesta = await fetch(`${API_INVENTARIO}/productos/${id}`, { method: 'DELETE' });
            if(respuesta.ok || respuesta.status === 204) await actualizarVistas();
        } catch (e) { console.error("Error eliminando producto:", e); }
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
            if(respuesta.ok) await actualizarVistas();
        } catch (e) { console.error("Error actualizando producto:", e); }
    }
}

function renderizarInventario() {
    let tbody = document.getElementById('tabla-inventario');
    if(!tbody) return;
    tbody.innerHTML = ''; 

    const rol = localStorage.getItem('ph_rol_activo');
    let columnasAcciones = rol === 'Cajero' ? '' : `
        <td>
            <button class="btn btn-warning btn-sm" onclick="editarProducto(${producto.id})">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${producto.id})">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;

    inventario.forEach(producto => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${producto.nombre}</td>
                <td>$${producto.precio.toFixed(2)}</td>
                <td>${producto.cantidad_en_stock}</td>
                ${columnasAcciones}
            </tr>
        `;
    });
}

/* =========================================
   MÓDULO: PROMOCIONES (Supabase)
   ========================================= */
async function obtenerPromocionesDeServidor() {
    try {
        const respuesta = await fetch(`${API_PROMOCIONES}/promociones`);
        if(respuesta.ok) promociones = await respuesta.json();
    } catch (e) {
        console.error("Error obteniendo promociones:", e);
    }
}

async function agregarPromocion(evento) {
    evento.preventDefault();
    let nombre = document.getElementById('promo-nombre').value;
    let descripcion = document.getElementById('promo-desc').value;

    let nuevaPromoReq = { 
        nombre: nombre, 
        descripcion: descripcion,
        descuento_porcentaje: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0]
    };

    try {
        const respuesta = await fetch(`${API_PROMOCIONES}/promociones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaPromoReq)
        });
        if(respuesta.ok) {
            document.getElementById('form-promociones').reset();
            await actualizarVistas();
        }
    } catch (e) {
        console.error("Error añadiendo promoción:", e);
    }
}

async function eliminarPromocion(id) {
    if(confirm('¿Seguro que deseas eliminar esta promoción?')) {
        try {
            const respuesta = await fetch(`${API_PROMOCIONES}/promociones/${id}`, { method: 'DELETE' });
            if(respuesta.ok || respuesta.status === 204) await actualizarVistas();
        } catch (e) { console.error("Error eliminando promoción:", e); }
    }
}

function renderizarPromociones() {
    let tbody = document.getElementById('tabla-promociones');
    if(!tbody) return;
    tbody.innerHTML = '';
    promociones.forEach(promo => {
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${promo.nombre}</td>
                <td>${promo.descripcion || '-'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarPromocion(${promo.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

/* =========================================
   MÓDULO: EMPLEADOS (Supabase)
   ========================================= */
async function obtenerEmpleadosDeServidor() {
    try {
        const respuesta = await fetch(`${API_EMPLEADOS}/empleados`);
        if(respuesta.ok) empleados = await respuesta.json();
    } catch (e) {
        console.error("Error obteniendo empleados:", e);
    }
}

async function agregarEmpleado(evento) {
    evento.preventDefault();
    let nombre = document.getElementById('emp-nombre').value;
    let puesto = document.getElementById('emp-puesto').value;
    let telefono = document.getElementById('emp-telefono').value;
    let usuario = document.getElementById('emp-usuario').value;
    let password = document.getElementById('emp-password').value;
    let rol = document.getElementById('emp-rol').value;

    let nuevoEmpleadoReq = { 
        nombre: nombre, 
        puesto: puesto, 
        telefono: telefono,
        usuario: usuario,
        rol: rol,
        password: password
    };

    try {
        const respuesta = await fetch(`${API_EMPLEADOS}/empleados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoEmpleadoReq)
        });
        if(respuesta.ok) {
            document.getElementById('form-empleados').reset();
            await actualizarVistas();
            alert('Empleado registrado exitosamente.');
        } else {
            const data = await respuesta.json();
            alert(`Error: ${data.detail || 'No se pudo crear empleado'}`);
        }
    } catch (e) {
        console.error("Error añadiendo empleado:", e);
    }
}

async function eliminarEmpleado(id) {
    if(confirm('¿Seguro que deseas dar de baja a este empleado en Supabase?')) {
        try {
            const respuesta = await fetch(`${API_EMPLEADOS}/empleados/${id}`, { method: 'DELETE' });
            if(respuesta.ok || respuesta.status === 204) await actualizarVistas();
        } catch (e) { console.error("Error eliminando empleado:", e); }
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
                <td>${empleado.telefono || '-'}</td>
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

    const empleadoActivo = localStorage.getItem('ph_empleado_id');

    const ventaData = {
        detalles: detallesParaBackend,
        metodo_pago: "Efectivo",
        empleado_id: empleadoActivo ? parseInt(empleadoActivo) : null
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
        await actualizarVistas(); // Actualiza el stock general desde el servidor
        renderizarCarrito(); 
        
        alert(`¡Venta #${ventaGuardada.id} cobrada con éxito y reportada!`);
    } catch (error) {
        console.error("Hubo un problema de conexión:", error);
        alert("Asegúrate de que el API Gateway esté encendido.");
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
        const respuestaReportes = await fetch(`${API_REPORTES}/reportes/ventas/resumen`);
        if (respuestaReportes.ok) {
            const resumen = await respuestaReportes.json();
            totalDineroCont.innerText = resumen.total_ingresos ? resumen.total_ingresos.toFixed(2) : "0.00";
            totalVentasCont.innerText = resumen.total_transacciones || "0";
        }

        const respuestaVentas = await fetch(`${API_VENTAS}/ventas`);
        if (!respuestaVentas.ok) throw new Error("Historial no encontrado.");

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
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error conectando con el servidor (Reportes)</td></tr>`;
    }
}

window.addEventListener('load', () => {
    const usuarioActivo = localStorage.getItem('ph_usuario_activo');
    const rolActivo = localStorage.getItem('ph_rol_activo');

    if (!usuarioActivo) {
        window.location.href = 'login.html';
        return;
    }

    // Actualiza headers del UI con los datos reales
    document.getElementById('header-user-name').textContent = usuarioActivo;
    document.getElementById('header-user-fullname').textContent = usuarioActivo;
    document.getElementById('header-user-rol').textContent = rolActivo || 'Cajero';

    // Ocultar características de admin si es cajero
    if (rolActivo === 'Cajero') {
        const adminLinks = document.querySelectorAll('.nav-item-admin');
        adminLinks.forEach(el => el.style.display = 'none');
        
        const formAdmins = document.querySelectorAll('.form-admin-only');
        formAdmins.forEach(el => el.style.display = 'none');
        
        // Ocultar cabecera de "Acciones" en la tabla de inventario
        const inventarioHeader = document.querySelector('#modulo-inventario table thead tr');
        if(inventarioHeader && inventarioHeader.children.length > 3) {
            inventarioHeader.children[3].style.display = 'none';
        }
    }

    actualizarVistas();
});

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}