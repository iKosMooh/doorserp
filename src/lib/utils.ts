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
