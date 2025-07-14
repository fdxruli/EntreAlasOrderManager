const ESTADOS = {
    PENDIENTE: 'pendiente',
    COMPLETADO: 'completado',
    CANCELADO: 'cancelado'
};

const COLORES_ESTADO = {
    [ESTADOS.PENDIENTE]: '#ffc107',
    [ESTADOS.COMPLETADO]: '#28a745',
    [ESTADOS.CANCELADO]: '#dc3545'
};

let cachePedidosOrdenados = null;
let ultimoOrden = null;

function setupEditarPedido() {
    const btnEditar = document.getElementById('btn-editar-pedido');
    if (btnEditar) {
        btnEditar.addEventListener('click', mostrarModalBuscarPedido);
    }

    // Configurar eventos del modal de búsqueda
    const btnBuscar = document.getElementById('btn-buscar-pedido');
    const inputCodigo = document.getElementById('input-codigo-pedido');
    const btnVerificar = document.getElementById('btn-verificar-pin');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarPedido);
    }
    if (inputCodigo) {
        inputCodigo.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') buscarPedido();
        });
    }
    if (btnVerificar) {
        btnVerificar.addEventListener('click', verificarPin);
    }

    // Cerrar modales con ESC o clic fuera
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') cerrarTodosLosModales();
    });
    window.addEventListener('click', function (e) {
        const modal = document.getElementById('buscar-pedido-modal');
        if (e.target === modal) cerrarTodosLosModales();
    });
}

function invalidarCachePedidos() {
    // Forzar recarga la próxima vez que se cargue la lista
    localStorage.removeItem('pedidos-cache');
    // Si usas el selector, actualiza la vista
    if (document.getElementById('buscar-pedido-modal').style.display === 'flex') {
        const currentOrden = document.getElementById('orden-selector')?.value || 'reciente-primero';
        cargarPedidosRecientes(currentOrden);
    }
}

function cerrarTodosLosModales() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    const resultado = document.getElementById('resultado-busqueda');
    const pinVerificacion = document.getElementById('pin-verificacion');
    if (resultado) resultado.classList.add('hidden');
    if (pinVerificacion) pinVerificacion.classList.add('hidden');

    if (window.pedidoActualModificado) {
        actualizarPedidoEnStorage(window.pedidoActual);
        mostrarNotificacion('Cambios guardados automáticamente.', 'info', 3000);
        window.pedidoActualModificado = false;
    }
}

function mostrarModalBuscarPedido() {
    cerrarTodosLosModales();
    const modal = document.getElementById('buscar-pedido-modal');
    document.getElementById('input-codigo-pedido').value = '';

    // Forzar recarga cada vez que se abre el modal
    invalidarCachePedidos();

    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('input-codigo-pedido').focus(), 100);
}

function buscarPedido() {
    const resultado = document.getElementById('resultado-busqueda');
    const btnBuscar = document.getElementById('btn-buscar-pedido');
    if (!resultado || !btnBuscar) {
        mostrarNotificacion('Error: Elementos de búsqueda no encontrados.', 'error', 3000);
        return;
    }

    resultado.innerHTML = '<div class="loader">Buscando pedido...</div>';
    resultado.classList.remove('hidden');
    btnBuscar.disabled = true;

    setTimeout(() => {
        btnBuscar.disabled = false;
        const codigo = document.getElementById('input-codigo-pedido').value.trim();
        if (!codigo) {
            mostrarNotificacion('Por favor ingresa un código de pedido', 'warning', 3000);
            resultado.classList.add('hidden');
            return;
        }

        const pedido = buscarPedidoPorCodigo(codigo);
        if (!pedido || !esPedidoValido(pedido)) {
            resultado.innerHTML = '<p class="error-message">No se encontró un pedido válido con ese código</p>';
            return;
        }

        const fechaPedido = new Date(pedido.fecha);
        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaPedido) / (1000 * 60 * 60);

        if (diferenciaHoras < 1) {
            mostrarDetallePedido(pedido);
        } else {
            resultado.classList.add('hidden');
            document.getElementById('pin-verificacion').classList.remove('hidden');
            window.pedidoBuscado = pedido;
        }
    }, 300);
}

