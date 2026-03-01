// ================ STATE MANAGEMENT ================
const AppState = {
    user: JSON.parse(localStorage.getItem('2n1_current_user')) || null,
    tasks: JSON.parse(localStorage.getItem('2n1_tasks')) || [],
    points: parseInt(localStorage.getItem('2n1_points')) || 0,
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
            { id: 1, name: 'Mèo Con', price: 100, image: 'cat.png', happiness: 50, hunger: 100 },
            { id: 2, name: 'Cún Con', price: 150, image: 'dog.png', happiness: 60, hunger: 80 },
            { id: 3, name: 'Thỏ Trắng', price: 120, image: 'rabbit.png', happiness: 70, hunger: 70 },
            { id: 4, name: 'Gấu Trúc', price: 200, image: 'panda.png', happiness: 80, hunger: 90 },
            { id: 5, name: 'Rồng Nhỏ', price: 500, image: 'dragon.png', happiness: 100, hunger: 60 },
            { id: 6, name: 'Kỳ Lân', price: 300, image: 'unicorn.png', happiness: 90, hunger: 70 }
        ];
    }

    getAvailablePets() {
        return this.petTypes.filter(pet => !AppState.pets.includes(pet.id));
    }

    buyPet(petId) {
        const pet = this.petTypes.find(p => p.id === petId);
        if (!pet) return false;
        
        if (AppState.points >= pet.price) {
            AppState.points -= pet.price;
            AppState.pets.push(petId);
            
            if (!AppState.currentPet) {
                this.selectPet(petId);
            }
            
            this.save();
            return true;
        }
        return false;
    }

    selectPet(petId) {
        AppState.currentPet = petId;
        this.save();
    }

    feedPet() {
        if (AppState.currentPet) {
            AppState.petStats.hunger = Math.min(100, AppState.petStats.hunger + 20);
            AppState.petStats.happiness += 5;
            this.save();
        }
    }

    playWithPet() {
        if (AppState.currentPet) {
            AppState.petStats.happiness = Math.min(100, AppState.petStats.happiness + 15);
            AppState.petStats.hunger = Math.max(0, AppState.petStats.hunger - 10);
            this.save();
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
                showNotification(`Thú cưng của bạn đã lên cấp ${AppState.petStats.level}! 🎉`);
            }
            
            this.save();
        }
    }

    decreaseStats() {
        if (AppState.currentPet) {
            AppState.petStats.happiness = Math.max(0, AppState.petStats.happiness - 1);
            AppState.petStats.hunger = Math.max(0, AppState.petStats.hunger - 1);
            this.save();
        }
    }

    save() {
        localStorage.setItem('2n1_points', AppState.points);
        localStorage.setItem('2n1_pets', JSON.stringify(AppState.pets));
        localStorage.setItem('2n1_current_pet', JSON.stringify(AppState.currentPet));
        localStorage.setItem('2n1_pet_stats', JSON.stringify(AppState.petStats));
        updatePetDisplay();
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

// ================ SCHEDULE MANAGER ================
class ScheduleManager {
    constructor() {
        this.days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    }

    saveDay(day, schedule) {
        if (!AppState.schedule[day]) {
            AppState.schedule[day] = [];
        }
        AppState.schedule[day] = schedule;
        localStorage.setItem('2n1_schedule', JSON.stringify(AppState.schedule));
    }

    getTotalStudyTime() {
        let total = 0;
        Object.values(AppState.schedule).forEach(day => {
            day.forEach(task => {
                total += parseInt(task.duration) || 0;
            });
        });
        return total;
    }

    renderSchedule() {
        const container = document.getElementById('week-schedule');
        container.innerHTML = '';
        
        this.days.forEach((day, index) => {
            const daySchedule = AppState.schedule[day] || [];
            const totalTime = daySchedule.reduce((sum, task) => sum + (parseInt(task.duration) || 0), 0);
            
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.innerHTML = `
                <div class="day-name">${day}</div>
                <div class="day-tasks">${daySchedule.length} môn</div>
                <div class="day-study-time">${totalTime} phút</div>
                <div class="day-schedule-inputs" id="schedule-${index}">
                    ${daySchedule.map((task, i) => `
                        <input type="text" class="day-schedule-input" 
                               value="${task.name}" 
                               placeholder="Môn học" 
                               data-day="${day}" 
                               data-index="${i}">
                    `).join('')}
                    <input type="text" class="day-schedule-input" 
                           placeholder="+ Thêm môn học" 
                           data-day="${day}" 
                           data-new="true">
                </div>
            `;
            
            container.appendChild(dayCard);
            
            // Add input listeners
            dayCard.querySelectorAll('.day-schedule-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    this.handleScheduleInput(day, e.target);
                });
            });
        });
    }

    handleScheduleInput(day, input) {
        const index = input.dataset.index;
        const value = input.value.trim();
        
        if (!AppState.schedule[day]) {
            AppState.schedule[day] = [];
        }
        
        if (input.dataset.new) {
            // Add new task
            if (value) {
                AppState.schedule[day].push({
                    name: value,
                    duration: 60 // Default 60 minutes
                });
            }
        } else if (index !== undefined) {
            // Update existing task
            if (value) {
                AppState.schedule[day][index].name = value;
            } else {
                // Remove if empty
                AppState.schedule[day].splice(index, 1);
            }
        }
        
        this.save();
        this.renderSchedule();
    }

    save() {
        localStorage.setItem('2n1_schedule', JSON.stringify(AppState.schedule));
    }
}

