document.addEventListener('DOMContentLoaded', function () {
  // Inicializar la aplicación
  initApp();
});

function initApp() {
  // Cargar configuración
  if (!localStorage.getItem('pinConfigurado')) {
    localStorage.setItem('adminPIN', '1234');
    localStorage.setItem('pinConfigurado', 'true');
  }

  // Generar o cargar pedido
  const ultimoPedido = JSON.parse(localStorage.getItem('ultimoPedido'));
  if (ultimoPedido && ultimoPedido.items && ultimoPedido.items.length > 0) {
    if (confirm('¿Deseas continuar con el último pedido no enviado?')) {
      window.pedidoActual = ultimoPedido;
      document.getElementById('pedido-codigo').textContent = ultimoPedido.codigo;
    } else {
      generarNuevoPedido();
    }
  } else {
    generarNuevoPedido();
  }

  cargarProductos();
  setupEventListeners();
  actualizarPedidoUI();
}

function generarNuevoPedido() {
  const ahora = new Date();
  const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
  const año = ahora.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 90 + 10);

  const codigo = `EA-${mes}${año}-${random}`;
  document.getElementById('pedido-codigo').textContent = codigo;

  window.pedidoActual = {
    codigo: codigo,
    fecha: ahora.toISOString(),
    items: [],
    descuento: null,
    costoEnvio: 0,
    total: 0,
    subtotal: 0,
    notas: '',
    estado: 'pendiente'
  };

  // Resetear UI
  document.querySelectorAll('.btn-envio').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.btn-envio[data-monto="0"]').classList.add('active');
  document.getElementById('pedido-notas-input').value = '';
  document.getElementById('codigo-descuento').value = '';
  document.getElementById('descuento-aplicado').textContent = '';
}

function inicializarCostoEnvio() {
  // Agregar propiedad de envío al pedido actual si no existe
  if (!window.pedidoActual.hasOwnProperty('costoEnvio')) {
    window.pedidoActual.costoEnvio = 0;
  }
}

function cargarProductos() {
  // Esto debería venir de una base de datos, pero por ahora lo hardcodeamos
  const productos = {
    alitas: [
      { id: 1, nombre: "Alitas BBQ", precio: 75, imagen: "", esCombo: false },
      { id: 2, nombre: "Alitas Mango Habanero", precio: 75, imagen: "", esCombo: false },
      { id: 3, nombre: "Alitas Buffalo", precio: 75, imagen: "", esCombo: false },
      { id: 4, nombre: "Alitas Queso Parmesano", precio: 75, imagen: "", esCombo: false },
      { id: 5, nombre: "Alitas Estilo Brayan", precio: 75, imagen: "", esCombo: false }
    ],
    boneless: [
      { id: 6, nombre: "Boneless BBQ (200g)", precio: 70, imagen: "", gramaje: 200, esCombo: false },
      { id: 7, nombre: "Boneless Mango Habanero (200g)", precio: 70, imagen: "", gramaje: 200, esCombo: false },
      { id: 8, nombre: "Boneless Buffalo (200g)", precio: 70, imagen: "", gramaje: 200, esCombo: false },
      { id: 9, nombre: "Boneless Queso Parmesano (200g)", precio: 70, imagen: "", gramaje: 200, esCombo: false }
    ],
    papas: [
      { id: 10, nombre: "Papas Fritas", precio: 35, imagen: "", esCombo: false },
      { id: 11, nombre: "Papas a la Francesa", precio: 35, imagen: "", esCombo: false },
      { id: 12, nombre: "Papas con Chorizo", precio: 50, imagen: "", esCombo: false }
    ],
    bebidas: [
      { id: 13, nombre: "Frappe Moka", precio: 40, imagen: "", esCombo: false },
      { id: 14, nombre: "Frappe Oreo", precio: 40, imagen: "", esCombo: false },
      { id: 15, nombre: "Frappe Chispas Chocolate", precio: 40, imagen: "", esCombo: false },
      { id: 16, nombre: "Refresco 600ml", precio: 35, imagen: "", esCombo: false },
      { id: 17, nombre: "Agua Mineral", precio: 25, imagen: "", esCombo: false }
    ],
    extras: [
      { id: 18, nombre: "Crema Batida - Chisp Chocolate", precio: 10, imagen: "", esCombo: false },
      { id: 19, nombre: "Aderezo Extra", precio: 15, imagen: "", esCombo: false },
      { id: 20, nombre: "Zanahorita", precio: 5, imagen: "", esCombo: false }
    ]
  };

  window.productosDB = productos;
  mostrarProductos('alitas');
}

