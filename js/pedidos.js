const ESTADOS = {
    EN_PROCESO: 'en_proceso',  // Nuevo estado inicial
    PENDIENTE: 'pendiente',    // Para pedidos programados
    COMPLETADO: 'completado',  // Pedido terminado
    CANCELADO: 'cancelado'     // Pedido cancelado
};

const COLORES_ESTADO = {
    [ESTADOS.EN_PROCESO]: '#17a2b8',  // Azul claro
    [ESTADOS.PENDIENTE]: '#ffc107',   // Amarillo
    [ESTADOS.COMPLETADO]: '#28a745',  // Verde
    [ESTADOS.CANCELADO]: '#dc3545'    // Rojo
};

const COLORES_TIEMPO = {
    BUEN_TIEMPO: '#28a745',    // Verde - Menos de 40 min
    TIEMPO_LIMITE: '#ffc107',  // Amarillo - Entre 40-50 min
    ATRASADO: '#dc3545',       // Rojo - Más de 50 min
    NEUTRO: '#6c757d'          // Gris - Estado no definido
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

    // Configurar limpieza periódica cada 5 minutos
    setInterval(() => {
        obtenerPedidosDeStorage();
        if (document.getElementById('buscar-pedido-modal').style.display === 'flex') {
            cargarPedidosRecientes(document.getElementById('orden-selector')?.value || 'reciente-primero');
        }
    }, 5 * 60 * 1000);
}

function invalidarCachePedidos() {
    localStorage.removeItem('pedidos-cache');
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
                <button id="btn-ver-detalle" class="btn-detalle">
                    Ver Detalle Pedido
                </button>
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

    // Usar setTimeout para asegurar que el DOM se haya actualizado
    setTimeout(() => {
        const btnVerDetalle = document.getElementById('btn-ver-detalle');
        if (btnVerDetalle) {
            btnVerDetalle.addEventListener('click', () => {
                mostrarModalDetallePedido(pedido);
            });
        }
    }, 0);

    // Resto de tu código para otros event listeners...
    const btnEditar = document.getElementById('btn-editar-este-pedido');
    const btnGuardar = document.getElementById('btn-guardar-cambios');
    const estadoSelector = document.getElementById('estado-pedido');

    if (btnEditar) btnEditar.addEventListener('click', function () {
        cargarPedidoParaEdicion(pedido);
        document.getElementById('buscar-pedido-modal').style.display = 'none';
    });

    if (btnGuardar) btnGuardar.addEventListener('click', function () {
        guardarCambiosEstado(pedido);
    });

    if (estadoSelector) estadoSelector.addEventListener('change', function () {
        const nuevoEstado = this.value;
        const cancelacionForm = document.getElementById('cancelacion-form');

        if (nuevoEstado === ESTADOS.CANCELADO) {
            cancelacionForm.classList.remove('hidden');
        } else {
            cancelacionForm.classList.add('hidden');
        }

        guardarCambiosEstadoInstantaneo(pedido, nuevoEstado);
    });

    resultado.classList.remove('hidden');
}

