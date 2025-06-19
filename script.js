document.addEventListener('DOMContentLoaded', () => {
    // HTML elementlerine referanslar
    const excelFile = document.getElementById('excelFile');
    const winnerCountInput = document.getElementById('winnerCount');
    const winnerCountLabel = document.querySelector('label[for="winnerCount"]');
    const winnerCountPlaceholder = document.getElementById('winnerCountPlaceholder');
    const startDrawButton = document.getElementById('startDraw');
    const winnersListContainer = document.getElementById('winnersList');
    const noWinnersYetMessage = document.getElementById('noWinnersYet');
    const errorArea = document.getElementById('error');
    const errorMessageElement = errorArea.querySelector('p');
    const loadingFileMessage = document.getElementById('loadingFile');
    const drawingStatusMessage = document.getElementById('drawingStatus');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');

    let participants = []; // Excel'den okunan tüm katılımcıların ana listesi (değişmez)
    let finalWinners = []; // Çekiliş sonunda belirlenen kazananların son listesi (TXT için)

    // Hata mesajını gösterir
    function showError(message) {
        errorMessageElement.textContent = message;
        errorArea.style.display = 'block';
        hideStatusMessages(); // Durum mesajlarını gizle
    }

    // Hata mesajını gizler
    function hideError() {
        errorArea.style.display = 'none';
        errorMessageElement.textContent = '';
    }

    // Yükleme/çekiliş durumu mesajlarını gizler
    function hideStatusMessages() {
        loadingFileMessage.style.display = 'none';
        drawingStatusMessage.style.display = 'none';
    }

    // Çekiliş sonuçlarını temizler ve "Henüz kazanan yok" mesajını gösterir
    function resetResultDisplay() {
        winnersListContainer.innerHTML = ''; // Önceki kazanan öğelerini kaldır
        noWinnersYetMessage.style.display = 'block'; // Yer tutucu mesajı göster
        downloadTxtBtn.style.display = 'none'; // İndirme düğmesini gizle
        finalWinners = []; // Kazananlar listesini sıfırla
    }

    // Başlangıçta kazanan sayısı alanını ve label'ı gizle, placeholder'ı göster
    winnerCountInput.style.display = 'none';
    winnerCountLabel.style.display = 'none';
    winnerCountPlaceholder.style.display = 'block';
    downloadTxtBtn.style.display = 'none'; // Başlangıçta indir düğmesini de gizle


    // Excel dosyası seçildiğinde tetiklenen olay dinleyicisi
    excelFile.addEventListener('change', async (event) => {
        hideError(); // Önceki hataları temizle
        hideStatusMessages(); // Önceki durum mesajlarını temizle
        resetResultDisplay(); // Önceki çekiliş sonuçlarını temizle

        const file = event.target.files[0];
        if (!file) {
            startDrawButton.disabled = true;
            winnerCountInput.disabled = true;
            winnerCountInput.style.display = 'none';
            winnerCountLabel.style.display = 'none';
            winnerCountPlaceholder.style.display = 'block';
            return;
        }

        // Sadece Excel dosyalarını (.xlsx, .xls) kabul et
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            showError('Lütfen geçerli bir Excel dosyası (.xlsx veya .xls) seçin.');
            startDrawButton.disabled = true;
            winnerCountInput.disabled = true;
            winnerCountInput.style.display = 'none';
            winnerCountLabel.style.display = 'none';
            winnerCountPlaceholder.style.display = 'block';
            return;
        }

        loadingFileMessage.style.display = 'block'; // "Dosya Yükleniyor" mesajını göster
        startDrawButton.disabled = true; // Çekiliş düğmesini devre dışı bırak
        winnerCountInput.disabled = true; // Kazanan sayısı girişini devre dışı bırak
        winnerCountInput.style.display = 'none'; // Yüklenirken de gizli kalsın
        winnerCountLabel.style.display = 'none';
        winnerCountPlaceholder.style.display = 'block';


        try {
            const data = await readFileAsArrayBuffer(file);
            const workbook = XLSX.read(data, { type: 'array' });

            // **Hata Düzeltmesi ve Kontrol:**
            // workbook.Sheets[sheetName] doğru referans, XLSX.Sheets[sheetName] yanlış olabilir.
            let worksheet;
            if (workbook.SheetNames && workbook.SheetNames.length > 0) {
                const sheetName = workbook.SheetNames[0]; // İlk sayfanın adını al
                worksheet = workbook.Sheets[sheetName];    // O sayfaya eriş
            } else {
                throw new Error('Excel dosyası herhangi bir çalışma sayfası içermiyor.');
            }
            
            if (!worksheet) {
                throw new Error('Excel dosyasının ilk çalışma sayfası boş veya okunamadı.');
            }

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            participants = []; 
            if (jsonData.length < 2) { 
                showError('Excel dosyası yeterli veri içermiyor. Lütfen en az bir veri satırı olduğundan emin olun.');
                return;
            }

            for (let i = 1; i < jsonData.length; i++) { // Başlık satırını atla (i=1'den başla)
                const row = jsonData[i];
                const uid = row[0]; 
                const participationCount = parseInt(row[1]);
                const nickname = row[2]; 

                if (uid && !isNaN(participationCount) && participationCount > 0 && nickname) {
                    participants.push({ uid, participationCount, nickname });
                } else if (uid || !isNaN(participationCount) || nickname) {
                    console.warn(`Satır ${i + 1} eksik veya hatalı veri içeriyor. UID: ${uid}, Katılım: ${row[1]}, Takma Ad: ${nickname}`);
                }
            }

            if (participants.length === 0) {
                showError('Excel dosyasında geçerli katılımcı verisi bulunamadı. Lütfen UID, katılım sayısı ve takma ad sütunlarını kontrol edin.');
                winnerCountInput.style.display = 'none';
                winnerCountLabel.style.display = 'none';
                winnerCountPlaceholder.style.display = 'block';
            } else {
                startDrawButton.disabled = false; 
                winnerCountInput.disabled = false; 
                winnerCountInput.max = participants.length;
                if (parseInt(winnerCountInput.value) > participants.length) {
                    winnerCountInput.value = participants.length; 
                }
                winnerCountInput.min = 1; 

                winnerCountPlaceholder.style.display = 'none';
                winnerCountLabel.style.display = 'block';
                winnerCountInput.style.display = 'block';
            }

        } catch (err) {
            showError(`Excel dosyasını okurken bir hata oluştu: ${err.message}. Lütfen dosya formatını, boş olup olmadığını ve sayfa adlarını kontrol edin.`);
            console.error("Excel okuma hatası:", err);
            winnerCountInput.style.display = 'none';
            winnerCountLabel.style.display = 'none';
            winnerCountPlaceholder.style.display = 'block';
        } finally {
            loadingFileMessage.style.display = 'none'; 
        }
    });

    // FileReader'ı Promise tabanlı hale getiren yardımcı fonksiyon
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    // Çekilişi başlat düğmesine tıklandığında tetiklenen olay dinleyicisi
    startDrawButton.addEventListener('click', () => {
        hideError(); 
        resetResultDisplay(); 
        hideStatusMessages();

        if (participants.length === 0) {
            showError('Lütfen önce geçerli bir Excel dosyası yükleyin.');
            return;
        }

        const winnerCount = parseInt(winnerCountInput.value);
        if (isNaN(winnerCount) || winnerCount < 1) {
            showError('Lütfen geçerli bir kazanan sayısı girin (en az 1).');
            return;
        }
        if (winnerCount > participants.length) {
            showError(`Seçilebilecek maksimum kazanan sayısı ${participants.length}. Lütfen sayıyı azaltın.`);
            return;
        }

        drawingStatusMessage.style.display = 'block'; 
        startDrawButton.disabled = true; 
        winnerCountInput.disabled = true; 

        // Çekiliş animasyonu hissi için küçük bir gecikme ekle
        setTimeout(() => {
            let currentWeightedList = [];
            participants.forEach(p => {
                for (let i = 0; i < p.participationCount; i++) {
                    currentWeightedList.push(p.uid); 
                }
            });

            finalWinners = []; // Her çekiliş öncesi temizle
            const drawnUIDs = new Set(); 

            for (let i = 0; i < winnerCount; i++) {
                if (currentWeightedList.length === 0) {
                    console.warn(`İstenen ${winnerCount} kazanan sayısına ulaşılamadı. Sadece ${finalWinners.length} kazanan belirlendi.`);
                    break;
                }

                let foundUniqueWinner = false;
                let attempts = 0;
                const maxAttempts = currentWeightedList.length * 2; 

                while (!foundUniqueWinner && attempts < maxAttempts) {
                    const randomIndex = Math.floor(Math.random() * currentWeightedList.length);
                    const potentialWinnerUID = currentWeightedList[randomIndex];

                    if (!drawnUIDs.has(potentialWinnerUID)) {
                        const winnerParticipant = participants.find(p => p.uid === potentialWinnerUID);
                        if (winnerParticipant) {
                            finalWinners.push(winnerParticipant); 
                            drawnUIDs.add(potentialWinnerUID); 
                            foundUniqueWinner = true; 
                        }
                    }
                    
                    currentWeightedList.splice(randomIndex, 1);
                    attempts++;
                }

                if (!foundUniqueWinner) {
                    console.warn("Yeterli sayıda benzersiz kazanan bulunamadı veya döngü sınırına ulaşıldı.");
                    break; 
                }
            }

            if (finalWinners.length > 0) {
                noWinnersYetMessage.style.display = 'none'; 
                finalWinners.forEach((winner, index) => {
                    const winnerItem = document.createElement('div');
                    winnerItem.classList.add('winner-item');
                    // UID kısmını HTML'de bırakıyoruz ama CSS ile gizleyeceğiz
                    winnerItem.innerHTML = `
                        <span>UID: ${winner.uid}</span> 
                        <span class="nickname">${winner.nickname}</span>
                    `;
                    winnerItem.style.animationDelay = `${0.2 + index * 0.15}s`;
                    winnersListContainer.appendChild(winnerItem);
                    setTimeout(() => {
                        winnerItem.classList.add('revealed');
                    }, 50 + index * 100); 
                });
                downloadTxtBtn.style.display = 'block'; // Kazananlar varsa indir düğmesini göster
            } else {
                showError('Belirtilen kriterlere göre kazanan bulunamadı. Lütfen katılımcı sayısını ve seçilecek kazanan sayısını kontrol edin.');
            }

            drawingStatusMessage.style.display = 'none'; 
            startDrawButton.disabled = false; 
            winnerCountInput.disabled = false; 
        }, 1500); 
    });

    // TXT indirme düğmesine tıklanma olayı
    downloadTxtBtn.addEventListener('click', () => {
        if (finalWinners.length === 0) {
            showError('İndirilecek kazanan yok. Lütfen önce çekiliş yapın.');
            return;
        }

        // UID ve Takma Adı birleştirerek her birini yeni bir satıra yaz
        const contentToSave = finalWinners.map(winner => `UID: ${winner.uid}, Takma Adı: ${winner.nickname}`).join('\n');
        
        // Blob oluştur (text/plain türünde)
        const blob = new Blob([contentToSave], { type: 'text/plain;charset=utf-8' });
        
        // Bir indirme linki oluştur
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        
        // Dosya adı
        a.download = 'cekilis_kazananlari.txt'; // Dosya adını değiştirdik
        
        // Linki tıkla (indirme işlemini başlat)
        document.body.appendChild(a); // Bazı tarayıcılar için DOM'a eklemek gerekebilir
        a.click();
        document.body.removeChild(a); // İndirme sonrası linki kaldır
        
        URL.revokeObjectURL(a.href); // Bellek sızıntısını önle
    });
});