// Usamos date-fns desde el objeto global dateFns
const {
  format, 
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  isWithinInterval,
  getWeek,
  getYear,
  getMonth,
  isSameMonth,
  isSameWeek,
  parseISO
} = dateFns;

// Configuración manual para español
const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const nombresDias = [
  'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'
];

// Configuración y constantes
let chartType = 'bar';
const META_MENSUAL = 6000;
const META_SEMANAL = META_MENSUAL / 4;
let tipoMetaActual = localStorage.getItem('tipoMeta') || 'mensual'; // Persistir tipo de meta
let periodoMetaActual = obtenerPeriodoActual(tipoMetaActual);
let diasPeriodoActual = calcularDiasPeriodo(periodoMetaActual);
let metaEventListenerAdded = false;
let cachedPedidos = null;
let cachedGastos = null;
const charts = {}; // Objeto para gestionar instancias de gráficos

// Configuración de costos de productos
const COSTOS_PRODUCTOS = {
    'alitas bbq': { costo: 55, precio: 75 },
    'alitas mango habanero': { costo: 55, precio: 75 },
    'alitas buffalo': { costo: 55, precio: 75 },
    'alitas queso parmesano': { costo: 55, precio: 75 },
    'alitas estilo brayan': { costo: 55, precio: 75 },
    'boneless bbq': { costo: 45, precio: 70 },
    'boneless mango habanero': { costo: 45, precio: 70 },
    'boneless buffalo': { costo: 45, precio: 70 },
    'boneless queso parmesano': { costo: 45, precio: 70 },
    'papas fritas': { costo: 15, precio: 35 },
    'papas a la francesa': { costo: 10, precio: 25 },
    'papas con chorizo': { costo: 25, precio: 50 },
    'frappe moka': { costo: 20, precio: 40 },
    'frappe oreo': { costo: 20, precio: 40 },
    'frappe chispas chocolate': { costo: 20, precio: 40 },
    'refresco 600ml': { costo: 10, precio: 35 },
    'agua mineral': { costo: 5, precio: 25 },
    'crema batida - chisp chocolate': { costo: 5, precio: 10 },
    'aderezo extra': { costo: 5, precio: 15 },
    'zanahorita': { costo: 2, precio: 5 },
    'envio': { costo: 0, precio: 0 }
};

const METAS_CONFIG = {
  mensual: {
    metaVentas: 6000,
    metaGanancias: 3000,
    label: 'Mensual',
    colorBase: '#FF9800', // Naranja base
    colorBajo: '#EF5350', // Rojo para <50%
    colorMedio: '#FFB300', // Amarillo-naranja para 50-75%
    colorAlto: '#4CAF50', // Verde para >75%
    colorCompleto: '#388E3C', // Verde oscuro para 100%
    colorFaltante: '#FFE0B2' // Fondo claro naranja
  },
  semanal: {
    metaVentas: 1500,
    metaGanancias: 750,
    label: 'Semanal',
    colorBase: '#FFEB3B', // Amarillo base
    colorBajo: '#EF5350', // Rojo para <50%
    colorMedio: '#FFCA28', // Amarillo oscuro para 50-75%
    colorAlto: '#4CAF50', // Verde para >75%
    colorCompleto: '#388E3C', // Verde oscuro para 100%
    colorFaltante: '#FFF9C4' // Fondo claro amarillo
  }
};

const GASTOS_TIPOS = [
    { nombre: 'Sueldos', categoria: 'externo' },
    { nombre: 'Renta', categoria: 'externo' },
    { nombre: 'Servicios', categoria: 'externo' },
    { nombre: 'Insumos', categoria: 'inventario' },
    { nombre: 'Mantenimiento', categoria: 'externo' },
    { nombre: 'Publicidad', categoria: 'externo' },
    { nombre: 'Impuestos', categoria: 'externo' },
    { nombre: 'Otros', categoria: 'externo' }
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

const COSTOS_IDS = {
    TOTAL_COSTOS: 'total-costos',
    TOTAL_GANANCIAS: 'total-ganancias',
    MARGEN_GANANCIAS: 'margen-ganancias',
    TABLA_PRODUCTOS_COSTOS: 'tabla-productos-costos',
    UTILIDAD_NETA: 'utilidad-neta',
    DINERO_CAJA: 'dinero-caja',
    EXCESO_INVENTARIO: 'exceso-inventario'
};

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

// Agregar constantes para retiros
const RETIROS_IDS = {
    FORMULARIO_RETIRO: 'formulario-retiro',
    FECHA_RETIRO: 'fecha-retiro',
    MONTO_RETIRO: 'monto-retiro',
    DESCRIPCION_RETIRO: 'descripcion-retiro',
    TABLA_RETIROS: 'tabla-retiros',
    TOTAL_RETIROS: 'total-retiros'
};

// Función para obtener retiros
function obtenerRetiros() {
    try {
        return JSON.parse(localStorage.getItem('retiros')) || [];
    } catch (error) {
        logDebug('Error al leer retiros:', error);
        mostrarNotificacion('Error al cargar los datos de retiros', 'error');
        return [];
    }
}

// Función para guardar retiros
function guardarRetiros(retiros) {
    try {
        localStorage.setItem('retiros', JSON.stringify(retiros));
        // Verificar que los datos se guardaron correctamente
        const savedRetiros = JSON.parse(localStorage.getItem('retiros'));
        if (!Array.isArray(savedRetiros) || savedRetiros.length !== retiros.length) {
            throw new Error('Los datos de retiros no se guardaron correctamente');
        }
    } catch (error) {
        logDebug('Error al guardar retiros:', error);
        mostrarNotificacion('Error al guardar los datos de retiros', 'error');
    }
}

// Función para agregar un retiro
function agregarRetiro(event) {
    event.preventDefault();
    const fecha = obtenerElemento(RETIROS_IDS.FECHA_RETIRO)?.value;
    let monto = parseFloat(obtenerElemento(RETIROS_IDS.MONTO_RETIRO)?.value);
    const descripcion = sanitizarHTML(obtenerElemento(RETIROS_IDS.DESCRIPCION_RETIRO)?.value || '');

    if (!fecha || isNaN(new Date(fecha).getTime())) {
        mostrarNotificacion('Por favor selecciona una fecha válida', 'warning');
        return;
    }
    if (isNaN(monto) || monto <= 0) {
        mostrarNotificacion('Por favor ingresa un monto válido mayor a 0', 'warning');
        return;
    }

    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const pedidos = obtenerPedidos();
    const gastos = obtenerGastos();
    const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);

    // Limitar el monto al dinero en caja si es un retiro de utilidad neta
    if (descripcion === 'Retiro de utilidad neta') {
        if (metricas.dineroCaja <= 0) {
            mostrarNotificacion('No hay dinero en caja para realizar el retiro', 'warning');
            return;
        }
        monto = Math.min(monto, metricas.dineroCaja, metricas.utilidadNeta);
    }

    const retiros = obtenerRetiros();
    const nuevoRetiro = {
        id: Date.now(),
        fecha,
        monto,
        descripcion,
        fechaRegistro: new Date().toISOString()
    };

    retiros.push(nuevoRetiro);
    guardarRetiros(retiros);

    // Limpiar caché para forzar recálculo
    cachedPedidos = null;
    cachedGastos = null;

    // Recalcular métricas después de registrar el retiro
    const nuevasMetricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);

    // Actualizar elementos de la UI
    const utilidadNetaElement = obtenerElemento('utilidad-neta');
    const dineroCajaElement = obtenerElemento('dinero-caja');
    const totalRetirosElement = obtenerElemento('total-retiros');

    if (utilidadNetaElement) {
        utilidadNetaElement.textContent = formatearMoneda(nuevasMetricas.utilidadNeta);
        utilidadNetaElement.className = nuevasMetricas.utilidadNeta >= 0 ? 'metric-value positive' : 'metric-value negative';
    }

    if (dineroCajaElement) {
        dineroCajaElement.textContent = formatearMoneda(nuevasMetricas.dineroCaja);
        dineroCajaElement.className = nuevasMetricas.dineroCaja >= 0 ? 'metric-value positive' : 'metric-value negative';
    }

    if (totalRetirosElement) {
        totalRetirosElement.textContent = formatearMoneda(nuevasMetricas.totalRetiros);
        totalRetirosElement.className = 'metric-value';
    }

    mostrarNotificacion(`Retiro de ${formatearMoneda(monto)} registrado correctamente`, 'success');

    const formulario = obtenerElemento(RETIROS_IDS.FORMULARIO_RETIRO);
    if (formulario) formulario.reset();

    actualizarTablaRetiros();
    actualizarDashboard();
    actualizarBotonRetiroUtilidadNeta();
}

// Función para eliminar un retiro
function eliminarRetiro(id) {
    if (!confirm('¿Estás seguro de eliminar este retiro?')) return;
    const retiros = obtenerRetiros().filter(retiro => retiro.id !== id);
    guardarRetiros(retiros);
    mostrarNotificacion('Retiro eliminado correctamente', 'success');
    actualizarTablaRetiros();
    actualizarDashboard();
}

// Función para filtrar retiros por fecha
function filtrarRetiros(desde, hasta) {
    const retiros = obtenerRetiros();
    return retiros.filter(retiro => {
        const fechaRetiro = new Date(retiro.fecha);
        if (isNaN(fechaRetiro.getTime())) {
            logDebug('Fecha de retiro inválida:', retiro);
            return false;
        }
        const fechaRetiroISO = fechaRetiro.toISOString().split('T')[0];
        return (!desde || fechaRetiroISO >= desde) && (!hasta || fechaRetiroISO <= hasta);
    });
}

