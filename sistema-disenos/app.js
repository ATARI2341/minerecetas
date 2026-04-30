// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando sistema...');
    init();
});

// Variables globales
let requests = [];
let designTypes = [];
let customTheme = {};
let form, requestsList, searchInput, statusFilter, requestCount, deadlineFilter;
let currentEditId = null;

// Cargar tipos de diseño guardados
function loadDesignTypes() {
    const saved = localStorage.getItem('designTypes');
    if (saved) {
        designTypes = JSON.parse(saved);
    } else {
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

// ============ SISTEMA DE TEMAS PERSONALIZABLES ============
function loadCustomTheme() {
    const saved = localStorage.getItem('customTheme');
    if (saved) {
        try {
            customTheme = JSON.parse(saved);
            console.log('Tema personalizado cargado');
        } catch(e) {
            console.error('Error al cargar tema:', e);
            customTheme = getDefaultTheme();
        }
    } else {
        customTheme = getDefaultTheme();
    }
    return customTheme;
}

function getDefaultTheme() {
    return {
        '--primary-color': '#4361ee',
        '--secondary-color': '#3f37c9',
        '--bg-color': '#f8f9fa',
        '--card-bg': '#ffffff',
        '--text-color': '#212529',
        '--border-color': '#dee2e6',
        '--border-radius': '12px',
        '--font-family': "'Segoe UI', system-ui",
        '--danger-color': '#dc3545',
        '--warning-color': '#ffc107',
        '--urgent-color': '#ff6b6b',
        '--success-color': '#28a745'
    };
}

function applyTheme(themeName) {
    if (themeName === 'custom') {
        // Aplicar tema personalizado
        const theme = loadCustomTheme();
        for (const [property, value] of Object.entries(theme)) {
            document.documentElement.style.setProperty(property, value);
        }
        document.body.className = 'custom';
        // Actualizar los colores de los badges de fecha
        updateDeadlineColors();
    } else {
        // Aplicar temas predefinidos
        const themes = {
            light: {
                '--bg-color': '#f8f9fa',
                '--card-bg': '#ffffff',
                '--text-color': '#212529',
                '--border-color': '#dee2e6',
                '--primary-color': '#4361ee',
                '--secondary-color': '#3f37c9'
            },
            dark: {
                '--bg-color': '#1a1a2e',
                '--card-bg': '#16213e',
                '--text-color': '#eeeeee',
                '--border-color': '#0f3460',
                '--primary-color': '#6c63ff',
                '--secondary-color': '#5a52d5'
            }
        };
        
        const theme = themes[themeName] || themes.light;
        for (const [property, value] of Object.entries(theme)) {
            document.documentElement.style.setProperty(property, value);
        }
        document.body.className = themeName;
        
        // Resetear variables de fecha si es necesario
        document.documentElement.style.setProperty('--danger-color', '#dc3545');
        document.documentElement.style.setProperty('--urgent-color', '#ff6b6b');
        document.documentElement.style.setProperty('--warning-color', '#ffc107');
        document.documentElement.style.setProperty('--success-color', '#28a745');
    }
    
    localStorage.setItem('selectedTheme', themeName);
}

// Asegurar que los colores de fecha se actualicen al cambiar tema
function updateDeadlineColors() {
    const computedStyle = getComputedStyle(document.documentElement);
    const vencidoColor = computedStyle.getPropertyValue('--danger-color').trim();
    const urgenteColor = computedStyle.getPropertyValue('--urgent-color').trim();
    const proximoColor = computedStyle.getPropertyValue('--warning-color').trim();
    const normalColor = computedStyle.getPropertyValue('--success-color').trim();
    
    let styleTag = document.getElementById('deadline-colors');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'deadline-colors';
        document.head.appendChild(styleTag);
    }
    
    styleTag.textContent = `
        .deadline-badge.vencido { background: ${vencidoColor}; color: white; }
        .deadline-badge.urgente { background: ${urgenteColor}; color: white; }
        .deadline-badge.proximo { background: ${proximoColor}; color: #333; }
        .request-card.deadline-vencido { border-left-color: ${vencidoColor}; }
        .request-card.deadline-urgente { border-left-color: ${urgenteColor}; }
        .request-card.deadline-proximo { border-left-color: ${proximoColor}; }
        .request-card.deadline-normal { border-left-color: ${normalColor}; }
        @keyframes pulseOrange {
            0%, 100% { box-shadow: 0 2px 4px ${urgenteColor}33; }
            50% { box-shadow: 0 4px 12px ${urgenteColor}66; }
        }
    `;
}

// Modificar la función applyTheme para que actualice los colores de fecha
const originalApplyTheme = applyTheme;
applyTheme = function(themeName) {
    originalApplyTheme(themeName);
    updateDeadlineColors();
};

// Modificar saveThemeFromForm para que actualice los colores
const originalSaveTheme = saveThemeFromForm;
saveThemeFromForm = function() {
    originalSaveTheme();
    updateDeadlineColors();
};

function setupCustomizationModal() {
    const modal = document.getElementById('customizeModal');
    const customizeBtn = document.getElementById('customizeThemeBtn');
    const closeBtn = modal.querySelector('.close');
    const resetBtn = document.getElementById('resetCustomTheme');
    const exportBtn = document.getElementById('exportThemeBtn');
    const importBtn = document.getElementById('importThemeBtn');
    const importFile = document.getElementById('importThemeFile');
    
    // Abrir modal
    if (customizeBtn) {
        customizeBtn.onclick = () => {
            loadCurrentThemeToForm();
            modal.style.display = 'block';
        };
    }
    
    // Cerrar modal
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    // ============ CAMBIOS AUTOMÁTICOS EN TIEMPO REAL ============
    
    // Función para aplicar cambios instantáneamente
    function applyInstantChange(property, value) {
        document.documentElement.style.setProperty(property, value);
        // Guardar automáticamente después de cada cambio
        saveCurrentThemeAutomatically();
        // Actualizar colores de fecha
        updateDeadlineColors();
    }
    
    // Guardar tema automáticamente
    function saveCurrentThemeAutomatically() {
        const computedStyle = getComputedStyle(document.documentElement);
        customTheme = {
            '--primary-color': computedStyle.getPropertyValue('--primary-color').trim() || document.getElementById('customPrimaryColor')?.value || '#4361ee',
            '--secondary-color': computedStyle.getPropertyValue('--secondary-color').trim() || document.getElementById('customSecondaryColor')?.value || '#3f37c9',
            '--bg-color': computedStyle.getPropertyValue('--bg-color').trim() || document.getElementById('customBgColor')?.value || '#f8f9fa',
            '--card-bg': computedStyle.getPropertyValue('--card-bg').trim() || document.getElementById('customCardBgColor')?.value || '#ffffff',
            '--text-color': computedStyle.getPropertyValue('--text-color').trim() || document.getElementById('customTextColor')?.value || '#212529',
            '--border-color': computedStyle.getPropertyValue('--border-color').trim() || document.getElementById('customBorderColor')?.value || '#dee2e6',
            '--border-radius': computedStyle.getPropertyValue('--border-radius').trim() || document.getElementById('customBorderRadius')?.value + 'px' || '12px',
            '--font-family': computedStyle.getPropertyValue('--font-family').trim() || document.getElementById('customFontFamily')?.value || "'Segoe UI', system-ui",
            '--danger-color': computedStyle.getPropertyValue('--danger-color').trim() || document.getElementById('customVencidoColor')?.value || '#dc3545',
            '--urgent-color': computedStyle.getPropertyValue('--urgent-color').trim() || document.getElementById('customUrgenteColor')?.value || '#ff6b6b',
            '--warning-color': computedStyle.getPropertyValue('--warning-color').trim() || document.getElementById('customProximoColor')?.value || '#ffc107',
            '--success-color': computedStyle.getPropertyValue('--success-color').trim() || document.getElementById('customNormalColor')?.value || '#28a745'
        };
        saveThemeToLocalStorage();
        // Cambiar a tema personalizado automáticamente
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect && themeSelect.value !== 'custom') {
            themeSelect.value = 'custom';
        }
        document.body.className = 'custom';
    }
    
    // 1. Color primario
    const primaryColor = document.getElementById('customPrimaryColor');
    if (primaryColor) {
        primaryColor.addEventListener('input', (e) => {
            applyInstantChange('--primary-color', e.target.value);
            // También actualizar el color de los botones
            const btns = document.querySelectorAll('button');
            btns.forEach(btn => {
                if (!btn.classList.contains('preview-btn') && !btn.classList.contains('small-btn')) {
                    btn.style.backgroundColor = e.target.value;
                }
            });
        });
    }
    
    // 2. Color secundario
    const secondaryColor = document.getElementById('customSecondaryColor');
    if (secondaryColor) {
        secondaryColor.addEventListener('input', (e) => {
            applyInstantChange('--secondary-color', e.target.value);
        });
    }
    
    // 3. Color de fondo principal
    const bgColor = document.getElementById('customBgColor');
    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            applyInstantChange('--bg-color', e.target.value);
            document.body.style.backgroundColor = e.target.value;
        });
    }
    
    // 4. Color de fondo de tarjetas
    const cardBgColor = document.getElementById('customCardBgColor');
    if (cardBgColor) {
        cardBgColor.addEventListener('input', (e) => {
            applyInstantChange('--card-bg', e.target.value);
            // Actualizar tarjetas existentes
            document.querySelectorAll('.request-card, .form-section, .requests-section, .modal-content').forEach(el => {
                el.style.backgroundColor = e.target.value;
            });
        });
    }
    
    // 5. Color de texto
    const textColor = document.getElementById('customTextColor');
    if (textColor) {
        textColor.addEventListener('input', (e) => {
            applyInstantChange('--text-color', e.target.value);
            document.body.style.color = e.target.value;
        });
    }
    
    // 6. Color de bordes
    const borderColor = document.getElementById('customBorderColor');
    if (borderColor) {
        borderColor.addEventListener('input', (e) => {
            applyInstantChange('--border-color', e.target.value);
        });
    }
    
    // 7. Border radius (redondez)
    const borderRadius = document.getElementById('customBorderRadius');
    const radiusValue = document.getElementById('borderRadiusValue');
    if (borderRadius && radiusValue) {
        borderRadius.addEventListener('input', (e) => {
            const value = e.target.value + 'px';
            radiusValue.textContent = e.target.value;
            applyInstantChange('--border-radius', value);
            // Aplicar a elementos específicos
            const elements = document.querySelectorAll('.form-section, .requests-section, .request-card, .modal-content, button, input, select, textarea');
            elements.forEach(el => {
                el.style.borderRadius = value;
            });
        });
    }
    
    // 8. Fuente
    const fontFamily = document.getElementById('customFontFamily');
    if (fontFamily) {
        fontFamily.addEventListener('change', (e) => {
            applyInstantChange('--font-family', e.target.value);
            document.body.style.fontFamily = e.target.value;
        });
    }
    
    // 9. Color vencido
    const vencidoColor = document.getElementById('customVencidoColor');
    if (vencidoColor) {
        vencidoColor.addEventListener('input', (e) => {
            applyInstantChange('--danger-color', e.target.value);
            updateDeadlineColors();
            // Actualizar elementos visibles
            document.querySelectorAll('.deadline-badge.vencido, .request-card.deadline-vencido').forEach(el => {
                if (el.classList.contains('deadline-badge')) {
                    el.style.backgroundColor = e.target.value;
                } else {
                    el.style.borderLeftColor = e.target.value;
                }
            });
        });
    }
    
    // 10. Color urgente
    const urgenteColor = document.getElementById('customUrgenteColor');
    if (urgenteColor) {
        urgenteColor.addEventListener('input', (e) => {
            applyInstantChange('--urgent-color', e.target.value);
            updateDeadlineColors();
            document.querySelectorAll('.deadline-badge.urgente, .request-card.deadline-urgente').forEach(el => {
                if (el.classList.contains('deadline-badge')) {
                    el.style.backgroundColor = e.target.value;
                } else {
                    el.style.borderLeftColor = e.target.value;
                }
            });
        });
    }
    
    // 11. Color próximo
    const proximoColor = document.getElementById('customProximoColor');
    if (proximoColor) {
        proximoColor.addEventListener('input', (e) => {
            applyInstantChange('--warning-color', e.target.value);
            updateDeadlineColors();
            document.querySelectorAll('.deadline-badge.proximo, .request-card.deadline-proximo').forEach(el => {
                if (el.classList.contains('deadline-badge')) {
                    el.style.backgroundColor = e.target.value;
                } else {
                    el.style.borderLeftColor = e.target.value;
                }
            });
        });
    }
    
    // 12. Color normal
    const normalColor = document.getElementById('customNormalColor');
    if (normalColor) {
        normalColor.addEventListener('input', (e) => {
            applyInstantChange('--success-color', e.target.value);
            updateDeadlineColors();
            document.querySelectorAll('.request-card.deadline-normal').forEach(el => {
                el.style.borderLeftColor = e.target.value;
            });
        });
    }
    
    // Resetear tema
    if (resetBtn) {
        resetBtn.onclick = () => {
            customTheme = getDefaultTheme();
            // Aplicar todos los cambios
            for (const [property, value] of Object.entries(customTheme)) {
                document.documentElement.style.setProperty(property, value);
            }
            saveThemeToLocalStorage();
            loadCurrentThemeToForm();
            updateDeadlineColors();
            showNotification('Tema restablecido a valores por defecto', 'success');
            // Forzar renderizado
            renderRequests();
        };
    }
    
    // Exportar tema
    if (exportBtn) {
        exportBtn.onclick = () => {
            const themeData = {
                name: 'Mi Tema Personalizado',
                version: '1.0',
                created: new Date().toISOString(),
                theme: customTheme
            };
            const jsonString = JSON.stringify(themeData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tema_personalizado_${new Date().toISOString().slice(0,19)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Tema exportado correctamente', 'success');
        };
    }
    
    // Importar tema
    if (importBtn) {
        importBtn.onclick = () => importFile.click();
    }
    
    if (importFile) {
        importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (imported.theme) {
                        customTheme = imported.theme;
                        // Aplicar todos los cambios
                        for (const [property, value] of Object.entries(customTheme)) {
                            document.documentElement.style.setProperty(property, value);
                        }
                        saveThemeToLocalStorage();
                        loadCurrentThemeToForm();
                        updateDeadlineColors();
                        showNotification('Tema importado correctamente', 'success');
                        // Cambiar a tema personalizado
                        const themeSelect = document.getElementById('themeSelect');
                        if (themeSelect) themeSelect.value = 'custom';
                        document.body.className = 'custom';
                        renderRequests();
                    } else {
                        showNotification('Archivo de tema inválido', 'error');
                    }
                } catch (error) {
                    showNotification('Error al importar tema', 'error');
                }
                importFile.value = '';
            };
            reader.readAsText(file);
        };
    }
    
    // Cerrar modal con click fuera
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function loadCurrentThemeToForm() {
    const computedStyle = getComputedStyle(document.documentElement);
    
    const primaryInput = document.getElementById('customPrimaryColor');
    if (primaryInput) primaryInput.value = rgbToHex(computedStyle.getPropertyValue('--primary-color')) || '#4361ee';
    
    const secondaryInput = document.getElementById('customSecondaryColor');
    if (secondaryInput) secondaryInput.value = rgbToHex(computedStyle.getPropertyValue('--secondary-color')) || '#3f37c9';
    
    const bgInput = document.getElementById('customBgColor');
    if (bgInput) bgInput.value = rgbToHex(computedStyle.getPropertyValue('--bg-color')) || '#f8f9fa';
    
    const cardBgInput = document.getElementById('customCardBgColor');
    if (cardBgInput) cardBgInput.value = rgbToHex(computedStyle.getPropertyValue('--card-bg')) || '#ffffff';
    
    const textInput = document.getElementById('customTextColor');
    if (textInput) textInput.value = rgbToHex(computedStyle.getPropertyValue('--text-color')) || '#212529';
    
    const borderInput = document.getElementById('customBorderColor');
    if (borderInput) borderInput.value = rgbToHex(computedStyle.getPropertyValue('--border-color')) || '#dee2e6';
    
    const radiusInput = document.getElementById('customBorderRadius');
    const radiusSpan = document.getElementById('borderRadiusValue');
    if (radiusInput && radiusSpan) {
        const borderRadius = computedStyle.getPropertyValue('--border-radius').replace('px', '');
        radiusInput.value = parseInt(borderRadius) || 12;
        radiusSpan.textContent = parseInt(borderRadius) || 12;
    }
    
    const fontSelect = document.getElementById('customFontFamily');
    if (fontSelect) {
        const fontFamily = computedStyle.getPropertyValue('--font-family').replace(/'/g, '');
        for(let i = 0; i < fontSelect.options.length; i++) {
            if (fontSelect.options[i].value.replace(/'/g, '') === fontFamily) {
                fontSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    const vencidoInput = document.getElementById('customVencidoColor');
    if (vencidoInput) vencidoInput.value = rgbToHex(computedStyle.getPropertyValue('--danger-color')) || '#dc3545';
    
    const urgenteInput = document.getElementById('customUrgenteColor');
    if (urgenteInput) urgenteInput.value = rgbToHex(computedStyle.getPropertyValue('--urgent-color')) || '#ff6b6b';
    
    const proximoInput = document.getElementById('customProximoColor');
    if (proximoInput) proximoInput.value = rgbToHex(computedStyle.getPropertyValue('--warning-color')) || '#ffc107';
    
    const normalInput = document.getElementById('customNormalColor');
    if (normalInput) normalInput.value = rgbToHex(computedStyle.getPropertyValue('--success-color')) || '#28a745';
}

function rgbToHex(rgb) {
    if (!rgb || rgb === '') return null;
    
    // Si ya es hex
    if (rgb.startsWith('#')) return rgb;
    
    // Convertir rgb(r,g,b) a hex
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        return '#' + ((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3])).toString(16).slice(1);
    }
    
    return null;
}

function saveThemeFromForm() {
    customTheme = {
        '--primary-color': document.getElementById('customPrimaryColor').value,
        '--secondary-color': document.getElementById('customSecondaryColor').value,
        '--bg-color': document.getElementById('customBgColor').value,
        '--card-bg': document.getElementById('customCardBgColor').value,
        '--text-color': document.getElementById('customTextColor').value,
        '--border-color': document.getElementById('customBorderColor').value,
        '--border-radius': document.getElementById('customBorderRadius').value + 'px',
        '--font-family': document.getElementById('customFontFamily').value,
        '--danger-color': document.getElementById('customVencidoColor').value,
        '--urgent-color': document.getElementById('customUrgenteColor').value,
        '--warning-color': document.getElementById('customProximoColor').value,
        '--success-color': document.getElementById('customNormalColor').value
    };
    
    saveThemeToLocalStorage();
}

function saveThemeToLocalStorage() {
    localStorage.setItem('customTheme', JSON.stringify(customTheme));
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
    
    // Configurar modales
    setupModal();
    setupCustomizationModal();
    
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
    const closeBtn = document.querySelector('#designTypeModal .close');
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
    
    const searchTerm = (searchInput && searchInput.value) ? searchInput.value.toLowerCase() : '';
    const filterStatus = (statusFilter && statusFilter.value) ? statusFilter.value : 'todas';
    const filterDeadline = (deadlineFilter && deadlineFilter.value) ? deadlineFilter.value : 'todas';
    
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
    
    filtered.sort((a, b) => {
        const dateA = a.deliveryDate ? new Date(a.deliveryDate) : new Date(8640000000000000);
        const dateB = b.deliveryDate ? new Date(b.deliveryDate) : new Date(8640000000000000);
        return dateA - dateB;
    });
    
    if (requestCount) {
        requestCount.textContent = `(${filtered.length})`;
    }
    
    if (filtered.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <p>📭 No hay solicitudes</p>
                <small>Crea una nueva solicitud usando el formulario</small>
            </div>
        `;
        return;
    }
    
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
    
    attachDynamicEvents();
}

function attachDynamicEvents() {
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
    
    document.getElementById('clientName').value = request.clientName || '';
    document.getElementById('projectName').value = request.projectName || '';
    document.getElementById('designType').value = request.designType || '';
    document.getElementById('description').value = request.description || '';
    document.getElementById('deliveryDate').value = request.deliveryDate || '';
    document.getElementById('priority').value = request.priority || 'media';
    
    validateDate();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '✏️ Actualizar Solicitud';
        submitBtn.style.backgroundColor = '#ffc107';
    }
    
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showNotification('Editando solicitud - Modifica los campos y actualiza', 'info');
}

function handleSubmit(e) {
    e.preventDefault();
    
    const clientName = document.getElementById('clientName').value.trim();
    const projectName = document.getElementById('projectName').value.trim();
    const designType = document.getElementById('designType').value;
    const description = document.getElementById('description').value.trim();
    const deliveryDate = document.getElementById('deliveryDate').value;
    const priority = document.getElementById('priority').value;
    
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
    
    const selectedDate = new Date(deliveryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification('⚠️ La fecha límite no puede ser anterior a hoy', 'warning');
        return;
    }
    
    if (currentEditId) {
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
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = '📤 Enviar Solicitud';
                submitBtn.style.backgroundColor = '';
            }
        }
    } else {
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
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    } else {
        applyTheme('light');
    }
    
    themeSelect.addEventListener('change', function(e) {
        applyTheme(e.target.value);
        localStorage.setItem('selectedTheme', e.target.value);
    });
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
        
        .customize-modal {
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .customize-section {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .customize-section h3 {
            margin-bottom: 15px;
            font-size: 16px;
            color: var(--primary-color);
        }
        
        .color-control {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        
        .color-control label {
            width: 120px;
            font-size: 14px;
        }
        
        .color-control input[type="color"] {
            width: 60px;
            height: 40px;
            padding: 2px;
            cursor: pointer;
        }
        
        .preview-btn {
            width: auto;
            padding: 5px 10px;
            font-size: 12px;
            background: var(--primary-color);
            margin: 0;
        }
        
        .range-control {
            margin-bottom: 10px;
        }
        
        .range-control label {
            display: block;
            margin-bottom: 5px;
        }
        
        .range-control input {
            width: 100%;
        }
        
        .select-control {
            margin-bottom: 10px;
        }
        
        .select-control label {
            display: block;
            margin-bottom: 5px;
        }
        
        .customize-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .apply-btn {
            background: #28a745;
            color: white;
            flex: 1;
        }
        
        .reset-btn {
            background: #ffc107;
            color: #333;
            flex: 1;
        }
        
        .export-theme-btn, .import-theme-btn {
            background: #17a2b8;
            color: white;
            flex: 1;
        }
        
        .customize-btn {
            background: #6c757d;
            margin-left: 10px;
            width: auto;
            padding: 5px 10px;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);
}

// Actualizar colores automáticamente cada hora
setInterval(() => {
    renderRequests();
}, 3600000);