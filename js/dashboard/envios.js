// dashboard.js - Versión completa mejorada

/**
 * Módulo principal del Dashboard
 * @version 2.0
 * @description Sistema de análisis de ventas, gastos y métricas financieras
 */

// =============================================
// CONFIGURACIÓN Y CONSTANTES
// =============================================
const CONFIG = {
  META_MENSUAL: 6000,
  META_SEMANAL: 6000 / (52 / 12), // 6000 / 4.333 ≈ 1384.62
  DIAS_SEMANA: 7,
  MESES_ANIO: 12,
  DIAS_MES_PROMEDIO: 30.4368, // 365.2422 / 12
  TOP_PRODUCTOS_DEFAULT: 10,
  RANGO_FECHAS_DEFAULT: 30 // días
};

const TIPOS_META = Object.freeze({
  MENSUAL: 'mensual',
  SEMANAL: 'semanal'
});

const GASTOS_CATEGORIAS = Object.freeze([
  'Sueldos', 'Renta', 'Servicios', 'Insumos',
  'Mantenimiento', 'Publicidad', 'Impuestos', 'Otros'
]);

const PRODUCTOS_CONFIG = Object.freeze({
  ALITAS: { costo: 55, precio: 75 },
  BONELESS: { costo: 45, precio: 70 },
  PAPAS: { costo: 15, precio: 35 },
  ENVIO: { costo: 0, precio: 0 }
});

const SELECTORES = Object.freeze({
  // Filtros
  FILTRO_DESDE: '#filtro-fecha-desde',
  FILTRO_HASTA: '#filtro-fecha-hasta',
  FILTRO_TOP: '#filtro-top-productos',
  FILTRO_META: '#filtro-tipo-meta',
  
  // Botones
  BTN_APLICAR: '#btn-aplicar-filtros',
  BTN_CAMBIAR_GRAFICO: '#btn-cambiar-grafico',
  BTN_ENVIAR_RESUMEN: '#btn-enviar-resumen-detallado',
  
  // Contenedores
  CONTENEDOR_META_MENSUAL: '#meta-mensual-container',
  CONTENEDOR_META_SEMANAL: '#meta-semanal-container',
  
  // Gráficos
  GRAFICO_VENTAS: '#ventas-chart',
  GRAFICO_PRODUCTOS: '#chart-pie-productos',
  GRAFICO_GASTOS: '#grafico-gastos',
  
  // Tablas
  TABLA_PRODUCTOS: '#tabla-productos-costos',
  TABLA_GASTOS: '#tabla-gastos'
});

// =============================================
// MÓDULO DE UTILIDADES
// =============================================
const DateUtils = {
  hoy: () => new Date(),
  
  restarDias: (fecha, dias) => {
    const result = new Date(fecha);
    result.setDate(result.getDate() - dias);
    return result;
  },
  
  formatearParaFiltro: (fecha) => fecha.toISOString().split('T')[0],
  
  formatearParaMostrar: (fecha) => fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }),
  
  diasEntre: (inicio, fin) => {
    const diff = new Date(fin) - new Date(inicio);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  },
  
  esEntre: (fecha, inicio, fin) => {
    const d = new Date(fecha);
    return d >= new Date(inicio) && d <= new Date(fin);
  },
  
  esValida: (fecha) => !isNaN(new Date(fecha).getTime())
};

const NumberUtils = {
  asegurarNumero: (valor, defecto = 0) => {
    const num = parseFloat(valor);
    return isNaN(num) ? defecto : num;
  },
  
  divisionSegura: (numerador, denominador, defecto = 0) => 
    denominador === 0 ? defecto : numerador / denominador,
  
  calcularPorcentaje: (parte, total) => 
    NumberUtils.divisionSegura(parte, total) * 100,
  
  redondear: (valor, decimales = 2) => 
    Math.round((valor + Number.EPSILON) * Math.pow(10, decimales)) / Math.pow(10, decimales)
};

const CurrencyUtils = {
  formatear: (valor) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(NumberUtils.asegurarNumero(valor))
};

