from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import requests

app = Flask(__name__)
CORS(app)  # Isso permite chamadas de outros domínios (CORS)

# Mock de dados - substitua por chamadas reais à API do ISP-RJ
MOCK_DATA = [
    {"id": 1, "tipo": "Roubo", "bairro": "Copacabana", "lat": -22.970722, "lng": -43.182365, "data": "2023-01-15"},
    {"id": 2, "tipo": "Furto", "bairro": "Ipanema", "lat": -22.983714, "lng": -43.199523, "data": "2023-01-16"},
    # Adicione mais dados conforme necessário
]

@app.route('/api/ocorrencias', methods=['GET'])
def get_ocorrencias():
    # Parâmetros de filtro
    bairro = request.args.get('bairro')
    tipo_crime = request.args.get('tipo')
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    
    # Filtrar dados (em produção, substitua por consulta real ao banco/API)
    filtered_data = MOCK_DATA
    
    if bairro:
        filtered_data = [oc for oc in filtered_data if oc['bairro'].lower() == bairro.lower()]
    
    if tipo_crime:
        filtered_data = [oc for oc in filtered_data if oc['tipo'].lower() == tipo_crime.lower()]
    
    # Aqui você pode adicionar integração com a API real do ISP-RJ
    # response = requests.get('https://api.seguranca.rj.gov.br/v1/ocorrencias')
    # filtered_data = response.json()
    
    return jsonify(filtered_data)

@app.route('/api/estatisticas', methods=['GET'])
def get_estatisticas():
    df = pd.DataFrame(MOCK_DATA)
    
    estatisticas = {
        'total_ocorrencias': len(MOCK_DATA),
        'por_bairro': df['bairro'].value_counts().to_dict(),
        'por_tipo': df['tipo'].value_counts().to_dict()
    }
    
    return jsonify(estatisticas)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