// Función para actualizar la tabla de retiros
function actualizarTablaRetiros() {
    const tbody = obtenerElemento(RETIROS_IDS.TABLA_RETIROS);
    if (!tbody) {
        logDebug('Elemento tabla-retiros no encontrado');
        mostrarNotificacion('No se encontró la tabla de retiros', 'error');
        return;
    }

    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value || new Date(0).toISOString().split('T')[0];
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value || new Date().toISOString().split('T')[0];
    const retirosFiltrados = filtrarRetiros(desde, hasta);

    logDebug('Retiros filtrados:', retirosFiltrados);

    tbody.innerHTML = '';

    if (retirosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay retiros registrados</td></tr>';
    } else {
        retirosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(retiro => {
            const row = document.createElement('tr');
            const tipoMovimiento = retiro.esAjusteCaja ? 'Ajuste' : (retiro.tipo === 'ingreso' ? 'Ingreso' : 'Retiro');
            const signo = retiro.tipo === 'ingreso' ? '+' : '-';
            row.innerHTML = `
                <td>${new Date(retiro.fecha).toLocaleDateString('es-ES')}</td>
                <td class="text-right">${retiro.esAjusteCaja ? '' : signo}${formatearMoneda(retiro.monto)}</td>
                <td>${sanitizarHTML(tipoMovimiento)}</td>
                <td>${sanitizarHTML(retiro.descripcion || '-')}</td>
                <td>${new Date(retiro.fechaRegistro).toLocaleString('es-ES')}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger" onclick="eliminarRetiro(${retiro.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Calcular total de movimientos para la tabla (sin ajustes de caja)
    const totalRetiros = retirosFiltrados
        .filter(r => (r.tipo === 'retiro' || !r.tipo) && !r.esAjusteCaja)
        .reduce((sum, retiro) => sum + (retiro.monto || 0), 0);
    const totalIngresos = retirosFiltrados
        .filter(r => r.tipo === 'ingreso' && !r.esAjusteCaja)
        .reduce((sum, retiro) => sum + (retiro.monto || 0), 0);
    const totalMovimientos = totalRetiros - totalIngresos;

    logDebug('Total retirado:', totalRetiros, 'Total ingresos:', totalIngresos);
    const elementoTotalRetiros = obtenerElemento(RETIROS_IDS.TOTAL_RETIROS);
    if (elementoTotalRetiros) {
        elementoTotalRetiros.textContent = formatearMoneda(totalMovimientos);
    } else {
        logDebug('Elemento total-retiros no encontrado');
    }

    // Actualizar la métrica de retiros en la pestaña de métricas
    const metricaRetiros = obtenerElemento('total-retiros');
    if (metricaRetiros) {
        metricaRetiros.textContent = formatearMoneda(totalMovimientos);
    } else {
        logDebug('Elemento total-retiros (métricas) no encontrado');
    }

    actualizarBotonRetiroUtilidadNeta();
}

function llenarFormularioRetiroUtilidadNeta() {
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const pedidos = obtenerPedidos();
    const gastos = obtenerGastos();
    const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);

    const formulario = obtenerElemento(RETIROS_IDS.FORMULARIO_RETIRO);
    const fechaRetiro = obtenerElemento(RETIROS_IDS.FECHA_RETIRO);
    const montoRetiro = obtenerElemento(RETIROS_IDS.MONTO_RETIRO);
    const descripcionRetiro = obtenerElemento(RETIROS_IDS.DESCRIPCION_RETIRO);

    if (!formulario || !fechaRetiro || !montoRetiro || !descripcionRetiro) {
        mostrarNotificacion('Error al cargar el formulario de retiro', 'error');
        return;
    }

    if (metricas.utilidadNeta <= 0) {
        mostrarNotificacion('No hay utilidad neta disponible para retirar', 'warning');
        return;
    }

    // Limitar el monto sugerido al dinero disponible en caja
    let montoSugerido = Math.min(metricas.utilidadNeta, metricas.dineroCaja);
    let mensajeAdicional = '';
    if (metricas.dineroCaja < metricas.utilidadNeta) {
        mensajeAdicional = `El dinero en caja (${formatearMoneda(metricas.dineroCaja)}) es menor que la utilidad neta (${formatearMoneda(metricas.utilidadNeta)}). Se sugiere retirar el dinero disponible.`;
    }

    fechaRetiro.valueAsDate = new Date();
    montoRetiro.value = montoSugerido.toFixed(2);
    descripcionRetiro.value = 'Retiro de utilidad neta';

    mostrarNotificacion(`Formulario listo para retirar utilidad neta. ${mensajeAdicional}`, 'info');
}

function actualizarBotonRetiroUtilidadNeta() {
    const btnRetiroUtilidadNeta = obtenerElemento('btn-retiro-utilidad-neta');
    if (!btnRetiroUtilidadNeta) return;

    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const pedidos = obtenerPedidos();
    const gastos = obtenerGastos();
    const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);

    // Habilitar el botón si hay utilidad neta y dinero en caja disponibles
    if (metricas.utilidadNeta <= 0 || metricas.dineroCaja <= 0) {
        btnRetiroUtilidadNeta.disabled = true;
        btnRetiroUtilidadNeta.title = metricas.utilidadNeta <= 0 
            ? 'No hay utilidad neta disponible' 
            : 'No hay dinero en caja';
    } else {
        btnRetiroUtilidadNeta.disabled = false;
        btnRetiroUtilidadNeta.title = 'Retirar utilidad neta disponible';
    }
}

// Función de depuración condicional
const isDebug = false;
function logDebug(...args) {
  if (isDebug) console.log(...args);
}

// Función para sanitizar HTML
function sanitizarHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Función debounce para eventos
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Función para mostrar indicador de carga
function mostrarCargando(elementoId, mostrar = true) {
  const elemento = document.getElementById(elementoId);
  if (elemento) {
    elemento.innerHTML = mostrar
      ? '<div class="spinner">Cargando...</div>'
      : '';
  }
}

// Funciones de fechas
function formatearFecha(date, formato = 'dd/MM/yyyy') {
  if (!date || isNaN(new Date(date).getTime())) {
    logDebug(`Fecha inválida recibida en formatearFecha: ${date}`);
    return 'Indefinido';
  }
  try {
    return format(new Date(date), formato, {
      locale: {
        localize: {
          month: n => nombresMeses[n],
          day: n => nombresDias[n]
        }
      }
    });
  } catch (error) {
    logDebug(`Error al formatear fecha ${date}:`, error);
    return 'Fecha inválida';
  }
}

function obtenerPeriodoActual(tipoMeta) {
  const hoy = new Date();
  return tipoMeta === 'semanal' ? {
    tipo: 'semanal',
    inicio: startOfWeek(hoy, { weekStartsOn: 1 }),
    fin: endOfWeek(hoy, { weekStartsOn: 1 }),
    numeroSemana: getWeek(hoy, { weekStartsOn: 1 }),
    año: getYear(hoy),
    nombre: `Semana ${getWeek(hoy, { weekStartsOn: 1 })} del ${getYear(hoy)}`
  } : {
    tipo: 'mensual',
    inicio: startOfMonth(hoy),
    fin: endOfMonth(hoy),
    mes: getMonth(hoy),
    año: getYear(hoy),
    nombre: `${nombresMeses[getMonth(hoy)]} ${getYear(hoy)}`
  };
}

function calcularDiasPeriodo(periodo) {
  const hoy = new Date();
  const inicio = new Date(periodo.inicio);
  const fin = new Date(periodo.fin);
  
  // Asegurar que las fechas sean válidas
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    logDebug('Fechas inválidas en calcularDiasPeriodo:', periodo);
    return { transcurridos: 0, totales: 0, restantes: 0 };
  }

  const transcurridos = Math.max(differenceInDays(hoy, inicio) + 1, 0);
  const totales = differenceInDays(fin, inicio) + 1;
  const restantes = Math.max(differenceInDays(fin, hoy), 0);

  return {
    transcurridos: Math.min(transcurridos, totales), // Evitar transcurridos > totales
    totales,
    restantes
  };
}

// Gestión de datos
function obtenerPedidos() {
  if (cachedPedidos) return cachedPedidos;
  try {
    cachedPedidos = JSON.parse(localStorage.getItem('pedidos') || '[]'); // Cambiar a 'pedidos'
    cachedPedidos = cachedPedidos
      .filter(pedido => {
        if (!pedido || typeof pedido !== 'object' || !pedido.estado || !pedido.items || !Array.isArray(pedido.items)) {
          logDebug('Pedido inválido filtrado:', pedido);
          return false;
        }
        return pedido.estado === 'completado';
      })
      .map(pedido => ({
        ...pedido,
        costoEnvio: asegurarNumero(pedido.costoEnvio),
        precioEnvio: asegurarNumero(pedido.precioEnvio || pedido.costoEnvio)
      }));
    return cachedPedidos;
  } catch (error) {
    logDebug('Error al leer pedidos:', error);
    mostrarNotificacion('Error al cargar los datos de pedidos', 'error');
    return [];
  }
}

function limpiarPedidosInvalidos() {
  try {
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]'); // Cambiar a 'pedidos'
    const pedidosValidos = pedidos.filter(pedido => 
      pedido && 
      typeof pedido === 'object' && 
      pedido.estado && 
      pedido.items && 
      Array.isArray(pedido.items)
    );
    localStorage.setItem('pedidos', JSON.stringify(pedidosValidos));
    logDebug(`Se limpiaron ${pedidos.length - pedidosValidos.length} pedidos inválidos`);
  } catch (error) {
    logDebug('Error al limpiar pedidos:', error);
    mostrarNotificacion('Error al limpiar datos de pedidos', 'error');
  }
}

function guardarPedidos(pedidos) {
  try {
    localStorage.setItem('pedidos', JSON.stringify(pedidos));
    cachedPedidos = null;
  } catch (error) {
    logDebug('Error al guardar pedidos:', error);
    mostrarNotificacion('Error al guardar los datos de pedidos', 'error');
  }
}

function obtenerGastos() {
  if (cachedGastos) return cachedGastos;
  try {
    cachedGastos = JSON.parse(localStorage.getItem('gastos')) || [];
    return cachedGastos;
  } catch (error) {
    logDebug('Error al leer gastos:', error);
    mostrarNotificacion('Error al cargar los datos de gastos', 'error');
    return [];
  }
}

function guardarGastos(gastos) {
  try {
    localStorage.setItem('gastos', JSON.stringify(gastos));
    cachedGastos = null;
  } catch (error) {
    logDebug('Error al guardar gastos:', error);
    mostrarNotificacion('Error al guardar los datos de gastos', 'error');
  }
}

function obtenerElemento(id) {
  const elemento = document.getElementById(id) || document.querySelector(id);
  if (!elemento) logDebug(`Elemento no encontrado: ${id}`);
  return elemento;
}

function formatearMoneda(valor) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(valor);
}

function asegurarNumero(valor, defecto = 0) {
  const num = parseFloat(valor);
  return isNaN(num) ? defecto : num;
}

// Notificaciones
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
    <span class="notificacion-texto">${sanitizarHTML(mensaje)}</span>
    <button class="notificacion-cerrar">×</button>
  `;

  document.body.appendChild(notificacion);

  const cerrarNotificacion = () => {
    notificacion.classList.add('desvanecer');
    setTimeout(() => notificacion.remove(), 300);
  };

  setTimeout(cerrarNotificacion, 5000);
  notificacion.querySelector('.notificacion-cerrar').addEventListener('click', cerrarNotificacion);
}

// Cálculos financieros centralizados
function calcularMetricasFinancieras(pedidos, gastos, desde, hasta) {
    const pedidosFiltrados = pedidos.filter(p => {
        const fechaPedido = new Date(p.fecha).toISOString().split('T')[0];
        return fechaPedido >= desde && fechaPedido <= hasta;
    });

    const gastosFiltrados = filtrarGastos(desde, hasta);
    const retirosFiltrados = filtrarRetiros(desde, hasta);
    const { topProductos, totalProductosVendidos, totalCostos, totalGanancias, margenGananciasGeneral, totalEnvios, gananciasEnvios } = calcularProductosConCostos(pedidosFiltrados, 10);
    const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPedidos = pedidosFiltrados.length;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
    const totalDescuentos = calcularTotalDescuentos(pedidosFiltrados);
    const totalGastosExternos = gastosFiltrados
        .filter(g => g.categoria === 'externo')
        .reduce((sum, g) => sum + g.monto, 0);
    const totalGastosInventario = gastosFiltrados
        .filter(g => g.categoria === 'inventario')
        .reduce((sum, g) => sum + g.monto, 0);
    
    // Calcular ingresos y retiros por separado
    const totalRetiros = retirosFiltrados
        .filter(r => (r.tipo === 'retiro' || !r.tipo) && !r.esAjusteCaja) // Excluir ajustes de caja
        .reduce((sum, retiro) => sum + (retiro.monto || 0), 0);
    const totalIngresos = retirosFiltrados
        .filter(r => r.tipo === 'ingreso' && !r.esAjusteCaja) // Excluir ajustes de caja
        .reduce((sum, retiro) => sum + (retiro.monto || 0), 0);

    // Calcular total de movimientos para dineroCaja (incluye ajustes)
    const totalRetirosCaja = retirosFiltrados
        .filter(r => r.tipo === 'retiro' || !r.tipo)
        .reduce((sum, retiro) => sum + (retiro.monto || 0), 0);
    const totalIngresosCaja = retirosFiltrados
        .filter(r => r.tipo === 'ingreso')
        .reduce((sum, retiro) => sum + (retiro.monto || 0), 0);

    // Calcular utilidad neta (sin ajustes de caja)
    let utilidadNeta = totalGanancias + totalIngresos - totalGastosExternos - totalRetiros;
    const excesoInventario = totalGastosInventario > totalCostos ? totalGastosInventario - totalCostos : 0;
    utilidadNeta -= excesoInventario;

    // Calcular dinero en caja (con ajustes de caja)
    const dineroCaja = totalVentas + totalIngresosCaja - totalGastosExternos - totalGastosInventario - totalRetirosCaja;

    // Depuración
    logDebug('Métricas financieras:', {
        totalVentas,
        totalGanancias,
        totalGastosExternos,
        totalGastosInventario,
        totalRetiros,
        totalIngresos,
        totalRetirosCaja,
        totalIngresosCaja,
        excesoInventario,
        utilidadNeta,
        dineroCaja
    });

    return {
        totalVentas,
        totalPedidos,
        ticketPromedio,
        totalDescuentos,
        topProductos,
        totalProductosVendidos,
        totalCostos,
        totalGanancias,
        margenGananciasGeneral,
        totalGastosExternos,
        totalGastosInventario,
        utilidadNeta,
        dineroCaja,
        excesoInventario,
        totalEnvios,
        gananciasEnvios,
        totalRetiros,
        totalIngresos
    };
}

// Dashboard
function actualizarDashboard() {
    try {
        // Limpiar caché para forzar recálculo
        cachedPedidos = null;
        cachedGastos = null;

        const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
        const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
        const pedidos = obtenerPedidos();
        const gastos = obtenerGastos();
        const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);

        // Actualizar elementos de la UI
        const utilidadNetaElement = obtenerElemento('utilidad-neta');
        const dineroCajaElement = obtenerElemento('dinero-caja');
        const totalVentasElement = obtenerElemento('total-ventas');
        const totalPedidosElement = obtenerElemento('total-pedidos');
        const ticketPromedioElement = obtenerElemento('ticket-promedio');
        const totalDescuentosElement = obtenerElemento('total-descuentos');
        const totalGastosExternosElement = obtenerElemento('total-gastos-externos');
        const totalGastosInventarioElement = obtenerElemento('total-gastos-inventario');
        const totalRetirosElement = obtenerElemento('total-retiros');

        if (utilidadNetaElement) {
            utilidadNetaElement.textContent = formatearMoneda(metricas.utilidadNeta);
            utilidadNetaElement.className = metricas.utilidadNeta >= 0 ? 'metric-value positive' : 'metric-value negative';
        }
        if (dineroCajaElement) {
            dineroCajaElement.textContent = formatearMoneda(metricas.dineroCaja);
            dineroCajaElement.className = metricas.dineroCaja >= 0 ? 'metric-value positive' : 'metric-value negative';
        }
        if (totalVentasElement) totalVentasElement.textContent = formatearMoneda(metricas.totalVentas);
        if (totalPedidosElement) totalPedidosElement.textContent = metricas.totalPedidos;
        if (ticketPromedioElement) ticketPromedioElement.textContent = formatearMoneda(metricas.ticketPromedio);
        if (totalDescuentosElement) totalDescuentosElement.textContent = formatearMoneda(metricas.totalDescuentos);
        if (totalGastosExternosElement) totalGastosExternosElement.textContent = formatearMoneda(metricas.totalGastosExternos);
        if (totalGastosInventarioElement) totalGastosInventarioElement.textContent = formatearMoneda(metricas.totalGastosInventario);
        if (totalRetirosElement) totalRetirosElement.textContent = formatearMoneda(metricas.totalRetiros);

        // Actualizar gráficos
        actualizarGraficoVentas(pedidos, desde, hasta);
        actualizarGraficoPie(metricas.topProductos);
        
        // Actualizar tablas
        actualizarTablaProductos(metricas.topProductos, metricas.totalVentas);
        actualizarTablaGastos();
        actualizarTablaRetiros();

        // Actualizar otras vistas (gráficos, tablas, etc.)
        actualizarTablaGastos();
        actualizarTablaRetiros();
        actualizarResumenGastos();
        actualizarUIMetas();
        actualizarBotonRetiroUtilidadNeta();

        console.log('Dashboard actualizado con métricas:', metricas);
    } catch (error) {
        logDebug('Error al actualizar dashboard:', error);
        mostrarNotificacion('Error al actualizar el dashboard', 'error');
    }
}

function actualizarElementosUIConCostos(
    totalVentas, totalPedidos, ticketPromedio, totalDescuentos, totalProductosVendidos,
    totalCostos, totalGanancias, margenGanancias, totalGastosExternos, utilidadNeta,
    totalEnvios, gananciasEnvios, totalGastosInventario, dineroCaja, excesoInventario,
    totalRetiros
) {
    totalVentas = asegurarNumero(totalVentas);
    totalPedidos = asegurarNumero(totalPedidos);
    ticketPromedio = asegurarNumero(ticketPromedio);
    totalDescuentos = asegurarNumero(totalDescuentos);
    totalProductosVendidos = asegurarNumero(totalProductosVendidos);
    totalCostos = asegurarNumero(totalCostos);
    totalGanancias = asegurarNumero(totalGanancias);
    margenGanancias = asegurarNumero(margenGanancias);
    totalGastosExternos = asegurarNumero(totalGastosExternos);
    utilidadNeta = asegurarNumero(utilidadNeta);
    totalEnvios = asegurarNumero(totalEnvios);
    gananciasEnvios = asegurarNumero(gananciasEnvios);
    totalGastosInventario = asegurarNumero(totalGastosInventario);
    dineroCaja = asegurarNumero(dineroCaja);
    excesoInventario = asegurarNumero(excesoInventario);
    totalRetiros = asegurarNumero(totalRetiros);

    const elementos = [
        { id: 'total-ventas', valor: formatearMoneda(totalVentas) },
        { id: 'total-pedidos', valor: totalPedidos.toLocaleString() },
        { id: 'ticket-promedio', valor: formatearMoneda(ticketPromedio) },
        { id: 'total-descuentos', valor: formatearMoneda(totalDescuentos) },
        { id: 'total-productos-vendidos', valor: `${totalProductosVendidos.toLocaleString()} productos` },
        { id: 'total-costos', valor: formatearMoneda(totalCostos) },
        { id: 'total-ganancias', valor: formatearMoneda(totalGanancias) },
        { id: 'margen-ganancias', valor: `${margenGanancias.toFixed(1)}%` },
        { id: 'total-gastos-externos', valor: formatearMoneda(totalGastosExternos) },
        { id: 'total-gastos-inventario', valor: formatearMoneda(totalGastosInventario) },
        { id: 'total-envios', valor: formatearMoneda(totalEnvios) },
        { id: 'ganancias-envios', valor: formatearMoneda(gananciasEnvios) },
        { id: 'exceso-inventario', valor: formatearMoneda(excesoInventario), className: excesoInventario > 0 ? 'metric-value negative' : 'metric-value' },
        { id: 'utilidad-neta', valor: formatearMoneda(utilidadNeta), className: utilidadNeta >= 0 ? 'metric-value positive' : 'metric-value negative' },
        { id: 'dinero-caja', valor: formatearMoneda(dineroCaja), className: dineroCaja >= 0 ? 'metric-value positive' : 'metric-value negative' },
        { id: 'total-retiros', valor: formatearMoneda(totalRetiros), className: 'metric-value' }
    ];

    elementos.forEach(({ id, valor, className }) => {
        const elemento = obtenerElemento(id);
        if (elemento) {
            elemento.textContent = valor;
            if (className) elemento.className = className;
        } else {
            logDebug(`Elemento no encontrado: ${id}`);
        }
    });
}

// Gastos
function agregarGasto(event) {
  event.preventDefault();
  const fecha = obtenerElemento(GASTOS_IDS.FECHA_GASTO)?.value;
  const monto = parseFloat(obtenerElemento(GASTOS_IDS.MONTO_GASTO)?.value);
  const tipo = obtenerElemento(GASTOS_IDS.TIPO_GASTO)?.value;
  const descripcion = sanitizarHTML(obtenerElemento(GASTOS_IDS.DESCRIPCION_GASTO)?.value || '');

  if (!fecha || isNaN(new Date(fecha).getTime())) {
    mostrarNotificacion('Por favor selecciona una fecha válida', 'warning');
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    mostrarNotificacion('Por favor ingresa un monto válido mayor a 0', 'warning');
    return;
  }
  if (!tipo) {
    mostrarNotificacion('Por favor selecciona un tipo de gasto', 'warning');
    return;
  }

  const tipoConfig = GASTOS_TIPOS.find(t => t.nombre === tipo);
  if (!tipoConfig) {
    mostrarNotificacion('Tipo de gasto no válido', 'error');
    return;
  }

  const gastos = obtenerGastos();
  const nuevoGasto = {
    id: Date.now(),
    fecha,
    monto,
    tipo,
    categoria: tipoConfig.categoria,
    descripcion,
    fechaRegistro: new Date().toISOString()
  };

  gastos.push(nuevoGasto);
  guardarGastos(gastos);
  mostrarNotificacion('Gasto registrado correctamente', 'success');

  const formulario = obtenerElemento(GASTOS_IDS.FORMULARIO_GASTO);
  if (formulario) formulario.reset();

  actualizarTablaGastos();
  actualizarResumenGastos();
  actualizarDashboard();
}

function filtrarGastos(desde, hasta) {
  const gastos = obtenerGastos();
  return gastos.filter(gasto => {
    const fechaGasto = new Date(gasto.fecha).toISOString().split('T')[0];
    return (!desde || fechaGasto >= desde) && (!hasta || fechaGasto <= hasta);
  });
}

function eliminarGasto(id) {
  if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
  const gastos = obtenerGastos().filter(gasto => gasto.id !== id);
  guardarGastos(gastos);
  mostrarNotificacion('Gasto eliminado correctamente', 'success');
  actualizarTablaGastos();
  actualizarResumenGastos();
  actualizarDashboard();
}

function actualizarTablaGastos() {
  const tbody = obtenerElemento(GASTOS_IDS.TABLA_GASTOS);
  if (!tbody) return;

  const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
  const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
  const gastosFiltrados = filtrarGastos(desde, hasta);

  tbody.innerHTML = gastosFiltrados.length === 0
    ? '<tr><td colspan="7" class="text-center">No hay gastos registrados</td></tr>'
    : '';

  gastosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(gasto => {
    const row = document.createElement('tr');
    row.classList.add(`${gasto.categoria}-row`);
    row.innerHTML = `
      <td>${new Date(gasto.fecha).toLocaleDateString('es-ES')}</td>
      <td>${sanitizarHTML(gasto.tipo)}</td>
      <td>${sanitizarHTML(gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1))}</td>
      <td class="text-right">${formatearMoneda(gasto.monto)}</td>
      <td>${sanitizarHTML(gasto.descripcion || '-')}</td>
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

function actualizarResumenGastos() {
  const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
  const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
  const gastosFiltrados = filtrarGastos(desde, hasta);

  const totalGastosExternos = gastosFiltrados
    .filter(gasto => gasto.categoria === 'externo')
    .reduce((sum, gasto) => sum + gasto.monto, 0);
  const totalGastosInventario = gastosFiltrados
    .filter(gasto => gasto.categoria === 'inventario')
    .reduce((sum, gasto) => sum + gasto.monto, 0);

  const elementoTotalGastosExternos = obtenerElemento('total-gastos-externos');
  if (elementoTotalGastosExternos) elementoTotalGastosExternos.textContent = formatearMoneda(totalGastosExternos);

  const elementoTotalGastosInventario = obtenerElemento('total-gastos-inventario');
  if (elementoTotalGastosInventario) elementoTotalGastosInventario.textContent = formatearMoneda(totalGastosInventario);

  actualizarGraficoGastos(gastosFiltrados);
  return { totalGastosExternos, totalGastosInventario };
}

function actualizarGraficoGastos(gastos) {
  const canvas = obtenerElemento(GASTOS_IDS.GRAFICO_GASTOS);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (charts.gastos) charts.gastos.destroy();

  const gastosPorTipoYCategoria = {};
  GASTOS_TIPOS.forEach(tipo => {
    gastosPorTipoYCategoria[tipo.nombre] = { externo: 0, inventario: 0 };
  });

  gastos.forEach(gasto => {
    gastosPorTipoYCategoria[gasto.tipo][gasto.categoria] += gasto.monto;
  });

  const labels = [];
  const datosExternos = [];
  const datosInventario = [];

  GASTOS_TIPOS.forEach(tipo => {
    if (gastosPorTipoYCategoria[tipo.nombre].externo > 0) {
      labels.push(`${tipo.nombre} (Externo)`);
      datosExternos.push(gastosPorTipoYCategoria[tipo.nombre].externo);
      datosInventario.push(0);
    }
    if (gastosPorTipoYCategoria[tipo.nombre].inventario > 0) {
      labels.push(`${tipo.nombre} (Inventario)`);
      datosExternos.push(0);
      datosInventario.push(gastosPorTipoYCategoria[tipo.nombre].inventario);
    }
  });

  if (labels.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.font = '16px Arial';
    ctx.fillText('No hay gastos para mostrar', canvas.width / 2, canvas.height / 2);
    return;
  }

  charts.gastos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Gastos Externos', data: datosExternos, backgroundColor: '#FF6384', borderWidth: 1 },
        { label: 'Gastos de Inventario', data: datosInventario, backgroundColor: '#36A2EB', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatearMoneda(context.raw)}` } }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Monto ($)' }, ticks: { callback: value => formatearMoneda(value) } }
      }
    }
  });
}

