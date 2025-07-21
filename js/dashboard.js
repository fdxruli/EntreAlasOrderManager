// Configuración y constantes
deje que chartType = 'barra';
constante META_MENSUAL = 6000;
const META_SEMANAL = META_MENSUAL / 4; // Asumimos 4 semanas por mes
let tipoMetaActual = 'mensual'; // 'mensual' o 'semanal'
deje que metaEventListenerAdded = falso;

// Agregar al inicio del archivo JS, después de las otras constantes
constante GASTOS_TIPOS = [
    { nombre: 'Sueldos', categoria: 'externo' },
    { nombre: 'Renta', categoría: 'externo' },
    { nombre: 'Servicios', categoría: 'externo' },
    { nombre: 'Insumos', categoria: 'inventario' }, // Relacionado con el inventario
    { nombre: 'Mantenimiento', categoría: 'externo' },
    { nombre: 'Publicidad', categoría: 'externo' },
    { nombre: 'Impuestos', categoria: 'externo' },
    { nombre: 'Otros', categoría: 'externo' }
];

constante GASTOS_IDS = {
    FORMULARIO_GASTO: 'formulario-gasto',
    FECHA_GASTO: 'fecha-gasto',
    MONTO_GASTO: 'monto-gasto',
    TIPO_GASTO: 'tipo-gasto',
    DESCRIPCION_GASTO: 'descripcion-gasto',
    TABLA_GASTOS: 'tabla-gastos',
    TOTAL_GASTOS: 'gastos-totales',
    GRAFICO_GASTOS: 'grafico-gastos',
    RESUMEN_GASTOS: 'resumen-gastos'
};

// Configuración de costos de productos
constante COSTOS_PRODUCTOS = {
    'alitas': { costo: 55, precio: 75 },
    'deshuesado': { costo: 45, precio: 70 },
    'papas': { costo: 15, precio: 35 },
    'envio': { costo: 0, precio: 0 } // Costo dinámico que se actualizará
};

constante METAS_CONFIG = {
    mensual: {
        metaVentas: 6000, // Meta de ventas brutas
        metaGanancias: 3000, // Meta de ganancias netas (50% de las ventas como ejemplo)
        etiqueta: 'Mensual',
        colorCompleto: '#4CAF50',
        colorProgreso: '#8BC34A',
        colorFaltante: '#FF5722'
    },
    semanal: {
        metaVentas: 1500, // Meta de ventas brutas
        metaGanancias: 750, // Meta de ganancias netas
        etiqueta: 'Semanal',
        colorCompleto: '#2196F3',
        colorProgreso: '#64B5F6',
        colorFaltante: '#FF9800'
    }
};

// Nuevos IDs para elementos de costos
constante COSTOS_IDS = {
    TOTAL_COSTOS: 'costo-total',
    TOTAL_GANANCIAS: 'ganancias-totales',
    MARGEN_GANANCIAS: 'margen-ganancias',
    TABLA_PRODUCTOS_COSTOS: 'tabla-productos-costos',
    UTILIDAD_NETA: 'utilidad-neta',
    DINERO_CAJA: 'dinero-caja' // Nueva métrica
};

// Función para obtener el costo de un producto
function obtenerCostoProducto(nombreProducto) {
    const nombre = nombreProducto.toLowerCase();

    // Buscar coincidencias en el nombre del producto
    para (const [clave, datos] de Object.entries(COSTOS_PRODUCTOS)) {
        si (nombre.incluye(clave)) {
            devolver datos;
        }
    }

    // Si no se encuentra, retornará valores por defecto
    return { costo: 0, precio: 0 };
}

// Función MODIFICADA para actualizar el tablero principal
función actualizarDashboard() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const topLimitElement = obtenerElemento(IDS.FILTRO_TOP);
    const límite superior = elemento límite superior? parseInt(topLimitElement.valor): 10;

    si (!desde || !hasta) {
        return mostrarNotificacion('Por favor selecciona ambas fechas', 'warning');
    }

    if (nueva Fecha(desde) > nueva Fecha(hasta)) {
        return mostrarNotificacion('La fecha desde no puede ser mayor a la fecha hasta', 'error');
    }

    const pedidos = obtenerPedidos();
    const pedidosFiltrados = pedidos.filter(p => {
        const fechaPedido = new Date(p.fecha).toISOString().split('T')[0];
        return fechaPedido >= desde && fechaPedido <= hasta;
    });

    const totalVentas = pedidosFiltrados.reduce((suma, p) => suma + (p.total || 0), 0);
    const totalPedidos = pedidosFiltrados.length;
    const ticketPromedio = totalPedidos > 0 ? (totalVentas / totalPedidos): 0;
    const totalDescuentos = calcularTotalDescuentos(pedidosFiltrados);
    
    constante {
        topProductos,
        totalProductosVendidos,
        Costos totales,
        totalGanancias,
        margenGananciasGeneral,
        totalEnvios,
        GananciasEnvíos
    } = calcularProductosConCostos(pedidosFiltrados, topLimit);

    const { totalGastosExternos, totalGastosInventario } = actualizarResumenGastos();
    
    // NUEVA LÍGICA: Calcular utilidad neta considerando gastos de inventario
    let utilidadNeta = totalGanancias - totalGastosExternos;
    deje excesoInventario = 0;
    si (totalGastosInventario > totalCostos) {
        excesoInventario = totalGastosInventario - totalCostos;
        utilidadNeta -= excesoInventario; // Restablecer solo el exceso de inventario
    }
    // Dinero en caja sigue igual: total ventas menos todos los gastos
    const dineroCaja = totalVentas - totalGastosExternos - totalGastosInventario;

    actualizarElementosUIConCostos(
        totalVentas,
        totalPedidos,
        ticketPromedio,
        totalDescuentos,
        totalProductosVendidos,
        Costos totales,
        totalGanancias,
        margenGananciasGeneral,
        totalGastosExternos,
        utilidadNeta,
        totalEnvios,
        GananciasEnvios,
        totalGastosInventario,
        dineroCaja,
        excesoInventario // Nueva métrica para mostrar el exceso
    );

    TablaProductos(topActualizarProductos, totalVentas);
    GraficoVentas(pedidos actualizarFiltrados, desde, hasta);
    actualizarGraficoPie(topProductos);
    recalcularMetaDesdeCero();
}

// Función MODIFICADA para actualizar elementos UI
función actualizarElementosUIConCostos(
    totalVentas,
    totalPedidos,
    ticketPromedio,
    totalDescuentos,
    totalProductosVendidos,
    Costos totales,
    totalGanancias,
    margenGanancias,
    totalGastosExternos,
    utilidadNeta,
    totalEnvios = 0,
    GananciasEnvios = 0,
    totalGastosInventario = 0,
    dineroCaja = 0,
    excesoInventario = 0 // Nueva métrica
) {
    totalVentas = asegurarNumero(totalVentas);
    totalPedidos = asegurarNumero(totalPedidos);
    ticketPromedio = asegurarNumero(ticketPromedio);
    totalDescuentos = asegurarNumero(totalDescuentos);
    totalProductosVendidos = asegurarNumero(totalProductosVendidos);
    Costostotal = asegurarNumero(Costostotal);
    totalGanancias = asegurarNumero(totalGanancias);
    margenGanancias = asegurarNumero(margenGanancias);
    totalGastosExternos = asegurarNumero(totalGastosExternos);
    utilidadNeta = asegurarNumero(utilidadNeta);
    totalEnvios = asegurarNumero(totalEnvios);
    gananciasEnvios = asegurarNumero(gananciasEnvios);
    totalGastosInventario = asegurarNumero(totalGastosInventario);
    dineroCaja = asegurarNumero(dineroCaja);
    excesoInventario = asegurarNumero(excesoInventario);

    const ventasElement = document.getElementById('total-ventas');
    if (ventasElement) ventasElement.textContent = formatearMoneda(totalVentas);

    const pedidosElement = document.getElementById('total-pedidos');
    if (pedidosElement) pedidosElement.textContent = totalPedidos.toLocaleString();

    const ticketElement = document.getElementById('ticket-promedio');
    if (elementoTicket) elementoTicket.textContent = formatearMoneda(elementoTicketPromedio);

    const descuentosElement = document.getElementById('total-descuentos');
    if (descuentosElement) descuentosElement.textContent = formatearMoneda(totalDescuentos);

    const productosElement = document.getElementById('total-productos-vendidos');
    if (productosElement) productosElement.textContent = `${totalProductosVendidos.toLocaleString()} productos`;

    const costosElement = document.getElementById('total-costos');
    if (costosElement) costosElement.textContent = formatearMoneda(totalCostos);

    const gananciasElement = document.getElementById('total-ganancias');
    if (gananciasElement) gananciasElement.textContent = formatearMoneda(totalGanancias);

    const margenElement = document.getElementById('margen-ganancias');
    si (margenElement) margenElement.textContent = `${margenGanancias.toFixed(1)}%`;

    const gastosExternosElement = document.getElementById('total-gastos-externos');
    if (gastosExternosElement) gastosExternosElement.textContent = formatearMoneda(totalGastosExternos);

    const gastosInventarioElement = document.getElementById('total-gastos-inventario');
    if (gastosInventarioElement) gastosInventarioElement.textContent = formatearMoneda(totalGastosInventario);

    const utilidadElement = document.getElementById('utilidad-neta');
    si (elementoutilidad) {
        utilidadElement.textContent = formatearMoneda(utilidadNeta);
        utilidadElement.className = utilidadNeta >= 0 ? 'valor-métrico positivo' : 'valor-métrico negativo';
    }

    const envíosElement = document.getElementById('total-envios');
    if (enviosElement) envíosElement.textContent = formatearMoneda(totalEnvios);

    const gananciasEnviosElement = document.getElementById('ganancias-envios');
    if (gananciasEnviosElement) gananciasEnviosElement.textContent = formatearMoneda(gananciasEnvios);

    const dineroCajaElement = document.getElementById('dinero-caja');
    si (dineroCajaElement) {
        dineroCajaElement.textContent = formatearMoneda(dineroCaja);
        dineroCajaElement.className = dineroCaja >= 0 ? 'valor-métrico positivo' : 'valor-métrico negativo';
    }

    // NUEVO: Mostrar exceso de inventario si existe
    const excesoInventarioElement = document.getElementById('exceso-inventario');
    si (excesoInventarioElement) {
        excesoInventarioElement.textContent = formatearMoneda(excesoInventario);
        excesoInventarioElement.className = excesoInventario > 0 ? 'metric-value negativo' : 'metric-value';
    }
}