function mostrarProductos(categoria) {
  const productosContainer = document.getElementById('productos-container');
  productosContainer.innerHTML = '';

  // Actualizar título de categoría
  const categoriasMap = {
    'alitas': 'Alitas',
    'boneless': 'Boneless',
    'papas': 'Papas Fritas',
    'bebidas': 'Bebidas',
    'extras': 'Extras',
    'combos': 'Combos Promocionales'
  };

  document.getElementById('categoria-actual').textContent = categoriasMap[categoria] || 'Productos';

  if (categoria === 'combos') {
    // Mostrar combos en lugar de productos
    mostrarCombosEnProductos();
  } else {
    // Mostrar productos normales
    const productos = window.productosDB[categoria] || [];

    productos.forEach(producto => {
      const productoCard = document.createElement('div');
      productoCard.className = 'producto-card';
      productoCard.dataset.id = producto.id;
      productoCard.innerHTML = `
        <div class="producto-img"></div>
        <div class="producto-nombre">${producto.nombre}</div>
        <div class="producto-precio">$${producto.precio}</div>
      `;

      productoCard.addEventListener('click', () => {
        agregarProductoAPedido(producto);
      });

      productosContainer.appendChild(productoCard);
    });
  }
}

function agregarProductoAPedido(producto) {
  // Verificar si el producto ya está en el pedido
  const itemExistente = window.pedidoActual.items.find(item => item.id === producto.id && !item.esEspecial);

  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    window.pedidoActual.items.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      gramaje: producto.gramaje || null,
      esCombo: producto.esCombo || false // Asegurar que esCombo se copia
    });
  }

  actualizarPedidoUI();

  // Registrar cambio si es edición
  if (window.pedidoEnEdicion) {
    const item = window.pedidoActual.items.find(item => item.id === producto.id);
    registrarCambioPedido({
      tipo: 'item_agregado',
      itemId: item.id,
      itemNombre: item.nombre,
      cantidad: item.cantidad
    });
  }
}

function actualizarPedidoUI() {
  const pedidoItemsContainer = document.getElementById('pedido-items');
  const subtotalElement = document.getElementById('subtotal');
  const totalElement = document.getElementById('total');
  const envioMontoElement = document.getElementById('envio-monto');

  // Calcular subtotal
  window.pedidoActual.subtotal = window.pedidoActual.items.reduce((sum, item) => {
    return sum + (item.precio * item.cantidad);
  }, 0);

  // Calcular total con descuento usando la función del módulo de descuentos
  const resultadoDescuento = calcularTotalConDescuento();
  window.pedidoActual.total = resultadoDescuento.total;
  window.pedidoActual.subtotal = resultadoDescuento.subtotal;

  // Agregar costo de envío al total final
  const costoEnvio = window.pedidoActual.costoEnvio || 0;
  window.pedidoActual.total += costoEnvio;

  // Actualizar UI
  if (window.pedidoActual.items.length === 0) {
    pedidoItemsContainer.innerHTML = '<div class="empty-state">No hay productos agregados</div>';
  } else {
    pedidoItemsContainer.innerHTML = '';

    window.pedidoActual.items.forEach(item => {
      const itemElement = crearElementoItemPedido(item);
      pedidoItemsContainer.appendChild(itemElement);
    });
  }

  subtotalElement.textContent = `$${window.pedidoActual.subtotal.toFixed(2)}`;
  envioMontoElement.textContent = `$${costoEnvio.toFixed(2)}`;
  totalElement.textContent = `$${window.pedidoActual.total.toFixed(2)}`;

  // Guardar automáticamente
  guardarPedidoActual();
}