// Metas
function verificarYActualizarPeriodoMeta() {
  const nuevoPeriodo = obtenerPeriodoActual(tipoMetaActual);
  const haCambiado = tipoMetaActual === 'semanal'
    ? !isSameWeek(nuevoPeriodo.inicio, periodoMetaActual.inicio, { weekStartsOn: 1 })
    : !isSameMonth(nuevoPeriodo.inicio, periodoMetaActual.inicio);

  if (haCambiado) {
    periodoMetaActual = nuevoPeriodo;
    diasPeriodoActual = calcularDiasPeriodo(periodoMetaActual);
    mostrarNotificacion(`Nuevo período ${tipoMetaActual}: ${nuevoPeriodo.nombre}`, 'info');
  }
}

function calcularProyeccionMeta(ventasActuales, tipoMeta) {
  const diasTranscurridos = diasPeriodoActual.transcurridos;
  const diasTotales = diasPeriodoActual.totales;
  
  if (diasTranscurridos === 0) return ventasActuales;
  
  // Considerar solo días hábiles (lunes a sábado, excluyendo domingos)
  const diasHabilesTotales = tipoMeta === 'semanal' ? 6 : Math.floor(diasTotales * 6 / 7);
  const diasHabilesTranscurridos = Math.min(diasTranscurridos, diasHabilesTotales);
  
  return (ventasActuales / diasHabilesTranscurridos) * diasHabilesTotales;
}

