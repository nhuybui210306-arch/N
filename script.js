// ================ STATE MANAGEMENT ================
const AppState = {
    user: JSON.parse(localStorage.getItem('2n1_current_user')) || null,
    tasks: JSON.parse(localStorage.getItem('2n1_tasks')) || [],
    points: parseInt(localStorage.getItem('2n1_points')) || 50, // Mặc định 50 điểm
    pets: JSON.parse(localStorage.getItem('2n1_pets')) || [],
    currentPet: JSON.parse(localStorage.getItem('2n1_current_pet')) || null,
    petStats: JSON.parse(localStorage.getItem('2n1_pet_stats')) || {
        happiness: 50,
        hunger: 100,
        exp: 0,
        level: 1
    },
    schedule: JSON.parse(localStorage.getItem('2n1_schedule')) || {},
    pomodoro: {
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        workSessionsCompleted: parseInt(localStorage.getItem('2n1_pomodoro_sessions')) || 0
    },
    sound: {
        current: null,
        volume: parseInt(localStorage.getItem('2n1_volume')) || 50,
        playing: false
    },
    currentDate: new Date()
};

// ================ KIỂM TRA DỮ LIỆU ================
console.log('AppState khởi tạo:', AppState);
console.log('Điểm hiện tại:', AppState.points);
console.log('Thú cưng hiện tại:', AppState.currentPet);
console.log('Chỉ số thú cưng:', AppState.petStats);

// ================ AUDIO MANAGER ================
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.source = null;
        this.gainNode = null;
        this.oscillator = null;
        this.isPlaying = false;
        this.currentSound = null;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
        }
    }

    async playSound(type) {
        this.init();
        
        // Stop current sound
        this.stopSound();

        // Create oscillator based on sound type
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.connect(this.gainNode);
        
        switch(type) {
            case 'forest':
                this.oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                this.oscillator.type = 'sine';
                break;
            case 'rain':
                this.oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                this.oscillator.type = 'triangle';
                break;
            case 'ocean':
                this.oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
                this.oscillator.type = 'sawtooth';
                break;
            case 'white-noise':
                this.playWhiteNoise();
                return;
        }

        this.oscillator.start();
        this.isPlaying = true;
        this.currentSound = type;

        // Add modulation for more natural sound
        this.addModulation();
    }

    playWhiteNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        whiteNoise.connect(this.gainNode);
        whiteNoise.start();
        
        this.source = whiteNoise;
        this.isPlaying = true;
        this.currentSound = 'white-noise';
    }

    addModulation() {
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        lfo.frequency.setValueAtTime(5, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(20, this.audioContext.currentTime);
        
        lfo.connect(lfoGain);
        lfoGain.connect(this.oscillator.frequency);
        lfo.start();
    }

    setVolume(value) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(value / 100, this.audioContext.currentTime);
        }
        AppState.sound.volume = value;
        localStorage.setItem('2n1_volume', value);
    }

    stopSound() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator = null;
        }
        if (this.source) {
            this.source.stop();
            this.source = null;
        }
        this.isPlaying = false;
        this.currentSound = null;
    }

    playCompleteSound() {
        this.init();
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 1);
    }
}

const audioManager = new AudioManager();

// ================ PET MANAGER ================
class PetManager {
    constructor() {
        this.petTypes = [
            { id: 1, name: 'Mèo Con', price: 100, image: '🐱', happiness: 50, hunger: 100 },
            { id: 2, name: 'Cún Con', price: 150, image: '🐶', happiness: 60, hunger: 80 },
            { id: 3, name: 'Thỏ Trắng', price: 120, image: '🐰', happiness: 70, hunger: 70 },
            { id: 4, name: 'Gấu Trúc', price: 200, image: '🐼', happiness: 80, hunger: 90 },
            { id: 5, name: 'Rồng Nhỏ', price: 500, image: '🐲', happiness: 100, hunger: 60 },
            { id: 6, name: 'Kỳ Lân', price: 300, image: '🦄', happiness: 90, hunger: 70 }
        ];
        
        console.log('PetManager khởi tạo với các loại:', this.petTypes);
    }

