import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, collection, query, onSnapshot, addDoc, deleteDoc, doc, 
    setDoc, serverTimestamp, getDocs
} from 'firebase/firestore';

// Tailwind CSS is assumed to be available in the environment

// --- GLOBAL VARIABLES (Canvas tarafından sağlanır, DİKKAT: __app_id ve __firebase_config string olarak gelir) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { /* Yerel test için boş veya varsayılan config */ };

// Sabitler
const ZAMAN_SEÇENEKLERI = [
    { value: 60, label: "1 Dakika" },
    { value: 180, label: "3 Dakika" },
    { value: Infinity, label: "Sınırsız" },
];

const ADMIN_USER_ID = "YOUR_ADMIN_USER_ID_HERE"; // **DİKKAT: Gerçek admin ID'nizi buraya yazmalısınız.**

// Yardımcı Fonksiyon: Saniye formatlama (mm:ss)
const formatTime = (seconds) => {
    if (seconds === Infinity) return "Sınırsız";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// Yardımcı Fonksiyon: PCM'yi WAV'a dönüştür (TTS için gerekli)
function pcmToWav(pcm16, sampleRate = 24000) {
    const numChannels = 1;
    const bytesPerSample = 2; // Int16 (PCM16)
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcm16.length * bytesPerSample;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;

    // RIFF header
    writeString('RIFF');
    view.setUint32(offset, 36 + dataSize, true); offset += 4;
    writeString('WAVE');

    // fmt chunk
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2; // Audio format 1 (PCM)
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bytesPerSample * 8, true); offset += 2; // Bits per sample

    // data chunk
    writeString('data');
    view.setUint32(offset, dataSize, true); offset += 4;

    // PCM data
    const pcmView = new Int16Array(buffer, offset);
    pcmView.set(pcm16);

    return new Blob([buffer], { type: 'audio/wav' });

    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset + i, s.charCodeAt(i));
        }
        offset += s.length;
    }
}