function generarConsejosMeta(porcentaje, faltante, tipoMeta, topProductos) {
  const consejos = [];
  const metaLabel = METAS_CONFIG[tipoMeta].label;
  const diasRestantes = diasPeriodoActual.restantes;

  if (porcentaje >= 100) {
    consejos.push(`✅ ¡Meta ${metaLabel} alcanzada! Excelente trabajo.`);
    consejos.push(`🔝 Considera aumentar la meta para el próximo período en un 10-20%.`);
  } else if (porcentaje >= 75) {
    consejos.push(`👍 Estás cerca de la meta ${metaLabel}. Faltan ${formatearMoneda(faltante)}.`);
    consejos.push(`💡 Promociona productos de alto margen como ${topProductos[0]?.nombre || 'tus mejores productos'} para cerrar la brecha.`);
  } else if (porcentaje >= 50) {
    consejos.push(`⚠️ Estás a la mitad de la meta ${metaLabel}. Faltan ${formatearMoneda(faltante)}.`);
    consejos.push(`📈 Revisa gastos externos y optimiza costos en categorías altas como "${obtenerGastoMayor()?.tipo || 'gastos externos'}".`);
  } else {
    consejos.push(`😟 Estás por debajo del 50% de la meta ${metaLabel}. Faltan ${formatearMoneda(faltante)}.`);
    consejos.push(`🚀 Implementa promociones urgentes o combos para aumentar ventas en ${diasRestantes} días.`);
  }

  if (tipoMeta === 'semanal' && diasRestantes <= 2) {
    consejos.push(`⏳ ¡Solo ${diasRestantes} días restantes! Enfócate en promociones rápidas.`);
  } else if (tipoMeta === 'mensual' && diasRestantes <= 5) {
    consejos.push(`📅 Quedan ${diasRestantes} días del mes. Revisa inventario y gastos urgentes.`);
  }

  if (topProductos.length > 0 && topProductos[0].margenGanancia < 30) {
    consejos.push(`⚠️ Tu producto más vendido (${topProductos[0].nombre}) tiene un margen bajo (${topProductos[0].margenGanancia.toFixed(1)}%). Considera ajustar precios o costos.`);
  }

  return consejos.map(c => `<div class="meta-tip">${sanitizarHTML(c)}</div>`).join('');
}

function obtenerGastoMayor() {
  const gastos = obtenerGastos();
  const gastosPorTipo = {};
  GASTOS_TIPOS.forEach(tipo => gastosPorTipo[tipo.nombre] = 0);
  gastos.forEach(gasto => gastosPorTipo[gasto.tipo] += gasto.monto);
  const mayorGasto = Object.entries(gastosPorTipo).reduce((max, [tipo, monto]) => 
    monto > max.monto ? { tipo, monto } : max, { tipo: '', monto: 0 });
  return mayorGasto.monto > 0 ? mayorGasto : null;
}

