// ============= CUSTOM JAVASCRIPT EDITOR =============

// Global variables for JS editor
let customJSModal;
let jsModalOverlay;
let showCustomJSBtn;
let closeCustomJSBtn;
let customJSInput;
let saveCustomJSBtn;
let clearCustomJSBtn;
let previewJSBtn;

// Initialize the JS editor
function initJSEditor() {
    // Create modal elements if they don't exist
    createJSModal();
    
    // Get DOM elements
    customJSModal = document.getElementById('customJSModal');
    jsModalOverlay = document.getElementById('jsModalOverlay');
    showCustomJSBtn = document.getElementById('showCustomJS');
    closeCustomJSBtn = document.getElementById('closeCustomJS');
    customJSInput = document.getElementById('customJSInput');
    saveCustomJSBtn = document.getElementById('saveCustomJS');
    clearCustomJSBtn = document.getElementById('clearCustomJS');
    previewJSBtn = document.getElementById('previewJS');
    
    // Add event listeners
    if (showCustomJSBtn) {
        showCustomJSBtn.addEventListener('click', openCustomJSModal);
    }
    
    if (closeCustomJSBtn) {
        closeCustomJSBtn.addEventListener('click', closeCustomJSModal);
    }
    
    if (jsModalOverlay) {
        jsModalOverlay.addEventListener('click', closeCustomJSModal);
    }
    
    if (saveCustomJSBtn) {
        saveCustomJSBtn.addEventListener('click', saveCustomJS);
    }
    
    if (clearCustomJSBtn) {
        clearCustomJSBtn.addEventListener('click', clearCustomJS);
    }
    
    if (previewJSBtn) {
        previewJSBtn.addEventListener('click', previewCustomJS);
    }
    
    // Load saved JS
    loadCustomJS();
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && customJSModal && customJSModal.classList.contains('active')) {
            closeCustomJSModal();
        }
    });
    
    console.log('Custom JS Editor initialized');
}

