// Precios base (costo) y precios de venta
const PRECIOS_BASE = {
  alitas: { costo: 55, venta: 75 },
  boneless: { costo: 45, venta: 70 },
  papas: { costo: 15, venta: 35 },
  bebidas: { costo: 15, venta: 20 },
  extras: { costo: 10, venta: 15 }
};

document.addEventListener('DOMContentLoaded', function() {
  cargarCombosGuardados();
  setupComboEventListeners();
  mostrarCombosEnProductos();
  mostrarListaCombosModal(); // Nueva función para mostrar la lista en el modal
});

// Configurar eventos del modal de combos
function setupComboEventListeners() {
  document.getElementById('btn-crear-combo').addEventListener('click', function() {
      mostrarModalCombo();
  });

  document.querySelector('.close-combo-modal').addEventListener('click', function() {
      document.getElementById('combo-modal').style.display = 'none';
  });

  document.getElementById('combo-modal').addEventListener('click', function(e) {
      if (e.target === this) {
          this.style.display = 'none';
      }
  });

  document.getElementById('add-combo-item').addEventListener('click', agregarItemCombo);
  document.getElementById('reset-combo').addEventListener('click', reiniciarCombo);
  document.getElementById('save-combo').addEventListener('click', guardarCombo);

  document.getElementById('combo-profit-margin').addEventListener('change', function() {
      calcularPrecioCombo();
      actualizarPreviewCombo();
  });
}

// Nueva función para mostrar la lista de combos en el modal
// En la función mostrarListaCombosModal():
function mostrarListaCombosModal() {
  const combosListContainer = document.getElementById('combo-list-container');
  const combos = cargarCombosGuardados();

  if (!combosListContainer) return;

  if (combos.length === 0) {
      combosListContainer.innerHTML = '<p>No hay combos creados.</p>';
      return;
  }

  let html = `
      <table class="combo-list-table">
          <thead>
              <tr>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
              </tr>
          </thead>
          <tbody>
  `;

  combos.forEach(combo => {
      html += `
          <tr data-id="${combo.id}">
              <td>${combo.nombre}</td>
              <td>$${combo.precio.toFixed(2)}</td>
              <td>
                  ${new Date(combo.fechaInicio).toLocaleDateString()} - 
                  ${combo.fechaFin ? new Date(combo.fechaFin).toLocaleDateString() : 'Indefinido'}
              </td>
              <td>
                  <span class="status-badge ${combo.activo ? 'active' : 'inactive'}">
                      ${combo.activo ? 'Activo' : 'Inactivo'}
                  </span>
              </td>
              <td>
                  <button class="btn-edit-combo" data-id="${combo.id}">✏️ Editar</button>
                  <button class="btn-view-combo" data-id="${combo.id}">👁️ Ver</button>
                  <button class="btn-share-whatsapp" data-id="${combo.id}">📱 Compartir</button>
                  <button class="btn-delete-combo" data-id="${combo.id}">🗑️ Eliminar</button>
              </td>
          </tr>
      `;
  });

  html += '</tbody></table>';
  combosListContainer.innerHTML = html;

  // Agregar eventos para botones
  document.querySelectorAll('.btn-edit-combo').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          const combo = obtenerComboPorId(comboId);
          mostrarModalCombo(combo);
      });
  });

  document.querySelectorAll('.btn-view-combo').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          mostrarDetallesCombo(comboId);
      });
  });

  document.querySelectorAll('.btn-delete-combo').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          eliminarCombo(comboId);
          mostrarListaCombosModal();
      });
  });

  document.querySelectorAll('.btn-share-whatsapp').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          compartirComboPorWhatsApp(comboId);
      });
  });
}

