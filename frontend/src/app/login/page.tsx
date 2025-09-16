'use client'

import { useState } from 'react'
import { useAuth, UserRole } from '@/contexts/AuthContext'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('user')

  // These should match the credentials in the seed script
  const demoAccounts = {
    admin: { email: 'admin@company.com', password: 'admin123' },
    driver: { email: 'driver1@company.com', password: 'driver123' },
    user: { email: 'user1@company.com', password: 'user123' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { success, error } = await login(formData.email, formData.password)
    if (!success) {
      setError(error?.message || '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인하세요.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    const account = demoAccounts[role]
    setFormData({
      email: account.email,
      password: account.password
    })
    setError('')
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'driver': return '기사님'
      case 'user': return '사용자'
      default: return role
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            통근 버스 예약 시스템
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              사용자 유형 선택
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['user', 'driver', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`p-3 text-sm font-medium rounded-md border transition-colors ${
                    selectedRole === role
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {getRoleDisplayName(role)}
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="이메일 주소를 입력하세요"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">데모 계정 정보:</p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>관리자:</span>
                <span>admin@company.com / admin123</span>
              </div>
              <div className="flex justify-between">
                <span>기사님:</span>
                <span>driver1@company.com / driver123</span>
              </div>
              <div className="flex justify-between">
                <span>사용자:</span>
                <span>user1@company.com / user123</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              위 버튼을 클릭하면 자동으로 입력됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}