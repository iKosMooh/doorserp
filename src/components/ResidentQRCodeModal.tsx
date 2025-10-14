'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Share2, Copy, Check } from 'lucide-react';
import { formatCPF } from '@/lib/utils';

interface ResidentQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: {
    id: string;
    user: {
      name: string;
      document?: string;
    };
    unit: {
      number: string;
      block: string;
    };
  };
}

export default function ResidentQRCodeModal({ isOpen, onClose, resident }: ResidentQRCodeModalProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && qrCodeRef.current) {
      generateQRCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resident.id]);

  const generateQRCode = async () => {
    if (!qrCodeRef.current) return;

    try {
      const QRCodeModule = await import('easyqrcodejs');
      const QRCode = QRCodeModule.default || QRCodeModule;

      // Limpar QR Code anterior
      qrCodeRef.current.innerHTML = '';

      // Gerar novo QR Code com o ID do morador
      new QRCode(qrCodeRef.current, {
        text: resident.id,
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
    link.download = `qrcode-morador-${resident.user.name.replace(/\s+/g, '_')}-${resident.unit.block}${resident.unit.number}.png`;
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

        const file = new File([blob], `qrcode-morador-${resident.user.name}.png`, { type: 'image/png' });

        // Verificar se o navegador suporta Web Share API
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `QR Code - ${resident.user.name}`,
            text: `QR Code de acesso do morador ${resident.user.name}\nUnidade: ${resident.unit.block}${resident.unit.number}`,
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

  const handleCopyId = () => {
    navigator.clipboard.writeText(resident.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meu QR Code de Acesso</h2>
            <p className="text-sm text-gray-600 mt-1">{resident.user.name}</p>
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
            <div className="p-4 bg-white border-4 border-blue-200 rounded-2xl shadow-lg">
              <div ref={qrCodeRef} className="flex justify-center items-center" />
            </div>
          </div>

          {/* Informações do Morador */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Nome:</span>
              <span className="text-sm font-semibold text-gray-900">{resident.user.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Unidade:</span>
              <span className="text-sm font-semibold text-gray-900">{resident.unit.block}{resident.unit.number}</span>
            </div>

            {resident.user.document && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">CPF:</span>
                <span className="text-sm font-semibold text-gray-900">{formatCPF(resident.user.document)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">ID do Morador:</span>
                <button
                  onClick={handleCopyId}
                  className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition-colors min-h-[36px]"
                  title="Copiar ID"
                >
                  <span className="text-xs font-mono">{resident.id.substring(0, 8)}...</span>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h3 className="font-semibold text-emerald-900 mb-2">📱 Como usar:</h3>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• Este é seu QR Code pessoal de morador</li>
              <li>• Apresente-o na portaria para entrada rápida</li>
              <li>• Válido permanentemente enquanto você for morador</li>
              <li>• Não compartilhe com terceiros</li>
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
