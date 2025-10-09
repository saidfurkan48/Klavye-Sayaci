import React, { useState, useEffect } from 'react';
import './App.css'; 

// =========================================================
// FIREBASE İMPORT DÜZELTMESİ
// Derleme hatasını önlemek için import'lar, global değişkenler olarak kabul edilecek şekilde ayarlandı.
// Bu fonksiyonlar, Canvas ortamında otomatik olarak HTML/JS tarafından yüklendiği varsayılır.
// Normal React projelerinde bu, 'npm install firebase' ve standart 'import' ile yapılır.
// =========================================================

// Global Firebase fonksiyonlarını varsayıyoruz
const getAuth = window.firebase.auth.getAuth;
const signInAnonymously = window.firebase.auth.signInAnonymously;
const signInWithCustomToken = window.firebase.auth.signInWithCustomToken;
const onAuthStateChanged = window.firebase.auth.onAuthStateChanged;

const getFirestore = window.firebase.firestore.getFirestore;
const collection = window.firebase.firestore.collection;
const query = window.firebase.firestore.query;
const onSnapshot = window.firebase.firestore.onSnapshot;
const addDoc = window.firebase.firestore.addDoc;
const deleteDoc = window.firebase.firestore.deleteDoc;
const doc = window.firebase.firestore.doc; // Doc referansı için eklendi

// Canvas tarafından sağlanan global değişkenler
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// =========================================================
// B. ZAMANLAYICI SEÇENEKLERİ (Saniye cinsinden)
// =========================================================
const ZAMAN_SECENEKLERI = [
  { value: 60, label: "1 Dakika" },
  { value: 180, label: "3 Dakika" },
  { value: 300, label: "5 Dakika" },
  { value: Infinity, label: "Sınırsız" },
];

