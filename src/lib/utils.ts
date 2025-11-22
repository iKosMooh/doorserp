import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um número de CPF para o padrão XXX.XXX.XXX-XX
 * @param cpf - CPF sem formatação (apenas números)
 * @returns CPF formatado ou string original se inválido
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return ''
  
  // Remove tudo que não é número
  const numbers = cpf.replace(/\D/g, '')
  
  // Se não tem 11 dígitos, retorna como está
  if (numbers.length !== 11) return cpf
  
  // Aplica a máscara XXX.XXX.XXX-XX
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata um número de telefone para os padrões brasileiros
 * @param phone - Telefone sem formatação (apenas números)
 * @returns Telefone formatado ou string original se inválido
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '')
  
  // Celular com DDD: (XX) XXXXX-XXXX
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  
  // Telefone fixo com DDD: (XX) XXXX-XXXX
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  // Celular sem DDD: XXXXX-XXXX
  if (numbers.length === 9) {
    return numbers.replace(/(\d{5})(\d{4})/, '$1-$2')
  }
  
  // Telefone fixo sem DDD: XXXX-XXXX
  if (numbers.length === 8) {
    return numbers.replace(/(\d{4})(\d{4})/, '$1-$2')
  }
  
  // Se não se encaixa em nenhum padrão, retorna como está
  return phone
}

/**
 * Formata um número de documento (RG, CNH, etc)
 * @param document - Documento sem formatação
 * @returns Documento formatado
 */
export function formatDocument(document: string | null | undefined): string {
  if (!document) return ''
  
  // Remove tudo que não é número
  const numbers = document.replace(/\D/g, '')
  
  // Se parece com CPF (11 dígitos), formata como CPF
  if (numbers.length === 11) {
    return formatCPF(numbers)
  }
  
  // Se parece com CNPJ (14 dígitos), formata como CNPJ
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  
  // Caso contrário, retorna como está
  return document
}

/**
 * Formata CPF enquanto o usuário digita
 * @param value - Valor do input
 * @returns Valor formatado para CPF
 */
export function formatCPFInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)
  
  // Aplica máscara progressiva
  if (limited.length <= 3) return limited
  if (limited.length <= 6) return limited.replace(/(\d{3})(\d{0,3})/, '$1.$2')
  if (limited.length <= 9) return limited.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  return limited.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
}

/**
 * Formata telefone enquanto o usuário digita
 * @param value - Valor do input
 * @returns Valor formatado para telefone
 */
export function formatPhoneInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limited = numbers.slice(0, 11)
  
  // Aplica máscara progressiva
  if (limited.length <= 2) return limited
  if (limited.length <= 6) {
    // (XX) XXXX
    return limited.replace(/(\d{2})(\d{0,4})/, '($1) $2')
  }
  if (limited.length <= 10) {
    // (XX) XXXX-XXXX
    return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  }
  // (XX) XXXXX-XXXX
  return limited.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

/**
 * Remove formatação de CPF
 * @param cpf - CPF formatado
 * @returns Apenas números
 */
export function unformatCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Remove formatação de telefone
 * @param phone - Telefone formatado
 * @returns Apenas números
 */
export function unformatPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