function guardarPedidoActual() {
  try {
    // Verificar que existe un pedido actual
    if (!window.pedidoActual) {
      console.warn('No hay pedido actual para guardar');
      return;
    }

    // Actualizar timestamp de última modificación
    window.pedidoActual.ultimaModificacion = new Date().toISOString();

    // Guardar el pedido actual en localStorage
    localStorage.setItem('ultimoPedido', JSON.stringify(window.pedidoActual));

    // También guardarlo en el historial de pedidos
    guardarEnHistorialPedidos(window.pedidoActual);

    // Log para debugging (opcional)
    console.log(`Pedido ${window.pedidoActual.codigo} guardado automáticamente`);

  } catch (error) {
    console.error('Error al guardar el pedido:', error);
    mostrarNotificacion('Error al guardar el pedido', 'error');
  }
}

function guardarEnHistorialPedidos(pedido) {
  try {
    // Obtener historial existente
    const historial = JSON.parse(localStorage.getItem('historialPedidos') || '[]');

    // Buscar si ya existe el pedido en el historial
    const indiceExistente = historial.findIndex(p => p.codigo === pedido.codigo);

    if (indiceExistente !== -1) {
      // Actualizar pedido existente
      historial[indiceExistente] = { ...pedido };
    } else {
      // Agregar nuevo pedido al historial
      historial.unshift({ ...pedido });
    }

    // Mantener solo los últimos 50 pedidos para evitar que crezca demasiado
    if (historial.length > 50) {
      historial.splice(50);
    }

    // Guardar historial actualizado
    localStorage.setItem('historialPedidos', JSON.stringify(historial));

  } catch (error) {
    console.error('Error al guardar en historial:', error);
  }
}

function limpiarPedidoGuardado() {
  try {
    localStorage.removeItem('ultimoPedido');
    console.log('Pedido guardado eliminado del localStorage');
  } catch (error) {
    console.error('Error al limpiar pedido guardado:', error);
  }
}

function obtenerPedidoGuardado() {
  try {
    const pedidoGuardado = localStorage.getItem('ultimoPedido');
    return pedidoGuardado ? JSON.parse(pedidoGuardado) : null;
  } catch (error) {
    console.error('Error al obtener pedido guardado:', error);
    return null;
  }
}

function obtenerHistorialPedidos() {
  try {
    const historial = localStorage.getItem('historialPedidos');
    return historial ? JSON.parse(historial) : [];
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return [];
  }
}

function crearElementoItemPedido(item) {
  const div = document.createElement('div');
  div.className = 'pedido-item editable';
  div.dataset.id = item.id;

  div.innerHTML = `
        <div class="item-controls">
            <button class="btn-menos">−</button>
            <span class="item-cantidad">${item.cantidad}</span>
            <button class="btn-mas">+</button>
            <button class="btn-eliminar-item">🗑️</button>
        </div>
        <div class="item-info">
            <span class="item-nombre">${item.nombre}</span>
            ${item.gramaje ? `<span class="item-gramaje">${item.gramaje}g</span>` : ''}
        </div>
        <div class="item-precio">$${(item.precio * item.cantidad).toFixed(2)}</div>
    `;

  // Event listeners para controles
  div.querySelector('.btn-menos').addEventListener('click', () => {
    if (item.cantidad > 1) {
      item.cantidad -= 1;
      actualizarItemPedido(item);
    }
  });

  div.querySelector('.btn-mas').addEventListener('click', () => {
    item.cantidad += 1;
    actualizarItemPedido(item);
  });

  div.querySelector('.btn-eliminar-item').addEventListener('click', () => {
    eliminarItemPedido(item.id);
  });

  return div;
}

