// Configuración y constantes
let chartType = 'bar';
const META_MENSUAL = 6000;
const META_SEMANAL = META_MENSUAL / 4; // Asumimos 4 semanas por mes
let tipoMetaActual = 'mensual'; // 'mensual' o 'semanal'
let metaEventListenerAdded = false;

// Agregar al inicio del archivo JS, después de las otras constantes
const GASTOS_TIPOS = [
    'Sueldos', 'Renta', 'Servicios', 'Insumos', 'Mantenimiento',
    'Publicidad', 'Impuestos', 'Otros'
];

const GASTOS_IDS = {
    FORMULARIO_GASTO: 'formulario-gasto',
    FECHA_GASTO: 'fecha-gasto',
    MONTO_GASTO: 'monto-gasto',
    TIPO_GASTO: 'tipo-gasto',
    DESCRIPCION_GASTO: 'descripcion-gasto',
    TABLA_GASTOS: 'tabla-gastos',
    TOTAL_GASTOS: 'total-gastos',
    GRAFICO_GASTOS: 'grafico-gastos',
    RESUMEN_GASTOS: 'resumen-gastos'
};

// Configuración de costos de productos
const COSTOS_PRODUCTOS = {
    'alitas': { costo: 55, precio: 75 },
    'boneless': { costo: 45, precio: 70 },
    'papas': { costo: 15, precio: 35 },
    'envio': { costo: 0, precio: 0 } // Costo dinámico que se actualizará
};

const METAS_CONFIG = {
    mensual: {
        meta: 6000,
        label: 'Mensual',
        colorCompleto: '#4CAF50',  // Verde
        colorProgreso: '#8BC34A',   // Verde claro
        colorFaltante: '#FF5722'    // Rojo
    },
    semanal: {
        meta: 1500,
        label: 'Semanal',
        colorCompleto: '#2196F3',   // Azul
        colorProgreso: '#64B5F6',   // Azul claro
        colorFaltante: '#FF9800'    // Naranja
    }
};

// Nuevos IDs para elementos de costos
const COSTOS_IDS = {
    TOTAL_COSTOS: 'total-costos',
    TOTAL_GANANCIAS: 'total-ganancias',
    MARGEN_GANANCIAS: 'margen-ganancias',
    TABLA_PRODUCTOS_COSTOS: 'tabla-productos-costos',
    UTILIDAD_NETA: 'utilidad-neta' // NUEVO: Agregar esta línea
};

// Función para obtener el costo de un producto
function obtenerCostoProducto(nombreProducto) {
    const nombre = nombreProducto.toLowerCase();

    // Buscar coincidencias en el nombre del producto
    for (const [key, datos] of Object.entries(COSTOS_PRODUCTOS)) {
        if (nombre.includes(key)) {
            return datos;
        }
    }

    // Si no se encuentra, retornar valores por defecto
    return { costo: 0, precio: 0 };
}

// Función CORREGIDA para actualizar el dashboard principal
function actualizarDashboard() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const topLimitElement = obtenerElemento(IDS.FILTRO_TOP);
    const topLimit = topLimitElement ? parseInt(topLimitElement.value) : 10;

    if (!desde || !hasta) {
        return mostrarNotificacion('Por favor selecciona ambas fechas', 'warning');
    }

    if (new Date(desde) > new Date(hasta)) {
        return mostrarNotificacion('La fecha desde no puede ser mayor a la fecha hasta', 'error');
    }

    const pedidos = obtenerPedidos();
    const pedidosFiltrados = pedidos.filter(p => {
        const fechaPedido = new Date(p.fecha).toISOString().split('T')[0];
        return fechaPedido >= desde && fechaPedido <= hasta;
    });

    const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPedidos = pedidosFiltrados.length;
    const ticketPromedio = totalPedidos > 0 ? (totalVentas / totalPedidos) : 0;
    const totalDescuentos = calcularTotalDescuentos(pedidosFiltrados);
    
    const {
        topProductos,
        totalProductosVendidos,
        totalCostos,
        totalGanancias,
        margenGananciasGeneral,
        totalEnvios,
        gananciasEnvios
    } = calcularProductosConCostos(pedidosFiltrados, topLimit);

    const totalGastos = actualizarResumenGastos();
    const utilidadNeta = totalGanancias - totalGastos;

    actualizarElementosUIConCostos(
        totalVentas,
        totalPedidos,
        ticketPromedio,
        totalDescuentos,
        totalProductosVendidos,
        totalCostos,
        totalGanancias,
        margenGananciasGeneral,
        totalGastos,
        utilidadNeta,
        totalEnvios,
        gananciasEnvios
    );

    actualizarTablaProductos(topProductos, totalVentas);
    actualizarGraficoVentas(pedidosFiltrados, desde, hasta);
    actualizarGraficoPie(topProductos);
    recalcularMetaDesdeCero();
}