const scheduleManager = new ScheduleManager();

// ================ RENDERING FUNCTIONS ================
function renderTasks() {
    const container = document.getElementById('time-slots-container');
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
    
    progressBar.style.width = `${progress.percent}%`;
    progressPercent.textContent = `${progress.percent}%`;
    completedCount.textContent = progress.completed;
    totalCount.textContent = progress.total;
}

function updatePoints() {
    const pointsDisplay = document.getElementById('user-points');
    const shopPoints = document.getElementById('shop-points');
    
    pointsDisplay.textContent = AppState.points;
    if (shopPoints) shopPoints.textContent = AppState.points;
}

function updatePetDisplay() {
    if (!AppState.currentPet) {
        document.getElementById('pet-name').textContent = 'Chưa có thú cưng';
        return;
    }
    
    const pet = petManager.petTypes.find(p => p.id === AppState.currentPet);
    if (pet) {
        document.getElementById('pet-name').textContent = pet.name;
        document.getElementById('pet-level').textContent = `Cấp ${AppState.petStats.level}`;
        document.getElementById('pet-happiness').style.width = `${AppState.petStats.happiness}%`;
        document.getElementById('pet-hunger').style.width = `${AppState.petStats.hunger}%`;
        
        const expNeeded = AppState.petStats.level * 100;
        const expPercent = (AppState.petStats.exp / expNeeded) * 100;
        document.getElementById('pet-exp').style.width = `${expPercent}%`;
        
        document.getElementById('happiness-value').textContent = `${AppState.petStats.happiness}%`;
        document.getElementById('hunger-value').textContent = `${AppState.petStats.hunger}%`;
        document.getElementById('exp-value').textContent = `${AppState.petStats.exp}/${expNeeded}`;
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
    
    display.textContent = `${pomodoroMinutes.toString().padStart(2, '0')}:${pomodoroSeconds.toString().padStart(2, '0')}`;
    
    // Update progress ring
    const totalSeconds = pomodoroSession === 'work' 
        ? AppState.pomodoro.workDuration * 60 
        : AppState.pomodoro.breakDuration * 60;
    const currentSeconds = pomodoroMinutes * 60 + pomodoroSeconds;
    const progress = (totalSeconds - currentSeconds) / totalSeconds;
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * progress;
    progressRing.style.strokeDashoffset = offset;
    
    // Update session type text
    if (pomodoroSession === 'work') {
        sessionType.textContent = '🎯 Đang tập trung';
    } else {
        sessionType.textContent = '☕ Đang nghỉ';
    }
}

function startPomodoro() {
    if (!pomodoroRunning) {
        pomodoroRunning = true;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        
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
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
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
    document.getElementById('start-btn').disabled = false;
}

// ================ SHOP FUNCTIONS ================
function openShop() {
    const modal = document.getElementById('shop-modal');
    const grid = document.getElementById('pets-grid');
    
    grid.innerHTML = '';
    
    petManager.petTypes.forEach(pet => {
        const owned = AppState.pets.includes(pet.id);
        const current = AppState.currentPet === pet.id;
        
        const petElement = document.createElement('div');
        petElement.className = `pet-shop-item ${owned ? 'owned' : ''} ${current ? 'current' : ''}`;
        
        petElement.innerHTML = `
            <img src="assets/pets/${pet.image}" alt="${pet.name}" class="pet-shop-image">
            <div class="pet-shop-name">${pet.name}</div>
            <div class="pet-shop-price">
                <i class="fas fa-star"></i> ${pet.price}
            </div>
            <button class="pet-shop-btn" ${owned ? 'disabled' : ''} data-id="${pet.id}">
                ${owned ? 'Đã sở hữu' : 'Mua'}
            </button>
            ${!owned && current ? '<span class="current-badge">Đang sử dụng</span>' : ''}
        `;
        
        petElement.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!owned) {
                if (petManager.buyPet(pet.id)) {
                    showNotification(`🎉 Bạn đã mua ${pet.name} thành công!`);
                    updatePoints();
                    openShop(); // Refresh shop
                } else {
                    showNotification('❌ Không đủ điểm!', 'error');
                }
            }
        });
        
        petElement.addEventListener('click', () => {
            if (owned) {
                petManager.selectPet(pet.id);
                updatePetDisplay();
                openShop(); // Refresh to show current badge
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
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ================ EVENT LISTENERS ================
document.addEventListener('DOMContentLoaded', () => {
    // Check login
    if (!AppState.user) {
        window.location.href = 'register.html';
        return;
    }
    
    // Display username
    document.getElementById('username').textContent = AppState.user.name;
    
    // Initial render
    renderTasks();
    updateProgress();
    updatePoints();
    updatePetDisplay();
    scheduleManager.renderSchedule();
    
    // Sound controls
    document.querySelectorAll('.sound-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sound = btn.dataset.sound;
            
            document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            audioManager.playSound(sound);
            document.getElementById('current-sound').textContent = btn.querySelector('span').textContent;
        });
    });
    
    document.getElementById('volume-slider').addEventListener('input', (e) => {
        audioManager.setVolume(e.target.value);
    });
    
    document.getElementById('stop-sound').addEventListener('click', () => {
        audioManager.stopSound();
        document.querySelectorAll('.sound-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('current-sound').textContent = 'Không có';
    });
    
    // Pet actions
    document.getElementById('feed-pet').addEventListener('click', () => {
        petManager.feedPet();
        updatePetDisplay();
    });
    
    document.getElementById('play-pet').addEventListener('click', () => {
        petManager.playWithPet();
        updatePetDisplay();
    });
    
    // Pomodoro controls
    document.getElementById('start-btn').addEventListener('click', startPomodoro);
    document.getElementById('pause-btn').addEventListener('click', pausePomodoro);
    document.getElementById('reset-btn').addEventListener('click', resetPomodoro);
    
    // Add task
    document.getElementById('add-task-btn').addEventListener('click', () => {
        document.getElementById('task-modal').classList.add('active');
    });
    
    document.getElementById('close-task').addEventListener('click', () => {
        document.getElementById('task-modal').classList.remove('active');
    });
    
    document.getElementById('task-form').addEventListener('submit', (e) => {
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
    
    // Shop
    document.querySelector('a[href="#shop"]').addEventListener('click', (e) => {
        e.preventDefault();
        openShop();
    });
    
    document.getElementById('close-shop').addEventListener('click', () => {
        document.getElementById('shop-modal').classList.remove('active');
    });
    
    // Save schedule
    document.getElementById('save-schedule-btn').addEventListener('click', () => {
        scheduleManager.save();
        showNotification('📚 Đã lưu lịch học!');
    });
    
    // Floating button
    document.getElementById('fab').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Decrease pet stats over time
    setInterval(() => {
        petManager.decreaseStats();
        updatePetDisplay();
    }, 60000); // Every minute
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            document.getElementById('add-task-btn').click();
        }
        
        // Space: Pause/Resume Pomodoro
        if (e.key === ' ' && !e.target.matches('input, textarea')) {
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
});
