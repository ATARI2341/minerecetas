// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando sistema...');
    init();
});

// Variables globales
let requests = [];
let form, requestsList, searchInput, statusFilter, requestCount;
let currentEditId = null; // Para manejar ediciones

function init() {
    // Cargar datos desde localStorage
    const savedData = localStorage.getItem('designRequests');
    if (savedData) {
        try {
            requests = JSON.parse(savedData);
            console.log(`Cargadas ${requests.length} solicitudes`);
        } catch(e) {
            console.error('Error al cargar datos:', e);
            requests = [];
        }
    } else {
        // Datos de ejemplo para mostrar que funciona
        requests = [];
        console.log('No hay datos guardados');
    }
    
    // Obtener referencias a elementos DOM
    form = document.getElementById('designRequestForm');
    requestsList = document.getElementById('requestsList');
    searchInput = document.getElementById('searchInput');
    statusFilter = document.getElementById('statusFilter');
    requestCount = document.getElementById('requestCount');
    
    // Verificar elementos críticos
    if (!form) console.error('No se encontró el formulario');
    if (!requestsList) console.error('No se encontró la lista de solicitudes');
    
    // Configurar event listeners
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderRequests();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            renderRequests();
        });
    }
    
    // Renderizar solicitudes
    renderRequests();
    
    // Agregar botones de control
    addControlButtons();
    
    // Inicializar tema si existe
    initTheme();
    
    // Agregar estilos dinámicos
    addDynamicStyles();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('designRequests', JSON.stringify(requests));
        console.log('Datos guardados en localStorage');
        return true;
    } catch(e) {
        console.error('Error al guardar:', e);
        showNotification('Error al guardar datos', 'error');
        return false;
    }
}

function renderRequests() {
    if (!requestsList) return;
    
    // Obtener valores de filtros (con manejo de null)
    const searchTerm = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';
    const filterStatus = (statusFilter && statusFilter.value) ? statusFilter.value : 'todas';
    
    // Filtrar solicitudes
    let filtered = requests;
    
    if (searchTerm) {
        filtered = filtered.filter(req => {
            const clientMatch = req.clientName && req.clientName.toLowerCase().includes(searchTerm);
            const projectMatch = req.projectName && req.projectName.toLowerCase().includes(searchTerm);
            const descMatch = req.description && req.description.toLowerCase().includes(searchTerm);
            return clientMatch || projectMatch || descMatch;
        });
    }
    
    if (filterStatus !== 'todas') {
        filtered = filtered.filter(req => req.status === filterStatus);
    }
    
    // Actualizar contador
    if (requestCount) {
        requestCount.textContent = `(${filtered.length})`;
    }
    
    // Mostrar mensaje si no hay datos
    if (filtered.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <p>📭 No hay solicitudes</p>
                <small>Crea una nueva solicitud usando el formulario</small>
            </div>
        `;
        return;
    }
    
    // Renderizar tarjetas
    requestsList.innerHTML = filtered.map(req => `
        <div class="request-card priority-${req.priority || 'media'}" data-id="${req.id}">
            <div class="card-header">
                <strong>📌 ${escapeHtml(req.projectName || 'Sin nombre')}</strong>
                <span class="client-name">👤 ${escapeHtml(req.clientName || 'Sin cliente')}</span>
            </div>
            <div class="card-details">
                <small>🎨 Tipo: ${getDesignTypeIcon(req.designType)} ${escapeHtml(req.designType || 'No especificado')}</small>
                <small>📅 Entrega: ${req.deliveryDate || 'No definida'}</small>
                <small>🕒 Creado: ${req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Fecha desconocida'}</small>
            </div>
            <p class="description">📝 ${escapeHtml((req.description || '').substring(0, 150))}${(req.description || '').length > 150 ? '...' : ''}</p>
            <div class="card-actions">
                <select class="status-select" data-id="${req.id}">
                    <option value="pendiente" ${req.status === 'pendiente' ? 'selected' : ''}>📋 Pendiente</option>
                    <option value="enproceso" ${req.status === 'enproceso' ? 'selected' : ''}>🔄 En proceso</option>
                    <option value="completado" ${req.status === 'completado' ? 'selected' : ''}>✅ Completado</option>
                </select>
                <button class="edit-btn" data-id="${req.id}">✏️ Editar</button>
                <button class="delete-btn" data-id="${req.id}">🗑 Eliminar</button>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners a los elementos dinámicos
    attachDynamicEvents();
}

function attachDynamicEvents() {
    // Eventos para cambio de estado
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const newStatus = this.value;
            const request = requests.find(r => r.id === id);
            if (request) {
                request.status = newStatus;
                saveToLocalStorage();
                renderRequests();
                showNotification(`Estado actualizado a: ${newStatus}`, 'info');
            }
        });
    });
    
    // Eventos para eliminar
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            if (confirm('¿Estás seguro de eliminar esta solicitud?')) {
                requests = requests.filter(r => r.id !== id);
                saveToLocalStorage();
                renderRequests();
                showNotification('Solicitud eliminada', 'warning');
            }
        });
    });
    
    // Eventos para editar
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            editRequest(id);
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getDesignTypeIcon(type) {
    const icons = {
        'logo': '🖌️',
        'web': '🌐',
        'flyer': '📄',
        'banner': '📊',
        'redes': '📱',
        'packaging': '📦'
    };
    return icons[type] || '🎨';
}

