import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Trash2, Calendar, Wallet, Check, AlertCircle, PiggyBank, Coins } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = {
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

const appId = "wedding-budget-app";
const SHARED_ROOM_ID = "wedding-2026-karon-8f3a9x";

const CATEGORIES = ['전체', '본식', '스튜디오', '드레스/예복', '메이크업', '신혼여행', '결혼반지', '기타'];
const INPUT_CATEGORIES = CATEGORIES.slice(1);

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
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {Icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon size={16} className="text-gray-400" /></div>}
      <input
        type={type === 'date' ? 'date' : 'text'}
        inputMode={isNumber ? "numeric" : "text"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent ${Icon ? 'pl-9' : ''}`}
      />
      {isNumber && value && <span className="absolute right-3 top-2.5 text-gray-500 text-sm">원</span>}
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const migrateMyDataToSharedRoom = async () => {
  if (!user) {
    alert("아직 로그인 사용자가 없습니다.");
    return;
  }

  const batch = writeBatch(db);

  const oldItemsRef = collection(
    db,
    'artifacts',
    appId,
    'users',
    user.uid,
    'weddingExpenses'
  );

  const newItemsRef = collection(
    db,
    'artifacts',
    appId,
    'sharedRooms',
    SHARED_ROOM_ID,
    'weddingExpenses'
  );

  const snapshot = await getDocs(oldItemsRef);

  snapshot.forEach((document) => {
    const newDocRef = doc(newItemsRef, document.id);
    batch.set(newDocRef, document.data());
  });

  const oldBudgetRef = doc(
    db,
    'artifacts',
    appId,
    'users',
    user.uid,
    'settings',
    'budget'
  );

  const newBudgetRef = doc(
    db,
    'artifacts',
    appId,
    'sharedRooms',
    SHARED_ROOM_ID,
    'settings',
    'budget'
  );

  const budgetSnapshot = await getDoc(oldBudgetRef);

  if (budgetSnapshot.exists()) {
    batch.set(newBudgetRef, budgetSnapshot.data());
  }

  await batch.commit();

  alert(`공유방으로 데이터 복사 완료: ${snapshot.size}개`);
};
  const [items, setItems] = useState([]);
  const [expectedGift, setExpectedGift] = useState(''); // 예상 축의금
  const [currentSavings, setCurrentSavings] = useState(''); // 현재 모은 금액 추가
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('전체');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'weddingExpenses');
    const unsubscribeItems = onSnapshot(itemsRef, 
      (snapshot) => {
        const fetchedItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setItems(fetchedItems.reverse());
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    );

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'budget');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExpectedGift(data.expectedGift?.toString() || '');
          setCurrentSavings(data.currentSavings?.toString() || '');
        }
      } catch (error) {
        console.error("Error fetching settings: ", error);
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

  // --- 월별 모으기 계산 로직 (D-day 기반 자동 차감) ---
  const savingsPlan = useMemo(() => {
    const remainingCost = summary.expectedExpense; // 갚아야 할 잔금 총액
    const gift = Number(expectedGift) || 0; 
    const saved = Number(currentSavings) || 0; 
    
    // 최종 목표액 = (잔금 총액) - (예상 축의금) - (이미 모은 돈)
    const targetAmount = Math.max(0, remainingCost - gift - saved);
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    // 목표 날짜: 2027년 3월 7일 결혼식이므로, 2월 말까지 모으는 것으로 설정
    const targetYear = 2027;
    const targetMonth = 1; // 0: 1월, 1: 2월
    
    // 남은 개월 수 계산 (현재 달 포함)
    let monthsLeft = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
    
    // 이미 목표 시점을 지났는지 확인
    const isPassed = monthsLeft < 0;
    
    // 이번 달부터 2월까지 모은다고 가정할 때 (최소 1개월)
    const effectiveMonths = Math.max(1, monthsLeft + 1);
    const monthlyTarget = Math.ceil(targetAmount / effectiveMonths);
    
    return { targetAmount, monthsLeft: effectiveMonths, monthlyTarget, isPassed };
  }, [summary.expectedExpense, expectedGift, currentSavings]);

  // --- Handlers ---
  const handleGiftChange = (e) => setExpectedGift(parseNum(e.target.value));
  const handleSavingsChange = (e) => setCurrentSavings(parseNum(e.target.value));

  const saveBudgetSettings = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'budget');
      await setDoc(docRef, { 
        expectedGift: Number(expectedGift) || 0,
        currentSavings: Number(currentSavings) || 0
      }, { merge: true });
    } catch (error) {
      console.error("Error saving budget settings: ", error);
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
    if (!formData.title.trim()) return;

    const payload = {
      ...formData,
      totalCost: Number(formData.totalCost) || 0,
      deposit: Number(formData.deposit) || 0,
      balance: Number(formData.balance) || 0,
      updatedAt: new Date().toISOString()
    };

    try {
      const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'weddingExpenses');
      if (editingId) {
        await updateDoc(doc(itemsRef, editingId), payload);
      } else {
        await addDoc(itemsRef, { ...payload, createdAt: new Date().toISOString() });
      }
      closeModal();
    } catch (error) {
      console.error("Error saving document: ", error);
    }
  };

  const handleDelete = async () => {
    if (!user || !editingId) return;
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'weddingExpenses', editingId));
      closeModal();
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-pink-500">데이터를 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900 mx-auto max-w-md relative shadow-xl overflow-hidden">
         <button
      onClick={migrateMyDataToSharedRoom}
      className="m-4 bg-black text-white px-4 py-2 rounded-xl text-sm"
    >
      공유방으로 데이터 복사
    </button>
      {/* Header & Summary */}
      <div className="bg-white px-5 pt-6 pb-5 rounded-b-3xl shadow-sm z-10 relative">
        <h1 className="text-xl font-bold text-gray-800 mb-4">결혼식 비용 관리 💍</h1>
        
        {/* 요약 카드 */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-2xl border border-pink-100">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-medium text-pink-800">총 비용</span>
            <span className="text-2xl font-bold text-pink-600">{formatNum(summary.total)}<span className="text-base font-normal ml-1">원</span></span>
          </div>
          <div className="h-px bg-pink-200 my-2"></div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">계약금 완료</span>
              <span className="text-sm font-semibold text-gray-700">{formatNum(summary.paid)}원</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs text-gray-500">지출 예정 (잔금)</span>
              <span className="text-sm font-semibold text-rose-500">{formatNum(summary.expectedExpense)}원</span>
            </div>
          </div>
        </div>

        {/* 저축 플랜 카드 */}
        <div className="mt-3 bg-blue-50/70 p-4 rounded-2xl border border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
              <PiggyBank size={16} className="text-blue-500" /> 월별 저축 목표
            </h3>
            <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
              {savingsPlan.isPassed ? '목표 달성일 경과' : `27년 2월까지 (${savingsPlan.monthsLeft}개월 남음)`}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 flex items-center gap-1"><Coins size={14} className="text-gray-400"/> 현재까지 모은 돈</span>
              <div className="flex items-center">
                <input
                  type="text" inputMode="numeric"
                  value={formatNum(currentSavings)}
                  onChange={handleSavingsChange}
                  onBlur={saveBudgetSettings}
                  placeholder="0"
                  className="w-24 text-right bg-white/50 border border-blue-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400 text-blue-800 font-semibold"
                />
                <span className="text-blue-800 ml-1 text-xs">원</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 flex items-center gap-1"><Check size={14} className="text-gray-400"/> 예상 축의금</span>
              <div className="flex items-center">
                <input
                  type="text" inputMode="numeric"
                  value={formatNum(expectedGift)}
                  onChange={handleGiftChange}
                  onBlur={saveBudgetSettings}
                  placeholder="0"
                  className="w-24 text-right bg-white/50 border border-blue-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400 text-blue-800 font-semibold"
                />
                <span className="text-blue-800 ml-1 text-xs">원</span>
              </div>
            </div>
          </div>
          
          <div className="h-px bg-blue-200/50 my-4"></div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">최종 필요 금액: {formatNum(savingsPlan.targetAmount)}원</p>
              <span className="text-xs text-gray-500 font-bold">매월 저축할 금액</span>
            </div>
            <span className="text-2xl font-black text-blue-600">
              {savingsPlan.isPassed ? '-' : formatNum(savingsPlan.monthlyTarget)}<span className="text-sm font-normal ml-1">원</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto whitespace-nowrap px-4 py-3 hide-scrollbar flex gap-2 sticky top-0 bg-gray-50 z-0 border-b border-gray-100">
        {CATEGORIES.map(cat => (
          <button
            key={cat} onClick={() => setActiveTab(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === cat ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-3 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Wallet className="mx-auto mb-3 opacity-20" size={48} />
            <p>내역이 없습니다.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} onClick={() => openEditModal(item)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded mb-1">{item.category}</span>
                  <h3 className="font-bold text-gray-800">{item.title}</h3>
                </div>
                {item.company && <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{item.company}</span>}
              </div>
              <div className="flex justify-between items-end mt-3 text-sm">
                <div>
                  <p className="text-gray-500">총: {formatNum(item.totalCost)}원</p>
                  {item.balance > 0 && <p className="text-rose-500 font-medium text-xs mt-0.5">잔금: {formatNum(item.balance)}원</p>}
                </div>
                <div className="text-right">
                  {item.balanceDate && <p className="text-[10px] text-gray-400 flex items-center justify-end gap-1"><Calendar size={10} /> {item.balanceDate}</p>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={openAddModal} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] w-14 h-14 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-20"><Plus size={28} /></button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col animate-slide-up">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="text-lg font-bold text-gray-800">{editingId ? '수정' : '추가'}</h2>
              <button onClick={closeModal} className="p-2 bg-gray-50 rounded-full text-gray-500"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-5 flex-1 pb-24 hide-scrollbar">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {INPUT_CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat})} className={`px-3 py-1.5 rounded-lg text-sm border ${formData.category === cat ? 'bg-pink-50 border-pink-200 text-pink-700 font-medium' : 'bg-white border-gray-200 text-gray-600'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <InputGroup label="항목명" name="title" placeholder="예: 식대" value={formData.title} onChange={handleInputChange} />
              <InputGroup label="총 비용" name="totalCost" isNumber={true} icon={Wallet} value={formatNum(formData.totalCost)} onChange={handleInputChange} />
              <div className="grid grid-cols-2 gap-3"><InputGroup label="계약금" name="deposit" isNumber={true} value={formatNum(formData.deposit)} onChange={handleInputChange} /><InputGroup label="계약금 날짜" name="depositDate" type="date" value={formData.depositDate} onChange={handleInputChange} /></div>
              <div className="grid grid-cols-2 gap-3"><InputGroup label="잔금" name="balance" isNumber={true} value={formatNum(formData.balance)} onChange={handleInputChange} /><InputGroup label="잔금 날짜" name="balanceDate" type="date" value={formData.balanceDate} onChange={handleInputChange} /></div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea name="note" value={formData.note} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
            </div>
            <div className="border-t border-gray-100 p-4 bg-white sticky bottom-0 flex gap-3">
              {editingId && <button onClick={handleDelete} className={`flex-1 py-3 rounded-xl font-medium ${deleteConfirm ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'}`}>{deleteConfirm ? '삭제 확정' : '삭제'}</button>}
              <button onClick={handleSave} className="flex-[2] bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"><Check size={18} /> 저장</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}} />
    </div>
  );
}