function compartirComboPorWhatsApp(comboId) {
    const combo = obtenerComboPorId(comboId);
    if (!combo) {
        mostrarNotificacion('Combo no encontrado', 'error');
        return;
    }

    // Calcular ahorro del cliente
    const precioNormal = combo.items.reduce((sum, item) => {
        return sum + (item.precioVentaUnitario * item.cantidad);
    }, 0);
    const ahorro = precioNormal - combo.precio;
    const porcentajeAhorro = (ahorro / precioNormal) * 100;

    // Formatear la lista de productos
    const listaProductos = combo.items.map(item => 
        `✔️ ${item.cantidad}x ${item.productoNombre}`
    ).join('\n');

    // Fecha de vigencia si existe
    const vigencia = combo.fechaFin ? 
        `⏳ *Disponible hasta:* ${new Date(combo.fechaFin).toLocaleDateString()}\n\n` : 
        '';

    // Crear mensaje persuasivo
    const mensaje = `🍗 *¡OFERTA IMPERDIBLE!* 🍗\n\n` +
        `🎉 *${combo.nombre.toUpperCase()}*\n\n` +
        `💥 *Precio especial:* $${combo.precio.toFixed(2)}\n` +
        `🎯 *Ahorro total:* $${ahorro.toFixed(2)} (${porcentajeAhorro.toFixed(0)}% OFF)\n` +
        `💸 Precio regular: $${precioNormal.toFixed(2)}\n\n` +
        `📦 *Incluye:*\n${listaProductos}\n\n` +
        `${vigencia}` +
        `🔥 *¡Solo por tiempo limitado!* Aprovecha esta oportunidad:\n` +
        `✅ Más comida por menos dinero\n` +
        `✅ Combinación perfecta de sabores\n` +
        `✅ Ideal para compartir y disfrutar\n\n` +
        `🔁 *Comparte esta promo y que nadie se la pierda:*\n` ;

    // Codificar el mensaje completo para el primer envío
    const mensajeCodificado = encodeURIComponent(mensaje);

    // Crear enlace de WhatsApp para el cliente
    const urlWhatsApp = `https://wa.me/?text=${mensajeCodificado}`;

    // Abrir en nueva pestaña
    window.open(urlWhatsApp, '_blank');
}


