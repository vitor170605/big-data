// Configuração inicial do mapa
const map = L.map('map').setView([-22.9068, -43.1729], 11);

// Adiciona camada base do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variáveis globais
let crimeMarkers = L.layerGroup().addTo(map);
let currentData = [];

// Função para carregar dados da API Python
async function loadCrimeData(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.tipo) params.append('tipo', filters.tipo);
        if (filters.bairro) params.append('bairro', filters.bairro);

        const response = await axios.get('http://localhost:5000/api/ocorrencias', { params });
        currentData = response.data;

        // Processa os dados e adiciona ao mapa
        updateMapWithData(currentData);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Função para atualizar o mapa com os dados
function updateMapWithData(data) {
    // Limpa marcadores anteriores
    crimeMarkers.clearLayers();

    // Adiciona novos marcadores
    data.forEach(crime => {
        const marker = L.circleMarker([crime.lat, crime.lng], {
            radius: 8,
            fillColor: getColorForCrimeType(crime.tipo),
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(crimeMarkers);

        marker.bindPopup(`
            <b>${crime.tipo}</b><br>
            Bairro: ${crime.bairro}<br>
            Data: ${crime.data}
        `);
    });
}

// Função auxiliar para cores baseadas no tipo de crime
function getColorForCrimeType(type) {
    const colors = {
        'Roubo': '#ff0000',
        'Furto': '#ff9900',
        'Homicídio': '#990000',
        // Adicione mais mapeamentos conforme necessário
    };
    return colors[type] || '#555555';
}

// Event listeners para filtros
document.getElementById('applyFilters').addEventListener('click', () => {
    const filters = {
        tipo: document.getElementById('crimeType').value,
        bairro: document.getElementById('neighborhood').value
    };
    loadCrimeData(filters);
});

// Carrega os dados quando a página é aberta
document.addEventListener('DOMContentLoaded', () => loadCrimeData());