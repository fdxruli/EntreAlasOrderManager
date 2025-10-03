// --- INICIO SCRIPT DE MIGRACIÓN DE DATOS ---
// Este script se ejecuta una sola vez para actualizar pedidos antiguos.
(function() {
    const MIGRATION_KEY = 'dataMigration_v1_estadoCompletado';
    if (localStorage.getItem(MIGRATION_KEY)) {
        // La migración ya se ha ejecutado, no hacer nada.
        return;
    }

    try {
        console.log('Iniciando migración de datos de pedidos históricos...');
        let pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
        let pedidosModificados = 0;

        pedidos.forEach(pedido => {
            // Solo migrar pedidos que estaban guardados como 'en proceso'.
            if (pedido.estado === 'en proceso') {
                pedido.estado = 'completado';
                // Asignar una fecha de completado coherente.
                pedido.fechaCompletado = pedido.fechaEnvio || pedido.fecha || new Date().toISOString();
                pedidosModificados++;
            }
        });

        if (pedidosModificados > 0) {
            localStorage.setItem('pedidos', JSON.stringify(pedidos));
            console.log(`Migración completada: ${pedidosModificados} pedidos fueron actualizados a 'completado'.`);
        } else {
            console.log('No se encontraron pedidos que necesitaran migración.');
        }

        // Marcar la migración como completada para que no se vuelva a ejecutar.
        localStorage.setItem(MIGRATION_KEY, 'true');

    } catch (error) {
        console.error('Error durante la migración de datos de pedidos:', error);
    }
})();
// --- FIN SCRIPT DE MIGRACIÓN DE DATOS ---