function editRequest(id) {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    
    currentEditId = id;
    
    // Llenar el formulario con los datos
    const clientNameInput = document.getElementById('clientName');
    const projectNameInput = document.getElementById('projectName');
    const designTypeSelect = document.getElementById('designType');
    const descriptionTextarea = document.getElementById('description');
    const deliveryDateInput = document.getElementById('deliveryDate');
    const prioritySelect = document.getElementById('priority');
    
    if (clientNameInput) clientNameInput.value = request.clientName || '';
    if (projectNameInput) projectNameInput.value = request.projectName || '';
    if (designTypeSelect) designTypeSelect.value = request.designType || '';
    if (descriptionTextarea) descriptionTextarea.value = request.description || '';
    if (deliveryDateInput) deliveryDateInput.value = request.deliveryDate || '';
    if (prioritySelect) prioritySelect.value = request.priority || 'media';
    
    // Cambiar el texto del botón
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.textContent = '✏️ Actualizar Solicitud';
        submitBtn.style.backgroundColor = '#ffc107';
    }
    
    // Scroll al formulario
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    showNotification('Editando solicitud - Modifica los campos y actualiza', 'info');
}

function handleSubmit(e) {
    e.preventDefault();
    
    // Obtener valores del formulario
    const clientNameInput = document.getElementById('clientName');
    const projectNameInput = document.getElementById('projectName');
    const designTypeSelect = document.getElementById('designType');
    const descriptionTextarea = document.getElementById('description');
    const deliveryDateInput = document.getElementById('deliveryDate');
    const prioritySelect = document.getElementById('priority');
    
    // Validar campos requeridos
    if (!clientNameInput || !clientNameInput.value.trim()) {
        showNotification('Por favor ingresa el nombre del cliente', 'warning');
        return;
    }
    
    if (!projectNameInput || !projectNameInput.value.trim()) {
        showNotification('Por favor ingresa el nombre del proyecto', 'warning');
        return;
    }
    
    if (!designTypeSelect || !designTypeSelect.value) {
        showNotification('Por favor selecciona el tipo de diseño', 'warning');
        return;
    }
    
    if (currentEditId) {
        // Modo edición - actualizar solicitud existente
        const requestIndex = requests.findIndex(r => r.id === currentEditId);
        if (requestIndex !== -1) {
            requests[requestIndex] = {
                ...requests[requestIndex],
                clientName: clientNameInput.value.trim(),
                projectName: projectNameInput.value.trim(),
                designType: designTypeSelect.value,
                description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
                deliveryDate: deliveryDateInput ? deliveryDateInput.value : '',
                priority: prioritySelect ? prioritySelect.value : 'media',
                updatedAt: new Date().toISOString()
            };
            saveToLocalStorage();
            renderRequests();
            showNotification('Solicitud actualizada exitosamente', 'success');
            currentEditId = null;
            
            // Resetear botón
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = '📤 Enviar Solicitud';
                submitBtn.style.backgroundColor = '';
            }
        }
    } else {
        // Modo crear - nueva solicitud
        const newRequest = {
            id: Date.now(),
            clientName: clientNameInput.value.trim(),
            projectName: projectNameInput.value.trim(),
            designType: designTypeSelect.value,
            description: descriptionTextarea ? descriptionTextarea.value.trim() : '',
            deliveryDate: deliveryDateInput ? deliveryDateInput.value : '',
            priority: prioritySelect ? prioritySelect.value : 'media',
            status: 'pendiente',
            createdAt: new Date().toISOString()
        };
        
        requests.unshift(newRequest);
        saveToLocalStorage();
        renderRequests();
        showNotification('Solicitud creada exitosamente', 'success');
    }
    
    // Resetear formulario
    if (form) form.reset();
}