function actualizarItemPedido(item) {
  const pedido = window.pedidoEnEdicion?.datosEditados || window.pedidoActual;
  const itemIndex = pedido.items.findIndex(i => i.id === item.id);

  if (itemIndex !== -1) {
    pedido.items[itemIndex] = item;
    actualizarPedidoUI();

    // Registrar cambio en historial si es edición
    if (window.pedidoEnEdicion) {
      registrarCambioPedido({
        tipo: 'modificacion_item',
        itemId: item.id,
        campo: 'cantidad',
        valorAnterior: pedido.items[itemIndex].cantidad,
        valorNuevo: item.cantidad
      });
    }
  }
}

function configurarEventosEnvio() {
  document.querySelectorAll('.btn-envio').forEach(btn => {
    btn.addEventListener('click', function () {
      // Remover clase active de todos los botones
      document.querySelectorAll('.btn-envio').forEach(b => b.classList.remove('active'));

      // Agregar clase active al botón clickeado
      this.classList.add('active');

      // Obtener el monto del envío
      const montoEnvio = parseFloat(this.dataset.monto);

      // Actualizar el costo de envío en el pedido
      window.pedidoActual.costoEnvio = montoEnvio;

      // Actualizar la UI
      actualizarPedidoUI();

      // Registrar cambio si es edición
      if (window.pedidoEnEdicion) {
        registrarCambioPedido({
          tipo: 'envio_modificado',
          valorAnterior: window.pedidoEnEdicion.datosEditados.costoEnvio || 0,
          valorNuevo: montoEnvio
        });
      }
    });
  });
}

function eliminarItemPedido(id) {
  const pedido = window.pedidoEnEdicion?.datosEditados || window.pedidoActual;
  const itemIndex = pedido.items.findIndex(item => item.id === id);

  if (itemIndex !== -1) {
    const itemEliminado = pedido.items[itemIndex];

    // Registrar cambio si es edición
    if (window.pedidoEnEdicion) {
      registrarCambioPedido({
        tipo: 'item_eliminado',
        itemId: itemEliminado.id,
        itemNombre: itemEliminado.nombre
      });
    }

    pedido.items.splice(itemIndex, 1);
    actualizarPedidoUI();
  }
}

function setupEventListeners() {
  // Eventos de categorías
  document.querySelectorAll('.categoria-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.categoria-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mostrarProductos(btn.dataset.categoria);
    });
  });

  // Agrega esto junto con los otros event listeners
  document.getElementById('btn-editar-pedido').addEventListener('click', function () {
    document.getElementById('buscar-pedido-modal').style.display = 'flex';

    // Opcional: cargar pedidos recientes al abrir el modal
    cargarPedidosRecientes();
  });

  // Evento de vista previa
  document.getElementById('vista-previa-btn').addEventListener('click', mostrarVistaPrevia);

  // Evento de enviar por WhatsApp
  document.getElementById('enviar-whatsapp').addEventListener('click', enviarPedidoWhatsApp);

  // Evento de reiniciar pedido
  document.getElementById('reiniciar-pedido').addEventListener('click', reiniciarPedido);

  // Evento de aplicar descuento
  document.getElementById('aplicar-descuento').addEventListener('click', aplicarDescuento);

  // Eventos de modales
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });

  // Cerrar modal al hacer clic fuera
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Evento de pedido especial
  document.querySelector('.especial-btn').addEventListener('click', mostrarModalPedidoEspecial);

  // Evento para nuevo pedido
  document.getElementById('btn-nuevo-pedido').addEventListener('click', confirmarNuevoPedido);

  // Evento modificado para enviar por WhatsApp
  document.getElementById('enviar-whatsapp').addEventListener('click', async function () {
    await enviarPedidoWhatsApp();

    // Asegurar que la categoría actual se resetee
    const primeraCategoria = document.querySelector('.categorias-list .categoria-btn');
    if (primeraCategoria) {
      primeraCategoria.click(); // Simular click para resetear vista
    }
  });

  // Eventos de admin
  document.getElementById('btn-exportar').addEventListener('click', exportarDatos);
  document.getElementById('input-importar').addEventListener('change', importarDatos);
  document.getElementById('btn-descuentos').addEventListener('click', mostrarAdminDescuentos);
  document.getElementById('btn-dashboard').addEventListener('click', mostrarDashboard);

  // Configurar eventos dentro del modal de editar pedido
  document.getElementById('btn-buscar-pedido').addEventListener('click', buscarPedido);
  document.getElementById('input-codigo-pedido').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') buscarPedido();
  });
  document.getElementById('btn-verificar-pin').addEventListener('click', verificarPin);

  configurarEventosEnvio();
}