function verificarPin() {
    const intentosMaximos = 3;
    let intentos = parseInt(localStorage.getItem('intentosPin') || '0');
    const pinIngresado = document.getElementById('input-pin')?.value;
    const pinCorrecto = localStorage.getItem('adminPIN') || '1234';

    if (!pinIngresado) {
        mostrarNotificacion('Por favor ingresa un PIN.', 'warning', 3000);
        return;
    }

    if (pinIngresado === pinCorrecto) {
        localStorage.setItem('intentosPin', '0');
        document.getElementById('pin-verificacion').classList.add('hidden');
        mostrarDetallePedido(window.pedidoBuscado);
        document.getElementById('pin-error').textContent = '';
    } else {
        intentos++;
        localStorage.setItem('intentosPin', intentos);
        document.getElementById('pin-error').textContent = `PIN incorrecto. Intento ${intentos} de ${intentosMaximos}`;
        mostrarNotificacion(`PIN incorrecto. Intento ${intentos} de ${intentosMaximos}`, 'error', 3000);
        if (intentos >= intentosMaximos) {
            document.getElementById('btn-verificar-pin').disabled = true;
            mostrarNotificacion('Demasiados intentos fallidos. Intenta de nuevo en 5 minutos.', 'error', 5000);
            setTimeout(() => {
                localStorage.setItem('intentosPin', '0');
                document.getElementById('btn-verificar-pin').disabled = false;
            }, 5 * 60 * 1000);
        }
    }
}

