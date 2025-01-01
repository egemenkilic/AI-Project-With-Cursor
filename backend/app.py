from flask import Flask, request, jsonify
from flask_cors import CORS
from models.stable_diffusion import generate_image
import base64
from io import BytesIO

app = Flask(__name__)
CORS(app)

@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        sketch_base64 = data.get('sketch')
        if not sketch_base64:
            return jsonify({
                'success': False,
                'error': 'Görüntü verisi bulunamadı'
            }), 400
        
        # Base64'ü görüntüye çevir
        try:
            sketch_binary = base64.b64decode(sketch_base64.split(',')[1])
        except:
            return jsonify({
                'success': False,
                'error': 'Geçersiz görüntü formatı'
            }), 400
        
        # Yapay zeka ile görüntü oluştur
        generated_image, description = generate_image(sketch_binary)
        if generated_image is None:
            return jsonify({
                'success': False,
                'error': 'Görüntü oluşturulamadı'
            }), 500
        
        # Oluşturulan görüntüyü base64'e çevir
        buffered = BytesIO()
        generated_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_str}',
            'description': description
        })
        
    except Exception as e:
        print(f"Hata: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 