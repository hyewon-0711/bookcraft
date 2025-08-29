'use client'

import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { 
  Camera, 
  X, 
  RotateCcw,
  Flashlight,
  FlashlightOff,
  ScanLine
} from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (isbn: string) => void
  onClose: () => void
  isOpen: boolean
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [flashlight, setFlashlight] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualISBN, setManualISBN] = useState('')
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  // 카메라 시작
  const startCamera = async () => {
    try {
      setError(null)
      
      // 브라우저 지원 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('이 브라우저는 카메라를 지원하지 않습니다. Chrome, Firefox, Safari 최신 버전을 사용해주세요.')
        setHasPermission(false)
        return
      }

      // HTTPS 확인 (localhost는 예외)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setError('카메라 접근을 위해서는 HTTPS 연결이 필요합니다.')
        setHasPermission(false)
        return
      }
      
      // 기존 스트림 정리
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // ZXing 코드 리더 초기화
      if (!codeReaderRef.current) {
        try {
          codeReaderRef.current = new BrowserMultiFormatReader()
        } catch (zxingError) {
          console.error('ZXing 라이브러리 초기화 오류:', zxingError)
          setError('바코드 스캔 라이브러리를 로드할 수 없습니다. 페이지를 새로고침해주세요.')
          setHasPermission(false)
          return
        }
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        
        // 비디오가 완전히 로드된 후 스캔 시작
        videoRef.current.addEventListener('loadeddata', () => {
          console.log('비디오 데이터 로드 완료, 스캔 시작 준비')
          setTimeout(() => {
            startScanning()
          }, 500) // 500ms 대기 후 스캔 시작
        }, { once: true })
        
        // 이미 로드된 경우 즉시 스캔 시작
        if (videoRef.current.readyState >= 2) {
          console.log('비디오 이미 준비됨, 스캔 시작')
          setTimeout(() => {
            startScanning()
          }, 500)
        }
      }
    } catch (err: any) {
      console.error('카메라 접근 오류:', err)
      setHasPermission(false)
      
      // 구체적인 오류 메시지 제공
      if (err.name === 'NotAllowedError') {
        setError('카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.')
      } else if (err.name === 'NotFoundError') {
        setError('카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.')
      } else if (err.name === 'NotSupportedError') {
        setError('이 브라우저는 카메라를 지원하지 않습니다.')
      } else if (err.name === 'NotReadableError') {
        setError('카메라가 다른 애플리케이션에서 사용 중입니다.')
      } else {
        setError(`카메라 접근 오류: ${err.message || '알 수 없는 오류가 발생했습니다.'}`)
      }
    }
  }

  // 카메라 정지
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
    }
    
    setIsScanning(false)
  }

  // 바코드 스캔 시작
  const startScanning = async () => {
    // 컴포넌트가 준비될 때까지 대기
    let retryCount = 0
    const maxRetries = 10
    
    while (retryCount < maxRetries) {
      if (videoRef.current && codeReaderRef.current) {
        break
      }
      
      console.log(`컴포넌트 준비 대기 중... (${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, 200))
      retryCount++
    }
    
    if (!videoRef.current || !codeReaderRef.current) {
      console.error('비디오 요소 또는 코드 리더가 준비되지 않았습니다.')
      setError('카메라 초기화에 실패했습니다. 페이지를 새로고침해주세요.')
      return
    }

    setIsScanning(true)
    
    try {
      // 비디오가 준비될 때까지 대기
      if (videoRef.current.readyState < 2) {
        console.log('비디오 준비 대기 중...')
        await new Promise((resolve, reject) => {
          let attempts = 0
          const maxAttempts = 50 // 5초 대기
          
          const checkReady = () => {
            attempts++
            if (videoRef.current && videoRef.current.readyState >= 2) {
              console.log('비디오 준비 완료')
              resolve(true)
            } else if (attempts >= maxAttempts) {
              reject(new Error('비디오 준비 시간 초과'))
            } else {
              setTimeout(checkReady, 100)
            }
          }
          checkReady()
        })
      }

      console.log('바코드 스캔 시작')
      
      // ZXing을 사용한 실시간 바코드 스캔
      await codeReaderRef.current.decodeFromVideoDevice(
        null, // 기본 카메라 사용
        videoRef.current,
        (result, error) => {
          if (result) {
            // 바코드 감지 성공
            const text = result.getText()
            console.log('바코드 감지됨:', text)
            
            // ISBN 형식 검증 (10자리 또는 13자리)
            if (isValidISBN(text)) {
              handleBarcodeDetected(text)
            } else {
              console.log('유효하지 않은 ISBN 형식:', text)
            }
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.error('바코드 스캔 오류:', error)
          }
        }
      )
    } catch (err: any) {
      console.error('스캔 시작 오류:', err)
      setError(`바코드 스캔을 시작할 수 없습니다: ${err.message || '알 수 없는 오류'}`)
      setIsScanning(false)
    }
  }

  // ISBN 형식 검증
  const isValidISBN = (text: string): boolean => {
    // 숫자와 X만 추출 (ISBN-10에서 X는 체크 디지트로 사용됨)
    const cleaned = text.replace(/[^0-9X]/gi, '').toUpperCase()
    
    // ISBN-10 (10자리, 마지막은 X 가능)
    if (cleaned.length === 10) {
      const digits = cleaned.slice(0, 9)
      const checkDigit = cleaned.slice(9)
      return /^\d{9}$/.test(digits) && /^[0-9X]$/.test(checkDigit)
    }
    
    // ISBN-13 (13자리, 모두 숫자)
    if (cleaned.length === 13) {
      return /^\d{13}$/.test(cleaned) && (cleaned.startsWith('978') || cleaned.startsWith('979'))
    }
    
    return false
  }

  // 바코드 감지 처리
  const handleBarcodeDetected = (isbn: string) => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
    }
    
    setIsScanning(false)
    onScan(isbn)
  }

  // 수동 ISBN 입력 처리
  const handleManualISBN = () => {
    const cleanedISBN = manualISBN.replace(/[^0-9X]/gi, '').toUpperCase()
    
    if (isValidISBN(cleanedISBN)) {
      onScan(cleanedISBN)
      setManualISBN('')
      setShowManualInput(false)
    } else {
      setError('유효하지 않은 ISBN 형식입니다. 10자리 또는 13자리 ISBN을 입력해주세요.')
    }
  }

  // 카메라 전환
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  // 플래시 토글
  const toggleFlashlight = async () => {
    if (!stream) return

    try {
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities() as any
      
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashlight } as any]
        })
        setFlashlight(!flashlight)
      }
    } catch (err) {
      console.error('플래시 제어 오류:', err)
    }
  }

  // 컴포넌트 마운트/언마운트 처리
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, facingMode])

  // 권한 요청
  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setHasPermission(true)
      startCamera()
    } catch (err) {
      setHasPermission(false)
      setError('카메라 권한이 거부되었습니다.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center space-x-2">
              <ScanLine className="h-6 w-6" />
              <span>바코드 스캔</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {hasPermission === null && (
            <div className="text-center space-y-4">
              <Camera className="h-16 w-16 mx-auto text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  카메라 권한 필요
                </h3>
                <p className="text-gray-600 mb-4">
                  책의 바코드를 스캔하기 위해 카메라 접근 권한이 필요합니다.
                </p>
                <Button onClick={requestPermission} className="w-full rounded-2xl">
                  카메라 권한 허용
                </Button>
              </div>
            </div>
          )}

          {hasPermission === false && (
            <div className="text-center space-y-4">
              <div className="text-red-500">
                <Camera className="h-16 w-16 mx-auto" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  카메라 접근 불가
                </h3>
                <p className="text-gray-600 mb-4">
                  {error || '카메라에 접근할 수 없습니다.'}
                </p>
                <Button 
                  onClick={requestPermission} 
                  variant="outline" 
                  className="w-full rounded-2xl"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          )}

          {hasPermission === true && (
            <div className="space-y-4">
              {/* 카메라 뷰 */}
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* 스캔 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* 스캔 프레임 */}
                    <div className="w-64 h-40 border-2 border-white rounded-lg relative">
                      {/* 모서리 표시 */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                      
                      {/* 스캔 라인 */}
                      {isScanning && (
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400 animate-pulse"></div>
                      )}
                    </div>
                    
                    {/* 안내 텍스트 */}
                    <div className="text-white text-center mt-4">
                      <p className="text-sm">
                        {isScanning ? '바코드를 스캔하는 중...' : '바코드를 프레임 안에 맞춰주세요'}
                      </p>
                      {error && (
                        <p className="text-red-300 text-xs mt-2 bg-red-900 bg-opacity-50 px-2 py-1 rounded">
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                

              </div>

              {/* 컨트롤 버튼들 */}
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  className="rounded-2xl"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  카메라 전환
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFlashlight}
                  className="rounded-2xl"
                >
                  {flashlight ? (
                    <FlashlightOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Flashlight className="h-4 w-4 mr-2" />
                  )}
                  {flashlight ? '플래시 끄기' : '플래시 켜기'}
                </Button>
              </div>

              {/* 수동 입력 옵션 */}
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">
                  바코드 스캔이 어려우신가요?
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowManualInput(true)}
                  className="text-blue-600 hover:bg-blue-50 rounded-2xl"
                >
                  수동으로 ISBN 입력하기
                </Button>
              </div>

              {/* 수동 ISBN 입력 모달 */}
              {showManualInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                    <h3 className="text-lg font-semibold mb-4">ISBN 수동 입력</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ISBN (10자리 또는 13자리)
                        </label>
                        <input
                          type="text"
                          value={manualISBN}
                          onChange={(e) => setManualISBN(e.target.value)}
                          placeholder="예: 9788936434267"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={13}
                        />
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => {
                            setShowManualInput(false)
                            setManualISBN('')
                            setError(null)
                          }}
                          variant="outline"
                          className="flex-1 rounded-xl"
                        >
                          취소
                        </Button>
                        <Button
                          onClick={handleManualISBN}
                          disabled={!manualISBN.trim()}
                          className="flex-1 rounded-xl"
                        >
                          확인
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 바코드 스캔 훅
export function useBarcodeScanner() {
  const [isOpen, setIsOpen] = useState(false)
  const [scannedISBN, setScannedISBN] = useState<string | null>(null)

  const openScanner = () => setIsOpen(true)
  const closeScanner = () => setIsOpen(false)
  
  const handleScan = (isbn: string) => {
    setScannedISBN(isbn)
    setIsOpen(false)
  }

  return {
    isOpen,
    scannedISBN,
    openScanner,
    closeScanner,
    handleScan,
    clearScannedISBN: () => setScannedISBN(null)
  }
}