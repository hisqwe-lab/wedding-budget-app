import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, X, Trash2, Calendar, Wallet, Check, AlertCircle, 
  PiggyBank, Coins, Settings, ChevronRight, BarChart2, Info, FileText, UploadCloud
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, addDoc, 
  updateDoc, deleteDoc, setDoc, getDoc, getDocs, writeBatch 
} from 'firebase/firestore';

// --- Firebase Initialization ---
// 환경에 따라 동적으로 제공되는 firebaseConfig를 최우선으로 적용합니다.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyD7C_eXSProB9UTakBTBJJVy5qysX6GCio",
      authDomain: "wedding-budget-app-1375a.firebaseapp.com",
      projectId: "wedding-budget-app-1375a",
      storageBucket: "wedding-budget-app-1375a.firebasestorage.app",
      messagingSenderId: "494112524371",
      appId: "1:494112524371:web:9fd5fcd2575266cdfc9ea6"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 환경에 맞는 동적 App ID를 부여하여 Rule 1 권한 위반을 원천 봉쇄합니다.
const appId = typeof __app_id !== 'undefined' ? __app_id : "wedding-budget-app";
const SHARED_ROOM_ID = "wedding-2026-karon-8f3a9x";

const CATEGORIES = ['전체', '본식', '스튜디오', '드레스/예복', '메이크업', '신혼여행', '결혼반지', '기타'];
const INPUT_CATEGORIES = CATEGORIES.slice(1);

// 카테고리별 대표 테마 색상 (차트 및 태그용)
const CATEGORY_COLORS = {
  '본식': 'bg-rose-500',
  '스튜디오': 'bg-pink-400',
  '드레스/예복': 'bg-purple-400',
  '메이크업': 'bg-amber-400',
  '신혼여행': 'bg-sky-400',
  '결혼반지': 'bg-teal-400',
  '기타': 'bg-gray-400'
};

