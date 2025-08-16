async function enviarPedidoWhatsApp() {
    try {
        let pedido;
        let esModificacion = false;

        // CORRECCIÓN: Mejorar la detección de modificación
        if (window.pedidoEnEdicion && 
            window.pedidoEnEdicion.datosEditados && 
            window.pedidoEnEdicion.codigoOriginal) {
            
            pedido = window.pedidoEnEdicion.datosEditados;
            esModificacion = true;
            
            console.log('🔄 Detectado pedido en modificación:', window.pedidoEnEdicion.codigoOriginal);
            
            // Guardar cambios antes de enviar
            guardarCambiosPedido();
            
        } else if (window.pedidoActual && window.pedidoActual.estado === 'modificado') {
            // NUEVA VERIFICACIÓN: Si el pedido actual tiene estado modificado
            pedido = window.pedidoActual;
            esModificacion = true;
            
            console.log('🔄 Detectado pedido modificado desde pedidoActual:', pedido.codigo);
            
        } else {
            // Es un pedido completamente nuevo
            pedido = window.pedidoActual;
            esModificacion = false;
            
            console.log('🆕 Detectado pedido nuevo:', pedido?.codigo);
        }

        // Validar que haya productos
        if (!pedido || pedido.items.length === 0) {
            mostrarNotificacion('No hay productos en el pedido', 'warning');
            return false;
        }

        // DEBUGGING: Mostrar en consola el tipo de pedido detectado
        console.log('📊 Tipo de pedido:', esModificacion ? 'MODIFICACIÓN' : 'NUEVO');
        console.log('📦 Datos del pedido:', pedido);

        // Confirmar antes de enviar
        const confirmacion = await mostrarConfirmacionEnvio(esModificacion);
        if (!confirmacion) return false;

        // Actualizar notas del pedido
        const notasInput = document.getElementById('pedido-notas-input');
        if (notasInput) {
            pedido.notas = notasInput.value;
        }

        // Construir mensaje
        const mensaje = construirMensajeWhatsApp(pedido, esModificacion);

        // Guardar el pedido antes de enviar
        guardarPedidoCompleto(pedido, esModificacion);

        // Enviar por WhatsApp
        const url = `whatsapp://send?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank') || 
            mostrarNotificacion('No se pudo abrir WhatsApp. Asegúrate de tener la aplicación instalada.', 'error', 3000);

        // CORRECCIÓN: No limpiar inmediatamente si es modificación
        if (!esModificacion) {
            // Solo limpiar si es pedido nuevo
            limpiarInterfazPedido();
            generarNuevoPedido();
            mostrarNotificacion('Pedido enviado. Nuevo pedido creado.', 'success');
        } else {
            // Para modificaciones, solo mostrar notificación y limpiar el estado de edición
            mostrarNotificacion('Modificación enviada correctamente', 'success');
            
            // Limpiar solo el estado de edición, no toda la interfaz
            window.pedidoEnEdicion = null;
            
            // Restaurar botones a estado normal
            const btnEnviar = document.getElementById('enviar-whatsapp');
            const btnCancelar = document.getElementById('cancelar-pedido');
            
            if (btnEnviar) btnEnviar.textContent = 'Enviar por WhatsApp';
            if (btnCancelar) btnCancelar.textContent = 'Cancelar Pedido';
        }

        return true;
    } catch (error) {
        console.error('❌ Error al enviar pedido:', error);
        mostrarNotificacion('Error al enviar el pedido. Asegúrate de tener WhatsApp instalado.', 'error', 3000);
        return false;
    }
}

// FUNCIÓN AUXILIAR MEJORADA: Detectar si hay un pedido en edición
function esPedidoEnModificacion() {
    // Verificar múltiples condiciones para detectar modificación
    return !!(
        // Condición 1: Hay un pedido explícitamente en edición
        (window.pedidoEnEdicion && 
         window.pedidoEnEdicion.datosEditados && 
         window.pedidoEnEdicion.codigoOriginal) ||
        
        // Condición 2: El pedido actual tiene estado modificado
        (window.pedidoActual && 
         window.pedidoActual.estado === 'modificado') ||
        
        // Condición 3: El pedido actual tiene historial de cambios
        (window.pedidoActual && 
         window.pedidoActual.historial && 
         window.pedidoActual.historial.length > 0) ||
         
        // Condición 4: El pedido actual tiene fecha de modificación
        (window.pedidoActual && 
         window.pedidoActual.fechaModificacion)
    );
}

// FUNCIÓN DE DEBUG: Agregar para verificar el estado
function debugEstadoPedido() {
    console.log('🔍 DEBUG - Estado actual del pedido:');
    console.log('- pedidoEnEdicion:', window.pedidoEnEdicion);
    console.log('- pedidoActual:', window.pedidoActual);
    console.log('- esPedidoEnModificacion():', esPedidoEnModificacion());
    
    if (window.pedidoActual) {
        console.log('- Estado del pedido actual:', window.pedidoActual.estado);
        console.log('- Historial del pedido:', window.pedidoActual.historial);
        console.log('- Fecha modificación:', window.pedidoActual.fechaModificacion);
    }
}

// Funciones auxiliares:

async function mostrarConfirmacionEnvio(esModificacion) {
    const mensaje = esModificacion
        ? '¿Enviar la modificación del pedido por WhatsApp?'
        : '¿Enviar el pedido por WhatsApp y crear uno nuevo?';

    return new Promise(resolve => {
        // Puedes usar un modal de confirmación más elegante si prefieres
        resolve(confirm(mensaje));
    });
}

// FUNCIÓN MEJORADA: Construir mensaje con mejor detección
function construirMensajeWhatsApp(pedido, esModificacion) {
    // CORRECCIÓN: Verificar nuevamente si es modificación
    const esRealmenteModificacion = esModificacion || esPedidoEnModificacion();
    
    const tipoPedido = esRealmenteModificacion ? 'Actualización de Pedido' : 'Nuevo Pedido';
    let mensaje = `🛍️ ${tipoPedido} - Entre Alas 🛍️\n\n`;

    mensaje += `#️⃣ Código: ${pedido.codigo}\n\n`;
    mensaje += `📦 Detalle:\n`;

    pedido.items.forEach(item => {
        if (item.esCombo) {
            const emoji = '🍱';
            const ahorroCombo = calcularAhorroCombo(item);

            mensaje += `${emoji} ${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toFixed(2)}\n`;
            mensaje += `   🏷️ Precio normal: $${(ahorroCombo.precioNormal * item.cantidad).toFixed(2)}\n`;
            mensaje += `   💰 Ahorro: $${ahorroCombo.ahorroTotal.toFixed(2)} (${ahorroCombo.porcentajeAhorro.toFixed(1)}%)\n`;
            mensaje += `   📝 Contiene:\n`;

            item.itemsCombo.forEach(comboItem => {
                const cantidadTotal = comboItem.cantidad * item.cantidad;
                mensaje += `      - ${cantidadTotal}x ${comboItem.productoNombre}\n`;
            });

            mensaje += `\n`;
        } else {
            const emoji = obtenerEmojiProducto(item.nombre);
            mensaje += `${emoji} ${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toFixed(2)}\n\n`;
        }
    });
    
    const resultadoDescuento = calcularTotalConDescuento();
    const descuentoMonto = resultadoDescuento.descuento;
    const contieneCombos = pedido.items.some(item => item.esCombo === true);
    const soloCombos = pedido.items.every(item => item.esCombo === true);

    if (pedido.descuento && descuentoMonto > 0) {
        let descuentoTexto = `🎫 Descuento (${pedido.descuento.codigo}): -$${descuentoMonto.toFixed(2)}`;
        if (contieneCombos && !soloCombos) {
            descuentoTexto += ' (aplicado a productos no combos)';
        }
        mensaje += `${descuentoTexto}\n`;
    } else if (pedido.descuento && soloCombos) {
        mensaje += `🎫 Descuento (${pedido.descuento.codigo}): No aplicable (solo combos)\n`;
    }

    const costoEnvio = pedido.costoEnvio || 0;
    mensaje += `🚚 Envío: ${costoEnvio > 0 ? `$${costoEnvio.toFixed(2)}` : 'Gratis'}\n`;
    mensaje += `💵 Total: $${pedido.total.toFixed(2)}\n\n`;

    mensaje += ` Métodos de pago:\n`;
    mensaje += `*Efectivo*💰, *Transferencia*🏦,*Tarjetas*💳\n\n`;

    // Añadir entrega programada si existe
    if (pedido.entregaProgramada) {
        mensaje += `📅 Entrega Programada: ${pedido.entregaProgramada.fecha} a las ${pedido.entregaProgramada.hora}\n\n`;
    }

    if (pedido.notas) {
        mensaje += `📝 Notas: ${pedido.notas}\n\n`;
    }

    // CORRECCIÓN: Mostrar cambios solo si realmente es modificación
    if (esRealmenteModificacion) {
        mensaje += `📝 Cambios realizados:\n`;

        const fechaBase = new Date(
            window.pedidoEnEdicion?.datosOriginales?.fechaModificacion ||
            window.pedidoEnEdicion?.datosOriginales?.fecha ||
            pedido.fechaCreacion ||
            new Date(0)
        );

        const cambiosRecientes = (pedido.historial || [])
            .filter(c => new Date(c.fecha) > fechaBase)
            .map(cambio => describirCambio(cambio));

        mensaje += cambiosRecientes.length > 0
            ? cambiosRecientes.join('\n') + '\n'
            : '- Se realizaron ajustes al pedido\n';
    }

    mensaje += `✅ ¡Gracias por tu pedido!`;

    return mensaje;
}

// Función auxiliar para calcular el ahorro de un combo
function calcularAhorroCombo(itemCombo) {
    if (!itemCombo.esCombo || !itemCombo.itemsCombo) {
        return {
            precioNormal: itemCombo.precio,
            ahorroTotal: 0,
            porcentajeAhorro: 0
        };
    }

    const precioNormal = itemCombo.itemsCombo.reduce((total, item) => {
        return total + (item.precioVentaUnitario * item.cantidad);
    }, 0);

    const ahorroTotal = (precioNormal - itemCombo.precio) * itemCombo.cantidad;
    const porcentajeAhorro = (ahorroTotal / (precioNormal * itemCombo.cantidad)) * 100;

    return {
        precioNormal,
        ahorroTotal,
        porcentajeAhorro
    };
}

// Función auxiliar para emojis según tipo de producto
function obtenerEmojiProducto(nombreProducto) {
    if (nombreProducto.toLowerCase().includes('alitas')) return '🍗';
    if (nombreProducto.toLowerCase().includes('boneless')) return '🍗';
    if (nombreProducto.toLowerCase().includes('papas')) return '🍟';
    if (nombreProducto.toLowerCase().includes('frappe')) return '🥤';
    if (nombreProducto.toLowerCase().includes('bebida')) return '🥤';
    if (nombreProducto.toLowerCase().includes('refresco')) return '🥤';
    if (nombreProducto.toLowerCase().includes('agua')) return '🚰';
    return '🍽️'; // Emoji por defecto
}

// FUNCIÓN CORREGIDA: Limpiar interfaz sin afectar el estado de edición prematuramente
function limpiarInterfazPedido() {
    // Limpiar visualmente el resumen del pedido
    const pedidoItemsContainer = document.getElementById('pedido-items');
    if (pedidoItemsContainer) {
        pedidoItemsContainer.innerHTML = '<div class="empty-state">No hay productos agregados</div>';
    }

    // Actualizar los totales a cero
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const envioMontoEl = document.getElementById('envio-monto');
    
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    if (totalEl) totalEl.textContent = '$0.00';
    if (envioMontoEl) envioMontoEl.textContent = '$0.00';

    // Resetear botones de envío
    document.querySelectorAll('.btn-envio').forEach(btn => btn.classList.remove('active'));
    const btnEnvioGratis = document.querySelector('.btn-envio[data-monto="0"]');
    if (btnEnvioGratis) btnEnvioGratis.classList.add('active');

    // Limpiar descuentos aplicados
    const descuentoAplicadoEl = document.getElementById('descuento-aplicado');
    const codigoDescuentoEl = document.getElementById('codigo-descuento');
    const notasInputEl = document.getElementById('pedido-notas-input');
    
    if (descuentoAplicadoEl) descuentoAplicadoEl.textContent = '';
    if (codigoDescuentoEl) codigoDescuentoEl.value = '';
    if (notasInputEl) notasInputEl.value = '';

    // CORRECCIÓN: Solo limpiar pedidoEnEdicion si no es una modificación activa
    // No limpiar aquí automáticamente - se hará en enviarPedidoWhatsApp
}

function guardarPedidoCompleto(pedido, esModificacion) {
    // Marcar el estado del pedido
    pedido.estado = esModificacion ? 'modificado' : 'en proceso';
    pedido.fechaEnvio = new Date().toISOString();

    // Guardar en el historial
    const todosPedidos = JSON.parse(localStorage.getItem('pedidos')) || [];

    const indiceExistente = todosPedidos.findIndex(p => p.codigo === pedido.codigo);

    if (indiceExistente !== -1) {
        todosPedidos[indiceExistente] = pedido;
    } else {
        todosPedidos.push(pedido);
    }

    localStorage.setItem('pedidos', JSON.stringify(todosPedidos));

    // Si no es modificación, limpiar el último pedido
    if (!esModificacion) {
        localStorage.removeItem('ultimoPedido');
    }
}

function describirCambio(cambio) {
    switch (cambio.tipo) {
        case 'item_agregado':
            return `- ✅ Añadido: ${cambio.itemNombre}${cambio.cantidad ? ` (${cambio.cantidad} unidades)` : ''}`;
        case 'item_eliminado':
            return `- ❌ Eliminado: ${cambio.itemNombre}`;
        case 'modificacion_item':
            return `- ✏️ Modificado: ${cambio.itemNombre} (${cambio.campo}: ${cambio.valorAnterior} → ${cambio.valorNuevo})`;
        case 'envio_modificado':
            return `- 🚚 Costo de envío: $${cambio.valorAnterior.toFixed(2)} → $${cambio.valorNuevo.toFixed(2)}`;
        case 'pedido_modificado':
            return `- 🛠️ Pedido modificado: ${cambio.cambios || 'actualización general'}`;
        default:
            return `- 🔄 Cambio realizado`;
    }
}

function detectarCambios(datosOriginales, datosEditados) {
    const historial = datosEditados.historial || [];

    // Comparar ítems
    datosEditados.items.forEach(item => {
        const itemOriginal = datosOriginales.items.find(i => i.nombre === item.nombre);
        if (!itemOriginal) {
            historial.push({
                tipo: 'item_agregado',
                fecha: new Date().toISOString(),
                itemNombre: item.nombre,
                cantidad: item.cantidad
            });
        } else if (itemOriginal.cantidad !== item.cantidad) {
            historial.push({
                tipo: 'modificacion_item',
                fecha: new Date().toISOString(),
                itemNombre: item.nombre,
                campo: 'cantidad',
                valorAnterior: itemOriginal.cantidad,
                valorNuevo: item.cantidad
            });
        }
    });

    // Detectar ítems eliminados
    datosOriginales.items.forEach(item => {
        if (!datosEditados.items.find(i => i.nombre === item.nombre)) {
            historial.push({
                tipo: 'item_eliminado',
                fecha: new Date().toISOString(),
                itemNombre: item.nombre
            });
        }
    });

    datosEditados.historial = historial;
}

function guardarCambiosPedido() {
    if (!window.pedidoEnEdicion) return;

    const { codigoOriginal, datosEditados } = window.pedidoEnEdicion;
    const pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
    const pedidoIndex = pedidos.findIndex(p => p.codigo === codigoOriginal);

    // Actualizar datos
    datosEditados.fechaModificacion = new Date().toISOString();
    datosEditados.estado = 'modificado';

    detectarCambios(window.pedidoEnEdicion.datosOriginales, datosEditados);

    // Registrar cambio global
    datosEditados.historial = datosEditados.historial || [];
    datosEditados.historial.push({
        tipo: 'pedido_modificado',
        fecha: new Date().toISOString(),
        cambios: 'Pedido actualizado por el administrador'
    });

    // Reemplazar en la lista
    pedidos[pedidoIndex] = datosEditados;

    // Guardar en localStorage
    localStorage.setItem('pedidos', JSON.stringify(pedidos));
    localStorage.setItem('ultimoPedido', JSON.stringify(datosEditados));

    // Actualizar UI
    mostrarNotificacion('Pedido actualizado correctamente', 'success');
    window.pedidoEnEdicion = null;

    // Restaurar botones
    document.getElementById('enviar-whatsapp').textContent = 'Enviar por WhatsApp';
    document.getElementById('cancelar-pedido').textContent = 'Cancelar Pedido';
}