document.addEventListener('DOMContentLoaded', () => {
    const categoriasBtn = document.querySelectorAll('.categoria-btn');
    const productosContainer = document.getElementById('productos-container');
    const categoriaActualTitulo = document.getElementById('categoria-actual');
    const pedidoItemsContainer = document.getElementById('pedido-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const enviarWhatsAppBtn = document.getElementById('enviar-whatsapp');
    const vistaPreviaBtn = document.getElementById('vista-previa-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const confirmarEnvioBtn = document.getElementById('confirmar-envio');
    const editarPedidoBtn = document.getElementById('editar-pedido');
    const pedidoEspecialBtn = document.querySelector('.categoria-btn[data-categoria="especial"]');
    const reiniciarPedidoBtn = document.getElementById('reiniciar-pedido');
    const btnNuevoPedido = document.getElementById('btn-nuevo-pedido');
    const btnsEnvio = document.querySelectorAll('.btn-envio');
    const envioMontoEl = document.getElementById('envio-monto');
    const btnAplicarDescuento = document.getElementById('btn-aplicar-descuento');
    const codigoDescuentoInput = document.getElementById('codigo-descuento');
    const entregaProgramadaCheckbox = document.getElementById('entrega-programada-checkbox');
    const entregaProgramadaCampos = document.getElementById('entrega-programada-campos');
    const fechaEntregaInput = document.getElementById('fecha-entrega');
    const horaEntregaInput = document.getElementById('hora-entrega');


    let pedidoActual = {
        items: [],
        subtotal: 0,
        descuento: null,
        costoEnvio: 0,
        total: 0,
        notas: '',
        entregaProgramada: {
            activo: false,
            fecha: null,
            hora: null
        },
        codigo: ''
    };

    // Cargar productos desde el archivo JSON simulado
    let productos = {};

    fetch('js/productos.json')
        .then(response => response.json())
        .then(data => {
            productos = data;
            cargarProductos('alitas'); // Cargar categoría inicial
            cargarUltimoPedido();
        })
        .catch(error => console.error('Error al cargar productos:', error));


    function cargarProductos(categoria) {
        productosContainer.innerHTML = '';
        categoriaActualTitulo.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);

        if (productos[categoria]) {
            productos[categoria].forEach(producto => {
                const productoEl = document.createElement('div');
                productoEl.className = 'producto';
                productoEl.innerHTML = `
                    <div class="producto-info">
                        <span>${producto.nombre}</span>
                        <span>$${producto.precio.toFixed(2)}</span>
                    </div>
                    <button class="btn-agregar" data-nombre="${producto.nombre}" data-precio="${producto.precio}">+</button>
                `;
                productosContainer.appendChild(productoEl);
            });
        }
    }

    function actualizarPedidoUI() {
        pedidoItemsContainer.innerHTML = '';

        if (pedidoActual.items.length === 0) {
            pedidoItemsContainer.innerHTML = '<div class="empty-state">No hay productos agregados</div>';
        } else {
            pedidoActual.items.forEach((item, index) => {
                const itemEl = document.createElement('div');
                itemEl.className = 'pedido-item';
                itemEl.innerHTML = `
                    <div class="item-info">
                        <span class="item-nombre">${item.nombre}</span>
                        <div class="item-cantidad">
                            <button class="btn-restar" data-index="${index}">-</button>
                            <span>${item.cantidad}</span>
                            <button class="btn-sumar" data-index="${index}">+</button>
                        </div>
                    </div>
                    <span class="item-total">$${(item.cantidad * item.precio).toFixed(2)}</span>
                `;
                pedidoItemsContainer.appendChild(itemEl);
            });
        }

        actualizarTotales();
    }

    function actualizarTotales() {
        pedidoActual.subtotal = pedidoActual.items.reduce((acc, item) => acc + (item.cantidad * item.precio), 0);

        let descuentoAplicado = 0;
        if (pedidoActual.descuento) {
            const { valor, tipo } = pedidoActual.descuento;
            if (tipo === 'porcentaje') {
                descuentoAplicado = pedidoActual.subtotal * (valor / 100);
            } else {
                descuentoAplicado = valor;
            }
        }

        pedidoActual.total = pedidoActual.subtotal - descuentoAplicado + pedidoActual.costoEnvio;

        subtotalEl.textContent = `$${pedidoActual.subtotal.toFixed(2)}`;
        totalEl.textContent = `$${pedidoActual.total.toFixed(2)}`;
        envioMontoEl.textContent = `$${pedidoActual.costoEnvio.toFixed(2)}`;
    }

    function agregarProducto(nombre, precio) {
        const itemExistente = pedidoActual.items.find(item => item.nombre === nombre);
        if (itemExistente) {
            itemExistente.cantidad++;
        } else {
            pedidoActual.items.push({ nombre, precio, cantidad: 1 });
        }
        actualizarPedidoUI();
    }

    function restarProducto(index) {
        if (pedidoActual.items[index].cantidad > 1) {
            pedidoActual.items[index].cantidad--;
        } else {
            pedidoActual.items.splice(index, 1);
        }
        actualizarPedidoUI();
    }

    function sumarProducto(index) {
        pedidoActual.items[index].cantidad++;
        actualizarPedidoUI();
    }

    function generarCodigoPedido() {
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().slice(-2);

        let contador = parseInt(localStorage.getItem(`contador_${month}${year}`) || '0') + 1;
        localStorage.setItem(`contador_${month}${year}`, contador);

        const codigoNumerico = contador.toString().padStart(2, '0');

        return `EA-${month}${year}-${codigoNumerico}`;
    }

    function generarNuevoPedido() {
        pedidoActual = {
            items: [],
            subtotal: 0,
            descuento: null,
            costoEnvio: 0,
            total: 0,
            notas: '',
            entregaProgramada: {
                activo: false,
                fecha: null,
                hora: null
            },
            codigo: generarCodigoPedido()
        };
        document.getElementById('pedido-codigo').textContent = pedidoActual.codigo;
        document.getElementById('pedido-notas-input').value = '';
        document.getElementById('codigo-descuento').value = '';
        document.getElementById('descuento-aplicado').textContent = '';
        entregaProgramadaCheckbox.checked = false;
        entregaProgramadaCampos.style.display = 'none';

        actualizarPedidoUI();
    }

    function guardarUltimoPedido() {
        localStorage.setItem('ultimoPedido', JSON.stringify(pedidoActual));
    }

    function cargarUltimoPedido() {
        const ultimoPedido = localStorage.getItem('ultimoPedido');
        if (ultimoPedido) {
            pedidoActual = JSON.parse(ultimoPedido);
        } else {
            pedidoActual.codigo = generarCodigoPedido();
        }
        document.getElementById('pedido-codigo').textContent = pedidoActual.codigo;
        actualizarPedidoUI();
    }


    // --- Event Listeners ---

    categoriasBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = btn.dataset.categoria;
            if (categoria !== 'especial') {
                cargarProductos(categoria);
                categoriasBtn.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    productosContainer.addEventListener('click', e => {
        if (e.target.classList.contains('btn-agregar')) {
            const { nombre, precio } = e.target.dataset;
            agregarProducto(nombre, parseFloat(precio));
        }
    });

    pedidoItemsContainer.addEventListener('click', e => {
        const index = e.target.dataset.index;
        if (e.target.classList.contains('btn-restar')) {
            restarProducto(index);
        }
        if (e.target.classList.contains('btn-sumar')) {
            sumarProducto(index);
        }
    });

    vistaPreviaBtn.addEventListener('click', () => {
        if (pedidoActual.items.length === 0) {
            alert('Agrega productos al pedido antes de ver la vista previa.');
            return;
        }

        const notas = document.getElementById('pedido-notas-input').value;
        pedidoActual.notas = notas;

        const vistaPreviaContent = document.getElementById('vista-previa-content');
        let html = `
            <h3>Pedido: ${pedidoActual.codigo}</h3>
            <ul>
                ${pedidoActual.items.map(item => `<li>${item.cantidad}x ${item.nombre} - $${(item.cantidad * item.precio).toFixed(2)}</li>`).join('')}
            </ul>
            <p><strong>Subtotal:</strong> $${pedidoActual.subtotal.toFixed(2)}</p>`;

        if (pedidoActual.descuento) {
            let descuentoTexto;
            if(pedidoActual.descuento.tipo === 'porcentaje') {
                descuentoTexto = `${pedidoActual.descuento.valor}%`;
            } else {
                descuentoTexto = `$${pedidoActual.descuento.valor.toFixed(2)}`;
            }
             html += `<p><strong>Descuento:</strong> ${descuentoTexto}</p>`;
        }

        html +=`
            <p><strong>Envío:</strong> $${pedidoActual.costoEnvio.toFixed(2)}</p>
            <p><strong>Total:</strong> $${pedidoActual.total.toFixed(2)}</p>
            ${pedidoActual.notas ? `<p><strong>Notas:</strong> ${pedidoActual.notas}</p>` : ''}
            ${pedidoActual.entregaProgramada.activo ? `<p><strong>Entrega:</strong> ${pedidoActual.entregaProgramada.fecha} a las ${pedidoActual.entregaProgramada.hora}</p>` : ''}
        `;
        vistaPreviaContent.innerHTML = html;
        document.getElementById('vista-previa-modal').style.display = 'flex';
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    enviarWhatsAppBtn.addEventListener('click', () => {
        if (enviarPedidoWhatsApp()) {
            // Lógica de éxito manejada en whatsapp.js
        }
    });

    confirmarEnvioBtn.addEventListener('click', () => {
        if (enviarPedidoWhatsApp()) {
            document.getElementById('vista-previa-modal').style.display = 'none';
        }
    });

    editarPedidoBtn.addEventListener('click', () => {
        document.getElementById('vista-previa-modal').style.display = 'none';
    });

    pedidoEspecialBtn.addEventListener('click', () => {
        document.getElementById('pedido-especial-modal').style.display = 'flex';
    });

    reiniciarPedidoBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres reiniciar el pedido actual? Se perderán todos los productos agregados.')) {
            generarNuevoPedido();
        }
    });

    btnNuevoPedido.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres crear un nuevo pedido? Se guardará el actual y se creará uno nuevo.')) {
            guardarUltimoPedido();
            generarNuevoPedido();
        }
    });

    btnsEnvio.forEach(btn => {
        btn.addEventListener('click', () => {
            btnsEnvio.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pedidoActual.costoEnvio = parseFloat(btn.dataset.monto);
            actualizarTotales();
        });
    });

    btnAplicarDescuento.addEventListener('click', () => {
        const codigo = codigoDescuentoInput.value.trim().toUpperCase();
        if (!codigo) {
            alert('Por favor, ingresa un código de descuento.');
            return;
        }

        // Simulación de validación de código
        const descuentos = JSON.parse(localStorage.getItem('descuentos')) || [];
        const descuentoValido = descuentos.find(d => d.codigo === codigo && new Date(d.validoHasta) >= new Date() && d.usos < d.limiteUsos);

        if (descuentoValido) {
            pedidoActual.descuento = descuentoValido;
            document.getElementById('descuento-aplicado').textContent = `Descuento "${descuentoValido.codigo}" aplicado.`;
            actualizarTotales();
        } else {
            alert('El código de descuento no es válido o ha expirado.');
            pedidoActual.descuento = null;
            document.getElementById('descuento-aplicado').textContent = '';
            actualizarTotales();
        }
    });

    entregaProgramadaCheckbox.addEventListener('change', () => {
        const activo = entregaProgramadaCheckbox.checked;
        pedidoActual.entregaProgramada.activo = activo;
        entregaProgramadaCampos.style.display = activo ? 'block' : 'none';
        if (!activo) {
            pedidoActual.entregaProgramada.fecha = null;
            pedidoActual.entregaProgramada.hora = null;
            fechaEntregaInput.value = '';
            horaEntregaInput.value = '';
        }
    });

    fechaEntregaInput.addEventListener('change', () => {
        pedidoActual.entregaProgramada.fecha = fechaEntregaInput.value;
    });
    horaEntregaInput.addEventListener('change', () => {
        pedidoActual.entregaProgramada.hora = horaEntregaInput.value;
    });

    // Guardar pedido en progreso al cerrar la página
    window.addEventListener('beforeunload', () => {
        if (pedidoActual.items.length > 0) {
            guardarUltimoPedido();
        }
    });

    // Inicializar la app
    generarNuevoPedido();
    setupEditarPedido();
});