    getAvailablePets() {
        return this.petTypes.filter(pet => !AppState.pets.includes(pet.id));
    }

    buyPet(petId) {
        const pet = this.petTypes.find(p => p.id === petId);
        if (!pet) {
            console.log('Không tìm thấy pet với id:', petId);
            return false;
        }
        
        console.log('Đang mua pet:', pet);
        console.log('Điểm hiện tại:', AppState.points, 'Giá:', pet.price);
        
        if (AppState.points >= pet.price) {
            AppState.points -= pet.price;
            AppState.pets.push(petId);
            
            if (!AppState.currentPet) {
                this.selectPet(petId);
            }
            
            this.save();
            console.log('Mua thành công! Điểm còn lại:', AppState.points);
            return true;
        }
        console.log('Không đủ điểm!');
        return false;
    }

    selectPet(petId) {
        AppState.currentPet = petId;
        this.save();
        console.log('Đã chọn pet:', petId);
    }

    feedPet() {
        console.log('Đang cho thú cưng ăn...');
        if (AppState.currentPet) {
            AppState.petStats.hunger = Math.min(100, AppState.petStats.hunger + 20);
            AppState.petStats.happiness += 5;
            console.log('Sau khi cho ăn - Đói:', AppState.petStats.hunger, 'Hạnh phúc:', AppState.petStats.happiness);
            this.save();
            updatePetDisplay();
            showNotification('🍖 Đã cho thú cưng ăn!');
            return true;
        } else {
            console.log('Chưa có thú cưng!');
            showNotification('❌ Bạn chưa có thú cưng! Hãy mua thú cưng trong shop!', 'error');
            return false;
        }
    }

    playWithPet() {
        console.log('Đang chơi với thú cưng...');
        if (AppState.currentPet) {
            AppState.petStats.happiness = Math.min(100, AppState.petStats.happiness + 15);
            AppState.petStats.hunger = Math.max(0, AppState.petStats.hunger - 10);
            console.log('Sau khi chơi - Hạnh phúc:', AppState.petStats.happiness, 'Đói:', AppState.petStats.hunger);
            this.save();
            updatePetDisplay();
            showNotification('🎮 Đã chơi với thú cưng!');
            return true;
        } else {
            console.log('Chưa có thú cưng!');
            showNotification('❌ Bạn chưa có thú cưng! Hãy mua thú cưng trong shop!', 'error');
            return false;
        }
    }

    addExp(amount) {
        if (AppState.currentPet) {
            AppState.petStats.exp += amount;
            
            // Level up
            const expNeeded = AppState.petStats.level * 100;
            if (AppState.petStats.exp >= expNeeded) {
                AppState.petStats.level++;
                AppState.petStats.exp -= expNeeded;
                showNotification(`🎉 Thú cưng của bạn đã lên cấp ${AppState.petStats.level}!`);
            }
            
            this.save();
            updatePetDisplay();
        }
    }

    decreaseStats() {
        if (AppState.currentPet) {
            AppState.petStats.happiness = Math.max(0, AppState.petStats.happiness - 1);
            AppState.petStats.hunger = Math.max(0, AppState.petStats.hunger - 1);
            this.save();
            updatePetDisplay();
        }
    }

    save() {
        localStorage.setItem('2n1_points', AppState.points.toString());
        localStorage.setItem('2n1_pets', JSON.stringify(AppState.pets));
        localStorage.setItem('2n1_current_pet', JSON.stringify(AppState.currentPet));
        localStorage.setItem('2n1_pet_stats', JSON.stringify(AppState.petStats));
        
        console.log('Đã lưu dữ liệu pet:', {
            points: AppState.points,
            pets: AppState.pets,
            currentPet: AppState.currentPet,
            stats: AppState.petStats
        });
    }
}

