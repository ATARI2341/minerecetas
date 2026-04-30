// Configuración de estilos personalizables
const StyleConfig = {
    themes: {
        light: {
            '--primary-color': '#4361ee',
            '--bg-color': '#f8f9fa',
            '--card-bg': '#ffffff',
            '--text-color': '#212529',
            '--border-radius': '12px'
        },
        dark: {
            '--primary-color': '#6c63ff',
            '--bg-color': '#121212',
            '--card-bg': '#1e1e2f',
            '--text-color': '#e0e0e0',
            '--border-radius': '12px'
        },
        custom: {
            '--primary-color': '#e63946',
            '--bg-color': '#f1faee',
            '--card-bg': '#a8dadc',
            '--text-color': '#1d3557',
            '--border-radius': '20px'
        }
    },
    
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        for (const [property, value] of Object.entries(theme)) {
            document.documentElement.style.setProperty(property, value);
        }
        
        // Cambiar clase del body para estilos adicionales
        document.body.className = themeName;
        localStorage.setItem('selectedTheme', themeName);
    },
    
    loadSavedTheme() {
        const saved = localStorage.getItem('selectedTheme') || 'light';
        this.applyTheme(saved);
        document.getElementById('themeSelect').value = saved;
    }
};

// Exportar para usar en app.js (si usas módulos)
if (typeof module !== 'undefined') module.exports = StyleConfig;