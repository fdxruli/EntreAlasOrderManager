// Constantes
const STORAGE_KEYS = {
    PEDIDOS: 'pedidos',
    DESCUENTOS: 'descuentos',
    ULTIMO_PEDIDO: 'ultimoPedido',
    ADMIN_PIN: 'adminPIN',
    PIN_CONFIGURADO: 'pinConfigurado'
};

const DEFAULT_PIN = '1234';

// Utilidades para localStorage
const StorageUtils = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error al leer ${key}:`, error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error al guardar ${key}:`, error);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error al eliminar ${key}:`, error);
            return false;
        }
    }
};

// Función centralizada para actualizar pedidos en el historial
function actualizarPedidoEnHistorial(pedido) {
    if (!pedido || !pedido.codigo) {
        console.error('Pedido inválido');
        return false;
    }
    
    const todosPedidos = StorageUtils.get(STORAGE_KEYS.PEDIDOS, []);
    const indiceExistente = todosPedidos.findIndex(p => p.codigo === pedido.codigo);
    
    if (indiceExistente !== -1) {
        todosPedidos[indiceExistente] = pedido;
    } else {
        todosPedidos.push(pedido);
    }
    
    return StorageUtils.set(STORAGE_KEYS.PEDIDOS, todosPedidos);
}

// Guardar pedido actual
function guardarPedidoActual() {
    if (!window.pedidoActual) {
        console.warn('No hay pedido actual para guardar');
        return;
    }
    
    // Guardar como último pedido
    StorageUtils.set(STORAGE_KEYS.ULTIMO_PEDIDO, window.pedidoActual);
    
    // Si es un pedido enviado, guardar en historial
    if (window.pedidoActual.items && window.pedidoActual.items.length > 0) {
        actualizarPedidoEnHistorial(window.pedidoActual);
    }
}

// Buscar pedido por código
function buscarPedidoPorCodigo(codigo) {
    if (!codigo) {
        console.warn('Código de pedido requerido');
        return null;
    }
    
    const pedidos = StorageUtils.get(STORAGE_KEYS.PEDIDOS, []);
    return pedidos.find(p => p.codigo === codigo) || null;
}

// Exportar todos los datos
function exportarDatos() {
    try {
        const datos = {
            pedidos: StorageUtils.get(STORAGE_KEYS.PEDIDOS, []),
            descuentos: StorageUtils.get(STORAGE_KEYS.DESCUENTOS, {}),
            configuracion: {
                pin: localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || DEFAULT_PIN
            },
            ultimoPedido: StorageUtils.get(STORAGE_KEYS.ULTIMO_PEDIDO, null),
            fechaExportacion: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-pedidos-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Limpiar URL para liberar memoria
        URL.revokeObjectURL(url);
        
        mostrarNotificacion('Datos exportados correctamente', 'success');
    } catch (error) {
        console.error('Error al exportar datos:', error);
        mostrarNotificacion('Error al exportar datos', 'error');
    }
}

// Importar datos desde archivo
function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) {
        console.warn('No se seleccionó archivo');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);
            
            // Validar estructura básica
            if (typeof datos !== 'object') {
                throw new Error('Formato de archivo inválido');
            }
            
            // Importar datos si existen
            if (datos.pedidos && Array.isArray(datos.pedidos)) {
                StorageUtils.set(STORAGE_KEYS.PEDIDOS, datos.pedidos);
            }
            
            if (datos.descuentos && typeof datos.descuentos === 'object') {
                StorageUtils.set(STORAGE_KEYS.DESCUENTOS, datos.descuentos);
            }
            
            if (datos.configuracion?.pin) {
                localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, datos.configuracion.pin);
                localStorage.setItem(STORAGE_KEYS.PIN_CONFIGURADO, 'true');
            }
            
            if (datos.ultimoPedido) {
                StorageUtils.set(STORAGE_KEYS.ULTIMO_PEDIDO, datos.ultimoPedido);
            }
            
            mostrarNotificacion('Datos importados correctamente. La página se recargará.', 'success');
            setTimeout(() => location.reload(), 1500);
            
        } catch (error) {
            console.error('Error al importar:', error);
            mostrarNotificacion('Error al importar: Archivo inválido', 'error');
        }
    };
    
    reader.onerror = function() {
        mostrarNotificacion('Error al leer el archivo', 'error');
    };
    
    reader.readAsText(file);
}

// Guardar pedido en historial (refactorizada)
function guardarPedidoEnHistorial() {
    if (!window.pedidoActual) {
        console.error('No hay pedido actual para guardar');
        return false;
    }
    
    // Marcar el pedido como completado
    window.pedidoActual.estado = 'completado';
    window.pedidoActual.fechaEnvio = new Date().toISOString();
    
    // Guardar en el historial
    const resultado = actualizarPedidoEnHistorial(window.pedidoActual);
    
    if (resultado) {
        // Eliminar el último pedido no enviado
        StorageUtils.remove(STORAGE_KEYS.ULTIMO_PEDIDO);
    }
    
    return resultado;
}

// Guardar pedido completo (refactorizada)
function guardarPedidoCompleto(pedido, esModificacion = false) {
    if (!pedido || !pedido.codigo) {
        console.error('Pedido inválido');
        return false;
    }
    
    // Marcar el estado del pedido
    pedido.estado = esModificacion ? 'modificado' : 'completado';
    pedido.fechaEnvio = new Date().toISOString();
    
    // Guardar en el historial
    const resultado = actualizarPedidoEnHistorial(pedido);
    
    if (resultado) {
        // Limpiar siempre el último pedido no enviado
        StorageUtils.remove(STORAGE_KEYS.ULTIMO_PEDIDO);
    }
    
    return resultado;
}

// Función adicional para obtener estadísticas
function obtenerEstadisticasPedidos() {
    const pedidos = StorageUtils.get(STORAGE_KEYS.PEDIDOS, []);
    
    return {
        total: pedidos.length,
        completados: pedidos.filter(p => p.estado === 'completado').length,
        modificados: pedidos.filter(p => p.estado === 'modificado').length,
        ultimoMes: pedidos.filter(p => {
            const fecha = new Date(p.fechaEnvio);
            const haceUnMes = new Date();
            haceUnMes.setMonth(haceUnMes.getMonth() - 1);
            return fecha >= haceUnMes;
        }).length
    };
}