const petManager = new PetManager();

// ================ TASK MANAGER ================
class TaskManager {
    constructor() {
        this.timeSlots = [
            { id: 'morning', name: 'Sáng', range: '8:00 - 12:00', icon: 'fa-sun' },
            { id: 'afternoon', name: 'Chiều', range: '13:00 - 17:00', icon: 'fa-cloud-sun' },
            { id: 'evening', name: 'Tối', range: '19:00 - 21:00', icon: 'fa-moon' }
        ];
    }

    addTask(taskData) {
        const newTask = {
            id: Date.now(),
            ...taskData,
            completed: false,
            date: AppState.currentDate.toISOString().split('T')[0],
            points: this.calculatePoints(taskData.duration)
        };
        
        AppState.tasks.push(newTask);
        this.save();
        return newTask;
    }

    completeTask(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task && !task.completed) {
            task.completed = true;
            
            // Add points
            AppState.points += task.points || 10;
            
            // Add exp to pet
            petManager.addExp(task.points || 10);
            
            // Play sound
            audioManager.playCompleteSound();
            
            this.save();
            updatePoints();
            updateProgress();
            return true;
        }
        return false;
    }

    calculatePoints(duration) {
        const minutes = parseInt(duration) || 30;
        return Math.floor(minutes / 5); // 5 phút = 1 điểm
    }

    getTodayTasks() {
        const today = AppState.currentDate.toISOString().split('T')[0];
        return AppState.tasks.filter(t => t.date === today);
    }

    getProgress() {
        const todayTasks = this.getTodayTasks();
        const completed = todayTasks.filter(t => t.completed).length;
        const total = todayTasks.length;
        
        return {
            completed,
            total,
            percent: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    save() {
        localStorage.setItem('2n1_tasks', JSON.stringify(AppState.tasks));
        renderTasks();
        updateProgress();
    }
}

const taskManager = new TaskManager();

// ================ RENDERING FUNCTIONS ================
function renderTasks() {
    const container = document.getElementById('time-slots-container');
    if (!container) return;
    
    const todayTasks = taskManager.getTodayTasks();
    
    container.innerHTML = '';
    
    taskManager.timeSlots.forEach(slot => {
        const slotTasks = todayTasks.filter(t => t.time === slot.id);
        
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        
        slotElement.innerHTML = `
            <div class="time-header">
                <div class="time-range">
                    <i class="fas ${slot.icon}"></i> ${slot.name} (${slot.range})
                </div>
                <span class="task-count">${slotTasks.length} nhiệm vụ</span>
            </div>
            <div class="slot-tasks">
                ${slotTasks.length > 0 ? slotTasks.map(task => `
                    <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <span class="task-name">${task.name}</span>
                        <span class="task-duration">${task.duration} phút</span>
                        <span class="task-points"><i class="fas fa-star"></i> ${task.points}</span>
                    </div>
                `).join('') : `
                    <div class="empty-slot">Chưa có nhiệm vụ</div>
                `}
            </div>
        `;
        
        container.appendChild(slotElement);
    });
    
    // Add event listeners
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskItem = this.closest('.task-item');
            const taskId = parseInt(taskItem.dataset.id);
            
            if (this.checked) {
                taskManager.completeTask(taskId);
                taskItem.classList.add('completed');
            }
        });
    });
}