// Nueva función para mostrar detalles del combo
function mostrarDetallesCombo(comboId) {
  const combo = obtenerComboPorId(comboId);
  if (!combo) {
      mostrarNotificacion('Combo no encontrado', 'error');
      return;
  }

  // Función auxiliar para formatear números de forma segura
  const formatNumber = (value, decimals = 2) => {
      if (value === undefined || value === null || isNaN(value)) {
          return '0.00';
      }
      return parseFloat(value).toFixed(decimals);
  };

  // Calcular totales de forma segura
  const costoTotal = combo.items.reduce((sum, item) => {
      const costo = item.costoUnitario !== undefined ? item.costoUnitario : 0;
      const cantidad = item.cantidad !== undefined ? item.cantidad : 0;
      return sum + (costo * cantidad);
  }, 0);

  const ventaTotal = combo.items.reduce((sum, item) => {
      const precio = item.precioVentaUnitario !== undefined ? item.precioVentaUnitario : 0;
      const cantidad = item.cantidad !== undefined ? item.cantidad : 0;
      return sum + (precio * cantidad);
  }, 0);

  const ahorro = ventaTotal - (combo.precio || 0);
  const porcentajeAhorro = ventaTotal > 0 ? (ahorro / ventaTotal) * 100 : 0;

  const modal = document.createElement('div');
  modal.className = 'modal-combos';
  modal.innerHTML = `
      <div class="modal-content combo-details-modal">
          <span class="close-modal">&times;</span>
          <h3>${combo.nombre || 'Combo sin nombre'}</h3>
          <div class="combo-details-header">
              <p><strong>Precio:</strong> $${formatNumber(combo.precio)}</p>
              <p><strong>Margen:</strong> ${formatNumber(combo.margen, 1)}%</p>
              <p><strong>Vigencia:</strong> 
                  ${combo.fechaInicio ? new Date(combo.fechaInicio).toLocaleDateString() : 'Sin fecha'} - 
                  ${combo.fechaFin ? new Date(combo.fechaFin).toLocaleDateString() : 'Indefinido'}
              </p>
              <p><strong>Estado:</strong> 
                  <span class="status-badge ${combo.activo ? 'active' : 'inactive'}">
                      ${combo.activo ? 'Activo' : 'Inactivo'}
                  </span>
              </p>
              <p><strong>Veces utilizado:</strong> ${combo.vecesUtilizado || 0}</p>
          </div>
          
          <h4>Items del Combo:</h4>
          <table class="combo-items-table">
              <thead>
                  <tr>
                      <th>Categoría</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Costo Unitario</th>
                      <th>Precio Venta</th>
                      <th>Subtotal</th>
                  </tr>
              </thead>
              <tbody>
                  ${combo.items.map(item => `
                      <tr>
                          <td>${item.categoria || 'Sin categoría'}</td>
                          <td>${item.productoNombre || 'Sin nombre'}</td>
                          <td>${item.cantidad || 0}</td>
                          <td>$${formatNumber(item.costoUnitario)}</td>
                          <td>$${formatNumber(item.precioVentaUnitario)}</td>
                          <td>$${formatNumber((item.costoUnitario || 0) * (item.cantidad || 0))}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
          
          <div class="combo-summary">
              <p><strong>Costo Total:</strong> $${formatNumber(costoTotal)}</p>
              <p><strong>Precio Venta Individual:</strong> $${formatNumber(ventaTotal)}</p>
              <p><strong>Ahorro Cliente:</strong> 
                  $${formatNumber(ahorro)} (${formatNumber(porcentajeAhorro, 1)}%)
              </p>
          </div>
      </div>
  `;

  document.body.appendChild(modal);
  
  // Cerrar modal
  modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
      if (e.target === modal) {
          document.body.removeChild(modal);
      }
  });
}

function sanearCombo(combo) {
  return {
      id: combo.id || Date.now().toString(),
      nombre: combo.nombre || 'Combo sin nombre',
      precio: combo.precio !== undefined ? parseFloat(combo.precio) : 0,
      margen: combo.margen !== undefined ? parseFloat(combo.margen) : 30,
      fechaInicio: combo.fechaInicio || new Date().toISOString(),
      fechaFin: combo.fechaFin || null,
      items: (combo.items || []).map(item => ({
          categoria: item.categoria || 'sin-categoria',
          productoId: item.productoId || '',
          productoNombre: item.productoNombre || 'Producto sin nombre',
          costoUnitario: item.costoUnitario !== undefined ? parseFloat(item.costoUnitario) : 0,
          precioVentaUnitario: item.precioVentaUnitario !== undefined ? parseFloat(item.precioVentaUnitario) : 0,
          cantidad: item.cantidad !== undefined ? parseInt(item.cantidad) : 1
      })),
      fechaCreacion: combo.fechaCreacion || new Date().toISOString(),
      activo: combo.activo !== undefined ? combo.activo : true,
      vecesUtilizado: combo.vecesUtilizado !== undefined ? parseInt(combo.vecesUtilizado) : 0
  };
}

// Mostrar modal para crear/editar combos
function mostrarModalCombo(comboExistente = null) {
  const modal = document.getElementById('combo-modal');
  const comboNameInput = document.getElementById('combo-name');
  const comboPriceInput = document.getElementById('combo-price');
  const comboProfitMarginInput = document.getElementById('combo-profit-margin');
  const comboStartDateInput = document.getElementById('combo-start-date');
  const comboEndDateInput = document.getElementById('combo-end-date');
  const comboItemsContainer = document.getElementById('combo-items-container');
  const comboPreview = document.getElementById('combo-preview');
  const saveComboBtn = document.getElementById('save-combo');

  // Limpiar formulario
  comboNameInput.value = '';
  comboPriceInput.value = '0';
  comboProfitMarginInput.value = '30';
  comboStartDateInput.value = new Date().toISOString().split('T')[0];
  comboEndDateInput.value = '';
  comboItemsContainer.innerHTML = '';
  comboPreview.innerHTML = '<p>No hay items agregados al combo</p>';

  if (comboExistente) {
    // Cargar datos del combo existente
    comboNameInput.value = comboExistente.nombre;
    comboPriceInput.value = comboExistente.precio.toFixed(2);
    comboProfitMarginInput.value = comboExistente.margen || 30;
    
    // CORRECCIÓN: Manejo más robusto de fechas
    if (comboExistente.fechaInicio) {
      const fechaInicio = new Date(comboExistente.fechaInicio);
      comboStartDateInput.value = fechaInicio.toISOString().split('T')[0];
    }
    
    if (comboExistente.fechaFin) {
      const fechaFin = new Date(comboExistente.fechaFin);
      comboEndDateInput.value = fechaFin.toISOString().split('T')[0];
    }

    saveComboBtn.textContent = 'Actualizar Combo';
    saveComboBtn.dataset.id = comboExistente.id;

    // CORRECCIÓN: Cargar items de forma asíncrona y más robusta
    if (comboExistente.items && comboExistente.items.length > 0) {
      comboExistente.items.forEach((item, index) => {
        setTimeout(() => {
          agregarItemCombo(item);
        }, index * 100); // Retraso escalonado para cada item
      });

      // Actualizar precios después de cargar todos los items
      setTimeout(() => {
        calcularPrecioCombo();
        actualizarPreviewCombo();
      }, (comboExistente.items.length * 100) + 200);
    } else {
      // Si no hay items, agregar uno vacío
      agregarItemCombo();
    }
  } else {
    saveComboBtn.textContent = 'Guardar Combo';
    delete saveComboBtn.dataset.id;
    agregarItemCombo(); // Agregar un item vacío para nuevos combos
  }

  modal.style.display = 'flex';
  mostrarListaCombosModal(); // Actualizar la lista en el modal
}

// Agregar un item al combo
function agregarItemCombo(itemExistente = null) {
  const container = document.getElementById('combo-items-container');
  const itemId = Date.now() + Math.random(); // CORRECCIÓN: ID más único

  let html = `
    <div class="combo-item" data-id="${itemId}">
      <div class="combo-item-controls">
        <select class="combo-item-categoria" required>
          <option value="">Selecciona categoría</option>
          <option value="alitas" ${itemExistente?.categoria === 'alitas' ? 'selected' : ''}>Alitas</option>
          <option value="boneless" ${itemExistente?.categoria === 'boneless' ? 'selected' : ''}>Boneless</option>
          <option value="papas" ${itemExistente?.categoria === 'papas' ? 'selected' : ''}>Papas</option>
          <option value="bebidas" ${itemExistente?.categoria === 'bebidas' ? 'selected' : ''}>Bebidas</option>
          <option value="extras" ${itemExistente?.categoria === 'extras' ? 'selected' : ''}>Extras</option>
        </select>
        
        <select class="combo-item-producto" required>
          <option value="">Selecciona producto</option>
        </select>
        
        <div class="combo-item-cantidad">
          <input type="number" min="1" value="${itemExistente?.cantidad || 1}" required>
        </div>
        
        <button type="button" class="btn-remove-item">🗑️</button>
      </div>
      
      <div class="combo-item-precio">
        <span>Precio Costo: $<span class="item-precio-costo">0.00</span></span>
        <span>Precio Venta: $<span class="item-precio-venta">0.00</span></span>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  const nuevoItem = container.querySelector(`[data-id="${itemId}"]`);
  const categoriaSelect = nuevoItem.querySelector('.combo-item-categoria');
  const productoSelect = nuevoItem.querySelector('.combo-item-producto');
  const cantidadInput = nuevoItem.querySelector('input[type="number"]');

  // CORRECCIÓN: Cargar productos de forma más robusta
  if (itemExistente?.categoria) {
    // Primero cargar los productos
    cargarProductosCombo(itemExistente.categoria, productoSelect);
    
    // Luego seleccionar el producto específico con un pequeño retraso
    setTimeout(() => {
      if (itemExistente.productoId) {
        const option = productoSelect.querySelector(`option[value="${itemExistente.productoId}"]`);
        if (option) {
          option.selected = true;
        }
      }
      // Actualizar precios después de seleccionar
      actualizarPrecioItemCombo(nuevoItem);
    }, 50);
  }

  // Eventos para los selects
  categoriaSelect.addEventListener('change', function () {
    productoSelect.innerHTML = '<option value="">Selecciona producto</option>';
    if (this.value) {
      cargarProductosCombo(this.value, productoSelect);
    }
    actualizarPrecioItemCombo(nuevoItem);
  });

  productoSelect.addEventListener('change', function () {
    actualizarPrecioItemCombo(nuevoItem);
  });

  cantidadInput.addEventListener('change', function () {
    actualizarPrecioItemCombo(nuevoItem);
  });

  // CORRECCIÓN: Mejorar el evento de eliminar item
  nuevoItem.querySelector('.btn-remove-item').addEventListener('click', function () {
    if (container.children.length > 1) {
      container.removeChild(nuevoItem);
      calcularPrecioCombo();
      actualizarPreviewCombo();
    } else {
      mostrarNotificacion('Debe haber al menos un item en el combo', 'warning');
    }
  });
}

