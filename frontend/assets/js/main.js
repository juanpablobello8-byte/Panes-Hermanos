/* =========================================
   CONFIGURACIÓN DE LA API UNIFICADA
   ========================================= */
const API_BASE = 'http://localhost:8000/api'; 
const API_INVENTARIO = `${API_BASE}/inventario`;
const API_VENTAS = `${API_BASE}/ventas`;
const API_REPORTES = `${API_BASE}/reportes`;
const API_EMPLEADOS = `${API_BASE}/empleados`;
const API_PROMOCIONES = `${API_BASE}/promociones`;
const API_RECETAS = `${API_BASE}/recetas`;
const API_ORDENES = `${API_BASE}/ordenes`;
const API_MERMAS = `${API_BASE}/mermas`;
const API_PEDIDOS = `${API_BASE}/pedidos`;
const API_INSUMOS = `${API_BASE}/insumos`;

/* =========================================
   ESTADO DE LA APLICACIÓN
   ========================================= */
let inventario = []; 
let empleados = []; 
let promociones = [];
let carrito = [];
let historialVentas = [];
let ventaActivaModal = null; // Venta actualmente abierta en el modal de detalles

// Memoria para Nuevos Plugins
let recetas = []; let ordenes = []; let mermas = []; let pedidos = []; let insumos = [];

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
    links.forEach(link => {
        link.classList.add('collapsed');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(idModuloActive)) {
            link.classList.remove('collapsed');
        }
    });
}

async function actualizarVistas() {
    verificarAdminParaPlugins();
    await cargarPluginsActivos();
    await obtenerInventarioDeServidor();
    await obtenerEmpleadosDeServidor();
    try { await obtenerPromocionesDeServidor(); } catch(e){}
    renderizarInventario();
    renderizarEmpleados();
    try { renderizarPromociones(); } catch(e){}
    renderizarProductosVenta();
    try { renderizarReportes(); renderizarVentasStats(); } catch(e){}
    try { await cargarRecetas(); } catch(e){}
    try { await cargarOrdenes(); } catch(e){}
    try { await cargarMermas(); } catch(e){}
    await cargarPedidos();
    try { await cargarInsumos(); } catch(e){}
}

