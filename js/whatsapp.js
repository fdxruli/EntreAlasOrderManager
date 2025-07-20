async function enviarPedidoWhatsApp() {
    try {
        let pedido;
        let esModificacion = false;

        // Determinar si es edición o nuevo pedido
        if (window.pedidoEnEdicion?.datosEditados && window.pedidoEnEdicion?.codigoOriginal) {
            pedido = window.pedidoEnEdicion.datosEditados;
            esModificacion = true;
            guardarCambiosPedido();
        } else {
            pedido = window.pedidoActual;
            esModificacion = false;
        }

        // Validar que haya productos
        if (pedido.items.length === 0) {
            mostrarNotificacion('No hay productos en el pedido', 'warning');
            return false;
        }

        // Confirmar antes de enviar
        const confirmacion = await mostrarConfirmacionEnvio(esModificacion);
        if (!confirmacion) return false;

        // Actualizar notas del pedido
        pedido.notas = document.getElementById('pedido-notas-input').value;

        // Construir mensaje
        const mensaje = construirMensajeWhatsApp(pedido, esModificacion);

        // Guardar el pedido antes de enviar
        guardarPedidoCompleto(pedido, esModificacion);

        // Enviar por WhatsApp usando el esquema whatsapp:// para modo offline
        const url = `whatsapp://send?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank') || 
            mostrarNotificacion('No se pudo abrir WhatsApp. Asegúrate de tener la aplicación instalada.', 'error', 3000);

        // Limpiar la interfaz
        limpiarInterfazPedido();

        // Crear nuevo pedido si no es modificación
        if (!esModificacion) {
            generarNuevoPedido();
            mostrarNotificacion('Pedido enviado. Nuevo pedido creado.', 'success');
        } else {
            mostrarNotificacion('Modificación enviada correctamente', 'success');
        }

        return true;
    } catch (error) {
        console.error('Error al enviar pedido:', error);
        mostrarNotificacion('Error al enviar el pedido. Asegúrate de tener WhatsApp instalado.', 'error', 3000);
        return false;
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

function construirMensajeWhatsApp(pedido, esModificacion) {
    const tipoPedido = esModificacion === true ? 'Actualización de Pedido' : 'Nuevo Pedido';
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
            mensaje += `${emoji} ${item.cantidad}x ${item.nombre} - $${(item.precio * item.cantidad).toFixed(2)}\n`;
        }
    });

    mensaje += `\n💵 Subtotal: $${pedido.subtotal.toFixed(2)}\n`;

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
    mensaje += `*Efectivo 💰, *Transferencia🏦,*Tarjetas💳\n\n`;

    if (pedido.notas) {
        mensaje += `📝 Notas: ${pedido.notas}\n`;
    }

    if (esModificacion) {
        mensaje += `📝 Cambios realizados:\n`;

        const fechaBase = new Date(
            pedidoEnEdicion?.datosOriginales?.fechaModificacion ||
            pedidoEnEdicion?.datosOriginales?.fecha ||
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

function limpiarInterfazPedido() {
    // Limpiar visualmente el resumen del pedido
    const pedidoItemsContainer = document.getElementById('pedido-items');
    pedidoItemsContainer.innerHTML = '<div class="empty-state">No hay productos agregados</div>';

    // Actualizar los totales a cero
    document.getElementById('subtotal').textContent = '$0.00';
    document.getElementById('total').textContent = '$0.00';

    // Limpiar el costo de envío
    document.getElementById('envio-monto').textContent = '$0.00';

    // Resetear botones de envío
    document.querySelectorAll('.btn-envio').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.btn-envio[data-monto="0"]').classList.add('active');

    // Limpiar descuentos aplicados
    document.getElementById('descuento-aplicado').textContent = '';
    document.getElementById('codigo-descuento').value = '';

    // Limpiar notas
    document.getElementById('pedido-notas-input').value = '';

    // Si hay un pedido en edición, limpiarlo también
    if (window.pedidoEnEdicion) {
        window.pedidoEnEdicion = null;
    }
}

function guardarPedidoCompleto(pedido, esModificacion) {
    // Marcar el estado del pedido
    pedido.estado = esModificacion ? 'modificado' : 'completado';
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