// Botón nuevo pedido
function confirmarNuevoPedido() {
  // Si no hay items o el pedido está vacío, crear uno nuevo directamente
  if (window.pedidoActual.items.length === 0) {
    generarNuevoPedido();
    return;
  }

  // Si hay items, pedir confirmación
  const confirmar = confirm('¿Crear un nuevo pedido? Se perderán los items no enviados del pedido actual.');
  if (confirmar) {
    generarNuevoPedido();
    actualizarPedidoUI();
    mostrarNotificacion('Nuevo pedido creado', 'success');
  }
}

function mostrarVistaPrevia() {
  if (window.pedidoActual.items.length === 0) {
    mostrarNotificacion('No hay productos en el pedido', 'warning');
    return;
  }

  const modal = document.getElementById('vista-previa-modal');
  const content = document.getElementById('vista-previa-content');
  const esModificacion = !!window.pedidoEnEdicion;

  // Calcular el descuento usando la función del módulo de descuentos
  const resultadoDescuento = calcularTotalConDescuento();
  const descuentoMonto = resultadoDescuento.descuento;
  const contieneCombos = window.pedidoActual.items.some(item => item.esCombo === true);
  const soloCombos = window.pedidoActual.items.every(item => item.esCombo === true);

  let html = `
        <h3>Pedido #${window.pedidoActual.codigo}</h3>
        <p><strong>Fecha:</strong> ${new Date(window.pedidoActual.fecha).toLocaleString()}</p>
        ${esModificacion ? `<p><strong>Modificación:</strong> ${new Date().toLocaleString()}</p>` : ''}
        
        <table class="vista-previa-table">
            <thead>
                <tr>
                    <th>Cantidad</th>
                    <th>Producto</th>
                    <th>Precio</th>
                </tr>
            </thead>
            <tbody>
    `;

  window.pedidoActual.items.forEach(item => {
    html += `
            <tr>
                <td>${item.cantidad}</td>
                <td>${item.nombre}${item.esCombo ? ' (Combo)' : ''}</td>
                <td>$${(item.precio * item.cantidad).toFixed(2)}</td>
            </tr>
        `;
  });

  html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2">Subtotal:</td>
                    <td>$${window.pedidoActual.subtotal.toFixed(2)}</td>
                </tr>
    `;

  if (window.pedidoActual.descuento && descuentoMonto > 0) {
    let descuentoTexto = `Descuento (${window.pedidoActual.descuento.codigo})`;
    if (contieneCombos && !soloCombos) {
      descuentoTexto += ' (aplicado a productos no combos)';
    }
    html += `
            <tr>
                <td colspan="2">${descuentoTexto}:</td>
                <td>-$${descuentoMonto.toFixed(2)}</td>
            </tr>
        `;
  } else if (window.pedidoActual.descuento && soloCombos) {
    html += `
            <tr>
                <td colspan="2">Descuento (${window.pedidoActual.descuento.codigo}):</td>
                <td>No aplicable (solo combos)</td>
            </tr>
        `;
  }

  if (window.pedidoActual.costoEnvio > 0) {
    html += `
            <tr>
                <td colspan="2">Costo de envío:</td>
                <td>$${window.pedidoActual.costoEnvio.toFixed(2)}</td>
            </tr>
        `;
  }

  html += `
                <tr class="total-row">
                    <td colspan="2">Total:</td>
                    <td>$${window.pedidoActual.total.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    `;

  if (window.pedidoActual.notas) {
    html += `<p><strong>Notas:</strong> ${window.pedidoActual.notas}</p>`;
  }

  content.innerHTML = html;
  modal.style.display = 'flex';

  // Configurar botones del modal
  document.getElementById('editar-pedido').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  document.getElementById('confirmar-envio').addEventListener('click', () => {
    modal.style.display = 'none';
    enviarPedidoWhatsApp();
  });
}

function reiniciarPedido() {
  if (window.pedidoActual.items.length === 0) {
    mostrarNotificacion('El pedido ya está vacío', 'info');
    return;
  }

  crearModalConfirmacion(
    '¿Reiniciar este pedido?',
    'Se mantendrá el mismo código pero se eliminarán todos los items',
    {
      confirmar: () => {
        // Limpiar el pedido
        window.pedidoActual.items = [];
        window.pedidoActual.subtotal = 0;
        window.pedidoActual.total = 0;
        window.pedidoActual.notas = '';
        window.pedidoActual.costoEnvio = 0;
        window.pedidoActual.descuento = null;

        // Resetear UI
        document.querySelectorAll('.btn-envio').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.btn-envio[data-monto="0"]').classList.add('active');
        document.getElementById('pedido-notas-input').value = '';
        document.getElementById('codigo-descuento').value = '';

        actualizarPedidoUI();
        mostrarNotificacion('Pedido reiniciado', 'success');
      },
      cancelar: () => {
        console.log('Reinicio cancelado'); // Opcional: para debugging
      }
    }
  );
}

function crearModalConfirmacion(titulo, mensaje, acciones) {
  const modal = document.createElement('div');
  modal.className = 'modal-confirmacion';

  modal.innerHTML = `
    <div class="modal-contenido">
      <h3 style="margin-top: 0; color: #333">${titulo}</h3>
      <p style="color: #666">${mensaje}</p>
      <div class="modal-actions">
        <button class="btn-cancelar">Cancelar</button>
        <button class="btn-confirmar">Confirmar</button>
      </div>
    </div>
  `;

  // Función para cerrar y limpiar el modal
  const cerrarModal = () => {
    modal.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => {
      modal.remove();
    }, 300);
  };

  // Añadir animación de salida
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Event listeners mejorados
  modal.querySelector('.btn-cancelar').addEventListener('click', () => {
    acciones.cancelar?.();
    cerrarModal();
  });

  modal.querySelector('.btn-confirmar').addEventListener('click', () => {
    acciones.confirmar?.();
    cerrarModal();
  });

  // Cerrar al hacer clic fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      acciones.cancelar?.();
      cerrarModal();
    }
  });

  // Asegurar que se añade al final del body
  document.body.appendChild(modal);

  // Retornar el modal por si necesitas referencia
  return modal;
}

function confirmarNuevoPedido() {
  // Si no hay items, crear nuevo pedido directamente
  if (window.pedidoActual.items.length === 0) {
    generarNuevoPedido();
    return;
  }

  crearModalConfirmacion(
    '¿Crear nuevo pedido?',
    'Se perderán los items no enviados del pedido actual',
    {
      confirmar: () => {
        generarNuevoPedido();
        actualizarPedidoUI();
        mostrarNotificacion('Nuevo pedido creado', 'success');
      },
      cancelar: () => {
        mostrarNotificacion('Creación de pedido cancelada', 'info');
      }
    }
  );
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion ${tipo}`;
  notificacion.textContent = mensaje;

  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notificacion);
    }, 300);
  }, 3000);
}