function updateProgress() {
    const progress = taskManager.getProgress();
    const progressBar = document.getElementById('daily-progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const completedCount = document.getElementById('completed-count');
    const totalCount = document.getElementById('total-count');
    
    if (progressBar) progressBar.style.width = `${progress.percent}%`;
    if (progressPercent) progressPercent.textContent = `${progress.percent}%`;
    if (completedCount) completedCount.textContent = progress.completed;
    if (totalCount) totalCount.textContent = progress.total;
}

function updatePoints() {
    const pointsDisplay = document.getElementById('user-points');
    const shopPoints = document.getElementById('shop-points');
    
    if (pointsDisplay) pointsDisplay.textContent = AppState.points;
    if (shopPoints) shopPoints.textContent = AppState.points;
    
    console.log('Điểm đã cập nhật:', AppState.points);
}

function updatePetDisplay() {
    console.log('Cập nhật hiển thị thú cưng...');
    
    const petName = document.getElementById('pet-name');
    const petLevel = document.getElementById('pet-level');
    const petHappiness = document.getElementById('pet-happiness');
    const petHunger = document.getElementById('pet-hunger');
    const petExp = document.getElementById('pet-exp');
    const happinessValue = document.getElementById('happiness-value');
    const hungerValue = document.getElementById('hunger-value');
    const expValue = document.getElementById('exp-value');
    const petImage = document.getElementById('pet-image');
    
    if (!AppState.currentPet) {
        if (petName) petName.textContent = 'Chưa có thú cưng';
        if (petLevel) petLevel.textContent = 'Cấp 0';
        if (petHappiness) petHappiness.style.width = '0%';
        if (petHunger) petHunger.style.width = '0%';
        if (petExp) petExp.style.width = '0%';
        if (happinessValue) happinessValue.textContent = '0%';
        if (hungerValue) hungerValue.textContent = '0%';
        if (expValue) expValue.textContent = '0/0';
        return;
    }
    
    const pet = petManager.petTypes.find(p => p.id === AppState.currentPet);
    if (pet) {
        if (petName) petName.textContent = pet.name;
        if (petLevel) petLevel.textContent = `Cấp ${AppState.petStats.level}`;
        if (petHappiness) petHappiness.style.width = `${AppState.petStats.happiness}%`;
        if (petHunger) petHunger.style.width = `${AppState.petStats.hunger}%`;
        
        const expNeeded = AppState.petStats.level * 100;
        const expPercent = (AppState.petStats.exp / expNeeded) * 100;
        if (petExp) petExp.style.width = `${expPercent}%`;
        
        if (happinessValue) happinessValue.textContent = `${AppState.petStats.happiness}%`;
        if (hungerValue) hungerValue.textContent = `${AppState.petStats.hunger}%`;
        if (expValue) expValue.textContent = `${AppState.petStats.exp}/${expNeeded}`;
        
        // Hiển thị emoji thay vì ảnh
        if (petImage) {
            petImage.style.fontSize = '80px';
            petImage.textContent = pet.image;
        }
        
        console.log('Đã cập nhật hiển thị pet:', pet.name);
    }
}

// ================ POMODORO TIMER ================
let pomodoroInterval = null;
let pomodoroRunning = false;
let pomodoroMinutes = AppState.pomodoro.workDuration;
let pomodoroSeconds = 0;
let pomodoroSession = 'work';

function updatePomodoroDisplay() {
    const display = document.getElementById('timer');
    const sessionType = document.getElementById('session-type');
    const progressRing = document.querySelector('.progress-ring__progress');
    
    if (display) {
        display.textContent = `${pomodoroMinutes.toString().padStart(2, '0')}:${pomodoroSeconds.toString().padStart(2, '0')}`;
    }
    
    // Update progress ring
    if (progressRing) {
        const totalSeconds = pomodoroSession === 'work' 
            ? AppState.pomodoro.workDuration * 60 
            : AppState.pomodoro.breakDuration * 60;
        const currentSeconds = pomodoroMinutes * 60 + pomodoroSeconds;
        const progress = (totalSeconds - currentSeconds) / totalSeconds;
        const circumference = 2 * Math.PI * 90;
        const offset = circumference * progress;
        progressRing.style.strokeDashoffset = offset;
    }
    
    // Update session type text
    if (sessionType) {
        if (pomodoroSession === 'work') {
            sessionType.textContent = '🎯 Đang tập trung';
        } else {
            sessionType.textContent = '☕ Đang nghỉ';
        }
    }
}

function startPomodoro() {
    if (!pomodoroRunning) {
        pomodoroRunning = true;
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;
        
        pomodoroInterval = setInterval(() => {
            if (pomodoroSeconds === 0) {
                if (pomodoroMinutes === 0) {
                    // Session complete
                    completePomodoro();
                } else {
                    pomodoroMinutes--;
                    pomodoroSeconds = 59;
                }
            } else {
                pomodoroSeconds--;
            }
            
            updatePomodoroDisplay();
        }, 1000);
    }
}

function pausePomodoro() {
    if (pomodoroRunning) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
    }
}

