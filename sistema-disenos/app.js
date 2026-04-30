// Modelo de datos
let requests = JSON.parse(localStorage.getItem('designRequests')) || [];

// Elementos DOM
const form = document.getElementById('designRequestForm');
const requestsList = document.getElementById('requestsList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const requestCount = document.getElementById('requestCount');

// Funciones de control
function saveToLocalStorage() {
    localStorage.setItem('designRequests', JSON.stringify(requests));
    showNotification('Datos guardados en localStorage', 'success');
}

function renderRequests() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = statusFilter.value;
    
    let filtered = requests.filter(req => {
        const matchesSearch = req.clientName.toLowerCase().includes(searchTerm) ||
                              req.projectName.toLowerCase().includes(searchTerm) ||
                              (req.description && req.description.toLowerCase().includes(searchTerm));
        const matchesStatus = filterStatus === 'todas' || req.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
    
    requestCount.textContent = `(${filtered.length})`;
    
    if (filtered.length === 0) {
        requestsList.innerHTML = '<p class="empty-state">📭 No hay solicitudes</p>';
        return;
    }
    
    requestsList.innerHTML = filtered.map((req, index) => `
        <div class="request-card priority-${req.priority}" data-id="${req.id}">
            <div class="card-header">
                <strong>📌 ${req.projectName}</strong>
                <span class="client-name">👤 ${req.clientName}</span>
            </div>
            <div class="card-details">
                <small>🎨 Tipo: ${getDesignTypeIcon(req.designType)} ${req.designType}</small>
                <small>📅 Entrega: ${req.deliveryDate || 'No definida'}</small>
                <small>🕒 Creado: ${new Date(req.createdAt).toLocaleDateString()}</small>
            </div>
            <p class="description">📝 ${req.description.substring(0, 150)}${req.description.length > 150 ? '...' : ''}</p>
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
    
    // Agregar event listeners
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const newStatus = e.target.value;
            const request = requests.find(r => r.id === id);
            if (request) {
                request.status = newStatus;
                saveToLocalStorage();
                renderRequests();
                showNotification(`Estado actualizado a: ${newStatus}`, 'info');
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            if (confirm('¿Estás seguro de eliminar esta solicitud?')) {
                requests = requests.filter(r => r.id !== id);
                saveToLocalStorage();
                renderRequests();
                showNotification('Solicitud eliminada', 'warning');
            }
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            editRequest(id);
        });
    });
}

// Función auxiliar para íconos
function getDesignTypeIcon(type) {
    const icons = {
        'logo': '🖌️',
        'web': '🌐',
        'flyer': '📄',
        'banner': '📊',
        'redes': '📱'
    };
    return icons[type] || '🎨';
}

// Función para editar solicitud
function editRequest(id) {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    
    document.getElementById('clientName').value = request.clientName;
    document.getElementById('projectName').value = request.projectName;
    document.getElementById('designType').value = request.designType;
    document.getElementById('description').value = request.description;
    document.getElementById('deliveryDate').value = request.deliveryDate;
    document.getElementById('priority').value = request.priority;
    
    // Cambiar temporalmente el botón de enviar
    const submitBtn = document.querySelector('#designRequestForm button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '✏️ Actualizar Solicitud';
    
    // Eliminar el submit anterior y agregar uno nuevo
    form.removeEventListener('submit', handleSubmit);
    
    const handleUpdate = (e) => {
        e.preventDefault();
        request.clientName = document.getElementById('clientName').value;
        request.projectName = document.getElementById('projectName').value;
        request.designType = document.getElementById('designType').value;
        request.description = document.getElementById('description').value;
        request.deliveryDate = document.getElementById('deliveryDate').value;
        request.priority = document.getElementById('priority').value;
        request.updatedAt = new Date().toISOString();
        
        saveToLocalStorage();
        renderRequests();
        form.reset();
        submitBtn.textContent = originalText;
        form.removeEventListener('submit', handleUpdate);
        form.addEventListener('submit', handleSubmit);
        showNotification('Solicitud actualizada', 'success');
        
        // Scroll al listado
        document.querySelector('.requests-section').scrollIntoView({ behavior: 'smooth' });
    };
    
    form.addEventListener('submit', handleUpdate);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Submit normal
function handleSubmit(e) {
    e.preventDefault();
    
    const newRequest = {
        id: Date.now(),
        clientName: document.getElementById('clientName').value,
        projectName: document.getElementById('projectName').value,
        designType: document.getElementById('designType').value,
        description: document.getElementById('description').value,
        deliveryDate: document.getElementById('deliveryDate').value,
        priority: document.getElementById('priority').value,
        status: 'pendiente',
        createdAt: new Date().toISOString()
    };
    
    requests.unshift(newRequest);
    saveToLocalStorage();
    renderRequests();
    form.reset();
    showNotification('Solicitud creada exitosamente', 'success');
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ------------------- EXPORTAR A JSON -------------------
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

// ------------------- IMPORTAR DESDE JSON -------------------
function importFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            let importedRequests = [];
            
            // Soporte para formato simple o con wrapper
            if (Array.isArray(importedData)) {
                importedRequests = importedData;
            } else if (importedData.requests && Array.isArray(importedData.requests)) {
                importedRequests = importedData.requests;
            } else {
                throw new Error('Formato de archivo no válido');
            }
            
            // Validar estructura mínima
            const validRequests = importedRequests.filter(req => 
                req.clientName && req.projectName && req.designType
            );
            
            if (validRequests.length === 0) {
                throw new Error('No se encontraron solicitudes válidas');
            }
            
            // Generar nuevos IDs para evitar conflictos
            const newRequests = validRequests.map(req => ({
                ...req,
                id: Date.now() + Math.random(),
                importedAt: new Date().toISOString()
            }));
            
            // Preguntar si reemplazar o combinar
            const action = confirm(`Se encontraron ${newRequests.length} solicitudes válidas.\n¿Deseas COMBINAR con los datos actuales?\n(Click CANCELAR para REEMPLAZAR)`);
            
            if (action) {
                // Combinar
                requests = [...newRequests, ...requests];
                showNotification(`Importadas y combinadas ${newRequests.length} solicitudes`, 'success');
            } else {
                // Reemplazar
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

// ------------------- ESTADÍSTICAS -------------------
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
          `💾 Almacenamiento: localStorage (${Math.ceil(JSON.stringify(requests).length / 1024)} KB)`);
}

// ------------------- LIMPIAR TODO -------------------
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

// ------------------- BOTONES DE CONTROL -------------------
function addControlButtons() {
    const container = document.querySelector('.requests-section');
    const existingButtons = document.querySelector('.control-buttons');
    if (existingButtons) existingButtons.remove();
    
    const buttonBar = document.createElement('div');
    buttonBar.className = 'control-buttons';
    buttonBar.innerHTML = `
        <button id="exportBtn" class="control-btn export">📥 Exportar a JSON</button>
        <button id="importBtn" class="control-btn import">📤 Importar JSON</button>
        <button id="statsBtn" class="control-btn stats">📊 Estadísticas</button>
        <button id="clearBtn" class="control-btn clear">🗑️ Limpiar Todo</button>
        <input type="file" id="importFileInput" accept=".json" style="display: none">
    `;
    
    container.insertBefore(buttonBar, container.firstChild);
    
    // Event listeners
    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('statsBtn').addEventListener('click', showStats);
    document.getElementById('clearBtn').addEventListener('click', clearAllData);
    document.getElementById('importFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importFromJSON(e.target.files[0]);
            e.target.value = ''; // Reset input
        }
    });
}

// Inicializar aplicación
form.addEventListener('submit', handleSubmit);

function init() {
    // Cargar tema guardado
    if (typeof StyleConfig !== 'undefined') {
        StyleConfig.loadSavedTheme();
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                StyleConfig.applyTheme(e.target.value);
            });
        }
    }
    
    renderRequests();
    addControlButtons();
    
    // Agregar animaciones CSS
    const style = document.createElement('style');
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
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .control-btn {
            flex: 1;
            padding: 10px;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .control-btn:hover { transform: translateY(-2px); }
        .control-btn.export { background: #28a745; color: white; }
        .control-btn.import { background: #17a2b8; color: white; }
        .control-btn.stats { background: #6c757d; color: white; }
        .control-btn.clear { background: #dc3545; color: white; }
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
        }
        .delete-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
        }
        .status-select {
            flex: 1;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--text-color);
            opacity: 0.7;
        }
    `;
    document.head.appendChild(style);
}

init();