function actualizarElementosUIConCostos(
    totalVentas, 
    totalPedidos, 
    ticketPromedio, 
    totalDescuentos,
    totalProductosVendidos,
    totalCostos,
    totalGanancias,
    margenGanancias,
    totalGastos,
    utilidadNeta,
    totalEnvios = 0,
    gananciasEnvios = 0
) {
    // Asegurar que todos los valores sean números válidos
    totalVentas = asegurarNumero(totalVentas);
    totalPedidos = asegurarNumero(totalPedidos);
    ticketPromedio = asegurarNumero(ticketPromedio);
    totalDescuentos = asegurarNumero(totalDescuentos);
    totalProductosVendidos = asegurarNumero(totalProductosVendidos);
    totalCostos = asegurarNumero(totalCostos);
    totalGanancias = asegurarNumero(totalGanancias);
    margenGanancias = asegurarNumero(margenGanancias);
    totalGastos = asegurarNumero(totalGastos);
    utilidadNeta = asegurarNumero(utilidadNeta);
    totalEnvios = asegurarNumero(totalEnvios);
    gananciasEnvios = asegurarNumero(gananciasEnvios);

    // Actualizar elementos del DOM directamente
    const ventasElement = document.getElementById('total-ventas');
    if (ventasElement) ventasElement.textContent = formatearMoneda(totalVentas);

    const pedidosElement = document.getElementById('total-pedidos');
    if (pedidosElement) pedidosElement.textContent = totalPedidos.toLocaleString();

    const ticketElement = document.getElementById('ticket-promedio');
    if (ticketElement) ticketElement.textContent = formatearMoneda(ticketPromedio);

    const descuentosElement = document.getElementById('total-descuentos');
    if (descuentosElement) descuentosElement.textContent = formatearMoneda(totalDescuentos);

    const productosElement = document.getElementById('total-productos-vendidos');
    if (productosElement) productosElement.textContent = `${totalProductosVendidos.toLocaleString()} productos`;

    const costosElement = document.getElementById('total-costos');
    if (costosElement) costosElement.textContent = formatearMoneda(totalCostos);

    const gananciasElement = document.getElementById('total-ganancias');
    if (gananciasElement) gananciasElement.textContent = formatearMoneda(totalGanancias);

    const margenElement = document.getElementById('margen-ganancias');
    if (margenElement) margenElement.textContent = `${margenGanancias.toFixed(1)}%`;

    const gastosElement = document.getElementById('total-gastos');
    if (gastosElement) gastosElement.textContent = formatearMoneda(totalGastos);

    const utilidadElement = document.getElementById('utilidad-neta');
    if (utilidadElement) {
        utilidadElement.textContent = formatearMoneda(utilidadNeta);
        utilidadElement.className = utilidadNeta >= 0 ? 'metric-value positive' : 'metric-value negative';
    }

    // Actualizar elementos de envíos si existen
    const enviosElement = document.getElementById('total-envios');
    if (enviosElement) enviosElement.textContent = formatearMoneda(totalEnvios);

    const gananciasEnviosElement = document.getElementById('ganancias-envios');
    if (gananciasEnviosElement) gananciasEnviosElement.textContent = formatearMoneda(gananciasEnvios);
}


// Función para obtener gastos desde localStorage
function obtenerGastos() {
    try {
        return JSON.parse(localStorage.getItem('gastos')) || [];
    } catch (error) {
        console.error('Error al leer gastos desde localStorage:', error);
        mostrarNotificacion('Error al cargar los datos de gastos', 'error');
        return [];
    }
}

// Función para guardar gastos en localStorage
function guardarGastos(gastos) {
    try {
        localStorage.setItem('gastos', JSON.stringify(gastos));
    } catch (error) {
        console.error('Error al guardar gastos en localStorage:', error);
        mostrarNotificacion('Error al guardar los datos de gastos', 'error');
    }
}

// Función para agregar un nuevo gasto
function agregarGasto(event) {
    event.preventDefault();

    const fecha = obtenerElemento(GASTOS_IDS.FECHA_GASTO)?.value;
    const monto = parseFloat(obtenerElemento(GASTOS_IDS.MONTO_GASTO)?.value);
    const tipo = obtenerElemento(GASTOS_IDS.TIPO_GASTO)?.value;
    const descripcion = obtenerElemento(GASTOS_IDS.DESCRIPCION_GASTO)?.value;

    if (!fecha || isNaN(monto) || !tipo) {
        mostrarNotificacion('Por favor completa todos los campos obligatorios', 'warning');
        return;
    }

    const gastos = obtenerGastos();
    const nuevoGasto = {
        id: Date.now(),
        fecha,
        monto,
        tipo,
        descripcion: descripcion || '',
        fechaRegistro: new Date().toISOString()
    };

    gastos.push(nuevoGasto);
    guardarGastos(gastos);

    mostrarNotificacion('Gasto registrado correctamente', 'success');

    // Limpiar formulario
    obtenerElemento(GASTOS_IDS.FORMULARIO_GASTO).reset();

    // Actualizar la vista
    actualizarTablaGastos();
    actualizarResumenGastos();
    actualizarDashboard();
}

// Función para filtrar gastos por fecha
function filtrarGastos(desde, hasta) {
    const gastos = obtenerGastos();

    return gastos.filter(gasto => {
        const fechaGasto = new Date(gasto.fecha).toISOString().split('T')[0];
        return (!desde || fechaGasto >= desde) && (!hasta || fechaGasto <= hasta);
    });
}

// Función para eliminar un gasto
function eliminarGasto(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    const gastos = obtenerGastos().filter(gasto => gasto.id !== id);
    guardarGastos(gastos);

    mostrarNotificacion('Gasto eliminado correctamente', 'success');
    actualizarTablaGastos();
    actualizarResumenGastos();
    actualizarDashboard();
}

