/**
 * Módulo de gestión de descuentos
 * @version 2.0
 * @description Sistema completo para administración de códigos de descuento
 * con cache, validaciones, compartir por WhatsApp y más.
 */

// Constantes para configuración
const CONFIG_DESCUENTOS = {
  MAX_PORCENTAJE: 30,
  LONGITUD_CODIGO: 20,
  ESTADOS: {
    ACTIVO: 'activo',
    EXPIRADO: 'expirado',
    LIMITE_ALCANZADO: 'limite_alcanzado'
  },
  ORDENAMIENTO: {
    RECIENTES: 'recientes',
    ANTIGUOS: 'antiguos',
    CODIGO_ASC: 'codigo-asc',
    CODIGO_DESC: 'codigo-desc',
    VENCIMIENTO: 'vencimiento',
    USOS: 'usos'
  }
};

// Cache para evitar accesos repetidos a localStorage
let descuentosCache = null;

// Función para obtener descuentos con cache
function obtenerDescuentos() {
  if (!descuentosCache) {
    try {
      descuentosCache = JSON.parse(localStorage.getItem('descuentos')) || {};
    } catch (error) {
      console.error('Error al parsear descuentos:', error);
      descuentosCache = {};
    }
  }
  return descuentosCache;
}

// Función para guardar descuentos y actualizar cache
function guardarDescuentos(descuentos) {
  try {
    descuentosCache = descuentos;
    localStorage.setItem('descuentos', JSON.stringify(descuentos));
    // Actualizar el datalist después de guardar cambios
    llenarDatalistCodigos();
  } catch (error) {
    console.error('Error al guardar descuentos:', error);
    mostrarNotificacion('Error al guardar descuentos', 'error');
  }
}

// Función para invalidar cache
function invalidarCacheDescuentos() {
  descuentosCache = null;
}

// Función para crear descuentos iniciales
function inicializarDescuentos() {
  if (!localStorage.getItem('descuentos')) {
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
    const fechaFormatoISO = fechaFutura.toISOString().split('T')[0];
    const fechaCreacion = new Date().toISOString();

    const descuentosIniciales = {
      "VERANO10": {
        codigo: "VERANO10",
        tipo: "porcentaje",
        valor: 10,
        validoHasta: fechaFormatoISO,
        usos: 0,
        limiteUsos: 100,
        categorias: ["alitas"],
        fechaCreacion: fechaCreacion,
        activo: true,
        pedidos:[]
      },
      "FIESTA50": {
        codigo: "FIESTA50",
        tipo: "fijo",
        valor: 50,
        validoHasta: fechaFormatoISO,
        usos: 0,
        limiteUsos: null,
        categorias: null,
        fechaCreacion: fechaCreacion,
        activo: true,
        pedidos:[]
      }
    };
    guardarDescuentos(descuentosIniciales);
  }
}

function migrarDescuentos() {
  const descuentos = obtenerDescuentos();
  Object.values(descuentos).forEach(descuento => {
    if (!descuento.pedidos) {
      descuento.pedidos = [];
    }
  });
  guardarDescuentos(descuentos);
}

// Nueva función para llenar el datalist con códigos vigentes
function llenarDatalistCodigos() {
  const datalist = document.getElementById('codigos-vigentes');
  if (!datalist) return; // Si no existe el datalist, salir

  datalist.innerHTML = ''; // Limpiar opciones existentes

  const descuentos = obtenerDescuentos();
  Object.values(descuentos).forEach(descuento => {
    if (obtenerEstadoDescuento(descuento) === CONFIG_DESCUENTOS.ESTADOS.ACTIVO) {
      const option = document.createElement('option');
      option.value = descuento.codigo;
      datalist.appendChild(option);
    }
  });
}

