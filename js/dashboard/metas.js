// meta.js
class MetaManager {
    constructor() {
      this.META_MENSUAL = 6000;
      this.META_SEMANAL = this.META_MENSUAL / 4;
      this.tipoMetaActual = 'mensual';
    }
  
    /**
     * Calcula la meta proporcional para el período seleccionado
     * @param {string} desde - Fecha inicio (YYYY-MM-DD)
     * @param {string} hasta - Fecha fin (YYYY-MM-DD)
     * @returns {number} Meta proporcional calculada
     */
    calcularMetaProporcional(desde, hasta) {
      const fechaInicio = new Date(desde);
      const fechaFin = new Date(hasta);
      
      // Validación básica de fechas
      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()) || fechaInicio > fechaFin) {
        console.error('Fechas inválidas para cálculo de meta');
        return 0;
      }
  
      const diasPeriodo = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
      
      if (this.tipoMetaActual === 'mensual') {
        const diasEnMes = new Date(fechaFin.getFullYear(), fechaFin.getMonth() + 1, 0).getDate();
        return (this.META_MENSUAL / diasEnMes) * diasPeriodo;
      } else {
        // Opcional: considerar solo días hábiles (lunes a viernes)
        const diasHabiles = this.contarDiasHabiles(fechaInicio, fechaFin);
        return (this.META_SEMANAL / 5) * diasHabiles;
      }
    }
  
    /**
     * Cuenta días hábiles entre dos fechas (excluye sábados y domingos)
     */
    contarDiasHabiles(inicio, fin) {
      let count = 0;
      const current = new Date(inicio);
      
      while (current <= fin) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
      }
      
      return count;
    }
  
    /**
     * Actualiza la interfaz de usuario con el progreso de la meta
     * @param {number} ventas - Ventas totales en el período
     * @param {number} gastos - Gastos totales en el período
     */
    actualizarProgresoMeta(ventas, gastos) {
      const neto = ventas - gastos;
      const meta = this.tipoMetaActual === 'mensual' ? this.META_MENSUAL : this.META_SEMANAL;
      const porcentaje = Math.min((neto / meta) * 100, 100);
  
      const elementoMeta = document.getElementById(`meta-${this.tipoMetaActual}`);
      const elementoBarra = document.getElementById(`barra-progreso-${this.tipoMetaActual}`);
      const elementoNeto = document.getElementById(`ventas-netas-${this.tipoMetaActual}`);
  
      if (elementoMeta) elementoMeta.textContent = formatearMoneda(meta);
      if (elementoNeto) elementoNeto.textContent = formatearMoneda(neto);
  
      if (elementoBarra) {
        elementoBarra.style.width = `${porcentaje}%`;
        elementoBarra.querySelector('.progress-text').textContent = `${porcentaje.toFixed(1)}%`;
        
        // Actualizar clase CSS según progreso
        elementoBarra.className = 'progress-bar ' + 
          (porcentaje >= 100 ? 'bg-success' :
           porcentaje >= 75 ? 'bg-warning' : 'bg-danger');
      }
    }
  
    /**
     * Alterna entre vista de meta mensual/semanal
     */
    alternarVistaMeta() {
      const contenedorMensual = document.getElementById('meta-mensual-container');
      const contenedorSemanal = document.getElementById('meta-semanal-container');
  
      if (this.tipoMetaActual === 'mensual') {
        if (contenedorMensual) contenedorMensual.style.display = 'block';
        if (contenedorSemanal) contenedorSemanal.style.display = 'none';
      } else {
        if (contenedorMensual) contenedorMensual.style.display = 'none';
        if (contenedorSemanal) contenedorSemanal.style.display = 'block';
      }
    }
  }
  
  export const metaManager = new MetaManager();