función obtenerGastos() {
    intentar {
        const gastos = JSON.parse(localStorage.getItem('gastos')) || [];
        console.log('Gastos cargados:', gastos); // registro de depuración
        devolver gastos;
    } captura (error) {
        console.error('Error al leer gastos desde localStorage:', error);
        mostrarNotificacion('Error al cargar los datos de gastos', 'error');
        devolver [];
    }
}

function guardarGastos(gastos) {
    intentar {
        localStorage.setItem('gastos', JSON.stringify(gastos));
        console.log('Gastos guardados:', gastos); // registro de depuración
    } captura (error) {
        console.error('Error al guardar gastos en localStorage:', error);
        mostrarNotificacion('Error al guardar los datos de gastos', 'error');
    }
}

// Función para agregar un nuevo gasto
función agregarGasto(evento) {
    evento.preventDefault();

    console.log('Iniciando agregarGasto'); // registro de depuración

    const fecha = obtenerElemento(GASTOS_IDS.FECHA_GASTO)?.value;
    const monto = parseFloat(obtenerElemento(GASTOS_IDS.MONTO_GASTO)?.value);
    const tipo = obtenerElemento(GASTOS_IDS.TIPO_GASTO)?.value;
    const descripcion = obtenerElemento(GASTOS_IDS.DESCRIPCION_GASTO)?.value;

    // Validar entradas
    si (!fecha) {
        mostrarNotificacion('Por favor selecciona una fecha válida', 'warning');
        console.error('Fecha no válida:', fecha);
        devolver;
    }
    if (isNaN(monto) || monto <= 0) {
        mostrarNotificacion('Por favor ingresa un monto válido mayor a 0', 'warning');
        console.error('Monto no válido:', monto);
        devolver;
    }
    si (!tipo) {
        mostrarNotificacion('Por favor selecciona un tipo de gasto', 'warning');
        console.error('Tipo no seleccionado:', tipo);
        devolver;
    }

    const tipoConfig = GASTOS_TIPOS.find(t => t.nombre === tipo);
    si (!tipoConfig) {
        mostrarNotificacion('Tipo de gasto no válido', 'error');
        console.error('Tipo de gasto no encontrado en GASTOS_TIPOS:', tipo);
        devolver;
    }

    const gastos = obtenerGastos();
    constante nuevoGasto = {
        id: Fecha.ahora(),
        fecha,
        monto,
        tipo,
        categoría: tipoConfig.categoria,
        descripción: descripción || '',
        fechaRegistro: nueva Fecha().toISOString()
    };

    intentar {
        gastos.push(nuevoGasto);
        guardarGastos(gastos);
        mostrarNotificacion('Gasto registrado correctamente', 'éxito');
        console.log('Gasto agregado:', nuevoGasto);

        // Restablecer formulario
        const formulario = obtenerElemento(GASTOS_IDS.FORMULARIO_GASTO);
        si (formulario) {
            formulario.reset();
            const categoriaGastoInput = obtenerElemento('categoria-gasto');
            si (categoriaGastoInput) categoriaGastoInput.valor = '';
        }

        // Actualizar la interfaz de usuario
        actualizarTablaGastos();
        actualizarResumenGastos();
        actualizarDashboard();
    } captura (error) {
        console.error('Error al agregar gasto:', error);
        mostrarNotificacion('Error al registrar el gasto', 'error');
    }
}

// Función para filtrar gastos por fecha
function filtrarGastos(desde, hasta) {
    const gastos = obtenerGastos();

    return gastos.filter(gasto => {
        const fechaGasto = new Fecha(gasto.fecha).toISOString().split('T')[0];
        return (!desde || fechaGasto >= desde) && (!hasta || fechaGasto <= hasta);
    });
}

// Función para eliminar un gasto
función eliminarGasto(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    const gastos = obtenerGastos().filter(gasto => gasto.id !== id);
    guardarGastos(gastos);

    mostrarNotificacion('Gasto eliminado correctamente', 'éxito');
    actualizarTablaGastos();
    actualizarResumenGastos();
    actualizarDashboard();
}

