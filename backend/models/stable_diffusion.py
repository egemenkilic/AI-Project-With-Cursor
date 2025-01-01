from transformers import Blip2Processor, Blip2ForConditionalGeneration
from diffusers import StableDiffusionPipeline
import torch
from PIL import Image
import io

# Global değişkenler
processor = None
blip_model = None
sd_pipe = None

def load_models():
    global processor, blip_model, sd_pipe
    try:
        print("Modeller yükleniyor...")
        
        # BLIP-2 modelini yükle
        processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
        blip_model = Blip2ForConditionalGeneration.from_pretrained(
            "Salesforce/blip2-opt-2.7b", 
            torch_dtype=torch.float32
        )
        
        # Stable Diffusion modelini yükle
        sd_pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float32
        )
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        blip_model.to(device)
        sd_pipe.to(device)
        
        print("Modeller yüklendi")
        
    except Exception as e:
        print(f"Model yükleme hatası: {e}")
        raise e

def generate_image(sketch_binary):
    global processor, blip_model, sd_pipe
    try:
        if processor is None or blip_model is None or sd_pipe is None:
            load_models()
        
        print("Görüntü işleniyor...")
        sketch = Image.open(io.BytesIO(sketch_binary)).convert('RGB')
        
        # Çizimi analiz et ve açıklama oluştur
        inputs = processor(sketch, return_tensors="pt")
        out = blip_model.generate(**inputs, max_length=50)
        description = processor.decode(out[0], skip_special_tokens=True)
        print(f"Algılanan içerik: {description}")
        
        # Açıklamayı kullanarak gerçekçi görüntü oluştur
        prompt = f"ultra realistic photograph of {description}, highly detailed, professional lighting"
        result = sd_pipe(
            prompt=prompt,
            negative_prompt="cartoon, drawing, sketch, low quality",
            num_inference_steps=30,
            guidance_scale=7.5
        ).images[0]
        
        result = result.resize((800, 600), Image.Resampling.LANCZOS)
        print("Görüntü oluşturuldu")
        
        # Hem görüntüyü hem de açıklamayı döndür
        return (result, description)  # Tuple olarak döndür
        
    except Exception as e:
        print(f"Görüntü oluşturma hatası: {e}")
        return None, None  # Hata durumunda her ikisi için None döndür 