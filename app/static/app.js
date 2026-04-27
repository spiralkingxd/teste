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
        recordBtn: document.getElementById('record-btn'),
        processingIndicator: document.getElementById('processing-indicator'),
        
        // Configurações
        configForm: document.getElementById('config-form'),
        baseUrlInput: document.getElementById('base-url'),
        modelInput: document.getElementById('model'),
        apiKeyInput: document.getElementById('api-key'),
        temperatureInput: document.getElementById('temperature'),
        tempValue: document.getElementById('temp-value'),
        maxTokensInput: document.getElementById('max-tokens'),
        feedback: document.getElementById('feedback'),
        
        // STT Settings
        sttModel: document.getElementById('stt-model'),
        sttCompute: document.getElementById('stt-compute'),
        sttBeam: document.getElementById('stt-beam'),
        sttBeamVal: document.getElementById('val-beam'),
        sttAutoLang: document.getElementById('stt-auto-lang'),
        btnSaveStt: document.getElementById('btn-save-stt'),
        btnUnloadStt: document.getElementById('btn-unload-stt'),
        sttStatus: document.getElementById('stt-status')
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

    // ==========================================
    // SPEECH-TO-TEXT (STT)
    // ==========================================
    
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    
    /**
     * Inicia gravação de áudio
     */
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const wavBuffer = await convertToWav(audioBlob);
                sendToStt(wavBuffer);
            };

            mediaRecorder.start();
            isRecording = true;
            if (elements.recordBtn) {
                elements.recordBtn.classList.add('recording');
                elements.recordBtn.title = "Parar gravação";
            }
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            showFeedback("Permissão de microfone negada ou erro de hardware.", "error");
        }
    }
    
    /**
     * Para gravação de áudio
     */
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            isRecording = false;
            if (elements.recordBtn) {
                elements.recordBtn.classList.remove('recording');
                elements.recordBtn.classList.add('processing');
                elements.recordBtn.title = "Processando...";
            }
        }
    }
    
    /**
     * Converte blob de áudio para WAV 16kHz mono
     */
    async function convertToWav(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const wavBuffer = encodeWAV(channelData, audioContext.sampleRate);
        
        audioContext.close();
        return wavBuffer;
    }
    
    /**
     * Codifica amostras de áudio em formato WAV
     */
    function encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);
        
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
        
        return new Uint8Array(buffer);
    }
    
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    /**
     * Envia áudio para transcrição no backend
     */
    async function sendToStt(wavBuffer) {
        const formData = new FormData();
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        formData.append('file', blob, 'recording.wav');
        
        const config = getSttConfigFromUI();
        formData.append('config', JSON.stringify(config));

        try {
            const response = await fetch('/api/stt/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Falha na transcrição');
            
            const result = await response.json();
            
            if (result.text && elements.userInput) {
                elements.userInput.value = result.text;
                elements.userInput.focus();
                showFeedback(`Transcrito (${result.language}): ${result.text.substring(0, 50)}...`, "success");
            } else {
                showFeedback("Nenhum áudio detectado.", "error");
            }
        } catch (error) {
            console.error(error);
            showFeedback("Erro ao transcrever áudio. Verifique configurações.", "error");
        } finally {
            if (elements.recordBtn) {
                elements.recordBtn.classList.remove('processing');
                elements.recordBtn.title = "Clique para falar";
            }
        }
    }
    
    function getSttConfigFromUI() {
        return {
            model_size: elements.sttModel?.value || 'base',
            compute_type: elements.sttCompute?.value || 'default',
            beam_size: parseInt(elements.sttBeam?.value) || 5,
            language: elements.sttAutoLang?.checked ? 'auto' : 'pt',
            temperature: 0.0
        };
    }
    
    function saveSttSettings() {
        const config = getSttConfigFromUI();
        localStorage.setItem('shogun_stt_config', JSON.stringify(config));
    }
    
    function loadSttSettings() {
        const saved = localStorage.getItem('shogun_stt_config');
        if (saved) {
            const config = JSON.parse(saved);
            if (elements.sttModel) elements.sttModel.value = config.model_size || 'base';
            if (elements.sttCompute) elements.sttCompute.value = config.compute_type || 'default';
            if (elements.sttBeam) {
                elements.sttBeam.value = config.beam_size || 5;
                if (elements.sttBeamVal) elements.sttBeamVal.textContent = config.beam_size || 5;
            }
            if (elements.sttAutoLang) elements.sttAutoLang.checked = config.auto_lang !== false;
        }
    }
    
    function updateSttStatus(loaded, modelName, error = false) {
        if (!elements.sttStatus) return;
        
        const textSpan = elements.sttStatus.querySelector('.text');
        elements.sttStatus.className = 'status-indicator';
        
        if (error) {
            elements.sttStatus.classList.add('error');
            textSpan.textContent = "Erro de conexão ❌";
        } else if (loaded) {
            elements.sttStatus.classList.add('loaded');
            textSpan.textContent = `Modelo carregado: ${modelName} ✅`;
        } else {
            elements.sttStatus.classList.add('waiting');
            textSpan.textContent = "Aguardando uso ⏳";
        }
    }
    
    async function checkSttStatus() {
        try {
            const res = await fetch('/api/stt/status');
            const data = await res.json();
            updateSttStatus(data.loaded, data.model_size);
        } catch (e) {
            updateSttStatus(false, null, true);
        }
    }
    
    function initStt() {
        if (elements.sttBeam && elements.sttBeamVal) {
            elements.sttBeam.addEventListener('input', (e) => {
                elements.sttBeamVal.textContent = e.target.value;
            });
        }
        
        if (elements.recordBtn) {
            elements.recordBtn.addEventListener('click', () => {
                if (isRecording) {
                    stopRecording();
                } else {
                    startRecording();
                }
            });
        }
        
        if (elements.btnSaveStt) {
            elements.btnSaveStt.addEventListener('click', () => {
                saveSttSettings();
                checkSttStatus();
                showFeedback("Configurações de STT salvas!", "success");
            });
        }
        
        if (elements.btnUnloadStt) {
            elements.btnUnloadStt.addEventListener('click', async () => {
                await fetch('/api/stt/unload', { method: 'POST' });
                updateSttStatus(false, null);
                showFeedback("Modelo descarregado da memória.", "success");
            });
        }
        
        loadSttSettings();
        checkSttStatus();
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
        initStt();  // Inicializa STT
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