function mostrarDetallePedido(pedido) {
    const resultado = document.getElementById('resultado-busqueda');
    if (!resultado) return;

    const estadoActual = pedido.estado || ESTADOS.PENDIENTE;
    const esCancelado = estadoActual === ESTADOS.CANCELADO;

    resultado.innerHTML = `
        <div class="pedido-encontrado">
            <h3>Pedido #${pedido.codigo}</h3>
            <p><strong>Fecha:</strong> ${formatearFecha(pedido.fecha)}</p>
            <p><strong>Total:</strong> $${pedido.total.toFixed(2)}</p>
            <p><strong>Items:</strong> ${pedido.items.length}</p>
            
            <div class="estado-section">
                <label for="estado-pedido"><strong>Estado del pedido:</strong></label>
                <select id="estado-pedido" class="estado-selector" ${esCancelado ? 'disabled' : ''}>
                    <option value="${ESTADOS.PENDIENTE}" ${estadoActual === ESTADOS.PENDIENTE ? 'selected' : ''}>Pendiente</option>
                    <option value="${ESTADOS.COMPLETADO}" ${estadoActual === ESTADOS.COMPLETADO ? 'selected' : ''}>Completado</option>
                    <option value="${ESTADOS.CANCELADO}" ${estadoActual === ESTADOS.CANCELADO ? 'selected' : ''}>Cancelado</option>
                </select>
            </div>

            <div class="pedido-actions">
                <button id="btn-editar-este-pedido" class="btn-editar" ${esCancelado ? 'disabled' : ''}>
                    ${esCancelado ? 'No se puede editar (Cancelado)' : 'Editar contenido del pedido'}
                </button>
                <button id="btn-guardar-cambios" class="btn-guardar" ${esCancelado ? 'disabled' : ''}>
                    ${esCancelado ? 'Pedido cancelado' : 'Guardar cambios'}
                </button>
            </div>

            <div id="cancelacion-form" class="cancelacion-form ${estadoActual === ESTADOS.CANCELADO ? '' : 'hidden'}">
                <label for="motivo-cancelacion">Motivo de cancelación:</label>
                <textarea id="motivo-cancelacion" placeholder="Motivo de cancelación" ${esCancelado ? 'readonly' : ''}>${pedido.motivoCancelacion || ''}</textarea>
            </div>

            ${estadoActual === ESTADOS.CANCELADO ? `
                <div class="info-cancelacion">
                    <p><strong>Fecha de cancelación:</strong> ${formatearFecha(pedido.fechaCancelacion)}</p>
                    <p class="cancelado-notice" style="color: ${COLORES_ESTADO[ESTADOS.CANCELADO]}; font-weight: bold;">⚠️ Este pedido ha sido cancelado y no puede ser editado</p>
                </div>
            ` : ''}
        </div>
    `;

    resultado.classList.remove('hidden');

    // Remover eventos previos
    const btnEditar = document.getElementById('btn-editar-este-pedido');
    const btnGuardar = document.getElementById('btn-guardar-cambios');
    const estadoSelector = document.getElementById('estado-pedido');
    btnEditar.replaceWith(btnEditar.cloneNode(true));
    btnGuardar.replaceWith(btnGuardar.cloneNode(true));
    estadoSelector.replaceWith(estadoSelector.cloneNode(true));

    // Reasignar elementos después de clonar
    const newBtnEditar = document.getElementById('btn-editar-este-pedido');
    const newBtnGuardar = document.getElementById('btn-guardar-cambios');
    const newEstadoSelector = document.getElementById('estado-pedido');

    if (!esCancelado) {
        newBtnEditar.addEventListener('click', function () {
            cargarPedidoParaEdicion(pedido);
            document.getElementById('buscar-pedido-modal').style.display = 'none';
        });

        newBtnGuardar.addEventListener('click', function () {
            guardarCambiosEstado(pedido);
        });

        newEstadoSelector.addEventListener('change', function () {
            console.log('Estado cambiado a:', this.value); // Debug
            const nuevoEstado = this.value;
            const cancelacionForm = document.getElementById('cancelacion-form');

            if (nuevoEstado === ESTADOS.CANCELADO) {
                cancelacionForm.classList.remove('hidden');
            } else {
                cancelacionForm.classList.add('hidden');
            }

            guardarCambiosEstadoInstantaneo(pedido, nuevoEstado);
        });

        const motivoTextarea = document.getElementById('motivo-cancelacion');
        if (motivoTextarea) {
            motivoTextarea.addEventListener('blur', function () {
                if (pedido.estado === ESTADOS.CANCELADO) {
                    pedido.motivoCancelacion = this.value.trim() || 'No especificado';
                    actualizarPedidoEnStorage(pedido);
                }
            });
        }
    } else {
        newBtnEditar.addEventListener('click', function () {
            mostrarNotificacion('No se puede editar un pedido cancelado', 'warning', 3000);
        });

        newBtnGuardar.addEventListener('click', function () {
            mostrarNotificacion('No se puede modificar un pedido cancelado', 'warning', 3000);
        });
    }
}

