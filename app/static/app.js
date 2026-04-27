/**
 * Aplicação de Chat IA - Lógica JavaScript
 * Módulo IIFE para evitar poluição do escopo global
 */
(function() {
    'use strict';

    // ==========================================
    // GERENCIAMENTO DE TEMA (DARK MODE)
    // ==========================================
    
    const THEME_KEY = 'ai_assistant_theme';
    const body = document.getElementById('app-body') || document.body;
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    /**
     * Inicializa o tema baseado no localStorage ou preferência do sistema
     */
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    }
    
    /**
     * Alterna entre tema claro e escuro
     */
    function toggleTheme() {
        const isDark = body.classList.toggle('dark-mode');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }
    
    // Inicializa tema imediatamente e adiciona listener
    initTheme();
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // ==========================================
    // ESTADO DA APLICAÇÃO
    // ==========================================
    
    // Histórico da sessão no formato OpenAI messages
    let sessionHistory = [];
    
    // Elementos do DOM
    const elements = {
        // Sidemenu
        sidemenuBtns: document.querySelectorAll('.sidemenu-btn'),
        panels: document.querySelectorAll('.panel'),
        
        // Chat
        chatBox: document.getElementById('chat-box'),
        userInput: document.getElementById('user-input'),
        sendBtn: document.getElementById('send-btn'),
        processingIndicator: document.getElementById('processing-indicator'),
        
        // Configurações
        configForm: document.getElementById('config-form'),
        baseUrlInput: document.getElementById('base-url'),
        modelInput: document.getElementById('model'),
        apiKeyInput: document.getElementById('api-key'),
        temperatureInput: document.getElementById('temperature'),
        tempValue: document.getElementById('temp-value'),
        maxTokensInput: document.getElementById('max-tokens'),
        feedback: document.getElementById('feedback')
    };

    // ==========================================
    // FUNÇÕES DE UTILIDADE
    // ==========================================
    
    /**
     * Valida se uma URL é válida
     * @param {string} url - URL para validar
     * @returns {boolean} - True se válida
     */
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Mostra feedback visual para o usuário
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo: 'success' ou 'error'
     */
    function showFeedback(message, type) {
        if (!elements.feedback) return;
        
        elements.feedback.textContent = message;
        elements.feedback.className = 'feedback ' + type;
        
        // Limpa feedback após 5 segundos
        setTimeout(() => {
            elements.feedback.className = 'feedback empty';
            elements.feedback.textContent = '';
        }, 5000);
    }

    // ==========================================
    // CONTROLE DE NAVEGAÇÃO (SIDEMENU)
    // ==========================================
    
    /**
     * Troca entre os painéis Chat e Configurações
     * @param {string} panelName - Nome do painel: 'chat' ou 'config'
     */
    function switchPanel(panelName) {
        // Atualiza botões da sidemenu
        elements.sidemenuBtns.forEach(btn => {
            const isActive = btn.dataset.panel === panelName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });
        
        // Atualiza painéis
        elements.panels.forEach(panel => {
            const isActive = panel.id === (panelName + '-panel');
            panel.classList.toggle('active', isActive);
        });
        
        // Foca no input se for painel de chat
        if (panelName === 'chat' && elements.userInput) {
            elements.userInput.focus();
        }
    }

    /**
     * Inicializa os eventos da sidemenu
     */
    function initSidemenu() {
        elements.sidemenuBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const panelName = btn.dataset.panel;
                switchPanel(panelName);
            });
        });
    }

    // ==========================================
    // GERENCIAMENTO DE CONFIGURAÇÕES
    // ==========================================
    
    /**
     * Carrega configurações do backend ao iniciar
     */
    async function loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) throw new Error('Erro ao carregar configurações');
            
            const config = await response.json();
            
            // Preenche formulário
            if (elements.baseUrlInput) elements.baseUrlInput.value = config.base_url || '';
            if (elements.modelInput) elements.modelInput.value = config.model || '';
            if (elements.apiKeyInput) elements.apiKeyInput.value = config.api_key || '';
            if (elements.temperatureInput) {
                elements.temperatureInput.value = config.temperature || 0.7;
                if (elements.tempValue) {
                    elements.tempValue.textContent = config.temperature || 0.7;
                }
            }
            if (elements.maxTokensInput) elements.maxTokensInput.value = config.max_tokens || 1024;
            
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            showFeedback('Erro ao carregar configurações. Usando valores padrão.', 'error');
        }
    }

    /**
     * Salva configurações no backend
     * @param {Event} e - Evento de submit
     */
    async function saveConfig(e) {
        e.preventDefault();
        
        const config = {
            base_url: elements.baseUrlInput?.value.trim(),
            model: elements.modelInput?.value.trim(),
            api_key: elements.apiKeyInput?.value.trim(),
            temperature: parseFloat(elements.temperatureInput?.value) || 0.7,
            max_tokens: parseInt(elements.maxTokensInput?.value) || 1024
        };
        
        // Validações
        if (!config.base_url || !isValidUrl(config.base_url)) {
            showFeedback('Base URL inválida. Verifique o formato.', 'error');
            return;
        }
        
        if (!config.model) {
            showFeedback('Modelo é obrigatório.', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'ok') {
                showFeedback('Configurações salvas com sucesso!', 'success');
            } else {
                throw new Error(result.detail || 'Erro ao salvar');
            }
            
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            showFeedback('Erro ao salvar configurações: ' + error.message, 'error');
        }
    }

    /**
     * Inicializa eventos do formulário de configurações
     */
    function initConfigForm() {
        // Atualiza valor da temperatura em tempo real
        if (elements.temperatureInput) {
            elements.temperatureInput.addEventListener('input', (e) => {
                if (elements.tempValue) {
                    elements.tempValue.textContent = e.target.value;
                }
            });
        }
        
        // Submit do formulário
        if (elements.configForm) {
            elements.configForm.addEventListener('submit', saveConfig);
        }
    }

    // ==========================================
    // LÓGICA DO CHAT
    // ==========================================
    
    /**
     * Adiciona mensagem ao chat visualmente
     * @param {string} text - Texto da mensagem
     * @param {string} role - 'user' ou 'assistant'
     */
    function addMessageToChat(text, role) {
        if (!elements.chatBox) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message msg-' + role;
        messageDiv.textContent = text;
        
        elements.chatBox.appendChild(messageDiv);
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    /**
     * Envia mensagem para a API de chat
     */
    async function sendMessage() {
        const message = elements.userInput?.value.trim();
        if (!message) return;
        
        // Adiciona mensagem do usuário ao histórico e ao chat
        sessionHistory.push({ role: 'user', content: message });
        addMessageToChat(message, 'user');
        
        // Limpa input e desabilita
        if (elements.userInput) elements.userInput.value = '';
        toggleChatDisabled(true);
        
        // Mostra indicador de processamento
        if (elements.processingIndicator) {
            elements.processingIndicator.classList.remove('hidden');
        }
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: sessionHistory })
            });
            
            const result = await response.json();
            
            if (response.ok && result.reply) {
                // Adiciona resposta ao chat e histórico
                addMessageToChat(result.reply, 'assistant');
                sessionHistory.push({ role: 'assistant', content: result.reply });
            } else {
                throw new Error(result.error || 'Erro na resposta da IA');
            }
            
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            addMessageToChat('⚠️ Erro: ' + error.message + '. Verifique sua conexão e configurações.', 'assistant');
        } finally {
            // Restaura estado
            toggleChatDisabled(false);
            if (elements.processingIndicator) {
                elements.processingIndicator.classList.add('hidden');
            }
            if (elements.userInput) {
                elements.userInput.focus();
            }
        }
    }

    /**
     * Habilita/desabilita controles do chat
     * @param {boolean} disabled - Estado de desabilitado
     */
    function toggleChatDisabled(disabled) {
        if (elements.userInput) elements.userInput.disabled = disabled;
        if (elements.sendBtn) elements.sendBtn.disabled = disabled;
    }

    /**
     * Inicializa eventos do chat
     */
    function initChat() {
        // Clique no botão enviar
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', sendMessage);
        }
        
        // Enter no input
        if (elements.userInput) {
            elements.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================
    
    /**
     * Inicializa toda a aplicação quando o DOM estiver pronto
     */
    function init() {
        // Verifica se todos os elementos necessários existem
        if (!elements.chatBox || !elements.userInput || !elements.sendBtn) {
            console.error('Elementos essenciais do chat não encontrados');
            return;
        }
        
        // Inicializa componentes
        initSidemenu();
        initConfigForm();
        initChat();
        
        // Carrega configurações salvas
        loadConfig();
        
        console.log('Aplicação de Chat IA inicializada com sucesso!');
    }

    // Inicia quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