// Función para actualizar la tabla de gastos
función actualizarTablaGastos() {
    const tbody = obtenerElemento(GASTOS_IDS.TABLA_GASTOS);
    si (!tbody) retorna;

    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const gastosFiltrados = filtrarGastos(desde, hasta);

    tbody.innerHTML = '';

    si (gastosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay gastos registrados</td></tr>';
        devolver;
    }

    gastosFiltrados.sort((a, b) => nueva Fecha(b.fecha) - nueva Fecha(a.fecha)).forEach(gasto => {
        constante fila = document.createElement('tr');
        fila.classList.add(`${gasto.categoria}-fila`);
        fila.innerHTML = `
            <td>${nueva Fecha(gasto.fecha).toLocaleDateString('es-ES')}</td>
            <td>${gasto.tipo}</td>
            <td>${gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1)}</td>
            <td class="text-right">${formatearMoneda(gasto.monto)}</td>
            <td>${gasto.descripcion || '-'}</td>
            <td>${nueva Fecha(gasto.fechaRegistro).toLocaleString('es-ES')}</td>
            <td class="text-center">
                <botón class="btn btn-sm btn-peligro" onclick="eliminarGasto(${gasto.id})">
                    <i class="fas fa-trash"></i>
                </botón>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// Función para actualizar el resumen de gastos
función actualizarResumenGastos() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const gastosFiltrados = filtrarGastos(desde, hasta);

    const totalGastosExternos = gastosFiltrados
        .filter(gasto => gasto.categoria === 'externo')
        .reduce((suma, gasto) => suma + gasto.monto, 0);

    const totalGastosInventario = gastosFiltrados
        .filter(gasto => gasto.categoria === 'inventario')
        .reduce((suma, gasto) => suma + gasto.monto, 0);

    const elementoTotalGastosExternos = obtenerElemento('total-gastos-externos');
    si (elementoTotalGastosExternos) {
        elementoTotalGastosExternos.textContent = formatearMoneda(totalGastosExternos);
    }

    const elementoTotalGastosInventario = obtenerElemento('total-gastos-inventario');
    if (elementoTotalGastosInventario) {
        elementoTotalGastosInventario.textContent = formatearMoneda(totalGastosInventario);
    }

    GraficoGastos(gas actualizartosFiltrados);
    retorna { totalGastosExternos, totalGastosInventario };
}

// Función para actualizar el gráfico de gastos
function actualizarGraficoGastos(gastos) {
    const canvas = obtenerElemento(GASTOS_IDS.GRAFICO_GASTOS);
    si (!canvas) retorna;

    const ctx = canvas.getContext('2d');
    si (!ctx) retorna;

    const gastosPorTipoYCategoria = {};
    GASTOS_TIPOS.forEach(tipo => {
        gastosPorTipoYCategoria[tipo.nombre] = { externo: 0, inventario: 0 };
    });

    gastos.forEach(gasto => {
        gastosPorTipoYCategoria[gasto.tipo][gasto.categoria] += gasto.monto;
    });

    const etiquetas = [];
    const datosExternos = [];
    const datosInventario = [];

    GASTOS_TIPOS.forEach(tipo => {
        if (gastosPorTipoYCategoria[tipo.nombre].externo > 0) {
            etiquetas.push(`${tipo.nombre} (Externo)`);
            datosExternos.push(gastosPorTipoYCategoria[tipo.nombre].externo);
            datosInventario.push(0);
        }
        if (gastosPorTipoYCategoria[tipo.nombre].inventario > 0) {
            etiquetas.push(`${tipo.nombre} (Inventario)`);
            datosExternos.push(0);
            datosInventario.push(gastosPorTipoYCategoria[tipo.nombre].inventario);
        }
    });

    si (ventana.graficoGastos) {
        ventana.graficoGastos.destroy();
    }

    si (etiquetas.longitud === 0) {
        ctx.clearRect(0, 0, lienzo.ancho, lienzo.alto);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'centro';
        ctx.font = '16px Arial';
        ctx.fillText('No hay gastos para mostrar', canvas.width / 2, canvas.height / 2);
        devolver;
    }

    intentar {
        ventana.graficoGastos = new Chart(ctx, {
            tipo: 'barra',
            datos: {
                etiquetas: etiquetas,
                conjuntos de datos: [
                    {
                        etiqueta: 'Gastos Externos',
                        datos: datosExternos,
                        color de fondo: '#FF6384',
                        Ancho del borde: 1
                    },
                    {
                        etiqueta: 'Gastos de Inventario',
                        datos: datosInventario,
                        color de fondo: '#36A2EB',
                        Ancho del borde: 1
                    }
                ]
            },
            opciones: {
                responsivo: verdadero,
                complementos: {
                    leyenda: {
                        posición: 'arriba'
                    },
                    información sobre herramientas: {
                        devoluciones de llamada: {
                            etiqueta: función (contexto) {
                                devuelve `${context.dataset.label}: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    }
                },
                escalas: {
                    x: {
                        apilado: verdadero
                    },
                    y: {
                        apilado: verdadero,
                        beginAtZero: verdadero,
                        título: {
                            visualización: verdadero,
                            texto: 'Monto ($)'
                        },
                        garrapatas: {
                            devolución de llamada: función (valor) {
                                retorna formatearMoneda(valor);
                            }
                        }
                    }
                }
            }
        });
    } captura (error) {
        console.error('Error al crear gráfico de gastos:', error);
    }
}

function asegurarNumero(valor, defecto = 0) {
    número constante = parseFloat(valor);
    devolver esNaN(núm)? defecto: número;
}

// Constantes para ID de elementos DOM
constante IDS = {
    MODAL: 'tablero-modal',
    FILTRO_DESDE: 'filtro-fecha-desde',
    FILTRO_HASTA: 'filtro-fecha-hasta',
    FILTRO_TOP: 'filtro-top-productos',
    FILTRO_META: 'filtro-tipo-meta',
    BTN_APLICAR: 'btn-aplicar-filtros',
    BTN_CAMBIAR_GRAFICO: 'btn-cambiar-grafico',
    CLOSE_MODAL: '.close-modal',
    TOTAL_VENTAS: 'ventas-totales',
    TOTAL_PEDIDOS: 'pedidos-totales',
    TOTAL_DESCUENTOS: 'total-descuentos',
    TOTAL_PRODUCTOS: 'total-productos-vendidos',
    TICKET_PROMEDIO: 'boleto-promedio',
    TABLA_PRODUCTOS: 'tabla-top-productos',
    VENTAS_CHART: 'gráfico-de-ventas',
    PIE_CHART: 'chart-pie-productos',
    META_CONTAINER_MENSUAL: 'contenedor-meta-mensual',
    META_CONTAINER_SEMANAL: 'contenedor-meta-semanal'
};

// Funciones de utilidad
función obtenerPedidos() {
    intentar {
        const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        pedidos de devolución
            .filter(pedido => pedido.estado === 'completado') // Filtrar solo pedidos completados
            .map(pedido => ({
                ...pedido,
                costoEnvio: asegurarNumero(pedido.costoEnvio),
                precioEnvio: asegurarNumero(pedido.precioEnvio || pedido.costoEnvio)
            }));
    } captura (error) {
        console.error('Error al leer pedidos:', error);
        devolver [];
    }
}

function guardarPedidos(pedidos) {
    intentar {
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
    } captura (error) {
        console.error('Error al guardar pedidos en localStorage:', error);
        mostrarNotificacion('Error al guardar los datos', 'error');
    }
}

function obtenerElemento(id) {
    const elemento = document.getElementById(id) || document.querySelector(id);
    si (!elemento) {
        console.warn(`Elemento no encontrado: ${id}`);
    }
    devolver elemento;
}

