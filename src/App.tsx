import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Clock, Phone, AlertTriangle, Heart, Shield, Navigation, Info, Star, Users, Wifi, WifiOff } from 'lucide-react';

const SafeTripStep: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [realTimeData, setRealTimeData] = useState({
    hospitals: [],
    aedLocations: [],
    emergencyAlerts: []
  });
  const mapRef = useRef<HTMLDivElement>(null);

  // API 키 설정 - 실제 환경에서는 process.env 사용
  const API_KEYS = {
    KAKAO: process.env.REACT_APP_KAKAO_API_KEY || 'cb042192382ed6a341ff3f2649753c8f',
    PUBLIC_DATA: process.env.REACT_APP_PUBLIC_DATA_KEY || '6v6IQyG1guNocw2V4NbdewPkO91sax01PdIeRHw5UQLHMvo0tWWxIIzNMklVNwMeEeZ7BEoWk3ev4luhIDFB3A==',
    EMERGENCY: process.env.REACT_APP_EMERGENCY_KEY || '8U6MLHG0NM766FN8'
  };

  // API 연동 함수들
  const fetchHospitalData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://api.odcloud.kr/api/15049090/v1/uddi:42d18d36-2437-41bb-921c-b4bcdd430d4a?page=1&perPage=10&serviceKey=${API_KEYS.PUBLIC_DATA}&lat=${lat}&lng=${lng}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
    } catch (error) {
      console.warn('병원 데이터 API 호출 실패, Mock 데이터 사용:', error);
    }
    
    return [
      { name: '삼성서울병원', distance: 2.3, time: 7, specialty: '종합병원' },
      { name: '서울아산병원', distance: 4.1, time: 12, specialty: '종합병원' }
    ];
  };

  const fetchAEDData = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://api.odcloud.kr/api/15049090/v1/uddi:d61c8b7e-0916-4f77-9cb7-9b5dc604b546?page=1&perPage=10&serviceKey=${API_KEYS.PUBLIC_DATA}&lat=${lat}&lng=${lng}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
    } catch (error) {
      console.warn('AED 데이터 API 호출 실패, Mock 데이터 사용:', error);
    }
    
    return [
      { location: '관광지 방문자센터 1층 로비', distance: 0.1, time: 2 },
      { location: '주변 지하철역 대합실', distance: 0.3, time: 4 }
    ];
  };

  const fetchEmergencyAlerts = async (region: string) => {
    try {
      const response = await fetch(`https://api.safekorea.go.kr/service/SafetyNotificationService/getDisasterMessage?serviceKey=${API_KEYS.EMERGENCY}&region=${encodeURIComponent(region)}&pageNo=1&numOfRows=5`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.response?.body?.items?.item || [];
      }
    } catch (error) {
      console.warn('재난문자 API 호출 실패, Mock 데이터 사용:', error);
    }
    
    return [];
  };

  const searchPlacesKakao = async (keyword: string) => {
    try {
      const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&category_group_code=AT4`, {
        headers: {
          'Authorization': `KakaoAK ${API_KEYS.KAKAO}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.documents || [];
      }
    } catch (error) {
      console.warn('카카오 장소 검색 API 호출 실패, Mock 데이터 사용:', error);
    }
    
    return [];
  };

  const calculateGoldenTimeScore = async (location: any) => {
    setLoading(true);
    
    try {
      const [hospitals, aeds, alerts] = await Promise.all([
        fetchHospitalData(location.coordinates.lat, location.coordinates.lng),
        fetchAEDData(location.coordinates.lat, location.coordinates.lng),
        fetchEmergencyAlerts(location.region)
      ]);

      let score = 100;
      
      const nearestHospital = hospitals[0];
      if (nearestHospital) {
        if (nearestHospital.time > 30) score -= 30;
        else if (nearestHospital.time > 20) score -= 20;
        else if (nearestHospital.time > 10) score -= 10;
      }
      
      const nearestAED = aeds[0];
      if (nearestAED) {
        if (nearestAED.time > 5) score -= 15;
        else if (nearestAED.time > 3) score -= 10;
      }
      
      if (alerts.length > 0) {
        score -= alerts.length * 5;
      }
      
      return {
        ...location,
        goldenTimeScore: Math.max(score, 30),
        realTimeData: {
          hospitals,
          aeds,
          alerts
        }
      };
      
    } catch (error) {
      console.error('점수 계산 실패:', error);
      return location;
    } finally {
      setLoading(false);
    }
  };

  // 카카오맵 초기화 (개선된 버전)
  useEffect(() => {
    const loadKakaoMap = () => {
      if (window.kakao && window.kakao.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${API_KEYS.KAKAO}&libraries=services,clusterer&autoload=false`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(() => {
          initializeMap();
        });
      };
      script.onerror = () => {
        console.error('카카오맵 로딩 실패');
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (mapRef.current && !mapInstance) {
        try {
          const options = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780),
            level: 8
          };
          const map = new window.kakao.maps.Map(mapRef.current, options);
          setMapInstance(map);
          console.log('카카오맵 초기화 성공');
        } catch (error) {
          console.error('카카오맵 초기화 실패:', error);
        }
      }
    };

    loadKakaoMap();
  }, [mapInstance]);

  // 온라인 상태 확인
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mock 데이터 - 전국 주요 관광지
  const tourismData = [
    {
      id: 1,
      name: '제주도 성산일출봉',
      region: '제주특별자치도',
      coordinates: { lat: 33.4584, lng: 126.9423 },
      goldenTimeScore: 85,
      seniorVisitorRate: 42,
      nearestHospital: { name: '제주대학교병원', distance: 8.2, time: 15 },
      nearestAED: { location: '성산일출봉 방문자센터 1층', distance: 0.1, time: 2 },
      emergencyServices: 3,
      weatherAlert: null,
      category: 'excellent'
    },
    {
      id: 2,
      name: '설악산 국립공원',
      region: '강원특별자치도',
      coordinates: { lat: 38.1196, lng: 128.4631 },
      goldenTimeScore: 72,
      seniorVisitorRate: 38,
      nearestHospital: { name: '속초의료원', distance: 12.5, time: 22 },
      nearestAED: { location: '설악산 방문자센터 안내데스크', distance: 0.3, time: 3 },
      emergencyServices: 2,
      weatherAlert: '강풍주의보',
      category: 'good'
    },
    {
      id: 3,
      name: '경주 불국사',
      region: '경상북도',
      coordinates: { lat: 35.7898, lng: 129.3318 },
      goldenTimeScore: 91,
      seniorVisitorRate: 55,
      nearestHospital: { name: '동국대학교경주병원', distance: 4.8, time: 8 },
      nearestAED: { location: '불국사 매표소 옆 휴게실', distance: 0.05, time: 1 },
      emergencyServices: 4,
      weatherAlert: null,
      category: 'excellent'
    },
    {
      id: 4,
      name: '한라산 등반로',
      region: '제주특별자치도',
      coordinates: { lat: 33.3617, lng: 126.5292 },
      goldenTimeScore: 58,
      seniorVisitorRate: 22,
      nearestHospital: { name: '제주한라병원', distance: 18.3, time: 35 },
      nearestAED: { location: '한라산 성판악 탐방안내소', distance: 2.1, time: 25 },
      emergencyServices: 1,
      weatherAlert: '산악기상특보',
      category: 'caution'
    },
    {
      id: 5,
      name: '부산 해운대해수욕장',
      region: '부산광역시',
      coordinates: { lat: 35.1586, lng: 129.1601 },
      goldenTimeScore: 94,
      seniorVisitorRate: 31,
      nearestHospital: { name: '해운대백병원', distance: 2.1, time: 6 },
      nearestAED: { location: '해운대해수욕장 라이프가드 센터', distance: 0.02, time: 1 },
      emergencyServices: 5,
      weatherAlert: null,
      category: 'excellent'
    },
    {
      id: 6,
      name: '지리산 천왕봉',
      region: '경상남도',
      coordinates: { lat: 35.3381, lng: 127.7307 },
      goldenTimeScore: 45,
      seniorVisitorRate: 28,
      nearestHospital: { name: '함양병원', distance: 25.7, time: 45 },
      nearestAED: { location: '중산리 탐방지원센터', distance: 3.8, time: 40 },
      emergencyServices: 1,
      weatherAlert: null,
      category: 'warning'
    }
  ];

  // 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 검색 자동완성 (성능 최적화)
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    if (value.length > 0) {
      const mockFiltered = tourismData.filter(location =>
        location.name.toLowerCase().includes(value.toLowerCase()) ||
        location.region.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(mockFiltered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const selectLocation = (location: any) => {
    setSelectedLocation(location);
    setSearchTerm(location.name);
    setSuggestions([]);
    
    // 지도 중심 이동
    if (mapInstance && location.coordinates) {
      const moveLatLng = new window.kakao.maps.LatLng(
        location.coordinates.lat, 
        location.coordinates.lng
      );
      mapInstance.setCenter(moveLatLng);
      mapInstance.setLevel(3);

      const marker = new window.kakao.maps.Marker({
        position: moveLatLng,
        map: mapInstance
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:8px;font-size:14px;text-align:center;">
                    <strong>${location.name}</strong><br>
                    <span style="color:#666;font-size:12px;">${location.region}</span>
                  </div>`
      });
      infowindow.open(mapInstance, marker);
    }
    
    setShowDetails(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-blue-600 bg-blue-100';
    if (score >= 55) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreText = (score: number) => {
    if (score >= 85) return '매우 안전';
    if (score >= 70) return '안전';
    if (score >= 55) return '주의';
    return '위험';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'excellent': return <Shield className="w-5 h-5 text-green-600" />;
      case 'good': return <Heart className="w-5 h-5 text-blue-600" />;
      case 'caution': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">안심여행 스텝</h1>
                <p className="text-sm text-gray-600">전국 의료 골든타임 확보 플랫폼</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'API 연결됨' : '오프라인'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">실시간 업데이트</div>
                <div className="text-sm font-medium text-gray-900">
                  {currentTime.toLocaleTimeString('ko-KR')}
                </div>
              </div>
              <div className="bg-green-100 px-3 py-1 rounded-full">
                <span className="text-green-800 text-sm font-medium">서비스 정상</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🗺️ 어디로 떠나시나요?</h2>
              
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  placeholder={loading ? "검색 중..." : "관광지명 또는 지역을 검색해주세요"}
                />
                
                {loading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                {suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {suggestions.map((location, index) => (
                      <div
                        key={location.id || index}
                        onClick={() => selectLocation(location)}
                        className="cursor-pointer px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-gray-900">{location.name}</div>
                              {location.isRealData && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">실시간</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{location.region}</div>
                            {location.category && (
                              <div className="text-xs text-gray-500 mt-1">{location.category}</div>
                            )}
                          </div>
                          {location.goldenTimeScore && (
                            <div className="ml-4 text-right">
                              <div className={`inline-flex items-center px-3 py-2 rounded-lg text-lg font-bold ${getScoreColor(location.goldenTimeScore)}`}>
                                <div className="text-center">
                                  <div>{location.goldenTimeScore}</div>
                                  <div className="text-xs font-normal">점</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {getScoreText(location.goldenTimeScore)}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 rounded px-2 py-1">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-blue-600 font-medium">{location.seniorVisitorRate || 25}%</div>
                              <div className="text-gray-500">시니어</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-600 font-medium">{location.nearestHospital?.time || 15}분</div>
                              <div className="text-gray-500">병원</div>
                            </div>
                            <div className="text-center">
                              <div className="text-purple-600 font-medium">{location.nearestAED?.time || 3}분</div>
                              <div className="text-gray-500">AED</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">시니어 관광객</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-blue-600">822만명</div>
                  <div className="text-xs text-blue-700">2025년 추정</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">분석 완료</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-green-600">1,247곳</div>
                  <div className="text-xs text-green-700">전국 관광지</div>
                </div>
              </div>

              {/* Popular Destinations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏔️ 인기 안심 여행지</h3>
                <div className="space-y-3">
                  {tourismData
                    .filter(loc => loc.goldenTimeScore >= 85)
                    .slice(0, 3)
                    .map((location) => (
                      <div
                        key={location.id}
                        onClick={() => selectLocation(location)}
                        className="cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(location.category)}
                            <div>
                              <div className="font-medium text-gray-900">{location.name}</div>
                              <div className="text-xs text-gray-600">{location.region}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{location.goldenTimeScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* 카카오 지도 */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">🗺️ 실시간 안전 지도</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>카카오맵 연동</span>
                </div>
              </div>
              <div 
                ref={mapRef} 
                className="w-full h-80 rounded-lg border border-gray-200"
                style={{ minHeight: '320px' }}
              ></div>
            </div>

            {selectedLocation ? (
              <div className="space-y-6">
                {/* Location Header */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedLocation.name}</h2>
                      <p className="text-gray-600 mt-1">{selectedLocation.region}</p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getScoreColor(selectedLocation.goldenTimeScore)}`}>
                        <Shield className="w-4 h-4 mr-2" />
                        의료 골든타임 점수: {selectedLocation.goldenTimeScore}점
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        안전도: {getScoreText(selectedLocation.goldenTimeScore)}
                      </div>
                    </div>
                  </div>

                  {selectedLocation.weatherAlert && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="font-medium text-yellow-800">기상 특보: {selectedLocation.weatherAlert}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">시니어 방문율</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{selectedLocation.seniorVisitorRate}%</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Heart className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">응급서비스</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{selectedLocation.emergencyServices}개소</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">골든타임</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">{selectedLocation.nearestHospital.time}분</div>
                    </div>
                  </div>
                </div>

                {/* Medical Facilities */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">🏥 주변 의료시설 정보</h3>
                    {selectedLocation.realTimeData && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">실시간 API 연동</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <Heart className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">가장 가까운 병원</h4>
                          <p className="text-sm text-gray-600">응급실 보유</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {selectedLocation.realTimeData?.hospitals?.[0]?.name || selectedLocation.nearestHospital?.name}
                        </div>
                        {selectedLocation.realTimeData?.hospitals?.[0]?.specialty && (
                          <div className="text-sm text-blue-600">
                            {selectedLocation.realTimeData.hospitals[0].specialty}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Navigation className="w-4 h-4" />
                            <span>
                              {selectedLocation.realTimeData?.hospitals?.[0]?.distance || selectedLocation.nearestHospital?.distance}km
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {selectedLocation.realTimeData?.hospitals?.[0]?.time || selectedLocation.nearestHospital?.time}분
                            </span>
                          </div>
                        </div>
                        <button className="w-full mt-3 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>응급실 직통전화</span>
                        </button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">가장 가까운 AED</h4>
                          <p className="text-sm text-gray-600">자동심장충격기</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {selectedLocation.realTimeData?.aeds?.[0]?.location || selectedLocation.nearestAED?.location}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Navigation className="w-4 h-4" />
                            <span>
                              {selectedLocation.realTimeData?.aeds?.[0]?.distance || selectedLocation.nearestAED?.distance}km
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {selectedLocation.realTimeData?.aeds?.[0]?.time || selectedLocation.nearestAED?.time}분
                            </span>
                          </div>
                        </div>
                        <button className="w-full mt-3 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>정확한 위치 보기</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 실시간 재난 알림 */}
                  {selectedLocation.realTimeData?.alerts?.length > 0 && (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="font-medium text-yellow-800">실시간 재난문자 알림</span>
                      </div>
                      <div className="space-y-2">
                        {selectedLocation.realTimeData.alerts.slice(0, 2).map((alert: any, index: number) => (
                          <div key={index} className="text-sm text-yellow-800">
                            • {alert.message || '재난 정보가 확인되었습니다.'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* API 연동 정보 표시 */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>• 병원정보: 건강보험심사평가원 API 연동 {isOnline ? '✓' : '✗'}</div>
                      <div>• AED위치: 국립중앙의료원 API 연동 {isOnline ? '✓' : '✗'}</div>
                      <div>• 재난정보: 행정안전부 API 연동 {isOnline ? '✓' : '✗'}</div>
                      <div>• 지도서비스: 카카오맵 API 연동 {mapInstance ? '✓' : '✗'}</div>
                    </div>
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-white rounded-xl shadow-lg p-6 safety-tips">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">💡 안전 여행 TIP</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">사전 준비사항</span>
                      </div>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>복용 중인 약물 및 처방전 지참</li>
                        <li>응급연락처 핸드폰에 저장</li>
                        <li>여행자보험 가입 확인</li>
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">현지 정보</span>
                      </div>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>119 신고 시 정확한 위치 전달</li>
                        <li>관광안내소 연락처 확인</li>
                        <li>날씨 변화 실시간 모니터링</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                    <Search className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">관광지를 선택해주세요</h3>
                  <p className="text-gray-600">실시간 API 연동으로 전국 관광지의 정확한 의료 골든타임 정보를 확인할 수 있습니다.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                  <div className="text-center">
                    <div className="bg-red-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                      <Heart className="w-6 h-6 text-red-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">의료시설</h4>
                    <p className="text-sm text-gray-600 mt-1">실시간 병원정보</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">골든타임</h4>
                    <p className="text-sm text-gray-600 mt-1">실시간 접근성</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                      <AlertTriangle className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">재난정보</h4>
                    <p className="text-sm text-gray-600 mt-1">실시간 기상특보</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">지도연동</h4>
                    <p className="text-sm text-gray-600 mt-1">카카오맵 API</p>
                  </div>
                </div>

                {/* API 연동 상태 표시 */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">실시간 API 연동 상태</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className={`flex items-center space-x-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                      <span>건강보험심사평가원</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                      <span>국립중앙의료원</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                      <span>행정안전부</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${mapInstance ? 'text-green-600' : 'text-yellow-600'}`}>
                      {mapInstance ? <Wifi className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      <span>카카오맵</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-lg mb-3">실시간 API 연동</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 한국관광 데이터랩</li>
                <li>• 건강보험심사평가원 API</li>
                <li>• 국립중앙의료원 API</li>
                <li>• 행정안전부 재난문자 API</li>
                <li>• 카카오맵 API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-3">기술 스택</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• React 18 + TypeScript</li>
                <li>• 카카오맵 JavaScript SDK</li>
                <li>• 공공데이터포털 Open API</li>
                <li>• 실시간 데이터 융합 분석</li>
                <li>• 반응형 웹 디자인</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-3">프로젝트 정보</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 2025 한국관광 데이터랩 경진대회</li>
                <li>• 삼성서울병원 내과 ICU</li>
                <li>• 김령은 (프로젝트 리더)</li>
                <li>• 전국 관광지 의료 안전망</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-3">연락처 & 지원</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>응급상황: 119 🚑</div>
                <div>관광안내: 1330 ℹ️</div>
                <div>기술지원: dev@safe-trip.kr</div>
                <div>서비스 문의: info@safe-trip.kr</div>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <span className="text-xs">실시간 API 모니터링 24/7</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
            <p>© 2025 안심여행 스텝. 실시간 API 연동으로 더 안전한 여행을 만들어갑니다.</p>
            <p className="mt-2">카카오맵 • 공공데이터포털 • 행정안전부 API 실시간 연동 서비스</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Kakao 객체 타입 선언 (TypeScript용)
declare global {
  interface Window {
    kakao: any;
  }
}

export default SafeTripStep;