'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Upload,
  X,
  Star,
  Calendar,
  User,
  Hash,
  Sparkles,
  Trophy,
  Zap,
  Crown,
  ScanLine
} from 'lucide-react'
import { useAuth } from '@/lib/providers'
import { BarcodeScanner, useBarcodeScanner } from '@/components/ui/barcode-scanner'

interface Book {
  id: string
  title: string
  author: string
  isbn?: string
  cover_image_url?: string
  description?: string
  page_count?: number
  publisher?: string
  published_date?: string
  genre?: string
  created_at: string
}

export default function BooksPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isbnSearch, setIsbnSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const { isOpen: isScannerOpen, scannedISBN, openScanner, closeScanner, handleScan, clearScannedISBN } = useBarcodeScanner()
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    description: '',
    page_count: '',
    publisher: '',
    published_date: '',
    genre: '',
    cover_image_url: ''
  })

  // 책 목록 불러오기
  const fetchBooks = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/books', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBooks(data.books || [])
      } else {
        console.error('책 목록 불러오기 실패')
      }
    } catch (error) {
      console.error('책 목록 불러오기 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 책 목록 불러오기
  useEffect(() => {
    if (user) {
      fetchBooks()
    } else {
      setIsLoading(false)
    }
  }, [user])

  // ISBN으로 책 정보 검색
  const searchByISBN = async (isbn?: string) => {
    const searchISBN = isbn || isbnSearch.trim()
    if (!searchISBN) return
    
    setIsSearching(true)
    try {
      // Google Books API를 사용한 ISBN 검색
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${searchISBN}`
      )
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const bookInfo = data.items[0].volumeInfo
        setNewBook({
          title: bookInfo.title || '',
          author: bookInfo.authors?.join(', ') || '',
          isbn: searchISBN,
          description: bookInfo.description || '',
          page_count: bookInfo.pageCount?.toString() || '',
          publisher: bookInfo.publisher || '',
          published_date: bookInfo.publishedDate || '',
          genre: bookInfo.categories?.join(', ') || '',
          cover_image_url: bookInfo.imageLinks?.thumbnail || ''
        })
        setShowAddForm(true)
        setIsbnSearch('') // 검색 필드 초기화
      } else {
        alert('해당 ISBN으로 책을 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('ISBN 검색 오류:', error)
      alert('책 정보를 가져오는 중 오류가 발생했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  // 바코드 스캔 처리
  const handleBarcodeScanned = (isbn: string) => {
    handleScan(isbn)
    searchByISBN(isbn)
  }

  // 스캔된 ISBN 처리
  useEffect(() => {
    if (scannedISBN) {
      searchByISBN(scannedISBN)
      clearScannedISBN()
    }
  }, [scannedISBN])

  // 검색 버튼 클릭 처리
  const handleSearchClick = () => {
    searchByISBN()
  }

  // 수동으로 책 추가
  const addManualBook = () => {
    setNewBook({
      title: '',
      author: '',
      isbn: '',
      description: '',
      page_count: '',
      publisher: '',
      published_date: '',
      genre: '',
      cover_image_url: ''
    })
    setShowAddForm(true)
  }

  // 책 저장
  const saveBook = async () => {
    if (!newBook.title || !newBook.author) {
      alert('제목과 저자는 필수 입력 항목입니다.')
      return
    }

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...newBook,
          page_count: newBook.page_count ? parseInt(newBook.page_count) : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setBooks([...books, data.book])
        setShowAddForm(false)
        setIsbnSearch('')
        alert('책이 성공적으로 등록되었습니다!')
        // 목록 새로고침
        fetchBooks()
      } else {
        const error = await response.json()
        alert(error.message || '책 등록에 실패했습니다.')
      }
    } catch (error) {
      console.error('책 저장 오류:', error)
      alert('책 저장 중 오류가 발생했습니다.')
    }
  }

  // 폼 취소
  const cancelForm = () => {
    setShowAddForm(false)
    setIsbnSearch('')
    setNewBook({
      title: '',
      author: '',
      isbn: '',
      description: '',
      page_count: '',
      publisher: '',
      published_date: '',
      genre: '',
      cover_image_url: ''
    })
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600">책을 등록하려면 로그인해주세요.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <div>
      <MainLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8">
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full opacity-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-400 rounded-full opacity-10 animate-bounce"></div>
            
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-full">
                    <BookOpen className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                    📚 나만의 책장
                  </h1>
                  <p className="text-gray-200 text-lg">
                    새로운 책을 등록하고 독서 모험을 시작해보세요!
                  </p>
                  <div className="mt-3 flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-yellow-300">
                      <Trophy className="h-4 w-4" />
                      <span>등록된 책: {books.length}권</span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-300">
                      <Zap className="h-4 w-4" />
                      <span>책 등록 시 +50 XP</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={addManualBook} 
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-full shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                ✨ 새 책 추가하기
              </Button>
            </div>
          </div>

          {/* ISBN 검색 */}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-bl-3xl flex items-center justify-center">
              <Search className="h-8 w-8 text-white" />
            </div>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">🔍 ISBN 스마트 검색</CardTitle>
                  <CardDescription className="text-gray-700">
                    ISBN을 입력하면 책 정보를 자동으로 가져와 빠르게 등록할 수 있어요
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="📖 ISBN을 입력하세요 (예: 9788936434267)"
                  value={isbnSearch}
                  onChange={(e) => setIsbnSearch(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearchClick()}
                  className="border-2 border-blue-200 focus:border-blue-400 rounded-xl"
                />
                <Button 
                  onClick={openScanner}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <ScanLine className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={handleSearchClick} 
                  disabled={isSearching || !isbnSearch.trim()}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {isSearching ? '🔍 검색 중...' : '⚡ 검색'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 책 추가 폼 */}
          {showAddForm && (
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 shadow-2xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-bl-3xl flex items-center justify-center">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">📝 새 책 등록</CardTitle>
                      <p className="text-gray-600">모험의 새로운 장을 추가해보세요!</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelForm} className="hover:bg-red-100 rounded-full">
                    <X className="h-5 w-5 text-gray-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">제목 *</Label>
                    <Input
                      id="title"
                      value={newBook.title}
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      placeholder="책 제목을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">저자 *</Label>
                    <Input
                      id="author"
                      value={newBook.author}
                      onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                      placeholder="저자명을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={newBook.isbn}
                      onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                      placeholder="ISBN을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genre">장르</Label>
                    <Input
                      id="genre"
                      value={newBook.genre}
                      onChange={(e) => setNewBook({...newBook, genre: e.target.value})}
                      placeholder="장르를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publisher">출판사</Label>
                    <Input
                      id="publisher"
                      value={newBook.publisher}
                      onChange={(e) => setNewBook({...newBook, publisher: e.target.value})}
                      placeholder="출판사를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="published_date">출간일</Label>
                    <Input
                      id="published_date"
                      type="date"
                      value={newBook.published_date}
                      onChange={(e) => setNewBook({...newBook, published_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page_count">페이지 수</Label>
                    <Input
                      id="page_count"
                      type="number"
                      value={newBook.page_count}
                      onChange={(e) => setNewBook({...newBook, page_count: e.target.value})}
                      placeholder="페이지 수를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cover_image_url">표지 이미지 URL</Label>
                    <Input
                      id="cover_image_url"
                      value={newBook.cover_image_url}
                      onChange={(e) => setNewBook({...newBook, cover_image_url: e.target.value})}
                      placeholder="표지 이미지 URL을 입력하세요"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={newBook.description}
                    onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                    placeholder="책에 대한 설명을 입력하세요"
                    rows={3}
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <Button 
                    onClick={saveBook} 
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    🚀 책 등록하고 +50 XP 획득하기
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={cancelForm}
                    className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-bold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 책 목록 */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">📚 나의 도서관 ({books.length}권)</h2>
            </div>
            
            {books.length === 0 ? (
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-100">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-500 rounded-bl-3xl opacity-10"></div>
                <CardContent className="text-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-purple-400 to-pink-500 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">
                    🎮 첫 번째 모험을 시작해보세요!
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    아직 등록된 책이 없습니다.<br />
                    첫 번째 책을 등록하고 독서 여정을 시작해보세요!
                  </p>
                  <Button 
                    onClick={addManualBook}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-full shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    🚀 첫 번째 책 등록하기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {books.map((book) => (
                  <Card key={book.id} className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-bl-2xl flex items-center justify-center">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <CardContent className="p-4">
                      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                        {book.cover_image_url ? (
                          <img 
                            src={book.cover_image_url} 
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-indigo-400 to-purple-500 w-full h-full flex items-center justify-center">
                            <BookOpen className="h-12 w-12 text-white" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-sm mb-2 line-clamp-2 text-gray-900 group-hover:text-purple-600 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 font-medium">
                        👤 {book.author}
                      </p>
                      {book.genre && (
                        <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-0 text-xs mb-3 font-semibold">
                          🏷️ {book.genre}
                        </Badge>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {book.page_count && (
                          <span className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                            <Hash className="h-3 w-3" />
                            {book.page_count}p
                          </span>
                        )}
                        {book.published_date && (
                          <span className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                            <Calendar className="h-3 w-3" />
                            {new Date(book.published_date).getFullYear()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 바코드 스캐너 */}
        <BarcodeScanner
          isOpen={isScannerOpen}
          onScan={handleBarcodeScanned}
          onClose={closeScanner}
        />
      </MainLayout>
    </div>
  )
}