// =============================================
// MÓDULO DE MANEJO DE DATOS
// =============================================
const DataService = {
  obtenerPedidos: () => {
    try {
      const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
      return pedidos.map(p => ({
        ...p,
        fecha: new Date(p.fecha),
        envio: {
          costo: NumberUtils.asegurarNumero(p.costoEnvio),
          precio: NumberUtils.asegurarNumero(p.precioEnvio || 0)
        },
        items: (p.items || []).map(item => ({
          ...item,
          costo: ProductService.obtenerCosto(item.nombre).costo
        }))
      }));
    } catch (error) {
      console.error('Error al leer pedidos:', error);
      return [];
    }
  },
  
  obtenerGastos: () => {
    try {
      return JSON.parse(localStorage.getItem('gastos')) || [];
    } catch (error) {
      console.error('Error al leer gastos:', error);
      return [];
    }
  },
  
  guardarDatos: (clave, datos) => {
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
      return true;
    } catch (error) {
      console.error(`Error al guardar ${clave}:`, error);
      return false;
    }
  }
};

// =============================================
// MÓDULO DE PRODUCTOS
// =============================================
const ProductService = {
  obtenerCosto: (nombreProducto) => {
    const nombre = nombreProducto.toLowerCase();
    for (const [key, producto] of Object.entries(PRODUCTOS_CONFIG)) {
      if (nombre.includes(key.toLowerCase())) {
        return producto;
      }
    }
    return { costo: 0, precio: 0 };
  },
  
  calcularEstadisticas: (pedidos, limite = CONFIG.TOP_PRODUCTOS_DEFAULT) => {
    const estadisticas = {
      productos: {},
      totalProductos: 0,
      totalVentas: 0,
      totalCostos: 0,
      totalGanancias: 0,
      totalEnvios: 0,
      gananciasEnvios: 0
    };

    pedidos.forEach(pedido => {
      // Cálculo de envíos
      estadisticas.totalEnvios += pedido.envio.precio;
      estadisticas.gananciasEnvios += pedido.envio.precio - pedido.envio.costo;

      // Cálculo de productos
      pedido.items.forEach(item => {
        const nombre = item.nombre?.split('(')[0].trim() || 'Producto sin nombre';
        if (!estadisticas.productos[nombre]) {
          estadisticas.productos[nombre] = {
            cantidad: 0,
            ventas: 0,
            costos: 0
          };
        }

        estadisticas.productos[nombre].cantidad += item.cantidad || 0;
        estadisticas.productos[nombre].ventas += (item.precio || 0) * (item.cantidad || 0);
        estadisticas.productos[nombre].costos += (item.costo || 0) * (item.cantidad || 0);

        estadisticas.totalProductos += item.cantidad || 0;
        estadisticas.totalVentas += (item.precio || 0) * (item.cantidad || 0);
        estadisticas.totalCostos += (item.costo || 0) * (item.cantidad || 0);
      });
    });

    // Calcular ganancias
    estadisticas.totalGanancias = estadisticas.totalVentas - estadisticas.totalCostos;

    // Preparar top productos
    const topProductos = Object.entries(estadisticas.productos)
      .map(([nombre, datos]) => ({
        nombre,
        ...datos,
        ganancias: datos.ventas - datos.costos,
        margen: NumberUtils.calcularPorcentaje(datos.ventas - datos.costos, datos.ventas)
      }))
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, limite);

    return {
      ...estadisticas,
      topProductos,
      margenGeneral: NumberUtils.calcularPorcentaje(
        estadisticas.totalGanancias + estadisticas.gananciasEnvios,
        estadisticas.totalVentas + estadisticas.totalEnvios
      )
    };
  }
};