function showNotification(message, type = 'info') {
    // Eliminar notificaciones anteriores
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${colors[type] || colors.info};
        color: ${type === 'warning' ? '#333' : 'white'};
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.remove) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

function exportToJSON() {
    if (requests.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalRequests: requests.length,
        requests: requests
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `disenos_export_${new Date().toISOString().slice(0,19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Exportadas ${requests.length} solicitudes a JSON`, 'success');
}

function importFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            let importedRequests = [];
            
            if (Array.isArray(importedData)) {
                importedRequests = importedData;
            } else if (importedData.requests && Array.isArray(importedData.requests)) {
                importedRequests = importedData.requests;
            } else {
                throw new Error('Formato de archivo no válido');
            }
            
            const validRequests = importedRequests.filter(req => 
                req.clientName && req.projectName && req.designType
            );
            
            if (validRequests.length === 0) {
                throw new Error('No se encontraron solicitudes válidas');
            }
            
            const newRequests = validRequests.map(req => ({
                ...req,
                id: Date.now() + Math.random(),
                importedAt: new Date().toISOString()
            }));
            
            const action = confirm(`Se encontraron ${newRequests.length} solicitudes válidas.\n¿Deseas COMBINAR con los datos actuales?\n(Click CANCELAR para REEMPLAZAR)`);
            
            if (action) {
                requests = [...newRequests, ...requests];
                showNotification(`Importadas y combinadas ${newRequests.length} solicitudes`, 'success');
            } else {
                if (confirm(`¿Reemplazar TODAS las ${requests.length} solicitudes actuales?`)) {
                    requests = newRequests;
                    showNotification(`Datos reemplazados con ${newRequests.length} solicitudes`, 'success');
                } else {
                    showNotification('Importación cancelada', 'info');
                    return;
                }
            }
            
            saveToLocalStorage();
            renderRequests();
            
        } catch (error) {
            console.error(error);
            showNotification('Error al importar: Archivo JSON inválido', 'warning');
        }
    };
    
    reader.onerror = () => {
        showNotification('Error al leer el archivo', 'warning');
    };
    
    reader.readAsText(file);
}

function showStats() {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pendiente').length;
    const inProgress = requests.filter(r => r.status === 'enproceso').length;
    const completed = requests.filter(r => r.status === 'completado').length;
    const highPriority = requests.filter(r => r.priority === 'alta').length;
    
    alert(`📊 ESTADÍSTICAS DEL SISTEMA\n\n` +
          `📋 Total solicitudes: ${total}\n` +
          `⏳ Pendientes: ${pending}\n` +
          `🔄 En proceso: ${inProgress}\n` +
          `✅ Completadas: ${completed}\n` +
          `🚨 Prioridad alta: ${highPriority}\n` +
          `💾 Almacenamiento: ${Math.ceil(JSON.stringify(requests).length / 1024)} KB`);
}

function clearAllData() {
    if (confirm('⚠️ ¿ELIMINAR TODAS LAS SOLICITUDES? Esta acción no se puede deshacer.')) {
        if (confirm('Última confirmación: ¿Seguro que quieres borrar TODO?')) {
            requests = [];
            saveToLocalStorage();
            renderRequests();
            showNotification('Todos los datos han sido eliminados', 'warning');
        }
    }
}