function actualizarUIMetas() {
    verificarYActualizarPeriodoMeta();
    const { inicio, fin } = periodoMetaActual;
    const pedidos = obtenerPedidos().filter(p => {
        const fechaPedido = new Date(p.fecha);
        return isWithinInterval(fechaPedido, { start: inicio, end: fin });
    });
    const metricas = calcularMetricasFinancieras(pedidos, obtenerGastos(), 
        inicio.toISOString().split('T')[0], 
        fin.toISOString().split('T')[0]
    );

    const config = METAS_CONFIG[tipoMetaActual];
    const ventas = metricas.totalVentas;
    const ganancias = metricas.totalGanancias; // Usar totalGanancias en lugar de utilidadNeta
    const porcentajeVentas = Math.min((ventas / config.metaVentas) * 100, 100);
    const porcentajeGanancias = Math.min((ganancias / config.metaGanancias) * 100, 100);
    const faltanteVentas = Math.max(config.metaVentas - ventas, 0);
    const faltanteGanancias = Math.max(config.metaGanancias - ganancias, 0);
    const proyeccion = calcularProyeccionMeta(ventas, tipoMetaActual);

    // Depuración para investigar -$853
    logDebug('Actualizar UI Metas:', {
        tipoMetaActual,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        totalVentas: ventas,
        totalGanancias: ganancias,
        utilidadNeta: metricas.utilidadNeta,
        totalRetiros: metricas.totalRetiros,
        totalIngresos: metricas.totalIngresos,
        totalAjustesRetiros: metricas.totalAjustesRetiros,
        totalAjustesIngresos: metricas.totalAjustesIngresos,
        porcentajeGanancias,
        faltanteGanancias,
        config
    });

    const rangoFechas = tipoMetaActual === 'semanal'
        ? `${formatearFecha(inicio, 'dd MMM')} - ${formatearFecha(fin, 'dd MMM')}`
        : formatearFecha(inicio, 'MMMM yyyy');

    // Determinar el color dinámico de la barra según el progreso
    const progressColor = porcentajeGanancias >= 100
        ? config.colorCompleto
        : porcentajeGanancias >= 75
            ? config.colorAlto
            : porcentajeGanancias >= 50
                ? config.colorMedio
                : config.colorBajo;

    // Generar CSS dinámico para la animación de la barra de progreso
    const styleId = `progress-bar-style-${tipoMetaActual}`;
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = `
        .progress-bar-${tipoMetaActual} {
            background: linear-gradient(90deg, ${progressColor}, ${config.colorBase});
            animation: progressAnimation 1.5s ease-in-out;
            transition: width 0.5s ease-in-out;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            position: relative;
            overflow: hidden;
        }
        .progress-bar-${tipoMetaActual}::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                45deg,
                rgba(255,255,255,0.1) 25%,
                transparent 25%,
                transparent 50%,
                rgba(255,255,255,0.1) 50%,
                rgba(255,255,255,0.1) 75%,
                transparent 75%,
                transparent
            );
            background-size: 30px 30px;
            animation: moveStripes 2s linear infinite;
        }
        @keyframes progressAnimation {
            0% { width: 0%; }
            100% { width: ${porcentajeGanancias}%; }
        }
        @keyframes moveStripes {
            0% { background-position: 0 0; }
            100% { background-position: 30px 30px; }
        }
        .progress-bar-${tipoMetaActual}:hover::before {
            content: '${porcentajeGanancias.toFixed(1)}%';
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .progress-bar-${tipoMetaActual}:hover::before {
            opacity: 1;
        }
    `;

    const contenedor = document.getElementById(`meta-${tipoMetaActual}-container`);
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="meta-header">
                <h4>${tipoMetaActual === 'mensual' ? '📅' : '📆'} Meta ${config.label} (${sanitizarHTML(rangoFechas)})</h4>
                <span class="badge ${porcentajeGanancias >= 100 ? 'bg-success' : porcentajeGanancias >= 75 ? 'bg-warning' : 'bg-danger'}">
                    ${porcentajeGanancias.toFixed(1)}% ${porcentajeGanancias >= 100 ? '🏆' : ''}
                </span>
            </div>
            <div class="meta-progress">
                <div class="progress" style="height: 30px; background-color: ${config.colorFaltante}; border-radius: 15px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div class="progress-bar progress-bar-${tipoMetaActual}" style="width: ${porcentajeGanancias}%;">
                        <span class="progress-text" style="color: #fff; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                            ${porcentajeGanancias.toFixed(1)}% (${formatearMoneda(ganancias)} / ${formatearMoneda(config.metaGanancias)})
                        </span>
                    </div>
                </div>
            </div>
            <div class="meta-stats">
                <div class="stat"><span>Ventas:</span><strong>${formatearMoneda(ventas)}</strong></div>
                <div class="stat"><span>Meta Ventas:</span><strong>${formatearMoneda(config.metaVentas)}</strong></div>
                <div class="stat"><span>Faltan Ventas:</span><strong>${formatearMoneda(faltanteVentas)}</strong></div>
                <div class="stat"><span>Ganancias:</span><strong class="${ganancias >= 0 ? 'text-success' : 'text-danger'}">${formatearMoneda(ganancias)}</strong></div>
                <div class="stat"><span>Meta Ganancias:</span><strong>${formatearMoneda(config.metaGanancias)}</strong></div>
                <div class="stat"><span>Faltan Ganancias:</span><strong>${formatearMoneda(faltanteGanancias)}</strong></div>
                <div class="stat"><span>Utilidad Neta (Referencia):</span><strong class="${metricas.utilidadNeta >= 0 ? 'text-success' : 'text-danger'}">${formatearMoneda(metricas.utilidadNeta)}</strong></div>
                <div class="stat"><span>Días Transcurridos:</span><strong>${diasPeriodoActual.transcurridos} de ${diasPeriodoActual.totales}</strong></div>
                <div class="stat"><span>Días Restantes:</span><strong>${diasPeriodoActual.restantes} días</strong></div>
                <div class="stat"><span>Proyección Ventas:</span><strong class="${proyeccion >= config.metaVentas ? 'text-success' : 'text-warning'}">${formatearMoneda(proyeccion)}</strong></div>
            </div>
            <div class="meta-tips">
                ${generarConsejosMeta(porcentajeGanancias, faltanteGanancias, tipoMetaActual, metricas.topProductos)}
            </div>
        `;
    }
}

// Depuración adicional para la meta semanal
function depurarMetaSemanal() {
    tipoMetaActual = 'semanal'; // Forzar la meta semanal
    verificarYActualizarPeriodoMeta();
    const { inicio, fin } = periodoMetaActual;
    const pedidos = obtenerPedidos().filter(p => {
        const fechaPedido = new Date(p.fecha);
        return isWithinInterval(fechaPedido, { start: inicio, end: fin });
    });
    const gastos = obtenerGastos().filter(g => {
        const fechaGasto = new Date(g.fecha);
        return isWithinInterval(fechaGasto, { start: inicio, end: fin });
    });
    const retiros = obtenerRetiros().filter(r => {
        const fechaRetiro = new Date(r.fecha);
        return isWithinInterval(fechaRetiro, { start: inicio, end: fin });
    });
    const metricas = calcularMetricasFinancieras(pedidos, gastos, 
        inicio.toISOString().split('T')[0], 
        fin.toISOString().split('T')[0]
    );

    logDebug('Depuración Meta Semanal:', {
        periodo: { inicio: inicio.toISOString(), fin: fin.toISOString() },
        pedidosFiltrados: pedidos,
        gastosFiltrados: gastos,
        retirosFiltrados: retiros,
        metricas: {
            totalVentas: metricas.totalVentas,
            totalGanancias: metricas.totalGanancias,
            totalGastosExternos: metricas.totalGastosExternos,
            totalGastosInventario: metricas.totalGastosInventario,
            totalRetiros: metricas.totalRetiros,
            totalIngresos: metricas.totalIngresos,
            totalAjustesRetiros: metricas.totalAjustesRetiros,
            totalAjustesIngresos: metricas.totalAjustesIngresos,
            utilidadNeta: metricas.utilidadNeta
        },
        config: METAS_CONFIG.semanal
    });
}

function alternarVistaMeta() {
  const contenedorMensual = document.getElementById('meta-mensual-container');
  const contenedorSemanal = document.getElementById('meta-semanal-container');
  if (contenedorMensual) contenedorMensual.style.display = tipoMetaActual === 'mensual' ? 'block' : 'none';
  if (contenedorSemanal) contenedorSemanal.style.display = tipoMetaActual === 'semanal' ? 'block' : 'none';
}

// Productos y costos
function obtenerCostoProducto(nombreProducto) {
  const nombre = nombreProducto.toLowerCase().trim();
  if (COSTOS_PRODUCTOS[nombre]) return COSTOS_PRODUCTOS[nombre];
  for (const [key, datos] of Object.entries(COSTOS_PRODUCTOS)) {
    if (nombre.includes(key)) return datos;
  }
  if (nombre.includes('alitas')) return { costo: 55, precio: 75 };
  if (nombre.includes('boneless')) return { costo: 45, precio: 70 };
  if (nombre.includes('papas')) return { costo: 15, precio: 35 };
  return { costo: 0, precio: 0 };
}

function calcularProductosConCostos(pedidos, limite = 10) {
  const productosMap = {};
  let totalProductosVendidos = 0;
  let totalCostos = 0;
  let totalGanancias = 0;
  let totalEnvios = 0;
  let gananciasEnvios = 0;
  let costosEnvios = 0;

  const combos = window.ComboManager ? window.ComboManager.cargarCombosGuardados() : [];
  const COSTOS_ESPECIALES = {
    alitas: { costoPorPieza: 11, costoPorGramo: null },
    boneless: { costoPorPieza: 15, costoPorGramo: 0.25 }
  };

  pedidos.forEach(pedido => {
    const costoEnvio = asegurarNumero(pedido.costoEnvio);
    const precioEnvio = asegurarNumero(pedido.precioEnvio || 0);
    const gananciaEnvio = precioEnvio - costoEnvio;
    totalEnvios += precioEnvio;
    gananciasEnvios += gananciaEnvio;
    costosEnvios += costoEnvio;

    if (!pedido.items || !Array.isArray(pedido.items)) return;

    pedido.items.forEach(item => {
      const nombre = item.nombre ? item.nombre.toLowerCase().trim() : 'Producto sin nombre';
      const cantidad = asegurarNumero(item.cantidad);
      const precio = asegurarNumero(item.precio);
      const totalVenta = precio * cantidad;

      if (item.esCombo && item.comboId) {
        const combo = combos.find(c => String(c.id) === String(item.comboId));
        if (!combo) {
          logDebug(`Combo con ID ${item.comboId} no encontrado`);
          return;
        }

        const costoTotalCombo = combo.items.reduce((sum, comboItem) => {
          const costoUnitario = asegurarNumero(comboItem.costoUnitario);
          const cantidadItem = asegurarNumero(comboItem.cantidad);
          return sum + (costoUnitario * cantidadItem);
        }, 0) * cantidad;
        const gananciasCombo = totalVenta - costoTotalCombo;

        if (!productosMap[nombre]) {
          productosMap[nombre] = {
            cantidad: 0,
            total: 0,
            costo: 0,
            ganancias: 0,
            costoUnitario: costoTotalCombo / cantidad,
            precioUnitario: precio,
            esCombo: true,
            esEspecial: false
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
        let costoTotalEspecial = 0;

        item.combinaciones.forEach(combinacion => {
          if (combinacion.producto === 'alitas') {
            costoTotalEspecial += combinacion.cantidad * COSTOS_ESPECIALES.alitas.costoPorPieza;
          } else if (combinacion.producto === 'boneless') {
            costoTotalEspecial += combinacion.tipoMedida === 'piezas'
              ? combinacion.cantidad * COSTOS_ESPECIALES.boneless.costoPorPieza
              : combinacion.cantidad * COSTOS_ESPECIALES.boneless.costoPorGramo;
          }
        });

        costoTotalEspecial *= cantidad;
        const gananciasEspecial = totalVenta - costoTotalEspecial;

        if (!productosMap[nombre]) {
          productosMap[nombre] = {
            cantidad: 0,
            total: 0,
            costo: 0,
            ganancias: 0,
            costoUnitario: costoTotalEspecial / cantidad,
            precioUnitario: precio,
            esCombo: false,
            esEspecial: true
          };
        }

        productosMap[nombre].cantidad += cantidad;
        productosMap[nombre].total += totalVenta;
        productosMap[nombre].costo += costoTotalEspecial;
        productosMap[nombre].ganancias += gananciasEspecial;

        totalProductosVendidos += cantidad;
        totalCostos += costoTotalEspecial;
        totalGanancias += gananciasEspecial;
      } else {
        const datosProducto = obtenerCostoProducto(nombre);
        const costoUnitario = datosProducto.costo;
        const costoTotal = costoUnitario * cantidad;
        const gananciasProducto = totalVenta - costoTotal;

        if (!productosMap[nombre]) {
          productosMap[nombre] = {
            cantidad: 0,
            total: 0,
            costo: 0,
            ganancias: 0,
            costoUnitario,
            precioUnitario: precio,
            esCombo: false,
            esEspecial: false
          };
        }

        productosMap[nombre].cantidad += cantidad;
        productosMap[nombre].total += totalVenta;
        productosMap[nombre].costo += costoTotal;
        productosMap[nombre].ganancias += gananciasProducto;

        totalProductosVendidos += cantidad;
        totalCostos += costoTotal;
        totalGanancias += gananciasProducto;
      }
    });
  });

  const totalVentasPeriodo = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
  const margenGeneral = totalVentasPeriodo > 0 ? ((totalGanancias + gananciasEnvios) / totalVentasPeriodo) * 100 : 0;

  const topProductos = Object.entries(productosMap)
    .map(([nombre, datos]) => ({
      nombre,
      ...datos,
      margenGanancia: datos.total > 0 ? ((datos.ganancias / datos.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);

  return {
    topProductos,
    totalProductosVendidos,
    totalCostos: totalCostos + costosEnvios,
    totalGanancias: totalGanancias + gananciasEnvios,
    totalEnvios,
    gananciasEnvios,
    costosEnvios,
    margenGananciasGeneral: margenGeneral
  };
}

// Gráficos
function actualizarGraficoVentas(pedidos, desde, hasta) {
  const canvas = obtenerElemento(IDS.VENTAS_CHART);
  if (!canvas) {
    console.error('Canvas #ventas-chart no encontrado');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Contexto 2D no disponible');
    return;
  }

  if (window.ventasChart) window.ventasChart.destroy();
  if (charts.ventas) charts.ventas.destroy();

  const pedidosFiltrados = pedidos.filter(p => 
    p.estado === 'completado' && 
    p.fecha >= desde && 
    p.fecha <= hasta + 'T23:59:59.999Z'
  );
  console.log('Pedidos filtrados:', pedidosFiltrados);

  const fechas = [];
  const inicio = new Date(desde);
  const fin = new Date(hasta);
  for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
    fechas.push(fecha.toISOString().split('T')[0]);
  }

  const ventasPorFecha = {};
  fechas.forEach(fecha => ventasPorFecha[fecha] = 0);
  pedidosFiltrados.forEach(pedido => {
    const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
    if (ventasPorFecha[fechaPedido] !== undefined) {
      ventasPorFecha[fechaPedido] += pedido.total || 0;
    }
  });

  console.log('Fechas:', fechas);
  console.log('Ventas por fecha:', ventasPorFecha);

  charts.ventas = new Chart(ctx, {
    type: chartType || 'line',
    data: {
      labels: fechas,
      datasets: [{
        label: 'Ventas por día',
        data: fechas.map(fecha => ventasPorFecha[fecha]),
        backgroundColor: chartType === 'bar' ? 'rgba(54, 162, 235, 0.7)' : 'rgba(75, 192, 192, 0.2)',
        borderColor: chartType === 'bar' ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        fill: chartType === 'line',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: context => `Ventas: ${formatearMoneda(context.raw)}` } },
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Monto ($)' }, ticks: { callback: value => formatearMoneda(value) } },
        x: { title: { display: true, text: 'Fecha' }, grid: { display: false } }
      }
    }
  });
  console.log('Gráfico de ventas actualizado');
}

function actualizarGraficoPie(topProductos) {
  const canvas = obtenerElemento(IDS.PIE_CHART);
  if (!canvas) {
    console.error('Canvas #chart-pie-productos no encontrado');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Contexto 2D no disponible');
    return;
  }

  if (window.productosChart) window.productosChart.destroy();
  if (charts.productos) charts.productos.destroy();

  console.log('Top productos para gráfico:', topProductos);

  charts.productos = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: topProductos.map(p => p.nombre),
      datasets: [{
        label: 'Productos más vendidos',
        data: topProductos.map(p => p.total),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: context => `${context.label}: ${formatearMoneda(context.raw)}` } },
        legend: { position: 'top' }
      }
    }
  });
  console.log('Gráfico de productos actualizado');
}

function actualizarTablaProductos(productos, totalVentas) {
  const tbody = document.getElementById('tabla-productos-costos');
  if (!tbody) return;

  tbody.innerHTML = productos.length === 0
    ? '<tr><td colspan="7" class="text-center">No hay productos para mostrar</td></tr>'
    : '';

  productos.forEach(producto => {
    const porcentajeVentas = totalVentas > 0 ? ((producto.total / totalVentas) * 100).toFixed(1) : '0.0';
    const row = document.createElement('tr');
    
    if (producto.nombre === 'Envíos') {
      row.classList.add('envio-row');
    } else if (producto.esCombo) {
      row.classList.add('combo-row');
    } else if (producto.esEspecial) {
      row.classList.add('especial-row');
    }

    const colorMargen = producto.margenGanancia < 30 ? 'text-danger' : producto.margenGanancia < 50 ? 'text-warning' : 'text-success';

    row.innerHTML = `
      <td>${sanitizarHTML(producto.nombre)}
        ${producto.nombre === 'Envíos' ? ' <i class="fas fa-truck"></i>' : producto.esCombo ? ' <i class="fas fa-box"></i>' : producto.esEspecial ? ' <i class="fas fa-star"></i>' : ''}
      </td>
      <td class="text-right">${producto.cantidad.toLocaleString()}</td>
      <td class="text-right">${formatearMoneda(producto.total)}</td>
      <td class="text-right">${formatearMoneda(producto.costo)}</td>
      <td class="text-right ${producto.ganancias >= 0 ? 'text-success' : 'text-danger'}">${formatearMoneda(producto.ganancias)}</td>
      <td class="text-right ${colorMargen}">${producto.margenGanancia.toFixed(1)}%</td>
      <td class="text-right">${porcentajeVentas}%</td>
    `;
    tbody.appendChild(row);
  });
}

// Resumen detallado
function enviarResumenDetallado() {
    try {
        const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
        const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
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

        const pedidos = obtenerPedidos();
        const gastos = obtenerGastos();
        const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);
        const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;

        if (metricas.totalPedidos === 0 && filtrarGastos(desde, hasta).length === 0 && filtrarRetiros(desde, hasta).length === 0) {
            mostrarNotificacion('No hay datos en el rango de fechas seleccionado', 'warning');
            return;
        }

        const contieneCombos = pedidos.some(pedido => pedido.items.some(item => item.esCombo === true));
        const soloCombos = pedidos.every(pedido => pedido.items.every(item => item.esCombo === true));

        let analisisTendencia = '';
        if (diasDiferencia > 7) {
            const mitadPeriodo = new Date(fechaInicio.getTime() + (fechaFin - fechaInicio) / 2);
            const ventasPrimeraMitad = pedidos
                .filter(p => new Date(p.fecha) <= mitadPeriodo)
                .reduce((sum, p) => sum + (p.total || 0), 0);
            const ventasSegundaMitad = metricas.totalVentas - ventasPrimeraMitad;
            const cambioPorcentual = ventasPrimeraMitad > 0 ? ((ventasSegundaMitad - ventasPrimeraMitad) / ventasPrimeraMitad * 100) : 0;
            analisisTendencia = `• Tendencia ventas: ${cambioPorcentual >= 0 ? '↑' : '↓'} ${Math.abs(cambioPorcentual).toFixed(1)}% (${formatearMoneda(ventasPrimeraMitad)} → ${formatearMoneda(ventasSegundaMitad)})\n`;
        }

        let comparativaPeriodoAnterior = '';
        const periodoAnterior = calcularComparativaPeriodoAnterior(desde, hasta, pedidos);
        if (periodoAnterior) {
            const cambioVentas = periodoAnterior.totalVentas > 0 ? ((metricas.totalVentas - periodoAnterior.totalVentas) / periodoAnterior.totalVentas * 100) : 0;
            comparativaPeriodoAnterior = `• Comparativa con período anterior (${periodoAnterior.dias} días):\n` +
                `   - Ventas: ${cambioVentas >= 0 ? '+' : ''}${cambioVentas.toFixed(1)}%\n` +
                `   - Pedidos: ${periodoAnterior.totalPedidos > 0 ? ((metricas.totalPedidos - periodoAnterior.totalPedidos) / periodoAnterior.totalPedidos * 100).toFixed(1) : 'N/A'}%\n` +
                `   - Ticket promedio: ${periodoAnterior.ticketPromedio > 0 ? ((metricas.ticketPromedio - periodoAnterior.ticketPromedio) / periodoAnterior.ticketPromedio * 100).toFixed(1) : 'N/A'}%\n`;
        }

        const metaCalculada = tipoMetaActual === 'mensual'
            ? (META_MENSUAL / new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 0).getDate()) * diasDiferencia
            : (META_SEMANAL / 7) * diasDiferencia;
        const porcentajeMeta = (metricas.totalVentas / metaCalculada) * 100;

        const fechaFormateada = `${fechaInicio.toLocaleDateString('es-ES')} - ${fechaFin.toLocaleDateString('es-ES')}`;
        let mensaje = `📊 *REPORTE DETALLADO*\n📅 *Período:* ${fechaFormateada} (${diasDiferencia} días)\n\n` +
            `💰 *RESUMEN FINANCIERO*\n` +
            `• Ventas totales: ${formatearMoneda(metricas.totalVentas)}\n` +
            `• Costos de producción: ${formatearMoneda(metricas.totalCostos)}\n` +
            `• Gastos externos: ${formatearMoneda(metricas.totalGastosExternos)}\n` +
            `• Gastos de inventario: ${formatearMoneda(metricas.totalGastosInventario)}\n` +
            `• Retiros de caja: ${formatearMoneda(metricas.totalRetiros)}\n` +
            `• Exceso de inventario: ${formatearMoneda(metricas.excesoInventario)}\n` +
            `• Ganancias brutas: ${formatearMoneda(metricas.totalGanancias)}\n` +
            `• Ganancias netas: ${formatearMoneda(metricas.utilidadNeta)}\n` +
            `• Dinero en caja: ${formatearMoneda(metricas.dineroCaja)}\n` +
            `• Margen de ganancia: ${metricas.margenGananciasGeneral.toFixed(1)}%\n` +
            `${metricas.totalDescuentos > 0 ? `• Descuentos aplicados: ${formatearMoneda(metricas.totalDescuentos)}${contieneCombos && !soloCombos ? ' (aplicado a productos no combos)' : soloCombos ? ' (no aplicable, solo combos)' : ''}\n` : ''}` +
            `• Ventas por envíos: ${formatearMoneda(metricas.totalEnvios)}\n` +
            `• Ganancias por envíos: ${formatearMoneda(metricas.gananciasEnvios)}\n\n`;

        if (analisisTendencia) mensaje += `📈 *ANÁLISIS DE TENDENCIAS*\n${analisisTendencia}\n`;
        if (comparativaPeriodoAnterior) mensaje += `🔍 *COMPARATIVA*\n${comparativaPeriodoAnterior}\n`;

        const gastosFiltrados = filtrarGastos(desde, hasta);
        if (gastosFiltrados.length > 0) {
            mensaje += `💸 *GASTOS POR CATEGORÍA*\n`;
            const gastosPorTipo = {};
            GASTOS_TIPOS.forEach(tipo => gastosPorTipo[tipo.nombre] = { externo: 0, inventario: 0 });
            gastosFiltrados.forEach(gasto => gastosPorTipo[gasto.tipo][gasto.categoria] += gasto.monto);
            const gastosOrdenados = Object.entries(gastosPorTipo)
                .filter(([_, montos]) => montos.externo > 0 || montos.inventario > 0)
                .sort((a, b) => (b[1].externo + b[1].inventario) - (a[1].externo + a[1].inventario));
            gastosOrdenados.forEach(([tipo, montos], index) => {
                if (montos.externo > 0) mensaje += `${index + 1}. ${tipo} (Externo): ${formatearMoneda(montos.externo)}\n`;
                if (montos.inventario > 0) mensaje += `${index + 1}. ${tipo} (Inventario): ${formatearMoneda(montos.inventario)}\n`;
            });
            mensaje += `\n`;
        }

        const retirosFiltrados = filtrarRetiros(desde, hasta);
        if (retirosFiltrados.length > 0) {
            mensaje += `💵 *RETIROS DE CAJA*\n`;
            retirosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach((retiro, index) => {
                mensaje += `${index + 1}. ${new Date(retiro.fecha).toLocaleDateString('es-ES')}: ${formatearMoneda(retiro.monto)} (${retiro.descripcion || 'Sin descripción'})\n`;
            });
            mensaje += `• Total retirado: ${formatearMoneda(metricas.totalRetiros)}\n\n`;
        }

        mensaje += `📋 *ESTADÍSTICAS GENERALES*\n` +
            `• Total de pedidos: ${metricas.totalPedidos.toLocaleString()}\n` +
            `• Productos vendidos: ${metricas.totalProductosVendidos.toLocaleString()}\n` +
            `• Ticket promedio: ${formatearMoneda(metricas.ticketPromedio)}\n` +
            `• Promedio diario: ${formatearMoneda(metricas.totalVentas / diasDiferencia)}\n\n` +
            `🎯 *PROGRESO DE META*\n` +
            `• Meta ${tipoMetaActual}: ${formatearMoneda(metaCalculada)}\n` +
            `• Progreso: ${porcentajeMeta.toFixed(1)}%\n` +
            `• ${porcentajeMeta >= 100 ? '✅ Meta alcanzada' : '⚠️ Meta no alcanzada'}\n\n` +
            `🏆 *TOP 5 PRODUCTOS MÁS VENDIDOS*\n`;
        metricas.topProductos.slice(0, 5).forEach((producto, index) => {
            mensaje += `${index + 1}. *${producto.nombre}${producto.esCombo ? ' (Combo)' : ''}*\n` +
                `   • Cantidad: ${producto.cantidad.toLocaleString()}\n` +
                `   • Ventas: ${formatearMoneda(producto.total)}\n` +
                `   • Ganancias: ${formatearMoneda(producto.ganancias)}\n` +
                `   • Margen: ${producto.margenGanancia.toFixed(1)}%\n\n`;
        });

        if (mensaje.length > 50000) {
            const partesImportantes = [
                mensaje.match(/📊.*?\n\n/)[0],
                mensaje.match(/💰.*?\n\n/)[0],
                mensaje.match(/🎯.*?\n\n/)[0],
                mensaje.match(/🏆.*?%\n\n/)[0]
            ].join('\n');
            mensaje = partesImportantes + "\n\n... [RESUMEN ACORTADO POR LÍMITE DE CARACTERES] ...\n";
        }

        mensaje += `⏰ *Generado el ${new Date().toLocaleString('es-ES')}*`;
        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    } catch (error) {
        logDebug('Error generando resumen:', error);
        mostrarNotificacion('Error al generar el resumen: ' + error.message, 'error');
    }
}

function calcularComparativaPeriodoAnterior(desde, hasta, todosPedidos) {
  const fechaInicio = new Date(desde);
  const fechaFin = new Date(hasta);
  const duracionDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;

  const fechaInicioAnterior = new Date(fechaInicio);
  fechaInicioAnterior.setDate(fechaInicio.getDate() - duracionDias);
  const fechaFinAnterior = new Date(fechaInicio);
  fechaFinAnterior.setDate(fechaInicio.getDate() - 1);

  const pedidosAnterior = todosPedidos.filter(pedido => {
    const fechaPedido = new Date(pedido.fecha).toISOString().split('T')[0];
    const desdeAnterior = fechaInicioAnterior.toISOString().split('T')[0];
    const hastaAnterior = fechaFinAnterior.toISOString().split('T')[0];
    return fechaPedido >= desdeAnterior && fechaPedido <= hastaAnterior;
  });

  if (pedidosAnterior.length === 0) return null;

  const totalVentasAnterior = pedidosAnterior.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPedidosAnterior = pedidosAnterior.length;
  const ticketPromedioAnterior = totalPedidosAnterior > 0 ? totalVentasAnterior / totalPedidosAnterior : 0;

  return {
    totalVentas: totalVentasAnterior,
    totalPedidos: totalPedidosAnterior,
    ticketPromedio: ticketPromedioAnterior,
    dias: duracionDias,
    fechaInicio: fechaInicioAnterior.toLocaleDateString('es-ES'),
    fechaFin: fechaFinAnterior.toLocaleDateString('es-ES')
  };
}

// Configuración inicial
function configurarFechasIniciales() {
  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);

  const filtroDesde = obtenerElemento(IDS.FILTRO_DESDE);
  const filtroHasta = obtenerElemento(IDS.FILTRO_HASTA);

  if (filtroDesde) filtroDesde.valueAsDate = hace30Dias;
  if (filtroHasta) filtroHasta.valueAsDate = hoy;
}

function configurarFormularioGastos() {
  const tipoGastoSelect = obtenerElemento(GASTOS_IDS.TIPO_GASTO);
  const categoriaGastoInput = obtenerElemento('categoria-gasto');

  if (tipoGastoSelect && categoriaGastoInput) {
    tipoGastoSelect.innerHTML = `<option value="">Seleccionar...</option>` +
      GASTOS_TIPOS.map(tipo => `<option value="${tipo.nombre}">${tipo.nombre}</option>`).join('');

    tipoGastoSelect.addEventListener('change', () => {
      const tipoSeleccionado = tipoGastoSelect.value;
      const tipoConfig = GASTOS_TIPOS.find(t => t.nombre === tipoSeleccionado);
      categoriaGastoInput.value = tipoConfig ? tipoConfig.categoria : '';
    });
  } else {
    mostrarNotificacion('Error al configurar el formulario de gastos', 'error');
  }
}

// Función para manejar el panel colapsable
function configurarPanelFiltros() {
  const panel = document.getElementById('filtros-panel');
  const handle = panel.querySelector('.filtros-handle');
  let isDragging = false;

  if (!panel || !handle) {
    mostrarNotificacion('Error al configurar el panel de filtros', 'error');
    return;
  }

  // Expandir al hacer hover/touch
  panel.addEventListener('mouseenter', () => {
    panel.classList.remove('collapsed');
    panel.classList.add('active');
  });

  // Colapsar al salir, si no está interactuando
  panel.addEventListener('mouseleave', () => {
    if (!isDragging) {
      panel.classList.add('collapsed');
      panel.classList.remove('active');
    }
  });

  // Soporte para touch en móviles
  handle.addEventListener('touchstart', () => {
    isDragging = true;
    panel.classList.toggle('collapsed');
    panel.classList.toggle('active');
  });

  handle.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Aplicar filtros y mostrar animación
  const aplicarFiltros = debounce(() => {
    panel.classList.add('applied');
    setTimeout(() => panel.classList.remove('applied'), 500);
    actualizarDashboard();
  }, 300);

  const filtroDesde = document.getElementById('filtro-fecha-desde');
  const filtroHasta = document.getElementById('filtro-fecha-hasta');
  const filtroTop = document.getElementById('filtro-top-productos');

  if (filtroDesde) filtroDesde.addEventListener('change', aplicarFiltros);
  if (filtroHasta) filtroHasta.addEventListener('change', aplicarFiltros);
  if (filtroTop) filtroTop.addEventListener('change', aplicarFiltros);

  panel.addEventListener('mouseleave', () => {
    if (!isDragging) {
      panel.classList.add('collapsed');
      localStorage.setItem('filtrosPanelCollapsed', 'true');
    }
  });
  panel.addEventListener('mouseenter', () => {
    panel.classList.remove('collapsed');
    panel.classList.add('active');
    localStorage.setItem('filtrosPanelCollapsed', 'false');
  });
}

function configurarEventListeners() {
    if (!metaEventListenerAdded) {
        const filtroMeta = obtenerElemento(IDS.FILTRO_META);
        if (filtroMeta) {
            filtroMeta.value = tipoMetaActual;
            filtroMeta.addEventListener('change', (e) => {
                tipoMetaActual = e.target.value;
                localStorage.setItem('tipoMeta', tipoMetaActual);
                periodoMetaActual = obtenerPeriodoActual(tipoMetaActual);
                diasPeriodoActual = calcularDiasPeriodo(periodoMetaActual);
                actualizarUIMetas();
                alternarVistaMeta();
                actualizarBotonRetiroUtilidadNeta();
            });
            metaEventListenerAdded = true;
        }
    }

    const botonAplicar = document.getElementById('aplicar-filtros');
if (botonAplicar) {
  botonAplicar.addEventListener('click', () => {
    console.log('Filtros aplicados:', {
      desde: document.getElementById('filtro-fecha-desde').value,
      hasta: document.getElementById('filtro-fecha-hasta').value
    });
    window.dashboardFunctions.actualizarDashboard();
  });
}

    const btnCambiarGrafico = obtenerElemento(IDS.BTN_CAMBIAR_GRAFICO);
    if (btnCambiarGrafico) btnCambiarGrafico.addEventListener('click', alternarTipoGrafico);

    const closeModal = obtenerElemento(IDS.CLOSE_MODAL);
    if (closeModal) closeModal.addEventListener('click', () => {
        const modal = obtenerElemento(IDS.MODAL);
        if (modal) modal.style.display = 'none';
    });

    const filtroTop = obtenerElemento(IDS.FILTRO_TOP);
    if (filtroTop) filtroTop.addEventListener('change', debounce(actualizarDashboard, 300));

    const filtroDesde = obtenerElemento(IDS.FILTRO_DESDE);
    const filtroHasta = obtenerElemento(IDS.FILTRO_HASTA);
    if (filtroDesde) filtroDesde.addEventListener('change', debounce(() => {
        actualizarDashboard();
        actualizarBotonRetiroUtilidadNeta();
    }, 300));
    if (filtroHasta) filtroHasta.addEventListener('change', debounce(() => {
        actualizarDashboard();
        actualizarBotonRetiroUtilidadNeta();
    }, 300));

    const modal = obtenerElemento(IDS.MODAL);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    const formularioGasto = obtenerElemento(GASTOS_IDS.FORMULARIO_GASTO);
    if (formularioGasto) formularioGasto.addEventListener('submit', agregarGasto);

    const formularioRetiro = obtenerElemento(RETIROS_IDS.FORMULARIO_RETIRO);
    if (formularioRetiro) formularioRetiro.addEventListener('submit', agregarRetiro);

    const fechaGasto = obtenerElemento(GASTOS_IDS.FECHA_GASTO);
    if (fechaGasto) fechaGasto.valueAsDate = new Date();

    const fechaRetiro = obtenerElemento(RETIROS_IDS.FECHA_RETIRO);
    if (fechaRetiro) fechaRetiro.valueAsDate = new Date();

    const btnRetiroUtilidadNeta = obtenerElemento('btn-retiro-utilidad-neta');
    if (btnRetiroUtilidadNeta) btnRetiroUtilidadNeta.addEventListener('click', llenarFormularioRetiroUtilidadNeta);

    const btnEnviarResumen = obtenerElemento('btn-enviar-resumen-detallado');
    if (btnEnviarResumen) btnEnviarResumen.addEventListener('click', enviarResumenDetallado);

    // Configurar botón para ajustar caja
    const btnAjustarCaja = obtenerElemento('btn-ajustar-caja');
    if (btnAjustarCaja) {
        btnAjustarCaja.addEventListener('click', generarModalAjustarCaja);
    }

    configurarPanelFiltros();
    actualizarBotonRetiroUtilidadNeta(); // Inicializar estado del botón
}

function alternarTipoGrafico() {
  chartType = chartType === 'bar' ? 'line' : 'bar';
  actualizarDashboard();
  const btnCambiar = obtenerElemento(IDS.BTN_CAMBIAR_GRAFICO);
  if (btnCambiar) btnCambiar.textContent = chartType === 'bar' ? 'Cambiar a Líneas' : 'Cambiar a Barras';
}

function calcularTotalDescuentos(pedidos) {
  return pedidos.reduce((sum, pedido) => {
    if (!pedido || typeof pedido !== 'object' || !pedido.items || !Array.isArray(pedido.items)) {
      logDebug('Pedido inválido o sin items:', pedido);
      return sum;
    }
    if (!pedido.descuento) return sum;
    const resultadoDescuento = calcularTotalConDescuento(pedido);
    return sum + resultadoDescuento.descuento;
  }, 0);
}

function mostrarDashboard() {
  const modal = obtenerElemento(IDS.MODAL);
  if (!modal) {
    mostrarNotificacion('No se pudo encontrar el modal del dashboard', 'error');
    return;
  }

  modal.style.display = 'flex';
  configurarFechasIniciales();
  configurarEventListeners();
  actualizarDashboard();
}

function inicializarDashboard() {
    limpiarPedidosInvalidos();
    if (typeof Chart === 'undefined') {
        mostrarNotificacion('Error: Chart.js no está disponible', 'error');
        return;
    }

    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;

    configurarFechasIniciales();
    const elementoMetaMensual = obtenerElemento('meta-mensual-valor');
    const elementoMetaSemanal = obtenerElemento('meta-semanal-valor');

    if (elementoMetaMensual) elementoMetaMensual.textContent = formatearMoneda(METAS_CONFIG.mensual.metaGanancias);
    if (elementoMetaSemanal) elementoMetaSemanal.textContent = formatearMoneda(METAS_CONFIG.semanal.metaGanancias);

    configurarFechasIniciales();
    configurarFormularioGastos();
    configurarTabs();
    configurarEventListeners();
    actualizarTablaGastos();
    actualizarTablaRetiros();
    actualizarResumenGastos();
    actualizarUIMetas();
    alternarVistaMeta();
    actualizarBotonRetiroUtilidadNeta(); // Inicializar estado del botón

    const panel = document.getElementById('filtros-panel');
    if (panel) panel.classList.add('collapsed');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarDashboard);
} else {
  inicializarDashboard();
}

window.dashboardFunctions = {
  mostrarDashboard,
  actualizarDashboard,
  enviarResumenDetallado,
  alternarTipoGrafico,
  agregarNuevoPedido
};

function agregarNuevoPedido(pedido) {
    try {
        // Solo procesar pedidos completados
        if (pedido.estado !== 'completado') {
            console.log('Ignorando pedido no completado:', pedido.codigo);
            return;
        }

        // Obtener todos los pedidos de localStorage (no usar caché para evitar datos obsoletos)
        let pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');

        // Verificar si el pedido ya existe
        const indiceExistente = pedidos.findIndex(p => p.codigo === pedido.codigo);
        const pedidoExistente = indiceExistente !== -1 ? pedidos[indiceExistente] : null;

        // Formatear el pedido para asegurar consistencia
        const pedidoFormateado = {
            id: pedido.id || Date.now(),
            codigo: pedido.codigo,
            fecha: pedido.fecha || new Date().toISOString(),
            total: asegurarNumero(pedido.total),
            subtotal: asegurarNumero(pedido.subtotal),
            descuento: pedido.descuento ? {
                valor: asegurarNumero(pedido.descuento.valor),
                tipo: pedido.descuento.tipo || 'fijo',
                codigo: pedido.descuento.codigo || ''
            } : null,
            costoEnvio: asegurarNumero(pedido.costoEnvio),
            precioEnvio: asegurarNumero(pedido.precioEnvio || pedido.costoEnvio),
            items: Array.isArray(pedido.items) ? pedido.items.map(item => ({
                nombre: item.nombre || 'Producto sin nombre',
                cantidad: asegurarNumero(item.cantidad),
                precio: asegurarNumero(item.precio),
                esCombo: item.esCombo || false,
                comboId: item.comboId || null,
                esEspecial: item.esEspecial || false,
                combinaciones: item.combinaciones || null
            })) : [],
            notas: pedido.notas || '',
            estado: 'completado',
            fechaCompletado: pedido.fechaCompletado || new Date().toISOString(),
            fechaUltimaModificacion: pedido.fechaUltimaModificacion || new Date().toISOString()
        };

        // Actualizar o añadir el pedido
        if (pedidoExistente) {
            pedidos[indiceExistente] = pedidoFormateado;
            console.log('Actualizando pedido existente:', pedido.codigo);
        } else {
            pedidos.push(pedidoFormateado);
            console.log('Añadiendo nuevo pedido:', pedido.codigo);
        }

        // Guardar en localStorage y limpiar caché
        guardarPedidos(pedidos);
        cachedPedidos = null;

        // Actualizar dashboard y botón de retiro
        actualizarDashboard();
        actualizarBotonRetiroUtilidadNeta();
        mostrarNotificacion(`Nueva venta #${pedido.codigo} registrada en el dashboard`, 'success');
    } catch (error) {
        logDebug('Error al agregar nuevo pedido:', error);
        mostrarNotificacion('Error al registrar la nueva venta en el dashboard', 'error');
    }
}