// Ejecutar migración al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  migrarDescuentos();
  inicializarDescuentos();
  llenarDatalistCodigos(); // Llenar datalist inicialmente
  document.getElementById('filtro-orden')?.addEventListener('change', cargarListaDescuentos);
  document.getElementById('btn-aplicar-descuento')?.addEventListener('click', aplicarDescuento);
});

// Función para validar un descuento completo
function validarDescuentoCompleto(descuento) {
  const errores = [];
  
  if (!descuento.codigo || descuento.codigo.length > CONFIG_DESCUENTOS.LONGITUD_CODIGO) {
    errores.push(`Código inválido (máx ${CONFIG_DESCUENTOS.LONGITUD_CODIGO} caracteres)`);
  }
  
  if (descuento.tipo === 'porcentaje' && descuento.valor > CONFIG_DESCUENTOS.MAX_PORCENTAJE) {
    errores.push(`El porcentaje no puede ser mayor a ${CONFIG_DESCUENTOS.MAX_PORCENTAJE}%`);
  }
  
  if (descuento.valor <= 0) {
    errores.push('El valor debe ser mayor a 0');
  }
  
  if (descuento.validoHasta && new Date(descuento.validoHasta) <= new Date()) {
    errores.push('La fecha debe ser futura');
  }
  
  if (descuento.limiteUsos !== null && descuento.limiteUsos <= 0) {
    errores.push('Límite de usos debe ser mayor a 0 o nulo');
  }
  
  return {
    valido: errores.length === 0,
    errores: errores.join(', ')
  };
}

// Función para crear/actualizar descuento
function guardarNuevoDescuento(esEdicion = false, codigoOriginal = null) {
  const codigo = document.getElementById('nuevo-codigo').value.trim().toUpperCase();
  const tipo = document.getElementById('tipo-descuento').value;
  const valor = parseFloat(document.getElementById('valor-descuento').value);
  const validoHasta = document.getElementById('valido-hasta').value || null;
  const limiteUsos = document.getElementById('limite-usos').value || null;
  const categoriasSelect = document.getElementById('categorias-descuento');

  // Obtener categorías seleccionadas
  let categorias = null;
  if (categoriasSelect) {
    const selectedOptions = Array.from(categoriasSelect.selectedOptions);
    categorias = selectedOptions.length > 0 ? selectedOptions.map(opt => opt.value) : null;
  }

  // Crear objeto descuento
  const nuevoDescuento = {
      codigo,
      tipo,
      valor,
      validoHasta,
      usos: esEdicion ? obtenerDescuentos()[codigoOriginal]?.usos || 0 : 0,
      limiteUsos: limiteUsos ? parseInt(limiteUsos) : null,
      categorias,
      fechaCreacion: esEdicion 
        ? obtenerDescuentos()[codigoOriginal]?.fechaCreacion 
        : new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      pedidos: esEdicion 
        ? obtenerDescuentos()[codigoOriginal]?.pedidos || []
        : []
    };

  // Validar
  const validacion = validarDescuentoCompleto(nuevoDescuento);
  if (!validacion.valido) {
    mostrarNotificacion(`Error en descuento: ${validacion.errores}`, 'error');
    return false;
  }

  // Obtener descuentos existentes
  const descuentos = obtenerDescuentos();

  // Verificar if el código ya existe (solo para nuevos)
  if (!esEdicion && descuentos[codigo]) {
    mostrarNotificacion('Este código ya existe', 'warning');
    return false;
  }

  // Si es edición, eliminar el original antes de guardar el nuevo
  if (esEdicion && codigoOriginal && codigoOriginal !== codigo) {
    delete descuentos[codigoOriginal];
  }

  // Guardar el descuento
  descuentos[codigo] = nuevoDescuento;
  guardarDescuentos(descuentos);
  
  return true;
}

// Función para crear nuevo descuento
function crearNuevoDescuento() {
  if (guardarNuevoDescuento()) {
    cargarListaDescuentos();
    limpiarFormularioDescuento();
    mostrarNotificacion('Descuento creado exitosamente', 'success');
  }
}

