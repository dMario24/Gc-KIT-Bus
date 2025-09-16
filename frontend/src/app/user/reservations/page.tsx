'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import BusSeatLayout from '@/components/BusSeatLayout'
import { reservationAPI, Reservation } from '../../../lib/api'
import { generateBusSeats } from '@/utils/busSeats'

export default function UserReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reservationFilter, setReservationFilter] = useState<'all' | 'future' | 'past'>('future')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadReservations()
  }, [router])

  const loadReservations = async () => {
    try {
      setLoading(true)
      const data = await reservationAPI.getUserReservations()
      setReservations(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : '예약 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelReservation = async (reservationId: number) => {
    if (!confirm('정말로 예약을 취소하시겠습니까?')) {
      return
    }

    try {
      await reservationAPI.cancel(reservationId)
      alert('예약이 취소되었습니다.')
      loadReservations()
    } catch (error) {
      alert(error instanceof Error ? error.message : '예약 취소에 실패했습니다.')
    }
  }

  // 예약 내역 필터링
  const today = new Date().toISOString().split('T')[0]
  const filteredReservations = reservations.filter(reservation => {
    if (reservationFilter === 'future') {
      return reservation.reservation_date >= today && reservation.status === 'confirmed'
    } else if (reservationFilter === 'past') {
      return reservation.reservation_date < today || reservation.status !== 'confirmed'
    }
    return true // 'all'
  })

  if (loading) {
    return (
      <DashboardLayout
        userRole="user"
        title="예약 내역"
        subtitle="내 예약 현황을 확인하고 관리하세요"
      >
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">예약 내역을 불러오는 중...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout
        userRole="user"
        title="예약 내역"
        subtitle="내 예약 현황을 확인하고 관리하세요"
      >
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => loadReservations()}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      userRole="user"
      title="예약 내역"
      subtitle="내 예약 현황을 확인하고 관리하세요"
    >
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              내 예약 내역
            </h3>
            <select
              value={reservationFilter}
              onChange={(e) => setReservationFilter(e.target.value as 'all' | 'future' | 'past')}
              className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="future">예정된 예약</option>
              <option value="past">지난 예약</option>
              <option value="all">전체 예약</option>
            </select>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {reservationFilter === 'future' ? '예정된 예약이 없습니다' :
                 reservationFilter === 'past' ? '지난 예약이 없습니다' : '예약 내역이 없습니다'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {reservationFilter === 'future'
                  ? '새로운 버스를 예약해보세요!'
                  : reservationFilter === 'past'
                  ? '아직 이용한 버스가 없습니다.'
                  : '버스 예약을 시작해보세요!'
                }
              </p>
              {reservationFilter === 'future' && (
                <button
                  onClick={() => router.push('/user')}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  버스 예약하기
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className={`p-6 border rounded-lg transition-all hover:shadow-md ${
                    reservation.status === 'confirmed'
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : reservation.status === 'cancelled'
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                          {reservation.bus_number || '버스 정보 없음'}
                        </h4>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                          reservation.status === 'confirmed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : reservation.status === 'cancelled'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {reservation.status === 'confirmed' ? '확정' :
                           reservation.status === 'cancelled' ? '취소됨' : '완료'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">노선 정보</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {reservation.route || '노선 정보 없음'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">좌석 번호</p>
                          <p className="text-gray-900 dark:text-gray-100 font-medium">
                            {reservation.seat_number}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">예약 날짜</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {new Date(reservation.reservation_date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">출발 시간</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {reservation.departure_time || '시간 정보 없음'}
                          </p>
                        </div>
                      </div>

                      {reservation.bus_type && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400">🚌</span>
                            <span className="text-sm text-blue-800 dark:text-blue-200">
                              버스 타입: {reservation.bus_type === '28-seat' ? '28인승 (2-1 배치)' : '45인승 (2-2 배치)'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 좌석표 시각화 */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            좌석 배치도 - 내 좌석 위치
                          </h5>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">일반 좌석</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-500 dark:bg-blue-600 border border-blue-600 dark:border-blue-400 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">내 예약 좌석</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                          {(() => {
                            const busType = reservation.bus_type || '28-seat'
                            const seats = generateBusSeats(busType)

                            // 내 좌석을 선택된 상태로 설정
                            const seatsWithMyReservation = seats.map(seat => ({
                              ...seat,
                              status: seat.id === reservation.seat_number ? 'available' : 'available'
                            }))

                            return (
                              <BusSeatLayout
                                seats={seatsWithMyReservation}
                                busType={busType}
                                highlightSeats={[reservation.seat_number]} // 내 좌석을 강조 표시
                                isDriver={true} // 클릭 비활성화
                              />
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      {reservation.status === 'confirmed' && reservation.reservation_date >= today && (
                        <button
                          onClick={() => handleCancelReservation(reservation.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          예약 취소
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/user')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              새 예약하기
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}