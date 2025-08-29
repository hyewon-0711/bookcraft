import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 클래스를 조건부로 결합하고 충돌을 해결하는 유틸리티 함수
 * @param inputs - 결합할 클래스 값들
 * @returns 최적화된 클래스 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param date - 포맷팅할 날짜
 * @returns 포맷된 날짜 문자열
 */
export function formatDateKorean(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * 숫자를 한국어 단위로 포맷팅 (예: 1000 -> 1천)
 * @param num - 포맷팅할 숫자
 * @returns 포맷된 숫자 문자열
 */
export function formatNumberKorean(num: number): string {
  if (num >= 10000) {
    return `${Math.floor(num / 10000)}만${num % 10000 !== 0 ? ` ${Math.floor((num % 10000) / 1000)}천` : ''}`
  } else if (num >= 1000) {
    return `${Math.floor(num / 1000)}천${num % 1000 !== 0 ? ` ${num % 1000}` : ''}`
  }
  return num.toString()
}

/**
 * 문자열을 안전하게 자르고 말줄임표 추가
 * @param text - 자를 문자열
 * @param maxLength - 최대 길이
 * @returns 잘린 문자열
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 이메일 주소 유효성 검사
 * @param email - 검사할 이메일 주소
 * @returns 유효성 여부
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 랜덤 ID 생성 (영숫자 조합)
 * @param length - ID 길이 (기본값: 8)
 * @returns 랜덤 ID 문자열
 */
export function generateRandomId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}