// Función para editar descuento
function editarDescuento(codigo) {
  const descuentos = obtenerDescuentos();
  const descuento = descuentos[codigo];

  if (!descuento) {
    mostrarNotificacion('Descuento no encontrado', 'warning');
    return;
  }

  // Llenar el formulario
  document.getElementById('nuevo-codigo').value = descuento.codigo;
  document.getElementById('tipo-descuento').value = descuento.tipo;
  document.getElementById('valor-descuento').value = descuento.valor;
  document.getElementById('valido-hasta').value = descuento.validoHasta || '';
  document.getElementById('limite-usos').value = descuento.limiteUsos || '';

  // Seleccionar categorías
  const categoriasSelect = document.getElementById('categorias-descuento');
  if (categoriasSelect && descuento.categorias) {
    Array.from(categoriasSelect.options).forEach(option => {
      option.selected = descuento.categorias.includes(option.value);
    });
  }

  // Cambiar UI a modo edición
  const btnCrear = document.getElementById('btn-crear-descuento');
  const btnCancelar = document.getElementById('btn-cancelar-edicion');

  btnCrear.textContent = 'Actualizar Descuento';
  btnCrear.classList.add('modo-edicion');
  btnCancelar.style.display = 'inline-block';
  document.getElementById('nuevo-codigo').disabled = true;
  btnCrear.dataset.editando = codigo;
}

// Función para actualizar descuento
function actualizarDescuento(codigoOriginal) {
  if (guardarNuevoDescuento(true, codigoOriginal)) {
    cargarListaDescuentos();
    cancelarEdicion();
    mostrarNotificacion('Descuento actualizado exitosamente', 'success');
  }
}

// Función para cancelar edición
function cancelarEdicion() {
  const btnCrear = document.getElementById('btn-crear-descuento');
  const btnCancelar = document.getElementById('btn-cancelar-edicion');

  btnCrear.textContent = 'Crear Descuento';
  btnCrear.classList.remove('modo-edicion');
  btnCancelar.style.display = 'none';
  document.getElementById('nuevo-codigo').disabled = false;
  delete btnCrear.dataset.editando;
  limpiarFormularioDescuento();
}

// Función para manejar el formulario
function manejarFormularioDescuento() {
  const btnCrear = document.getElementById('btn-crear-descuento');
  const codigoEditando = btnCrear.dataset.editando;

  codigoEditando ? actualizarDescuento(codigoEditando) : crearNuevoDescuento();
}