// =============================================
// MÓDULO DE GRÁFICOS
// =============================================
const ChartService = {
  instancias: {},
  tipoGraficoActual: 'bar',
  
  inicializar: () => {
    Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
  },
  
  destruir: (id) => {
    if (ChartService.instancias[id]) {
      ChartService.instancias[id].destroy();
      delete ChartService.instancias[id];
    }
  },
  
  alternarTipoGrafico: () => {
    ChartService.tipoGraficoActual = ChartService.tipoGraficoActual === 'bar' ? 'line' : 'bar';
    Dashboard.actualizar();
  },
  
  renderizarGraficoVentas: (pedidos, desde, hasta) => {
    const ctx = document.querySelector(SELECTORES.GRAFICO_VENTAS)?.getContext('2d');
    if (!ctx) return;

    // Generar rango de fechas
    const fechas = [];
    const ventasPorFecha = {};
    
    for (let d = new Date(desde); d <= new Date(hasta); d.setDate(d.getDate() + 1)) {
      const fechaFormateada = DateUtils.formatearParaMostrar(d);
      fechas.push(fechaFormateada);
      ventasPorFecha[fechaFormateada] = 0;
    }

    // Calcular ventas por fecha
    pedidos.forEach(pedido => {
      const fechaPedido = DateUtils.formatearParaMostrar(pedido.fecha);
      if (ventasPorFecha[fechaPedido] !== undefined) {
        ventasPorFecha[fechaPedido] += pedido.total || 0;
      }
    });

    // Configuración del gráfico
    const config = {
      type: ChartService.tipoGraficoActual,
      data: {
        labels: fechas,
        datasets: [{
          label: 'Ventas por día',
          data: fechas.map(f => ventasPorFecha[f]),
          backgroundColor: ChartService.tipoGraficoActual === 'bar' ? 
            'rgba(54, 162, 235, 0.7)' : 'rgba(75, 192, 192, 0.2)',
          borderColor: ChartService.tipoGraficoActual === 'bar' ? 
            'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          fill: ChartService.tipoGraficoActual === 'line',
          tension: 0.4
        }]
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `Ventas: ${CurrencyUtils.formatear(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => CurrencyUtils.formatear(value)
            }
          }
        }
      }
    };

    ChartService.destruir('ventas');
    ChartService.instancias.ventas = new Chart(ctx, config);
  },
  
  renderizarGraficoProductos: (productos) => {
    const ctx = document.querySelector(SELECTORES.GRAFICO_PRODUCTOS)?.getContext('2d');
    if (!ctx) return;

    const productosFiltrados = productos.filter(p => p.ventas > 0);
    if (productosFiltrados.length === 0) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.font = '16px Arial';
      ctx.fillText('No hay datos para mostrar', ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }

    const colores = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#66BB6A', '#EF5350',
      '#29B6F6', '#AB47BC', '#FFA726', '#8D6E63'
    ];

    const config = {
      type: 'pie',
      data: {
        labels: productosFiltrados.map(p => p.nombre),
        datasets: [{
          data: productosFiltrados.map(p => p.ventas),
          backgroundColor: colores.slice(0, productosFiltrados.length),
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const porcentaje = NumberUtils.calcularPorcentaje(ctx.raw, 
                  ctx.dataset.data.reduce((a, b) => a + b, 0));
                return `${ctx.label}: ${CurrencyUtils.formatear(ctx.raw)} (${NumberUtils.redondear(porcentaje)}%)`;
              }
            }
          }
        }
      }
    };

    ChartService.destruir('productos');
    ChartService.instancias.productos = new Chart(ctx, config);
  }
};

// =============================================
// MÓDULO DE METAS
// =============================================
const MetaService = {
  tipoActual: TIPOS_META.MENSUAL,
  
  config: {
    [TIPOS_META.MENSUAL]: {
      label: 'Mensual',
      colorCompleto: '#4CAF50',
      colorProgreso: '#8BC34A',
      colorFaltante: '#FF5722'
    },
    [TIPOS_META.SEMANAL]: {
      label: 'Semanal',
      colorCompleto: '#2196F3',
      colorProgreso: '#64B5F6',
      colorFaltante: '#FF9800'
    }
  },
  
  alternarTipo: (tipo) => {
    MetaService.tipoActual = tipo;
    Dashboard.actualizar();
  },
  
  calcularProgreso: (ventas, gastos) => {
    const meta = MetaService.tipoActual === TIPOS_META.MENSUAL ? 
      CONFIG.META_MENSUAL : CONFIG.META_SEMANAL;
    const utilidadNeta = ventas - gastos;
    const porcentaje = Math.min(NumberUtils.calcularPorcentaje(utilidadNeta, meta), 100);
    const faltante = Math.max(meta - utilidadNeta, 0);
    
    return {
      meta,
      utilidadNeta,
      porcentaje,
      faltante,
      color: porcentaje >= 100 ? 
        MetaService.config[MetaService.tipoActual].colorCompleto :
        porcentaje >= 50 ? 
          MetaService.config[MetaService.tipoActual].colorProgreso :
          MetaService.config[MetaService.tipoActual].colorFaltante
    };
  },
  
  renderizar: (ventas, gastos) => {
    const { meta, utilidadNeta, porcentaje, faltante, color } = MetaService.calcularProgreso(ventas, gastos);
    const contenedorId = `meta-${MetaService.tipoActual}-container`;
    const contenedor = document.getElementById(contenedorId);
    
    if (!contenedor) return;
    
    contenedor.innerHTML = `
      <div class="meta-header">
        <h3>Meta ${MetaService.config[MetaService.tipoActual].label}</h3>
        <span class="badge" style="background-color: ${color}">
          ${NumberUtils.redondear(porcentaje)}%
        </span>
      </div>
      <div class="meta-progress">
        <div class="progress-bar" 
             style="width: ${porcentaje}%; background-color: ${color}">
          <span>${NumberUtils.redondear(porcentaje)}%</span>
        </div>
      </div>
      <div class="meta-details">
        <div class="detail">
          <span class="label">Meta:</span>
          <span class="value">${CurrencyUtils.formatear(meta)}</span>
        </div>
        <div class="detail">
          <span class="label">Utilidad Neta:</span>
          <span class="value ${utilidadNeta >= 0 ? 'positive' : 'negative'}">
            ${CurrencyUtils.formatear(utilidadNeta)}
          </span>
        </div>
        <div class="detail">
          <span class="label">Faltante:</span>
          <span class="value">${CurrencyUtils.formatear(faltante)}</span>
        </div>
      </div>
    `;
  }
};

// =============================================
// MÓDULO PRINCIPAL DEL DASHBOARD
// =============================================
const Dashboard = {
  inicializar: () => {
    ChartService.inicializar();
    Dashboard.configurarEventos();
    Dashboard.cargarConfiguracionInicial();
    Dashboard.actualizar();
  },
  
  configurarEventos: () => {
    // Filtros
    document.querySelector(SELECTORES.BTN_APLICAR)
      .addEventListener('click', Dashboard.actualizar);
    
    document.querySelector(SELECTORES.FILTRO_META)
      .addEventListener('change', (e) => MetaService.alternarTipo(e.target.value));
    
    document.querySelector(SELECTORES.BTN_CAMBIAR_GRAFICO)
      .addEventListener('click', ChartService.alternarTipoGrafico);
    
    document.querySelector(SELECTORES.BTN_ENVIAR_RESUMEN)
      .addEventListener('click', Dashboard.enviarResumen);
  },
  
  cargarConfiguracionInicial: () => {
    const hoy = DateUtils.hoy();
    const hace30Dias = DateUtils.restarDias(hoy, CONFIG.RANGO_FECHAS_DEFAULT);
    
    document.querySelector(SELECTORES.FILTRO_DESDE).valueAsDate = hace30Dias;
    document.querySelector(SELECTORES.FILTRO_HASTA).valueAsDate = hoy;
  },
  
  actualizar: () => {
    const desde = document.querySelector(SELECTORES.FILTRO_DESDE).value;
    const hasta = document.querySelector(SELECTORES.FILTRO_HASTA).value;
    
    if (!DateUtils.esValida(desde) || !DateUtils.esValida(hasta)) {
      Notificacion.mostrar('Fechas inválidas', 'error');
      return;
    }
    
    const pedidos = DataService.obtenerPedidos()
      .filter(p => DateUtils.esEntre(p.fecha, desde, hasta));
    
    const gastos = DataService.obtenerGastos()
      .filter(g => DateUtils.esEntre(g.fecha, desde, hasta));
    
    const {
      topProductos,
      totalVentas,
      totalCostos,
      totalGanancias,
      totalEnvios,
      gananciasEnvios,
      margenGeneral
    } = ProductService.calcularEstadisticas(pedidos);
    
    const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const utilidadNeta = totalGanancias - totalGastos;
    
    // Actualizar UI
    Dashboard.actualizarResumen({
      totalVentas,
      totalPedidos: pedidos.length,
      totalProductos: topProductos.reduce((sum, p) => sum + p.cantidad, 0),
      totalGanancias,
      totalGastos,
      utilidadNeta,
      margenGeneral,
      totalEnvios,
      gananciasEnvios
    });
    
    ChartService.renderizarGraficoVentas(pedidos, desde, hasta);
    ChartService.renderizarGraficoProductos(topProductos);
    MetaService.renderizar(totalVentas, totalGastos);
    Dashboard.actualizarTablas(topProductos, totalVentas, gastos);
  },
  
  actualizarResumen: (metricas) => {
    const {
      totalVentas,
      totalPedidos,
      totalProductos,
      totalGanancias,
      totalGastos,
      utilidadNeta,
      margenGeneral,
      totalEnvios,
      gananciasEnvios
    } = metricas;
    
    // Actualizar tarjetas de métricas
    const actualizarMetrica = (selector, valor, esMoneda = true) => {
      const elemento = document.querySelector(selector);
      if (elemento) {
        elemento.textContent = esMoneda ? 
          CurrencyUtils.formatear(valor) : 
          valor.toLocaleString();
      }
    };
    
    actualizarMetrica('#total-ventas', totalVentas);
    actualizarMetrica('#total-pedidos', totalPedidos, false);
    actualizarMetrica('#total-productos-vendidos', totalProductos, false);
    actualizarMetrica('#total-ganancias', totalGanancias);
    actualizarMetrica('#total-gastos', totalGastos);
    actualizarMetrica('#utilidad-neta', utilidadNeta);
    actualizarMetrica('#total-envios', totalEnvios);
    actualizarMetrica('#ganancias-envios', gananciasEnvios);
    
    const elementoMargen = document.querySelector('#margen-ganancias');
    if (elementoMargen) {
      elementoMargen.textContent = `${NumberUtils.redondear(margenGeneral)}%`;
      elementoMargen.className = margenGeneral >= 30 ? 
        'metric-value positive' : 'metric-value warning';
    }
  },
  
  actualizarTablas: (productos, totalVentas, gastos) => {
    // Tabla de productos
    const tbodyProductos = document.querySelector(`${SELECTORES.TABLA_PRODUCTOS} tbody`);
    if (tbodyProductos) {
      tbodyProductos.innerHTML = productos.map(producto => {
        const porcentajeVentas = NumberUtils.calcularPorcentaje(producto.ventas, totalVentas);
        const colorMargen = producto.margen >= 50 ? 'success' : producto.margen >= 30 ? 'warning' : 'danger';
        
        return `
          <tr>
            <td>${producto.nombre}</td>
            <td class="text-right">${producto.cantidad.toLocaleString()}</td>
            <td class="text-right">${CurrencyUtils.formatear(producto.ventas)}</td>
            <td class="text-right">${CurrencyUtils.formatear(producto.costos)}</td>
            <td class="text-right ${producto.ganancias >= 0 ? 'positive' : 'negative'}">
              ${CurrencyUtils.formatear(producto.ganancias)}
            </td>
            <td class="text-right ${colorMargen}">${NumberUtils.redondear(producto.margen)}%</td>
            <td class="text-right">${NumberUtils.redondear(porcentajeVentas)}%</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="7" class="text-center">No hay datos</td></tr>';
    }
    
    // Tabla de gastos
    const tbodyGastos = document.querySelector(`${SELECTORES.TABLA_GASTOS} tbody`);
    if (tbodyGastos) {
      tbodyGastos.innerHTML = gastos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .map(gasto => `
          <tr>
            <td>${DateUtils.formatearParaMostrar(new Date(gasto.fecha))}</td>
            <td>${gasto.tipo}</td>
            <td class="text-right">${CurrencyUtils.formatear(gasto.monto)}</td>
            <td>${gasto.descripcion || '-'}</td>
            <td>${new Date(gasto.fechaRegistro).toLocaleString('es-ES')}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-danger" 
                      onclick="Dashboard.eliminarGasto(${gasto.id})">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="6" class="text-center">No hay gastos</td></tr>';
    }
  },
  
  eliminarGasto: (id) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    
    const gastos = DataService.obtenerGastos().filter(g => g.id !== id);
    if (DataService.guardarDatos('gastos', gastos)) {
      Notificacion.mostrar('Gasto eliminado', 'success');
      Dashboard.actualizar();
    } else {
      Notificacion.mostrar('Error al eliminar gasto', 'error');
    }
  },
  
  enviarResumen: () => {
    try {
      const desde = document.querySelector(SELECTORES.FILTRO_DESDE).value;
      const hasta = document.querySelector(SELECTORES.FILTRO_HASTA).value;
      
      if (!DateUtils.esValida(desde) || !DateUtils.esValida(hasta)) {
        Notificacion.mostrar('Fechas inválidas para el resumen', 'error');
        return;
      }
  
      const pedidos = DataService.obtenerPedidos()
        .filter(p => DateUtils.esEntre(p.fecha, desde, hasta));
      
      const gastos = DataService.obtenerGastos()
        .filter(g => DateUtils.esEntre(g.fecha, desde, hasta));
  
      if (pedidos.length === 0 && gastos.length === 0) {
        Notificacion.mostrar('No hay datos en el rango seleccionado', 'warning');
        return;
      }
  
      // Cálculos principales
      const {
        topProductos,
        totalVentas,
        totalCostos,
        totalGanancias,
        totalEnvios,
        gananciasEnvios,
        margenGeneral
      } = ProductService.calcularEstadisticas(pedidos);
  
      const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
      const utilidadNeta = totalGanancias - totalGastos;
      const totalPedidos = pedidos.length;
      const ticketPromedio = NumberUtils.divisionSegura(totalVentas, totalPedidos);
      const diasPeriodo = DateUtils.diasEntre(desde, hasta);
  
      // Análisis de tendencia
      const mitadPeriodo = new Date(new Date(desde).getTime() + (new Date(hasta) - new Date(desde)) / 2);
      const ventasPrimeraMitad = pedidos
        .filter(p => p.fecha <= mitadPeriodo)
        .reduce((sum, p) => sum + (p.total || 0), 0);
      
      const ventasSegundaMitad = totalVentas - ventasPrimeraMitad;
      const cambioPorcentual = NumberUtils.calcularPorcentaje(
        ventasSegundaMitad - ventasPrimeraMitad, 
        ventasPrimeraMitad || 1
      );
  
      // Comparativa con período anterior
      const comparativa = Dashboard.generarComparativaPeriodoAnterior(desde, hasta);
  
      // Preparar mensaje
      let mensaje = Dashboard.generarEncabezadoResumen(desde, hasta, diasPeriodo);
      
      // Sección financiera
      mensaje += Dashboard.generarSeccionFinanciera(
        totalVentas, 
        totalCostos, 
        totalGanancias,
        totalGastos,
        utilidadNeta,
        margenGeneral,
        totalEnvios,
        gananciasEnvios,
        diasPeriodo
      );
  
      // Análisis de tendencia
      mensaje += Dashboard.generarAnalisisTendencia(
        ventasPrimeraMitad,
        ventasSegundaMitad,
        cambioPorcentual
      );
  
      // Comparativa histórica
      if (comparativa) {
        mensaje += Dashboard.generarComparativaHistorica(comparativa);
      }
  
      // Gastos
      if (gastos.length > 0) {
        mensaje += Dashboard.generarResumenGastos(gastos);
      }
  
      // Productos
      mensaje += Dashboard.generarResumenProductos(topProductos);
  
      // Meta
      mensaje += Dashboard.generarResumenMeta(
        totalVentas,
        totalGastos,
        diasPeriodo
      );
  
      // Pie del mensaje
      mensaje += `\n⏰ *Generado el ${new Date().toLocaleString('es-ES')}*`;
  
      // Acortar mensaje si es muy largo para WhatsApp
      mensaje = Dashboard.ajustarLongitudMensaje(mensaje);
  
      // Enviar por WhatsApp
      window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
      
    } catch (error) {
      console.error('Error al generar resumen:', error);
      Notificacion.mostrar('Error al generar el resumen', 'error');
    }
  },
  
  // Funciones auxiliares para enviarResumen
  generarEncabezadoResumen: (desde, hasta, dias) => {
    return `📊 *REPORTE DETALLADO - ${dias} ${dias === 1 ? 'DÍA' : 'DÍAS'}*\n` +
           `📅 *Período:* ${DateUtils.formatearParaMostrar(new Date(desde))} ` +
           `al ${DateUtils.formatearParaMostrar(new Date(hasta))}\n\n`;
  },
  
  generarSeccionFinanciera: (
    ventas, costos, ganancias, gastos, utilidadNeta, margen, envios, gananciasEnvios, dias
  ) => {
    return `💰 *RESUMEN FINANCIERO*\n` +
           `• Ventas Totales: ${CurrencyUtils.formatear(ventas)}\n` +
           `• Costos Totales: ${CurrencyUtils.formatear(costos)}\n` +
           `• Gastos Totales: ${CurrencyUtils.formatear(gastos)}\n` +
           `• Ganancias Brutas: ${CurrencyUtils.formatear(ganancias)}\n` +
           `• Ganancias Netas: ${CurrencyUtils.formatear(utilidadNeta)}\n` +
           `• Margen de Ganancia: ${NumberUtils.redondear(margen)}%\n` +
           `• Ventas por Envíos: ${CurrencyUtils.formatear(envios)}\n` +
           `• Ganancias por Envíos: ${CurrencyUtils.formatear(gananciasEnvios)}\n` +
           `• Promedio Diario: ${CurrencyUtils.formatear(ventas / dias)}\n\n`;
  },
  
  generarAnalisisTendencia: (primeraMitad, segundaMitad, cambio) => {
    return `📈 *ANÁLISIS DE TENDENCIA*\n` +
           `• Cambio: ${cambio >= 0 ? '↑' : '↓'} ${Math.abs(NumberUtils.redondear(cambio))}%\n` +
           `• Primera Mitad: ${CurrencyUtils.formatear(primeraMitad)}\n` +
           `• Segunda Mitad: ${CurrencyUtils.formatear(segundaMitad)}\n\n`;
  },
  
  generarComparativaHistorica: (comparativa) => {
    return `🔍 *COMPARATIVA CON PERÍODO ANTERIOR*\n` +
           `• Ventas: ${comparativa.cambioVentas >= 0 ? '+' : ''}${NumberUtils.redondear(comparativa.cambioVentas)}%\n` +
           `• Pedidos: ${comparativa.cambioPedidos >= 0 ? '+' : ''}${NumberUtils.redondear(comparativa.cambioPedidos)}%\n` +
           `• Ticket Promedio: ${comparativa.cambioTicket >= 0 ? '+' : ''}${NumberUtils.redondear(comparativa.cambioTicket)}%\n\n`;
  },
  
  generarResumenGastos: (gastos) => {
    const gastosPorTipo = GASTOS_CATEGORIAS.map(tipo => ({
      tipo,
      total: gastos.filter(g => g.tipo === tipo).reduce((sum, g) => sum + g.monto, 0)
    })).filter(g => g.total > 0)
      .sort((a, b) => b.total - a.total);
  
    let resumen = `💸 *GASTOS DESTACADOS*\n`;
    gastosPorTipo.forEach((gasto, index) => {
      resumen += `${index + 1}. ${gasto.tipo}: ${CurrencyUtils.formatear(gasto.total)}\n`;
    });
    return resumen + '\n';
  },
  
  generarResumenProductos: (productos) => {
    const top5 = productos.slice(0, 5);
    let resumen = `🏆 *TOP ${top5.length} PRODUCTOS*\n`;
    top5.forEach((prod, i) => {
      resumen += `${i + 1}. *${prod.nombre}*\n` +
                 `   • Vendidos: ${prod.cantidad.toLocaleString()}\n` +
                 `   • Ventas: ${CurrencyUtils.formatear(prod.ventas)}\n` +
                 `   • Ganancias: ${CurrencyUtils.formatear(prod.ganancias)}\n` +
                 `   • Margen: ${NumberUtils.redondear(prod.margen)}%\n\n`;
    });
    return resumen;
  },
  
  generarResumenMeta: (ventas, gastos, dias) => {
    const metaDiaria = CONFIG.META_MENSUAL / CONFIG.DIAS_MES_PROMEDIO;
    const metaPeriodo = metaDiaria * dias;
    const utilidadNeta = ventas - gastos;
    const porcentaje = NumberUtils.calcularPorcentaje(utilidadNeta, metaPeriodo);
  
    return `🎯 *PROGRESO DE META*\n` +
           `• Meta del Período: ${CurrencyUtils.formatear(metaPeriodo)}\n` +
           `• Progreso: ${NumberUtils.redondear(porcentaje)}%\n` +
           `• ${porcentaje >= 100 ? '✅ Meta alcanzada' : '⚠️ Por debajo de la meta'}\n\n`;
  },
  
  generarComparativaPeriodoAnterior: (desde, hasta) => {
    try {
      const fechaInicio = new Date(desde);
      const fechaFin = new Date(hasta);
      const dias = DateUtils.diasEntre(desde, hasta);
      
      const fechaInicioAnterior = DateUtils.restarDias(fechaInicio, dias);
      const fechaFinAnterior = DateUtils.restarDias(fechaInicio, 1);
  
      const pedidosAnterior = DataService.obtenerPedidos()
        .filter(p => DateUtils.esEntre(p.fecha, fechaInicioAnterior, fechaFinAnterior));
  
      if (pedidosAnterior.length === 0) return null;
  
      const ventasAnterior = pedidosAnterior.reduce((sum, p) => sum + (p.total || 0), 0);
      const pedidosAnteriorCount = pedidosAnterior.length;
      const ticketAnterior = NumberUtils.divisionSegura(ventasAnterior, pedidosAnteriorCount);
  
      const ventasActual = DataService.obtenerPedidos()
        .filter(p => DateUtils.esEntre(p.fecha, desde, hasta))
        .reduce((sum, p) => sum + (p.total || 0), 0);
        
      const pedidosActualCount = DataService.obtenerPedidos()
        .filter(p => DateUtils.esEntre(p.fecha, desde, hasta)).length;
        
      const ticketActual = NumberUtils.divisionSegura(ventasActual, pedidosActualCount);
  
      return {
        cambioVentas: NumberUtils.calcularPorcentaje(ventasActual - ventasAnterior, ventasAnterior),
        cambioPedidos: NumberUtils.calcularPorcentaje(pedidosActualCount - pedidosAnteriorCount, pedidosAnteriorCount),
        cambioTicket: NumberUtils.calcularPorcentaje(ticketActual - ticketAnterior, ticketAnterior),
        dias: DateUtils.diasEntre(fechaInicioAnterior, fechaFinAnterior)
      };
    } catch (error) {
      console.error('Error en comparativa:', error);
      return null;
    }
  },
  
  ajustarLongitudMensaje: (mensaje) => {
    const MAX_CARACTERES = 45000; // Límite seguro para WhatsApp
    if (mensaje.length <= MAX_CARACTERES) return mensaje;
  
    // Conservar las partes más importantes si se excede
    const partes = [
      mensaje.match(/📊.*?\n\n/)[0], // Encabezado
      mensaje.match(/💰.*?\n\n/)[0], // Financiero
      mensaje.match(/🏆.*?\n\n/)[0], // Productos
      mensaje.match(/🎯.*?\n\n/)[0]  // Meta
    ].filter(Boolean);
  
    return partes.join('\n') + 
      '\n... [RESUMEN ACORTADO POR LÍMITE DE CARACTERES] ...\n';
  }
};

// =============================================
// MÓDULO DE NOTIFICACIONES
// =============================================
const Notificacion = {
  mostrar: (mensaje, tipo = 'info', tiempo = 5000) => {
    const tipos = {
      info: { icono: 'ℹ️', clase: 'info' },
      success: { icono: '✅', clase: 'success' },
      warning: { icono: '⚠️', clase: 'warning' },
      error: { icono: '❌', clase: 'error' }
    };
    
    const config = tipos[tipo] || tipos.info;
    const notificacion = document.createElement('div');
    
    notificacion.className = `notificacion ${config.clase}`;
    notificacion.innerHTML = `
      <span class="icono">${config.icono}</span>
      <span class="texto">${mensaje}</span>
      <button class="cerrar">&times;</button>
    `;
    
    document.body.appendChild(notificacion);
    
    const eliminar = () => {
      notificacion.classList.add('desvanecer');
      setTimeout(() => notificacion.remove(), 300);
    };
    
    notificacion.querySelector('.cerrar').addEventListener('click', eliminar);
    setTimeout(eliminar, tiempo);
  }
};

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', Dashboard.inicializar);

// Hacer disponibles funciones globales necesarias
window.Dashboard = Dashboard;