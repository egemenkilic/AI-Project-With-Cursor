import { useRef, useState, useEffect } from 'react';
import './App.css';

type Tool = 'brush' | 'eraser' | 'fill';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedPrompt, setDetectedPrompt] = useState<string>('');
  const [tool, setTool] = useState<Tool>('brush');

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas!.width, canvas!.height);
    }
  }, []);

  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Hex rengi RGB'ye çevir
    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };

    // Başlangıç noktasının rengini al
    const startPixel = ctx.getImageData(startX, startY, 1, 1).data;

    // Doldurulacak rengi RGB'ye çevir
    const fillRGB = hexToRgb(fillColor);

    // Eğer başlangıç noktası zaten aynı renkse, işlem yapma
    if (startPixel[0] === fillRGB[0] && 
        startPixel[1] === fillRGB[1] && 
        startPixel[2] === fillRGB[2]) return;

    // Tüm canvas'ı tara
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Stack kullanarak flood fill algoritması
    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const pos = (y * canvas.width + x) * 4;

        // Sınırları ve renk eşleşmesini kontrol et
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
        if (pixels[pos] !== startPixel[0] || 
            pixels[pos + 1] !== startPixel[1] || 
            pixels[pos + 2] !== startPixel[2]) continue;

        // Pikseli boya
        pixels[pos] = fillRGB[0];     // R
        pixels[pos + 1] = fillRGB[1]; // G
        pixels[pos + 2] = fillRGB[2]; // B
        pixels[pos + 3] = 255;        // A

        // Komşu pikselleri stack'e ekle
        stack.push(
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
        );
    }

    // Değişiklikleri canvas'a uygula
    ctx.putImageData(imageData, 0, 0);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'fill') {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

        floodFill(x, y, color);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'fill') return;
    
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'fill') return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = color;
    }
    
    context.lineWidth = lineWidth;
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !canvas) return;
    
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    setGeneratedImage(null);
  };

  const quickColors = [
    { color: '#000000', name: 'Siyah' },
    { color: '#FFFFFF', name: 'Beyaz' },
    { color: '#FF0000', name: 'Kırmızı' },
    { color: '#00FF00', name: 'Yeşil' },
    { color: '#0000FF', name: 'Mavi' },
    { color: '#FFFF00', name: 'Sarı' },
    { color: '#FF00FF', name: 'Pembe' },
    { color: '#00FFFF', name: 'Turkuaz' },
    { color: '#FFA500', name: 'Turuncu' },
    { color: '#800080', name: 'Mor' },
    { color: '#A52A2A', name: 'Kahverengi' },
    { color: '#808080', name: 'Gri' },
  ];

  const generateImage = async () => {
    try {
      setIsGenerating(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const imageData = canvas.toDataURL('image/png');

      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sketch: imageData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setGeneratedImage(data.image);
        setDetectedPrompt(data.description);
      } else {
        throw new Error(data.error || 'Bilinmeyen bir hata oluştu');
      }
    } catch (error) {
      console.error('Görüntü oluşturma hatası:', error);
      alert('Görüntü oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="App">
      <div className="controls">
        <div className="tools-group">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            disabled={tool === 'eraser'}
          />
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{
              '--value': lineWidth,
              '--min': 1,
              '--max': 20
            } as React.CSSProperties}
          />
        </div>
        <div className="tools">
          <button 
            className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => setTool('brush')}
            title="Fırça"
          >
            ✏️
          </button>
          <button 
            className={`tool-btn ${tool === 'fill' ? 'active' : ''}`}
            onClick={() => setTool('fill')}
            title="Doldur"
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#666666" d="M7,2 h10 a2,2 0 0 1 2,2 v12 a2,2 0 0 1 -2,2 h-10 a2,2 0 0 1 -2,-2 v-12 a2,2 0 0 1 2,-2 M8,2 v4 h8 v-4 M6,8 h12 M12,4 v-2" stroke="#000000" strokeWidth="1.5"/>
              <path fill="#4FC3F7" d="M7,8 h10 v8 h-10 z" opacity="0.8"/>
              <path fill="#4FC3F7" d="M8,2 h8 v3 h-8 z" opacity="0.6"/>
            </svg>
          </button>
          <button 
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Silgi"
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M2 2h20v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V2z" fill="#472D20"/>
              <path d="M4 2h16v8H4V2z" fill="#FF9999"/>
              <path d="M4 10h16v2H4v-2z" fill="#87CEEB"/>
            </svg>
          </button>
        </div>
        <button onClick={clearCanvas}>Temizle</button>
        <button 
          onClick={generateImage} 
          disabled={isGenerating}
          className="generate-btn"
        >
          {isGenerating ? 'Oluşturuluyor...' : 'Gerçekçi Görüntü Oluştur'}
        </button>
      </div>
      <div className="canvas-container">
        <div className="drawing-area">
          <div className="color-palette">
            <div className="quick-colors">
              {quickColors.map((c, index) => (
                <button
                  key={c.color}
                  className="color-btn"
                  style={{ 
                    backgroundColor: c.color,
                    border: c.color === '#FFFFFF' ? '2px solid #e0e0e0' : '2px solid white'
                  }}
                  onClick={() => {
                    setColor(c.color);
                    setTool('brush');
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div className="canvas-and-generated">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onClick={handleCanvasClick}
              className={tool === 'eraser' ? 'eraser' : tool === 'fill' ? 'fill' : ''}
            />
            {generatedImage && (
              <div className="generated-content">
                <img src={generatedImage} alt="Generated" />
                {detectedPrompt && (
                  <div className="prompt-box">
                    <h3>Algılanan İçerik:</h3>
                    <p>{detectedPrompt}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