// 엑셀 이미지에서 정밀 파싱해 낸 전체 세부 지출 항목 목록
const EXCEL_MOCK_DATA = [
  // --- 본식 ---
  { category: '본식', title: '대관료/웨딩디렉팅/웨딩세레머니 등', company: '너비아니', totalCost: 7000000, deposit: 2000000, depositDate: '2026-03-01', balance: 5000000, balanceDate: '', note: '대관료, 혼주메이크업, 포토테이블, 웨딩 세레머니 등 포함', paymentMethod: '현금' },
  { category: '본식', title: '식대 (72,500원 / 200명)', company: '디디디', totalCost: 14500000, deposit: 0, depositDate: '', balance: 14500000, balanceDate: '', note: '200명의 하객을 채워야 함', paymentMethod: '현금' },
  { category: '본식', title: '부케', company: '플래너 할인', totalCost: 200000, deposit: 200000, depositDate: '2026-03-13', balance: 0, balanceDate: '2026-09-18', note: '계약일자 2026-03-13, 잔금처리 2026-09-18', paymentMethod: '할인' },
  { category: '본식', title: '사회자', company: '미정', totalCost: 300000, deposit: 0, depositDate: '', balance: 300000, balanceDate: '2026-12-31', note: '누구로 줄지 정해야 함', paymentMethod: '현금' },
  { category: '본식', title: '축가', company: '영우친구', totalCost: 300000, deposit: 0, depositDate: '', balance: 300000, balanceDate: '2026-12-31', note: '영우친구 전달 예정', paymentMethod: '현금' },
  { category: '본식', title: '혼주 한복', company: '나비부인 조경희', totalCost: 900000, deposit: 0, depositDate: '', balance: 900000, balanceDate: '2026-12-31', note: '신모 한복 (3번) / 변경 45만원 당일 계약혜택으로 45만원 할인', paymentMethod: '카드' },
  { category: '본식', title: '혼주 메이크업', company: '율리아(미정) / 혼주 19.8만원', totalCost: 990000, deposit: 0, depositDate: '', balance: 990000, balanceDate: '2027-03-07', note: '그냥 5명으로 잡음', paymentMethod: '카드' },
  { category: '본식', title: '청첩장(종이)', company: '플래너가 준 것 확인 필요', totalCost: 150000, deposit: 0, depositDate: '', balance: 150000, balanceDate: '2026-12-31', note: '플래너가 순서 확인 필요', paymentMethod: '카드' },
  { category: '본식', title: '답례품', company: '신혼여행 디너약서', totalCost: 500000, deposit: 0, depositDate: '', balance: 500000, balanceDate: '2026-09-18', note: '뭐해야하나 고민', paymentMethod: '카드' },
  { category: '본식', title: '헬퍼비', company: '포레스타블랙', totalCost: 300000, deposit: 0, depositDate: '', balance: 300000, balanceDate: '2027-03-07', note: '기본 25만원 / 안양이외 5만원 추가', paymentMethod: '현금' },

  // --- 스튜디오 ---
  { category: '스튜디오', title: '드레스3벌+턱시도1벌/신랑신부 헤메 등', company: '아프토리세이', totalCost: 1210000, deposit: 500000, depositDate: '2026-03-13', balance: 710000, balanceDate: '2026-07-17', note: '촬영 2026-09-18 12시까지 표정연습', paymentMethod: '현금' },
  { category: '스튜디오', title: '플래너 할인', company: '플래너 할인', totalCost: 200000, deposit: 200000, depositDate: '2026-03-13', balance: 0, balanceDate: '2026-09-18', note: '할인처리 내역', paymentMethod: '할인' },
  { category: '스튜디오', title: '헬퍼비', company: '필수별도', totalCost: 250000, deposit: 0, depositDate: '', balance: 250000, balanceDate: '2026-09-18', note: '현금 지급 필수', paymentMethod: '현금' },
  { category: '스튜디오', title: '원본+수정본', company: '필수별도', totalCost: 440000, deposit: 440000, depositDate: '2026-03-19', balance: 0, balanceDate: '2026-09-18', note: '계약금 440,000 완납', paymentMethod: '카드' },
  { category: '스튜디오', title: '야간(야외)촬영', company: '선택별도', totalCost: 220000, deposit: 0, depositDate: '', balance: 220000, balanceDate: '2026-09-18', note: '야간 촬영 옵션비용', paymentMethod: '카드' },
  { category: '스튜디오', title: '여자 헤어 변형', company: '선택별도', totalCost: 880000, deposit: 0, depositDate: '', balance: 88000, balanceDate: '2026-09-18', note: '헤어 변형 진행비용', paymentMethod: '카드' },
  { category: '스튜디오', title: '남자 헤어 변형', company: '선택별도', totalCost: 55000, deposit: 0, depositDate: '', balance: 55000, balanceDate: '2026-09-18', note: '남자 헤어 변형 선택옵션', paymentMethod: '카드' },
  { category: '스튜디오', title: '여자 피스 추가', company: '선택별도', totalCost: 120000, deposit: 0, depositDate: '', balance: 120000, balanceDate: '2026-09-18', note: '헤어 피스 추가비용', paymentMethod: '카드' },
  { category: '스튜디오', title: '유색드레스', company: '선택별도', totalCost: 220000, deposit: 0, depositDate: '', balance: 220000, balanceDate: '2026-09-18', note: '유색 드레스 대여비', paymentMethod: '카드' },
  { category: '스튜디오', title: '신상 드레스', company: '선택별도', totalCost: 165000, deposit: 0, depositDate: '', balance: 165000, balanceDate: '2026-09-18', note: '드레스 신상 추가 업그레이드', paymentMethod: '카드' },

  // --- 드레스/예복 ---
  { category: '드레스/예복', title: '본식 드레스', company: '줄리엣발코니', totalCost: 850000, deposit: 0, depositDate: '', balance: 850000, balanceDate: '2026-07-17', note: '드레스 대여 잔금', paymentMethod: '' },
  { category: '드레스/예복', title: '본식 정장', company: '미정', totalCost: 800000, deposit: 0, depositDate: '', balance: 800000, balanceDate: '2027-03-07', note: '맞춤 및 대여 예정', paymentMethod: '' },

  // --- 메이크업 ---
  { category: '메이크업', title: '신랑 신부 헤메', company: '포레스타블랙', totalCost: 560000, deposit: 330000, depositDate: '2026-03-13', balance: 230000, balanceDate: '2026-07-17', note: '33만원 스드메 플래너 할인 반영', paymentMethod: '' },
  { category: '메이크업', title: '얼리비용', company: '포레스타블랙', totalCost: 165000, deposit: 0, depositDate: '', balance: 165000, balanceDate: '2027-03-07', note: '이른 아침 메이크업 스타트 비용', paymentMethod: '' },

  // --- 신혼여행 ---
  { category: '신혼여행', title: '비행기 예약', company: '미정', totalCost: 4000000, deposit: 0, depositDate: '', balance: 4000000, balanceDate: '2026-12-31', note: '항공권 결제 예정', paymentMethod: '' },
  { category: '신혼여행', title: '숙소 예약', company: '미정', totalCost: 5000000, deposit: 0, depositDate: '', balance: 5000000, balanceDate: '2026-12-31', note: '호텔 및 풀빌라 비용', paymentMethod: '' },
  { category: '신혼여행', title: '여행자보험', company: '미정', totalCost: 200000, deposit: 0, depositDate: '', balance: 200000, balanceDate: '2026-12-31', note: '필수 안전 가입', paymentMethod: '' },
  { category: '신혼여행', title: '지인 선물', company: '미정', totalCost: 500000, deposit: 0, depositDate: '', balance: 500000, balanceDate: '2026-12-31', note: '답례용 쇼핑 경비', paymentMethod: '' },
  { category: '신혼여행', title: '식비 및 활동비', company: '미정', totalCost: 1000000, deposit: 0, depositDate: '', balance: 1000000, balanceDate: '2026-12-31', note: '자유 일정 경비', paymentMethod: '' },

  // --- 결혼반지 ---
  { category: '결혼반지', title: '웨딩 반지 완성본', company: '미정', totalCost: 5000000, deposit: 0, depositDate: '', balance: 5000000, balanceDate: '2026-12-31', note: '웨딩 링 제작 최종대금', paymentMethod: '' }
];

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '';
  return Number(num).toLocaleString('ko-KR');
};