// Función para calcular total con descuento
function calcularTotalConDescuento(pedido) {
  // Validación inicial del pedido
  if (!pedido || typeof pedido !== 'object' || !pedido.items || !Array.isArray(pedido.items)) {
    return {
      total: 0,
      descuento: 0,
      subtotal: 0,
      mensaje: 'Pedido inválido: estructura incorrecta'
    };
  }

  // Calcular total sin descuento
  const total = pedido.items.reduce((sum, item) => {
    return sum + (item.precio || 0) * (item.cantidad || 1);
  }, 0);

  // Si no hay descuento, retornar valores base
  if (!pedido.descuento || typeof pedido.descuento !== 'object') {
    return {
      total: total,
      descuento: 0,
      subtotal: total,
      mensaje: ''
    };
  }

  const descuento = pedido.descuento;
  let totalDescuento = 0;
  let descuentoInfo = '';

  // Verificar combos
  const contieneCombos = pedido.items.some(item => item.esCombo === true);
  const soloCombos = pedido.items.every(item => item.esCombo === true);

  // No aplicar descuento si solo hay combos
  if (soloCombos) {
    return {
      total: total,
      descuento: 0,
      subtotal: total,
      mensaje: 'Los descuentos no se aplican a pedidos con solo combos.'
    };
  }

  // Calcular subtotal aplicable (excluyendo combos)
  const { subtotalAplicable, itemsConDescuento } = pedido.items.reduce((acc, item) => {
    if (!item.esCombo) {
      const categoria = encontrarCategoriaProducto(item.id); // Asegúrate de que esta función exista
      if (!descuento.categorias || (categoria && descuento.categorias.includes(categoria))) {
        acc.subtotalAplicable += (item.precio || 0) * (item.cantidad || 1);
        acc.itemsConDescuento.push(item);
      }
    }
    return acc;
  }, { subtotalAplicable: 0, itemsConDescuento: [] });

  // Aplicar descuento si hay ítems aplicables
  if (subtotalAplicable > 0) {
    if (descuento.tipo === 'porcentaje') {
      totalDescuento = subtotalAplicable * (descuento.valor / 100);
    } else if (descuento.tipo === 'fijo') {
      totalDescuento = Math.min(descuento.valor, subtotalAplicable);
    }

    // Construir mensaje informativo
    const categoriasAplicadas = descuento.categorias 
      ? descuento.categorias.join(', ') 
      : 'todos los productos (excepto combos)';
    
    descuentoInfo = `Descuento aplicado (${descuento.codigo || 'sin código'}): -$${totalDescuento.toFixed(2)} ` +
                    `(${descuento.tipo === 'porcentaje' ? descuento.valor + '%' : 'fijo'} en ${categoriasAplicadas})`;
    
    if (contieneCombos) {
      descuentoInfo += ' (no aplicado a combos)';
    }
  } else {
    return {
      total: total,
      descuento: 0,
      subtotal: total,
      mensaje: 'No hay productos aplicables para el descuento.'
    };
  }

  // Retornar resultados (sin manipular el DOM)
  return {
    total: total - totalDescuento,
    descuento: totalDescuento,
    subtotal: total,
    mensaje: descuentoInfo
  };
}

// Función auxiliar para encontrar categoría de producto
function encontrarCategoriaProducto(productoId) {
  const productos = window.productosDB;
  for (const categoria in productos) {
    if (productos[categoria].some(p => p.id === productoId)) {
      return categoria;
    }
  }
  return null;
}

// Función para mostrar el administrador de descuentos
function mostrarAdminDescuentos() {
  const modal = document.getElementById('admin-descuentos-modal');
  
  // Configurar eventos
  document.getElementById('btn-crear-descuento').addEventListener('click', manejarFormularioDescuento);
  document.getElementById('btn-cancelar-edicion').addEventListener('click', cancelarEdicion);
  document.getElementById('filtro-orden').addEventListener('change', cargarListaDescuentos);
  
  // Cargar datos
  cargarListaDescuentos();
  modal.style.display = 'flex';
}

// Función para ordenar descuentos
function ordenarDescuentos(descuentos, criterio) {
  const descuentosArray = Object.values(descuentos);

  switch (criterio) {
    case CONFIG_DESCUENTOS.ORDENAMIENTO.RECIENTES:
      return descuentosArray.sort((a, b) => 
        new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));

    case CONFIG_DESCUENTOS.ORDENAMIENTO.ANTIGUOS:
      return descuentosArray.sort((a, b) => 
        new Date(a.fechaCreacion || 0) - new Date(b.fechaCreacion || 0));

    case CONFIG_DESCUENTOS.ORDENAMIENTO.CODIGO_ASC:
      return descuentosArray.sort((a, b) => a.codigo.localeCompare(b.codigo));

    case CONFIG_DESCUENTOS.ORDENAMIENTO.CODIGO_DESC:
      return descuentosArray.sort((a, b) => b.codigo.localeCompare(a.codigo));

    case CONFIG_DESCUENTOS.ORDENAMIENTO.VENCIMIENTO:
      return descuentosArray.sort((a, b) => {
        const fechaA = a.validoHasta ? new Date(a.validoHasta) : new Date('9999-12-31');
        const fechaB = b.validoHasta ? new Date(b.validoHasta) : new Date('9999-12-31');
        return fechaA - fechaB;
      });

    case CONFIG_DESCUENTOS.ORDENAMIENTO.USOS:
      return descuentosArray.sort((a, b) => b.usos - a.usos);

    default:
      return descuentosArray;
  }
}

