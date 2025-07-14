// combo.js - Gestión de combos promocionales para ENTRE ALAS

// Precios base de productos
const PRECIOS_BASE = {
  alitas: 75,
  boneless: 70,
  papas: 35,
  bebidas: 0,
  extras: 0
};

// Inicializar combos
document.addEventListener('DOMContentLoaded', function() {
  cargarCombosGuardados();
  setupComboEventListeners();
  verificarCombosExpirados();
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
  document.getElementById('combo-profit').addEventListener('input', calcularPrecioCombo);
}

// Mostrar modal para crear/editar combos
function mostrarModalCombo(comboExistente = null) {
  const modal = document.getElementById('combo-modal');
  const comboNameInput = document.getElementById('combo-name');
  const comboPriceInput = document.getElementById('combo-price');
  const comboProfitInput = document.getElementById('combo-profit');
  const comboStartDate = document.getElementById('combo-start-date');
  const comboEndDate = document.getElementById('combo-end-date');
  const comboItemsContainer = document.getElementById('combo-items-container');
  const comboPreview = document.getElementById('combo-preview');
  const combosListContainer = document.getElementById('combos-list-container');

  // Limpiar formulario
  comboNameInput.value = '';
  comboPriceInput.value = '0';
  comboProfitInput.value = '15';
  comboStartDate.value = new Date().toISOString().split('T')[0];
  comboEndDate.value = '';
  comboItemsContainer.innerHTML = '';
  comboPreview.innerHTML = '<p>No hay items agregados al combo</p>';

  // Mostrar lista de combos existentes
  mostrarCombosEnModal(combosListContainer);

  if (comboExistente) {
    comboNameInput.value = comboExistente.nombre;
    comboPriceInput.value = comboExistente.precio;
    comboProfitInput.value = comboExistente.profitPercentage || '15';
    comboStartDate.value = comboExistente.fechaInicio || '';
    comboEndDate.value = comboExistente.fechaFin || '';
    
    comboExistente.items.forEach(item => {
      agregarItemCombo(item);
    });
    
    actualizarPreviewCombo();
  } else {
    agregarItemCombo();
  }

  modal.style.display = 'flex';
}

// Mostrar lista de combos en el modal
function mostrarCombosEnModal(container) {
  const combos = cargarCombosGuardados();
  container.innerHTML = '';

  if (combos.length === 0) {
    container.innerHTML = '<p>No hay combos creados</p>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'combos-list';
  combos.forEach(combo => {
    const li = document.createElement('li');
    li.className = `combo-list-item ${!combo.activo ? 'inactive' : ''}`;
    
    const itemsSummary = combo.items.map(item => 
      `${item.cantidad}x ${item.productoNombre.split(' ')[0]}`
    ).join(', ');
    
    const precioOriginal = combo.items.reduce((sum, item) => 
      sum + (item.precioUnitario * item.cantidad), 0);
    const ahorro = precioOriginal - combo.precio;

    li.innerHTML = `
      <span>${combo.nombre} ($${combo.precio.toFixed(2)})</span>
      <span>${itemsSummary.substring(0, 20)}${itemsSummary.length > 20 ? '...' : ''}</span>
      <span>Ahorro: $${ahorro.toFixed(2)}</span>
      <div class="combo-list-actions">
        <button class="btn-edit-combo" data-id="${combo.id}">✏️</button>
        <button class="btn-delete-combo" data-id="${combo.id}">🗑️</button>
      </div>
    `;

    li.querySelector('.btn-edit-combo').addEventListener('click', () => {
      const combo = obtenerComboPorId(parseInt(combo.id));
      mostrarModalCombo(combo);
    });

    li.querySelector('.btn-delete-combo').addEventListener('click', () => {
      if (confirm(`¿Estás seguro de eliminar el combo "${combo.nombre}"?`)) {
        eliminarCombo(combo.id);
        mostrarCombosEnModal(container);
      }
    });

    list.appendChild(li);
  });

  container.appendChild(list);
}

// Agregar nuevo item al combo
function agregarItemCombo(itemExistente = null) {
  const container = document.getElementById('combo-items-container');
  const itemId = Date.now();

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
        <span>Precio: $<span class="item-precio">0.00</span></span>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  const nuevoItem = container.querySelector(`[data-id="${itemId}"]`);
  const categoriaSelect = nuevoItem.querySelector('.combo-item-categoria');
  const productoSelect = nuevoItem.querySelector('.combo-item-producto');

  categoriaSelect.addEventListener('change', function() {
    cargarProductosCombo(this.value, productoSelect);
    actualizarPrecioItemCombo(nuevoItem);
  });

  if (itemExistente?.categoria) {
    cargarProductosCombo(itemExistente.categoria, productoSelect, itemExistente.productoId);
  }

  productoSelect.addEventListener('change', function() {
    actualizarPrecioItemCombo(nuevoItem);
  });

  nuevoItem.querySelector('input[type="number"]').addEventListener('change', function() {
    actualizarPrecioItemCombo(nuevoItem);
  });

  nuevoItem.querySelector('.btn-remove-item').addEventListener('click', function() {
    container.removeChild(nuevoItem);
    actualizarPreviewCombo();
    calcularPrecioCombo();
  });

  actualizarPrecioItemCombo(nuevoItem);
}

// Cargar productos según categoría
function cargarProductosCombo(categoria, selectElement, productoSeleccionado = null) {
  if (!categoria) {
    selectElement.innerHTML = '<option value="">Selecciona producto</option>';
    return;
  }

  const productos = window.productosDB[categoria] || [];
  selectElement.innerHTML = '<option value="">Selecciona producto</option>';

  productos.forEach(producto => {
    const option = document.createElement('option');
    option.value = producto.id;
    option.textContent = producto.nombre;
    option.dataset.precio = PRECIOS_BASE[categoria] || producto.precio;
    
    if (productoSeleccionado && producto.id === productoSeleccionado) {
      option.selected = true;
    }
    
    selectElement.appendChild(option);
  });
}

// Actualizar precio de un item del combo
function actualizarPrecioItemCombo(itemElement) {
  const productoSelect = itemElement.querySelector('.combo-item-producto');
  const cantidadInput = itemElement.querySelector('input[type="number"]');
  const precioSpan = itemElement.querySelector('.item-precio');

  if (productoSelect.value && cantidadInput.value) {
    const precioUnitario = parseFloat(productoSelect.selectedOptions[0].dataset.precio);
    const cantidad = parseFloat(cantidadInput.value);
    const precioTotal = precioUnitario * cantidad;
    
    precioSpan.textContent = precioTotal.toFixed(2);
  } else {
    precioSpan.textContent = '0.00';
  }

  calcularPrecioCombo();
  actualizarPreviewCombo();
}

// Calcular precio total del combo con porcentaje de ganancia
function calcularPrecioCombo() {
  const items = document.querySelectorAll('.combo-item');
  const profitPercentage = parseFloat(document.getElementById('combo-profit').value) || 15;
  let precioBase = 0;

  items.forEach(item => {
    const precioTexto = item.querySelector('.item-precio').textContent;
    precioBase += parseFloat(precioTexto) || 0;
  });

  const precioConGanancia = precioBase * (1 + profitPercentage / 100);
  const precioOriginal = calcularPrecioOriginalCombo();

  document.getElementById('combo-price').value = precioConGanancia.toFixed(2);
  actualizarAhorroCombo(precioOriginal, precioConGanancia);
  return precioConGanancia;
}

// Calcular precio original (sin descuento ni ganancia)
function calcularPrecioOriginalCombo() {
  const items = document.querySelectorAll('.combo-item');
  let precioOriginal = 0;

  items.forEach(item => {
    const productoSelect = item.querySelector('.combo-item-producto');
    const cantidadInput = item.querySelector('input[type="number"]');
    
    if (productoSelect.value && cantidadInput.value) {
      const precioUnitario = parseFloat(productoSelect.selectedOptions[0].dataset.precio);
      const cantidad = parseFloat(cantidadInput.value);
      precioOriginal += precioUnitario * cantidad;
    }
  });

  return precioOriginal;
}

// Actualizar información de ahorro
function actualizarAhorroCombo(precioOriginal, precioCombo) {
  const ahorro = precioOriginal - precioCombo;
  const ahorroElement = document.getElementById('combo-savings');
  
  if (ahorro > 0) {
    ahorroElement.innerHTML = `Ahorro: $${ahorro.toFixed(2)} (${((ahorro/precioOriginal)*100).toFixed(1)}%)`;
    ahorroElement.style.color = '#2ecc71';
  } else {
    ahorroElement.innerHTML = 'Sin ahorro';
    ahorroElement.style.color = '#e74c3c';
  }
}

// Actualizar vista previa del combo
function actualizarPreviewCombo() {
  const preview = document.getElementById('combo-preview');
  const items = document.querySelectorAll('.combo-item');

  if (items.length === 0) {
    preview.innerHTML = '<p>No hay items agregados al combo</p>';
    return;
  }

  let html = '<h4>Items del Combo:</h4><ul>';

  items.forEach(item => {
    const categoria = item.querySelector('.combo-item-categoria').value || 'Sin categoría';
    const productoSelect = item.querySelector('.combo-item-producto');
    const producto = productoSelect.value 
      ? productoSelect.selectedOptions[0].text 
      : 'Sin producto seleccionado';
    const cantidad = item.querySelector('input[type="number"]').value || 0;
    
    html += `<li>${cantidad}x ${producto} (${categoria})</li>`;
  });

  html += `</ul><p><strong>Precio del combo:</strong> $${document.getElementById('combo-price').value}</p>`;
  preview.innerHTML = html;
}

// Reiniciar formulario de combo
function reiniciarCombo() {
  if (confirm('¿Estás seguro de reiniciar este combo? Se perderán todos los items agregados.')) {
    document.getElementById('combo-items-container').innerHTML = '';
    document.getElementById('combo-name').value = '';
    document.getElementById('combo-price').value = '0';
    document.getElementById('combo-profit').value = '15';
    document.getElementById('combo-start-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('combo-end-date').value = '';
    actualizarPreviewCombo();
    agregarItemCombo();
  }
}

// Guardar combo en localStorage
function guardarCombo() {
  const nombre = document.getElementById('combo-name').value.trim();
  const precio = parseFloat(document.getElementById('combo-price').value);
  const profitPercentage = parseFloat(document.getElementById('combo-profit').value);
  const fechaInicio = document.getElementById('combo-start-date').value;
  const fechaFin = document.getElementById('combo-end-date').value;
  const items = [];

  if (!nombre) {
    mostrarNotificacion('Por favor ingresa un nombre para el combo', 'error');
    return;
  }

  if (isNaN(precio) || precio <= 0) {
    mostrarNotificacion('El precio del combo no es válido', 'error');
    return;
  }

  if (!fechaInicio) {
    mostrarNotificacion('Por favor selecciona una fecha de inicio', 'error');
    return;
  }

  const itemElements = document.querySelectorAll('.combo-item');
  if (itemElements.length === 0) {
    mostrarNotificacion('Debes agregar al menos un item al combo', 'error');
    return;
  }

  itemElements.forEach(item => {
    const categoria = item.querySelector('.combo-item-categoria').value;
    const productoSelect = item.querySelector('.combo-item-producto');
    
    if (categoria && productoSelect.value) {
      items.push({
        categoria,
        productoId: productoSelect.value,
        productoNombre: productoSelect.selectedOptions[0].text,
        precioUnitario: parseFloat(productoSelect.selectedOptions[0].dataset.precio),
        cantidad: parseInt(item.querySelector('input[type="number"]').value)
      });
    }
  });

  if (items.length === 0) {
    mostrarNotificacion('Todos los items deben tener categoría y producto seleccionados', 'error');
    return;
  }

  const nuevoCombo = {
    id: Date.now(),
    nombre,
    precio,
    profitPercentage,
    fechaInicio,
    fechaFin,
    items,
    fechaCreacion: new Date().toISOString(),
    activo: true
  };

  const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
  combos.push(nuevoCombo);
  localStorage.setItem('combosPromocionales', JSON.stringify(combos));

  document.getElementById('combo-modal').style.display = 'none';
  mostrarNotificacion(`Combo "${nombre}" guardado correctamente`, 'success');
  cargarCombosGuardados();
  mostrarCombosDisponibles();
}

// Cargar combos guardados
function cargarCombosGuardados() {
  const combos = JSON.parse(localStorage.getItem('combosPromocionales') || '[]');
  return combos;
}

// Obtener combo por ID
function obtenerComboPorId(id) {
  const combos = cargarCombosGuardados();
  return combos.find(combo => combo.id === id);
}

// Verificar combos expirados
function verificarCombosExpirados() {
  const combos = cargarCombosGuardados();
  const now = new Date();
  
  combos.forEach(combo => {
    if (combo.fechaFin && new Date(combo.fechaFin) < now && combo.activo) {
      combo.activo = false;
      if (confirm(`El combo "${combo.nombre}" ha expirado. ¿Deseas renovarlo o eliminarlo?`, 'Renovar', 'Eliminar')) {
        mostrarModalCombo(combo);
      } else {
        eliminarCombo(combo.id);
      }
    }
  });

  localStorage.setItem('combosPromocionales', JSON.stringify(combos));
  mostrarCombosDisponibles();
}

// Eliminar combo
function eliminarCombo(comboId) {
  let combos = cargarCombosGuardados();
  combos = combos.filter(combo => combo.id !== comboId);
  localStorage.setItem('combosPromocionales', JSON.stringify(combos));
  mostrarNotificacion('Combo eliminado correctamente', 'success');
  mostrarCombosDisponibles();
}

// Bloquear/desbloquear combo
function toggleComboActivo(comboId) {
  const combos = cargarCombosGuardados();
  const combo = combos.find(combo => combo.id === comboId);
  if (combo) {
    combo.activo = !combo.activo;
    localStorage.setItem('combosPromocionales', JSON.stringify(combos));
    mostrarNotificacion(`Combo "${combo.nombre}" ${combo.activo ? 'activado' : 'desactivado'}`, 'success');
    mostrarCombosDisponibles();
  }
}

// Mostrar lista de combos disponibles
function mostrarCombosDisponibles() {
  const combosContainer = document.getElementById('combos-container');
  const combos = cargarCombosGuardados();
  
  combosContainer.innerHTML = '';

  if (combos.length === 0) {
    combosContainer.innerHTML = '<p class="empty-combos">No hay combos creados</p>';
    return;
  }

  combos.forEach(combo => {
    const comboCard = document.createElement('div');
    comboCard.className = `combo-card ${!combo.activo ? 'inactive' : ''}`;
    comboCard.dataset.id = combo.id;

    const itemsSummary = combo.items.map(item => 
      `${item.cantidad}x ${item.productoNombre.substring(0, 15)}`
    ).join(', ');

    const precioOriginal = combo.items.reduce((sum, item) => 
      sum + (item.precioUnitario * item.cantidad), 0);
    const ahorro = precioOriginal - combo.precio;

    comboCard.innerHTML = `
      <h4>${combo.nombre.substring(0, 20)}${combo.nombre.length > 20 ? '...' : ''}</h4>
      <div class="combo-price">$${combo.precio.toFixed(2)}</div>
      <div class="combo-items">${itemsSummary.substring(0, 30)}${itemsSummary.length > 30 ? '...' : ''}</div>
      <div class="combo-savings">Ahorro: $${ahorro.toFixed(2)}</div>
      <div class="combo-dates">
        <span>Inicio: ${combo.fechaInicio}</span>
        <span>Fin: ${combo.fechaFin || 'Sin fin'}</span>
      </div>
      <div class="combo-actions">
        <button class="btn-edit-combo">✏️ Editar</button>
        <button class="btn-toggle-combo">${combo.activo ? '🔒 Bloquear' : '🔓 Desbloquear'}</button>
        <button class="btn-delete-combo">🗑️ Eliminar</button>
      </div>
    `;

    comboCard.querySelector('.btn-edit-combo').addEventListener('click', () => {
      mostrarModalCombo(combo);
    });

    comboCard.querySelector('.btn-toggle-combo').addEventListener('click', () => {
      toggleComboActivo(combo.id);
    });

    comboCard.querySelector('.btn-delete-combo').addEventListener('click', () => {
      if (confirm(`¿Estás seguro de eliminar el combo "${combo.nombre}"?`)) {
        eliminarCombo(combo.id);
      }
    });

    comboCard.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-edit-combo') && 
          !e.target.classList.contains('btn-toggle-combo') && 
          !e.target.classList.contains('btn-delete-combo') &&
          combo.activo) {
        agregarComboAPedido(combo.id);
      }
    });

    combosContainer.appendChild(comboCard);
  });
}