const parseNum = (str) => {
  if (!str) return '';
  return str.toString().replace(/[^\d]/g, '');
};

const InputGroup = ({ label, name, type = 'text', placeholder = '', icon: Icon, isNumber, value, onChange }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon size={16} className="text-gray-400" />
        </div>
      )}
      <input
        type={type === 'date' ? 'date' : 'text'}
        inputMode={isNumber ? "numeric" : "text"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all ${Icon ? 'pl-9' : ''}`}
      />
      {isNumber && value && <span className="absolute right-3 top-2.5 text-gray-400 text-xs">원</span>}
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [expectedGift, setExpectedGift] = useState(''); // 예상 축의금
  const [currentSavings, setCurrentSavings] = useState(''); // 현재 모은 금액
  const [weddingDate, setWeddingDate] = useState('2027-03-07'); // 결혼 예정일 (기본값)
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('전체');
  
  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Custom Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // --- Auth & Data Fetching (Rule 3 반영) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 환경에서 제공되는 Custom Token 인증 처리를 최우선순위로 둡니다.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        showToast('로그인 세션 연결 실패', 'error');
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return; // 미인증 쿼리 호출 차단 가드

    // RULE 1에 지정된 경로 구조 수립 (/artifacts/{appId}/public/data/{collectionName})
    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'weddingExpenses');
    const unsubscribeItems = onSnapshot(itemsRef, 
      (snapshot) => {
        const fetchedItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // RULE 2 준수: 클라이언트 상에서 안전하게 room filtering
        const roomFilteredItems = fetchedItems.filter(item => item.roomId === SHARED_ROOM_ID);

        // 생성일 역순 정렬
        const sorted = roomFilteredItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
        setItems(sorted);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching data: ", error);
        showToast('지출 내역 로딩 실패: 권한 부족', 'error');
        setLoading(false);
      }
    );

    const fetchSettings = async () => {
      try {
        // RULE 1 맞춤 수립
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'budgetSettings', SHARED_ROOM_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExpectedGift(data.expectedGift?.toString() || '');
          setCurrentSavings(data.currentSavings?.toString() || '');
          if (data.weddingDate) {
            setWeddingDate(data.weddingDate);
          }
        }
      } catch (error) {
        console.error("Error fetching settings: ", error);
        showToast('환경 설정 조회 실패', 'error');
      }
    };
    fetchSettings();

    return () => unsubscribeItems();
  }, [user]);

  // --- Derived Data ---
  const filteredItems = useMemo(() => {
    if (activeTab === '전체') return items;
    return items.filter(item => item.category === activeTab);
  }, [items, activeTab]);

  const summary = useMemo(() => {
    let total = 0;
    let expectedExpense = 0;
    let paid = 0;

    items.forEach(item => {
      total += (Number(item.totalCost) || 0);
      expectedExpense += (Number(item.balance) || 0);
      paid += (Number(item.deposit) || 0);
    });

    return { total, expectedExpense, paid };
  }, [items]);

  const activeCategoryTotal = useMemo(() => {
    return filteredItems.reduce((acc, item) => acc + (Number(item.totalCost) || 0), 0);
  }, [filteredItems]);

  // 카테고리별 지출 비율 통계 계산
  const categoryStats = useMemo(() => {
    const stats = {};
    INPUT_CATEGORIES.forEach(cat => { stats[cat] = 0; });
    
    items.forEach(item => {
      if (stats[item.category] !== undefined) {
        stats[item.category] += (Number(item.totalCost) || 0);
      } else {
        stats['기타'] = (stats['기타'] || 0) + (Number(item.totalCost) || 0);
      }
    });

    return Object.entries(stats)
      .map(([name, val]) => ({
        name,
        value: val,
        percentage: summary.total > 0 ? Math.round((val / summary.total) * 100) : 0
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items, summary.total]);

  // --- 월별 모으기 계산 로직 ---
  const savingsPlan = useMemo(() => {
    const remainingCost = summary.expectedExpense; // 갚아야 할 잔금 총액
    const gift = Number(expectedGift) || 0; 
    const saved = Number(currentSavings) || 0; 
    
    // 최종 목표액 = (잔금 총액) - (예상 축의금) - (이미 모은 돈)
    const targetAmount = Math.max(0, remainingCost - gift - saved);
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    const targetDateObj = new Date(weddingDate);
    if (isNaN(targetDateObj.getTime())) {
      return { targetAmount, monthsLeft: 1, monthlyTarget: targetAmount, isPassed: false, dDay: 0 };
    }

    // 디데이 계산
    const diffTime = targetDateObj - currentDate;
    const dDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const targetYear = targetDateObj.getFullYear();
    const targetMonth = targetDateObj.getMonth() - 1; // 결혼식 전월까지 모으기
    
    // 남은 개월 수 계산 (현재 달 포함)
    let monthsLeft = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
    const isPassed = monthsLeft < 0;
    
    const effectiveMonths = Math.max(1, monthsLeft + 1);
    const monthlyTarget = Math.ceil(targetAmount / effectiveMonths);
    
    return { targetAmount, monthsLeft: effectiveMonths, monthlyTarget, isPassed, dDay };
  }, [summary.expectedExpense, expectedGift, currentSavings, weddingDate]);

  // --- Handlers ---
  const handleGiftChange = (e) => setExpectedGift(parseNum(e.target.value));
  const handleSavingsChange = (e) => setCurrentSavings(parseNum(e.target.value));
  const handleWeddingDateChange = (e) => setWeddingDate(e.target.value);

  const saveBudgetSettings = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'budgetSettings', SHARED_ROOM_ID);
      await setDoc(docRef, { 
        expectedGift: Number(expectedGift) || 0,
        currentSavings: Number(currentSavings) || 0,
        weddingDate: weddingDate
      }, { merge: true });
    } catch (error) {
      console.error("Error saving budget settings: ", error);
      showToast('설정 저장 권한 부족 혹은 실패', 'error');
    }
  };

  // 이미지 엑셀 데이터 통째로 복사해넣기 (원터치 자동 등록기)
  const loadExcelMockData = async () => {
    if (!user) {
      showToast("로그인이 완료되지 않았습니다.", "error");
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'weddingExpenses');

      EXCEL_MOCK_DATA.forEach((item) => {
        const newDocRef = doc(itemsRef); // 새 ID 생성
        batch.set(newDocRef, {
          ...item,
          roomId: SHARED_ROOM_ID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      // 설정값도 결혼 총비용 이미지에 맞게 셋팅 (결혼예정일 2027-03-07 지정)
      const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'budgetSettings', SHARED_ROOM_ID);
      batch.set(settingsRef, {
        expectedGift: 0,
        currentSavings: 0,
        weddingDate: '2027-03-07'
      }, { merge: true });

      await batch.commit();
      setWeddingDate('2027-03-07');
      showToast(`성공적으로 ${EXCEL_MOCK_DATA.length}개의 항목을 등록했습니다!`, "success");
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Mock Upload Error: ", error);
      showToast("데이터 등록 중 권한 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 기존 유저 데이터 공유방으로 복사 (마이그레이션)
  const migrateMyDataToSharedRoom = async () => {
    if (!user) {
      showToast("로그인 정보가 올바르지 않습니다.", "error");
      return;
    }

    try {
      const batch = writeBatch(db);
      const oldItemsRef = collection(db, 'artifacts', appId, 'users', '80XEtJzndPa7W1lmDpREcjOjIEd2', 'weddingExpenses');
      const newItemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'weddingExpenses');

      const snapshot = await getDocs(oldItemsRef);
      snapshot.forEach((document) => {
        const newDocRef = doc(newItemsRef, document.id);
        batch.set(newDocRef, {
          ...document.data(),
          roomId: SHARED_ROOM_ID
        });
      });

      const oldBudgetRef = doc(db, 'artifacts', appId, 'users', '80XEtJzndPa7W1lmDpREcjOjIEd2', 'settings', 'budget');
      const newBudgetRef = doc(db, 'artifacts', appId, 'public', 'data', 'budgetSettings', SHARED_ROOM_ID);

      const budgetSnapshot = await getDoc(oldBudgetRef);
      if (budgetSnapshot.exists()) {
        batch.set(newBudgetRef, budgetSnapshot.data());
      }

      await batch.commit();
      showToast(`공유방으로 데이터 ${snapshot.size}건 복사 완료!`, "success");
      setIsSettingsOpen(false);
    } catch (error) {
      console.error(error);
      showToast("마이그레이션 실패. 권한을 확인하세요.", "error");
    }
  };

  function getInitialFormData() {
    return {
      category: '본식', title: '', company: '', totalCost: '', deposit: '',
      depositDate: '', balance: '', balanceDate: '', paymentMethod: '', note: '', task: ''
    };
  }

  const openAddModal = () => {
    setFormData({ ...getInitialFormData(), category: activeTab === '전체' ? '본식' : activeTab });
    setEditingId(null);
    setDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormData({
      category: item.category || '본식', title: item.title || '', company: item.company || '',
      totalCost: item.totalCost?.toString() || '', deposit: item.deposit?.toString() || '',
      depositDate: item.depositDate || '', balance: item.balance?.toString() || '',
      balanceDate: item.balanceDate || '', paymentMethod: item.paymentMethod || '',
      note: item.note || '', task: item.task || ''
    });
    setEditingId(item.id);
    setDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (['totalCost', 'deposit', 'balance'].includes(name)) newValue = parseNum(value);

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'totalCost' || name === 'deposit') {
        const tCost = Number(name === 'totalCost' ? newValue : prev.totalCost) || 0;
        const dpt = Number(name === 'deposit' ? newValue : prev.deposit) || 0;
        updated.balance = Math.max(0, tCost - dpt).toString();
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.title.trim()) {
      showToast('항목명을 입력해 주세요.', 'error');
      return;
    }

    const payload = {
      ...formData,
      roomId: SHARED_ROOM_ID,
      totalCost: Number(formData.totalCost) || 0,
      deposit: Number(formData.deposit) || 0,
      balance: Number(formData.balance) || 0,
      updatedAt: new Date().toISOString()
    };

    try {
      const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'weddingExpenses');
      if (editingId) {
        await updateDoc(doc(itemsRef, editingId), payload);
        showToast('비용 항목이 정상 수정되었습니다.', 'success');
      } else {
        await addDoc(itemsRef, { ...payload, createdAt: new Date().toISOString() });
        showToast('새로운 비용 항목이 추가되었습니다.', 'success');
      }
      closeModal();
    } catch (error) {
      console.error("Error saving document: ", error);
      showToast('저장 권한이 없거나 문제가 생겼습니다.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!user || !editingId) return;
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'weddingExpenses', editingId);
      await deleteDoc(docRef);
      showToast('삭제가 완료되었습니다.', 'success');
      closeModal();
    } catch (error) {
      console.error("Error deleting document: ", error);
      showToast('삭제 권한이 없거나 작업에 실패했습니다.', 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50/20">
      <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-semibold text-pink-600">결혼식 예산 데이터 동기화 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28 font-sans text-gray-900 mx-auto max-w-md relative shadow-xl overflow-hidden border-x border-gray-100 flex flex-col">
      
      {/* Toast Alert UI */}
      {toast.visible && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-gray-900/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs transition-all duration-300 transform animate-slide-up">
          <AlertCircle size={14} className={toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'} />
          <p className="flex-1 font-medium">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5 rounded-b-[2rem] shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-[10px] tracking-widest uppercase font-black text-pink-500 bg-pink-50 px-2.5 py-1 rounded-full">우리 결혼 준비</span>
            <h1 className="text-2xl font-black text-gray-900 mt-1.5 flex items-center gap-1.5">
              결혼 예산 매니저 💍
            </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
        
        {/* 요약 카드 */}
        <div className="bg-gradient-to-br from-pink-500/10 via-pink-400/5 to-transparent p-5 rounded-3xl border border-pink-100/50">
          <div className="flex justify-between items-end mb-3">
            <span className="text-sm font-bold text-pink-700/80">예정 총 비용</span>
            <div className="text-right">
              <span className="text-2xl font-black text-pink-600">
                {formatNum(summary.total)}
                <span className="text-sm font-bold ml-0.5">원</span>
              </span>
            </div>
          </div>
          <div className="h-px bg-pink-100 my-3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 font-medium block mb-0.5">계약 완료금 (결제됨)</span>
              <span className="text-base font-bold text-gray-800">{formatNum(summary.paid)}원</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-rose-400 font-medium block mb-0.5">지출 대기 (잔금)</span>
              <span className="text-base font-bold text-rose-500">{formatNum(summary.expectedExpense)}원</span>
            </div>
          </div>
        </div>

        {/* 월별 저축 플랜 */}
        <div className="mt-3.5 bg-sky-500/[0.04] p-5 rounded-3xl border border-sky-100/60">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-sky-900 flex items-center gap-1.5">
              <PiggyBank size={18} className="text-sky-500 animate-bounce" /> 월별 저축 계산기
            </h3>
            <span className="text-[10px] text-sky-700 bg-sky-100/80 px-2.5 py-1 rounded-full font-bold">
              {savingsPlan.isPassed 
                ? '목표일 경과' 
                : `${weddingDate.slice(2,7).replace('-', '/')} 결혼 (D-${savingsPlan.dDay})`}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 flex items-center gap-1"><Coins size={13} className="text-gray-400"/> 현재까지 준비된 자금</span>
              <div className="flex items-center">
                <input
                  type="text" inputMode="numeric"
                  value={formatNum(currentSavings)}
                  onChange={handleSavingsChange}
                  onBlur={saveBudgetSettings}
                  placeholder="0"
                  className="w-24 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-sky-400 focus:outline-none font-bold text-sky-900"
                />
                <span className="text-sky-900 ml-1 font-bold">원</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 flex items-center gap-1"><Check size={13} className="text-gray-400"/> 예상 하객 축의금 수령액</span>
              <div className="flex items-center">
                <input
                  type="text" inputMode="numeric"
                  value={formatNum(expectedGift)}
                  onChange={handleGiftChange}
                  onBlur={saveBudgetSettings}
                  placeholder="0"
                  className="w-24 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-sky-400 focus:outline-none font-bold text-sky-900"
                />
                <span className="text-sky-900 ml-1 font-bold">원</span>
              </div>
            </div>
          </div>
          
          <div className="h-px bg-sky-100/60 my-4"></div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-gray-400 font-medium mb-1">
                실질 필요 준비액: <span className="font-bold">{formatNum(savingsPlan.targetAmount)}원</span>
              </p>
              <span className="text-xs text-sky-800 font-extrabold flex items-center gap-1">
                매월 필요한 평균 저축액 <Info size={11} className="text-sky-400" />
              </span>
            </div>
            <span className="text-2xl font-black text-sky-600 tracking-tight">
              {savingsPlan.isPassed ? '-' : formatNum(savingsPlan.monthlyTarget)}
              <span className="text-sm font-semibold ml-0.5">원</span>
            </span>
          </div>
        </div>
      </div>

      {/* 지출 비중 분석 통계 어코디언/차트 */}
      {items.length > 0 && (
        <div className="px-5 mt-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5">
              <BarChart2 size={14} className="text-pink-500" /> 카테고리별 예산 분포
            </h4>
            <div className="space-y-3">
              {categoryStats.slice(0, 4).map((stat) => (
                <div key={stat.name} className="text-xs">
                  <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                    <span>{stat.name}</span>
                    <span className="font-bold">{stat.percentage}% ({formatNum(stat.value)}원)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${CATEGORY_COLORS[stat.name] || 'bg-gray-400'} rounded-full`} style={{ width: `${stat.percentage}%` }} />
                  </div>
                </div>
              ))}
              {categoryStats.length > 4 && (
                <p className="text-[10px] text-gray-400 text-center pt-1 font-medium">나머지 {categoryStats.length - 4}개 카테고리 포함 중</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto whitespace-nowrap px-4 py-3 hide-scrollbar flex gap-2 sticky top-0 bg-gray-50 z-20 border-b border-gray-100 mt-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat} onClick={() => setActiveTab(cat)}
            className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              activeTab === cat 
                ? 'bg-gray-900 text-white shadow-md shadow-gray-900/10' 
                : 'bg-white text-gray-500 border border-gray-200/80 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-3 py-4 flex-1">
        <div className="flex justify-between items-center px-1 mb-1">
          <span className="text-xs text-gray-400 font-bold">{activeTab} 내역</span>
          <span className="text-xs font-black text-gray-600">
            총합: <span className="text-pink-500 text-sm">{formatNum(activeCategoryTotal)}</span>원
          </span>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200/80 px-4">
            <Wallet className="mx-auto mb-3 opacity-10 text-gray-900" size={56} />
            <p className="text-sm font-semibold text-gray-500">등록된 지출 내역이 비어 있습니다.</p>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              오른쪽 위 <b className="text-pink-500">톱니바퀴</b>를 누르시거나 아래 버튼을 통해 <br />
              <b>전송된 이미지 예산 명세서</b>를 한번에 복사해 오실 수 있습니다! 🚀
            </p>
            <button
              onClick={loadExcelMockData}
              className="mt-5 mx-auto bg-pink-100 hover:bg-pink-200 text-pink-700 font-black px-5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud size={14} /> 이미지 엑셀명세 자동 가져오기
            </button>
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => openEditModal(item)} 
              className="bg-white p-4.5 rounded-2xl shadow-sm border border-gray-100 hover:border-pink-100 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-bold text-white rounded-md mb-1.5 ${CATEGORY_COLORS[item.category] || 'bg-gray-400'}`}>
                    {item.category}
                  </span>
                  <h3 className="font-bold text-sm text-gray-800 tracking-tight leading-snug break-all">{item.title}</h3>
                </div>
                {item.company && (
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg shrink-0 max-w-[150px] truncate">
                    {item.company}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-50 text-xs">
                <div>
                  <p className="text-gray-400 font-medium">총비용: <span className="font-bold text-gray-700">{formatNum(item.totalCost)}원</span></p>
                  {Number(item.balance) > 0 && (
                    <p className="text-rose-500 font-bold text-[11px] mt-0.5">잔금: {formatNum(item.balance)}원</p>
                  )}
                </div>
                <div className="text-right">
                  {item.balanceDate ? (
                    <p className="text-[10px] font-semibold text-gray-400 flex items-center justify-end gap-1 bg-gray-50 px-2 py-1 rounded-md">
                      <Calendar size={11} className="text-gray-400" /> 잔금일: {item.balanceDate}
                    </p>
                  ) : (
                    <span className="text-[10px] text-gray-300">잔금 일자 미지정</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Float Add Button */}
      <button 
        onClick={openAddModal} 
        className="fixed bottom-6 right-1/2 translate-x-[9.5rem] w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-pink-500/20 active:scale-95 transition-all z-30"
      >
        <Plus size={28} />
      </button>

      {/* Drawer: Settings & Admin Tool */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] shadow-2xl relative flex flex-col p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-50">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
                <Settings size={20} className="text-pink-500" /> 세부 환경 설정
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-1">
              {/* Wedding Date Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">결혼 예정일 설정</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input 
                    type="date"
                    value={weddingDate}
                    onChange={handleWeddingDateChange}
                    onBlur={saveBudgetSettings}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">입력된 날짜를 기준으로 매달 저축해야 할 금액을 정밀 연산합니다.</p>
              </div>

              {/* Upload Excel Data Action */}
              <div className="bg-pink-50 rounded-2xl p-4.5 border border-pink-100">
                <span className="text-xs font-bold text-pink-800 flex items-center gap-1.5 mb-1">
                  📸 이미지 명세서 일괄 동기화
                </span>
                <p className="text-[11px] text-pink-700 leading-relaxed mb-3">
                  보내주신 엑셀 이미지 내역 전체(본식 대관 식대, 드레스, 메이크업, 신혼여행, 결혼반지 총 26종)를 현재 공유방({SHARED_ROOM_ID}) 예산안으로 일괄 업로드합니다.
                </p>
                <button
                  onClick={loadExcelMockData}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <UploadCloud size={14} /> 현재 방에 이미지 내역 일괄 셋팅하기
                </button>
              </div>

              {/* Data Migration Area */}
              <div className="bg-amber-50 rounded-2xl p-4.5 border border-amber-100">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  💡 개인 데이터 마이그레이션 툴
                </span>
                <p className="text-[11px] text-amber-700 leading-relaxed mb-3">
                  기존에 개인 사용자로 작성된 예산 및 셋팅 내역들을 현재 우리 공동 공유방({SHARED_ROOM_ID})으로 안전하게 마이그레이션 복제합니다.
                </p>
                <button
                  onClick={migrateMyDataToSharedRoom}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
                >
                  기존 데이터 공유방으로 복사 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add & Edit Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md h-[88vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl relative flex flex-col animate-slide-up">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-50 sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="text-lg font-black text-gray-900">{editingId ? '지출 내역 수정' : '새 지출 내역 추가'}</h2>
              <button 
                onClick={closeModal} 
                className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-5 flex-1 pb-28 hide-scrollbar">
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">카테고리 선택</label>
                <div className="flex flex-wrap gap-1.5">
                  {INPUT_CATEGORIES.map(cat => (
                    <button 
                      key={cat} 
                      type="button" 
                      onClick={() => setFormData({...formData, category: cat})} 
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        formData.category === cat 
                          ? 'bg-pink-500 border-pink-500 text-white' 
                          : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <InputGroup label="지출 항목명" name="title" placeholder="예: 웨딩홀 식대 잔금, 본식 드레스" value={formData.title} onChange={handleInputChange} />
              <InputGroup label="업체 및 메모명 (선택)" name="company" placeholder="예: 라도무스, 아뜰리에" value={formData.company} onChange={handleInputChange} />
              
              <InputGroup label="총 계약 합계액" name="totalCost" isNumber={true} icon={Wallet} value={formatNum(formData.totalCost)} onChange={handleInputChange} />
              
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="기 납부 계약금" name="deposit" isNumber={true} value={formatNum(formData.deposit)} onChange={handleInputChange} />
                <InputGroup label="계약금 결제일" name="depositDate" type="date" value={formData.depositDate} onChange={handleInputChange} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <InputGroup label="납부 대기 잔금" name="balance" isNumber={true} value={formatNum(formData.balance)} onChange={handleInputChange} />
                <InputGroup label="잔금 지불 예정일" name="balanceDate" type="date" value={formData.balanceDate} onChange={handleInputChange} />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">상세 기록 / 참고 사항</label>
                <textarea 
                  name="note" 
                  placeholder="추가 지출 예정 금액, 예외 조항 등 세부 내역 기술"
                  value={formData.note} 
                  onChange={handleInputChange} 
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm h-20 outline-none focus:ring-2 focus:ring-pink-400 transition-all resize-none" 
                />
              </div>
            </div>
            
            <div className="border-t border-gray-100 p-4.5 bg-white sticky bottom-0 flex gap-3 z-10">
              {editingId && (
                <button 
                  onClick={handleDelete} 
                  className={`flex-1 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                    deleteConfirm 
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' 
                      : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                  }`}
                >
                  {deleteConfirm ? '정말 삭제할까요?' : '삭제'}
                </button>
              )}
              <button 
                onClick={handleSave} 
                className="flex-[2] bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check size={16} /> 저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS Style */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
}