// Función para cargar la lista de descuentos
function cargarListaDescuentos() {
  const tabla = document.getElementById('tabla-descuentos');
  const descuentos = obtenerDescuentos();
  const ordenSeleccionado = document.getElementById('filtro-orden').value;

  // Ordenar descuentos
  const descuentosOrdenados = ordenarDescuentos(descuentos, ordenSeleccionado);

  // Limpiar tabla
  tabla.innerHTML = '';

  // Actualizar contador
  document.getElementById('contador-descuentos').textContent = 
    `(${descuentosOrdenados.length} códigos)`;

  // Llenar tabla
  descuentosOrdenados.forEach(descuento => {
    const estado = obtenerEstadoDescuento(descuento);
    const tr = document.createElement('tr');
    
    tr.classList.add(`descuento-${estado}`);
    
    const tooltip = `Creado: ${formatearFecha(descuento.fechaCreacion)}
Última actualización: ${formatearFecha(descuento.fechaActualizacion)}
Usos: ${descuento.usos}${descuento.limiteUsos ? ` de ${descuento.limiteUsos}` : ''}
Pedidos: ${descuento.pedidos ? descuento.pedidos.length : 0}`;

    tr.innerHTML = `
      <td>${descuento.codigo}</td>
      <td>${descuento.tipo === 'porcentaje' ? '%' : '$'}</td>
      <td>${descuento.valor}${descuento.tipo === 'porcentaje' ? '%' : ''}</td>
      <td>${formatearFecha(descuento.validoHasta)}</td>
      <td>${descuento.categorias ? descuento.categorias.join(', ') : 'Todos'}</td>
      <td>${descuento.usos}${descuento.limiteUsos ? `/${descuento.limiteUsos}` : ''}</td>
      <td>
        <div class="botones-accion" data-tooltip="${tooltip}">
          <button class="btn-editar-descuento" data-codigo="${descuento.codigo}">
            ✏️ Editar
          </button>
          <button class="btn-whatsapp" data-codigo="${descuento.codigo}" 
                  ${estado !== CONFIG_DESCUENTOS.ESTADOS.ACTIVO ? 'disabled' : ''}>
            📱 Compartir
          </button>
          <button class="btn-eliminar-descuento" data-codigo="${descuento.codigo}">
            🗑️ Eliminar
          </button>
          <button class="btn-ver-pedidos" data-codigo="${descuento.codigo}">
            📋 Ver Pedidos
          </button>
        </div>
      </td>
    `;
    tabla.appendChild(tr);
  });

  // Configurar eventos
  tabla.addEventListener('click', manejarClicksTabla);
}