// Modificar configurarTabs para manejar métricas secundarias
function configurarTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Desactivar todas las pestañas
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Activar la pestaña seleccionada
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      localStorage.setItem('activeTab', tabId); // Guardar pestaña activa
    });
  });

  // Botón para métricas secundarias
  const toggleMetricasBtn = document.getElementById('toggle-metricas');
  const metricasSecundarias = document.querySelector('.metricas-secundarias');
  if (toggleMetricasBtn && metricasSecundarias) {
    toggleMetricasBtn.addEventListener('click', () => {
      metricasSecundarias.classList.toggle('hidden');
      toggleMetricasBtn.textContent = metricasSecundarias.classList.contains('hidden')
        ? 'Mostrar más métricas'
        : 'Ocultar métricas';
      // Forzar actualización de gráficos si están visibles
      if (!metricasSecundarias.classList.contains('hidden')) {
        actualizarDashboard();
      }
    });
  }
}

// Constantes para el ajuste de caja
const AJUSTE_CAJA_IDS = {
    MODAL_AJUSTAR_CAJA: 'modal-ajustar-caja',
    FORMULARIO_AJUSTAR_CAJA: 'formulario-ajustar-caja',
    MONTO_CAJA: 'monto-caja',
    DESCRIPCION_AJUSTE: 'descripcion-ajuste',
    CLOSE_MODAL_AJUSTAR: 'close-modal-ajustar'
};