función formatearMoneda(valor) {
    devuelve nuevo Intl.NumberFormat('es-MX', {
        estilo: 'moneda',
        moneda: 'MXN'
    }).format(valor);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    notificación const = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <span class="notificación-icono">${{
            'información': 'â„¹ï¸ ',
            'advertencia': 'âš ï¸ ',
            'error': 'â Œ',
            'éxito': 'âœ…'
        }[tipo] || 'â"¹ï¸ '}</span>
        <span class="notificación-texto">${mensaje}</span>
        <button class="notificacion-cerrar">Ã—</button>
    `;

    document.body.appendChild(notificación);

    // Auto-eliminar después de 5 segundos
    establecerTiempo de espera(() => {
        notificacion.classList.add('desvanecer');
        setTimeout(() => notificacion.remove(), 300);
    }, 5000);

    // Cerrar manualmente
    notificacion.querySelector('.notificacion-cerrar').addEventListener('click', () => {
        notificacion.remove();
    });
}

// Función principal para mostrar el tablero
función mostrarDashboard() {
    const modal = obtenerElemento(IDS.MODAL);
    si (!modal) {
        mostrarNotificacion('No se pudo encontrar el modal del tablero', 'error');
        devolver;
    }

    modal.style.display = 'flex';

    // Configurar fechas por defecto (últimos 30 días)
    const hoy = nueva Fecha();
    const hace30Dias = nueva Fecha();
    hace30Dias.setDate(hoy.getDate() - 30);

    const filtroDesde = obtenerElemento(IDS.FILTRO_DESDE);
    const filtroHasta = obtenerElemento(IDS.FILTRO_HASTA);

    if (filtroDesde) filtroDesde.valueAsDate = hace30Dias;
    if (filtroHasta) filtroHasta.valueAsDate = hoy;

    // Configurar oyentes de eventos
    configurarEventListeners();

    // Actualizar panel inicial
    actualizarDashboard();
}

función configurarFormularioGastos() {
    const tipoGastoSelect = obtenerElemento(GASTOS_IDS.TIPO_GASTO);
    const categoriaGastoInput = obtenerElemento('categoria-gasto');

    si (tipoGastoSelect && categoriaGastoInput) {
        // Rellene las opciones de selección
        tipoGastoSelect.innerHTML = `
            <option value="">Seleccionar...</option>
            ${GASTOS_TIPOS.map(tipo => `<option value="${tipo.nombre}">${tipo.nombre}</option>`).join('')}
        `;

        tipoGastoSelect.addEventListener('cambiar', () => {
            const tipoSeleccionado = tipoGastoSelect.value;
            const tipoConfig = GASTOS_TIPOS.find(t => t.nombre === tipoSeleccionado);
            categoriaGastoInput.value = tipoConfig ? tipoConfig.categoria : '';
        });
    } demás {
        console.error('No se encontraron los elementos del formulario de gastos:', {
            tipoGastoSeleccionar,
            categoríaGastoInput
        });
        mostrarNotificacion('Error al configurar el formulario de gastos', 'error');
    }
}

función manejarCambioMeta(evento) {
    // Guardar el nuevo tipo de meta
    tipoMetaActual = evento.objetivo.valor;
    console.log(`Cambiando a meta ${tipoMetaActual}`);

    // Actualizar la interfaz visual
    alternarVistaMeta();

    // Forzar recálculo completo con el nuevo tipo de meta
    recalcularMetaDesdeCero();
}

// 3. Funciones auxiliares para las metas
función calcularDiasTranscurridos(tipoMeta) {
    const hoy = nueva Fecha();
    si (tipoMeta === 'semanal') {
        return hoy.getDay(); // 0 (domingo) a 6 (sábado)
    } demás {
        return hoy.getDate(); // Día del mes
    }
}

function calcularProyeccion(utilidadActual, tipoMeta) {
    const hoy = nueva Fecha();
    let diasTotales, diasTranscurridos;
    
    si (tipoMeta === 'semanal') {
        diasTotales = 7;
        diasTranscurridos = hoy.getDay() || 7; // Si es 0 (domingo), contar como 7
    } demás {
        diasTotales = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        diasTranscurridos = hoy.getDate();
    }
    
    if (diasTranscurridos === 0) return utilidadActual;
    return (utilidadActual / diasTranscurridos) * diasTotales;
}

function generarConsejosMeta(porcentaje, faltante, tipoMeta) {
    deje consejos = [];
    const metaLabel = METAS_CONFIG[tipoMeta].label;
    
    si (porcentaje >= 100) {
        consejos.push(`âœ… Â¡Meta ${metaLabel} alcanzada! Buen trabajo.`);
        consejos.push(`ðŸ” Considera aumentar tu meta para el próximo período.`);
    } else if (porcentaje >= 75) {
        consejos.push(`ðŸ' Vas por buen camino para alcanzar la meta ${metaLabel}.`);
        consejos.push(`ðŸ“ˆ Necesitas ${formatearMoneda(faltante)} más para llegar a la meta.`);
    } else if (porcentaje >= 50) {
        consejos.push(`âš ï¸ Estás la mitad de la meta ${metaLabel}.`);
        consejos.push(`ðŸ'¡ Revisa estrategias para incrementar ventas o reducir gastos.`);
    } demás {
        consejos.push(`ðŸ˜Ÿ Estás por debajo del 50% de la meta ${metaLabel}.`);
        consejos.push(`ðŸš€ Necesitas ${formatearMoneda(faltante)} más. Considera acciones inmediatas.`);
    }
    
    // Consejo adicional basado en el tiempo restante
    const hoy = nueva Fecha();
    if (tipoMeta === 'semanal' && hoy.getDay() >= 5) { // Viernes o después
        consejos.push("â ³ ¡Ãšltimos días de la semana! Enfócate en promociones rápidas.");
    } else if (tipoMeta === 'mensual' && hoy.getDate() > 25) {
        consejos.push("ðŸ“… Final de mes cerca. Revisa gastos y oportunidades finales.");
    }
    
    devolver consejos.map(c => `<div class="meta-tip">${c}</div>`).join('');
}

función recalcularMetaDesdeCero() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;

    si (!desde || !hasta) retorna;

    const pedidos = obtenerPedidos();
    const pedidosFiltrados = pedidos.filter(p => {
        const fechaPedido = new Date(p.fecha).toISOString().split('T')[0];
        return fechaPedido >= desde && fechaPedido <= hasta;
    });

    const totalVentas = pedidosFiltrados.reduce((suma, pedido) => suma + (pedido.total || 0), 0);
    const { totalGastosExternos, totalGastosInventario } = actualizarResumenGastos();
    const { totalCostos, totalGanancias } = calcularProductosConCostos(pedidosFiltrados, 10);
    
    // NUEVA LÉGICA: Calcular utilidad neta para la meta
    let utilidadNeta = totalGanancias - totalGastosExternos;
    si (totalGastosInventario > totalCostos) {
        const excesoInventario = totalGastosInventario - totalCostos;
        utilidadNeta -= excesoInventario; // Restar solo el exceso
    }

    actualizarMeta(totalVentas, tipoMetaActual);
}

function actualizarMeta(ventasPeriodo, tipoMeta) {
    const config = METAS_CONFIG[tipoMeta];
    const { totalGastosExternos, totalGastosInventario } = actualizarResumenGastos();
    const { totalCostos, totalGanancias } = calcularProductosConCostos(obtenerPedidos(), 10);
    
    // NUEVA LÍGICA: Calcular utilidad neta considerando exceso de inventario
    let utilidadNeta = totalGanancias - totalGastosExternos;
    deje excesoInventario = 0;
    si (totalGastosInventario > totalCostos) {
        excesoInventario = totalGastosInventario - totalCostos;
        utilidadNeta -= excesoInventario;
    }

    const porcentaje = Math.min((utilidadNeta / config.metaGanancias) * 100, 100);
    const faltante = Math.max(config.metaGanancias - utilidadNeta, 0);
    const diasTranscurridos = calcularDiasTranscurridos(tipoMeta);
    const proyección = calcularProyeccion(utilidadNeta, tipoMeta);

    constante containerId = `meta-${tipoMeta}-container`;
    const contenedor = document.getElementById(containerId);
    
    si (contenedor) {
        contenedor.innerHTML = `
            <div class="meta-header">
                Meta ${config.label}
                <span class="badge ${utilidadNeta >= config.metaGanancias ? 'bg-success' : 'bg-warning'}">
                    ${porcentaje.toFixed(1)}%
                </span>
            </div>
            
            <div class="meta-detalles">
                <div class="meta-estadísticas">
                    <div class="stat">
                        Meta:
                        <span class="stat-value">${formatearMoneda(config.metaGanancias)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Utilidad Neta:</span>
                        <span class="valor-estadístico ${utilidadNeta >= 0 ? 'texto-éxito' : 'texto-peligro'}">
                            ${formatearMoneda(utilidadNeta)}
                        </span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Falta:</span>
                        <span class="stat-value">${formatearMoneda(faltante)}</span>
                    </div>
                </div>
                
                <div class="contenedor-de-progreso">
                    <div class="progress-bar" style="ancho: ${porcentaje}%;
                        color de fondo: ${porcentaje >= 100 ? config.colorCompleto : config.colorProgreso};">
                        <span class="progress-text">${porcentaje.toFixed(1)}%</span>
                    </div>
                </div>
                
                <div class="estadísticas-meta-secundarias">
                    <div class="stat">
                        <span class="stat-label">Ventas Brutas:</span>
                        ${formatearMoneda(ventasPeriodo)}</span>
                    </div>
                    <div class="stat">
                        Gastos externos:
                        ${formatearMoneda(totalGastosExternos)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Gastos Inventario:</span>
                        ${formatearMoneda(totalGastosInventario)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Exceso de inventario:</span>
                        <span class="stat-value ${excesoInventario > 0 ? 'text-danger' : ''}">
                            ${formatearMoneda(excesoInventario)}
                        </span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Proyección:</span>
                        <span class="stat-value ${proyeccion >= config.metaGanancias ? 'text-success' : 'text-warning'}">
                            ${formatearMoneda(proyeccion)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="meta-tips">
                ${generarConsejosMeta(porcentaje, faltante, tipoMeta)}
            </div>
        `;
    }
}

función alternarVistaMeta() {
    const contenedorMensual = document.getElementById('meta-mensual-container');
    const contenedorSemanal = document.getElementById('meta-semanal-container');

    if (tipoMetaActual === 'mensual') {
        if (contenedorMensual) contenedorMensual.style.display = 'block';
        if (contenedorSemanal) contenedorSemanal.style.display = 'none';
    } demás {
        if (contenedorMensual) contenedorMensual.style.display = 'none';
        if (contenedorSemanal) contenedorSemanal.style.display = 'block';
    }
}

