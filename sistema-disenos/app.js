// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando sistema...');
    init();
});

// Variables globales
let requests = [];
let designTypes = [];
let form, requestsList, searchInput, statusFilter, requestCount, deadlineFilter;
let currentEditId = null;

// Cargar tipos de diseño guardados
function loadDesignTypes() {
    const saved = localStorage.getItem('designTypes');
    if (saved) {
        designTypes = JSON.parse(saved);
    } else {
        // Tipos por defecto
        designTypes = [
            { name: 'Logo', icon: '🖌️' },
            { name: 'Sitio Web', icon: '🌐' },
            { name: 'Flyer', icon: '📄' },
            { name: 'Banner', icon: '📊' },
            { name: 'Redes Sociales', icon: '📱' },
            { name: 'Packaging', icon: '📦' },
            { name: 'Ilustración', icon: '✏️' },
            { name: 'UI/UX', icon: '🎨' }
        ];
    }
    updateDesignTypeSelect();
}

function updateDesignTypeSelect() {
    const select = document.getElementById('designType');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar tipo</option>';
    designTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.name;
        option.textContent = `${type.icon} ${type.name}`;
        select.appendChild(option);
    });
}

function saveDesignTypes() {
    localStorage.setItem('designTypes', JSON.stringify(designTypes));
}

function addDesignType(name, icon) {
    if (!name || name.trim() === '') {
        showNotification('Por favor ingresa un nombre para el tipo de diseño', 'warning');
        return false;
    }
    
    if (designTypes.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Este tipo de diseño ya existe', 'warning');
        return false;
    }
    
    designTypes.push({ name: name.trim(), icon: icon || '🎨' });
    saveDesignTypes();
    updateDesignTypeSelect();
    showNotification(`Tipo "${name}" agregado exitosamente`, 'success');
    return true;
}

// Calcular estado de la fecha límite
function getDeadlineStatus(deliveryDate) {
    if (!deliveryDate) return 'normal';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deliveryDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'vencido';
    if (diffDays <= 3) return 'urgente';
    if (diffDays <= 7) return 'proximo';
    return 'normal';
}

function getDeadlineText(days) {
    if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
}

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
        // Datos de ejemplo
        const today = new Date();
        requests = [
            {
                id: Date.now(),
                clientName: 'Ejemplo Cliente',
                projectName: 'Proyecto de prueba',
                designType: 'Logo',
                description: 'Este es un ejemplo de solicitud',
                deliveryDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                priority: 'alta',
                status: 'pendiente',
                createdAt: new Date().toISOString()
            }
        ];
        saveToLocalStorage();
    }
    
    // Cargar tipos de diseño
    loadDesignTypes();
    
    // Obtener referencias a elementos DOM
    form = document.getElementById('designRequestForm');
    requestsList = document.getElementById('requestsList');
    searchInput = document.getElementById('searchInput');
    statusFilter = document.getElementById('statusFilter');
    requestCount = document.getElementById('requestCount');
    deadlineFilter = document.getElementById('deadlineFilter');
    
    // Configurar event listeners
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', () => renderRequests());
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderRequests());
    }
    
    if (deadlineFilter) {
        deadlineFilter.addEventListener('change', () => renderRequests());
    }
    
    // Botón para agregar tipo de diseño
    const addTypeBtn = document.getElementById('addDesignTypeBtn');
    if (addTypeBtn) {
        addTypeBtn.addEventListener('click', () => {
            document.getElementById('designTypeModal').style.display = 'block';
        });
    }
    
    // Configurar modal
    setupModal();
    
    // Validar fecha en tiempo real
    const deliveryDateInput = document.getElementById('deliveryDate');
    if (deliveryDateInput) {
        deliveryDateInput.addEventListener('change', validateDate);
        deliveryDateInput.addEventListener('input', validateDate);
    }
    
    // Renderizar solicitudes
    renderRequests();
    
    // Agregar botones de control
    addControlButtons();
    
    // Inicializar tema
    initTheme();
    
    // Agregar estilos dinámicos
    addDynamicStyles();
}