function cargarProductosCombo(categoria, selectElement, productoSeleccionado = null) {
  if (!categoria) {
    selectElement.innerHTML = '<option value="">Selecciona producto</option>';
    return;
  }
  
  // CORRECCIÓN: Verificar que window.productosDB existe
  if (!window.productosDB || !window.productosDB[categoria]) {
    console.warn(`No se encontraron productos para la categoría: ${categoria}`);
    selectElement.innerHTML = '<option value="">No hay productos disponibles</option>';
    return;
  }
  
  const productos = window.productosDB[categoria];
  selectElement.innerHTML = '<option value="">Selecciona producto</option>';
  
  productos.forEach(producto => {
    const option = document.createElement('option');
    option.value = producto.id;
    option.textContent = producto.nombre;
    
    // CORRECCIÓN: Verificar que PRECIOS_BASE[categoria] existe
    if (PRECIOS_BASE[categoria]) {
      option.dataset.costo = PRECIOS_BASE[categoria].costo;
      option.dataset.venta = PRECIOS_BASE[categoria].venta;
    } else {
      console.warn(`No se encontraron precios base para la categoría: ${categoria}`);
      option.dataset.costo = 0;
      option.dataset.venta = 0;
    }
    
    selectElement.appendChild(option);
  });
  
  // CORRECCIÓN: Seleccionar producto de forma más robusta
  if (productoSeleccionado) {
    setTimeout(() => {
      const option = selectElement.querySelector(`option[value="${productoSeleccionado}"]`);
      if (option) {
        option.selected = true;
      }
    }, 10);
  }
}

