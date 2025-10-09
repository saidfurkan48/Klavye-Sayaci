import React, { useState, useEffect } from 'react';
import './App.css'; // Stil dosyanızın adı App.css olmalı

// =========================================================
// A. TANIMLANAN METİNLER
// =========================================================
const KAYNAK_METINLERI = [
  { id: 1, text: "React, kullanıcı arayüzleri oluşturmak için kullanılan açık kaynaklı bir JavaScript kütüphanesidir. Bileşen tabanlı yapısı sayesinde, büyük ölçekli ve hızlı uygulamalar geliştirmeyi kolaylaştırır. Git ve GitHub, projelerin versiyon kontrolü ve işbirliği için vazgeçilmez araçlardır." },
  { id: 2, text: "Yapay zeka (YZ), makinelerin insan benzeri zeka gösterme yeteneği üzerine kurulu bir bilgisayar bilimi dalıdır. Öğrenme, problem çözme ve karar verme gibi görevleri otomatize etmeyi hedefler." },
  { id: 3, text: "Modern web geliştirme süreçleri, genellikle frontend ve backend olarak ikiye ayrılır. Frontend, kullanıcının gördüğü arayüzle ilgilenirken, backend sunucu tarafındaki veri yönetimi ve iş mantığını yürütür." },
];

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
  const [selectedText, setSelectedText] = useState(KAYNAK_METINLERI[0].text); // Varsayılan metin
  const [isTyping, setIsTyping] = useState(false); // Yazmaya başlandı mı?
  const [timeLeft, setTimeLeft] = useState(ZAMAN_SECENEKLERI[0].value); // Varsayılan zaman: 1 Dakika (60 saniye)
  const [selectedTime, setSelectedTime] = useState(ZAMAN_SECENEKLERI[0].value); // Seçilen zaman

  // Yazma Alanı Değiştiğinde
  const handleInputChange = (event) => {
    const newText = event.target.value;
    setInputText(newText);
    
    // Zamanlayıcıyı başlat
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
    }
  };

  // Metin Seçimini Değiştirme
  const handleTextChange = (event) => {
    const newTextId = parseInt(event.target.value);
    const newText = KAYNAK_METINLERI.find(item => item.id === newTextId).text;
    setSelectedText(newText);
    // Yazma alanını ve zamanlayıcıyı sıfırla
    resetTest();
  };

  // Zaman Seçimini Değiştirme
  const handleTimeChange = (event) => {
    const newTime = parseInt(event.target.value);
    setSelectedTime(newTime);
    // Zamanı ve testi sıfırla
    resetTest(newTime);
  };
  
  // Testi Sıfırlama Fonksiyonu
  const resetTest = (newTime = selectedTime) => {
    setInputText('');
    setIsTyping(false);
    setTimeLeft(newTime);
  };

  // Zamanlayıcı Etkisi (useEffect Hook)
  useEffect(() => {
    let timer = null;

    // Eğer yazmaya başlanmışsa VE zaman sınırsız değilse VE zaman bitmemişse
    if (isTyping && timeLeft > 0 && selectedTime !== Infinity) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } 
    
    // Eğer zaman biterse, yazmayı durdur
    if (timeLeft === 0) {
        setIsTyping(false);
        clearInterval(timer);
    }

    // Component temizlenirken timer'ı durdur
    return () => clearInterval(timer);
  }, [isTyping, timeLeft, selectedTime]);


  // Metin ve Kelime Sayacı Hesaplamaları
  const characterCount = inputText.length;
  const wordCount = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).length;
  
  // Zamanı dakika:saniye formatında göster
  const formatTime = (time) => {
    if (time === Infinity) return "Sınırsız";
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Klavye Sayacı & Hız Testi</h1>
      </header>

      {/* ZAMAN VE METİN SEÇİM ALANI */}
      <div className="kontrol-alanı">
        {/* Metin Seçimi */}
        <label htmlFor="text-select">Metin Seç:</label>
        <select id="text-select" onChange={handleTextChange}>
          {KAYNAK_METINLERI.map((item) => (
            <option key={item.id} value={item.id}>
              Metin {item.id}
            </option>
          ))}
        </select>
        
        {/* Zaman Seçimi */}
        <label htmlFor="time-select">Süre Seç:</label>
        <select id="time-select" onChange={handleTimeChange} value={selectedTime}>
          {ZAMAN_SECENEKLERI.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* ZAMANLAYICI GÖSTERGESİ */}
      <div className="timer-gosterge">
        {selectedTime !== Infinity && (
            <p>Kalan Süre: {formatTime(timeLeft)}</p>
        )}
      </div>

      {/* KAYNAK METİN KUTUSU */}
      <div className="kaynak-metin-kutusu">
        <p>{selectedText}</p>
      </div>

      {/* YAZMA ALANI */}
      <textarea
        placeholder={timeLeft === 0 ? "Süre doldu! Yeni bir test başlatın." : "Buraya yaz..."}
        value={inputText}
        onChange={handleInputChange}
        disabled={timeLeft === 0 && selectedTime !== Infinity} // Zaman bittiyse alanı kapat
        rows="8"
      />

      {/* SAYICI VE BUTONLAR */}
      <div className="bilgi-alanı">
        <p>Karakter Sayısı: {characterCount}</p>
        <p>Kelime Sayısı: {wordCount}</p>
        <button className="kaydet-btn" disabled={isTyping && timeLeft > 0}>Kaydet/Sonuçlandır</button>
        <button className="sifirla-btn" onClick={() => resetTest()}>Sıfırla</button>
      </div>

      {/* Hata Mesajı veya Sonuçlar (Gelecekte eklenir) */}
    </div>
  );
}
/* ========================================================= */
/* YENİ STİL KODLARI: App.css'e ekleyin */
/* ========================================================= */