función configurarEventListeners() {
    // Aplicar filtros
    const btnAplicar = obtenerElemento(IDS.BTN_APLICAR);
    si (btnAplicar) {
        btnAplicar.addEventListener('click', actualizarDashboard);
    }

    si (!metaEventListenerAdded) {
        const filtroMeta = document.getElementById('filtro-tipo-meta');
        si (filtroMeta) {
            filtroMeta.addEventListener('cambio', manejarCambioMeta);
            metaEventListenerAdded = verdadero;
        }
    }

    // Cambiar tipo de gráfico
    const btnCambiarGrafico = obtenerElemento(IDS.BTN_CAMBIAR_GRAFICO);
    si (btnCambiarGrafico) {
        btnCambiarGrafico.addEventListener('click', alternarTipoGrafico);
    }

    // Cerrar modal
    const closeModal = obtenerElemento(IDS.CLOSE_MODAL);
    si (cerrarModal) {
        closeModal.addEventListener('clic', () => {
            const modal = obtenerElemento(IDS.MODAL);
            si (modal) modal.style.display = 'ninguno';
        });
    }

    // Filtro de productos top
    const filtroTop = obtenerElemento(IDS.FILTRO_TOP);
    si (filtroTop) {
        filtroTop.addEventListener('cambiar', actualizarDashboard);
    }

    // Filtro de tipo de meta
    const filtroMeta = obtenerElemento(IDS.FILTRO_META);
    si (filtroMeta) {
        filtroMeta.addEventListener('cambio', (e) => {
            tipoMetaActual = e.target.value;
            alternarVistaMeta();
            actualizarDashboard();
        });
    }

    // CAMBIO: Un solo botón para enviar resumen
    const btnEnviarResumen = obtenerElemento('btn-enviar-resumen-detallado');
    si (btnEnviarResumen) {
        btnEnviarResumen.addEventListener('click', enviarResumenDetallado);
    }

    // Filtros de fecha - actualizar el tablero cuando cambien
    const filtroDesde = obtenerElemento(IDS.FILTRO_DESDE);
    const filtroHasta = obtenerElemento(IDS.FILTRO_HASTA);

    si (filtroDesde) {
        filtroDesde.addEventListener('cambiar', actualizarDashboard);
    }

    si (filtroHasta) {
        filtroHasta.addEventListener('cambiar', actualizarDashboard);
    }

    // Cerrar modal al hacer click fuera de él
    const modal = obtenerElemento(IDS.MODAL);
    si (modal) {
        modal.addEventListener('clic', (e) => {
            si (e.target === modal) {
                modal.style.display = 'ninguno';
            }
        });
    }

    // Configurar formulario de gastos
    const formularioGasto = obtenerElemento(GASTOS_IDS.FORMULARIO_GASTO);
    si (formularioGasto) {
        formularioGasto.addEventListener('enviar', (evento) => {
            console.log('Formulario de gastos enviado'); // registro de depuración
            agregarGasto(evento);
        });
    } demás {
        console.error('Formulario de gastos no encontrado:', GASTOS_IDS.FORMULARIO_GASTO);
        mostrarNotificacion('Formulario de gastos no encontrados', 'error');
    }

    // Configurar fecha de gasto por defecto (hoy)
    const fechaGasto = obtenerElemento(GASTOS_IDS.FECHA_GASTO);
    si (fechaGasto) {
        fechaGasto.valueAsDate = new Fecha();
    } demás {
        console.error('Campo de fecha de gasto no encontrado:', GASTOS_IDS.FECHA_GASTO);
    }
}

función alternarTipoGrafico() {
    chartType = chartType === 'barra' ? 'línea' : 'barra';
    actualizarDashboard();

    // Actualizar texto del botón
    const btnCambiar = obtenerElemento(IDS.BTN_CAMBIAR_GRAFICO);
    si (btnCambiar) {
        btnCambiar.textContent = chartType === 'barra'? 'Cambiar a Líneas': 'Cambiar a Barras';
    }
}

function calcularTotalDescuentos(pedidos) {
    devolver pedidos.reduce((suma, pedido) => {
        if (!pedido.descuento || !pedido.items) return suma;

        // Usar calcularTotalConDescuento para obtener el descuento correcto
        window.pedidoActual = pedido; // Asigna temporalmente el pedido para que calcularTotalConDescuento funcione
        const resultadoDescuento = calcularTotalConDescuento();
        ventana.pedidoActual = null; // Limpiar después de usar
        return suma + resultadoDescuento.descuento;
    }, 0);
}