function addControlButtons() {
    const container = document.querySelector('.requests-section');
    if (!container) return;
    
    // Verificar si ya existen los botones
    if (document.querySelector('.control-buttons')) return;
    
    const buttonBar = document.createElement('div');
    buttonBar.className = 'control-buttons';
    buttonBar.innerHTML = `
        <button id="exportBtn" class="control-btn export">📥 Exportar a JSON</button>
        <button id="importBtn" class="control-btn import">📤 Importar JSON</button>
        <button id="statsBtn" class="control-btn stats">📊 Estadísticas</button>
        <button id="clearBtn" class="control-btn clear">🗑️ Limpiar Todo</button>
        <input type="file" id="importFileInput" accept=".json" style="display: none">
    `;
    
    // Insertar después del título
    const title = container.querySelector('h2');
    if (title && title.nextSibling) {
        container.insertBefore(buttonBar, title.nextSibling);
    } else {
        container.insertBefore(buttonBar, container.firstChild);
    }
    
    // Agregar event listeners
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const statsBtn = document.getElementById('statsBtn');
    const clearBtn = document.getElementById('clearBtn');
    const importFileInput = document.getElementById('importFileInput');
    
    if (exportBtn) exportBtn.addEventListener('click', exportToJSON);
    if (importBtn) importBtn.addEventListener('click', () => {
        if (importFileInput) importFileInput.click();
    });
    if (statsBtn) statsBtn.addEventListener('click', showStats);
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                importFromJSON(e.target.files[0]);
                e.target.value = '';
            }
        });
    }
}

function initTheme() {
    // Verificar si existe la configuración de temas
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect) return;
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
        applyTheme(savedTheme);
        themeSelect.value = savedTheme;
    }
    
    themeSelect.addEventListener('change', function(e) {
        applyTheme(e.target.value);
        localStorage.setItem('selectedTheme', e.target.value);
    });
}

function applyTheme(themeName) {
    const themes = {
        light: {
            '--bg-color': '#f8f9fa',
            '--card-bg': '#ffffff',
            '--text-color': '#212529',
            '--border-color': '#dee2e6'
        },
        dark: {
            '--bg-color': '#1a1a2e',
            '--card-bg': '#16213e',
            '--text-color': '#eeeeee',
            '--border-color': '#0f3460'
        },
        custom: {
            '--bg-color': '#f0f3fa',
            '--card-bg': '#ffffff',
            '--text-color': '#2c3e50',
            '--border-color': '#bdc3c7'
        }
    };
    
    const theme = themes[themeName] || themes.light;
    
    for (const [property, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(property, value);
    }
    
    document.body.className = themeName;
}

function addDynamicStyles() {
    if (document.getElementById('dynamic-styles-added')) return;
    
    const style = document.createElement('style');
    style.id = 'dynamic-styles-added';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .control-buttons {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .control-btn {
            flex: 1;
            padding: 10px 15px;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        .control-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .control-btn.export { background: #28a745; color: white; }
        .control-btn.import { background: #17a2b8; color: white; }
        .control-btn.stats { background: #6c757d; color: white; }
        .control-btn.clear { background: #dc3545; color: white; }
        .request-card {
            background: var(--card-bg);
            border-left: 5px solid #4361ee;
            padding: 15px;
            margin: 12px 0;
            border-radius: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .request-card:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .priority-alta { border-left-color: #dc3545; }
        .priority-media { border-left-color: #ffc107; }
        .priority-baja { border-left-color: #28a745; }
        .card-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        .card-details {
            display: flex;
            gap: 15px;
            margin: 8px 0;
            flex-wrap: wrap;
        }
        .description {
            background: var(--bg-color);
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 14px;
        }
        .card-actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .edit-btn {
            background: #ffc107;
            color: #333;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .edit-btn:hover { background: #e0a800; }
        .delete-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .delete-btn:hover { background: #c82333; }
        .status-select {
            flex: 1;
            padding: 5px;
            border-radius: 5px;
            background: var(--bg-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-color);
            opacity: 0.7;
        }
        .filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .filters input,
        .filters select {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--bg-color);
            color: var(--text-color);
        }
    `;
    document.head.appendChild(style);
}