function mostrarHistorialPedidos(codigo) {
  const descuentos = obtenerDescuentos();
  const descuento = descuentos[codigo];

  if (!descuento) {
    mostrarNotificacion('Descuento no encontrado', 'error');
    return;
  }

  // Verificar si no hay pedidos registrados
  if (!descuento.pedidos || descuento.pedidos.length === 0) {
    mostrarNotificacion(`El código ${codigo} no ha sido utilizado en ningún pedido aún`, 'info');
    return;
  }

  // Si hay pedidos, mostrar el modal con el historial completo
  const modal = document.createElement('div');
  modal.className = 'modal-historial-pedidos';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  const contenido = document.createElement('div');
  contenido.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 800px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;

  contenido.innerHTML = `
    <h2>Historial de Pedidos - ${codigo}</h2>
    <p>Total usos: ${descuento.usos} | Pedidos registrados: ${descuento.pedidos.length}</p>
    <div class="lista-pedidos">
      ${descuento.pedidos.map(pedido => `
        <div class="pedido-item" style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          <h3 style="margin: 0 0 5px 0;">Pedido: ${pedido.pedidoId}</h3>
          <p style="margin: 0 0 5px 0;">Fecha: ${formatearFecha(pedido.fecha)}</p>
          <p style="margin: 0 0 5px 0;">Total: $${pedido.montoTotal.toFixed(2)} (Descuento: $${pedido.montoDescuento.toFixed(2)})</p>
          <details style="margin-top: 10px;">
            <summary>Ver detalles</summary>
            <ul style="margin: 5px 0 0 20px; padding: 0;">
              ${pedido.detallesPedido?.items?.map(item => `
                <li>${item.cantidad}x ${item.nombre} - $${item.precio.toFixed(2)} c/u</li>
              `).join('') || '<li>No hay detalles disponibles</li>'}
            </ul>
            <p>Estado: ${pedido.detallesPedido?.estado || 'desconocido'}</p>
          </details>
        </div>
      `).join('')}
    </div>
    <button class="btn-cerrar-modal" style="margin-top: 20px; padding: 10px 20px;">Cerrar</button>
  `;

  modal.appendChild(contenido);
  document.body.appendChild(modal);

  contenido.querySelector('.btn-cerrar-modal').addEventListener('click', () => {
    modal.remove();
  });
}

function sincronizarPedidosConDescuentos() {
  const descuentos = obtenerDescuentos();
  const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
  
  // Limpiar todos los pedidos registrados en descuentos
  Object.values(descuentos).forEach(descuento => {
    descuento.pedidos = [];
    descuento.usos = 0;
  });

  // Reconstruir desde los pedidos guardados
  pedidos.forEach(pedido => {
    if (pedido.descuento?.codigo) {
      const descuento = descuentos[pedido.descuento.codigo];
      if (descuento) {
        if (!Array.isArray(descuento.pedidos)) {
          descuento.pedidos = [];
        }
        
        descuento.pedidos.push({
          pedidoId: pedido.codigo,
          fecha: pedido.fecha,
          montoTotal: pedido.total,
          montoDescuento: pedido.subtotal - pedido.total,
          detallesPedido: {
            items: pedido.items,
            estado: pedido.estado
          }
        });
        
        descuento.usos = (descuento.usos || 0) + 1;
      }
    }
  });

  guardarDescuentos(descuentos);
}

// Función para manejar clicks en la tabla
function manejarClicksTabla(e) {
  const target = e.target.closest('button');
  if (!target) return;

  const codigo = target.dataset.codigo;
  console.log('Botón clicado:', target.className, 'Código:', codigo); // Depuración

  if (target.classList.contains('btn-eliminar-descuento')) {
    eliminarDescuento(codigo);
  } else if (target.classList.contains('btn-editar-descuento')) {
    editarDescuento(codigo);
  } else if (target.classList.contains('btn-whatsapp')) {
    compartirPorWhatsApp(codigo);
  } else if (target.classList.contains('btn-ver-pedidos')) {
    mostrarHistorialPedidos(codigo);
  }
}

// Función para obtener estado del descuento
function obtenerEstadoDescuento(descuento) {
  if (descuento.validoHasta && new Date(descuento.validoHasta) < new Date()) {
    return CONFIG_DESCUENTOS.ESTADOS.EXPIRADO;
  }
  if (descuento.limiteUsos && descuento.usos >= descuento.limiteUsos) {
    return CONFIG_DESCUENTOS.ESTADOS.LIMITE_ALCANZADO;
  }
  return CONFIG_DESCUENTOS.ESTADOS.ACTIVO;
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return 'Indefinido';
  
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Error formateando fecha:', fecha, e);
    return 'Fecha inválida';
  }
}