function validateDate() {
    const dateInput = document.getElementById('deliveryDate');
    const warningSpan = document.getElementById('dateWarning');
    
    if (!dateInput || !warningSpan) return;
    
    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateInput.value && selectedDate < today) {
        warningSpan.innerHTML = '⚠️ La fecha límite ya pasó. Considera una fecha futura.';
        warningSpan.style.color = '#dc3545';
        return false;
    } else if (dateInput.value) {
        const diffTime = selectedDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 3) {
            warningSpan.innerHTML = `⚠️ Fecha límite en ${diffDays} días - ¡Urgente!`;
            warningSpan.style.color = '#ff6b6b';
        } else if (diffDays <= 7) {
            warningSpan.innerHTML = `🟡 Fecha límite en ${diffDays} días - Próxima`;
            warningSpan.style.color = '#ffc107';
        } else {
            warningSpan.innerHTML = `✅ Fecha límite en ${diffDays} días`;
            warningSpan.style.color = '#28a745';
        }
        return true;
    }
    return true;
}

function setupModal() {
    const modal = document.getElementById('designTypeModal');
    const closeBtn = document.querySelector('.close');
    const saveBtn = document.getElementById('saveDesignTypeBtn');
    
    if (!modal) return;
    
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    if (saveBtn) {
        saveBtn.onclick = () => {
            const newTypeName = document.getElementById('newDesignType').value;
            const newTypeIcon = document.getElementById('newDesignTypeIcon').value;
            
            if (addDesignType(newTypeName, newTypeIcon)) {
                modal.style.display = 'none';
                document.getElementById('newDesignType').value = '';
            }
        };
    }
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
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
    
    // Obtener valores de filtros
    const searchTerm = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';
    const filterStatus = (statusFilter && statusFilter.value) ? statusFilter.value : 'todas';
    const filterDeadline = (deadlineFilter && deadlineFilter.value) ? deadlineFilter.value : 'todas';
    
    // Filtrar solicitudes
    let filtered = [...requests];
    
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
    
    if (filterDeadline !== 'todas') {
        filtered = filtered.filter(req => {
            const status = getDeadlineStatus(req.deliveryDate);
            return status === filterDeadline;
        });
    }
    
    // Ordenar por fecha límite (las más urgentes primero)
    filtered.sort((a, b) => {
        const dateA = a.deliveryDate ? new Date(a.deliveryDate) : new Date(8640000000000000);
        const dateB = b.deliveryDate ? new Date(b.deliveryDate) : new Date(8640000000000000);
        return dateA - dateB;
    });
    
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
    requestsList.innerHTML = filtered.map(req => {
        const deadlineStatus = getDeadlineStatus(req.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = req.deliveryDate ? new Date(req.deliveryDate) : null;
        const diffDays = deadline ? Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) : null;
        
        const designTypeObj = designTypes.find(t => t.name === req.designType);
        const typeIcon = designTypeObj ? designTypeObj.icon : '🎨';
        
        return `
            <div class="request-card priority-${req.priority || 'media'} deadline-${deadlineStatus}" data-id="${req.id}">
                <div class="card-header">
                    <strong>📌 ${escapeHtml(req.projectName || 'Sin nombre')}</strong>
                    <span class="client-name">👤 ${escapeHtml(req.clientName || 'Sin cliente')}</span>
                </div>
                <div class="card-details">
                    <small>🎨 Tipo: ${typeIcon} ${escapeHtml(req.designType || 'No especificado')}</small>
                    <small>📅 Fecha límite: ${req.deliveryDate ? new Date(req.deliveryDate).toLocaleDateString() : 'No definida'}</small>
                    ${deadline && diffDays !== null ? `<span class="deadline-badge ${deadlineStatus}">${getDeadlineText(diffDays)}</span>` : ''}
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
        `;
    }).join('');
    
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

function editRequest(id) {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    
    currentEditId = id;
    
    // Llenar el formulario con los datos
    document.getElementById('clientName').value = request.clientName || '';
    document.getElementById('projectName').value = request.projectName || '';
    document.getElementById('designType').value = request.designType || '';
    document.getElementById('description').value = request.description || '';
    document.getElementById('deliveryDate').value = request.deliveryDate || '';
    document.getElementById('priority').value = request.priority || 'media';
    
    // Validar la fecha
    validateDate();
    
    // Cambiar el texto del botón
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '✏️ Actualizar Solicitud';
        submitBtn.style.backgroundColor = '#ffc107';
    }
    
    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    showNotification('Editando solicitud - Modifica los campos y actualiza', 'info');
}