function guardarCambiosEstadoInstantaneo(pedido, nuevoEstado) {
    const estadoAnterior = pedido.estado || ESTADOS.PENDIENTE;

    if (nuevoEstado === estadoAnterior) {
        return;
    }

    if (nuevoEstado === ESTADOS.CANCELADO && !confirm('¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.')) {
        document.getElementById('estado-pedido').value = estadoAnterior;
        return;
    }

    pedido.estado = nuevoEstado;
    pedido.fechaUltimaModificacion = new Date().toISOString();

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

    actualizarPedidoEnStorage(pedido);

    const mensajeEstado = {
        [ESTADOS.PENDIENTE]: 'marcado como pendiente',
        [ESTADOS.COMPLETADO]: 'marcado como completado',
        [ESTADOS.CANCELADO]: 'cancelado'
    };

    mostrarNotificacion(`Pedido ${pedido.codigo} ${mensajeEstado[nuevoEstado]} exitosamente`, 'success', 3000);

    cachePedidosOrdenados = null;
    ultimoOrden = null;
    actualizarListaRecientesInstantanea();

    if (typeof actualizarListaPedidos === 'function') {
        actualizarListaPedidos();
    }

    if (nuevoEstado === ESTADOS.CANCELADO) {
        const btnEditar = document.getElementById('btn-editar-este-pedido');
        const btnGuardar = document.getElementById('btn-guardar-cambios');
        const estadoSelector = document.getElementById('estado-pedido');

        if (btnEditar) btnEditar.disabled = true;
        if (btnGuardar) btnGuardar.disabled = true;
        if (estadoSelector) estadoSelector.disabled = true;

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
        let pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        const ahora = new Date();
        const tresDiasEnMilisegundos = 3 * 24 * 60 * 60 * 1000;

        const pedidosFiltrados = pedidos.filter(pedido => {
            if (pedido.estado === ESTADOS.CANCELADO && pedido.fechaCancelacion) {
                const fechaCancelacion = new Date(pedido.fechaCancelacion);
                const diferenciaTiempo = ahora - fechaCancelacion;
                return diferenciaTiempo <= tresDiasEnMilisegundos;
            }
            return true;
        });

        if (pedidosFiltrados.length < pedidos.length) {
            localStorage.setItem('pedidos', JSON.stringify(pedidosFiltrados));
            mostrarNotificacion(
                `${pedidos.length - pedidosFiltrados.length} pedido(s) cancelado(s) con más de 3 días han sido eliminados.`,
                'info',
                3000
            );
        }

        return Array.isArray(pedidosFiltrados) ? pedidosFiltrados : [];
    } catch (error) {
        console.error('Error al parsear pedidos de localStorage:', error);
        return [];
    }
}