// Función para actualizar la tabla de gastos
function actualizarTablaGastos() {
    const tbody = obtenerElemento(GASTOS_IDS.TABLA_GASTOS);
    if (!tbody) return;

    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const gastosFiltrados = filtrarGastos(desde, hasta);

    tbody.innerHTML = '';

    if (gastosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay gastos registrados</td></tr>';
        return;
    }

    gastosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(gasto => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(gasto.fecha).toLocaleDateString('es-ES')}</td>
            <td>${gasto.tipo}</td>
            <td class="text-right">${formatearMoneda(gasto.monto)}</td>
            <td>${gasto.descripcion || '-'}</td>
            <td>${new Date(gasto.fechaRegistro).toLocaleString('es-ES')}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-danger" onclick="eliminarGasto(${gasto.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Función para actualizar el resumen de gastos
function actualizarResumenGastos() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const gastosFiltrados = filtrarGastos(desde, hasta);

    const totalGastos = gastosFiltrados.reduce((sum, gasto) => sum + gasto.monto, 0);

    const elementoTotalGastos = obtenerElemento(GASTOS_IDS.TOTAL_GASTOS);
    if (elementoTotalGastos) {
        elementoTotalGastos.textContent = formatearMoneda(totalGastos);
    }

    actualizarGraficoGastos(gastosFiltrados);
    return totalGastos;
}

// Función para actualizar el gráfico de gastos
function actualizarGraficoGastos(gastos) {
    const canvas = obtenerElemento(GASTOS_IDS.GRAFICO_GASTOS);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Agrupar gastos por tipo
    const gastosPorTipo = {};
    GASTOS_TIPOS.forEach(tipo => {
        gastosPorTipo[tipo] = 0;
    });

    gastos.forEach(gasto => {
        gastosPorTipo[gasto.tipo] += gasto.monto;
    });

    // Filtrar tipos con gastos > 0
    const tiposConGastos = GASTOS_TIPOS.filter(tipo => gastosPorTipo[tipo] > 0);
    const montos = tiposConGastos.map(tipo => gastosPorTipo[tipo]);

    // Destruir gráfico anterior si existe
    if (window.graficoGastos) {
        window.graficoGastos.destroy();
    }

    // Crear nuevo gráfico
    try {
        window.graficoGastos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: tiposConGastos,
                datasets: [{
                    data: montos,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#8D6E63', '#66BB6A'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfico de gastos:', error);
    }
}


function asegurarNumero(valor, defecto = 0) {
    const num = parseFloat(valor);
    return isNaN(num) ? defecto : num;
}


// Constantes para IDs de elementos DOM
const IDS = {
    MODAL: 'dashboard-modal',
    FILTRO_DESDE: 'filtro-fecha-desde',
    FILTRO_HASTA: 'filtro-fecha-hasta',
    FILTRO_TOP: 'filtro-top-productos',
    FILTRO_META: 'filtro-tipo-meta',
    BTN_APLICAR: 'btn-aplicar-filtros',
    BTN_CAMBIAR_GRAFICO: 'btn-cambiar-grafico',
    CLOSE_MODAL: '.close-modal',
    TOTAL_VENTAS: 'total-ventas',
    TOTAL_PEDIDOS: 'total-pedidos',
    TOTAL_DESCUENTOS: 'total-descuentos',
    TOTAL_PRODUCTOS: 'total-productos-vendidos',
    TICKET_PROMEDIO: 'ticket-promedio',
    TABLA_PRODUCTOS: 'tabla-top-productos',
    VENTAS_CHART: 'ventas-chart',
    PIE_CHART: 'chart-pie-productos',
    META_CONTAINER_MENSUAL: 'meta-mensual-container',
    META_CONTAINER_SEMANAL: 'meta-semanal-container'
};

// Funciones de utilidad
function obtenerPedidos() {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
        return pedidos.map(pedido => ({
            ...pedido,
            // Asegurar que costoEnvio y precioEnvio sean números
            costoEnvio: asegurarNumero(pedido.costoEnvio),
            precioEnvio: asegurarNumero(pedido.precioEnvio || pedido.costoEnvio) // Si no hay precioEnvio, usar costoEnvio
        }));
    } catch (error) {
        console.error('Error al leer pedidos:', error);
        return [];
    }
}

function guardarPedidos(pedidos) {
    try {
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
    } catch (error) {
        console.error('Error al guardar pedidos en localStorage:', error);
        mostrarNotificacion('Error al guardar los datos', 'error');
    }
}

function obtenerElemento(id) {
    const elemento = document.getElementById(id) || document.querySelector(id);
    if (!elemento) {
        console.warn(`Elemento no encontrado: ${id}`);
    }
    return elemento;
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(valor);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <span class="notificacion-icono">${{
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅'
        }[tipo] || 'ℹ️'}</span>
        <span class="notificacion-texto">${mensaje}</span>
        <button class="notificacion-cerrar">&times;</button>
    `;

    document.body.appendChild(notificacion);

    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        notificacion.classList.add('desvanecer');
        setTimeout(() => notificacion.remove(), 300);
    }, 5000);

    // Cerrar manualmente
    notificacion.querySelector('.notificacion-cerrar').addEventListener('click', () => {
        notificacion.remove();
    });
}

// Función principal para mostrar el dashboard
function mostrarDashboard() {
    const modal = obtenerElemento(IDS.MODAL);
    if (!modal) {
        mostrarNotificacion('No se pudo encontrar el modal del dashboard', 'error');
        return;
    }

    modal.style.display = 'flex';

    // Configurar fechas por defecto (últimos 30 días)
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    const filtroDesde = obtenerElemento(IDS.FILTRO_DESDE);
    const filtroHasta = obtenerElemento(IDS.FILTRO_HASTA);

    if (filtroDesde) filtroDesde.valueAsDate = hace30Dias;
    if (filtroHasta) filtroHasta.valueAsDate = hoy;

    // Configurar event listeners
    configurarEventListeners();

    // Actualizar dashboard inicial
    actualizarDashboard();
}

function manejarCambioMeta(event) {
    // Guardar el nuevo tipo de meta
    tipoMetaActual = event.target.value;
    console.log(`Cambiando a meta ${tipoMetaActual}`);

    // Actualizar la interfaz visual
    alternarVistaMeta();

    // Forzar recálculo completo con el nuevo tipo de meta
    recalcularMetaDesdeCero();
}

function actualizarMeta(ventasPeriodo, tipoMeta) {
    const config = METAS_CONFIG[tipoMeta];
    const totalGastos = actualizarResumenGastos();
    const utilidadNeta = ventasPeriodo - totalGastos;
    const porcentaje = Math.min((utilidadNeta / config.meta) * 100, 100);
    const faltante = Math.max(config.meta - utilidadNeta, 0);
    const diasTranscurridos = calcularDiasTranscurridos(tipoMeta);
    const proyeccion = calcularProyeccion(utilidadNeta, tipoMeta);

    const containerId = `meta-${tipoMeta}-container`;
    const container = document.getElementById(containerId);
    
    if (container) {
        container.innerHTML = `
            <div class="meta-header">
                <h3>Meta ${config.label}</h3>
                <span class="badge ${utilidadNeta >= config.meta ? 'bg-success' : 'bg-warning'}">
                    ${porcentaje.toFixed(1)}%
                </span>
            </div>
            
            <div class="meta-details">
                <div class="meta-stats">
                    <div class="stat">
                        <span class="stat-label">Meta:</span>
                        <span class="stat-value">${formatearMoneda(config.meta)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Utilidad Neta:</span>
                        <span class="stat-value ${utilidadNeta >= 0 ? 'text-success' : 'text-danger'}">
                            ${formatearMoneda(utilidadNeta)}
                        </span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Faltante:</span>
                        <span class="stat-value">${formatearMoneda(faltante)}</span>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${porcentaje}%; 
                        background-color: ${porcentaje >= 100 ? config.colorCompleto : config.colorProgreso};">
                        <span class="progress-text">${porcentaje.toFixed(1)}%</span>
                    </div>
                </div>
                
                <div class="meta-secondary-stats">
                    <div class="stat">
                        <span class="stat-label">Ventas Brutas:</span>
                        <span class="stat-value">${formatearMoneda(ventasPeriodo)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Gastos:</span>
                        <span class="stat-value text-danger">${formatearMoneda(totalGastos)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Proyección:</span>
                        <span class="stat-value ${proyeccion >= config.meta ? 'text-success' : 'text-warning'}">
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

// 3. Funciones auxiliares para las metas
function calcularDiasTranscurridos(tipoMeta) {
    const hoy = new Date();
    if (tipoMeta === 'semanal') {
        return hoy.getDay(); // 0 (domingo) a 6 (sábado)
    } else {
        return hoy.getDate(); // Día del mes
    }
}

function calcularProyeccion(utilidadActual, tipoMeta) {
    const hoy = new Date();
    let diasTotales, diasTranscurridos;
    
    if (tipoMeta === 'semanal') {
        diasTotales = 7;
        diasTranscurridos = hoy.getDay() || 7; // Si es 0 (domingo), contar como 7
    } else {
        diasTotales = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        diasTranscurridos = hoy.getDate();
    }
    
    if (diasTranscurridos === 0) return utilidadActual;
    return (utilidadActual / diasTranscurridos) * diasTotales;
}

function generarConsejosMeta(porcentaje, faltante, tipoMeta) {
    let consejos = [];
    const metaLabel = METAS_CONFIG[tipoMeta].label;
    
    if (porcentaje >= 100) {
        consejos.push(`✅ ¡Meta ${metaLabel} alcanzada! Buen trabajo.`);
        consejos.push(`🔝 Considera aumentar tu meta para el próximo período.`);
    } else if (porcentaje >= 75) {
        consejos.push(`👍 Vas por buen camino para alcanzar la meta ${metaLabel}.`);
        consejos.push(`📈 Necesitas ${formatearMoneda(faltante)} más para llegar a la meta.`);
    } else if (porcentaje >= 50) {
        consejos.push(`⚠️ Estás a la mitad de la meta ${metaLabel}.`);
        consejos.push(`💡 Revisa estrategias para incrementar ventas o reducir gastos.`);
    } else {
        consejos.push(`😟 Estás por debajo del 50% de la meta ${metaLabel}.`);
        consejos.push(`🚀 Necesitas ${formatearMoneda(faltante)} más. Considera acciones inmediatas.`);
    }
    
    // Consejo adicional basado en el tiempo restante
    const hoy = new Date();
    if (tipoMeta === 'semanal' && hoy.getDay() >= 5) { // Viernes o después
        consejos.push("⏳ ¡Últimos días de la semana! Enfócate en promociones rápidas.");
    } else if (tipoMeta === 'mensual' && hoy.getDate() > 25) {
        consejos.push("📅 Final de mes cerca. Revisa gastos y oportunidades finales.");
    }
    
    return consejos.map(c => `<div class="meta-tip">${c}</div>`).join('');
}

function recalcularMetaDesdeCero() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;

    if (!desde || !hasta) return;

    const pedidos = obtenerPedidos();
    const pedidosFiltrados = pedidos.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
        return fechaPedido >= desde && fechaPedido <= hasta;
    });

    const ventasPeriodo = pedidosFiltrados.reduce((sum, pedido) => sum + (pedido.total || 0), 0);
    const totalGastos = actualizarResumenGastos();
    const utilidadNeta = ventasPeriodo - totalGastos;

    actualizarMeta(utilidadNeta, tipoMetaActual);
}


function alternarVistaMeta() {
    const contenedorMensual = document.getElementById('meta-mensual-container');
    const contenedorSemanal = document.getElementById('meta-semanal-container');

    if (tipoMetaActual === 'mensual') {
        if (contenedorMensual) contenedorMensual.style.display = 'block';
        if (contenedorSemanal) contenedorSemanal.style.display = 'none';
    } else {
        if (contenedorMensual) contenedorMensual.style.display = 'none';
        if (contenedorSemanal) contenedorSemanal.style.display = 'block';
    }
}

function configurarEventListeners() {
    // Aplicar filtros
    const btnAplicar = obtenerElemento(IDS.BTN_APLICAR);
    if (btnAplicar) {
        btnAplicar.addEventListener('click', actualizarDashboard);
    }

    if (!metaEventListenerAdded) {
        const filtroMeta = document.getElementById('filtro-tipo-meta');
        if (filtroMeta) {
            filtroMeta.addEventListener('change', manejarCambioMeta);
            metaEventListenerAdded = true;
        }
    }

    // Cambiar tipo de gráfico
    const btnCambiarGrafico = obtenerElemento(IDS.BTN_CAMBIAR_GRAFICO);
    if (btnCambiarGrafico) {
        btnCambiarGrafico.addEventListener('click', alternarTipoGrafico);
    }

    // Cerrar modal
    const closeModal = obtenerElemento(IDS.CLOSE_MODAL);
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const modal = obtenerElemento(IDS.MODAL);
            if (modal) modal.style.display = 'none';
        });
    }

    // Filtro de top productos
    const filtroTop = obtenerElemento(IDS.FILTRO_TOP);
    if (filtroTop) {
        filtroTop.addEventListener('change', actualizarDashboard);
    }

    // Filtro de tipo de meta
    const filtroMeta = obtenerElemento(IDS.FILTRO_META);
    if (filtroMeta) {
        filtroMeta.addEventListener('change', (e) => {
            tipoMetaActual = e.target.value;
            alternarVistaMeta();
        });
    }

    // CAMBIO: Un solo botón para enviar resumen
    const btnEnviarResumen = obtenerElemento('btn-enviar-resumen-detallado'); // Nuevo ID
    if (btnEnviarResumen) {
        btnEnviarResumen.addEventListener('click', enviarResumenDetallado);
    }

    // Filtros de fecha - actualizar dashboard cuando cambien
    const filtroDesde = obtenerElemento(IDS.FILTRO_DESDE);
    const filtroHasta = obtenerElemento(IDS.FILTRO_HASTA);

    if (filtroDesde) {
        filtroDesde.addEventListener('change', actualizarDashboard);
    }

    if (filtroHasta) {
        filtroHasta.addEventListener('change', actualizarDashboard);
    }

    // Cerrar modal al hacer click fuera de él
    const modal = obtenerElemento(IDS.MODAL);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Configurar formulario de gastos
    const formularioGasto = obtenerElemento(GASTOS_IDS.FORMULARIO_GASTO);
    if (formularioGasto) {
        formularioGasto.addEventListener('submit', agregarGasto);
    }

    // Configurar fecha de gasto por defecto (hoy)
    const fechaGasto = obtenerElemento(GASTOS_IDS.FECHA_GASTO);
    if (fechaGasto) {
        fechaGasto.valueAsDate = new Date();
    }
}


function alternarTipoGrafico() {
    chartType = chartType === 'bar' ? 'line' : 'bar';
    actualizarDashboard();

    // Actualizar texto del botón
    const btnCambiar = obtenerElemento(IDS.BTN_CAMBIAR_GRAFICO);
    if (btnCambiar) {
        btnCambiar.textContent = chartType === 'bar' ? 'Cambiar a Líneas' : 'Cambiar a Barras';
    }
}




function calcularTotalDescuentos(pedidos) {
    return pedidos.reduce((sum, p) => {
        if (!p.descuento) return sum;

        const descuento = p.descuento;
        const subtotal = p.subtotal || 0;

        if (descuento.tipo === 'porcentaje') {
            return sum + (subtotal * descuento.valor / 100);
        } else {
            return sum + (descuento.valor || 0);
        }
    }, 0);
}

// Modificar la función calcularProductosConCostos para excluir envíos de los productos normales
function calcularProductosConCostos(pedidos, limite = 10) {
    const productosMap = {};
    let totalProductosVendidos = 0;
    let totalCostos = 0;
    let totalGanancias = 0;
    let totalEnvios = 0;
    let gananciasEnvios = 0;
    let costosEnvios = 0;

    pedidos.forEach(pedido => {
        // Calcular costo de envío si existe
        const costoEnvio = asegurarNumero(pedido.costoEnvio);
        const precioEnvio = asegurarNumero(pedido.precioEnvio || 0);
        const gananciaEnvio = precioEnvio - costoEnvio;

        totalEnvios += precioEnvio;
        gananciasEnvios += gananciaEnvio;
        costosEnvios += costoEnvio;

        if (!pedido.items || !Array.isArray(pedido.items)) return;

        pedido.items.forEach(item => {
            const nombre = item.nombre ? item.nombre.split('(')[0].trim() : 'Producto sin nombre';
            const cantidad = item.cantidad || 0;
            const precio = item.precio || 0;
            const totalVenta = precio * cantidad;

            // Obtener información de costos
            const datosProducto = obtenerCostoProducto(nombre);
            const costoUnitario = datosProducto.costo;
            const costoTotal = costoUnitario * cantidad;
            const gananciasProducto = totalVenta - costoTotal;

            totalProductosVendidos += cantidad;
            totalCostos += costoTotal;
            totalGanancias += gananciasProducto;

            if (!productosMap[nombre]) {
                productosMap[nombre] = {
                    cantidad: 0,
                    total: 0,
                    costo: 0,
                    ganancias: 0,
                    costoUnitario: costoUnitario,
                    precioUnitario: precio
                };
            }

            productosMap[nombre].cantidad += cantidad;
            productosMap[nombre].total += totalVenta;
            productosMap[nombre].costo += costoTotal;
            productosMap[nombre].ganancias += gananciasProducto;
        });
    });

    // Calcular el margen general CORREGIDO
    const totalVentasPeriodo = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
    const margenGeneral = totalVentasPeriodo > 0 ? 
        ((totalGanancias + gananciasEnvios) / totalVentasPeriodo) * 100 : 0;

    // Preparar productos normales (excluyendo envíos)
    const productosNormales = Object.entries(productosMap)
        .map(([nombre, datos]) => ({
            nombre,
            ...datos,
            margenGanancia: datos.total > 0 ? ((datos.ganancias / datos.total) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limite);

    return {
        topProductos: productosNormales, // Solo productos normales
        totalProductosVendidos,
        totalCostos: totalCostos + costosEnvios,
        totalGanancias: totalGanancias + gananciasEnvios,
        totalEnvios,
        gananciasEnvios,
        costosEnvios,
        margenGananciasGeneral: margenGeneral
    };
}

// Modificar la función actualizarGraficoPie para excluir envíos
function actualizarGraficoPie(productos) {
    const canvas = obtenerElemento(IDS.PIE_CHART);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (window.pieChartProductos) {
        window.pieChartProductos.destroy();
    }

    // Filtrar productos (excluir envíos si existen)
    const productosFiltrados = productos.filter(p => p.nombre !== 'Envíos');

    if (productosFiltrados.length === 0) {
        // Mostrar mensaje si no hay productos
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.font = '16px Arial';
        ctx.fillText('No hay productos para mostrar', canvas.width / 2, canvas.height / 2);
        return;
    }

    const colores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#66BB6A', '#EF5350',
        '#29B6F6', '#AB47BC', '#FFA726', '#8D6E63'
    ];

    try {
        window.pieChartProductos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: productosFiltrados.map(p => p.nombre),
                datasets: [{
                    data: productosFiltrados.map(p => p.total),
                    backgroundColor: colores.slice(0, productosFiltrados.length),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 10
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfico de productos:', error);
        mostrarNotificacion('Error al crear el gráfico de productos', 'error');
    }
}

// Modificar las funciones de meta para usar utilidades netas
function actualizarMetaMensual(ventasPeriodo) {
    actualizarMeta(ventasPeriodo, 'mensual');
}

function actualizarMetaSemanal(ventasPeriodo) {
    actualizarMeta(ventasPeriodo, 'semanal');
}

// Función actualizada para mostrar tabla de productos con costos
function actualizarTablaProductos(productos, totalVentas) {
    const tbody = document.getElementById('tabla-productos-costos');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos para mostrar</td></tr>';
        return;
    }

    productos.forEach(producto => {
        const porcentajeVentas = totalVentas > 0 ? ((producto.total / totalVentas) * 100).toFixed(1) : '0.0';
        const row = document.createElement('tr');

        if (producto.nombre === 'Envíos') {
            row.classList.add('envio-row');
        }

        let colorMargen = 'text-success';
        if (producto.margenGanancia < 30) colorMargen = 'text-danger';
        else if (producto.margenGanancia < 50) colorMargen = 'text-warning';

        row.innerHTML = `
            <td>${producto.nombre}${producto.nombre === 'Envíos' ? ' <i class="fas fa-truck"></i>' : ''}</td>
            <td class="text-right">${producto.cantidad.toLocaleString()}</td>
            <td class="text-right">${formatearMoneda(producto.total)}</td>
            <td class="text-right">${formatearMoneda(producto.costo)}</td>
            <td class="text-right ${producto.ganancias >= 0 ? 'text-success' : 'text-danger'}">
                ${formatearMoneda(producto.ganancias)}
            </td>
            <td class="text-right ${colorMargen}">${producto.margenGanancia.toFixed(1)}%</td>
            <td class="text-right">${porcentajeVentas}%</td>
        `;
        tbody.appendChild(row);
    });
}


function actualizarGraficoVentas(pedidos, desde, hasta) {
    const canvas = obtenerElemento(IDS.VENTAS_CHART);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generar array de fechas
    const fechas = [];
    const inicio = new Date(desde);
    const fin = new Date(hasta);

    for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
        fechas.push(fecha.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
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
            day: 'numeric',
            month: 'short'
        });

        if (ventasPorFecha[fechaPedido] !== undefined) {
            ventasPorFecha[fechaPedido] += pedido.total || 0;
        }
    });

    // Destruir gráfico anterior si existe
    if (window.ventasChart) {
        window.ventasChart.destroy();
    }

    // Configuración de colores según tipo de gráfico
    const colores = {
        bar: {
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)'
        },
        line: {
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)'
        }
    };

    // Crear nuevo gráfico
    try {
        window.ventasChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: fechas,
                datasets: [{
                    label: 'Ventas por día',
                    data: fechas.map(fecha => ventasPorFecha[fecha]),
                    backgroundColor: colores[chartType].backgroundColor,
                    borderColor: colores[chartType].borderColor,
                    borderWidth: 2,
                    fill: chartType === 'line',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `Ventas: ${formatearMoneda(context.raw)}`;
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Monto ($)'
                        },
                        ticks: {
                            callback: function (value) {
                                return formatearMoneda(value);
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Fecha'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfico de ventas:', error);
        mostrarNotificacion('Error al crear el gráfico de ventas', 'error');
    }
}


// Función actualizada para enviar resumen por WhatsApp con costos
function enviarResumenDetallado() {
    try {
        const pedidos = obtenerPedidos();
        const gastos = obtenerGastos();
        const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
        const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;

        // Validación de fechas
        if (!desde || !hasta) {
            mostrarNotificacion('Por favor selecciona las fechas para generar el resumen', 'warning');
            return;
        }

        const fechaInicio = new Date(desde);
        const fechaFin = new Date(hasta);
        
        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
            mostrarNotificacion('Fechas no válidas', 'error');
            return;
        }

        const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
        
        // 1. Manejo de días sin ventas
        const pedidosFiltrados = pedidos.filter(pedido => {
            const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
            return fechaPedido >= desde && fechaPedido <= hasta;
        });

        const gastosFiltrados = filtrarGastos(desde, hasta);

        if (pedidosFiltrados.length === 0 && gastosFiltrados.length === 0) {
            mostrarNotificacion('No hay datos en el rango de fechas seleccionado', 'warning');
            return;
        }

        // Cálculos principales
        const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0);
        const totalPedidos = pedidosFiltrados.length;
        const promedioTicket = totalPedidos > 0 ? (totalVentas / totalPedidos) : 0;
        const totalDescuentos = calcularTotalDescuentos(pedidosFiltrados);

        // Calcular costos y ganancias
        const {
            topProductos,
            totalProductosVendidos,
            totalCostos,
            totalGanancias,
            totalEnvios,
            gananciasEnvios,
            margenGananciasGeneral
        } = calcularProductosConCostos(pedidosFiltrados, 10);

        // Calcular gastos
        const totalGastos = gastosFiltrados.reduce((sum, gasto) => sum + gasto.monto, 0);
        const gananciasNetas = totalGanancias - totalGastos;

        // Calcular ventas por día
        const ventasPorDia = {};
        pedidosFiltrados.forEach(pedido => {
            const fecha = new Date(pedido.fecha).toLocaleDateString('es-ES');
            if (!ventasPorDia[fecha]) {
                ventasPorDia[fecha] = 0;
            }
            ventasPorDia[fecha] += pedido.total || 0;
        });

        // 1. Días sin ventas
        const diasSinVentas = diasDiferencia - Object.keys(ventasPorDia).length;
        const porcentajeDiasConVentas = ((diasDiferencia - diasSinVentas) / diasDiferencia * 100).toFixed(1);

        // 2. Análisis de tendencias (solo si hay suficientes días)
        let analisisTendencia = '';
        if (diasDiferencia > 7) {
            const mitadPeriodo = new Date(fechaInicio.getTime() + (fechaFin - fechaInicio) / 2);
            
            const ventasPrimeraMitad = pedidosFiltrados
                .filter(p => new Date(p.fecha) <= mitadPeriodo)
                .reduce((sum, p) => sum + (p.total || 0), 0);
            
            const ventasSegundaMitad = totalVentas - ventasPrimeraMitad;
            
            const cambioPorcentual = ventasPrimeraMitad > 0 ? 
                ((ventasSegundaMitad - ventasPrimeraMitad) / ventasPrimeraMitad * 100) : 0;
            
            analisisTendencia = `• Tendencia ventas: ${cambioPorcentual >= 0 ? '↑' : '↓'} ${Math.abs(cambioPorcentual).toFixed(1)}% ` +
                               `(${formatearMoneda(ventasPrimeraMitad)} → ${formatearMoneda(ventasSegundaMitad)})\n`;
        }

        // 3. Comparativa con período anterior
        let comparativaPeriodoAnterior = '';
        try {
            const periodoAnterior = calcularComparativaPeriodoAnterior(desde, hasta, pedidos);
            if (periodoAnterior) {
                const cambioVentas = periodoAnterior.totalVentas > 0 ? 
                    ((totalVentas - periodoAnterior.totalVentas) / periodoAnterior.totalVentas * 100) : 0;
                
                comparativaPeriodoAnterior = `• Comparativa con período anterior (${periodoAnterior.dias} días):\n` +
                    `   - Ventas: ${cambioVentas >= 0 ? '+' : ''}${cambioVentas.toFixed(1)}%\n` +
                    `   - Pedidos: ${periodoAnterior.totalPedidos > 0 ? 
                        ((totalPedidos - periodoAnterior.totalPedidos) / periodoAnterior.totalPedidos * 100).toFixed(1) : 'N/A'}%\n` +
                    `   - Ticket promedio: ${periodoAnterior.ticketPromedio > 0 ? 
                        ((promedioTicket - periodoAnterior.ticketPromedio) / periodoAnterior.ticketPromedio * 100).toFixed(1) : 'N/A'}%\n`;
            }
        } catch (e) {
            console.error('Error calculando comparativa:', e);
        }

        // Calcular meta proporcional
        let metaCalculada;
        if (tipoMetaActual === 'mensual') {
            const diasEnMes = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 0).getDate();
            metaCalculada = (META_MENSUAL / diasEnMes) * diasDiferencia;
        } else {
            metaCalculada = (META_SEMANAL / 7) * diasDiferencia;
        }

        const porcentajeMeta = (totalVentas / metaCalculada) * 100;

        // Crear mensaje detallado
        const fechaFormateada = `${fechaInicio.toLocaleDateString('es-ES')} - ${fechaFin.toLocaleDateString('es-ES')}`;

        let mensaje = `📊 *REPORTE DETALLADO*\n`;
        mensaje += `📅 *Período:* ${fechaFormateada} (${diasDiferencia} días)\n\n`;

        mensaje += `💰 *RESUMEN FINANCIERO*\n`;
        mensaje += `• Ventas totales: ${formatearMoneda(totalVentas)}\n`;
        mensaje += `• Costos totales: ${formatearMoneda(totalCostos)}\n`;
        mensaje += `• Gastos totales: ${formatearMoneda(totalGastos)}\n`;
        mensaje += `• Ganancias brutas: ${formatearMoneda(totalGanancias)}\n`;
        mensaje += `• Ganancias netas: ${formatearMoneda(gananciasNetas)}\n`;
        mensaje += `• Margen de ganancia: ${margenGananciasGeneral.toFixed(1)}%\n`;
        mensaje += `• Descuentos aplicados: ${formatearMoneda(totalDescuentos)}\n`;
        mensaje += `• Días con ventas: ${diasDiferencia - diasSinVentas}/${diasDiferencia} (${porcentajeDiasConVentas}%)\n`;
        mensaje += `• Ventas por envíos: ${formatearMoneda(totalEnvios)}\n`;
        mensaje += `• Ganancias por envíos: ${formatearMoneda(gananciasEnvios)}\n\n`;

        // Añadir análisis de tendencia si aplica
        if (analisisTendencia) {
            mensaje += `📈 *ANÁLISIS DE TENDENCIAS*\n`;
            mensaje += analisisTendencia;
        }

        // Añadir comparativa si existe
        if (comparativaPeriodoAnterior) {
            mensaje += `🔍 *COMPARATIVA*\n`;
            mensaje += comparativaPeriodoAnterior;
        }

        // Sección de gastos si hay
        if (gastosFiltrados.length > 0) {
            mensaje += `💸 *GASTOS PRINCIPALES*\n`;

            // Agrupar gastos por tipo
            const gastosPorTipo = {};
            GASTOS_TIPOS.forEach(tipo => {
                gastosPorTipo[tipo] = 0;
            });

            gastosFiltrados.forEach(gasto => {
                gastosPorTipo[gasto.tipo] += gasto.monto;
            });

            // Ordenar de mayor a menor
            const gastosOrdenados = Object.entries(gastosPorTipo)
                .filter(([_, monto]) => monto > 0)
                .sort((a, b) => b[1] - a[1]);

            gastosOrdenados.forEach(([tipo, monto], index) => {
                mensaje += `${index + 1}. ${tipo}: ${formatearMoneda(monto)}\n`;
            });

            mensaje += `\n`;
        }

        mensaje += `📋 *ESTADÍSTICAS GENERALES*\n`;
        mensaje += `• Total de pedidos: ${totalPedidos.toLocaleString()}\n`;
        mensaje += `• Productos vendidos: ${totalProductosVendidos.toLocaleString()}\n`;
        mensaje += `• Ticket promedio: ${formatearMoneda(promedioTicket)}\n`;
        mensaje += `• Promedio diario: ${formatearMoneda(totalVentas / diasDiferencia)}\n\n`;

        mensaje += `🎯 *PROGRESO DE META*\n`;
        mensaje += `• Meta ${tipoMetaActual}: ${formatearMoneda(metaCalculada)}\n`;
        mensaje += `• Progreso: ${porcentajeMeta.toFixed(1)}%\n`;
        mensaje += `• ${porcentajeMeta >= 100 ? '✅ Meta alcanzada' : '⚠️ Meta no alcanzada'}\n\n`;

        mensaje += `🏆 *TOP 5 PRODUCTOS MÁS VENDIDOS*\n`;
        topProductos.slice(0, 5).forEach((producto, index) => {
            mensaje += `${index + 1}. *${producto.nombre}*\n`;
            mensaje += `   • Cantidad: ${producto.cantidad.toLocaleString()}\n`;
            mensaje += `   • Ventas: ${formatearMoneda(producto.total)}\n`;
            mensaje += `   • Ganancias: ${formatearMoneda(producto.ganancias)}\n`;
            mensaje += `   • Margen: ${producto.margenGanancia.toFixed(1)}%\n\n`;
        });

        // 4. Optimización para WhatsApp
        if (mensaje.length > 50000) {
            const mensajeOriginal = mensaje;
            mensaje = mensaje.substring(0, 45000) + "\n\n... [RESUMEN ACORTADO POR LÍMITE DE CARACTERES] ...\n";
            
            // Intentar mantener las partes más importantes
            const partesImportantes = [
                mensajeOriginal.match(/📊.*?\n\n/)[0], // Encabezado
                mensajeOriginal.match(/💰.*?\n\n/)[0], // Resumen financiero
                mensajeOriginal.match(/🎯.*?\n\n/)[0], // Meta
                mensajeOriginal.match(/🏆.*?%\n\n/)[0] // Top productos
            ].join('\n');
            
            mensaje = partesImportantes + "\n\n... [RESUMEN COMPLETO DEMASIADO EXTENSO] ...";
        }

        mensaje += `⏰ *Generado el ${new Date().toLocaleString('es-ES')}*`;

        try {
            const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error al abrir WhatsApp:', error);
            mostrarNotificacion('Error al abrir WhatsApp', 'error');
        }

    } catch (error) {
        console.error('Error generando resumen:', error);
        mostrarNotificacion('Error al generar el resumen', 'error');
    }
}