function actualizarPrecioItemCombo(itemElement) {
  const productoSelect = itemElement.querySelector('.combo-item-producto');
  const cantidadInput = itemElement.querySelector('input[type="number"]');
  const precioCostoSpan = itemElement.querySelector('.item-precio-costo');
  const precioVentaSpan = itemElement.querySelector('.item-precio-venta');
  
  // CORRECCIÓN: Validaciones más robustas
  if (!productoSelect || !cantidadInput || !precioCostoSpan || !precioVentaSpan) {
    console.warn('Elementos del item no encontrados');
    return;
  }
  
  if (productoSelect.value && cantidadInput.value && productoSelect.selectedOptions.length > 0) {
    const selectedOption = productoSelect.selectedOptions[0];
    const costoUnitario = parseFloat(selectedOption.dataset.costo) || 0;
    const ventaUnitario = parseFloat(selectedOption.dataset.venta) || 0;
    const cantidad = parseFloat(cantidadInput.value) || 0;
    
    precioCostoSpan.textContent = (costoUnitario * cantidad).toFixed(2);
    precioVentaSpan.textContent = (ventaUnitario * cantidad).toFixed(2);
  } else {
    precioCostoSpan.textContent = '0.00';
    precioVentaSpan.textContent = '0.00';
  }
  
  // CORRECCIÓN: Llamar funciones de forma más controlada
  setTimeout(() => {
    calcularPrecioCombo();
    actualizarPreviewCombo();
  }, 10);
}

function calcularPrecioCombo() {
  const items = document.querySelectorAll('.combo-item');
  let costoTotal = 0;
  let ventaTotal = 0;
  
  items.forEach(item => {
      const costoTexto = item.querySelector('.item-precio-costo').textContent;
      const ventaTexto = item.querySelector('.item-precio-venta').textContent;
      costoTotal += parseFloat(costoTexto) || 0;
      ventaTotal += parseFloat(ventaTexto) || 0;
  });
  
  const margen = parseFloat(document.getElementById('combo-profit-margin').value) || 30;
  const precioFinal = costoTotal * (1 + (margen / 100));
  
  document.getElementById('combo-price').value = precioFinal.toFixed(2);
  
  const ahorro = ventaTotal - precioFinal;
  const ahorroElement = document.getElementById('combo-savings');
  if (ahorroElement) {
      ahorroElement.textContent = `Ahorro: $${ahorro.toFixed(2)} (${((ahorro/ventaTotal)*100).toFixed(1)}%)`;
  }
  
  return precioFinal;
}

function actualizarPreviewCombo() {
  const preview = document.getElementById('combo-preview');
  const items = document.querySelectorAll('.combo-item');
  const costoTotal = calcularCostoTotal();
  const ventaTotal = calcularPrecioVentaTotal();
  const precioFinal = parseFloat(document.getElementById('combo-price').value) || 0;
  const margen = parseFloat(document.getElementById('combo-profit-margin').value) || 30;
  const ahorro = ventaTotal - precioFinal;
  
  if (items.length === 0) {
      preview.innerHTML = '<p>No hay items agregados al combo</p>';
      return;
  }
  
  let html = '<h4>Resumen del Combo:</h4><ul>';
  
  items.forEach(item => {
      const categoria = item.querySelector('.combo-item-categoria').value || 'Sin categoría';
      const productoSelect = item.querySelector('.combo-item-producto');
      const producto = productoSelect.value 
          ? productoSelect.selectedOptions[0].text 
          : 'Sin producto seleccionado';
      const cantidad = item.querySelector('input[type="number"]').value || 0;
      const costoItem = item.querySelector('.item-precio-costo').textContent;
      const ventaItem = item.querySelector('.item-precio-venta').textContent;
      
      html += `<li>${cantidad}x ${producto} (${categoria}) - Costo: $${costoItem} / Venta: $${ventaItem}</li>`;
  });
  
  html += `</ul>
      <div class="combo-summary">
          <p><strong>Costo Total:</strong> $${costoTotal.toFixed(2)}</p>
          <p><strong>Precio Venta Individual:</strong> $${ventaTotal.toFixed(2)}</p>
          <p><strong>Margen Ganancia:</strong> ${margen}%</p>
          <p><strong>Ahorro Cliente:</strong> $${ahorro.toFixed(2)} (${((ahorro/ventaTotal)*100).toFixed(1)}%)</p>
          <p class="combo-total"><strong>Precio Final:</strong> $${precioFinal.toFixed(2)}</p>
      </div>`;
  
  preview.innerHTML = html;
}

function calcularCostoTotal() {
  const items = document.querySelectorAll('.combo-item');
  let costoTotal = 0;
  
  items.forEach(item => {
      const costoTexto = item.querySelector('.item-precio-costo').textContent;
      costoTotal += parseFloat(costoTexto) || 0;
  });
  
  return costoTotal;
}

function calcularPrecioVentaTotal() {
  const items = document.querySelectorAll('.combo-item');
  let ventaTotal = 0;
  
  items.forEach(item => {
      const ventaTexto = item.querySelector('.item-precio-venta').textContent;
      ventaTotal += parseFloat(ventaTexto) || 0;
  });
  
  return ventaTotal;
}

