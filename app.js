// Configuração do mapa
const map = L.map('map').setView([-22.9068, -43.1729], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let tiroteiosLayer = L.layerGroup().addTo(map);
let retryCount = 0;
const MAX_RETRIES = 2;

// Cores para os marcadores
function getMarkerColor(vitimas) {
    return vitimas > 0 ? '#ff0000' : '#ff7800';
}

// Função principal para carregar dados
async function loadTiroteios() {
    try {
        const response = await fetch('http://localhost:5000/api/tiroteios?_=' + Date.now()); // Cache buster
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
            throw new Error(error.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        
        // Verificação robusta dos dados
        if (!Array.isArray(data)) {
            console.error("Dados inválidos recebidos:", data);
            throw new Error("Formato de dados inválido");
        }

        updateMapWithData(data.length > 0 ? data : getFallbackData());
        updateStats();
        
    } catch (error) {
        console.error("Erro ao carregar:", error);
        updateMapWithData(getFallbackData());
        showErrorNotification("Dados em tempo real indisponíveis. Mostrando exemplos.");
    }
}

// Adicione esta função para dados de fallback no frontend
function getFallbackData() {
    return [
        {
            id: 1,
            tipo: "Tiroteio",
            bairro: "Copacabana",
            lat: -22.970722, 
            lng: -43.182365,
            data: new Date().toISOString().split('T')[0],
            hora: "12:00",
            vitimas: 0,
            descricao: "Dados de exemplo - falha na conexão com a API"
        }
    ];
}

// Atualiza o mapa com os dados
function updateMapWithData(data) {
    tiroteiosLayer.clearLayers();
    
    data.forEach(evento => {
        const marker = L.circleMarker([evento.lat, evento.lng], {
            radius: 8,
            fillColor: getMarkerColor(evento.vitimas),
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(tiroteiosLayer);
        
        marker.bindPopup(`
            <b>${evento.tipo}</b><br>
            <b>Bairro:</b> ${evento.bairro}<br>
            <b>Data:</b> ${evento.data} ${evento.hora}<br>
            <b>Vítimas:</b> ${evento.vitimas}<br>
            <small>${evento.descricao}</small>
        `);
    });
}

// Atualiza estatísticas
function updateStats() {
    fetch('http://localhost:5000/api/estatisticas')
        .then(response => response.json())
        .then(stats => {
            document.getElementById('total-tiroteios').textContent = stats.total_tiroteios;
            document.getElementById('total-vitimas').textContent = stats.total_vitimas;
            document.getElementById('ultima-atualizacao').textContent = stats.ultima_atualizacao;
            
            const bairrosList = document.getElementById('bairros-list');
            bairrosList.innerHTML = '';
            
            for (const [bairro, count] of Object.entries(stats.por_bairro)) {
                const li = document.createElement('li');
                li.textContent = `${bairro}: ${count} ocorrência(s)`;
                bairrosList.appendChild(li);
            }
        })
        .catch(error => console.error("Erro nas estatísticas:", error));
}

// Notificação de erro
function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'api-notification error';
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="close-btn">&times;</button>
    `;
    
    notification.querySelector('.close-btn').addEventListener('click', () => {
        notification.remove();
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Opção de recarregar
function showReloadOption() {
    const reloadDiv = document.createElement('div');
    reloadDiv.className = 'reload-panel';
    reloadDiv.innerHTML = `
        <p>Não foi possível carregar os dados.</p>
        <button id="reload-btn">Tentar Novamente</button>
    `;
    
    reloadDiv.querySelector('#reload-btn').addEventListener('click', () => {
        retryCount = 0;
        reloadDiv.remove();
        loadTiroteios();
    });
    
    document.body.appendChild(reloadDiv);
}

// Filtros
document.getElementById('applyFilters').addEventListener('click', async () => {
    try {
        const bairro = document.getElementById('neighborhood').value;
        const response = await fetch(`http://localhost:5000/api/tiroteios?bairro=${encodeURIComponent(bairro)}`);
        
        if (!response.ok) throw new Error('Filtro falhou');
        
        const result = await response.json();
        const data = Array.isArray(result) ? result : result.data || [];
        
        updateMapWithData(data);
        
    } catch (error) {
        showErrorNotification("Erro ao filtrar. " + error.message);
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadTiroteios();
    setInterval(loadTiroteios, 5 * 60 * 1000);
});