// Función auxiliar para calcular comparativa con período anterior
function calcularComparativaPeriodoAnterior(desde, hasta, todosPedidos) {
    const fechaInicio = new Date(desde);
    const fechaFin = new Date(hasta);
    const duracionDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    
    // Calcular fechas del período anterior
    const fechaInicioAnterior = new Date(fechaInicio);
    fechaInicioAnterior.setDate(fechaInicio.getDate() - duracionDias);
    
    const fechaFinAnterior = new Date(fechaInicio);
    fechaFinAnterior.setDate(fechaInicio.getDate() - 1);
    
    // Filtrar pedidos del período anterior
    const pedidosAnterior = todosPedidos.filter(pedido => {
        const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
        const desdeAnterior = fechaInicioAnterior.toISOString().split('T')[0];
        const hastaAnterior = fechaFinAnterior.toISOString().split('T')[0];
        return fechaPedido >= desdeAnterior && fechaPedido <= hastaAnterior;
    });
    
    if (pedidosAnterior.length === 0) return null;
    
    // Calcular métricas del período anterior
    const totalVentasAnterior = pedidosAnterior.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPedidosAnterior = pedidosAnterior.length;
    const ticketPromedioAnterior = totalPedidosAnterior > 0 ? 
        (totalVentasAnterior / totalPedidosAnterior) : 0;
    
    return {
        totalVentas: totalVentasAnterior,
        totalPedidos: totalPedidosAnterior,
        ticketPromedio: ticketPromedioAnterior,
        dias: duracionDias,
        fechaInicio: fechaInicioAnterior.toLocaleDateString('es-ES'),
        fechaFin: fechaFinAnterior.toLocaleDateString('es-ES')
    };
}

// Función para inicializar el dashboard cuando se carga la página
function inicializarDashboard() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está disponible');
        mostrarNotificacion('Error: Chart.js no está disponible', 'error');
        return;
    }

    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;

    // Configurar valores iniciales para las metas desde METAS_CONFIG
    const elementoMetaMensual = obtenerElemento('meta-mensual-valor');
    const elementoMetaSemanal = obtenerElemento('meta-semanal-valor');
    
    if (elementoMetaMensual) elementoMetaMensual.textContent = formatearMoneda(METAS_CONFIG.mensual.meta);
    if (elementoMetaSemanal) elementoMetaSemanal.textContent = formatearMoneda(METAS_CONFIG.semanal.meta);

    actualizarTablaGastos();
    actualizarResumenGastos();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarDashboard);
} else {
    inicializarDashboard();
}

// Exportar funciones principales para uso externo
window.dashboardFunctions = {
    mostrarDashboard,
    actualizarDashboard,
    enviarResumenDetallado, // CAMBIO: Nueva función
    alternarTipoGrafico
};