async function cargarPluginsActivos() {
    try {
        const res = await fetch(`http://localhost:8000/api/gestor-plugins/activos`);
        if(res.ok) {
            const activos = await res.json();
            const ul = document.getElementById('lista-plugins-instalados');
            if(ul) ul.innerHTML = '';
            
            activos.forEach(p => {
                const menuItem = document.querySelector(`.${p.menu_class}`);
                if(menuItem) menuItem.classList.remove('d-none');
                
                if(ul) {
                    ul.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        ${p.name}
                        <div>
                            <span class="badge bg-success rounded-pill me-2">Activo</span>
                            <button class="btn btn-sm btn-outline-danger" onclick="desinstalarPlugin('${p.id}')">
                                <i class="bi bi-box-arrow-right"></i> Extraer
                            </button>
                        </div>
                    </li>`;
                }
            });
            if(activos.length === 0 && ul) ul.innerHTML = '<li class="list-group-item text-muted">No hay plugins instalados</li>';
        }
    } catch(e) { console.error("Error cargando plugins:", e); }
}

async function instalarPlugin(e) {
    e.preventDefault();
    const fileInput = document.getElementById('plugin-file');
    const btn = document.getElementById('btn-instalar-plugin');
    if(fileInput.files.length === 0) return alert('Selecciona un archivo .zip');
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    btn.disabled = true;
    btn.innerText = 'Instalando...';
    try {
        const res = await fetch(`http://localhost:8000/api/gestor-plugins/upload`, { method: 'POST', body: formData });
        if(res.ok) {
            alert('Plugin instalado exitosamente.');
            document.getElementById('form-plugin').reset();
            await cargarPluginsActivos();
            if(confirm('¿Recargar la página para aplicar los cambios del plugin en el sistema?')) {
                window.location.reload(true);
            }
        } else {
            const err = await res.json();
            alert('Error al instalar: ' + (err.detail || ''));
        }
    } catch(e) { 
        alert('Error de conexión.');
        console.error(e);
    }
    btn.disabled = false;
    btn.innerText = 'Subir e Instalar';
}

async function desinstalarPlugin(pluginId) {
    if(!confirm('¿Seguro que deseas extraer este plugin?\\n\\nNOTA: Toda la información e historial generados con este plugin (como registros, mermas, órdenes) permanecerán seguros en la base de datos en tiempo real. Cuando vuelvas a instalar el plugin, toda tu información se restaurará automáticamente.')) return;
    
    try {
        const res = await fetch(`http://localhost:8000/api/gestor-plugins/uninstall/${pluginId}`, { method: 'DELETE' });
        if(res.ok) {
            alert('Plugin extraído correctamente. El sistema se recargará para ocultar el módulo.');
            window.location.reload(true);
        } else {
            const err = await res.json();
            alert('Error al extraer: ' + (err.detail || ''));
        }
    } catch(e) {
        alert('Error de conexión al intentar extraer el plugin.');
        console.error(e);
    }
}

function verificarAdminParaPlugins() {
    const rol = localStorage.getItem('ph_rol_activo');
    if (rol === 'Administrador') {
        const menuGestor = document.getElementById('menu-gestor-plugins');
        if(menuGestor) menuGestor.classList.remove('d-none');
    }
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
        if(respuesta.ok) {
            inventario = await respuesta.json();
            popularSelectsDelInventario();
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

    // Validación para evitar productos repetidos en el inventario
    let nombreLimpio = nombre.trim().toLowerCase();
    let esDuplicado = inventario.some(p => p.nombre.trim().toLowerCase() === nombreLimpio);
    if (esDuplicado) {
        alert("Ya existe un producto con ese nombre en el inventario. No se permiten repetidos.");
        return;
    }

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
            alert("Producto agregado correctamente.");
        } else {
            alert("Hubo un error al guardar el producto.");
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
    let pct = parseFloat(document.getElementById('promo-pct').value);
    let panDropdown = document.getElementById('promo-pan').value;

    let idAplicable = null;
    if(panDropdown) idAplicable = parseInt(panDropdown);

    let nuevaPromoReq = { 
        nombre: nombre, 
        descripcion: "Promoción generada",
        descuento_porcentaje: pct,
        producto_id_aplicable: idAplicable,
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

function filtrarPanesVenta() {
    let input = document.getElementById("buscar-pan-venta").value.toLowerCase();
    let tarjetas = document.querySelectorAll("#contenedor-productos-venta .col-producto");
    
    tarjetas.forEach(tarjeta => {
        let nombrePan = tarjeta.querySelector("strong").innerText.toLowerCase();
        tarjeta.style.display = nombrePan.includes(input) ? "" : "none";
    });
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

let totalOriginalVenta = 0;
let promocionCobradoStr = "";
let descuentoValorCobro = 0;

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
    totalOriginalVenta = totalPagar;
    document.getElementById("cobro-efectivo").value = ""; 
    document.getElementById("alerta-cambio").className = "alert alert-secondary text-center";
    document.getElementById("alerta-cambio").innerText = "Ingrese el monto con el que paga el cliente.";
    document.getElementById("btn-confirmar-cobro").disabled = true;

    const combo = document.getElementById("cobro-promocion");
    if(combo) {
        let opts = '<option value="">-- Sin Promoción --</option>';
        promociones.forEach(pr => {
            if(pr.activa) opts += `<option value="${pr.id}" data-pct="${pr.descuento_porcentaje}" data-prod="${pr.producto_id_aplicable||''}">${pr.nombre} (-${pr.descuento_porcentaje}%)</option>`;
        });
        combo.innerHTML = opts;
        combo.value = "";
    }
    const aviso = document.getElementById("cobro-promo-aviso");
    if(aviso) aviso.style.display = "none";
    descuentoValorCobro = 0;
    promocionCobradoStr = "";

    let modalElement = document.getElementById('modal-cobro');
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function aplicarPromocionACobro() {
    let combo = document.getElementById("cobro-promocion");
    let aviso = document.getElementById("cobro-promo-aviso");
    descuentoValorCobro = 0;
    promocionCobradoStr = "";

    if(!combo.value) {
        aviso.style.display = "none";
        document.getElementById("cobro-total").innerText = totalOriginalVenta.toFixed(2);
        calcularCambio();
        return;
    }
    
    let opt = combo.options[combo.selectedIndex];
    let pct = parseFloat(opt.getAttribute("data-pct"));
    let prod = opt.getAttribute("data-prod"); 
    
    if(prod) {
        prod = parseInt(prod);
        let subtotalProd = 0;
        carrito.forEach(i => {
           if(i.id === prod) subtotalProd += (i.precio * i.cantidad);
        });
        descuentoValorCobro = subtotalProd * (pct/100);
    } else {
        descuentoValorCobro = totalOriginalVenta * (pct/100);
    }
    
    let nuevoTotal = totalOriginalVenta - descuentoValorCobro;
    if(nuevoTotal < 0) nuevoTotal = 0;
    
    document.getElementById("cobro-total").innerText = nuevoTotal.toFixed(2);
    
    if(descuentoValorCobro > 0) {
        aviso.innerText = `Descuento de la promo: -$${descuentoValorCobro.toFixed(2)}`;
        aviso.className = "text-success small fw-bold";
        aviso.style.display = "block";
        promocionCobradoStr = `Ahorro $${descuentoValorCobro.toFixed(2)} por ${opt.text}`;
    } else {
        aviso.innerText = `No aplica a los artículos`;
        aviso.style.display = "block";
        aviso.className = "text-danger small fw-bold";
    }
    
    calcularCambio();
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

    let metPagoFinal = "Efectivo";
    if(promocionCobradoStr) metPagoFinal += " (" + promocionCobradoStr + ")";

    const ventaData = {
        detalles: detallesParaBackend,
        metodo_pago: metPagoFinal,
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

/* =========================================
   NUEVOS PLUGINS FUNCIONALES
   ========================================= */

// --- RECETAS ---
async function cargarRecetas() {
    try {
        let res = await fetch(`${API_RECETAS}/recetas`);
        recetas = await res.json();
        renderizarRecetasUI();
        popularSelectsDeRecetas();
    } catch (e) { console.error(e); }
}
async function agregarReceta(e) {
    e.preventDefault();
    const select = document.getElementById('rec-ingredientes');
    const seleccionados = Array.from(select.selectedOptions).filter(opt => opt.value !== "");
    if(seleccionados.length === 0) return alert('Selecciona al menos un insumo');
    
    let ingredientesList = [];
    for(let opt of seleccionados) {
        const insumoId = parseInt(opt.value);
        const insumoNombre = opt.getAttribute('data-nombre');
        const cantiInput = document.getElementById(`cant-rec-ingredientes-${opt.value}`);
        const unidadInput = document.getElementById(`uni-rec-ingredientes-${opt.value}`);
        const cantidad = cantiInput ? parseFloat(cantiInput.value) : 1;
        const unidad = unidadInput ? unidadInput.value : 'x';
        ingredientesList.push({ insumo_id: insumoId, nombre: insumoNombre, cantidad: cantidad, unidad: unidad });
    }
    
    const data = { 
        nombre: document.getElementById('rec-nombre').value, 
        ingredientes: JSON.stringify(ingredientesList) 
    };
    
    try {
        await fetch(`${API_RECETAS}/recetas`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        document.getElementById('form-recetas').reset(); 
        if(recChoices) recChoices.removeActiveItems();
        document.getElementById('rec-cantidades-container').innerHTML = '';
        await cargarRecetas();
    } catch(e) { console.error(e); }
}
async function eliminarReceta(id) {
    if(!confirm("¿Borrar receta?")) return;
    try {
        await fetch(`${API_RECETAS}/recetas/${id}`, { method: 'DELETE' }); await cargarRecetas();
    } catch(e) { console.error(e); }
}
function renderizarRecetasUI() {
    let tbody = document.getElementById('tabla-recetas'); if(!tbody) return; tbody.innerHTML = '';
    recetas.forEach(r => {
        let ingText = r.ingredientes;
        try {
            let parsed = JSON.parse(r.ingredientes);
            if(Array.isArray(parsed)) {
                ingText = parsed.map(i => {
                    let u = (i.unidad && i.unidad !== 'x') ? ' ' + i.unidad : '';
                    return `${i.cantidad}${u} ${i.nombre}`;
                }).join(', ');
            }
        } catch(e) {}
        tbody.innerHTML += `<tr><td>${r.nombre}</td><td>${ingText}</td><td><button class="btn btn-sm btn-danger" onclick="eliminarReceta(${r.id})"><i class="bi bi-trash"></i></button></td></tr>`;
    });
}

// --- ORDENES ---
async function cargarOrdenes() {
    try {
        let res = await fetch(`${API_ORDENES}/ordenes`);
        ordenes = await res.json();
        renderizarOrdenesUI();
    } catch (e) { console.error(e); }
}
async function agregarOrden(e) {
    e.preventDefault();
    const select = document.getElementById('ord-pan');
    const seleccionados = Array.from(select.selectedOptions).filter(opt => opt.value !== "");
    if(seleccionados.length === 0) return alert('Selecciona al menos una receta');
    
    let insumosDescontar = {};
    let ordenesAGenerar = [];
    
    for(let opt of seleccionados) {
        const recetaId = parseInt(opt.value);
        const recetaNombre = opt.getAttribute('data-nombre');
        const cantiInput = document.getElementById(`cant-ord-pan-${opt.value}`);
        const cantidadOrden = cantiInput ? parseInt(cantiInput.value) : 1;
        
        ordenesAGenerar.push({ pan: recetaNombre, cantidad: cantidadOrden, estado: 'En Cola' });
        
        let receta = recetas.find(r => r.id === recetaId);
        if(receta) {
            try {
                let ings = JSON.parse(receta.ingredientes);
                ings.forEach(ing => {
                    if(!insumosDescontar[ing.insumo_id]) insumosDescontar[ing.insumo_id] = 0;
                    
                    let ins = insumos.find(i => i.id === ing.insumo_id);
                    let parsedInv = parsearInsumoCantYUnidad(ins ? ins.cantidad : '0');
                    let baseUnit = parsedInv.unit.toLowerCase();
                    
                    let qtyToDeduct = ing.cantidad * cantidadOrden;
                    let recipeUnit = (ing.unidad || 'x').toLowerCase();
                    
                    if (recipeUnit === 'gr' || recipeUnit === 'g' || recipeUnit === 'gramos') {
                        if (baseUnit === 'kg') qtyToDeduct = qtyToDeduct / 1000;
                    } else if (recipeUnit === 'ml' || recipeUnit === 'mililitros') {
                        if (baseUnit === 'l') qtyToDeduct = qtyToDeduct / 1000;
                    } else if (recipeUnit === 'kg' || recipeUnit === 'kilos' || recipeUnit === 'kilo') {
                        if (baseUnit === 'kg') { /* same */ }
                    } else if (recipeUnit === 'l' || recipeUnit === 'litros' || recipeUnit === 'litro') {
                        if (baseUnit === 'l') { /* same */ }
                    }
                    
                    insumosDescontar[ing.insumo_id] += qtyToDeduct;
                });
            } catch(e) {}
        }
    }
    
    for(let id in insumosDescontar) {
        let ins = insumos.find(i => i.id === parseInt(id));
        let parsedInv = parsearInsumoCantYUnidad(ins ? ins.cantidad : '0');
        let cantNecesaria = insumosDescontar[id];
        let cantDisponible = parsedInv.num;
        
        if(!ins || cantDisponible < cantNecesaria) {
            alert(`No hay suficientes insumos de ${ins ? ins.nombre : 'ID '+id}. Necesitas ${cantNecesaria} ${parsedInv.unit}, pero tienes ${formatearInsumoParaDB(cantDisponible, parsedInv.unit)}.`);
            return;
        }
    }
    
    try {
        for(let id in insumosDescontar) {
            let ins = insumos.find(i => i.id === parseInt(id));
            let parsedInv = parsearInsumoCantYUnidad(ins.cantidad);
            let nuevaCantNum = parsedInv.num - insumosDescontar[id];
            
            let insData = { 
                nombre: ins.nombre, 
                cantidad: formatearInsumoParaDB(nuevaCantNum, parsedInv.unit), 
                costo: ins.costo 
            };
            await fetch(`${API_INSUMOS}/insumos/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(insData) });
        }
        
        for(let orden of ordenesAGenerar) {
            await fetch(`${API_ORDENES}/ordenes`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(orden) });
        }
        
        document.getElementById('form-ordenes').reset(); 
        if(ordChoices) ordChoices.removeActiveItems();
        document.getElementById('ord-cantidades-container').innerHTML = '';
        await cargarOrdenes();
        await cargarInsumos();
        alert("Orden(es) generada(s) y stock de insumos reducido correctamente.");
    } catch(e) { console.error(e); }
}
async function completarOrden(id) {
    let orden = ordenes.find(o => o.id === id);
    if (!orden) return;
    if (orden.estado === 'Completada') {
        alert("Esta orden ya está completada.");
        return;
    }
    try {
        await fetch(`${API_ORDENES}/ordenes/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({estado: 'Completada'}) });
        
        let prod = inventario.find(p => p.nombre === orden.pan);
        if (prod) {
            let nuevaCantidad = prod.cantidad_en_stock + orden.cantidad;
            let payload = {
                nombre: prod.nombre,
                descripcion: prod.descripcion,
                precio: prod.precio,
                cantidad_en_stock: nuevaCantidad,
                categoria: prod.categoria
            };
            await fetch(`${API_INVENTARIO}/productos/${prod.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            await obtenerInventarioDeServidor();
            await actualizarVistas();
        }
        
        await cargarOrdenes();
        alert("Orden completada e inventario actualizado.");
    } catch(e) { console.error(e); }
}
async function eliminarOrden(id) {
    if(!confirm("¿Borrar orden?")) return;
    try {
        await fetch(`${API_ORDENES}/ordenes/${id}`, { method: 'DELETE' }); await cargarOrdenes();
    } catch(e) { console.error(e); }
}
function renderizarOrdenesUI() {
    let tbody = document.getElementById('tabla-ordenes'); if(!tbody) return; tbody.innerHTML = '';
    ordenes.forEach(o => tbody.innerHTML += `<tr><td>${o.pan}</td><td>${o.cantidad}</td><td><span class="badge ${o.estado==='Completada'?'bg-success':'bg-warning text-dark'}">${o.estado}</span></td><td><button class="btn btn-sm btn-success" onclick="completarOrden(${o.id})"><i class="bi bi-check"></i></button> <button class="btn btn-sm btn-danger" onclick="eliminarOrden(${o.id})"><i class="bi bi-trash"></i></button></td></tr>`);
}

// --- MERMAS ---
async function cargarMermas() {
    try {
        let res = await fetch(`${API_MERMAS}/mermas`);
        mermas = await res.json();
        renderizarMermasUI();
    } catch (e) { console.error(e); }
}
async function agregarMerma(e) {
    e.preventDefault();
    const select = document.getElementById('mer-pan');
    const seleccionados = Array.from(select.selectedOptions).filter(opt => opt.value !== "");
    if(seleccionados.length === 0) return alert('Selecciona al menos un pan');
    
    const motivo = document.getElementById('mer-motivo').value;
    
    try {
        for(let opt of seleccionados) {
            const panName = opt.getAttribute('data-nombre');
            const cantiInput = document.getElementById(`cant-mer-pan-${opt.value}`);
            const cantidad = cantiInput ? parseInt(cantiInput.value) : 1;
            const data = { pan: panName, cantidad: cantidad, motivo: motivo };
            await fetch(`${API_MERMAS}/mermas`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        }
        document.getElementById('form-mermas').reset(); 
        if(merChoices) merChoices.removeActiveItems();
        document.getElementById('mer-cantidades-container').innerHTML = '';
        await cargarMermas();
    } catch(e) { console.error(e); }
}
async function eliminarMerma(id) {
    if(!confirm("¿Seguro que quieres borrar este registro de merma?")) return;
    try {
        await fetch(`${API_MERMAS}/mermas/${id}`, { method: 'DELETE' }); 
        await cargarMermas();
    } catch(e) { console.error(e); }
}
function renderizarMermasUI() {
    let tbody = document.getElementById('tabla-mermas'); if(!tbody) return; tbody.innerHTML = '';
    mermas.forEach(m => tbody.innerHTML += `<tr><td>${m.pan}</td><td>${m.cantidad}</td><td>${m.motivo}</td><td>${m.fecha_registro}</td><td><button class="btn btn-sm btn-danger" onclick="eliminarMerma(${m.id})" title="Eliminar registro"><i class="bi bi-trash"></i></button></td></tr>`);
}

// --- FUNCIONES AUXILIARES DE INSUMOS ---
function parsearInsumoCantYUnidad(str) {
    str = str.toString().toLowerCase().trim();
    let num = 0; let unit = "";
    if (str.includes(' y ')) {
        let parts = str.split(' y ');
        let mainNum = parseFloat(parts[0]) || 0;
        let subNum = parseFloat(parts[1]) || 0;
        let mainUnitMatch = parts[0].match(/[a-zA-Z]+/g);
        let mainUnit = mainUnitMatch ? mainUnitMatch.join('') : '';
        if (mainUnit === 'kg' || mainUnit === 'kilos' || mainUnit === 'kilo') { num = mainNum + (subNum / 1000); unit = 'Kg'; }
        else if (mainUnit === 'l' || mainUnit === 'litro' || mainUnit === 'litros') { num = mainNum + (subNum / 1000); unit = 'L'; }
        else { num = mainNum; unit = mainUnit; }
    } else {
        num = parseFloat(str) || 0;
        let unitMatch = str.match(/[a-zA-Z]+/g);
        unit = unitMatch ? unitMatch.join('') : '';
        if (unit === 'kg' || unit === 'kilos' || unit === 'kilo') unit = 'Kg';
        if (unit === 'l' || unit === 'litro' || unit === 'litros') unit = 'L';
        if (unit === 'gr' || unit === 'g' || unit === 'gramos') { num = num / 1000; unit = 'Kg'; }
        if (unit === 'ml' || unit === 'mililitros') { num = num / 1000; unit = 'L'; }
    }
    return { num, unit };
}

function formatearInsumoParaDB(num, unit) {
    let u = unit.toLowerCase();
    if (u === 'kg') {
        let kilos = Math.floor(num);
        let gramos = Math.round((num - kilos) * 1000);
        if (gramos === 0) return `${kilos} Kg`;
        if (kilos === 0) return `${gramos} gr`;
        return `${kilos} Kg y ${gramos} gr`;
    } else if (u === 'l') {
        let litros = Math.floor(num);
        let ml = Math.round((num - litros) * 1000);
        if (ml === 0) return `${litros} L`;
        if (litros === 0) return `${ml} ml`;
        return `${litros} L y ${ml} ml`;
    } else {
        let numStr = Number.isInteger(num) ? num.toString() : num.toFixed(2);
        return `${numStr}${unit}`;
    }
}

// --- FUNCION DE CANTIDADES DINAMICAS ---
function renderizarCantidades(selectId, containerId) {
    const select = document.getElementById(selectId);
    const container = document.getElementById(containerId);
    if(!select || !container) return;
    
    const seleccionados = Array.from(select.selectedOptions).filter(opt => opt.value !== "");
    const valoresPrevios = {};
    const unidadesPrevias = {};
    container.querySelectorAll('input.cant-dinamica').forEach(input => { valoresPrevios[input.dataset.id] = input.value; });
    container.querySelectorAll('select.uni-dinamica').forEach(sel => { unidadesPrevias[sel.dataset.id] = sel.value; });
    
    container.innerHTML = '';
    if(seleccionados.length > 0) {
        let html = '<div class="row g-2 mt-1 pt-2 border-top">';
        html += '<div class="col-12"><small class="text-muted fw-bold">Especifica la cantidad necesaria de cada insumo para una sola receta:</small></div>';
        seleccionados.forEach(opt => {
            const val = valoresPrevios[opt.value] || '1';
            const un = unidadesPrevias[opt.value] || 'x';
            
            // Selector de unidad opcional si es receta
            let selectUnidadHtml = '';
            if (selectId === 'rec-ingredientes') {
                selectUnidadHtml = `
                    <select class="form-select form-select-sm uni-dinamica" id="uni-${selectId}-${opt.value}" data-id="${opt.value}" style="max-width: 80px;">
                        <option value="x" ${un === 'x' ? 'selected' : ''}>Disp.</option>
                        <option value="kg" ${un === 'kg' ? 'selected' : ''}>Kg</option>
                        <option value="gr" ${un === 'gr' ? 'selected' : ''}>gr</option>
                        <option value="l" ${un === 'l' ? 'selected' : ''}>L</option>
                        <option value="ml" ${un === 'ml' ? 'selected' : ''}>ml</option>
                        <option value="pz" ${un === 'pz' ? 'selected' : ''}>pz</option>
                    </select>
                `;
            }
            
            html += `
                <div class="col-md-3 col-sm-4 col-6">
                    <label class="form-label small mb-0 text-truncate w-100" title="${opt.getAttribute('data-nombre')}">${opt.getAttribute('data-nombre')}</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">#</span>
                        <input type="number" class="form-control cant-dinamica" id="cant-${selectId}-${opt.value}" data-id="${opt.value}" value="${val}" min="0.01" step="0.01" required>
                        ${selectUnidadHtml}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
}

// --- SELECTS GLOBALES DE INVENTARIO ---
let pedChoices, ordChoices, merChoices, recChoices;

function popularSelectsDeInsumos() {
    const recIngredientes = document.getElementById('rec-ingredientes');
    if(!recIngredientes) return;
    
    let optionsMulti = '<option value="">Buscar y seleccionar insumo(s)...</option>';
    insumos.forEach(ins => {
        optionsMulti += `<option value="${ins.id}" data-nombre="${ins.nombre}">${ins.nombre} (Disp: ${ins.cantidad})</option>`;
    });
    
    recIngredientes.innerHTML = optionsMulti;
    if(recChoices) recChoices.destroy();
    recChoices = new Choices(recIngredientes, {removeItemButton: true, searchPlaceholderValue: 'Buscar...'});
    recIngredientes.onchange = () => renderizarCantidades('rec-ingredientes', 'rec-cantidades-container');
    renderizarCantidades('rec-ingredientes', 'rec-cantidades-container');
}

function popularSelectsDeRecetas() {
    const ordPan = document.getElementById('ord-pan');
    if(!ordPan) return;
    
    let optionsMulti = '<option value="">Buscar y seleccionar receta(s)...</option>';
    recetas.forEach(rec => {
        optionsMulti += `<option value="${rec.id}" data-nombre="${rec.nombre}">${rec.nombre}</option>`;
    });
    
    ordPan.innerHTML = optionsMulti;
    if(ordChoices) ordChoices.destroy();
    ordChoices = new Choices(ordPan, {removeItemButton: true, searchPlaceholderValue: 'Buscar...'});
    ordPan.onchange = () => renderizarCantidades('ord-pan', 'ord-cantidades-container');
    renderizarCantidades('ord-pan', 'ord-cantidades-container');
}

function popularSelectsDelInventario() {
    const pedPan = document.getElementById('ped-pan');
    const merPan = document.getElementById('mer-pan');
    const promoPan = document.getElementById('promo-pan');
    const recNombre = document.getElementById('rec-nombre');
    
    let optionsMulti = '<option value="">Buscar y seleccionar producto(s)...</option>';
    let optionPromo = '<option value="" selected>Aplica a todo el carrito</option>';
    let optionReceta = '<option value="" disabled selected>Selecciona un pan del inventario</option>';
    
    inventario.forEach(p => {
        optionsMulti += `<option value="${p.id}" data-precio="${p.precio}" data-nombre="${p.nombre}">${p.nombre}</option>`;
        optionPromo += `<option value="${p.id}" data-precio="${p.precio}" data-nombre="${p.nombre}">Solo a: ${p.nombre}</option>`;
        optionReceta += `<option value="${p.nombre}">${p.nombre}</option>`;
    });

    if(pedPan) { 
        pedPan.innerHTML = optionsMulti; 
        if(pedChoices) pedChoices.destroy(); 
        pedChoices = new Choices(pedPan, {removeItemButton: true, searchPlaceholderValue: 'Buscar...'}); 
        pedPan.onchange = () => renderizarCantidades('ped-pan', 'ped-cantidades-container');
        renderizarCantidades('ped-pan', 'ped-cantidades-container');
    }
    if(merPan) { 
        merPan.innerHTML = optionsMulti; 
        if(merChoices) merChoices.destroy(); 
        merChoices = new Choices(merPan, {removeItemButton: true, searchPlaceholderValue: 'Buscar...'}); 
        merPan.onchange = () => renderizarCantidades('mer-pan', 'mer-cantidades-container');
        renderizarCantidades('mer-pan', 'mer-cantidades-container');
    }
    if(promoPan) promoPan.innerHTML = optionPromo;
    if(recNombre) recNombre.innerHTML = optionReceta;
}

// --- PEDIDOS ---
async function cargarPedidos() {
    try {
        let res = await fetch(`${API_PEDIDOS}/pedidos`);
        pedidos = await res.json();
        renderizarPedidosUI();
    } catch (e) { console.error(e); }
}
async function agregarPedido(e) {
    e.preventDefault();
    const select = document.getElementById('ped-pan');
    const seleccionados = Array.from(select.selectedOptions).filter(opt => opt.value !== "");
    if(seleccionados.length === 0) return alert('Selecciona al menos un producto');
    
    let items = [];
    let granTotal = 0;
    
    for(let opt of seleccionados) {
        const precioU = parseFloat(opt.getAttribute('data-precio'));
        const nombre = opt.getAttribute('data-nombre');
        const cantiInput = document.getElementById(`cant-ped-pan-${opt.value}`);
        const canti = cantiInput ? parseInt(cantiInput.value) : 1;
        const subtotal = precioU * canti;
        granTotal += subtotal;
        items.push({ id_producto: parseInt(opt.value), nombre: nombre, cantidad: canti, precioU: precioU, subtotal: subtotal });
    }
    
    const info = { items: items, total: granTotal };
    
    const data = { 
        cliente: document.getElementById('ped-cliente').value, 
        detalle: "JSON::" + JSON.stringify(info), 
        fecha: document.getElementById('ped-fecha').value, 
        estado: 'Pendiente' 
    };
    try {
        const res = await fetch(`${API_PEDIDOS}/pedidos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        if(res.ok) {
            const pedidoGuardado = await res.json();
            document.getElementById('form-pedidos').reset(); 
            if(pedChoices) pedChoices.removeActiveItems();
            document.getElementById('ped-cantidades-container').innerHTML = '';
            await cargarPedidos();
            imprimirTicketPedido(pedidoGuardado.id);
        }
    } catch(e) { console.error(e); }
}
async function entregarPedido(id) {
    try {
        await fetch(`${API_PEDIDOS}/pedidos/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({estado: 'Entregado'}) });
        await cargarPedidos();
    } catch(e) { console.error(e); }
}
async function eliminarPedido(id) {
    if(!confirm("¿Borrar pedido?")) return;
    try {
        await fetch(`${API_PEDIDOS}/pedidos/${id}`, { method: 'DELETE' }); await cargarPedidos();
    } catch(e) { console.error(e); }
}
function renderizarPedidosUI() {
    let tbody = document.getElementById('tabla-pedidos'); if(!tbody) return; tbody.innerHTML = '';
    pedidos.forEach(p => {
        let textoDetalle = p.detalle;
        let esEspecial = false;
        let dataJson = null;
        if(p.detalle.startsWith("JSON::")) {
            esEspecial = true;
            try {
                dataJson = JSON.parse(p.detalle.replace("JSON::", ""));
                if (dataJson.items) {
                    let desc = dataJson.items.map(i => `${i.cantidad}x ${i.nombre}`).join(", ");
                    textoDetalle = `${desc} (Total: $${parseFloat(dataJson.total).toFixed(2)})`;
                } else {
                    textoDetalle = `${dataJson.cantidad}x ${dataJson.nombre} (Total: $${parseFloat(dataJson.total).toFixed(2)})`;
                }
            } catch(e){}
        }
        
        let printButton = esEspecial ? `<button class="btn btn-sm btn-secondary me-1" onclick="imprimirTicketPedido(${p.id})"><i class="bi bi-printer"></i></button>` : '';
        
        tbody.innerHTML += `<tr><td>${p.cliente}</td><td>${textoDetalle}</td><td>${p.fecha}</td><td><span class="badge ${p.estado==='Entregado'?'bg-success':'bg-info text-dark'}">${p.estado}</span></td><td>${printButton}<button class="btn btn-sm btn-success me-1" onclick="entregarPedido(${p.id})"><i class="bi bi-check-all"></i></button><button class="btn btn-sm btn-danger" onclick="eliminarPedido(${p.id})"><i class="bi bi-trash"></i></button></td></tr>`;
    });
}
function imprimirTicketPedido(id) {
    let pedido = pedidos.find(p => p.id === id);
    if(!pedido || !pedido.detalle.startsWith("JSON::")) return;
    let data;
    try { data = JSON.parse(pedido.detalle.replace("JSON::", "")); } catch(e) { return; }
    
    let items = data.items || [data];
    let rowsHtml = items.map(i => `
        <tr>
            <td style="text-align: left; padding: 2px 0;">${i.nombre} <small>x${i.cantidad}</small></td>
            <td style="text-align: right; padding: 2px 0;">$${(i.subtotal || i.total || (i.precioU * i.cantidad)).toFixed(2)}</td>
        </tr>
    `).join('');
    
    let ticketHtml = `
        <div style="font-family: monospace; width: 300px; margin: 0 auto; text-align: center; padding: 20px; font-size: 14px;">
            <h2 style="margin: 0;">PANES HERMANOS</h2>
            <p style="margin: 5px 0;">El mejor pan de la ciudad</p>
            <p>===================================</p>
            <h3 style="margin: 5px 0;">PEDIDO ESPECIAL</h3>
            <p style="text-align: left; margin: 2px 0;">Pedido: #${pedido.id}</p>
            <p style="text-align: left; margin: 2px 0;">Cliente: ${pedido.cliente}</p>
            <p style="text-align: left; margin: 2px 0;">Agendado para: ${pedido.fecha}</p>
            <p>===================================</p>
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                ${rowsHtml}
            </table>
            <p>===================================</p>
            <h3 style="text-align: right; margin: 5px 0;">Total a pagar: $${data.total.toFixed(2)}</h3>
            <p>===================================</p>
            <p style="margin-top: 15px;">Estado: ${pedido.estado}</p>
            <p>¡Gracias por su preferencia!</p>
        </div>
    `;
    let win = window.open('', '_blank');
    win.document.write(ticketHtml);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

// --- INSUMOS ---
async function cargarInsumos() {
    try {
        let res = await fetch(`${API_INSUMOS}/insumos`);
        insumos = await res.json();
        renderizarInsumosUI();
        popularSelectsDeInsumos();
    } catch (e) { console.error(e); }
}
async function agregarInsumo(e) {
    e.preventDefault();
    const data = { nombre: document.getElementById('ins-nombre').value, cantidad: document.getElementById('ins-cantidad').value, costo: parseFloat(document.getElementById('ins-costo').value) };
    try {
        await fetch(`${API_INSUMOS}/insumos`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        document.getElementById('form-insumos').reset(); await cargarInsumos();
    } catch(e) { console.error(e); }
}
async function eliminarInsumo(id) {
    if(!confirm("¿Borrar insumo?")) return;
    try {
        await fetch(`${API_INSUMOS}/insumos/${id}`, { method: 'DELETE' }); await cargarInsumos();
    } catch(e) { console.error(e); }
}
async function editarInsumo(id) {
    let ins = insumos.find(i => i.id === id);
    if(!ins) return;
    
    let nuevaCantidad = prompt(`Refill / Editar Cantidad para ${ins.nombre}:\nEscribe la nueva cantidad total (ej: 10 Kg, 5 L, 30 pz)`, ins.cantidad);
    if(nuevaCantidad === null || nuevaCantidad.trim() === '') return;
    
    let nuevoCosto = prompt(`Editar costo total para ${ins.nombre}:`, ins.costo);
    if(nuevoCosto === null || nuevoCosto.trim() === '') return;
    
    let costoNum = parseFloat(nuevoCosto);
    if(isNaN(costoNum)) return alert('Costo inválido');
    
    let parsed = parsearInsumoCantYUnidad(nuevaCantidad);
    let cantFormateada = formatearInsumoParaDB(parsed.num, parsed.unit);
    
    try {
        let insData = { nombre: ins.nombre, cantidad: cantFormateada, costo: costoNum };
        await fetch(`${API_INSUMOS}/insumos/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(insData) });
        await cargarInsumos();
    } catch(e) { console.error(e); }
}
function renderizarInsumosUI() {
    let tbody = document.getElementById('tabla-insumos'); if(!tbody) return; tbody.innerHTML = '';
    insumos.forEach(ins => tbody.innerHTML += `<tr><td>${ins.nombre}</td><td>${ins.cantidad}</td><td>$${parseFloat(ins.costo).toFixed(2)}</td><td><button class="btn btn-sm btn-primary me-1" onclick="editarInsumo(${ins.id})" title="Editar / Refill"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-danger" onclick="eliminarInsumo(${ins.id})" title="Eliminar"><i class="bi bi-trash"></i></button></td></tr>`);
}

window.addEventListener('load', async () => {
    const usuarioActivo = localStorage.getItem('ph_usuario_activo');
    const rolActivo = localStorage.getItem('ph_rol_activo');

    if (!usuarioActivo) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('header-user-name').textContent = usuarioActivo;
    document.getElementById('header-user-fullname').textContent = usuarioActivo;
    document.getElementById('header-user-rol').textContent = rolActivo || 'Cajero';

    const menus = {
        'Administrador': ['menu-ventas', 'menu-inventario', 'menu-promociones', 'menu-empleados', 'menu-reportes', 'menu-recetas', 'menu-ordenes', 'menu-mermas', 'menu-pedidos', 'menu-insumos'],
        'Cajero': ['menu-ventas', 'menu-inventario', 'menu-pedidos'],
        'Panadero': ['menu-recetas', 'menu-ordenes', 'menu-mermas']
    };

    let menusPermitidos = menus[rolActivo] || menus['Cajero'];
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(li => {
        let match = li.className.match(/menu-[\w-]+/);
        if (match) {
            let claseMenu = match[0];
            if (!menusPermitidos.includes(claseMenu)) {
                li.style.display = 'none';
            }
        }
    });

    if (rolActivo !== 'Administrador') {
        const formAdmins = document.querySelectorAll('.form-admin-only');
        formAdmins.forEach(el => el.style.display = 'none');
        
        const inventarioHeader = document.querySelector('#modulo-inventario table thead tr');
        if(inventarioHeader && inventarioHeader.children.length > 3) {
            inventarioHeader.children[3].style.display = 'none';
        }
    }

    if (rolActivo === 'Panadero') {
        // Por defecto ocultamos la UI hasta ver qué plugins tiene
        let modulos = document.querySelectorAll('.modulo');
        modulos.forEach(modulo => modulo.style.display = 'none');
    }

    await actualizarVistas();

    if (rolActivo === 'Panadero') {
        let tieneRecetas = !document.querySelector('.menu-recetas').classList.contains('d-none');
        let tieneOrdenes = !document.querySelector('.menu-ordenes').classList.contains('d-none');
        let tieneMermas = !document.querySelector('.menu-mermas').classList.contains('d-none');
        
        if (tieneRecetas) {
            cambiarModulo('modulo-recetas');
        } else if (tieneOrdenes) {
            cambiarModulo('modulo-ordenes');
        } else if (tieneMermas) {
            cambiarModulo('modulo-mermas');
        } else {
            cambiarModulo('modulo-sin-plugins');
        }
    }
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