function resetPomodoro() {
    pausePomodoro();
    pomodoroSession = 'work';
    pomodoroMinutes = AppState.pomodoro.workDuration;
    pomodoroSeconds = 0;
    updatePomodoroDisplay();
}

function completePomodoro() {
    pausePomodoro();
    audioManager.playCompleteSound();
    
    if (pomodoroSession === 'work') {
        AppState.pomodoro.workSessionsCompleted++;
        localStorage.setItem('2n1_pomodoro_sessions', AppState.pomodoro.workSessionsCompleted);
        
        // Add points
        AppState.points += 5;
        petManager.addExp(5);
        updatePoints();
        
        if (AppState.pomodoro.workSessionsCompleted % AppState.pomodoro.sessionsBeforeLongBreak === 0) {
            pomodoroMinutes = AppState.pomodoro.longBreakDuration;
            showNotification('🎉 Nghỉ dài! Bạn xứng đáng được nghỉ ngơi!');
        } else {
            pomodoroMinutes = AppState.pomodoro.breakDuration;
        }
        pomodoroSession = 'break';
    } else {
        pomodoroMinutes = AppState.pomodoro.workDuration;
        pomodoroSession = 'work';
    }
    
    pomodoroSeconds = 0;
    updatePomodoroDisplay();
    
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = false;
}

// ================ SHOP FUNCTIONS ================
function openShop() {
    const modal = document.getElementById('shop-modal');
    const grid = document.getElementById('pets-grid');
    const shopPoints = document.getElementById('shop-points');
    
    if (!modal || !grid) return;
    
    if (shopPoints) shopPoints.textContent = AppState.points;
    
    grid.innerHTML = '';
    
    petManager.petTypes.forEach(pet => {
        const owned = AppState.pets.includes(pet.id);
        const current = AppState.currentPet === pet.id;
        
        const petElement = document.createElement('div');
        petElement.className = `pet-shop-item ${owned ? 'owned' : ''} ${current ? 'current' : ''}`;
        
        petElement.innerHTML = `
            <div class="pet-shop-image" style="font-size: 60px;">${pet.image}</div>
            <div class="pet-shop-name">${pet.name}</div>
            <div class="pet-shop-price">
                <i class="fas fa-star"></i> ${pet.price}
            </div>
            <button class="pet-shop-btn" data-id="${pet.id}">
                ${owned ? 'Đã sở hữu' : 'Mua'}
            </button>
        `;
        
        const btn = petElement.querySelector('button');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!owned) {
                if (petManager.buyPet(pet.id)) {
                    showNotification(`🎉 Bạn đã mua ${pet.name} thành công!`);
                    updatePoints();
                    openShop(); // Refresh shop
                    updatePetDisplay();
                } else {
                    showNotification('❌ Không đủ điểm!', 'error');
                }
            } else {
                // Nếu đã sở hữu, chọn làm thú cưng hiện tại
                petManager.selectPet(pet.id);
                updatePetDisplay();
                openShop(); // Refresh
                showNotification(`✅ Đã chọn ${pet.name} làm thú cưng!`);
            }
        });
        
        grid.appendChild(petElement);
    });
    
    modal.classList.add('active');
}