// Yardımcı Fonksiyon: Base64'ü ArrayBuffer'a dönüştür
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// --- APP COMPONENT ---
const App = () => {
    // Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authStatus, setAuthStatus] = useState("Kullanıcı Oturumu Bekleniyor...");

    // Admin State
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [newMetin, setNewMetin] = useState('');
    const [metinler, setMetinler] = useState([]);
    const [adminMessage, setAdminMessage] = useState(null);

    // Typing Test State
    const [selectedMetin, setSelectedMetin] = useState('');
    const [metinId, setMetinId] = useState(null);
    const [userInput, setUserInput] = useState('');
    const [timer, setTimer] = useState(null);
    const [timeLimit, setTimeLimit] = useState(ZAMAN_SEÇENEKLERI[0].value);
    const [remainingTime, setRemainingTime] = useState(ZAMAN_SEÇENEKLERI[0].value);
    const [startTime, setStartTime] = useState(null);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [isTestActive, setIsTestActive] = useState(false);
    const [isTestFinished, setIsTestFinished] = useState(false);
    const [testErrorCount, setTestErrorCount] = useState(0);

    const textAreaRef = useRef(null);
    const timerRef = useRef(null);

    // YETKİ KONTROLÜ
    const isAdmin = useMemo(() => userId === ADMIN_USER_ID && isAuthReady, [userId, isAuthReady]);

    // -----------------------------------------------------------
    // FIREBASE INITIALIZATION AND AUTHENTICATION
    // -----------------------------------------------------------
    useEffect(() => {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase konfigürasyonu eksik.");
            setAuthStatus("Bağlantı Hatası: Firebase Config eksik.");
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const _db = getFirestore(app);
            const _auth = getAuth(app);

            setDb(_db);
            setAuth(_auth);

            onAuthStateChanged(_auth, async (user) => {
                let currentUserId = 'anon-' + (user ? user.uid : crypto.randomUUID());
                if (user) {
                    currentUserId = user.uid;
                } else {
                    // Oturum açma yoksa anonim oturum açmayı dene
                    const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                    try {
                        if (token) {
                            await signInWithCustomToken(_auth, token);
                        } else {
                            await signInAnonymously(_auth);
                        }
                    } catch (e) {
                        console.error("Anonim/Custom Token ile oturum açma hatası:", e);
                        // Hata durumunda rastgele ID kullanmaya devam et
                    }
                }
                
                const finalUserId = _auth.currentUser?.uid || currentUserId;
                setUserId(finalUserId);
                
                if (finalUserId === ADMIN_USER_ID) {
                    setAuthStatus("Token/Oturum Başarılı (Admin)");
                } else {
                    setAuthStatus("Oturum Başarılı (Misafir)");
                }
                setIsAuthReady(true);
            });
        } catch (e) {
            console.error("Firebase başlatılırken hata oluştu:", e);
            setAuthStatus("Bağlantı Kurulamadı.");
        }
    }, []);

    // -----------------------------------------------------------
    // FIREBASE DATA FETCHING (Metinler)
    // -----------------------------------------------------------
    useEffect(() => {
        if (!db || !isAuthReady) return;

        const collectionPath = `/artifacts/${appId}/public/data/typing_texts`;
        const q = query(collection(db, collectionPath));

        console.log("Firestore metin koleksiyonu dinleniyor:", collectionPath);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMetinler = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                newMetinler.push({
                    id: doc.id,
                    text: data.text,
                    timestamp: data.timestamp?.toDate().toLocaleString()
                });
            });
            setMetinler(newMetinler);

            // Eğer seçili metin listeden kaybolduysa veya ilk kez yükleniyorsa
            if (newMetinler.length > 0 && (!selectedMetin || !newMetinler.some(m => m.id === metinId))) {
                const initialMetin = newMetinler[0];
                setSelectedMetin(initialMetin.text);
                setMetinId(initialMetin.id);
            } else if (newMetinler.length === 0) {
                setSelectedMetin('');
                setMetinId(null);
            }
        }, (error) => {
            console.error("Metinleri çekerken hata:", error);
            setAuthStatus(`Veri Hatası: ${error.message}`);
        });

        return () => unsubscribe();
    }, [db, isAuthReady, selectedMetin, metinId]);

    // -----------------------------------------------------------
    // ADMIN FUNCTIONS
    // -----------------------------------------------------------

    // Yeni metin alanındaki değişiklikleri yakalar
    const handleNewMetinChange = (e) => {
        setNewMetin(e.target.value);
        setAdminMessage(null); // Yeni yazmaya başlayınca mesajı temizle
    };

    // Metin kaydetme işlevi
    const saveMetin = useCallback(async () => {
        if (!isAdmin) {
            setAdminMessage({ type: 'error', text: 'Kaydetme yetkiniz yok.' });
            return;
        }

        const trimmedMetin = newMetin.trim();
        if (trimmedMetin.length < 50) {
            setAdminMessage({ type: 'error', text: 'Metin en az 50 karakter olmalıdır.' });
            return;
        }

        if (!db) {
            setAdminMessage({ type: 'error', text: 'Veritabanı bağlantısı henüz kurulmadı.' });
            return;
        }
        
        try {
            const metinCollectionRef = collection(db, `/artifacts/${appId}/public/data/typing_texts`);
            await addDoc(metinCollectionRef, {
                text: trimmedMetin,
                timestamp: serverTimestamp(),
                createdBy: userId
            });
            setNewMetin('');
            setAdminMessage({ type: 'success', text: 'Metin başarıyla kaydedildi!' });
        } catch (error) {
            console.error("Metin kaydetme hatası:", error);
            setAdminMessage({ type: 'error', text: `Kaydetme Hatası: ${error.message}` });
        }
    }, [isAdmin, newMetin, db, userId]);

    // Metin silme işlevi
    const deleteMetin = useCallback(async (id) => {
        if (!isAdmin) {
            setAdminMessage({ type: 'error', text: 'Silme yetkiniz yok.' });
            return;
        }
        if (!db) return;

        try {
            const metinDocRef = doc(db, `/artifacts/${appId}/public/data/typing_texts`, id);
            await deleteDoc(metinDocRef);
            setAdminMessage({ type: 'success', text: 'Metin başarıyla silindi.' });
        } catch (error) {
            console.error("Metin silme hatası:", error);
            setAdminMessage({ type: 'error', text: `Silme Hatası: ${error.message}` });
        }
    }, [isAdmin, db]);


    // -----------------------------------------------------------
    // TYPING TEST LOGIC
    // -----------------------------------------------------------

    const resetTest = useCallback((focus = true) => {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setUserInput('');
        setStartTime(null);
        setTimer(null);
        setRemainingTime(timeLimit);
        setWpm(0);
        setAccuracy(0);
        setIsTestActive(false);
        setIsTestFinished(false);
        setTestErrorCount(0);
        if (focus && textAreaRef.current) {
            setTimeout(() => textAreaRef.current.focus(), 0);
        }
    }, [timeLimit]);

    useEffect(() => {
        setRemainingTime(timeLimit);
        // Eğer test aktif değilse, zaman limiti değiştiğinde testi sıfırla
        if (!isTestActive) {
            resetTest(false);
        }
    }, [timeLimit, isTestActive, resetTest]);

    const handleInput = useCallback((e) => {
        if (isTestFinished) return;

        const newValue = e.target.value;
        const targetText = selectedMetin;

        // Testi başlat
        if (!isTestActive && newValue.length > 0) {
            setIsTestActive(true);
            setStartTime(Date.now());
            setRemainingTime(timeLimit);

            timerRef.current = setInterval(() => {
                setRemainingTime(prevTime => {
                    const newTime = prevTime - 1;
                    if (newTime <= 0) {
                        clearInterval(timerRef.current);
                        setIsTestActive(false);
                        setIsTestFinished(true);
                        return 0;
                    }
                    return newTime;
                });
            }, 1000);
        }

        // Hata Kontrolü (Sadece son yazılan karakteri kontrol et)
        const lastCharIndex = newValue.length - 1;
        if (lastCharIndex >= 0 && newValue[lastCharIndex] !== targetText[lastCharIndex]) {
            setTestErrorCount(prev => prev + 1);
        }

        // Test Bitti Kontrolü
        if (newValue.length === targetText.length) {
            clearInterval(timerRef.current);
            setIsTestActive(false);
            setIsTestFinished(true);
        }

        // Değeri güncelle
        setUserInput(newValue);
    }, [isTestActive, isTestFinished, selectedMetin, timeLimit]);

    // WPM ve Accuracy Hesaplama
    useEffect(() => {
        if (!startTime || !selectedMetin) return;

        const totalChars = userInput.length;
        if (totalChars === 0) {
            setWpm(0);
            setAccuracy(0);
            return;
        }

        const currentTime = isTestFinished || remainingTime === 0 ? timeLimit - remainingTime : (Date.now() - startTime) / 1000;
        const minutes = currentTime / 60;
        
        let correctChars = 0;
        for (let i = 0; i < totalChars; i++) {
            if (userInput[i] === selectedMetin[i]) {
                correctChars++;
            }
        }
        
        // Hata sayısını da düşerek net WPM hesaplayalım
        const netChars = correctChars - testErrorCount; 
        const grossWpm = Math.round((netChars / 5) / (minutes > 0 ? minutes : 1));
        
        const acc = Math.round((correctChars / totalChars) * 100);

        setWpm(grossWpm < 0 ? 0 : grossWpm);
        setAccuracy(acc);

    }, [userInput, startTime, isTestFinished, selectedMetin, remainingTime, timeLimit, testErrorCount]);

    // Seçilen metni değiştirme
    const handleMetinChange = (e) => {
        const newId = e.target.value;
        const newMetin = metinler.find(m => m.id === newId);
        if (newMetin) {
            setSelectedMetin(newMetin.text);
            setMetinId(newId);
            resetTest(false);
        }
    };

    // -----------------------------------------------------------
    // RENDERING
    // -----------------------------------------------------------
    const renderMetin = useMemo(() => {
        if (!selectedMetin) return null;
        
        return selectedMetin.split('').map((char, index) => {
            let color = 'text-gray-500'; // Henüz yazılmamış
            let border = '';
            
            if (index < userInput.length) {
                if (char === userInput[index]) {
                    color = 'text-green-600'; // Doğru
                } else {
                    color = 'text-red-600'; // Yanlış
                    border = 'border-b border-red-600';
                }
            } else if (index === userInput.length && isTestActive) {
                 border = 'border-l-2 border-yellow-500'; // Aktif imleç
            }

            // Eğer test bittiyse ve son karakterdeysek ve yanlışsa, son karakterin altını çiz
            if (isTestFinished && index === selectedMetin.length - 1 && char !== userInput[index]) {
                border = 'border-b-2 border-red-700';
            }

            return (
                <span key={index} className={`text-xl ${color} ${border}`}>
                    {char}
                </span>
            );
        });
    }, [selectedMetin, userInput, isTestActive, isTestFinished]);

    const AdminPanel = (
        <div className="admin-panel p-6 bg-white shadow-xl rounded-xl w-full max-w-4xl mx-auto my-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Admin Metin Yönetim Paneli</h1>
            <p className={`text-sm text-center mb-6 font-semibold ${isAdmin ? 'text-green-600' : 'text-purple-600'}`}>
                Kullanıcı ID: {userId} ({authStatus})
            </p>
            
            <button
                onClick={() => setIsAdminMode(false)}
                className="w-full py-2 mb-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition duration-200"
            >
                Test Ekranına Dön
            </button>
            
            <div className="grid md:grid-cols-2 gap-6">
                
                {/* YENİ METİN EKLE */}
                <div className="p-4 border border-gray-200 rounded-lg shadow-inner">
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">Yeni Metin Ekle</h2>
                    
                    {adminMessage && (
                        <div className={`p-2 mb-3 rounded-lg text-sm font-medium ${
                            adminMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {adminMessage.text}
                        </div>
                    )}

                    <textarea
                        value={newMetin}
                        onChange={handleNewMetinChange}
                        placeholder="Eklemek istediğiniz metni buraya yapıştırın. (En az 50 karakter)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 resize-y min-h-[150px]"
                        rows="6"
                        disabled={!isAdmin}
                    />
                    
                    <button
                        onClick={saveMetin}
                        disabled={!isAdmin || newMetin.trim().length < 50}
                        className={`w-full py-2 mt-3 font-semibold rounded-lg transition duration-200 
                            ${isAdmin && newMetin.trim().length >= 50 
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Metni Kaydet
                    </button>
                    {!isAdmin && (
                        <p className="text-sm text-red-500 mt-2 text-center">
                            Yetkiniz yok. Sadece Admin ({ADMIN_USER_ID}) metin ekleyebilir.
                        </p>
                    )}
                </div>

                {/* MEVCUT METİNLER */}
                <div className="p-4 border border-gray-200 rounded-lg shadow-inner">
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">Mevcut Metinler ({metinler.length})</h2>
                    
                    {metinler.length === 0 ? (
                        <p className="text-yellow-600 bg-yellow-50 p-3 rounded-lg text-center">
                            ⚠️ Şu anda hiç metin bulunmamaktadır. Lütfen yukarıdan ekleyin.
                        </p>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto space-y-3">
                            {metinler.map((m) => (
                                <div 
                                    key={m.id} 
                                    className="p-3 border border-gray-100 rounded-lg bg-white shadow-sm flex justify-between items-start hover:shadow-md transition duration-150"
                                >
                                    <p className="text-sm text-gray-800 line-clamp-2 pr-2">
                                        {m.text.substring(0, 100)}... 
                                        <span className="text-xs text-gray-500 block mt-1">
                                            {m.timestamp || 'Tarih Bilgisi Yok'}
                                        </span>
                                    </p>
                                    <button
                                        onClick={() => deleteMetin(m.id)}
                                        disabled={!isAdmin}
                                        className={`p-1 text-white text-sm rounded transition duration-150 
                                            ${isAdmin ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-400 cursor-not-allowed'}`}
                                        title={isAdmin ? "Metni Sil" : "Yetkiniz yok"}
                                    >
                                        Sil
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const TypingTestPanel = (
        <div className="flex flex-col items-center p-4 min-h-screen bg-gray-50">
            <div className="header w-full max-w-5xl py-6 bg-white shadow-lg rounded-xl flex flex-col items-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Klavye Sayacı & Hız Testi</h1>
                
                <div className="flex items-center space-x-4 mb-6 text-gray-700">
                    <label className="font-medium">Metin Seç:</label>
                    <select
                        onChange={handleMetinChange}
                        value={metinId || ''}
                        disabled={isTestActive}
                        className="p-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                    >
                        {metinler.length > 0 ? (
                            metinler.map((m) => (
                                <option key={m.id} value={m.id}>Metin {metinler.indexOf(m) + 1}</option>
                            ))
                        ) : (
                            <option value="">Metin Yükleniyor...</option>
                        )}
                    </select>

                    <label className="font-medium ml-4">Süre Seç:</label>
                    <select
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || Infinity)}
                        value={timeLimit}
                        disabled={isTestActive}
                        className="p-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                    >
                        {ZAMAN_SEÇENEKLERI.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>

                    {isAdmin && (
                        <button
                            onClick={() => setIsAdminMode(true)}
                            className="ml-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow transition duration-200"
                        >
                            Admin Paneli
                        </button>
                    )}
                </div>

                <div className="timer p-2 px-4 rounded-full bg-purple-100 text-purple-800 font-bold text-lg shadow-inner mb-4">
                    Kalan Süre: {formatTime(remainingTime)}
                </div>
            </div>

            <div className="w-full max-w-5xl mt-6">
                {/* YAZILACAK METİN ALANI */}
                <div className="kaynak-metin-kutusu p-6 bg-white shadow-lg rounded-xl mb-6 border-4 border-purple-500/50">
                    {selectedMetin ? (
                        <p className="text-lg leading-relaxed tracking-wide font-mono text-gray-800 break-words whitespace-pre-wrap">
                            {renderMetin}
                        </p>
                    ) : (
                        <p className="text-lg text-gray-500 italic text-center min-h-[100px] flex items-center justify-center">
                            Metin yükleniyor veya admin paneli üzerinden metin eklenmesi gerekiyor.
                        </p>
                    )}
                </div>

                {/* KULLANICI GİRDİ ALANI */}
                <textarea
                    ref={textAreaRef}
                    value={userInput}
                    onChange={handleInput}
                    onFocus={() => { if (isTestFinished) resetTest() }}
                    disabled={!selectedMetin || isTestFinished || remainingTime === 0}
                    placeholder={selectedMetin ? "Buraya yaz..." : "Metin yükleniyor..."}
                    className="w-full p-4 border-2 border-gray-300 rounded-lg resize-none text-xl font-mono focus:border-purple-500 focus:ring-purple-500 transition duration-200 shadow-md"
                    rows="8"
                    spellCheck="false"
                />

                {/* SONUÇLAR VE BUTONLAR */}
                <div className="sonuc-kutusu flex justify-between items-center bg-white p-5 rounded-xl shadow-lg mt-6">
                    <div className="flex space-x-8">
                        <p className="text-xl font-semibold text-gray-700">
                            Hız (WPM): <span className="text-green-600 text-2xl">{wpm}</span>
                        </p>
                        <p className="text-xl font-semibold text-gray-700">
                            Doğruluk: <span className="text-purple-600 text-2xl">{accuracy}%</span>
                        </p>
                        <p className="text-xl font-semibold text-gray-700">
                            Hata Sayısı: <span className="text-red-600 text-2xl">{testErrorCount}</span>
                        </p>
                    </div>

                    <div className="flex space-x-3">
                        {isTestFinished && (
                            <div className="text-xl font-bold text-blue-600 p-2 bg-blue-100 rounded-lg">
                                TEST BİTTİ!
                            </div>
                        )}
                        
                        <button
                            onClick={() => resetTest()}
                            className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-200 disabled:opacity-50"
                            disabled={isTestActive && !isTestFinished}
                        >
                            Sıfırla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-100 font-sans">
             {isAdminMode ? AdminPanel : TypingTestPanel}
        </div>
    );
};

export default App;