function guardarCambiosEstadoInstantaneo(pedido, nuevoEstado) {
    const estadoAnterior = pedido.estado || ESTADOS.PENDIENTE;

    // Si el estado no cambió, no hacer nada
    if (nuevoEstado === estadoAnterior) {
        return;
    }

    // Confirmación para cancelación
    if (nuevoEstado === ESTADOS.CANCELADO && !confirm('¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.')) {
        document.getElementById('estado-pedido').value = estadoAnterior;
        return;
    }

    // Actualizar propiedades del pedido
    pedido.estado = nuevoEstado;
    pedido.fechaUltimaModificacion = new Date().toISOString();

    // Manejar casos especiales de estado
    switch (nuevoEstado) {
        case ESTADOS.CANCELADO:
            const motivoElement = document.getElementById('motivo-cancelacion');
            const motivo = motivoElement ? motivoElement.value.trim() : '';
            pedido.motivoCancelacion = motivo || 'No especificado';
            pedido.fechaCancelacion = new Date().toISOString();
            break;

        case ESTADOS.COMPLETADO:
            pedido.fechaCompletado = new Date().toISOString();
            delete pedido.motivoCancelacion;
            delete pedido.fechaCancelacion;
            break;

        case ESTADOS.PENDIENTE:
            delete pedido.motivoCancelacion;
            delete pedido.fechaCancelacion;
            delete pedido.fechaCompletado;
            break;
    }

    // Actualizar en localStorage
    actualizarPedidoEnStorage(pedido);

    // Mensajes de notificación
    const mensajeEstado = {
        [ESTADOS.PENDIENTE]: 'marcado como pendiente',
        [ESTADOS.COMPLETADO]: 'marcado como completado',
        [ESTADOS.CANCELADO]: 'cancelado'
    };

    mostrarNotificacion(`Pedido ${pedido.codigo} ${mensajeEstado[nuevoEstado]} exitosamente`, 'success', 3000);

    // Limpiar caché para forzar actualización
    cachePedidosOrdenados = null;
    ultimoOrden = null;

    // Actualizar la UI
    actualizarListaRecientesInstantanea();

    // Si existe la función de actualización global, llamarla
    if (typeof actualizarListaPedidos === 'function') {
        actualizarListaPedidos();
    }

    // Si el pedido fue cancelado, deshabilitar controles
    if (nuevoEstado === ESTADOS.CANCELADO) {
        const btnEditar = document.getElementById('btn-editar-este-pedido');
        const btnGuardar = document.getElementById('btn-guardar-cambios');
        const estadoSelector = document.getElementById('estado-pedido');

        if (btnEditar) btnEditar.disabled = true;
        if (btnGuardar) btnGuardar.disabled = true;
        if (estadoSelector) estadoSelector.disabled = true;

        // Mostrar sección de cancelación si existe
        const cancelacionForm = document.getElementById('cancelacion-form');
        if (cancelacionForm) cancelacionForm.classList.remove('hidden');
    }
}
function guardarCambiosEstado(pedido) {
    const nuevoEstado = document.getElementById('estado-pedido').value;
    guardarCambiosEstadoInstantaneo(pedido, nuevoEstado);

    const resultado = document.getElementById('resultado-busqueda');
    if (resultado) resultado.classList.add('hidden');

    mostrarNotificacion(`Pedido ${pedido.codigo} actualizado y cerrado.`, 'success', 3000);
}

function obtenerPedidosDeStorage() {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos'));
        return Array.isArray(pedidos) ? pedidos : [];
    } catch (error) {
        console.error('Error al parsear pedidos de localStorage:', error);
        return [];
    }
}

function actualizarPedidoEnStorage(pedido) {
    const pedidos = obtenerPedidosDeStorage();
    const indicePedido = pedidos.findIndex(p => p.codigo === pedido.codigo);

    if (indicePedido !== -1) {
        pedidos[indicePedido] = pedido;
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
    }
}

function esPedidoValido(pedido) {
    return pedido && typeof pedido.codigo === 'string' && typeof pedido.fecha === 'string' &&
        typeof pedido.total === 'number' && Array.isArray(pedido.items);
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    return isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString();
}

function actualizarListaRecientesInstantanea() {
    const ordenSeleccionado = document.getElementById('orden-selector')?.value || 'reciente-primero';
    cachePedidosOrdenados = null; // Forzar recarga
    ultimoOrden = null;
    cargarPedidosRecientes(ordenSeleccionado);
}

