import React, { useState, useEffect } from 'react';
import './App.css'; 

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
  const [selectedText, setSelectedText] = useState(KAYNAK_METINLERI[0].text); 
  const [isTyping, setIsTyping] = useState(false); 
  const [timeLeft, setTimeLeft] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [selectedTime, setSelectedTime] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [errorCount, setErrorCount] = useState(0); 
  const [initialTime, setInitialTime] = useState(ZAMAN_SECENEKLERI[0].value); 
  const [result, setResult] = useState(null); 

  // Yazma Alanı Değiştiğinde
  const handleInputChange = (event) => {
    const newText = event.target.value;
    
    // Eğer sonuçlar gösteriliyorsa yazmayı engelle
    if (result) return;
    
    setInputText(newText);
    
    // Zamanlayıcıyı başlat
    if (newText.length === 1 && !isTyping && selectedTime !== Infinity) {
      setIsTyping(true);
      setInitialTime(selectedTime); 
    }
    
    // Hata kontrolünü güncelle
    updateErrorCount(newText);
    
    // Eğer tüm metin doğru yazıldıysa, testi sonlandır
    if (newText === selectedText) {
        finishTest();
    }
  };
  
  // Hata Sayısını Hesaplayan Fonksiyon
  const updateErrorCount = (currentInput) => {
      let errors = 0;
      for (let i = 0; i < currentInput.length; i++) {
          // Kaynak metin uzunluğunu kontrol et
          if (i < selectedText.length && currentInput[i] !== selectedText[i]) {
              errors++;
          }
      }
      setErrorCount(errors);
  };
  
  // Metin Seçimini Değiştirme
  const handleTextChange = (event) => {
    const newTextId = parseInt(event.target.value);
    const newText = KAYNAK_METINLERI.find(item => item.id === newTextId).text;
    setSelectedText(newText);
    resetTest();
  };

  // Zaman Seçimini Değiştirme
  const handleTimeChange = (event) => {
    const newTime = parseInt(event.target.value);
    setSelectedTime(newTime);
    resetTest(newTime);
  };
  
  // Testi Sonlandırma ve Sonuçları Hesaplama Fonksiyonu
  const finishTest = () => {
    // 1. Yazmayı durdur
    setIsTyping(false); 

    // 2. Kullanılan süreyi hesapla (saniye cinsinden)
    let timeSpentSeconds;
    if (selectedTime === Infinity) {
        // Sınırsız modda bitirdiyse, DBK hesaplaması şimdilik yok
        timeSpentSeconds = 0; 
    } else {
        // Zamanlı modda: Başlangıç Süresi - Kalan Süre
        timeSpentSeconds = initialTime - timeLeft;
    }
    
    // 3. Yazılan doğru kelime sayısını bul
    // Kelime sınırları için boşlukları kullan
    const currentInputWords = inputText.trim().split(/\s+/).filter(Boolean);
    let correctWords = 0;
    
    // Kaynak metindeki kelimeler
    const sourceWords = selectedText.trim().split(/\s+/).filter(Boolean);
    
    for(let i = 0; i < currentInputWords.length; i++){
        // Kaynak kelime mevcutsa ve eşleşiyorsa
        if(sourceWords[i] && currentInputWords[i] === sourceWords[i]){
            correctWords++;
        }
    }
    
    // 4. DBK (WPM) Hesapla (Dakika Başına Kelime)
    const timeSpentMinutes = timeSpentSeconds / 60;
    // Eğer süre harcandıysa (en az 1 saniye) hesapla
    const calculatedWPM = timeSpentMinutes > 0 ? Math.round(correctWords / timeSpentMinutes) : 0;
    
    // 5. Doğruluk Yüzdesi Hesapla
    const totalCharsTyped = inputText.length;
    // Yanlış karakter sayısı = Toplam yazılan karakter - (Doğru yazılan karakterler)
    const correctChars = totalCharsTyped - errorCount;
    const accuracy = totalCharsTyped > 0 ? (correctChars / totalCharsTyped) * 100 : 0;
    
    // 6. Sonucu kaydet
    setResult({
        wpm: calculatedWPM,
        accuracy: accuracy.toFixed(2), // 2 ondalık basamağa yuvarla
        correctWords: correctWords,
        totalWordsTyped: currentInputWords.length
    });
    
    // Kalan süreyi sıfırla (eğer sınırsız modda değilsek)
    if (selectedTime !== Infinity) {
        setTimeLeft(0);
    }
  };

  // Testi Sıfırlama Fonksiyonu
  const resetTest = (newTime = selectedTime) => {
    setInputText('');
    setIsTyping(false);
    setTimeLeft(newTime);
    setSelectedTime(newTime);
    setInitialTime(newTime);
    setErrorCount(0);
    setResult(null); // Sonucu sıfırla
  };

  // Zamanlayıcı Etkisi (useEffect Hook)
  useEffect(() => {
    let timer = null;

    if (isTyping && timeLeft > 0 && selectedTime !== Infinity) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } 
    
    // Eğer zaman biterse, testi sonlandır
    if (timeLeft === 0 && isTyping && selectedTime !== Infinity) {
        finishTest();
    }

    return () => clearInterval(timer);
  }, [isTyping, timeLeft, selectedTime]);


  // Metin ve Kelime Sayacı Hesaplamaları
  const characterCount = inputText.length;
  const wordCount = inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length;
  
  // Zamanı dakika:saniye formatında göster
  const formatTime = (time) => {
    if (time === Infinity) return "Sınırsız";
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // KAYNAK METNİ RENDER EDEN FONKSİYON
  const renderSourceText = () => {
    return selectedText.split('').map((char, index) => {
      let charClass = '';
      
      if (index < inputText.length) {
        // Yazılan karakterin doğru/yanlış sınıfını belirle
        charClass = char === inputText[index] ? 'correct' : 'incorrect';
      }
      // Eğer hala yazılıyorsa ve bu karakter sıradaki karakterse (vurgu)
      else if (index === inputText.length && !result) {
        charClass = 'current';
      }
      
      return (
        <span key={index} className={charClass}>
          {char}
        </span>
      );
    });
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>Klavye Sayacı & Hız Testi</h1>
      </header>

      {/* SONUÇ GÖSTERİMİ */}
      {result && (
        <div className="sonuc-kutusu">
            <h2>Test Sonuçları</h2>
            <p className="sonuc-dbk">DBK (WPM): <strong>{result.wpm}</strong></p>
            <p>Doğruluk: <strong>%{result.accuracy}</strong></p>
            <p>Doğru Kelime: {result.correctWords} / {result.totalWordsTyped}</p>
        </div>
      )}

      {/* KONTROL ALANI (Sonuç varken gizle) */}
      {!result && (
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
      )}
      
      {/* ZAMANLAYICI GÖSTERGESİ */}
      <div className="timer-gosterge">
        {selectedTime !== Infinity && (
            <p>Kalan Süre: {formatTime(timeLeft)}</p>
        )}
      </div>

      {/* KAYNAK METİN KUTUSU */}
      <div className="kaynak-metin-kutusu">
        {renderSourceText()}
      </div>

      {/* YAZMA ALANI */}
      <textarea
        placeholder={timeLeft === 0 && selectedTime !== Infinity ? "Süre doldu! Lütfen Sıfırla'ya basın." : "Buraya yaz..."}
        value={inputText}
        onChange={handleInputChange}
        // Sonuç varsa veya süre dolmuşsa devre dışı bırak
        disabled={!!result || (timeLeft === 0 && selectedTime !== Infinity)}
        rows="8"
      />

      {/* SAYICI VE BUTONLAR */}
      <div className="bilgi-alanı">
        <p>Doğru Karakter: {characterCount - errorCount}</p>
        <p>Hata Sayısı: {errorCount}</p>
        <p>Kelime Sayısı: {wordCount}</p>
        <button 
            className="kaydet-btn" 
            onClick={finishTest}
            // Sadece test başlamışsa ve sonuçlanmamışsa aktif olmalı
            disabled={!isTyping || !!result || inputText.length === 0}
        >
            Kaydet/Sonuçlandır
        </button>
        <button className="sifirla-btn" onClick={() => resetTest()}>Sıfırla</button>
      </div>
    </div>
  );
}

export default App;