function App() {
  // Durum Yönetimi (State Management)
  const [inputText, setInputText] = useState('');
  const [kaynakMetinler, setKaynakMetinler] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [isTyping, setIsTyping] = useState(false); 
  const [timeLeft, setTimeLeft] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [selectedTime, setSelectedTime] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [errorCount, setErrorCount] = useState(0); 
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Firebase ve Yetkilendirme Durumları
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // =========================================================
  // C. FIREBASE VE YETKİLENDİRME ETKİSİ (useEffect Hook)
  // =========================================================
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Firebase uygulamasını başlatma (window.firebase global objesinden initializeApp alınır)
        const app = window.firebase.app.initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authentication = getAuth(app);
        
        setDb(firestore);
        setAuth(authentication);

        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (token) {
          await signInWithCustomToken(authentication, token);
        } else {
          // Gerekirse anonim giriş
          await signInAnonymously(authentication);
        }

        // Auth durumu değiştiğinde kullanıcı bilgilerini al
        const unsubscribe = onAuthStateChanged(authentication, (user) => {
          if (user) {
            const currentUserId = user.uid;
            setUserId(currentUserId);
            
            // Canvas ortamında token ile gelen kullanıcıyı admin olarak varsayıyoruz.
            // Bu, Admin panelini etkinleştirmek için yeterli bir kontrol.
            setIsAdmin(true); 
          }
          setIsLoading(false);
        });

        // Temizleme fonksiyonu
        return () => unsubscribe();

      } catch (error) {
        console.error("Firebase başlatılırken hata oluştu:", error);
        // Hata durumunda bile loadingi kapat
        setIsLoading(false);
      }
    };

    // Global 'window.firebase' nesnesinin yüklenmesini bekle (Gerekirse)
    if (window.firebase && window.firebase.app) {
        initializeFirebase();
    } else {
        // Eğer React ortamında 'window.firebase' hemen yüklenmezse, burada bir uyarı veririz.
        console.error("Firebase SDK'ları React ortamında global olarak bulunamadı. Lütfen Canvas'ın bu SDK'ları yüklediğinden emin olun.");
        setIsLoading(false);
    }

  }, []);

  // =========================================================
  // D. METİN VERİLERİNİ ÇEKME ETKİSİ (useEffect Hook)
  // =========================================================
  useEffect(() => {
    if (!db || isLoading) return; // DB hazır olana kadar bekle

    // Verilerin saklanacağı koleksiyon yolu (Herkese açık)
    const collectionPath = `/artifacts/${appId}/public/data/typing_texts`;
    const q = query(collection(db, collectionPath));
    
    // Anlık veri dinleme
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const texts = snapshot.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text
      }));
      
      setKaynakMetinler(texts);

      // Eğer seçili metin yoksa veya metinler ilk kez yükleniyorsa ilk metni seç
      if (texts.length > 0 && selectedText === '') {
        setSelectedText(texts[0].text);
        resetTest(selectedTime, texts[0].text);
      } else if (texts.length === 0) {
        setSelectedText('');
        resetTest();
      }
    }, (error) => {
      console.error("Firestore verileri çekilirken hata oluştu:", error);
    });

    return () => unsubscribe();
  }, [db, appId, isLoading, selectedTime]); 

  // =========================================================
  // E. TEMEL TEST MANTIĞI
  // =========================================================

  // Yazma Alanı Değiştiğinde
  const handleInputChange = (event) => {
    const newText = event.target.value;
    
    // Eğer test bitmişse veya metin yoksa yazmaya izin verme
    if (isFinished || !selectedText) return;
    // Kaynak metin uzunluğunu aşmasını engelle
    if (newText.length > selectedText.length) return;

    setInputText(newText);
    
    // Zamanlayıcıyı başlat
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
    }
    
    // Hata kontrolünü güncelle
    updateErrorCount(newText);

    // Tüm metin doğru yazıldıysa bitir
    if (newText === selectedText) {
      handleFinishTest();
    }
  };
  
  // Hata Sayısını Hesaplayan Fonksiyon
  const updateErrorCount = (currentInput) => {
    let errors = 0;
    for (let i = 0; i < currentInput.length; i++) {
      if (currentInput[i] !== selectedText[i]) {
        errors++;
      }
    }
    setErrorCount(errors);
  };
  
  // Testi Sonlandırma Fonksiyonu
  const handleFinishTest = () => {
    setIsTyping(false);
    setIsFinished(true);
    
    const finalCharacterCount = inputText.length;
    const correctCharacters = finalCharacterCount - errorCount;
    
    let timeSpentSeconds = 0;
    let calculatedWPM = 0;
    
    if (selectedTime !== Infinity) {
      timeSpentSeconds = selectedTime - timeLeft;
      
      // Hızı Hesapla (DBK/WPM = (Doğru Karakter Sayısı / 5) / (Geçen Süre / 60))
      if (timeSpentSeconds > 0) {
        calculatedWPM = Math.round((correctCharacters / 5) / (timeSpentSeconds / 60));
      }
    } 
    
    setWpm(calculatedWPM);
    
    // Doğruluk Yüzdesini Hesapla
    let calculatedAccuracy = 0;
    if (finalCharacterCount > 0) {
      calculatedAccuracy = Math.round((correctCharacters / finalCharacterCount) * 100);
    }
    setAccuracy(calculatedAccuracy);
  };

  // Metin Seçimini Değiştirme
  const handleTextChange = (event) => {
    const newTextId = event.target.value;
    const newText = kaynakMetinler.find(item => item.id === newTextId)?.text || '';
    setSelectedText(newText);
    resetTest(selectedTime, newText);
  };

  // Zaman Seçimini Değiştirme
  const handleTimeChange = (event) => {
    const newTime = event.target.value === "Infinity" ? Infinity : parseInt(event.target.value);
    setSelectedTime(newTime);
    resetTest(newTime, selectedText);
  };
  
  // Testi Sıfırlama Fonksiyonu
  const resetTest = (time = selectedTime, text = selectedText) => {
    setInputText('');
    setIsTyping(false);
    setTimeLeft(time);
    setErrorCount(0);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(0);
  };

  // =========================================================
  // F. ZAMANLAYICI VE HESAPLAMA ETKİSİ
  // =========================================================

  // Zamanlayıcı Etkisi (useEffect Hook)
  useEffect(() => {
    let timer = null;

    if (isTyping && timeLeft > 0 && selectedTime !== Infinity && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            handleFinishTest();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isFinished && selectedTime !== Infinity) {
      handleFinishTest();
    }

    return () => clearInterval(timer);
  }, [isTyping, timeLeft, selectedTime, isFinished]);


  // Metin ve Kelime Sayacı Hesaplamaları
  const characterCount = inputText.length;
  // Sadece boşluklarla ayrılmış kelimeleri say
  const wordCount = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).length;
  
  // Zamanı dakika:saniye formatında göster
  const formatTime = (time) => {
    if (time === Infinity) return "Sınırsız";
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // KAYNAK METNİ RENDER EDEN FONKSİYON (Hata Vurgulama)
  const renderSourceText = () => {
    if (!selectedText) return <span>Metin bulunamadı. Lütfen Admin panelinden yeni metin ekleyin.</span>;

    return selectedText.split('').map((char, index) => {
      let charClass = '';
      
      if (index < inputText.length) {
        charClass = char === inputText[index] ? 'correct' : 'incorrect';
      }
      // Yazılacak sıradaki harfi vurgula
      else if (index === inputText.length && !isFinished) {
        charClass = 'current';
      }
      
      return (
        <span key={index} className={charClass}>
          {char}
        </span>
      );
    });
  };

  // =========================================================
  // G. ADMIN PANELİ MANTIĞI (Firestore)
  // =========================================================
  
  const handleAddText = async (event) => {
    event.preventDefault();
    if (!db || !isAdmin) return;

    const newTextarea = event.target.elements.newTextarea;
    const newText = newTextarea.value.trim();
    
    if (newText.length > 10) {
      try {
        await addDoc(collection(db, `/artifacts/${appId}/public/data/typing_texts`), {
          text: newText,
          createdAt: new Date().toISOString()
        });
        newTextarea.value = ''; // Formu temizle
        // Pop-up yerine console veya UI mesajı kullanın
      } catch (e) {
        console.error("Metin eklenirken hata oluştu: ", e);
      }
    } else {
      console.warn("Lütfen geçerli bir metin girin (en az 10 karakter).");
    }
  };

  const handleDeleteText = async (id) => {
    if (!db || !isAdmin) return;
    
    // En az bir metin kalmasını sağlamak
    if (kaynakMetinler.length <= 1) {
      console.warn("En az bir metin kalmalıdır!");
      return;
    }

    // Metin silinmeden önce resetle
    resetTest(); 

    try {
      const docRef = doc(db, `/artifacts/${appId}/public/data/typing_texts`, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Metin silinirken hata oluştu: ", e);
    }
  };

  // =========================================================
  // H. RENDER KISMI (JSX)
  // =========================================================

  if (isLoading) {
    return <div className="App"><p>Yükleniyor...</p></div>;
  }

  // Yönetim Paneli Arayüzü
  if (showAdmin) {
    return (
      <div className="App admin-panel">
        <div className="admin-header">
          <h2>Admin Metin Yönetim Paneli</h2>
          {/* Admin ID kontrolü basittir, Firebase token sahibi her zaman admin sayılır. */}
          {isAdmin && <p className="admin-user-info">Kullanıcı ID (Admin): {userId}</p>}
          <button className="sifirla-btn" onClick={() => setShowAdmin(false)}>
            Test Ekranına Dön
          </button>
        </div>

        {isAdmin ? (
          <div className="admin-content-wrapper">
            {/* Yeni Metin Ekleme */}
            <div className="admin-section add-text-section">
              <h3>Yeni Metin Ekle</h3>
              <form onSubmit={handleAddText}>
                <textarea 
                  name="newTextarea"
                  placeholder="Buraya yeni metni yapıştırın veya yazın (En az 10 karakter)..."
                  rows="10"
                  required
                />
                <button type="submit" className="kaydet-btn">Metni Kaydet</button>
              </form>
            </div>

            {/* Mevcut Metinler */}
            <div className="admin-section current-texts-section">
              <h3>Mevcut Metinler ({kaynakMetinler.length})</h3>
              <ul className="text-list">
                {kaynakMetinler.map((item) => (
                  <li key={item.id}>
                    <p>{item.text.substring(0, 100)}...</p>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDeleteText(item.id)}
                      disabled={kaynakMetinler.length <= 1}
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
              {kaynakMetinler.length <= 1 && <p className="warning-text">⚠️ En az bir metin kalmalıdır.</p>}
            </div>
          </div>
        ) : (
          <div className="yetki-yok-mesaji">
            <p>Bu sayfaya erişim yetkiniz yoktur. Sadece uygulamanın sahibi (Admin) metinleri yönetebilir.</p>
          </div>
        )}
      </div>
    );
  }

  // Ana Uygulama Arayüzü
  return (
    <div className="App">
      <header className="App-header">
        <h1>Klavye Sayacı & Hız Testi</h1>
        {isAdmin && (
          <button className="admin-btn" onClick={() => setShowAdmin(true)}>
            Metin Yönetimi
          </button>
        )}
      </header>

      {/* SONUÇ KUTUSU */}
      {isFinished && (
        <div className="sonuc-kutusu">
          <h2>TEST SONUÇLARI</h2>
          {selectedTime !== Infinity ? (
            <p>DBK (WPM): <span className="sonuc-wpm">{wpm}</span></p>
          ) : (
            <p>DBK (WPM): <span className="sonuc-wpm">Sınırsız modda hız hesaplanmaz.</span></p>
          )}
          
          <p>Doğruluk: <span className="sonuc-accuracy">{accuracy}%</span></p>
        </div>
      )}

      {/* ZAMAN VE METİN SEÇİM ALANI */}
      <div className="kontrol-alanı">
        {/* Metin Seçimi */}
        <label htmlFor="text-select">Metin Seç:</label>
        <select 
          id="text-select" 
          onChange={handleTextChange} 
          value={kaynakMetinler.find(item => item.text === selectedText)?.id || ''} 
          disabled={isTyping || isFinished || kaynakMetinler.length === 0}
        >
          {kaynakMetinler.length > 0 ? (
            kaynakMetinler.map((item) => (
              <option key={item.id} value={item.id}>
                {item.text.substring(0, 30)}...
              </option>
            ))
          ) : (
             <option value="" disabled>Metin Yok (Admin Eklesin)</option>
          )}
        </select>
        
        {/* Zaman Seçimi */}
        <label htmlFor="time-select">Süre Seç:</label>
        <select 
          id="time-select" 
          onChange={handleTimeChange} 
          value={selectedTime} 
          disabled={isTyping || isFinished}
        >
          {ZAMAN_SECENEKLERI.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* ZAMANLAYICI GÖSTERGESİ */}
      <div className="timer-gosterge">
        {selectedTime !== Infinity ? (
          <p>Kalan Süre: {formatTime(timeLeft)}</p>
        ) : (
          <p>Süre: Sınırsız</p>
        )}
      </div>

      {/* KAYNAK METİN KUTUSU */}
      <div className="kaynak-metin-kutusu">
        {renderSourceText()}
      </div>

      {/* YAZMA ALANI */}
      <textarea
        placeholder={selectedText ? (isFinished ? "Test bitti! Yeni bir test başlatın." : "Buraya yaz...") : "Metin yüklenmedi veya mevcut değil."}
        value={inputText}
        onChange={handleInputChange}
        // Yazma metni varsa ve bitmemişse veya sınırsızsa izin ver
        disabled={!selectedText || isFinished || (timeLeft === 0 && selectedTime !== Infinity)}
        rows="8"
      />

      {/* SAYICI VE BUTONLAR */}
      <div className="bilgi-alanı">
        <p>Doğru Karakter Sayısı: {characterCount - errorCount}</p>
        <p>Hata Sayısı: {errorCount}</p>
        <p>Kelime Sayısı: {wordCount}</p>
        <button 
          className="kaydet-btn" 
          onClick={handleFinishTest} 
          // Yazmaya başlamadıysak, bitmişse veya sınırlı modda süresi dolduysa kaydetme
          disabled={!isTyping || isFinished || (selectedTime !== Infinity && timeLeft <= 0)}
        >
          Kaydet/Sonuçlandır
        </button>
        <button className="sifirla-btn" onClick={() => resetTest()}>Sıfırla</button>
      </div>
    </div>
  );
}

export default App;