// Función para generar y mostrar el modal de ajuste de caja
function generarModalAjustarCaja() {
    // Evitar crear múltiples modales
    let modal = obtenerElemento(AJUSTE_CAJA_IDS.MODAL_AJUSTAR_CAJA);
    if (modal) {
        modal.style.display = 'flex';
        return;
    }

    // Crear el modal
    modal = document.createElement('div');
    modal.id = AJUSTE_CAJA_IDS.MODAL_AJUSTAR_CAJA;
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="${AJUSTE_CAJA_IDS.CLOSE_MODAL_AJUSTAR}">&times;</span>
            <h3>Ajustar Dinero en Caja</h3>
            <p>Ingresa el monto actual en caja para realizar un ajuste. Esto registrará un ingreso o retiro según la diferencia.</p>
            <form id="${AJUSTE_CAJA_IDS.FORMULARIO_AJUSTAR_CAJA}">
                <div class="form-group">
                    <label for="${AJUSTE_CAJA_IDS.MONTO_CAJA}">Monto actual en caja ($):</label>
                    <input type="number" id="${AJUSTE_CAJA_IDS.MONTO_CAJA}" min="0" step="0.01" required placeholder="Ejemplo: 5000.00">
                </div>
                <div class="form-group">
                    <label for="${AJUSTE_CAJA_IDS.DESCRIPCION_AJUSTE}">Descripción (opcional):</label>
                    <textarea id="${AJUSTE_CAJA_IDS.DESCRIPCION_AJUSTE}" placeholder="Motivo del ajuste"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Confirmar Ajuste</button>
            </form>
        </div>
    `;

    // Añadir el modal al body
    document.body.appendChild(modal);

    // Inyectar estilos CSS
    const styleId = 'modal-ajustar-caja-styles';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.innerHTML = `
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .modal-content {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            .${AJUSTE_CAJA_IDS.CLOSE_MODAL_AJUSTAR} {
                float: right;
                font-size: 20px;
                cursor: pointer;
                color: #333;
            }
            .${AJUSTE_CAJA_IDS.CLOSE_MODAL_AJUSTAR}:hover {
                color: #ff0000;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .form-group input,
            .form-group textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .btn-primary {
                background-color: #007bff;
                color: #fff;
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .btn-primary:hover {
                background-color: #0056b3;
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Configurar eventos del modal
    const formulario = modal.querySelector(`#${AJUSTE_CAJA_IDS.FORMULARIO_AJUSTAR_CAJA}`);
    const closeButton = modal.querySelector(`.${AJUSTE_CAJA_IDS.CLOSE_MODAL_AJUSTAR}`);
    const montoInput = modal.querySelector(`#${AJUSTE_CAJA_IDS.MONTO_CAJA}`);

    if (formulario) {
        formulario.addEventListener('submit', ajustarCaja);
    } else {
        logDebug('Formulario de ajuste de caja no encontrado');
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Mostrar el dinero en caja actual
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const pedidos = obtenerPedidos();
    const gastos = obtenerGastos();
    const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);
    if (montoInput) {
        montoInput.value = metricas.dineroCaja.toFixed(2);
    }
}

// Función para realizar el ajuste de caja
function ajustarCaja(event) {
    event.preventDefault();
    
    const montoCaja = parseFloat(obtenerElemento(AJUSTE_CAJA_IDS.MONTO_CAJA)?.value);
    const descripcion = sanitizarHTML(obtenerElemento(AJUSTE_CAJA_IDS.DESCRIPCION_AJUSTE)?.value || 'Ajuste de caja');
    
    if (isNaN(montoCaja) || montoCaja < 0) {
        mostrarNotificacion('Por favor ingresa un monto válido mayor o igual a 0', 'warning');
        return;
    }

    // Obtener métricas actuales
    const desde = obtenerElemento(IDS.FILTRO_DESDE)?.value;
    const hasta = obtenerElemento(IDS.FILTRO_HASTA)?.value;
    const pedidos = obtenerPedidos();
    const gastos = obtenerGastos();
    const metricas = calcularMetricasFinancieras(pedidos, gastos, desde, hasta);
    const dineroCajaActual = metricas.dineroCaja;

    // Calcular la diferencia
    const diferencia = montoCaja - dineroCajaActual;
    if (diferencia === 0) {
        mostrarNotificacion('No se requiere ajuste, el monto es igual al actual', 'info');
        return;
    }

    // Registrar el ajuste con tipo y marca de ajuste
    const retiros = obtenerRetiros();
    const nuevoAjuste = {
        id: Date.now(),
        fecha: new Date().toISOString().split('T')[0],
        monto: Math.abs(diferencia),
        tipo: diferencia > 0 ? 'ingreso' : 'retiro',
        esAjusteCaja: true, // Nuevo campo para identificar ajustes
        descripcion: `${diferencia > 0 ? 'Ingreso' : 'Retiro'} por ajuste de caja: ${descripcion}`,
        fechaRegistro: new Date().toISOString()
    };

    retiros.push(nuevoAjuste);
    guardarRetiros(retiros);

    // Limpiar caché
    cachedPedidos = null;
    cachedGastos = null;

    // Actualizar UI
    actualizarDashboard();
    actualizarTablaRetiros();
    actualizarBotonRetiroUtilidadNeta();

    // Cerrar modal y limpiar formulario
    const modal = obtenerElemento(AJUSTE_CAJA_IDS.MODAL_AJUSTAR_CAJA);
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
    const formulario = obtenerElemento(AJUSTE_CAJA_IDS.FORMULARIO_AJUSTAR_CAJA);
    if (formulario) {
        formulario.reset();
    }

    mostrarNotificacion(`Caja ajustada a ${formatearMoneda(montoCaja)}. ${diferencia > 0 ? 'Ingreso' : 'Retiro'} de ${formatearMoneda(Math.abs(diferencia))} registrado.`, 'success');
}