// ================ NOTIFICATION ================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        ${message}
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 'linear-gradient(135deg, #f44336, #d32f2f)'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ================ INITIALIZATION ================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Trang đã load, bắt đầu khởi tạo...');
    
    // Check login
    if (!AppState.user) {
        console.log('Chưa đăng nhập, chuyển về trang register');
        window.location.href = 'register.html';
        return;
    }
    
    // Display username
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = AppState.user.name;
    }
    
    // Initial render
    renderTasks();
    updateProgress();
    updatePoints();
    updatePetDisplay();
    
    // Thêm dữ liệu mẫu nếu chưa có thú cưng
    if (AppState.pets.length === 0) {
        console.log('Chưa có thú cưng, thêm dữ liệu mẫu để test');
        // Tạm thời cho một pet mẫu để test
        // AppState.pets.push(1);
        // AppState.currentPet = 1;
        // petManager.save();
        // updatePetDisplay();
    }
    
    // Sound controls
    document.querySelectorAll('.sound-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sound = btn.dataset.sound;
            
            document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            audioManager.playSound(sound);
            const currentSound = document.getElementById('current-sound');
            if (currentSound) {
                currentSound.textContent = btn.querySelector('span').textContent;
            }
        });
    });
    
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.value = AppState.sound.volume;
        volumeSlider.addEventListener('input', (e) => {
            audioManager.setVolume(e.target.value);
        });
    }
    
    const stopSoundBtn = document.getElementById('stop-sound');
    if (stopSoundBtn) {
        stopSoundBtn.addEventListener('click', () => {
            audioManager.stopSound();
            document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
            const currentSound = document.getElementById('current-sound');
            if (currentSound) currentSound.textContent = 'Không có';
        });
    }
    
    // Pet actions
    const feedBtn = document.getElementById('feed-pet');
    const playBtn = document.getElementById('play-pet');
    
    if (feedBtn) {
        feedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click nút Cho ăn');
            petManager.feedPet();
        });
    }
    
    if (playBtn) {
        playBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click nút Chơi');
            petManager.playWithPet();
        });
    }
    
    // Pomodoro controls
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (startBtn) startBtn.addEventListener('click', startPomodoro);
    if (pauseBtn) pauseBtn.addEventListener('click', pausePomodoro);
    if (resetBtn) resetBtn.addEventListener('click', resetPomodoro);
    
    // Add task
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            document.getElementById('task-modal').classList.add('active');
        });
    }
    
    const closeTask = document.getElementById('close-task');
    if (closeTask) {
        closeTask.addEventListener('click', () => {
            document.getElementById('task-modal').classList.remove('active');
        });
    }
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            taskManager.addTask({
                name: document.getElementById('task-name').value,
                time: document.getElementById('task-time').value,
                duration: document.getElementById('task-duration').value,
                priority: document.getElementById('task-priority').value
            });
            
            document.getElementById('task-modal').classList.remove('active');
            e.target.reset();
            showNotification('✅ Đã thêm nhiệm vụ mới!');
        });
    }
    
    // Shop
    const shopLink = document.querySelector('a[href="#shop"]');
    if (shopLink) {
        shopLink.addEventListener('click', (e) => {
            e.preventDefault();
            openShop();
        });
    }
    
    const closeShop = document.getElementById('close-shop');
    if (closeShop) {
        closeShop.addEventListener('click', () => {
            document.getElementById('shop-modal').classList.remove('active');
        });
    }
    
    // Floating button
    const fab = document.getElementById('fab');
    if (fab) {
        fab.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Decrease pet stats over time (every minute)
    setInterval(() => {
        petManager.decreaseStats();
    }, 60000);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            const addBtn = document.getElementById('add-task-btn');
            if (addBtn) addBtn.click();
        }
        
        // Space: Pause/Resume Pomodoro
        if (e.key === ' ' && !e.target.matches('input, textarea, button')) {
            e.preventDefault();
            if (pomodoroRunning) {
                pausePomodoro();
            } else {
                startPomodoro();
            }
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
    
    console.log('Khởi tạo hoàn tất!');
});
