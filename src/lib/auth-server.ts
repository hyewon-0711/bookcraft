// 서버 사이드 전용 인증 로직
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { userDb } from './database'
import { User, AuthToken } from './auth'

// JWT 시크릿 키 (환경 변수에서 가져오기)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// 비밀번호 검증
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT 토큰 생성
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'bookcraft',
    audience: 'bookcraft-users'
  } as jwt.SignOptions)
}

// JWT 토큰 검증
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'bookcraft',
      audience: 'bookcraft-users'
    })
  } catch (error) {
    throw new Error('유효하지 않은 토큰입니다.')
  }
}

// 서버 사이드 인증 서비스
export const authService = {
  // 회원가입
  async signUp(userData: {
    email: string
    password: string
    name: string
    role: 'child' | 'parent'
  }): Promise<AuthToken> {
    const { email, password, name, role } = userData
    
    // 이메일 중복 확인
    const existingUser = await userDb.findByEmail(email)
    if (existingUser) {
      throw new Error('이미 사용 중인 이메일입니다.')
    }
    
    // 비밀번호 해싱
    const passwordHash = await hashPassword(password)
    
    // 사용자 생성
    const user = await userDb.createUser({
      email,
      name,
      role,
      passwordHash
    })
    
    // JWT 토큰 생성
    const token = generateToken(user)
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        family_id: user.family_id,
        created_at: user.created_at
      }
    }
  },

  // 로그인
  async signIn(email: string, password: string): Promise<AuthToken> {
    // 사용자 조회
    const user = await userDb.findByEmail(email)
    if (!user) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    
    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    
    // JWT 토큰 생성
    const token = generateToken(user)
    
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        family_id: user.family_id,
        created_at: user.created_at
      }
    }
  },

  // 토큰으로 사용자 정보 가져오기
  async getCurrentUser(token: string): Promise<User | null> {
    try {
      const decoded = verifyToken(token)
      const user = await userDb.findById(decoded.id)
      
      if (!user) {
        return null
      }
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        family_id: user.family_id,
        created_at: user.created_at
      }
    } catch (error) {
      return null
    }
  },

  // 비밀번호 변경
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userDb.findById(userId)
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }
    
    // 현재 비밀번호 검증
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash)
    if (!isValidPassword) {
      throw new Error('현재 비밀번호가 올바르지 않습니다.')
    }
    
    // 새 비밀번호 해싱
    const newPasswordHash = await hashPassword(newPassword)
    
    // 비밀번호 업데이트
    await userDb.updatePassword(userId, newPasswordHash)
  },

  // 프로필 업데이트
  async updateProfile(userId: string, updates: Partial<{
    name: string
    avatar_url: string
    birth_date: string
  }>): Promise<User> {
    const updatedUser = await userDb.updateProfile(userId, updates)
    
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      avatar_url: updatedUser.avatar_url,
      family_id: updatedUser.family_id,
      created_at: updatedUser.created_at
    }
  }
}