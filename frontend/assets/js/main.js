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
let historialVentas = [];
let ventaActivaModal = null; // Venta actualmente abierta en el modal de detalles

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
        const resDia = await fetch(`${API_REPORTES}/ventas/dia`);
        if (resDia.ok) {
            const dataDia = await resDia.json();
            const elDia = document.getElementById('ventas-dia');
            if (elDia) elDia.innerText = dataDia.total_ingresos.toFixed(2);
        }

        const resMes = await fetch(`${API_REPORTES}/ventas/mes`);
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
    
    // --- CALCULAR STOCK TOTAL Y ACTUALIZAR TARJETA ---
    let totalStock = 0;
    inventario.forEach(p => totalStock += p.cantidad_en_stock);
    
    let textoNivel = "";
    let claseColor = "";
    let accionTexto = "";
    
    if (totalStock >= 500) {
        textoNivel = "| Stock Alto";
        claseColor = "text-success";
        accionTexto = "Inventario Sano";
    } else if (totalStock >= 350) {
        textoNivel = "| Stock Medio";
        claseColor = "text-primary";
        accionTexto = "Nivel Aceptable";
    } else {
        textoNivel = "| Stock Bajo";
        claseColor = "text-danger";
        accionTexto = "Revisar Stock";
    }
    
    let elNivel = document.getElementById("inventario-nivel-texto");
    let elTotal = document.getElementById("inventario-total-panes");
    let elAccion = document.getElementById("inventario-accion-texto");
    
    if (elNivel) {
        elNivel.innerText = textoNivel;
        elNivel.className = claseColor;
    }
    if (elTotal) elTotal.innerText = `${totalStock} Panes`;
    if (elAccion) {
        elAccion.innerText = accionTexto;
        elAccion.className = `${claseColor} small pt-1 fw-bold`;
    }

    if(!tbody) return;
    tbody.innerHTML = ''; 

    const rol = localStorage.getItem('ph_rol_activo');
    inventario.forEach(producto => {
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
    let telefono = document.getElementById('emp-telefono').value;
    let usuario = document.getElementById('emp-usuario').value;
    let password = document.getElementById('emp-password').value;
    let rol = document.getElementById('emp-rol').value;

    let nuevoEmpleadoReq = { 
        nombre: nombre, 
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
                <td><span class="badge bg-secondary">${empleado.rol}</span></td>
                <td>${empleado.telefono || '-'}</td>
                <td><span class="text-primary font-monospace">${empleado.usuario}</span></td>
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

function abrirModalCobro() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. Agregue productos para cobrar.");
        return;
    }

    let lista = document.getElementById("lista-resumen-cobro");
    lista.innerHTML = "";
    let totalPagar = 0;

    carrito.forEach(item => {
        let subtotal = item.precio * item.cantidad;
        totalPagar += subtotal;
        lista.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center p-2">
                <div>
                   <span class="fw-bold text-dark">${item.nombre}</span> <br>
                   <small class="text-muted">${item.cantidad} x $${item.precio.toFixed(2)}</small>
                </div>
                <span class="fw-bold">$${subtotal.toFixed(2)}</span>
            </li>
        `;
    });

    document.getElementById("cobro-total").innerText = totalPagar.toFixed(2);
    document.getElementById("cobro-efectivo").value = ""; 
    document.getElementById("alerta-cambio").className = "alert alert-secondary text-center";
    document.getElementById("alerta-cambio").innerText = "Ingrese el monto con el que paga el cliente.";
    document.getElementById("btn-confirmar-cobro").disabled = true;

    let modalElement = document.getElementById('modal-cobro');
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function calcularCambio() {
    let unparsedTotal = document.getElementById("cobro-total").innerText;
    let totalPagar = parseFloat(unparsedTotal);
    let efectivo = parseFloat(document.getElementById("cobro-efectivo").value);

    let alerta = document.getElementById("alerta-cambio");
    let btnConfirmar = document.getElementById("btn-confirmar-cobro");

    if (isNaN(efectivo) || efectivo <= 0) {
        alerta.className = "alert alert-secondary text-center";
        alerta.innerText = "Ingrese el monto con el que paga el cliente.";
        btnConfirmar.disabled = true;
        return;
    }

    if (efectivo < totalPagar) {
        let falta = totalPagar - efectivo;
        alerta.className = "alert alert-danger text-center fw-bold";
        alerta.innerText = "Faltan: $" + falta.toFixed(2);
        btnConfirmar.disabled = true;
    } else {
        let cambio = efectivo - totalPagar;
        alerta.className = "alert alert-success text-center fw-bold fs-5";
        alerta.innerText = "Cambio a entregar: $" + cambio.toFixed(2);
        btnConfirmar.disabled = false;
    }
}

async function procesarVenta() {
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
    let efectivo = parseFloat(document.getElementById("cobro-efectivo").value);
    let unparsedTotal = document.getElementById("cobro-total").innerText;
    let totalPagar = parseFloat(unparsedTotal);
    let cambio = efectivo - totalPagar;

    const ventaData = {
        detalles: detallesParaBackend,
        metodo_pago: "Efectivo",
        empleado_id: empleadoActivo ? parseInt(empleadoActivo) : null,
        efectivo_recibido: efectivo,
        cambio_entregado: cambio
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
        
        let modalElement = document.getElementById('modal-cobro');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        
        alert(`¡Venta #${ventaGuardada.id} cobrada con éxito y reportada!`);
        imprimirTicket(ventaGuardada.id, efectivo, cambio);
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
        const respuestaReportes = await fetch(`${API_REPORTES}/ventas/resumen`);
        if (respuestaReportes.ok) {
            const resumen = await respuestaReportes.json();
            totalDineroCont.innerText = resumen.total_ingresos ? resumen.total_ingresos.toFixed(2) : "0.00";
            totalVentasCont.innerText = resumen.total_transacciones || "0";
        }

        const respuestaVentas = await fetch(`${API_VENTAS}/ventas`);
        if (!respuestaVentas.ok) throw new Error("Historial no encontrado.");

        const ventasBD = await respuestaVentas.json();
        historialVentas = ventasBD;
        tbody.innerHTML = '';
        
        [...historialVentas].reverse().forEach(venta => {
            let fecha = new Date(venta.fecha_venta).toLocaleString();
            tbody.innerHTML += `
                <tr class="fila-reporte">
                    <td class="text-primary id-venta">#${venta.id}</td>
                    <td>${fecha} <br><small class="text-muted">Completada</small></td>
                    <td class="fw-bold text-success">$${venta.total.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-outline-info btn-sm" onclick="verDetallesVenta(${venta.id})">
                            <i class="bi bi-eye"></i> Ver Detalle
                        </button>
                    </td>
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

    document.getElementById('header-user-name').textContent = usuarioActivo;
    document.getElementById('header-user-fullname').textContent = usuarioActivo;
    document.getElementById('header-user-rol').textContent = rolActivo || 'Cajero';

    if (rolActivo === 'Cajero') {
        const adminLinks = document.querySelectorAll('.nav-item-admin');
        adminLinks.forEach(el => el.style.display = 'none');
        
        const formAdmins = document.querySelectorAll('.form-admin-only');
        formAdmins.forEach(el => el.style.display = 'none');
        
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

/* =========================================
   TICKETS Y CORTES DE CAJA
   ========================================= */

function filtrarReportes() {
    let input = document.getElementById("busqueda-reportes").value.toLowerCase();
    let filas = document.querySelectorAll("#tabla-reportes .fila-reporte");
    
    filas.forEach(fila => {
        let idVenta = fila.querySelector(".id-venta").innerText.toLowerCase();
        fila.style.display = idVenta.includes(input) ? "" : "none";
    });
}

function verDetallesVenta(id) {
    let venta = historialVentas.find(v => v.id === id);
    if (!venta) return;

    ventaActivaModal = venta;
    
    document.getElementById("modal-detalle-id").innerText = `#${venta.id}`;
    let lista = document.getElementById("lista-detalles-venta");
    lista.innerHTML = "";
    
    let detalles = venta.detalles || [];
    if (venta.detalles_venta) detalles = venta.detalles_venta;

    let empleadoObj = empleados.find(e => e.id === venta.empleado_id);
    let nombreEmpleado = empleadoObj
        ? `${empleadoObj.nombre} (${empleadoObj.rol})`
        : (venta.empleado_id ? `Empleado #${venta.empleado_id}` : 'No registrado');
    let fechaFormato = new Date(venta.fecha_venta).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });

    lista.innerHTML += `
        <li class="list-group-item bg-light">
            <div class="row text-muted small">
                <div class="col-6"><i class="bi bi-person-badge me-1"></i><strong>Atendió:</strong><br>${nombreEmpleado}</div>
                <div class="col-6"><i class="bi bi-calendar-event me-1"></i><strong>Fecha:</strong><br>${fechaFormato}</div>
            </div>
        </li>
    `;
    
    if (detalles.length === 0) {
        lista.innerHTML += "<li class='list-group-item text-center text-muted'>Sin detalles registrados.</li>";
    } else {
        detalles.forEach(d => {
            let prod = inventario.find(p => p.id === d.producto_id);
            let nombreProd = prod ? prod.nombre : `Producto ID ${d.producto_id}`;
            lista.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${nombreProd} <span class="badge bg-secondary rounded-pill">x${d.cantidad}</span></span>
                    <span class="fw-bold">$${d.subtotal.toFixed(2)}</span>
                </li>
            `;
        });

        lista.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center fw-bold bg-light mt-2">
                <span>Total Pagado</span>
                <span class="text-success fs-6">$${venta.total.toFixed(2)}</span>
            </li>
        `;
        if (venta.efectivo_recibido != null) {
            lista.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span class="text-muted"><i class="bi bi-cash me-1"></i>Efectivo recibido</span>
                    <span>$${parseFloat(venta.efectivo_recibido).toFixed(2)}</span>
                </li>
            `;
        }
        if (venta.cambio_entregado != null) {
            lista.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span class="text-muted"><i class="bi bi-arrow-return-left me-1"></i>Cambio entregado</span>
                    <span class="text-primary fw-bold">$${parseFloat(venta.cambio_entregado).toFixed(2)}</span>
                </li>
            `;
        }
    }
    
    let modalElement = document.getElementById('modal-detalles-venta');
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) modal = new bootstrap.Modal(modalElement);
    modal.show();
}

/* =========================================
   IMPRIMIR TICKET COMO PDF
   Usa window.print() nativo del navegador.
   En Chrome/Edge selecciona "Guardar como PDF"
   en el destino de impresión.
   ========================================= */
function imprimirTicketDesdeModal() {
    if (!ventaActivaModal) {
        alert('No hay ningun ticket abierto para imprimir.');
        return;
    }
    var venta = ventaActivaModal;
    var detalles = venta.detalles || venta.detalles_venta || [];

    var empleadoObj = null;
    for (var i = 0; i < empleados.length; i++) {
        if (empleados[i].id === venta.empleado_id) { empleadoObj = empleados[i]; break; }
    }
    var nombreEmpleado = empleadoObj
        ? (empleadoObj.nombre + ' (' + empleadoObj.rol + ')')
        : (venta.empleado_id ? ('Empleado #' + venta.empleado_id) : 'No registrado');

    var dFecha = new Date(venta.fecha_venta);
    var fecha = dFecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    var hora  = dFecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    var filasProductos = '';
    for (var j = 0; j < detalles.length; j++) {
        var d = detalles[j];
        var prod = null;
        for (var k = 0; k < inventario.length; k++) {
            if (inventario[k].id === d.producto_id) { prod = inventario[k]; break; }
        }
        var nombreProd = prod ? prod.nombre : ('Prod #' + d.producto_id);
        filasProductos += '<tr>'
            + '<td style="text-align:left;padding:3px 0;">' + nombreProd + '</td>'
            + '<td style="text-align:center;padding:3px 4px;">x' + d.cantidad + '</td>'
            + '<td style="text-align:right;padding:3px 0;">$' + d.subtotal.toFixed(2) + '</td>'
            + '</tr>';
    }

    var efectivoHtml = '';
    if (venta.efectivo_recibido != null) {
        efectivoHtml += '<p style="text-align:right;margin:3px 0;">Efectivo recibido: <b>$' + parseFloat(venta.efectivo_recibido).toFixed(2) + '</b></p>';
    }
    if (venta.cambio_entregado != null) {
        efectivoHtml += '<p style="text-align:right;margin:3px 0;">Cambio entregado: <b>$' + parseFloat(venta.cambio_entregado).toFixed(2) + '</b></p>';
    }

    var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<title>Ticket #' + venta.id + ' - Panes Hermanos</title>'
        + '<style>'
        + 'body{font-family:"Courier New",Courier,monospace;font-size:13px;color:#000;background:#fff;margin:0;padding:0;}'
        + '.ticket{width:290px;margin:0 auto;padding:16px 12px;}'
        + '.center{text-align:center;}'
        + 'hr{border:none;border-top:1px dashed #000;margin:8px 0;}'
        + 'table{width:100%;border-collapse:collapse;margin:6px 0;}'
        + 'th{font-size:11px;border-bottom:1px solid #000;padding-bottom:4px;}'
        + 'p{margin:3px 0;}'
        + '@media print{'
        + '  @page{size:80mm auto;margin:4mm;}'
        + '  body{width:80mm;}'
        + '}'
        + '</style></head><body>'
        + '<div class="ticket">'
        + '<div class="center">'
        + '<div style="font-size:18px;font-weight:bold;letter-spacing:2px;">PANES HERMANOS</div>'
        + '<div style="font-size:11px;margin-top:2px;">El mejor pan de la ciudad</div>'
        + '</div>'
        + '<hr>'
        + '<p><b>Ticket #:</b> ' + venta.id + '</p>'
        + '<p><b>Fecha:</b> ' + fecha + '</p>'
        + '<p><b>Hora:</b> ' + hora + '</p>'
        + '<p><b>Atendio:</b> ' + nombreEmpleado + '</p>'
        + '<p><b>Metodo de pago:</b> ' + (venta.metodo_pago || 'Efectivo') + '</p>'
        + '<hr>'
        + '<table><thead><tr>'
        + '<th style="text-align:left;">Producto</th>'
        + '<th style="text-align:center;">Cant.</th>'
        + '<th style="text-align:right;">Subtotal</th>'
        + '</tr></thead><tbody>' + filasProductos + '</tbody></table>'
        + '<hr>'
        + '<p style="text-align:right;font-weight:bold;font-size:15px;">TOTAL: $' + venta.total.toFixed(2) + '</p>'
        + efectivoHtml
        + '<hr>'
        + '<div class="center" style="font-size:11px;margin-top:10px;">'
        + '<p>Gracias por su compra!</p>'
        + '<p>Vuelva pronto</p>'
        + '</div></div>'
        + '<script>window.onload=function(){window.print();}<\/script>'
        + '</body></html>';

    var win = window.open('', '_blank', 'width=420,height=680,menubar=no,toolbar=no,location=no');
    if (!win) {
        alert('El navegador bloqueo la ventana emergente.\nPor favor permite ventanas emergentes para localhost:3000 y vuelve a intentarlo.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

async function abrirModalCorteCaja() {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('corte-fecha-hoy').innerText = ahora.toLocaleDateString('es-MX', opciones);

    try {
        const resDia = await fetch(`${API_REPORTES}/ventas/dia`);
        if (resDia.ok) {
            const dataDia = await resDia.json();
            document.getElementById('ventas-dia').innerText = (dataDia.total_ingresos || 0).toFixed(2);
            document.getElementById('corte-tickets-dia').innerText = dataDia.ventas_hoy || 0;
        }
        const resMes = await fetch(`${API_REPORTES}/ventas/mes`);
        if (resMes.ok) {
            const dataMes = await resMes.json();
            document.getElementById('ventas-mes').innerText = (dataMes.total_ingresos || 0).toFixed(2);
        }
    } catch (e) {
        console.error('Error cargando datos de corte de caja:', e);
    }

    let modalElement = document.getElementById('modal-corte-caja');
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function imprimirCorteCaja() {
    let dia = document.getElementById("ventas-dia").innerText;
    let fecha = new Date().toLocaleString();
    let ticketHtml = `
        <div style="font-family: monospace; width: 300px; margin: 0 auto; text-align: center; padding: 20px;">
            <h2 style="margin: 0;">PANES HERMANOS</h2>
            <p>===================================</p>
            <h3 style="margin: 5px 0;">CORTE DE CAJA</h3>
            <p style="text-align: left; margin: 2px 0;">Fecha/Hora: ${fecha}</p>
            <p style="text-align: left; margin: 2px 0;">Responsable: ${document.getElementById('header-user-name').textContent}</p>
            <p>===================================</p>
            <h3 style="margin: 10px 0;">TOTAL TURNO: <br>$${dia}</h3>
            <p>===================================</p>
            <p style="margin-top: 30px;">___________________________</p>
            <p>Firma Administrador</p>
        </div>
    `;
    let win = window.open('', '_blank');
    win.document.write(ticketHtml);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
}

async function imprimirTicket(ventaId, efectivo = null, cambio = null) {
    try {
        const respuesta = await fetch(`${API_VENTAS}/ventas/${ventaId}`);
        if (!respuesta.ok) return;
        const venta = await respuesta.json();
        
        let fecha = new Date(venta.fecha_venta).toLocaleString();
        let detallesPlantilla = "";
        
        let detalles = venta.detalles || [];
        if (venta.detalles_venta) detalles = venta.detalles_venta;
        
        if(detalles) {
            detalles.forEach(d => {
                let prod = inventario.find(p => p.id === d.producto_id);
                let nombreProd = prod ? prod.nombre : `Prod ${d.producto_id}`;
                detallesPlantilla += `
                    <tr>
                        <td style="text-align: left; padding: 2px 0;">${nombreProd} <small>x${d.cantidad}</small></td>
                        <td style="text-align: right; padding: 2px 0;">$${d.subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        
        let seccionCambio = "";
        if (efectivo !== null && cambio !== null) {
            seccionCambio = `
                <p style="text-align: right; margin: 2px 0;">Efectivo: $${efectivo.toFixed(2)}</p>
                <p style="text-align: right; margin: 2px 0;">Cambio: $${cambio.toFixed(2)}</p>
            `;
        }
        
        let ticketHtml = `
            <div style="font-family: monospace; width: 300px; margin: 0 auto; text-align: center; padding: 20px; font-size: 14px;">
                <h2 style="margin: 0;">PANES HERMANOS</h2>
                <p style="margin: 5px 0;">El mejor pan de la ciudad</p>
                <p>===================================</p>
                <p style="text-align: left; margin: 2px 0;">Ticket: #${venta.id}</p>
                <p style="text-align: left; margin: 2px 0;">Fecha: ${fecha}</p>
                <p style="text-align: left; margin: 2px 0;">Atendio: ${document.getElementById('header-user-name').textContent}</p>
                <p>===================================</p>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    ${detallesPlantilla}
                </table>
                <p>===================================</p>
                <h3 style="text-align: right; margin: 5px 0;">TOTAL: $${venta.total.toFixed(2)}</h3>
                ${seccionCambio}
                <p>===================================</p>
                <p>Gracias por su compra!</p>
            </div>
        `;
        
        let win = window.open('', '_blank');
        win.document.write(ticketHtml);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            win.close();
        }, 500); 
    } catch (e) {
        console.error("Error al imprimir ticket:", e);
    }
}