function actualizarPedidoEnStorage(pedido) {
    if (!esPedidoValido(pedido)) {
        console.error('Intento de guardar un pedido inválido:', pedido);
        return;
    }

    const pedidos = obtenerPedidosDeStorage();
    const indicePedido = pedidos.findIndex(p => p.codigo === pedido.codigo);

    if (indicePedido !== -1) {
        pedidos[indicePedido] = pedido;
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
        cachePedidosOrdenados = null;
        ultimoOrden = null;
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
    cachePedidosOrdenados = null;
    ultimoOrden = null;
    cargarPedidosRecientes(ordenSeleccionado);
}

function cargarPedidoParaEdicion(pedido) {
    window.pedidoEnEdicion = {
        datosOriginales: JSON.parse(JSON.stringify(pedido)),
        datosEditados: JSON.parse(JSON.stringify(pedido))
    };

    window.pedidoActual = window.pedidoEnEdicion.datosEditados;

    const pedidoCodigo = document.getElementById('pedido-codigo');
    const pedidoNotas = document.getElementById('pedido-notas-input');
    const codigoDescuentoInput = document.getElementById('codigo-descuento');

    if (pedidoCodigo) {
        pedidoCodigo.textContent = pedido.codigo;
    }

    if (pedidoNotas) {
        pedidoNotas.value = pedido.notas || '';
    }

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

    cachePedidosOrdenados = null;
    ultimoOrden = null;

    if (ordenSeleccionado.includes('estado-')) {
        const estadoBuscado = ordenSeleccionado.split('-')[1];
        const cantidad = pedidos.filter(p => (p.estado || ESTADOS.PENDIENTE) === ESTADOS[estadoBuscado.toUpperCase()]).length;

        if (cantidad === 0) {
            const mensajes = {
                'pendiente': 'No hay pedidos pendientes en este momento',
                'completado': 'No hay pedidos completados en este momento',
                'cancelado': 'No hay pedidos cancelados en este momento'
            };
            mostrarNotificacion(mensajes[estadoBuscado], 'info', 3000);
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
            pedidosOrdenados = pedidos.sort((a, b) => b.codigo.localeCompare(b.codigo));
            break;
        default:
            pedidosOrdenados = pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    cachePedidosOrdenados = pedidosOrdenados;
    ultimoOrden = ordenSeleccionado;
    renderizarListaPedidos(pedidosOrdenados, pagina);
}

// aqui empieza lo de pedidos y sus temporizador

function crearModalDetallePedido() {
    // Verificar si el modal ya existe
    if (document.getElementById('detalle-pedido-modal')) return;

    const modalHTML = `
    <div class="modal" id="detalle-pedido-modal">
        <div class="modal-content pedido-modal">
            <div class="modal-header">
                <h2>Detalle del Pedido <span id="detalle-codigo"></span></h2>
                <span class="close-modal">&times;</span>
            </div>
            
            <div class="pedido-tiempo-container">
                <div class="tiempo-transcurrido">
                    <span id="tiempo-pedido">00:00:00</span>
                     <div id="tiempo-mensaje" class="tiempo-mensaje"></div>
                </div>
                <div class="tiempo-meta">
                    <small>Tiempo meta: 30-40 minutos</small>
                </div>
            </div>
            
            <div class="pedido-productos-container">
                <h3>Productos</h3>
                <ul id="lista-productos-pedido"></ul>
            </div>
            
            <div class="pedido-total">
                <strong>Total:</strong> $<span id="detalle-total">0.00</span>
            </div>
            
            <div class="pedido-acciones">
                <button id="btn-completar-pedido" class="btn-completar">
                    <i class="fas fa-check-circle"></i> Marcar como Completado
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Configurar eventos del modal
    const modal = document.getElementById('detalle-pedido-modal');
    const closeBtn = modal.querySelector('.close-modal');

    closeBtn.addEventListener('click', () => cerrarModalDetalle());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalDetalle();
    });

    // Configurar botón de completar
    document.getElementById('btn-completar-pedido').addEventListener('click', completarPedidoDesdeModal);
}


function mostrarModalDetallePedido(pedido) {
    crearModalDetallePedido();
    const modal = document.getElementById('detalle-pedido-modal');

    // Actualizar información básica
    document.getElementById('detalle-codigo').textContent = `#${pedido.codigo}`;
    document.getElementById('detalle-total').textContent = pedido.total.toFixed(2);

    // Mostrar productos
    const listaProductos = document.getElementById('lista-productos-pedido');
    listaProductos.innerHTML = '';

    pedido.items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'producto-item';
        li.innerHTML = `
            <span class="producto-nombre">${item.nombre}</span>
            <span class="producto-cantidad">${item.cantidad} x $${item.precio.toFixed(2)}</span>
        `;
        listaProductos.appendChild(li);
    });

    // Configurar botón según estado
    const btnCompletar = document.getElementById('btn-completar-pedido');
    btnCompletar.disabled = pedido.estado === ESTADOS.COMPLETADO || pedido.estado === ESTADOS.CANCELADO;

    if (pedido.estado === ESTADOS.COMPLETADO) {
        btnCompletar.innerHTML = '<i class="fas fa-check-circle"></i> Pedido Completado';
    } else if (pedido.estado === ESTADOS.CANCELADO) {
        btnCompletar.innerHTML = '<i class="fas fa-times-circle"></i> Pedido Cancelado';
    } else {
        btnCompletar.innerHTML = '<i class="fas fa-check-circle"></i> Marcar como Completado';
    }

    // Iniciar/actualizar temporizador
    iniciarTemporizador(pedido);

    modal.style.display = 'flex';
}

function iniciarTemporizador(pedido) {
    if (window.temporizadorPedido) {
        clearInterval(window.temporizadorPedido);
        window.temporizadorPedido = null;
    }

    const elemento = document.getElementById('tiempo-pedido');
    const contenedorTiempo = document.querySelector('.tiempo-transcurrido');
    const mensajeElement = document.getElementById('tiempo-mensaje');

    if (!elemento || !contenedorTiempo || !mensajeElement) return;

    const fechaPedido = new Date(pedido.fecha);

    const actualizarTiempo = () => {
        const ahora = new Date();
        const diferencia = ahora - fechaPedido;
        const minutosTranscurridos = diferencia / (1000 * 60);

        elemento.textContent = formatearTiempo(diferencia);
        actualizarMensajeTiempo(minutosTranscurridos);

        // Actualizar colores y estilos según tiempo
        if (minutosTranscurridos < 25) {
            contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.BUEN_TIEMPO;
            elemento.title = "Tiempo óptimo de preparación";
        } else if (minutosTranscurridos < 40) {
            contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.TIEMPO_LIMITE;
            elemento.title = "¡Preparación en tiempo límite!";
        } else {
            contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.ATRASADO;
            elemento.title = "¡Pedido atrasado! Prioridad máxima";
            
            // Efecto visual para pedidos muy atrasados
            if (minutosTranscurridos > 45) {
                contenedorTiempo.style.animation = "pulse 1s infinite";
            }
        }
    };

    if (pedido.estado === ESTADOS.COMPLETADO && pedido.fechaCompletado) {
        const tiempoFinal = new Date(pedido.fechaCompletado) - fechaPedido;
        const minutosFinal = tiempoFinal / (1000 * 60);
        elemento.textContent = formatearTiempo(tiempoFinal);

        // Evaluación del tiempo final
        if (minutosFinal <= 30) {
            contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.BUEN_TIEMPO;
            mensajeElement.textContent = `Pedido completado en ${Math.round(minutosFinal)} min (Óptimo)`;
        } else if (minutosFinal <= 40) {
            contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.TIEMPO_LIMITE;
            mensajeElement.textContent = `Pedido completado en ${Math.round(minutosFinal)} min (Límite)`;
        } else {
            contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.ATRASADO;
            mensajeElement.textContent = `Pedido completado en ${Math.round(minutosFinal)} min (Atrasado)`;
        }
        
        elemento.title = `Tiempo total: ${Math.round(minutosFinal)} minutos`;
    } else if (pedido.estado === ESTADOS.CANCELADO) {
        elemento.textContent = "Cancelado";
        contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.NEUTRO;
        mensajeElement.textContent = "Pedido cancelado";
        elemento.title = "Este pedido fue cancelado";
    } else {
        contenedorTiempo.style.backgroundColor = COLORES_TIEMPO.BUEN_TIEMPO;
        actualizarTiempo();
        window.temporizadorPedido = setInterval(actualizarTiempo, 1000);
    }
}

function cerrarModalDetalle() {
    const modal = document.getElementById('detalle-pedido-modal');
    modal.style.display = 'none';

    if (window.temporizadorPedido) {
        clearInterval(window.temporizadorPedido);
        window.temporizadorPedido = null;
    }
}

function actualizarTemporizador(pedido) {
    // Detener temporizador anterior si existe
    if (window.temporizadorPedido) {
        clearInterval(window.temporizadorPedido);
    }

    const elemento = document.getElementById('tiempo-pedido');
    if (!elemento) return;

    const fechaPedido = new Date(pedido.fecha);
    const ahora = new Date();
    let diferencia = ahora - fechaPedido;

    // Función para actualizar el display
    const actualizarDisplay = () => {
        elemento.textContent = formatearTiempo(diferencia);
        diferencia += 1000; // Añadir 1 segundo
    };

    // Actualizar inmediatamente
    actualizarDisplay();

    // Iniciar temporizador solo si el pedido está pendiente
    if (pedido.estado === ESTADOS.PENDIENTE || !pedido.estado) {
        window.temporizadorPedido = setInterval(actualizarDisplay, 1000);
    } else if (pedido.estado === ESTADOS.COMPLETADO && pedido.fechaCompletado) {
        // Mostrar tiempo final si está completado
        const tiempoFinal = new Date(pedido.fechaCompletado) - fechaPedido;
        elemento.textContent = formatearTiempo(tiempoFinal);
    }
}


function calcularTiempoTranscurrido(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return fin - inicio;
}

function formatearTiempo(milisegundos) {
    const totalSegundos = Math.floor(milisegundos / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    return [
        horas.toString().padStart(2, '0'),
        minutos.toString().padStart(2, '0'),
        segundos.toString().padStart(2, '0')
    ].join(':');
}

function actualizarMensajeTiempo(minutosTranscurridos) {
    const mensajeElement = document.getElementById('tiempo-mensaje');
    if (!mensajeElement) return;

    if (minutosTranscurridos < 15) {
        mensajeElement.textContent = "Pedido en preparación inicial";
        mensajeElement.style.color = "#28a745"; // Verde
    } else if (minutosTranscurridos < 25) {
        mensajeElement.textContent = "Preparación avanzada - Verificar ingredientes";
        mensajeElement.style.color = "#28a745"; // Verde
    } else if (minutosTranscurridos < 30) {
        mensajeElement.textContent = "¡URGENTE! Pedido debe salir en los próximos 5 minutos";
        mensajeElement.style.color = "#ffc107"; // Amarillo
        mensajeElement.style.fontWeight = "bold";
    } else if (minutosTranscurridos < 40) {
        mensajeElement.textContent = "¡PELIGRO! Pedido en tiempo límite crítico";
        mensajeElement.style.color = "#dc3545"; // Rojo
        mensajeElement.style.fontWeight = "bold";
    } else {
        mensajeElement.textContent = "¡ATRASO GRAVE! Pedido fuera de tiempo aceptable";
        mensajeElement.style.color = "#dc3545"; // Rojo
        mensajeElement.style.fontWeight = "bold";
        mensajeElement.style.animation = "blink 1s infinite"; // Añade animación de parpadeo
    }
}

function completarPedidoDesdeModal() {
    const codigo = document.getElementById('detalle-codigo').textContent.replace('#', '');
    const pedido = buscarPedidoPorCodigo(codigo);

    if (!pedido || pedido.estado === ESTADOS.COMPLETADO || pedido.estado === ESTADOS.CANCELADO) {
        return;
    }

    // Confirmar antes de completar
    if (!confirm(`¿Marcar el pedido #${codigo} como completado?`)) {
        return;
    }

    // Actualizar estado
    pedido.estado = ESTADOS.COMPLETADO;
    pedido.fechaCompletado = new Date().toISOString();
    pedido.fechaUltimaModificacion = new Date().toISOString();

    // Guardar cambios en localStorage
    actualizarPedidoEnStorage(pedido);

    // Actualizar UI
    const btnCompletar = document.getElementById('btn-completar-pedido');
    btnCompletar.disabled = true;
    btnCompletar.innerHTML = '<i class="fas fa-check-circle"></i> Pedido Completado';

    // Detener temporizador y mostrar tiempo final
    if (window.temporizadorPedido) {
        clearInterval(window.temporizadorPedido);
        const fechaPedido = new Date(pedido.fecha);
        const fechaCompletado = new Date(pedido.fechaCompletado);
        const tiempoFinal = fechaCompletado - fechaPedido;
        document.getElementById('tiempo-pedido').textContent = formatearTiempo(tiempoFinal);
    }

    // Notificar al dashboard para actualizar métricas
    if (window.dashboardFunctions && window.dashboardFunctions.agregarNuevoPedido) {
        console.log('Enviando pedido al dashboard:', pedido);
        window.dashboardFunctions.agregarNuevoPedido(pedido);
    } else {
        console.warn('Dashboard functions no disponibles. El dashboard no se actualizará dinámicamente.');
        mostrarNotificacion('Pedido completado, pero el dashboard no se actualizó. Recarga la página.', 'warning');
    }

    mostrarNotificacion(`Pedido #${codigo} marcado como completado`, 'success', 3000);

    // Actualizar otras vistas
    if (typeof actualizarListaPedidos === 'function') {
        actualizarListaPedidos();
    }
}

function renderizarListaPedidos(pedidosOrdenados, pagina = 1) {
    const porPagina = 10;
    const lista = document.getElementById('lista-recientes');
    if (!lista) return;

    let controlesContainer = document.getElementById('controles-lista');
    if (!controlesContainer) {
        controlesContainer = document.createElement('div');
        controlesContainer.id = 'controles-lista';
        controlesContainer.className = 'controles-lista';
        lista.parentNode.insertBefore(controlesContainer, lista);
    }

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

    const selector = document.getElementById('orden-selector');
    if (ultimoOrden) {
        selector.value = ultimoOrden;
    } else {
        selector.value = 'reciente-primero';
    }

    if (!selector.hasAttribute('data-configured')) {
        selector.addEventListener('change', function () {
            cargarPedidosRecientes(this.value);
        });
        selector.setAttribute('data-configured', 'true');
    }

    document.getElementById('btn-recargar-pedidos').addEventListener('click', function () {
        cachePedidosOrdenados = null;
        ultimoOrden = null;
        cargarPedidosRecientes(selector.value);
        mostrarNotificacion('Lista de pedidos actualizada', 'info', 2000);
    });

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

function buscarPedidoPorCodigo(codigo) {
    const pedidos = obtenerPedidosDeStorage();
    return pedidos.find(p => p.codigo === codigo);
}

function actualizarPedidoUI() {
    console.log('Actualizando UI del pedido...');
}