.kontrol-alanı {
  display: flex;
  gap: 30px;
  justify-content: center;
  margin-bottom: 20px;
  color: #e0e0e0;
}

.kontrol-alanı label {
    margin-right: 10px;
}

.kontrol-alanı select {
    padding: 8px 12px;
    border: 1px solid #444;
    border-radius: 4px;
    background-color: #333;
    color: #e0e0e0;
}

.timer-gosterge p {
    font-size: 1.5em;
    font-weight: bold;
    color: #4caf50; /* Yeşil zaman göstergesi */
    margin-bottom: 15px;
}

.kaynak-metin-kutusu {
  width: 80%;
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #4caf50;
  border-radius: 8px;
  background-color: #2e2e2e;
  color: #e0e0e0;
  text-align: left;
  line-height: 1.6;
  user-select: none; /* Metnin seçilmesini engeller, sadece bakılarak yazılmasını teşvik eder */
  font-family: monospace; /* Daha okunur bir font */
}

/* Mevcut textarea stilinizi güncelleyebilirsiniz */
textarea {
    width: 80%;
    max-width: 800px;
    padding: 15px;
    border: 1px solid #555;
    border-radius: 6px;
    background-color: #1a1a1a;
    color: white;
    font-size: 1.1em;
    resize: vertical; /* Sadece dikey olarak boyutlandırmaya izin ver */
}

.bilgi-alanı {
    display: flex;
    gap: 20px;
    justify-content: center;
    margin-top: 20px;
    color: #e0e0e0;
}

/* Yeni Sıfırla Butonu için stil */
/* SIFIRLA BUTONU İÇİN (KIRMIZI OLMALI) */
.sifirla-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: #f44336; /* KIRMIZI */
    color: white;
    cursor: pointer;
    font-size: 1em;
    font-weight: bold;
    transition: background-color 0.3s;
}

.sifirla-btn:hover {
    background-color: #d32f2f;
}

/* KAYDET BUTONU İÇİN (YEŞİL OLMALI) */
.kaydet-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    background-color: #4caf50; /* YEŞİL */
    color: white;
    cursor: pointer;
    font-size: 1em;
    font-weight: bold;
    transition: background-color 0.3s;
}

.kaydet-btn:disabled {
    background-color: #777;
    cursor: not-allowed;
}
export default App;