function calcularProductosConCostos(pedidos, limite = 10) {
    const productosMap = {};
    let totalProductosVendidos = 0;
    sea totalCostos = 0;
    sea totalGanancias = 0;
    deje totalEnvios = 0;
    dejargananciasEnvios = 0;
    deje costosEnvios = 0;

    // combo Obtener desde combos.js
    combos constantes = ventana.ComboManager? ventana.ComboManager.cargarCombosGuardados() : [];

    // Definir costos para productos especiales
    const COSTOS_ESPECIALES = {
        alitas: {
            costoPorPieza: 11, // Costo por cada alita
            costoPorGramo: null // No aplica para alitas
        },
        sin hueso: {
            costoPorPieza: 15, // Costo por pieza deshuesada
            costoPorGramo: 0.25 // Costo por gramo de boneless
        }
    };

    pedidos.forEach(pedido => {
        // Calcular costo de envío si existe
        const costoEnvio = asegurarNumero(pedido.costoEnvio);
        const precioEnvio = asegurarNumero(pedido.precioEnvio || 0);
        const gananciaEnvio = precioEnvio - costoEnvio;

        totalEnvios += precioEnvio;
        gananciasEnvios += gananciaEnvio;
        costosEnvios += costoEnvio;

        if (!pedido.items || !Array.isArray(pedido.items)) regresa;

        pedido.items.forEach(item => {
            si (item.esCombo && item.comboId) {
                // Manejar combos (código existente)
                const combo = combos.find(c => String(c.id) === String(item.comboId));
                si (!combo) {
                    console.warn(`Combo con ID ${item.comboId} no encontrado`);
                    devolver;
                }

                const nombre = item.nombre || `Combo ${combo.id}`;
                const cantidad = asegurarNumero(item.cantidad);
                const precioVenta = asegurarNumero(item.precio);
                const totalVenta = precioVenta * cantidad;

                const costoTotalCombo = combo.items.reduce((suma, comboItem) => {
                    const costoUnitario = asegurarNumero(comboItem.costoUnitario);
                    const cantidadItem = asegurarNumero(comboItem.cantidad);
                    return sum + (costoUnitario * cantidadItem);
                }, 0) * cantidad;

                const gananciasCombo = totalVenta - costoTotalCombo;

                si (!productosMap[nombre]) {
                    productosMap[nombre] = {
                        cantidad: 0,
                        total: 0,
                        costo: 0,
                        ganancias: 0,
                        costoUnitario: costoTotalCombo / cantidad,
                        precioUnitario: precioVenta,
                        esCombo: verdadero
                    };
                }

                productosMap[nombre].cantidad += cantidad;
                productosMap[nombre].total += totalVenta;
                productosMap[nombre].costo += costoTotalCombo;
                productosMap[nombre].ganancias += gananciasCombo;

                totalProductosVendidos += cantidad;
                totalCostos += costoTotalCombo;
                totalGanancias += gananciasCombo;
            } else if (item.esEspecial && item.combinaciones) {
                // Manejar productos especiales (alitas/boneless por piezas o gramos)
                const nombre = item.nombre;
                const cantidad = asegurarNumero(item.cantidad);
                const precioVenta = asegurarNumero(item.precio);
                const totalVenta = precioVenta * cantidad;

                // Calcular costo total del pedido especial
                deje costoTotalEspecial = 0;
                
                item.combinaciones.forEach(combinacion => {
                    if (combinacion.producto === 'alitas') {
                        // Alitas siempre por piezas
                        costoTotalEspecial += combinacion.cantidad * COSTOS_ESPECIALES.alitas.costoPorPieza;
                    } else if (combinacion.producto === 'deshuesado') {
                        // Deshuesado puede ser por piezas o gramos
                        if (combinacion.tipoMedida === 'piezas') {
                            costoTotalEspecial += combinacion.cantidad * COSTOS_ESPECIALES.boneless.costoPorPieza;
                        } demás {
                            costoTotalEspecial += combinacion.cantidad * COSTOS_ESPECIALES.boneless.costoPorGramo;
                        }
                    }
                });

                // Multiplicar por la cantidad de veces que se pidió este especial
                costoTotalEspecial *= cantidad;
                const gananciasEspecial = totalVenta - costoTotalEspecial;

                si (!productosMap[nombre]) {
                    productosMap[nombre] = {
                        cantidad: 0,
                        total: 0,
                        costo: 0,
                        ganancias: 0,
                        costoUnitario: costoTotalEspecial / cantidad,
                        precioUnitario: precioVenta,
                        esCombo: falso,
                        esEspecial: verdadero
                    };
                }

                productosMap[nombre].cantidad += cantidad;
                productosMap[nombre].total += totalVenta;
                productosMap[nombre].costo += costoTotalEspecial;
                productosMap[nombre].ganancias += gananciasEspecial;

                totalProductosVendidos += cantidad;
                totalCostos += costoTotalEspecial;
                totalGanancias += gananciasEspecial;
            } demás {
                // Manejar productos individuales normales (código existente)
                const nombre = item.nombre ? item.nombre.split('(')[0].trim() : 'Producto sin nombre';
                const cantidad = asegurarNumero(item.cantidad);
                const precio = asegurarNumero(item.precio);
                const totalVenta = precio * cantidad;

                const datosProducto = obtenerCostoProducto(nombre);
                const costoUnitario = datosProducto.costo;
                const costoTotal = costoUnitario * cantidad;
                const gananciasProducto = totalVenta - costoTotal;

                totalProductosVendidos += cantidad;
                totalCostos += costoTotal;
                totalGanancias += gananciasProducto;

                si (!productosMap[nombre]) {
                    productosMap[nombre] = {
                        cantidad: 0,
                        total: 0,
                        costo: 0,
                        ganancias: 0,
                        costoUnitario: costoUnitario,
                        precioUnitario: precio,
                        esCombo: falso,
                        esEspecial: falso
                    };
                }

                productosMap[nombre].cantidad += cantidad;
                productosMap[nombre].total += totalVenta;
                productosMap[nombre].costo += costoTotal;
                productosMap[nombre].ganancias += gananciasProducto;
            }
        });
    });

    // Calcular el margen general
    const totalVentasPeriodo = pedidos.reduce((suma, p) => suma + (p.total || 0), 0);
    const margenGeneral = totalVentasPeriodo > 0 ?
        ((totalGanancias + gananciasEnvios) / totalVentasPeriodo) * 100 : 0;

    // Preparar productos para la tabla
    const topProductos = Object.entries(productosMap)
        .map(([nombre, datos]) => ({
            nombre,
            ...datos,
            margenGanancia: datos.total > 0 ? ((datos.ganancias / datos.total) * 100): 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limite);

    devolver {
        topProductos,
        totalProductosVendidos,
        totalCostos: totalCostos + costosEnvios,
        totalGanancias: totalGanancias + gananciasEnvios,
        totalEnvios,
        GananciasEnvios,
        costosEnvios,
        margenGananciasGeneral: margenGeneral
    };
}

function actualizarGraficoPie(productos) {
    const canvas = obtenerElemento(IDS.PIE_CHART);
    si (!canvas) retorna;

    const ctx = canvas.getContext('2d');
    si (!ctx) retorna;

    // Destruir gráfico anterior si existe
    si (ventana.pieChartProductos) {
        ventana.pieChartProductos.destroy();
    }

    // Filtrar productos (excluir envíos si existen)
    const productosFiltrados = productos.filter(p => p.nombre !== 'Envíos');

    si (productosFiltrados.length === 0) {
        // Mostrar mensaje si no hay productos
        ctx.clearRect(0, 0, lienzo.ancho, lienzo.alto);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'centro';
        ctx.font = '16px Arial';
        ctx.fillText('No hay productos para mostrar', canvas.width / 2, canvas.height / 2);
        devolver;
    }

    constantes colores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#66BB6A', '#EF5350',
        '#29B6F6', '#AB47BC', '#FFA726', '#8D6E63'
    ];

    intentar {
        ventana.pieChartProductos = new Chart(ctx, {
            tipo: 'pastel',
            datos: {
                etiquetas: productosFiltrados.map(p => p.nombre),
                conjuntos de datos: [{
                    datos: productosFiltrados.map(p => p.total),
                    backgroundColor: colores.slice(0, productosFiltrados.length),
                    color del borde: '#fff',
                    Ancho del borde: 2
                }]
            },
            opciones: {
                responsivo: verdadero,
                mantenerRelaciónDeAspecto: falso,
                complementos: {
                    información sobre herramientas: {
                        devoluciones de llamada: {
                            etiqueta: función (contexto) {
                                devuelve `${contexto.etiqueta}: ${formatearMoneda(contexto.raw)}`;
                            }
                        }
                    },
                    leyenda: {
                        posición: 'derecha',
                        etiquetas: {
                            Ancho de caja: 15,
                            relleno: 10
                        }
                    }
                }
            }
        });
    } captura (error) {
        console.error('Error al crear gráfico de productos:', error);
        mostrarNotificacion('Error al crear el gráfico de productos', 'error');
    }
}

function actualizarMetaMensual(ventasPeriodo) {
    actualizarMeta(ventasPeriodo, 'mensual');
}

function actualizarMetaSemanal(ventasPeriodo) {
    Meta(ventasPeriodo, 'semanal');
}

function actualizarTablaProductos(productos, totalVentas) {
    const tbody = document.getElementById('tabla-productos-costos');
    si (!tbody) retorna;

    tbody.innerHTML = '';

    si (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos para mostrar</td></tr>';
        devolver;
    }

    productos.forEach(producto => {
        constante porcentajeVentas = totalVentas > 0 ? ((producto.total / totalVentas) * 100).toFixed(1) : '0.0';
        constante fila = document.createElement('tr');

        // Clases CSS según tipo de producto
        if (producto.nombre === 'Envíos') {
            fila.classList.add('envio-fila');
        } else if (producto.esCombo) {
            fila.classList.add('combo-fila');
        } else if (producto.esEspecial) {
            fila.classList.add('fila-especial');
        }

        deje que colorMargen = 'texto-éxito';
        if (producto.margenGanancia < 30) colorMargen = 'text-peligro';
        else if (producto.margenGanancia < 50) colorMargen = 'text-warning';

        fila.innerHTML = `
            <td>${producto.nombre}
                ${producto.nombre === 'Envíos' ? ' <i class="fas fa-truck"></i>' :
                 producto.esCombo ? ' <i class="fas fa-box"></i>' :
                 producto.esEspecial? ' <i class="fas fa-star"></i>' : ''}
            </td>
            <td class="text-right">${producto.cantidad.toLocaleString()}</td>
            <td class="text-right">${formatearMoneda(producto.total)}</td>
            <td class="text-right">${formatearMoneda(producto.costo)}</td>
            <td class="text-right ${producto.ganancias >= 0 ? 'texto-éxito' : 'texto-peligro'}">
                ${formatearMoneda(producto.ganancias)}
            </td>
            <td class="text-right ${colorMargen}">${producto.margenGanancia.toFixed(1)}%</td>
            <td class="text-right">${porcentaje de ventas}%</td>
        `;
        tbody.appendChild(fila);
    });
}

function actualizarGraficoVentas(pedidos, desde, hasta) {
    const canvas = obtenerElemento(IDS.VENTAS_CHART);
    si (!canvas) retorna;

    const ctx = canvas.getContext('2d');
    si (!ctx) retorna;

    // Generar matriz de fechas
    const fechas = [];
    const inicio = nueva Fecha(desde);
    const fin = new Date(hasta);

    for (let fecha = new Fecha(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
        fechas.push(fecha.toLocaleDateString('es-ES', {
            día: 'numérico',
            mes: 'corto'
        }));
    }

    // Inicializar ventas por fecha
    const ventasPorFecha = {};
    fechas.forEach(fecha => {
        ventasPorFecha[fecha] = 0;
    });

    // Calcular ventas por fecha
    pedidos.forEach(pedido => {
        const fechaPedido = new Date(pedido.fecha).toLocaleDateString('es-ES', {
            día: 'numérico',
            mes: 'corto'
        });

        if (ventasPorFecha[fechaPedido] !== undefinido) {
            ventasPorFecha[fechaPedido] += pedido.total || 0;
        }
    });

    // Destruir gráfico anterior si existe
    si (ventana.ventasChart) {
        ventana.ventasChart.destroy();
    }

    // Configuración de colores según tipo de gráfico
    constantes colores = {
        bar: {
            colorDeFondo: 'rgba(54, 162, 235, 0.7)',
            color del borde: 'rgba(54, 162, 235, 1)'
        },
        línea: {
            colorDeFondo: 'rgba(75, 192, 192, 0.2)',
            color del borde: 'rgba(75, 192, 192, 1)'
        }
    };

    // Crear nuevo gráfico
    intentar {
        ventana.ventasChart = new Chart(ctx, {
            tipo: tipográfico,
            datos: {
                etiquetas: fechas,
                conjuntos de datos: [{
                    etiqueta: 'Ventas por día',
                    datos: fechas.map(fecha => ventasPorFecha[fecha]),
                    backgroundColor: colores[tipográfico].backgroundColor,
                    borderColor: colores[chartType].borderColor,
                    Ancho del borde: 2,
                    relleno: chartType === 'línea',
                    tensión: 0,4
                }]
            },
            opciones: {
                responsivo: verdadero,
                mantenerRelaciónDeAspecto: falso,
                complementos: {
                    información sobre herramientas: {
                        devoluciones de llamada: {
                            etiqueta: función (contexto) {
                                devuelve `Ventas: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    },
                    leyenda: {
                        posición: 'arriba'
                    }
                },
                escalas: {
                    y: {
                        beginAtZero: verdadero,
                        título: {
                            visualización: verdadero,
                            texto: 'Monto ($)'
                        },
                        garrapatas: {
                            devolución de llamada: función (valor) {
                                retorna formatearMoneda(valor);
                            }
                        }
                    },
                    x: {
                        título: {
                            visualización: verdadero,
                            texto: 'Fecha'
                        },
                        red: {
                            visualización: falso
                        }
                    }
                }
            }
        });
    } captura (error) {
        console.error('Error al crear gráfico de ventas:', error);
        mostrarNotificacion('Error al crear el gráfico de ventas', 'error');
    }
}

// Función MODIFICADA para enviar el resumen detallado
function enviarResumenDetallado() {
    intentar {
        const pedidos = obtenerPedidos();
        const gastos = obtenerGastos();
        const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
        const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;

        si (!desde || !hasta) {
            mostrarNotificacion('Por favor selecciona las fechas para generar el resumen', 'warning');
            devolver;
        }

        const fechaInicio = new Fecha(desde);
        const fechaFin = nueva Fecha(hasta);
        
        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
            mostrarNotificacion('Fechas no válidas', 'error');
            devolver;
        }

        const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
        const pedidosFiltrados = pedidos.filter(p => {
            const fechaPedido = new Date(p.fecha).toISOString().split('T')[0];
            return fechaPedido >= desde && fechaPedido <= hasta;
        });

        const gastosFiltrados = filtrarGastos(desde, hasta);

        if (pedidosFiltrados.length === 0 && gastosFiltrados.length === 0) {
            mostrarNotificacion('No hay datos en el rango de fechas seleccionado', 'warning');
            devolver;
        }

        const totalVentas = pedidosFiltrados.reduce((suma, p) => suma + (p.total || 0), 0);
        const totalPedidos = pedidosFiltrados.length;
        const promedioTicket = totalPedidos > 0 ? (totalVentas / totalPedidos): 0;
        const totalDescuentos = calcularTotalDescuentos(pedidosFiltrados);
        const contieneCombos = pedidosFiltrados.some(pedido => pedido.items.some(item => item.esCombo === true));
        const soloCombos = pedidosFiltrados.every(pedido => pedido.items.every(item => item.esCombo === true));

        constante {
            topProductos,
            totalProductosVendidos,
            Costos totales,
            totalGanancias,
            totalEnvios,
            GananciasEnvios,
            margenGananciasGeneral
        } = calcularProductosConCostos(pedidosFiltrados, 10);

        const totalGastosExternos = gastosFiltrados
            .filter(gasto => gasto.categoria === 'externo')
            .reduce((suma, gasto) => suma + gasto.monto, 0);
        const totalGastosInventario = gastosFiltrados
            .filter(gasto => gasto.categoria === 'inventario')
            .reduce((suma, gasto) => suma + gasto.monto, 0);
        
        // NUEVA LÉGICA: Calcular utilidad neta y exceso de inventario
        let utilidadNeta = totalGanancias - totalGastosExternos;
        deje excesoInventario = 0;
        si (totalGastosInventario > totalCostos) {
            excesoInventario = totalGastosInventario - totalCostos;
            utilidadNeta -= excesoInventario;
        }
        const dineroCaja = totalVentas - totalGastosExternos - totalGastosInventario;

        const ventasPorDia = {};
        pedidosFiltrados.forEach(pedido => {
            const fecha = new Date(pedido.fecha).toLocaleDateString('es-ES');
            if (!ventasPorDia[fecha]) {
                ventasPorDia[fecha] = 0;
            }
            ventasPorDia[fecha] += pedido.total || 0;
        });

        const diasSinVentas = diasDiferencia - Object.keys(ventasPorDia).length;
        const porcentajeDiasConVentas = ((diasDiferencia - diasSinVentas) / diasDiferencia * 100).toFixed(1);

        deje que analisisTendencia = '';
        si (diasDiferencia > 7) {
            const mitadPeriodo = new Fecha(fechaInicio.getTime() + (fechaFin - fechaInicio) / 2);
            const ventasPrimeraMitad = pedidosFiltrados
                .filter(p => nueva Fecha(p.fecha) <= mitadPeriodo)
                .reduce((suma, p) => suma + (p.total || 0), 0);
            const ventasSegundaMitad = totalVentas - ventasPrimeraMitad;
            const cambioPorcentual = ventasPrimeraMitad > 0 ?
                ((ventasSegundaMitad - ventasPrimeraMitad) / ventasPrimeraMitad * 100) : 0;
            analisisTendencia = `â€¢ Tendencia ventas: ${cambioPorcentual >= 0 ? 'â†'' : 'â†“'} ${Math.abs(cambioPorcentual).toFixed(1)}% ` +
                               `(${formatearMoneda(ventasPrimeraMitad)} â†' ${formatearMoneda(ventasSegundaMitad)})\n`;
        }

        deje que el periodo comparativo anterior sea igual a '';
        intentar {
            const periodoAnterior = calcularComparativaPeriodoAnterior(desde, hasta, pedidos);
            si (periodoAnterior) {
                const cambioVentas = periodoAnterior.totalVentas > 0 ?
                    ((totalVentas - periodoAnterior.totalVentas) / periodoAnterior.totalVentas * 100) : 0;
                comparativaPeriodoAnterior = `â€¢ Comparativa con periodo anterior (${periodoAnterior.dias} días):\n` +
                    ` - Ventas: ${cambioVentas >= 0 ? '+' : ''}${cambioVentas.toFixed(1)}%\n` +
                    ` - Pedidos: ${periodoAnterior.totalPedidos > 0 ?
                        ((totalPedidos - periodoAnterior.totalPedidos) / periodoAnterior.totalPedidos * 100).toFixed(1) : 'N/A'}%\n` +
                    ` - Promedio del ticket: ${periodoAnterior.ticketPromedio > 0 ?
                        ((promedioTicket - periodoAnterior.ticketPromedio) / periodoAnterior.ticketPromedio * 100).toFixed(1) : 'N/A'}%\n`;
            }
        } captura (e) {
            console.error('Error al calcular comparativa:', e);
        }

        deje metaCalculada;
        if (tipoMetaActual === 'mensual') {
            const diasEnMes = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 0).getDate();
            metaCalculada = (META_MENSUAL / diasEnMes) * diasDiferencia;
        } demás {
            metaCalculada = (META_SEMANAL / 7) * diasDiferencia;
        }

        const porcentajeMeta = (totalVentas / metaCalculada) * 100;

        const fechaFormateada = `${fechaInicio.toLocaleDateString('es-ES')} - ${fechaFin.toLocaleDateString('es-ES')}`;
        let mensaje = `ðŸ“Š *REPORTE DETALLADO*\n`;
        mensaje += `ðŸ“… *Período:* ${fechaFormateada} (${diasDiferencia} días)\n\n`;

        mensaje += `ðŸ'° *RESUMEN FINANCIERO*\n`;
        mensaje += `â€¢ Ventas totales: ${formatearMoneda(totalVentas)}\n`;
        mensaje += `â€¢ Costos de producción: ${formatearMoneda(totalCostos)}\n`;
        mensaje += `â€¢ Gastos externos: ${formatearMoneda(totalGastosExternos)}\n`;
        mensaje += `â€¢ Gastos de inventario: ${formatearMoneda(totalGastosInventario)}\n`;
        mensaje += `â€¢ Exceso de inventario: ${formatearMoneda(excesoInventario)}\n`;
        mensaje += `â€¢ Ganancias brutas: ${formatearMoneda(totalGanancias)}\n`;
        mensaje += `â€¢ Ganancias netas: ${formatearMoneda(utilidadNeta)}\n`;
        mensaje += `â€¢ Dinero en caja: ${formatearMoneda(dineroCaja)}\n`;
        mensaje += `â€¢ Margen de ganancia: ${margenGananciasGeneral.toFixed(1)}%\n`;
        si (totalDescuentos > 0) {
            let descuentoTexto = `â€¢ Descuentos aplicados: ${formatearMoneda(totalDescuentos)}`;
            if (contieneCombos && !soloCombos) {
                descuentoTexto += ' (aplicado a productos no combos)';
            } de lo contrario si (soloCombos) {
                descuentoTexto += '(no aplicable, combos solo)';
            }
            mensaje += `${descuentoTexto}\n`;
        }
        mensaje += `â€¢ Ventas por envíos: ${formatearMoneda(totalEnvios)}\n`;
        mensaje += `â€¢ Ganancias por envíos: ${formatearMoneda(gananciasEnvios)}\n\n`;

        si (análisisTendencia) {
            mensaje += `ðŸ“ˆ *ANÍLISIS DE TENDENCIAS*\n`;
            mensaje += analisisTendencia;
        }

        si (comparativaPeriodoAnterior) {
            mensaje += `ðŸ” *COMPARATIVA*\n`;
            mensaje += comparativaPeriodoAnterior;
        }

        si (gastosFiltrados.length > 0) {
            mensaje += `ðŸ'¸ *GASTOS POR CATEGORÍA A*\n`;
            const gastosPorTipo = {};
            GASTOS_TIPOS.forEach(tipo => {
                gastosPorTipo[tipo.nombre] = { externo: 0, inventario: 0 };
            });

            gastosFiltrados.forEach(gasto => {
                if (gasto.categoria === 'externo') {
                    gastosPorTipo[gasto.tipo].externo += gasto.monto;
                } demás {
                    gastosPorTipo[gasto.tipo].inventario += gasto.monto;
                }
            });

            const gastosOrdenados = Object.entries(gastosPorTipo)
                .filter(([_, montos]) => montos.externo > 0 || montos.inventario > 0)
                .sort((a, b) => (b[1].externo + b[1].inventario) - (a[1].externo + a[1].inventario));

            gastosOrdenados.forEach(([tipo, montos], index) => {
                si (montos.externo > 0) {
                    mensaje += `${índice + 1}. ${tipo} (Externo): ${formatearMoneda(montos.externo)}\n`;
                }
                si (montos.inventario > 0) {
                    mensaje += `${índice + 1}. ${tipo} (Inventario): ${formatearMoneda(montos.inventario)}\n`;
                }
            });

            mensaje += `\n`;
        }

        mensaje += `ðŸ“‹ *ESTADÍSTICAS GENERALES*\n`;
        mensaje += `â€¢ Total de pedidos: ${totalPedidos.toLocaleString()}\n`;
        mensaje += `â€¢ Productos vendidos: ${totalProductosVendidos.toLocaleString()}\n`;
        mensaje += `â€¢ Boleto promedio: ${formatearMoneda(promedioTicket)}\n`;
        mensaje += `â€¢ Promedio diario: ${formatearMoneda(totalVentas / diasDiferencia)}\n\n`;

        mensaje += `ðŸŽ¯ *PROGRESO DE META*\n`;
        mensaje += `â€¢ Meta ${tipoMetaActual}: ${formatearMoneda(metaCalculada)}\n`;
        mensaje += `â€¢ Progreso: ${porcentajeMeta.toFixed(1)}%\n`;
        mensaje += `â€¢ ${porcentajeMeta >= 100 ? 'âœ… Meta alcanzada' : 'âš ï¸ Meta no alcanzada'}\n\n`;

        mensaje += `ðŸ † *TOP 5 PRODUCTOS MÁS VENDIDOS*\n`;
        topProductos.slice(0, 5).forEach((producto, index) => {
            mensaje += `${índice + 1}. *${producto.nombre}${producto.esCombo ? ' (Combinación)' : ''}*\n`;
            mensaje += ` â€¢ Cantidad: ${producto.cantidad.toLocaleString()}\n`;
            mensaje += ` â€¢ Ventas: ${formatearMoneda(producto.total)}\n`;
            mensaje += ` â€¢ Ganancias: ${formatearMoneda(producto.ganancias)}\n`;
            mensaje += ` â€¢ Margen: ${producto.margenGanancia.toFixed(1)}%\n\n`;
        });

        si (mensaje.length > 50000) {
            const mensajeOriginal = mensaje;
            mensaje = mensaje.substring(0, 45000) + "\n\n... [RESUMEN ACORTADO POR LÍMITES DE CARACTERES] ...\n";
            const partesImportantes = [
                mensajeOriginal.match(/ðŸ“Š.*?\n\n/)[0],
                mensajeOriginal.match(/ðŸ'°.*?\n\n/)[0],
                mensajeOriginal.match(/ðŸŽ¯.*?\n\n/)[0],
                mensajeOriginal.match(/ðŸ †.*?%\n\n/)[0]
            ].join('\n');
            mensaje = partesImportantes + "\n\n... [RESUMEN COMPLETO DEMASIADO EXTENSO] ...";
        }

        mensaje += `â ° *Generado el ${new Date().toLocaleString('es-ES')}*`;

        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        ventana.open(url, '_blank');
    } captura (error) {
        console.error('Error generando resumen:', error);
        mostrarNotificacion('Error al generar el resumen', 'error');
    }
}

function calcularComparativaPeriodoAnterior(desde, hasta, todosPedidos) {
    const fechaInicio = new Fecha(desde);
    const fechaFin = nueva Fecha(hasta);
    const duracionDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calcular fechas del período anterior
    const fechaInicioAnterior = new Fecha(fechaInicio);
    fechaInicioAnterior.setDate(fechaInicio.getDate() - duracionDias);
    
    const fechaFinAnterior = new Fecha(fechaInicio);
    fechaFinAnterior.setDate(fechaInicio.getDate() - 1);
    
    // Filtrar pedidos del período anterior
    const pedidosAnterior = todosPedidos.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
        const desdeAnterior = fechaInicioAnterior.toISOString().split('T')[0];
        const hastaAnterior = fechaFinAnterior.toISOString().split('T')[0];
        return fechaPedido >= desdeAnterior && fechaPedido <= hastaAnterior;
    });
    
    si (pedidosAnterior.length === 0) retorna nulo;
    
    // Calcular métricas del período anterior
    const totalVentasAnterior = pedidosAnterior.reduce((suma, p) => suma + (p.total || 0), 0);
    const totalPedidosAnterior = pedidosAnterior.length;
    const ticketPromedioAnterior = totalPedidosAnterior > 0 ?
        (totalVentasAnterior / totalPedidosAnterior) : 0;
    
    devolver {
        totalVentas: totalVentasAnterior,
        totalPedidos: totalPedidosAnterior,
        ticketPromedio: ticketPromedioAnterior,
        dias: duracionDias,
        fechaInicio: fechaInicioAnterior.toLocaleDateString('es-ES'),
        fechaFin: fechaFinAnterior.toLocaleDateString('es-ES')
    };
}

// Función para inicializar el tablero cuando se carga la página
función inicializarDashboard() {
    si (tipo de Gráfico === 'indefinido') {
        console.error('Chart.js no está disponible');
        mostrarNotificacion('Error: Chart.js no está disponible', 'error');
        devolver;
    }

    Gráfico.defaults.responsive = verdadero;
    Gráfico.defaults.maintainAspectRatio = falso;

    // Configurar valores iniciales para las metas desde METAS_CONFIG
    const elementoMetaMensual = obtenerElemento('meta-mensual-valor');
    const elementoMetaSemanal = obtenerElemento('meta-semanal-valor');
    
    if (elementoMetaMensual) elementoMetaMensual.textContent = formatearMoneda(METAS_CONFIG.mensual.metaGanancias);
    if (elementoMetaSemanal) elementoMetaSemanal.textContent = formatearMoneda(METAS_CONFIG.semanal.metaGanancias);

    actualizarTablaGastos();
    actualizarResumenGastos();
    configurarFormularioGastos();
}

// Ejecutar cuando el DOM esté listo
si (documento.readyState === 'cargando') {
    documento.addEventListener('DOMContentLoaded', inicializarDashboard);
} demás {
    inicializarDashboard();
}

// Exportar funciones principales para uso externo
ventana.dashboardFunctions = {
    mostrarDashboard,
    ActualizarDashboard,
    Enviar Resumen Detallado,
    alternarTipoGrafico
};