function mostrarModalPedidoEspecial() {
  const modal = document.getElementById('pedido-especial-modal');
  const form = document.getElementById('especial-form');

  form.innerHTML = `
        <div class="combinacion-container" id="combinacion-container"></div>
        <button id="agregar-combinacion" class="btn-agregar">+ Agregar Combinación</button>
        <div class="opciones-gramaje">
            <label><input type="radio" name="tipo-gramaje" value="piezas" checked> Por Piezas</label>
            <label><input type="radio" name="tipo-gramaje" value="gramos"> Por Gramos</label>
        </div>
        <div class="preview-especial" id="preview-especial"></div>
        <button id="guardar-especial" class="btn-guardar">Guardar Pedido Especial</button>
    `;

  // Event listeners
  document.getElementById('agregar-combinacion').addEventListener('click', agregarNuevaCombinacion);
  document.getElementById('guardar-especial').addEventListener('click', guardarPedidoEspecial);

  // Escuchar cambios en el tipo de gramaje
  document.querySelectorAll('input[name="tipo-gramaje"]').forEach(radio => {
    radio.addEventListener('change', function () {
      actualizarUnidadesEnTodos();
      actualizarPreviewEspecial();
    });
  });

  // Agregar primera combinación por defecto
  agregarNuevaCombinacion();

  modal.style.display = 'flex';
}