// Create the JS modal HTML
function createJSModal() {
    // Check if modal already exists
    if (document.getElementById('customJSModal')) return;
    
    const modalHTML = `
        <div class="custom-css-modal" id="customJSModal">
            <div class="custom-css-header">
                <h3><i class="fas fa-code"></i> Custom JavaScript Editor</h3>
                <button class="close-modal" id="closeCustomJS">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="custom-css-body">
                <div class="css-actions">
                    <button class="btn btn-secondary" id="previewJS">
                        <i class="fas fa-play"></i> Preview
                    </button>
                    <button class="btn btn-primary" id="saveCustomJS">
                        <i class="fas fa-save"></i> Save JS
                    </button>
                    <button class="btn btn-danger" id="clearCustomJS">
                        <i class="fas fa-trash"></i> Clear
                    </button>
                </div>
                <div class="css-editor-header">
                    <div class="css-examples">
                        <small>JavaScript Examples:</small>
                        <code>console.log('Hello');</code>
                        <code>alert('Welcome!');</code>
                        <code>document.body.style.background = 'red';</code>
                    </div>
                </div>
                <div class="js-warning" style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    <strong>Warning:</strong> Custom JavaScript can break your app. Use with caution!
                </div>
                <textarea id="customJSInput" placeholder="Enter your custom JavaScript here...
Example:
// Change all word colors
document.querySelectorAll('.word').forEach(word => {
    word.style.color = 'red';
});

// Add keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        alert('Custom save shortcut!');
    }
});" rows="15" style="font-family: 'Courier New', monospace;"></textarea>
                <div class="css-info">
                    <small><i class="fas fa-info-circle"></i> Your JS will be executed when the app loads and when you save/preview.</small>
                </div>
            </div>
        </div>
        <div class="css-modal-overlay" id="jsModalOverlay"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Load saved custom JS
function loadCustomJS() {
    const savedJS = localStorage.getItem('customJS') || '';
    if (customJSInput) {
        customJSInput.value = savedJS;
    }
    
    // Auto-execute saved JS on load if it exists
    if (savedJS.trim()) {
        executeCustomJS(savedJS, false);
    }
}

// Execute custom JavaScript
function executeCustomJS(jsCode, showNotification = true) {
    try {
        // Create a new script element
        const scriptId = 'custom-js-script';
        
        // Remove existing custom JS script
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
            existingScript.remove();
        }
        
        // Create new script element
        const script = document.createElement('script');
        script.id = scriptId;
        script.textContent = jsCode;
        
        // Append to head
        document.head.appendChild(script);
        
        if (showNotification) {
            showNotification('JavaScript executed successfully!', 'success');
        }
        
        console.log('Custom JavaScript executed');
        return true;
    } catch (error) {
        console.error('Error executing custom JS:', error);
        if (showNotification) {
            showNotification('Error in custom JavaScript: ' + error.message, 'error');
        }
        return false;
    }
}

// Preview JS without saving
function previewCustomJS() {
    if (!customJSInput) return;
    
    const jsCode = customJSInput.value.trim();
    
    if (jsCode) {
        const success = executeCustomJS(jsCode);
        
        // Show preview notification
        const previewNotification = document.createElement('div');
        previewNotification.textContent = success ? 'JavaScript Preview Applied' : 'JavaScript Preview Failed';
        previewNotification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${success ? 'var(--primary)' : '#ef4444'};
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(previewNotification);
        
        setTimeout(() => {
            previewNotification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => previewNotification.remove(), 300);
        }, 2000);
    } else {
        showNotification('No JavaScript to preview', 'warning');
    }
}

// Save custom JS
function saveCustomJS() {
    if (!customJSInput) return;
    
    const jsCode = customJSInput.value.trim();
    localStorage.setItem('customJS', jsCode);
    
    // Execute the saved JS
    executeCustomJS(jsCode);
    
    showNotification('Custom JavaScript saved successfully!', 'success');
    closeCustomJSModal();
}

// Clear custom JS
function clearCustomJS() {
    if (confirm('Are you sure you want to clear all custom JavaScript?')) {
        if (customJSInput) {
            customJSInput.value = '';
        }
        localStorage.removeItem('customJS');
        
        // Remove the script element
        const existingScript = document.getElementById('custom-js-script');
        if (existingScript) {
            existingScript.remove();
        }
        
        showNotification('Custom JavaScript cleared!', 'success');
    }
}

// Open custom JS modal
function openCustomJSModal() {
    if (customJSModal) {
        customJSModal.classList.add('active');
    }
    if (jsModalOverlay) {
        jsModalOverlay.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
    
    // Focus on textarea
    setTimeout(() => {
        if (customJSInput) {
            customJSInput.focus();
        }
    }, 300);
}

// Close custom JS modal
function closeCustomJSModal() {
    if (customJSModal) {
        customJSModal.classList.remove('active');
    }
    if (jsModalOverlay) {
        jsModalOverlay.classList.remove('active');
    }
    document.body.style.overflow = '';
}

// Add this to the reset function
function extendResetFunction() {
    // Store the original performFullReset if it exists
    const originalPerformFullReset = window.performFullReset;
    
    if (originalPerformFullReset) {
        window.performFullReset = function() {
            // Clear custom JS
            localStorage.removeItem('customJS');
            
            // Remove JS script
            const existingScript = document.getElementById('custom-js-script');
            if (existingScript) {
                existingScript.remove();
            }
            
            // Call original reset
            originalPerformFullReset();
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure settings page is loaded
    setTimeout(() => {
        initJSEditor();
        extendResetFunction();
    }, 500);
});

// Add CSS for JS editor
const jsEditorStyle = document.createElement('style');
jsEditorStyle.textContent = `
    #customJSInput {
        width: 100%;
        min-height: 220px;
        padding: 15px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--input-bg);
        color: var(--text);
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        margin-bottom: 15px;
        transition: border-color 0.3s;
    }
    
    #customJSInput:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.1);
    }
    
    .js-warning {
        background: #fff3cd;
        color: #856404;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 10px;
        border-left: 3px solid #ffc107;
    }
    
    .dark-mode .js-warning {
        background: #4b3d1c;
        color: #ffd966;
        border-left-color: #ffd966;
    }
    
    .js-warning i {
        margin-right: 5px;
    }
`;
document.head.appendChild(jsEditorStyle);

// Export functions for use in other files
window.initJSEditor = initJSEditor;
window.executeCustomJS = executeCustomJS;