function reiniciarCombo() {
  if (confirm('¿Estás seguro de reiniciar este combo? Se perderán todos los items agregados.')) {
      document.getElementById('combo-items-container').innerHTML = '';
      document.getElementById('combo-name').value = '';
      document.getElementById('combo-price').value = '0';
      document.getElementById('combo-profit-margin').value = '30';
      document.getElementById('combo-start-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('combo-end-date').value = '';
      actualizarPreviewCombo();
      agregarItemCombo();
  }
}

function guardarCombo() {
  const nombre = document.getElementById('combo-name').value.trim();
  const precio = parseFloat(document.getElementById('combo-price').value);
  const margen = parseFloat(document.getElementById('combo-profit-margin').value);
  const fechaInicio = document.getElementById('combo-start-date').value;
  let fechaFin = document.getElementById('combo-end-date').value;
  const items = [];
  const saveComboBtn = document.getElementById('save-combo');
  const comboId = saveComboBtn.dataset.id || Date.now().toString();
  
  // Validaciones existentes...
  if (!nombre) {
    mostrarNotificacion('Por favor ingresa un nombre para el combo', 'error');
    return;
  }
  
  if (isNaN(precio) || precio <= 0) {
    mostrarNotificacion('El precio del combo no es válido', 'error');
    return;
  }
  
  if (isNaN(margen) || margen < 0) {
    mostrarNotificacion('El margen de ganancia debe ser mayor o igual a 0%', 'error');
    return;
  }
  
  if (!fechaInicio) {
    mostrarNotificacion('Debes especificar una fecha de inicio', 'error');
    return;
  }
  
  const itemElements = document.querySelectorAll('.combo-item');
  if (itemElements.length === 0) {
    mostrarNotificacion('Debes agregar al menos un item al combo', 'error');
    return;
  }
  
  // CORRECCIÓN: Mejor validación de items
  let itemsValidos = 0;
  itemElements.forEach(item => {
    const categoria = item.querySelector('.combo-item-categoria').value;
    const productoSelect = item.querySelector('.combo-item-producto');
    const cantidadInput = item.querySelector('input[type="number"]');
    
    if (categoria && productoSelect.value && cantidadInput.value) {
      const selectedOption = productoSelect.selectedOptions[0];
      items.push({
        categoria,
        productoId: productoSelect.value,
        productoNombre: selectedOption.text,
        costoUnitario: parseFloat(selectedOption.dataset.costo) || 0,
        precioVentaUnitario: parseFloat(selectedOption.dataset.venta) || 0,
        cantidad: parseInt(cantidadInput.value) || 1
      });
      itemsValidos++;
    }
  });
  
  if (itemsValidos === 0) {
    mostrarNotificacion('Todos los items deben tener categoría y producto seleccionados', 'error');
    return;
  }
  
  if (fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
    mostrarNotificacion('La fecha de fin no puede ser anterior a la fecha de inicio', 'error');
    return;
  }
  
  const combo = {
    id: comboId,
    nombre,
    precio,
    margen,
    fechaInicio,
    fechaFin: fechaFin || null,
    items,
    fechaCreacion: new Date().toISOString(),
    activo: true,
    vecesUtilizado: 0
  };
  
  const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
  const existingIndex = combos.findIndex(c => String(c.id) === String(comboId));
  
  if (existingIndex >= 0) {
    // CORRECCIÓN: Mantener datos existentes al actualizar
    combo.fechaCreacion = combos[existingIndex].fechaCreacion;
    combo.vecesUtilizado = combos[existingIndex].vecesUtilizado;
    combos[existingIndex] = combo;
  } else {
    combos.push(combo);
  }
  
  localStorage.setItem('combosPromocionales', JSON.stringify(combos));
  document.getElementById('combo-modal').style.display = 'none';
  mostrarNotificacion(`Combo "${nombre}" ${existingIndex >= 0 ? 'actualizado' : 'guardado'} correctamente`, 'success');
  
  // Actualizar todas las vistas
  mostrarCombosEnProductos();
  if (typeof mostrarCombosEnAdmin === 'function') {
    mostrarCombosEnAdmin();
  }
  mostrarListaCombosModal();
}

function cargarCombosGuardados() {
  const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
  const ahora = new Date();
  
  const combosActualizados = combos.map(combo => {
      const inicio = new Date(combo.fechaInicio);
      const fin = combo.fechaFin ? new Date(combo.fechaFin) : null;
      
      if (ahora < inicio || (fin && ahora > fin)) {
          return {...combo, activo: false};
      }
      return combo;
  });
  
  if (JSON.stringify(combos) !== JSON.stringify(combosActualizados)) {
      localStorage.setItem('combosPromocionales', JSON.stringify(combosActualizados));
  }
  
  return combosActualizados;
}

function obtenerComboPorId(id) {
  const combos = cargarCombosGuardados();
  const combo = combos.find(combo => String(combo.id) === String(id));
  return combo ? sanearCombo(combo) : null;
}

function agregarComboAPedido(comboId) {
  const combo = obtenerComboPorId(comboId);
  
  if (!combo) {
      mostrarNotificacion('El combo seleccionado no existe', 'error');
      return;
  }
  
  if (!combo.activo) {
      mostrarNotificacion('Este combo no está disponible actualmente', 'error');
      return;
  }
  
  const itemExistente = window.pedidoActual.items.find(item => 
      item.comboId === combo.id && !item.modificado
  );
  
  if (itemExistente) {
      itemExistente.cantidad += 1;
  } else {
      window.pedidoActual.items.push({
          comboId: combo.id,
          nombre: combo.nombre,
          precio: combo.precio,
          cantidad: 1,
          esCombo: true,
          itemsCombo: combo.items,
          modificado: false
      });
  }
  
  incrementarUsoCombo(comboId);
  actualizarPedidoUI();
  mostrarNotificacion(`Combo "${combo.nombre}" agregado al pedido`, 'success');
}

function incrementarUsoCombo(comboId) {
  const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
  const comboIndex = combos.findIndex(c => c.id == comboId);
  
  if (comboIndex >= 0) {
      combos[comboIndex].vecesUtilizado = (combos[comboIndex].vecesUtilizado || 0) + 1;
      localStorage.setItem('combosPromocionales', JSON.stringify(combos));
  }
}

function mostrarCombosEnProductos() {
  const productosContainer = document.getElementById('productos-container');
  const combos = cargarCombosGuardados().filter(combo => combo.activo);
  
  productosContainer.innerHTML = '';
  
  if (combos.length === 0) {
      productosContainer.innerHTML = `
          <div class="empty-products">
              <p>No hay combos disponibles</p>
              <button id="btn-crear-combo-vacio" class="btn-crear-combo">+ Crear Combo</button>
          </div>
      `;
      
      document.getElementById('btn-crear-combo-vacio').addEventListener('click', () => {
          mostrarModalCombo();
      });
      return;
  }
  
  combos.forEach(combo => {
      const comboCard = document.createElement('div');
      comboCard.className = 'producto-card combo-card';
      comboCard.dataset.id = combo.id;
      
      const itemsSummary = combo.items.slice(0, 2).map(item => 
          `${item.cantidad}x ${item.productoNombre.split(' ')[0]}`
      ).join(' + ');
      
      const itemsExtra = combo.items.length > 2 ? ` + ${combo.items.length - 2} más` : '';
      const ahorro = calcularPrecioVentaTotalCombo(combo) - combo.precio;
      
      comboCard.innerHTML = `
          <div class="producto-img combo-img">🍱</div>
          <div class="producto-nombre combo-nombre">${combo.nombre}</div>
          <div class="producto-description">${itemsSummary}${itemsExtra}</div>
          <div class="producto-precio">$${combo.precio.toFixed(2)}</div>
          <div class="combo-savings">Ahorras $${ahorro.toFixed(2)}</div>
          <div class="combo-badge">COMBO</div>
          ${combo.fechaFin ? `<div class="combo-expiry">Hasta ${new Date(combo.fechaFin).toLocaleDateString()}</div>` : ''}
      `;
      
      comboCard.addEventListener('click', () => {
          agregarComboAPedido(combo.id);
      });
      
      productosContainer.appendChild(comboCard);
  });
}

function calcularPrecioVentaTotalCombo(combo) {
  return combo.items.reduce((total, item) => {
      return total + (item.precioVentaUnitario * item.cantidad);
  }, 0);
}

function mostrarCombosEnAdmin() {
  const adminContainer = document.getElementById('combos-admin-container');
  if (!adminContainer) return;
  
  const combos = cargarCombosGuardados();
  
  adminContainer.innerHTML = `
      <h2>Administración de Combos</h2>
      <div class="admin-combos-header">
          <button id="btn-nuevo-combo-admin" class="btn-primary">+ Nuevo Combo</button>
          <div class="search-box">
              <input type="text" id="search-combos" placeholder="Buscar combos...">
              <button id="btn-search-combos">🔍</button>
          </div>
      </div>
      <div class="admin-combos-list">
          <table>
              <thead>
                  <tr>
                      <th>Nombre</th>
                      <th>Costo</th>
                      <th>Precio Venta</th>
                      <th>Margen</th>
                      <th>Ahorro</th>
                      <th>Vigencia</th>
                      <th>Usos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                  </tr>
              </thead>
              <tbody id="combos-admin-list">
                  ${combos.map(combo => {
                      const costoTotal = combo.items.reduce((sum, item) => sum + (item.costoUnitario * item.cantidad), 0);
                      const ventaTotal = calcularPrecioVentaTotalCombo(combo);
                      const ahorro = ventaTotal - combo.precio;
                      return `
                          <tr data-id="${combo.id}">
                              <td>${combo.nombre}</td>
                              <td>$${costoTotal.toFixed(2)}</td>
                              <td>$${combo.precio.toFixed(2)}</td>
                              <td>${combo.margen}%</td>
                              <td>$${ahorro.toFixed(2)}</td>
                              <td>
                                  ${new Date(combo.fechaInicio).toLocaleDateString()} - 
                                  ${combo.fechaFin ? new Date(combo.fechaFin).toLocaleDateString() : 'Indefinido'}
                              </td>
                              <td>${combo.vecesUtilizado || 0}</td>
                              <td>
                                  <span class="status-badge ${combo.activo ? 'active' : 'inactive'}">
                                      ${combo.activo ? 'Activo' : 'Inactivo'}
                                  </span>
                              </td>
                              <td class="actions">
                                  <button class="btn-edit-combo" data-id="${combo.id}">✏️</button>
                                  <button class="btn-toggle-combo" data-id="${combo.id}">
                                      ${combo.activo ? '❌' : '✅'}
                                  </button>
                                  <button class="btn-delete-combo" data-id="${combo.id}">🗑️</button>
                              </td>
                          </tr>
                      `;
                  }).join('')}
              </tbody>
          </table>
      </div>
  `;
  
  document.getElementById('btn-nuevo-combo-admin').addEventListener('click', () => {
      mostrarModalCombo();
  });
  
  document.getElementById('btn-search-combos').addEventListener('click', buscarCombos);
  document.getElementById('search-combos').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') buscarCombos();
  });
  
  document.querySelectorAll('.btn-edit-combo').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          const combo = obtenerComboPorId(comboId);
          mostrarModalCombo(combo);
      });
  });
  
  document.querySelectorAll('.btn-toggle-combo').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          toggleEstadoCombo(comboId);
      });
  });
  
  document.querySelectorAll('.btn-delete-combo').forEach(btn => {
      btn.addEventListener('click', function() {
          const comboId = this.dataset.id;
          eliminarCombo(comboId);
      });
  });
}