function cargarPedidoParaEdicion(pedido) {
    // Copiar todas las propiedades relevantes del pedido
    window.pedidoEnEdicion = {
        datosOriginales: JSON.parse(JSON.stringify(pedido)),
        datosEditados: JSON.parse(JSON.stringify(pedido))
    };

    window.pedidoActual = window.pedidoEnEdicion.datosEditados;

    // Actualizar elementos de la UI
    const pedidoCodigo = document.getElementById('pedido-codigo');
    const pedidoNotas = document.getElementById('pedido-notas-input');
    const codigoDescuentoInput = document.getElementById('codigo-descuento');

    if (pedidoCodigo) {
        pedidoCodigo.textContent = pedido.codigo;
    }

    if (pedidoNotas) {
        pedidoNotas.value = pedido.notas || '';
    }

    // Actualizar descuento en UI
    const descuentoElement = document.getElementById('descuento-aplicado');
    if (descuentoElement) {
        if (pedido.descuento && pedido.descuento.valor) {
            let textoDescuento = '';

            if (pedido.descuento.tipo === 'porcentaje') {
                textoDescuento = `Descuento aplicado: ${pedido.descuento.valor}% (Código: ${pedido.descuento.codigo})`;
            } else if (pedido.descuento.tipo === 'fijo') {
                textoDescuento = `Descuento fijo: $${pedido.descuento.valor.toFixed(2)} (Código: ${pedido.descuento.codigo})`;
            }

            descuentoElement.textContent = textoDescuento;

            // Si hay un campo para mostrar el código de descuento
            if (codigoDescuentoInput) {
                codigoDescuentoInput.value = pedido.descuento.codigo;
            }
        } else {
            descuentoElement.textContent = '';
            if (codigoDescuentoInput) {
                codigoDescuentoInput.value = '';
            }
        }
    }

    // Actualizar botones de envío
    if (document.querySelector('.btn-envio')) {
        document.querySelectorAll('.btn-envio').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.monto) === (pedido.costoEnvio || 0)) {
                btn.classList.add('active');
            }
        });
    }

    actualizarPedidoUI();

    mostrarNotificacion(`Editando pedido ${pedido.codigo}. Los cambios se guardarán como modificación.`, 'info', 3000);
}

