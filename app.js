// Configuração do mapa
const map = L.map('map').setView([-22.9068, -43.1729], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let tiroteiosLayer = L.layerGroup().addTo(map);
let retryCount = 0;
const MAX_RETRIES = 2;
let todosBairros = new Set(); // Armazena todos os bairros com ocorrências

// Cores para os marcadores
function getMarkerColor(vitimas) {
    return vitimas > 0 ? '#ff0000' : '#ff7800';
}

// Função para carregar os bairros no dropdown
function loadNeighborhoods(data, manterSelecao = false) {
    const neighborhoodSelect = document.getElementById('neighborhood');
    const selectedValue = neighborhoodSelect.value; // Guarda o valor selecionado
    
    // Limpa apenas as opções, mantendo "Todos os bairros"
    while (neighborhoodSelect.options.length > 1) {
        neighborhoodSelect.remove(1);
    }
    
    // Adiciona cada bairro como uma opção (ordenados alfabeticamente)
    Array.from(todosBairros).sort((a, b) => a.localeCompare(b)).forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        option.textContent = bairro;
        neighborhoodSelect.appendChild(option);
    });
    
    // Restaura a seleção anterior se necessário
    if (manterSelecao && selectedValue) {
        neighborhoodSelect.value = selectedValue;
    }
}

// Função principal para carregar dados
async function loadTiroteios() {
    try {
        const response = await fetch('http://localhost:5000/api/tiroteios?_=' + Date.now());
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
            throw new Error(error.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
            console.error("Dados inválidos recebidos:", data);
            throw new Error("Formato de dados inválido");
        }

        const finalData = data.length > 0 ? data : getFallbackData();
        updateMapWithData(finalData);
        updateStats();
        
    } catch (error) {
        console.error("Erro ao carregar:", error);
        const fallbackData = getFallbackData();
        updateMapWithData(fallbackData);
        showErrorNotification("Dados em tempo real indisponíveis. Mostrando exemplos.");
    }
}

// Dados de fallback
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
        },
        {
            id: 2,
            tipo: "Tiroteio",
            bairro: "Complexo do Alemão",
            lat: -22.861808,
            lng: -43.252356,
            data: new Date().toISOString().split('T')[0],
            hora: "14:30",
            vitimas: 1,
            descricao: "Dados de exemplo - falha na conexão com a API"
        }
    ];
}

// Atualiza o mapa com os dados
function updateMapWithData(data) {
    tiroteiosLayer.clearLayers();
    
    // Atualiza a lista completa de bairros
    data.forEach(evento => {
        if (evento.bairro && evento.bairro.trim() !== '') {
            todosBairros.add(evento.bairro);
        }
    });
    
    // Carrega os bairros mantendo a seleção atual
    loadNeighborhoods(data, true);
    
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

// Atualiza estatísticas para dados filtrados
function updateStatsForFilteredData(data) {
    const bairros = {};
    let vitimas = 0;
    
    data.forEach(evento => {
        const bairro = evento.bairro || 'Desconhecido';
        bairros[bairro] = (bairros[bairro] || 0) + 1;
        vitimas += evento.vitimas || 0;
    });
    
    document.getElementById('total-tiroteios').textContent = data.length;
    document.getElementById('total-vitimas').textContent = vitimas;
    document.getElementById('ultima-atualizacao').textContent = new Date().toLocaleString();
    
    const bairrosList = document.getElementById('bairros-list');
    bairrosList.innerHTML = '';
    
    for (const [bairro, count] of Object.entries(bairros)) {
        const li = document.createElement('li');
        li.textContent = `${bairro}: ${count} ocorrência(s)`;
        bairrosList.appendChild(li);
    }
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
        const tipo = document.getElementById('crimeType').value;
        
        const response = await fetch(`http://localhost:5000/api/tiroteios`);
        
        if (!response.ok) throw new Error('Falha ao carregar dados');
        
        let data = await response.json();
        
        // Atualiza a lista completa de bairros
        data.forEach(evento => {
            if (evento.bairro && evento.bairro.trim() !== '') {
                todosBairros.add(evento.bairro);
            }
        });
        
        // Filtro por bairro
        if (bairro) {
            data = data.filter(evento => evento.bairro === bairro);
        }
        
        // Filtro por tipo de tiroteio
        if (tipo === 'letais') {
            data = data.filter(evento => evento.vitimas > 0);
        } else if (tipo === 'nao_letais') {
            data = data.filter(evento => evento.vitimas === 0);
        }
        
        // Atualiza o mapa com os dados filtrados
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
        
        updateStatsForFilteredData(data);
        
        // Mantém a lista completa de bairros e a seleção atual
        loadNeighborhoods(data, true);
        
    } catch (error) {
        showErrorNotification("Erro ao filtrar. " + error.message);
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadTiroteios();
    setInterval(loadTiroteios, 5 * 60 * 1000);
});