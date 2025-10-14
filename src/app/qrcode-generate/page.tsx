    'use client';

import { useState, useRef } from 'react';

export default function QRCodeTestPage() {
  const [inputText, setInputText] = useState('');
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const generateQRCode = async () => {
    if (!inputText.trim()) {
      alert('Digite algo!');
      return;
    }

    try {
      const QRCodeModule = await import('easyqrcodejs');
      const QRCode = QRCodeModule.default || QRCodeModule;

      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
        
        new QRCode(qrCodeRef.current, {
          text: inputText,
          width: 256,
          height: 256,
        });
      }
    } catch {
      alert('Erro ao gerar QR Code');
    }
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '600px', 
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: 'white'
    }}>
      <h1 style={{ marginBottom: '20px', color: '#000' }}>Teste QR Code</h1>
      
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Digite o texto aqui"
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '10px',
          fontSize: '16px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          color: '#000',
          backgroundColor: '#fff',
        }}
      />
      
      <button
        onClick={generateQRCode}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        Gerar QR Code
      </button>

      <div 
        ref={qrCodeRef} 
        style={{ 
          marginTop: '30px', 
          display: 'flex', 
          justifyContent: 'center' 
        }} 
      />
    </div>
  );
}