function agregarNuevaCombinacion() {
  const container = document.getElementById('combinacion-container');
  const tipoGramaje = document.querySelector('input[name="tipo-gramaje"]:checked').value;

  const comboId = Date.now();
  const comboHTML = `
        <div class="combinacion-item" data-id="${comboId}">
            <select class="producto-base">
                <option value="alitas">Alitas</option>
                <option value="boneless">Boneless</option>
            </select>
            
            <select class="sabor">
                <option value="BBQ">BBQ</option>
                <option value="Mango Habanero">Mango Habanero</option>
                <option value="Buffalo">Buffalo</option>
                <option value="Chipotle">Chipotle</option>
            </select>
            
            <div class="cantidad-container">
                <input type="number" class="cantidad" min="1" value="${tipoGramaje === 'gramos' ? '200' : '3'}">
                <span class="unidad">${tipoGramaje === 'gramos' ? 'g' : 'pz'}</span>
            </div>
            
            <button class="btn-eliminar-combo">Eliminar</button>
        </div>
    `;

  container.insertAdjacentHTML('beforeend', comboHTML);

  // Event listeners para la nueva combinación
  const nuevoItem = container.querySelector(`[data-id="${comboId}"]`);

  nuevoItem.querySelector('.producto-base').addEventListener('change', function () {
    actualizarUnidades(this);
    actualizarPreviewEspecial();
  });

  nuevoItem.querySelector('.btn-eliminar-combo').addEventListener('click', function () {
    container.removeChild(nuevoItem);
    actualizarPreviewEspecial();
  });

  // Event listeners para cambios
  nuevoItem.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', actualizarPreviewEspecial);
  });

  actualizarPreviewEspecial();
}

function actualizarUnidades(selectElement) {
  const comboItem = selectElement.closest('.combinacion-item');
  const unidadSpan = comboItem.querySelector('.unidad');
  const cantidadInput = comboItem.querySelector('.cantidad');
  const tipoGramaje = document.querySelector('input[name="tipo-gramaje"]:checked').value;

  if (selectElement.value === 'boneless' && tipoGramaje === 'gramos') {
    unidadSpan.textContent = 'g';
    cantidadInput.value = '200'; // Valor por defecto en gramos
  } else {
    unidadSpan.textContent = 'pz';
    cantidadInput.value = '3'; // Valor por defecto en piezas
  }
}

function actualizarUnidadesEnTodos() {
  document.querySelectorAll('.producto-base').forEach(select => {
    actualizarUnidades(select);
  });
}

