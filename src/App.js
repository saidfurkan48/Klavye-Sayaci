import React, { useState, useEffect } from "react";
import "./App.css";

// =========================================================
// 🔥 Firebase Modül İçe Aktarımları (Yeni Sistem)
// =========================================================
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setLogLevel,
} from "firebase/firestore";

// =========================================================
// 🔧 Firebase Config (Kendi config’in buraya gelecek)
// =========================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// =========================================================
// ⚙️ Sabit Değerler ve Ayarlar
// =========================================================
const ADMIN_USERNAME = "Furkan123";
const ADMIN_PASSWORD = "Furkan147.?!";
const appId = "klavye-sayaci";
const initialAuthToken = null;

const ZAMAN_SECENEKLERI = [
  { value: 60, label: "1 Dakika" },
  { value: 180, label: "3 Dakika" },
  { value: 300, label: "5 Dakika" },
  { value: Infinity, label: "Sınırsız" },
];

// =========================================================
// 🧠 Ana React Bileşeni
// =========================================================
function App() {
  const [inputText, setInputText] = useState("");
  const [kaynakMetinler, setKaynakMetinler] = useState([]);
  const [selectedText, setSelectedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ZAMAN_SECENEKLERI[0].value);
  const [selectedTime, setSelectedTime] = useState(ZAMAN_SECENEKLERI[0].value);
  const [errorCount, setErrorCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  // Firebase değişkenleri
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Admin durumları
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ type: "", text: "" });

  // =========================================================
  // 🚀 Firebase Başlatma
  // =========================================================
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authentication = getAuth(app);
        setLogLevel("error");

        setDb(firestore);
        setAuth(authentication);

        if (initialAuthToken) {
          await signInWithCustomToken(authentication, initialAuthToken);
        } else {
          await signInAnonymously(authentication);
        }

        onAuthStateChanged(authentication, (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(null);
          }
          setIsAuthReady(true);
          setIsLoading(false);
        });
      } catch (error) {
        console.error("Firebase başlatılırken hata:", error);
        setIsAuthReady(true);
        setIsLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  // =========================================================
  // 🔄 Metinleri Firestore'dan Çekme
  // =========================================================
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const collectionPath = `/artifacts/${appId}/public/data/typing_texts`;
    const q = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const texts = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text,
        }));
        setKaynakMetinler(texts);
        if (texts.length > 0) {
          const initialText = texts[0].text;
          setSelectedText(initialText);
        }
      },
      (error) => {
        console.error("Firestore hata:", error);
        setAdminMessage({
          type: "error",
          text: "Verilere erişilemiyor, güvenlik kurallarını kontrol edin.",
        });
      }
    );

    return () => unsubscribe();
  }, [db, isAuthReady]);

  // =========================================================
  // ⌨️ Yazma Mantığı
  // =========================================================
  const handleInputChange = (event) => {
    const newText = event.target.value;
    if (isFinished || !selectedText) return;
    if (newText.length > selectedText.length) return;
    setInputText(newText);
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
    }
    updateErrorCount(newText);
    if (newText === selectedText) handleFinishTest();
  };

  const updateErrorCount = (currentInput) => {
    let errors = 0;
    for (let i = 0; i < currentInput.length; i++) {
      if (currentInput[i] !== selectedText[i]) errors++;
    }
    setErrorCount(errors);
  };

  const handleFinishTest = () => {
    setIsTyping(false);
    setIsFinished(true);
    const correct = inputText.length - errorCount;
    const timeSpent = selectedTime - timeLeft;
    const wpmCalc =
      timeSpent > 0 ? Math.round((correct / 5 / (timeSpent / 60))) : 0;
    setWpm(wpmCalc);
    setAccuracy(
      inputText.length > 0
        ? Math.round((correct / inputText.length) * 100)
        : 0
    );
  };

  const resetTest = () => {
    setInputText("");
    setIsTyping(false);
    setTimeLeft(selectedTime);
    setErrorCount(0);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(0);
  };

  // =========================================================
  // 🕐 Zamanlayıcı
  // =========================================================
  useEffect(() => {
    let timer = null;
    if (isTyping && timeLeft > 0 && selectedTime !== Infinity && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timer);
            handleFinishTest();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTyping, timeLeft, selectedTime, isFinished]);

  const formatTime = (time) => {
    if (time === Infinity) return "Sınırsız";
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // =========================================================
  // 👨‍💼 Admin Girişi
  // =========================================================
  const LoginModal = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const handleSubmit = (e) => {
      e.preventDefault();
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        setIsAdmin(true);
        setShowLoginModal(false);
        setShowAdmin(true);
      } else {
        setErrorMessage("Hatalı kullanıcı adı veya şifre.");
      }
    };
    return (
      <div className="login-modal-overlay">
        <div className="login-modal">
          <h2>Admin Girişi</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errorMessage && <p className="login-error">{errorMessage}</p>}
            <button type="submit">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================
  // 🧩 Arayüz
  // =========================================================
  if (isLoading) return <p>Firebase bağlanıyor...</p>;

  const isReadyToSave = isAuthReady && isAdmin && !!userId;

  if (showAdmin) {
    return (
      <div className="App admin-panel">
        <h2>Admin Paneli</h2>
        <p>
          Kullanıcı ID: {userId || "Anonim"} {isAdmin && "(Admin)"}
        </p>
        <button onClick={() => setShowAdmin(false)}>Test Ekranına Dön</button>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const newText = e.target.elements.newTextarea.value.trim();
            if (newText.length < 10) {
              setAdminMessage({
                type: "warning",
                text: "Metin en az 10 karakter olmalı.",
              });
              return;
            }
            try {
              await addDoc(
                collection(db, `/artifacts/${appId}/public/data/typing_texts`),
                { text: newText, createdAt: new Date().toISOString() }
              );
              e.target.reset();
              setAdminMessage({
                type: "success",
                text: "Metin başarıyla eklendi.",
              });
            } catch (err) {
              console.error(err);
              setAdminMessage({
                type: "error",
                text: "Metin eklenemedi. Yetki veya bağlantı hatası.",
              });
            }
          }}
        >
          <textarea name="newTextarea" rows="6" />
          <button disabled={!isReadyToSave}>Metni Kaydet</button>
        </form>

        {adminMessage.text && (
          <p className={`msg-${adminMessage.type}`}>{adminMessage.text}</p>
        )}

        <h3>Mevcut Metinler ({kaynakMetinler.length})</h3>
        {kaynakMetinler.map((t) => (
          <div key={t.id}>
            <p>{t.text}</p>
            <button
              onClick={() =>
                deleteDoc(
                  doc(db, `/artifacts/${appId}/public/data/typing_texts`, t.id)
                )
              }
            >
              Sil
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Klavye Sayacı & Hız Testi</h1>
        <button onClick={() => setShowLoginModal(true)}>Admin Girişi</button>
      </header>

      {showLoginModal && <LoginModal />}

      <div className="timer">{formatTime(timeLeft)}</div>
      <div className="text-box">{selectedText}</div>
      <textarea
        value={inputText}
        onChange={handleInputChange}
        disabled={!selectedText || isFinished}
      />
      <button onClick={resetTest}>Sıfırla</button>
      {isFinished && (
        <div>
          <p>Hız: {wpm} WPM</p>
          <p>Doğruluk: {accuracy}%</p>
        </div>
      )}
    </div>
  );
}

export default App;
