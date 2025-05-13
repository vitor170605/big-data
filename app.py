import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import time
from collections import defaultdict

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    "https://big-data-5j2j.onrender.com",   
    "https://meu-projeto.netlify.app",     
    "http://127.0.0.1:5500"                 
])
# Configurações
API_BASE = "https://api-service.fogocruzado.org.br/api/v2"
AUTH_URL = f"{API_BASE}/auth/login"
CITY = "Rio de Janeiro"
STATE_NAME = "Rio de Janeiro"
DAYS_BACK = 30

# Variáveis globais
token_data = None
state_uuid = None

def debug_log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] DEBUG: {message}")

def authenticate():
    global token_data
    email = os.getenv('FOGO_CRUZADO_EMAIL')
    password = os.getenv('FOGO_CRUZADO_PASSWORD')
    
    try:
        response = requests.post(AUTH_URL, json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 201:
            token_data = response.json()
            return True
        return False
        
    except Exception as e:
        debug_log(f"Erro na autenticação: {str(e)}")
        return False

def get_auth_headers():
    if not token_data or 'data' not in token_data:
        raise ValueError("Token não disponível")
    return {
        'Authorization': f'Bearer {token_data["data"]["accessToken"]}',
        'Accept': 'application/json'
    }

def get_state_uuid():
    global state_uuid
    try:
        response = requests.get(f"{API_BASE}/states", headers=get_auth_headers())
        if response.status_code == 200:
            for state in response.json().get('data', []):
                if state.get('name') == STATE_NAME:
                    state_uuid = state.get('id')
                    return state_uuid
        return None
    except Exception as e:
        debug_log(f"Erro ao buscar estados: {str(e)}")
        return None

def format_event(event):
    """Formata os dados de um evento para o frontend"""
    vitimas = len(event.get('victims', []))
    return {
        'id': event.get('id'),
        'tipo': 'Tiroteio',
        'bairro': event.get('neighborhood', {}).get('name', 'Desconhecido'),
        'lat': float(event.get('latitude', 0)),
        'lng': float(event.get('longitude', 0)),
        'data': event.get('date', '').split('T')[0],
        'hora': event.get('date', '').split('T')[1][:5] if 'T' in event.get('date', '') else '',
        'vitimas': vitimas,
        'descricao': f"Tiroteio em {event.get('neighborhood', {}).get('name', 'local desconhecido')} - {'Com vítimas' if vitimas > 0 else 'Sem vítimas'}",
        'acao_policial': event.get('policeAction', False)
    }

def get_fallback_data():
    return [
        {
            "id": 1,
            "tipo": "Tiroteio",
            "bairro": "Complexo do Alemão",
            "lat": -22.861808,
            "lng": -43.252356,
            "data": datetime.now().strftime('%Y-%m-%d'),
            "hora": "14:30",
            "vitimas": 1,
            "descricao": "Tiroteio com vítima - Dados locais (API indisponível)"
        },
        {
            "id": 2,
            "tipo": "Tiroteio",
            "bairro": "Copacabana",
            "lat": -22.970722,
            "lng": -43.182365,
            "data": datetime.now().strftime('%Y-%m-%d'),
            "hora": "10:15",
            "vitimas": 0,
            "descricao": "Tiroteio sem vítimas - Dados locais (API indisponível)"
        }
    ]

@app.route('/api/tiroteios', methods=['GET'])
def get_tiroteios():
    global state_uuid
    try:
        if not token_data and not authenticate():
            return jsonify(get_fallback_data())
        
        if not state_uuid:
            state_uuid = get_state_uuid()
            if not state_uuid:
                return jsonify(get_fallback_data())
        
        date_end = datetime.now()
        date_start = date_end - timedelta(days=DAYS_BACK)
        
        response = requests.get(
            f"{API_BASE}/occurrences",
            headers=get_auth_headers(),
            params={
                'idState': state_uuid,
                'city': CITY,
                'date_start': date_start.strftime('%Y-%m-%d'),
                'date_end': date_end.strftime('%Y-%m-%d'),
                'limit': 500
            }
        )
        
        if response.status_code == 200:
            data = response.json().get('data', [])
            return jsonify([format_event(event) for event in data])
            
        return jsonify(get_fallback_data())
        
    except Exception as e:
        debug_log(f"Erro: {str(e)}")
        return jsonify(get_fallback_data())

@app.route('/api/estatisticas', methods=['GET'])
def get_estatisticas():
    try:
        response = get_tiroteios()
        data = response.get_json()
        
        bairros = defaultdict(int)
        vitimas = 0
        
        for evento in data:
            bairro = evento.get('bairro', 'Desconhecido')
            bairros[bairro] += 1
            vitimas += evento.get('vitimas', 0)
        
        return jsonify({
            'total_tiroteios': len(data),
            'total_vitimas': vitimas,
            'por_bairro': dict(bairros),
            'ultima_atualizacao': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        debug_log(f"Erro nas estatísticas: {str(e)}")
        return jsonify({
            "total_tiroteios": 0,
            "total_vitimas": 0,
            "por_bairro": {},
            "ultima_atualizacao": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
@app.route("/")
def index():
    return "<h1>API de Tiroteios no RJ está no ar!</h1><p>Use <code>/api/tiroteios</code> ou <code>/api/estatisticas</code></p>"

if __name__ == '__main__':
    debug_log("Iniciando aplicação...")
    app.run(debug=True, port=5000)