function actualizarPreviewEspecial() {
  const preview = document.getElementById('preview-especial');
  const items = document.querySelectorAll('.combinacion-item');

  if (items.length === 0) {
    preview.innerHTML = '<p>No hay combinaciones agregadas</p>';
    return;
  }

  let html = '<h4>Resumen del Pedido Especial:</h4><ul>';

  items.forEach(item => {
    const producto = item.querySelector('.producto-base').value;
    const sabor = item.querySelector('.sabor').value;
    const cantidad = item.querySelector('.cantidad').value;
    const unidad = item.querySelector('.unidad').textContent;

    html += `<li>${cantidad}${unidad} ${producto} ${sabor}</li>`;
  });

  html += '</ul>';
  preview.innerHTML = html;
}

function guardarPedidoEspecial() {
  const items = document.querySelectorAll('.combinacion-item');
  const tipoGramaje = document.querySelector('input[name="tipo-gramaje"]:checked').value;

  if (items.length === 0) {
    mostrarNotificacion('Por favor agrega al menos una combinación', 'warning');
    return;
  }

  // Calcular precio total base
  let precioBase = 0;
  const combinaciones = [];
  let descripcion = [];

  items.forEach(item => {
    const producto = item.querySelector('.producto-base').value;
    const sabor = item.querySelector('.sabor').value;
    const cantidad = parseFloat(item.querySelector('.cantidad').value);
    const unidad = item.querySelector('.unidad').textContent;

    // Calcular precio basado en producto y tipo de medida
    let precioUnitario;
    if (producto === 'alitas') {
      precioUnitario = 15; // Precio por alita
      descripcion.push(`${cantidad}pz ${sabor}`);
    } else if (producto === 'boneless') {
      if (tipoGramaje === 'gramos') {
        precioUnitario = 0.35; // Precio por gramo (250g = $150)
        descripcion.push(`${cantidad}g ${sabor}`);
      } else {
        precioUnitario = 25; // Precio por pieza de boneless
        descripcion.push(`${cantidad}pz ${sabor}`);
      }
    }

    const subtotal = producto === 'boneless' && tipoGramaje === 'gramos'
      ? cantidad * precioUnitario
      : cantidad * precioUnitario;

    precioBase += subtotal;

    combinaciones.push({
      producto,
      sabor,
      cantidad,
      tipoMedida: tipoGramaje === 'gramos' && producto === 'boneless' ? 'gramos' : 'piezas',
      precioUnitario,
      subtotal
    });
  });

  // Aplicar descuento por combo (10%)
  const precioFinal = precioBase;

  // Crear nombre descriptivo
  const nombreEspecial = `Combo Especial (${descripcion.join(' + ')})`;

  // Agregar al pedido
  const nuevoItem = {
    id: Date.now(),
    nombre: nombreEspecial,
    precio: precioFinal,
    cantidad: 1,
    esEspecial: true,
    esCombo: true, // Marcar explícitamente como combo
    combinaciones,
    tipoGramaje: tipoGramaje === 'gramos' ? 'gramos' : 'piezas'
  };

  // Agregar al pedido actual o editado
  if (window.pedidoEnEdicion) {
    window.pedidoEnEdicion.datosEditados.items.push(nuevoItem);
    registrarCambioPedido({
      tipo: 'item_agregado',
      itemId: nuevoItem.id,
      itemNombre: nuevoItem.nombre
    });
  } else {
    window.pedidoActual.items.push(nuevoItem);
  }

  // Cerrar modal y actualizar
  document.getElementById('pedido-especial-modal').style.display = 'none';
  actualizarPedidoUI();
}

function registrarCambioPedido(cambio) {
  const pedido = window.pedidoEnEdicion.datosEditados;

  cambio.fecha = new Date().toISOString();
  cambio.usuario = 'admin';

  pedido.historial = pedido.historial || [];
  pedido.historial.push(cambio);
}