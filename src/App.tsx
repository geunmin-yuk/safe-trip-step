import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Shield, 
  Hospital, 
  Star, 
  Users, 
  CheckCircle2,
  Wifi,
  Clock,
  Navigation,
  Phone,
  AlertTriangle,
  Heart
} from 'lucide-react';

interface TouristSpot {
  id: string;
  name: string;
  location: string;
  safetyScore: number;
  rating: number;
  category: string;
  medicalFacilities: number;
  crowdLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

interface MedicalFacility {
  name: string;
  type: string;
  distance: string;
  phone: string;
}

const SafeTripApp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [showMedicalFacilities, setShowMedicalFacilities] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('10:06:58');

  // 모의 데이터
  const touristSpots: TouristSpot[] = [
    {
      id: '1',
      name: '제주도 성산일출봉',
      location: '제주특별자치도',
      safetyScore: 95,
      rating: 4.8,
      category: '자연명소',
      medicalFacilities: 12,
      crowdLevel: 'medium',
      lastUpdated: '5분 전'
    },
    {
      id: '2',
      name: '경주 불국사',
      location: '경상북도',
      safetyScore: 91,
      rating: 4.7,
      category: '문화재',
      medicalFacilities: 8,
      crowdLevel: 'low',
      lastUpdated: '3분 전'
    },
    {
      id: '3',
      name: '부산 해운대해수욕장',
      location: '부산광역시',
      safetyScore: 94,
      rating: 4.6,
      category: '해변',
      medicalFacilities: 15,
      crowdLevel: 'high',
      lastUpdated: '1분 전'
    }
  ];

  const medicalFacilities: MedicalFacility[] = [
    { name: '제주대학교병원', type: '종합병원', distance: '2.3km', phone: '064-717-1234' },
    { name: '성산보건소', type: '보건소', distance: '0.8km', phone: '064-760-4000' },
    { name: '성산응급의료센터', type: '응급실', distance: '1.2km', phone: '064-782-5678' }
  ];

  const [filteredSpots, setFilteredSpots] = useState(touristSpots);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSpots(touristSpots);
    } else {
      const filtered = touristSpots.filter(spot =>
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSpots(filtered);
    }
  }, [searchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLastUpdate(now.toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSafetyLevel = (score: number) => {
    if (score >= 90) return '매우 안전';
    if (score >= 80) return '안전';
    if (score >= 70) return '주의';
    return '위험';
  };

  const getCrowdLevelText = (level: string) => {
    const levels = {
      'low': '여유',
      'medium': '보통',
      'high': '혼잡'
    };
    return levels[level as keyof typeof levels];
  };

  const getCrowdLevelColor = (level: string) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-red-600'
    };
    return colors[level as keyof typeof colors];
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">안심여행 스펙</h1>
                <p className="text-xs text-gray-500">한국 의료 골든타임 안심 플랫폼</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-xs text-gray-600">API 연결됨</span>
              </div>
              <div className="text-xs text-gray-500">
                실시간 업데이트<br />
                오늘 {lastUpdate}
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                서비스 정상
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <h2 className="font-semibold text-gray-900">어디로 떠나시나요?</h2>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="관광지나 또는 지역을 검색해주세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
            />
          </div>
        </div>

        {/* Real-time Safety Map */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">실시간 안전 지도</h3>
              </div>
              <button className="text-sm text-blue-600 font-medium">
                카카오맵 연동
              </button>
            </div>
          </div>
          <div className="h-48 bg-gradient-to-br from-green-50 to-blue-50 relative flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">실시간 안전 지도</p>
              <p className="text-xs text-gray-500 mt-1">제주도 성산일출봉</p>
              <div className="absolute top-4 right-4 bg-white rounded-lg px-2 py-1 shadow-sm">
                <span className="text-xs text-green-600 font-medium">안전 지역</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-600">사고 관광지</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">822만명</div>
            <div className="text-xs text-gray-500">2023년 수치</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-green-600">분실완료</span>
            </div>
            <div className="text-2xl font-bold text-green-600">1,247곳</div>
            <div className="text-xs text-gray-500">진료 완료지</div>
          </div>
        </div>

        {/* Search Results or Popular Spots */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">
                {searchQuery ? `검색 결과` : '인기 안심 여행지'}
              </h3>
            </div>
            {!searchQuery && (
              <span className="text-xs text-gray-500">실시간 업데이트</span>
            )}
          </div>

          <div className="space-y-3">
            {filteredSpots.map((spot) => (
              <div key={spot.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">{spot.name}</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">{spot.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{spot.location}</p>
                    
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <Shield className="w-3 h-3 text-green-500" />
                        <span className="text-green-600 font-medium">
                          안심점수 {spot.safetyScore}점
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className={`w-3 h-3 ${getCrowdLevelColor(spot.crowdLevel)}`} />
                        <span className={getCrowdLevelColor(spot.crowdLevel)}>
                          {getCrowdLevelText(spot.crowdLevel)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getSafetyScoreColor(spot.safetyScore)}`}>
                      {getSafetyLevel(spot.safetyScore)}
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedSpot(spot);
                        setShowMedicalFacilities(true);
                      }}
                      className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Hospital className="w-3 h-3" />
                      <span>주변 의료시설</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSpots.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">다른 키워드로 검색해보세요.</p>
            </div>
          )}
        </div>

        {/* No Search Results Message */}
        {searchQuery && filteredSpots.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">새로운 지역이네요!</h3>
            <p className="text-sm text-gray-500 mb-4">
              입력하신 지역의 안심점수를 분석 중입니다.
            </p>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 관광데이터랩과 연동하여 실시간으로<br />
                안전 정보를 수집하고 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Medical Facilities Modal */}
      {showMedicalFacilities && selectedSpot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-md mx-auto max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Hospital className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900">주변 의료시설</h3>
                </div>
                <button
                  onClick={() => setShowMedicalFacilities(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{selectedSpot.name} 기준</p>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {medicalFacilities.map((facility, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{facility.name}</h4>
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">
                        {facility.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-600">{facility.distance}</span>
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-blue-600">{facility.phone}</span>
                        </div>
                      </div>
                      <button className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                        길찾기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeTripApp;