function handleSubmit(e) {
    e.preventDefault();
    
    // Obtener valores del formulario
    const clientName = document.getElementById('clientName').value.trim();
    const projectName = document.getElementById('projectName').value.trim();
    const designType = document.getElementById('designType').value;
    const description = document.getElementById('description').value.trim();
    const deliveryDate = document.getElementById('deliveryDate').value;
    const priority = document.getElementById('priority').value;
    
    // Validar campos requeridos
    if (!clientName) {
        showNotification('Por favor ingresa el nombre del cliente', 'warning');
        return;
    }
    
    if (!projectName) {
        showNotification('Por favor ingresa el nombre del proyecto', 'warning');
        return;
    }
    
    if (!designType) {
        showNotification('Por favor selecciona el tipo de diseño', 'warning');
        return;
    }
    
    if (!deliveryDate) {
        showNotification('Por favor selecciona la fecha límite', 'warning');
        return;
    }
    
    // Validar que la fecha no sea pasada
    const selectedDate = new Date(deliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification('⚠️ La fecha límite no puede ser anterior a hoy', 'warning');
        return;
    }
    
    if (currentEditId) {
        // Modo edición
        const requestIndex = requests.findIndex(r => r.id === currentEditId);
        if (requestIndex !== -1) {
            requests[requestIndex] = {
                ...requests[requestIndex],
                clientName,
                projectName,
                designType,
                description,
                deliveryDate,
                priority,
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
        // Modo crear
        const newRequest = {
            id: Date.now(),
            clientName,
            projectName,
            designType,
            description,
            deliveryDate,
            priority,
            status: 'pendiente',
            createdAt: new Date().toISOString()
        };
        
        requests.unshift(newRequest);
        saveToLocalStorage();
        renderRequests();
        showNotification('Solicitud creada exitosamente', 'success');
    }
    
    // Resetear formulario
    form.reset();
    const warningSpan = document.getElementById('dateWarning');
    if (warningSpan) warningSpan.innerHTML = '';
}

function showNotification(message, type = 'info') {
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
        requests: requests,
        designTypes: designTypes
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
            let importedTypes = null;
            
            if (Array.isArray(importedData)) {
                importedRequests = importedData;
            } else if (importedData.requests && Array.isArray(importedData.requests)) {
                importedRequests = importedData.requests;
                if (importedData.designTypes && Array.isArray(importedData.designTypes)) {
                    importedTypes = importedData.designTypes;
                }
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
                    if (importedTypes) {
                        designTypes = importedTypes;
                        saveDesignTypes();
                        updateDesignTypeSelect();
                    }
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
    
    // Estadísticas de fechas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const urgent = requests.filter(r => getDeadlineStatus(r.deliveryDate) === 'urgente').length;
    const overdue = requests.filter(r => getDeadlineStatus(r.deliveryDate) === 'vencido').length;
    
    alert(`📊 ESTADÍSTICAS DEL SISTEMA\n\n` +
          `📋 Total solicitudes: ${total}\n` +
          `⏳ Pendientes: ${pending}\n` +
          `🔄 En proceso: ${inProgress}\n` +
          `✅ Completadas: ${completed}\n` +
          `🚨 Prioridad alta: ${highPriority}\n` +
          `⚠️ Urgentes (≤3 días): ${urgent}\n` +
          `🔴 Vencidas: ${overdue}\n` +
          `🎨 Tipos de diseño: ${designTypes.length}\n` +
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
    
    const title = container.querySelector('h2');
    if (title && title.nextSibling) {
        container.insertBefore(buttonBar, title.nextSibling);
    } else {
        container.insertBefore(buttonBar, container.firstChild);
    }
    
    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('statsBtn').addEventListener('click', showStats);
    document.getElementById('clearBtn').addEventListener('click', clearAllData);
    document.getElementById('importFileInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            importFromJSON(e.target.files[0]);
            e.target.value = '';
        }
    });
}

function initTheme() {
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect) return;
    
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
    `;
    document.head.appendChild(style);
}

// Actualizar colores automáticamente cada hora
setInterval(() => {
    renderRequests();
}, 3600000);