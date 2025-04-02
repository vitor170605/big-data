from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Configurações da API Fogo Cruzado
FOGO_CRUZADO_API = "https://api.fogocruzado.org.br/api/v1/occurrences"
CITY = "Rio de Janeiro"
STATE = "RJ"
DAYS_BACK = 30  # Número de dias para buscar dados retroativos

@app.route('/api/tiroteios', methods=['GET'])
def get_tiroteios():
    """Endpoint para obter dados de tiroteios do Fogo Cruzado"""
    try:
        date_end = datetime.now()
        date_start = date_end - timedelta(days=DAYS_BACK)
        
        params = {
            'state': STATE,
            'city': CITY,
            'date_start': date_start.strftime('%Y-%m-%d'),
            'date_end': date_end.strftime('%Y-%m-%d'),
            'limit': 500  # Limite máximo permitido pela API
        }
        
        response = requests.get(FOGO_CRUZADO_API, params=params)
        response.raise_for_status()
        
        data = response.json().get('data', [])
        
        # Formata os dados para o frontend
        formatted_data = []
        for event in data:
            if event.get('latitude') and event.get('longitude'):
                formatted_data.append({
                    'id': event['id'],
                    'tipo': 'Tiroteio',
                    'bairro': event.get('neighborhood', 'Desconhecido'),
                    'lat': float(event['latitude']),
                    'lng': float(event['longitude']),
                    'data': event['date'],
                    'hora': event.get('hour', ''),
                    'vitimas': event.get('victims', 0),
                    'descricao': f"Tiroteio em {event.get('neighborhood', 'local desconhecido')}"
                })
        
        return jsonify(formatted_data)
        
    except Exception as e:
        print(f"Erro na API Fogo Cruzado: {str(e)}")
        return jsonify(get_fallback_data())

def get_fallback_data():
    """Dados de exemplo caso a API falhe"""
    return [
        {
            "id": 1,
            "tipo": "Tiroteio",
            "bairro": "Complexo do Alemão",
            "lat": -22.861808,
            "lng": -43.252356,
            "data": datetime.now().strftime('%Y-%m-%d'),
            "hora": "14:30",
            "vitimas": 0,
            "descricao": "Tiroteio no Complexo do Alemão"
        },
        {
            "id": 2,
            "tipo": "Tiroteio",
            "bairro": "Rocinha",
            "lat": -22.988333,
            "lng": -43.249167,
            "data": (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d'),
            "hora": "09:45",
            "vitimas": 1,
            "descricao": "Tiroteio na Rocinha com vítima"
        }
    ]

@app.route('/api/estatisticas', methods=['GET'])
def get_estatisticas():
    """Endpoint para estatísticas de tiroteios"""
    try:
        data = get_tiroteios().get_json()
        
        # Processa estatísticas básicas
        total = len(data)
        bairros = {}
        vitimas = 0
        
        for event in data:
            bairro = event['bairro']
            bairros[bairro] = bairros.get(bairro, 0) + 1
            vitimas += event['vitimas']
        
        return jsonify({
            'total_tiroteios': total,
            'total_vitimas': vitimas,
            'por_bairro': bairros,
            'ultima_atualizacao': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        print(f"Erro ao gerar estatísticas: {str(e)}")
        return jsonify({"error": "Erro ao processar estatísticas"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)