// Función para compartir por WhatsApp
function compartirPorWhatsApp(codigoDescuento) {
  const descuentos = obtenerDescuentos();
  const descuento = descuentos[codigoDescuento];

  if (!descuento) {
    mostrarNotificacion('Código no encontrado', 'error');
    return;
  }

  const validacion = validarDescuento(descuento);
  if (!validacion.valido) {
    mostrarNotificacion(`No se puede compartir: ${validacion.mensaje}`, 'warning');
    return;
  }

  const mensaje = generarMensajeWhatsApp(descuento);
  window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  
  // Registrar uso para compartir
  descuento.usos += 1;
  descuento.fechaActualizacion = new Date().toISOString();
  guardarDescuentos(descuentos);
  
  mostrarNotificacion('Código compartido', 'success');
}

// Función para generar mensaje de WhatsApp
function generarMensajeWhatsApp(descuento) {
  const tipo = descuento.tipo === 'porcentaje' 
    ? `${descuento.valor}% de descuento` 
    : `$${descuento.valor} de descuento`;
  
  const vencimiento = descuento.validoHasta 
    ? `\n📅 Válido hasta: ${formatearFecha(descuento.validoHasta)}` 
    : '';
  
  const limites = descuento.limiteUsos 
    ? `\n🔢 Usos: ${descuento.usos} de ${descuento.limiteUsos}` 
    : '';
  
  return `🎉 ¡DESCUENTO EXCLUSIVO! 🎉

🏷️ Código: *${descuento.codigo}*
💰 Tipo: ${tipo}${vencimiento}${limites}
📌 Aplicable a: ${descuento.categorias ? descuento.categorias.join(', ') : 'todos los productos (excepto combos)'}

👉 Usa este código al hacer tu pedido para aplicar el descuento.`;
}

// Función para limpiar formulario
function limpiarFormularioDescuento() {
  const campos = ['nuevo-codigo', 'valor-descuento', 'valido-hasta', 'limite-usos'];
  campos.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = '';
  });

  document.getElementById('tipo-descuento').selectedIndex = 0;
  
  const categoriasSelect = document.getElementById('categorias-descuento');
  if (categoriasSelect) {
    Array.from(categoriasSelect.options).forEach(option => {
      option.selected = false;
    });
  }
}

// Función para eliminar descuento
function eliminarDescuento(codigo) {
  const descuentos = obtenerDescuentos();
  const descuento = descuentos[codigo];
  const mensaje = descuento.pedidos?.length > 0 
    ? `¿Eliminar el código "${codigo}"? Este código ha sido usado en ${descuento.pedidos.length} pedido(s). Esta acción no se puede deshacer.`
    : `¿Eliminar el código "${codigo}"? Esta acción no se puede deshacer.`;

  if (!confirm(mensaje)) {
    return;
  }

  delete descuentos[codigo];
  guardarDescuentos(descuentos);

  cargarListaDescuentos();
  mostrarNotificacion(`Código ${codigo} eliminado`, 'success');
}