function buscarCombos() {
  const termino = document.getElementById('search-combos').value.toLowerCase();
  const rows = document.querySelectorAll('#combos-admin-list tr');
  
  rows.forEach(row => {
      const nombre = row.cells[0].textContent.toLowerCase();
      row.style.display = nombre.includes(termino) ? '' : 'none';
  });
}

function toggleEstadoCombo(comboId) {
  const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
  const comboIndex = combos.findIndex(c => c.id == comboId);
  
  if (comboIndex >= 0) {
      combos[comboIndex].activo = !combos[comboIndex].activo;
      localStorage.setItem('combosPromocionales', JSON.stringify(combos));
      mostrarNotificacion(
          `Combo ${combos[comboIndex].activo ? 'activado' : 'desactivado'} correctamente`,
          'success'
      );
      mostrarCombosEnProductos();
      mostrarCombosEnAdmin();
      mostrarListaCombosModal(); // Actualizar la lista en el modal
  }
}

function eliminarCombo(comboId) {
  if (confirm('¿Estás seguro de eliminar este combo? Esta acción no se puede deshacer.')) {
      const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
      const nuevosCombos = combos.filter(c => c.id != comboId);
      localStorage.setItem('combosPromocionales', JSON.stringify(nuevosCombos));
      mostrarNotificacion('Combo eliminado correctamente', 'success');
      mostrarCombosEnProductos();
      mostrarCombosEnAdmin();
  }
}

function verificarCombosExpirados() {
  const combos = cargarCombosGuardados();
  const ahora = new Date();
  
  combos.forEach(combo => {
      if (combo.fechaFin && new Date(combo.fechaFin) < ahora && combo.activo) {
          if (confirm(`El combo "${combo.nombre}" ha expirado. ¿Deseas renovarlo?`)) {
              mostrarModalCombo(combo);
          } else {
              const combosActualizados = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
              const comboIndex = combosActualizados.findIndex(c => c.id === combo.id);
              if (comboIndex >= 0) {
                  combosActualizados[comboIndex].activo = false;
                  localStorage.setItem('combosPromocionales', JSON.stringify(combosActualizados));
              }
          }
      }
  });
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
}

verificarCombosExpirados();

window.ComboManager = {
  mostrarModalCombo,
  agregarComboAPedido,
  cargarCombosGuardados,
  mostrarCombosEnAdmin,
  mostrarListaCombosModal
};

