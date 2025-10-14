'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Share2, Copy, Check } from 'lucide-react';

interface GuestQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: {
    id: string;
    name: string;
    accessCode: string;
    validFrom: string;
    validUntil: string | null;
  };
}

export default function GuestQRCodeModal({ isOpen, onClose, guest }: GuestQRCodeModalProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && qrCodeRef.current) {
      generateQRCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, guest.id]);

  const generateQRCode = async () => {
    if (!qrCodeRef.current) return;

    try {
      const QRCodeModule = await import('easyqrcodejs');
      const QRCode = QRCodeModule.default || QRCodeModule;

      // Limpar QR Code anterior
      qrCodeRef.current.innerHTML = '';

      // Gerar novo QR Code com o ID do convidado
      new QRCode(qrCodeRef.current, {
        text: guest.id,
        width: 300,
        height: 300,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
        logo: undefined,
        logoWidth: undefined,
        logoHeight: undefined,
        logoBackgroundTransparent: false,
        quietZone: 10,
        quietZoneColor: '#ffffff',
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      alert('Erro ao gerar QR Code');
    }
  };

  const handleDownload = () => {
    if (!qrCodeRef.current) return;

    const canvas = qrCodeRef.current.querySelector('canvas');
    if (!canvas) return;

    // Converter canvas para imagem
    const link = document.createElement('a');
    link.download = `qrcode-${guest.name.replace(/\s+/g, '_')}-${guest.accessCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (!qrCodeRef.current) return;

    const canvas = qrCodeRef.current.querySelector('canvas');
    if (!canvas) return;

    try {
      // Converter canvas para blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `qrcode-${guest.name}.png`, { type: 'image/png' });

        // Verificar se o navegador suporta Web Share API
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `QR Code - ${guest.name}`,
            text: `QR Code de acesso para ${guest.name}\nCódigo: ${guest.accessCode}`,
            files: [file],
          });
        } else {
          // Fallback: copiar para área de transferência ou download
          alert('Compartilhamento não suportado neste navegador. Use o botão de download.');
          handleDownload();
        }
      }, 'image/png');
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      alert('Erro ao compartilhar QR Code');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(guest.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">QR Code de Acesso</h2>
            <p className="text-sm text-gray-600 mt-1">{guest.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white border-4 border-gray-200 rounded-2xl shadow-lg">
              <div ref={qrCodeRef} className="flex justify-center items-center" />
            </div>
          </div>

          {/* Informações do Convidado */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Código de Acesso:</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-mono font-bold text-gray-900">{guest.accessCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Copiar código"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Válido de:</span>
              <span className="text-sm font-semibold text-gray-900">{formatDate(guest.validFrom)}</span>
            </div>

            {guest.validUntil && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Válido até:</span>
                <span className="text-sm font-semibold text-gray-900">{formatDate(guest.validUntil)}</span>
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-900 mb-2">📱 Como usar:</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Apresente este QR Code na portaria</li>
              <li>• O código também pode ser digitado: <strong>{guest.accessCode}</strong></li>
              <li>• O acesso será registrado automaticamente</li>
            </ul>
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-200 min-h-[44px]"
            >
              <Download className="w-5 h-5" />
              <span>Baixar</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-green-200 min-h-[44px]"
            >
              <Share2 className="w-5 h-5" />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