// Función para aplicar descuento al pedido
function aplicarDescuento() {
  const codigo = document.getElementById('codigo-descuento').value.trim().toUpperCase();
  const elementoMensaje = document.getElementById('descuento-aplicado');

  if (!codigo) {
    limpiarDescuentoAplicado();
    return;
  }

  const descuentos = obtenerDescuentos();
  const descuento = descuentos[codigo];

  if (!descuento) {
    mostrarErrorDescuento('Código no válido', elementoMensaje);
    return;
  }

  if (window.pedidoActual.descuento?.codigo === codigo) {
    mostrarErrorDescuento('Este descuento ya está aplicado', elementoMensaje);
    return;
  }

  const validacion = validarDescuento(descuento);
  if (!validacion.valido) {
    mostrarErrorDescuento(validacion.mensaje, elementoMensaje);
    return;
  }

  // Verificar si el pedido contiene combos
  const contieneCombos = window.pedidoActual.items.some(item => item.esCombo);
  const soloCombos = window.pedidoActual.items.every(item => item.esCombo);

  // Si el pedido contiene solo combos, mostrar notificación y no aplicar descuento
  if (soloCombos) {
    mostrarErrorDescuento('Los descuentos no se pueden aplicar a pedidos que contienen solo combos.', elementoMensaje);
    return;
  }

  const { total, descuento: montoDescuento, subtotal, mensaje } = calcularTotalConDescuento(window.pedidoActual);

  // Si no se aplicó ningún descuento, mostrar el mensaje y salir
    if (montoDescuento <= 0) {
        mostrarErrorDescuento(mensaje || 'No se pudo aplicar el descuento.', elementoMensaje);
        return;
    }

  // Obtener el pedido actual completo
  const pedidoActual = window.pedidoActual;
  
  // Registrar el pedido en el descuento
  if (!Array.isArray(descuento.pedidos)) {
    descuento.pedidos = [];
  }

  const pedidoInfo = {
    pedidoId: pedidoActual.codigo || `PED${Date.now()}`,
    fecha: new Date().toISOString(),
    montoTotal: total,
    montoDescuento: montoDescuento,
    detallesPedido: {
      items: pedidoActual.items
        .filter(item => !item.esCombo) // Excluir combos de los detalles
        .map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio
        })),
      estado: pedidoActual.estado || 'pendiente'
    }
  };

  descuento.pedidos.push(pedidoInfo);
  descuento.usos = (descuento.usos || 0) + 1;
  descuento.fechaActualizacion = new Date().toISOString();

  // Actualizar el objeto completo
  descuentos[codigo] = {...descuento};
  guardarDescuentos(descuentos);
  invalidarCacheDescuentos();

  // Aplicar descuento al pedido actual
  pedidoActual.descuento = {
    codigo: descuento.codigo,
    tipo: descuento.tipo,
    valor: descuento.valor,
    categorias: descuento.categorias
  };

  // Actualizar UI
  elementoMensaje.innerHTML = `
    <span class="descuento-exitoso">
      ✔️ Descuento aplicado: ${codigo}
      <button class="btn-remover-descuento">✖</button>
    </span>
  `;
  elementoMensaje.querySelector('.btn-remover-descuento').addEventListener('click', limpiarDescuentoAplicado);

  actualizarPedidoUI();
}

// Función para limpiar descuento aplicado
function limpiarDescuentoAplicado() {
  window.pedidoActual.descuento = null;
  document.getElementById('codigo-descuento').value = '';
  document.getElementById('descuento-aplicado').innerHTML = '';
  actualizarPedidoUI();
}

// Función para mostrar error de descuento
function mostrarErrorDescuento(mensaje, elemento) {
  window.pedidoActual.descuento = null;
  elemento.innerHTML = `<span class="descuento-error">❌ ${mensaje}</span>`;
  actualizarPedidoUI();
}

// Función para validar descuento
function validarDescuento(descuento) {
  const estado = obtenerEstadoDescuento(descuento);
  
  switch (estado) {
    case CONFIG_DESCUENTOS.ESTADOS.EXPIRADO:
      return { valido: false, mensaje: 'Código expirado' };
    case CONFIG_DESCUENTOS.ESTADOS.LIMITE_ALCANZADO:
      return { valido: false, mensaje: 'Límite de usos alcanzado' };
    case CONFIG_DESCUENTOS.ESTADOS.ACTIVO:
      return { valido: true, mensaje: 'Código válido' };
    default:
      return { valido: false, mensaje: 'Estado desconocido' };
  }
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  inicializarDescuentos();
  sincronizarPedidosConDescuentos();
  
  // Configurar eventos globales
  document.getElementById('filtro-orden')?.addEventListener('change', cargarListaDescuentos);
  document.getElementById('btn-aplicar-descuento')?.addEventListener('click', aplicarDescuento);
});