// Agregar combo al pedido
function agregarComboAPedido(comboId) {
  const combo = obtenerComboPorId(comboId);
  
  if (!combo) {
    mostrarNotificacion('El combo seleccionado no existe', 'error');
    return;
  }

  if (!combo.activo) {
    mostrarNotificacion('Este combo está desactivado', 'error');
    return;
  }

  const itemExistente = window.pedidoActual.items.find(item => 
    item.comboId === comboId && !item.modificado
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

  actualizarPedidoUI();
  mostrarNotificacion(`Combo "${combo.nombre}" agregado al pedido`, 'success');
}

// Mostrar combos en la vista de productos
function mostrarCombosEnProductos() {
  const productosContainer = document.getElementById('productos-container');
  const combos = cargarCombosGuardados();
  
  productosContainer.innerHTML = '';
  
  if (combos.length === 0) {
    productosContainer.innerHTML = `
      <div class="empty-products">
        <p>No hay combos creados</p>
        <button id="btn-crear-combo-vacio" class="btn-crear-combo">+ Crear Combo</button>
      </div>
    `;
    
    document.getElementById('btn-crear-combo-vacio').addEventListener('click', () => {
      mostrarModalCombo();
    });
    return;
  }

  combos.forEach(combo => {
    if (!combo.activo) return;

    const comboCard = document.createElement('div');
    comboCard.className = 'producto-card combo-card';
    comboCard.dataset.id = combo.id;

    const itemsSummary = combo.items.slice(0, 2).map(item => 
      `${item.cantidad}x ${item.productoNombre.split(' ')[0]}`
    ).join(' + ');
    
    const itemsExtra = combo.items.length > 2 ? ` + ${combo.items.length - 2} más` : '';
    const precioOriginal = combo.items.reduce((sum, item) => 
      sum + (item.precioUnitario * item.cantidad), 0);
    const ahorro = precioOriginal - combo.precio;

    comboCard.innerHTML = `
      <div class="producto-img combo-img">🍱</div>
      <div class="producto-nombre combo-nombre">${combo.nombre}</div>
      <div class="producto-description">${itemsSummary}${itemsExtra}</div>
      <div class="producto-precio">$${combo.precio.toFixed(2)}</div>
      <div class="combo-savings">Ahorro: $${ahorro.toFixed(2)}</div>
      <div class="combo-badge">COMBO</div>
    `;

    comboCard.addEventListener('click', () => {
      agregarComboAPedido(combo.id);
    });
    
    productosContainer.appendChild(comboCard);
  });
}

// Función para mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
  // Implementación de notificación...
}

// Exportar funciones necesarias
window.ComboManager = {
  mostrarModalCombo,
  agregarComboAPedido,
  cargarCombosGuardados,
  mostrarCombosDisponibles,
  mostrarCombosEnProductos
};