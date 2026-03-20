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
    let producto = inventario.find(p => p.id === idProducto);
    let itemEnCarrito = carrito.find(item => item.id === idProducto);

    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad < producto.stock) {
            itemEnCarrito.cantidad++;
        } else {
            alert("No hay más stock disponible.");
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

function finalizarVenta() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    let totalVenta = carrito.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);

    // Descontar Stock
    carrito.forEach(itemCarrito => {
        let productoInv = inventario.find(p => p.id === itemCarrito.id);
        if (productoInv) {
            productoInv.stock -= itemCarrito.cantidad;
        }
    });

    // Registrar Venta
    let nuevaVenta = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        total: totalVenta
    };
    ventas.push(nuevaVenta);

    // Limpiar
    carrito = [];
    guardarDatos();
    actualizarVistas();
    renderizarCarrito(); 
    
    alert("¡Venta cobrada con éxito!");
}

/* =========================================
   MÓDULO: REPORTES
   ========================================= */
function renderizarReportes() {
    let tbody = document.getElementById('tabla-reportes');
    let totalDineroCont = document.getElementById('reporte-total-dinero');
    let totalVentasCont = document.getElementById('reporte-total-ventas');
    
    if(!tbody || !totalDineroCont || !totalVentasCont) return;

    tbody.innerHTML = '';
    let sumaTotalDinero = 0;

    // Mostrar las ventas de la más reciente a la más antigua
    [...ventas].reverse().forEach(venta => {
        sumaTotalDinero += venta.total;
        tbody.innerHTML += `
            <tr>
                <td class="text-primary">#${venta.id}</td>
                <td>${venta.fecha}</td>
                <td class="fw-bold text-success">$${venta.total.toFixed(2)}</td>
            </tr>
        `;
    });

    totalDineroCont.innerText = sumaTotalDinero.toFixed(2);
    totalVentasCont.innerText = ventas.length;
}

window.addEventListener('load', () => {
    actualizarVistas();
});