function cargarPedidosRecientes(ordenSeleccionado = 'reciente-primero', pagina = 1) {
    const porPagina = 10;
    const pedidos = obtenerPedidosDeStorage();

    if (cachePedidosOrdenados && ultimoOrden === ordenSeleccionado) {
        renderizarListaPedidos(cachePedidosOrdenados, pagina);
        return;
    }

    // Verificar si hay pedidos del tipo seleccionado antes de ordenar
    if (ordenSeleccionado.includes('estado-')) {
        const estadoBuscado = ordenSeleccionado.split('-')[1]; // extraer 'pendiente', 'completado' o 'cancelado'
        const cantidad = pedidos.filter(p => (p.estado || ESTADOS.PENDIENTE) === ESTADOS[estadoBuscado.toUpperCase()]).length;

        if (cantidad === 0) {
            const mensajes = {
                'pendiente': 'No hay pedidos pendientes en este momento',
                'completado': 'No hay pedidos completados en este momento',
                'cancelado': 'No hay pedidos cancelados en este momento'
            };
            mostrarNotificacion(mensajes[estadoBuscado], 'info', 3000);

            // Volver al orden por defecto pero mantener la selección en el dropdown
            ordenSeleccionado = 'reciente-primero';
            const selector = document.getElementById('orden-selector');
            if (selector) selector.value = 'estado-' + estadoBuscado;
        }
    }

    let pedidosOrdenados;
    switch (ordenSeleccionado) {
        case 'reciente-primero':
            pedidosOrdenados = pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            break;
        case 'antiguo-primero':
            pedidosOrdenados = pedidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            break;
        case 'estado-pendiente':
            pedidosOrdenados = pedidos.sort((a, b) => {
                const estadoA = a.estado || ESTADOS.PENDIENTE;
                const estadoB = b.estado || ESTADOS.PENDIENTE;
                if (estadoA === ESTADOS.PENDIENTE && estadoB !== ESTADOS.PENDIENTE) return -1;
                if (estadoA !== ESTADOS.PENDIENTE && estadoB === ESTADOS.PENDIENTE) return 1;
                return new Date(b.fecha) - new Date(a.fecha);
            });
            break;
        case 'estado-completado':
            pedidosOrdenados = pedidos.sort((a, b) => {
                const estadoA = a.estado || ESTADOS.PENDIENTE;
                const estadoB = b.estado || ESTADOS.PENDIENTE;
                if (estadoA === ESTADOS.COMPLETADO && estadoB !== ESTADOS.COMPLETADO) return -1;
                if (estadoA !== ESTADOS.COMPLETADO && estadoB === ESTADOS.COMPLETADO) return 1;
                return new Date(b.fecha) - new Date(a.fecha);
            });
            break;
        case 'estado-cancelado':
            pedidosOrdenados = pedidos.sort((a, b) => {
                const estadoA = a.estado || ESTADOS.PENDIENTE;
                const estadoB = b.estado || ESTADOS.PENDIENTE;
                if (estadoA === ESTADOS.CANCELADO && estadoB !== ESTADOS.CANCELADO) return -1;
                if (estadoA !== ESTADOS.CANCELADO && estadoB === ESTADOS.CANCELADO) return 1;
                return new Date(b.fecha) - new Date(a.fecha);
            });
            break;
        case 'total-mayor':
            pedidosOrdenados = pedidos.sort((a, b) => b.total - a.total);
            break;
        case 'total-menor':
            pedidosOrdenados = pedidos.sort((a, b) => a.total - b.total);
            break;
        case 'codigo-asc':
            pedidosOrdenados = pedidos.sort((a, b) => a.codigo.localeCompare(b.codigo));
            break;
        case 'codigo-desc':
            pedidosOrdenados = pedidos.sort((a, b) => b.codigo.localeCompare(a.codigo));
            break;
        default:
            pedidosOrdenados = pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    cachePedidosOrdenados = pedidosOrdenados;
    ultimoOrden = ordenSeleccionado;
    renderizarListaPedidos(pedidosOrdenados, pagina);
}

function renderizarListaPedidos(pedidosOrdenados, pagina = 1) {
    const porPagina = 10;
    const lista = document.getElementById('lista-recientes');
    if (!lista) return;

    // Crear o actualizar el contenedor de controles
    let controlesContainer = document.getElementById('controles-lista');
    if (!controlesContainer) {
        controlesContainer = document.createElement('div');
        controlesContainer.id = 'controles-lista';
        controlesContainer.className = 'controles-lista';
        lista.parentNode.insertBefore(controlesContainer, lista);
    }

    // Actualizar contenido del contenedor de controles con todas las opciones
    controlesContainer.innerHTML = `
        <div class="orden-container">
            <label for="orden-selector">Ordenar por:</label>
            <select id="orden-selector" class="orden-selector">
                <option value="reciente-primero">Más reciente primero</option>
                <option value="antiguo-primero">Más antiguo primero</option>
                <option value="estado-pendiente">Pendientes primero</option>
                <option value="estado-completado">Completados primero</option>
                <option value="estado-cancelado">Cancelados primero</option>
                <option value="total-mayor">Total mayor primero</option>
                <option value="total-menor">Total menor primero</option>
                <option value="codigo-asc">Código A-Z</option>
                <option value="codigo-desc">Código Z-A</option>
            </select>
        </div>
        <button id="btn-recargar-pedidos" class="btn-recargar">
            🔄 Actualizar lista
        </button>
    `;

    // Configurar el selector con el último orden usado
    const selector = document.getElementById('orden-selector');
    if (ultimoOrden) {
        selector.value = ultimoOrden;
    } else {
        selector.value = 'reciente-primero'; // valor por defecto
    }

    // Configurar evento para el selector si no está configurado
    if (!selector.hasAttribute('data-configured')) {
        selector.addEventListener('change', function () {
            cargarPedidosRecientes(this.value);
        });
        selector.setAttribute('data-configured', 'true');
    }

    // Configurar evento para el botón de recarga
    document.getElementById('btn-recargar-pedidos').addEventListener('click', function () {
        cachePedidosOrdenados = null;
        ultimoOrden = null;
        cargarPedidosRecientes(selector.value);
        mostrarNotificacion('Lista de pedidos actualizada', 'info', 2000);
    });

    // Renderizar la lista de pedidos
    lista.innerHTML = '';
    const inicio = (pagina - 1) * porPagina;
    const pedidosAMostrar = pedidosOrdenados.slice(inicio, inicio + porPagina);

    pedidosAMostrar.forEach((pedido, index) => {
        if (!esPedidoValido(pedido)) return;
        const li = document.createElement('li');
        const estadoTexto = getEstadoTexto(pedido.estado);
        const estadoColor = getEstadoColor(pedido.estado);

        li.innerHTML = `
            <div class="pedido-item">
                <span class="numero">#${inicio + index + 1}</span>
                <span class="codigo">${pedido.codigo}</span>
                <span class="estado" style="color: ${estadoColor}; font-weight: bold;">${estadoTexto}</span>
                <span class="fecha">${formatearFecha(pedido.fecha)}</span>
                <span class="total">$${pedido.total.toFixed(2)}</span>
            </div>
        `;

        li.addEventListener('click', () => {
            document.getElementById('input-codigo-pedido').value = pedido.codigo;
            buscarPedido();
        });

        li.className = `pedido-reciente estado-${pedido.estado || ESTADOS.PENDIENTE}`;
        lista.appendChild(li);
    });

    // Actualizar información de paginación
    const totalInfo = document.getElementById('total-info') || document.createElement('div');
    totalInfo.id = 'total-info';
    totalInfo.className = 'total-info';
    totalInfo.innerHTML = `
        <small>Mostrando ${pedidosAMostrar.length} de ${pedidosOrdenados.length} pedidos totales</small>
    `;

    if (!document.getElementById('total-info')) {
        lista.parentNode.appendChild(totalInfo);
    }

    const paginacion = document.getElementById('paginacion') || document.createElement('div');
    paginacion.id = 'paginacion';
    paginacion.className = 'paginacion';
    paginacion.innerHTML = `
        <button ${pagina === 1 ? 'disabled' : ''} onclick="cargarPedidosRecientes('${ultimoOrden}', ${pagina - 1})">Anterior</button>
        <span>Página ${pagina} de ${Math.ceil(pedidosOrdenados.length / porPagina)}</span>
        <button ${inicio + porPagina >= pedidosOrdenados.length ? 'disabled' : ''} onclick="cargarPedidosRecientes('${ultimoOrden}', ${pagina + 1})">Siguiente</button>
    `;
    if (!document.getElementById('paginacion')) {
        lista.parentNode.appendChild(paginacion);
    }
}

function getEstadoTexto(estado) {
    switch (estado) {
        case ESTADOS.COMPLETADO: return 'COMPLETADO';
        case ESTADOS.CANCELADO: return 'CANCELADO';
        case ESTADOS.PENDIENTE:
        default: return 'PENDIENTE';
    }
}

function getEstadoColor(estado) {
    return COLORES_ESTADO[estado] || COLORES_ESTADO[ESTADOS.PENDIENTE];
}

function mostrarNotificacion(mensaje, tipo, duracion = 3000) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.textContent = mensaje;
    notificacion.style.position = 'fixed';
    notificacion.style.top = '20px';
    notificacion.style.right = '20px';
    notificacion.style.padding = '10px 20px';
    notificacion.style.backgroundColor = tipo === 'success' ? '#d4edda' : tipo === 'error' ? '#f8d7da' : '#fff3cd';
    notificacion.style.color = tipo === 'success' ? '#155724' : tipo === 'error' ? '#721c24' : '#856404';
    notificacion.style.border = `1px solid ${tipo === 'success' ? '#c3e6cb' : tipo === 'error' ? '#f5c6cb' : '#ffeeba'}`;
    notificacion.style.borderRadius = '4px';
    notificacion.style.zIndex = '1000';
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), duracion);
}

// Función auxiliar para buscar pedidos (mantenida del código original, sin cambios)
function buscarPedidoPorCodigo(codigo) {
    const pedidos = obtenerPedidosDeStorage();
    return pedidos.find(p => p.codigo === codigo);
}

// Función auxiliar para actualizar UI (mantenida del código original, sin cambios)
function actualizarPedidoUI() {
    // Implementación depende del contexto de la UI
    console.log('Actualizando UI del pedido...');
}