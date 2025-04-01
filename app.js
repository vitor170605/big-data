// Configuração do mapa
const map = L.map('map').setView([-22.9068, -43.1729], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let tiroteiosLayer = L.layerGroup().addTo(map);

// Cores para os marcadores baseados em vítimas
function getMarkerColor(vitimas) {
    return vitimas > 0 ? '#ff0000' : '#ff7800';
}

// Função para carregar dados de tiroteios
async function loadTiroteios() {
    try {
        const response = await fetch('http://localhost:5000/api/tiroteios');
        const data = await response.json();
        
        updateMapWithData(data);
        updateStats(data);
        
    } catch (error) {
        console.error("Erro ao carregar tiroteios:", error);
        // Pode adicionar aqui uma notificação para o usuário
    }
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

// Atualiza o painel de estatísticas
function updateStats(data) {
    fetch('http://localhost:5000/api/estatisticas')
        .then(response => response.json())
        .then(stats => {
            document.getElementById('total-tiroteios').textContent = stats.total_tiroteios;
            document.getElementById('total-vitimas').textContent = stats.total_vitimas;
            document.getElementById('ultima-atualizacao').textContent = stats.ultima_atualizacao;
            
            // Atualiza lista de bairros
            const bairrosList = document.getElementById('bairros-list');
            bairrosList.innerHTML = '';
            
            for (const [bairro, count] of Object.entries(stats.por_bairro)) {
                const li = document.createElement('li');
                li.textContent = `${bairro}: ${count} ocorrência(s)`;
                bairrosList.appendChild(li);
            }
        });
}

// Filtros
document.getElementById('applyFilters').addEventListener('click', () => {
    const filters = {
        bairro: document.getElementById('neighborhood').value
    };
    
    fetch(`http://localhost:5000/api/tiroteios?bairro=${encodeURIComponent(filters.bairro)}`)
        .then(response => response.json())
        .then(data => updateMapWithData(data));
});

function exportToCSV() {
    window.open('http://localhost:5000/api/tiroteios?format=csv');
}

// Carrega os dados ao iniciar
document.addEventListener('DOMContentLoaded', loadTiroteios);