// ================ STATE MANAGEMENT ================
const AppState = {
    user: JSON.parse(localStorage.getItem('2n1_current_user')) || null,
    tasks: JSON.parse(localStorage.getItem('2n1_tasks')) || [],
    points: parseInt(localStorage.getItem('2n1_points')) || 50,
    pets: JSON.parse(localStorage.getItem('2n1_pets')) || [],
    currentPet: JSON.parse(localStorage.getItem('2n1_current_pet')) || null,
    petStats: JSON.parse(localStorage.getItem('2n1_pet_stats')) || {
        happiness: 50,
        hunger: 100,
        exp: 0,
        level: 1,
        food: parseInt(localStorage.getItem('2n1_pet_food')) || 0  // Số thức ăn tích lũy
    },
    schedule: JSON.parse(localStorage.getItem('2n1_schedule')) || {},
    completedTasksCount: parseInt(localStorage.getItem('2n1_completed_tasks')) || 0,
    pomodoro: {
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        workSessionsCompleted: parseInt(localStorage.getItem('2n1_pomodoro_sessions')) || 0
    },
    currentDate: new Date()
};

// ================ AUDIO MANAGER với YouTube ================
class AudioManager {
    constructor() {
        this.player = null;
        this.currentSound = null;
        this.isPlaying = false;
        this.volume = AppState.sound?.volume || 50;
        this.videoIds = {
            'lofi-study': 'jfKfPfyJRdk',  // Lofi study
            'lofi-chill': '5qap5aO4i9A',  // Lofi chill
            'lofi-rain': 'y1f7WnOLoLo',   // Lofi rain
            'lofi-jazz': 'Dx5qFachd3A'    // Lofi jazz
        };
    }

    initPlayer() {
        if (!this.player) {
            this.player = new YT.Player('youtube-player', {
                height: '0',
                width: '0',
                playerVars: {
                    'autoplay': 0,
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'loop': 1,
                    'playlist': this.videoIds['lofi-study']
                }
            });
        }
    }

    playSound(type) {
        this.initPlayer();
        
        if (this.player && this.player.loadVideoById) {
            const videoId = this.videoIds[type];
            if (videoId) {
                this.player.loadVideoById(videoId);
                this.player.setVolume(this.volume);
                this.player.playVideo();
                this.currentSound = type;
                this.isPlaying = true;
                
                // Cập nhật UI
                document.querySelectorAll('.sound-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.sound === type) {
                        btn.classList.add('active');
                    }
                });
                
                const currentSoundEl = document.getElementById('current-sound');
                if (currentSoundEl) {
                    const btn = document.querySelector(`[data-sound="${type}"] span`);
                    currentSoundEl.textContent = btn ? btn.textContent : type;
                }
            }
        }
    }

    setVolume(value) {
        this.volume = value;
        if (this.player && this.player.setVolume) {
            this.player.setVolume(value);
        }
        localStorage.setItem('2n1_volume', value);
    }

    stopSound() {
        if (this.player && this.player.stopVideo) {
            this.player.stopVideo();
            this.isPlaying = false;
            this.currentSound = null;
            
            document.querySelectorAll('.sound-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const currentSoundEl = document.getElementById('current-sound');
            if (currentSoundEl) {
                currentSoundEl.textContent = 'Không có';
            }
        }
    }

    pauseSound() {
        if (this.player && this.player.pauseVideo) {
            this.player.pauseVideo();
            this.isPlaying = false;
        }
    }

    resumeSound() {
        if (this.player && this.player.playVideo) {
            this.player.playVideo();
            this.isPlaying = true;
        }
    }

    playCompleteSound() {
        // Tạo âm thanh đơn giản bằng Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 1);
        } catch (e) {
            console.log('Không thể phát âm thanh:', e);
        }
    }
}

// ================ PET MANAGER (CẬP NHẬT) ================
class PetManager {
    constructor() {
        this.petTypes = [
            { id: 1, name: 'Mèo Con', price: 100, emoji: '🐱', happiness: 50, hunger: 100, foodNeeded: 3 },
            { id: 2, name: 'Cún Con', price: 150, emoji: '🐶', happiness: 60, hunger: 80, foodNeeded: 3 },
            { id: 3, name: 'Thỏ Trắng', price: 120, emoji: '🐰', happiness: 70, hunger: 70, foodNeeded: 2 },
            { id: 4, name: 'Gấu Trúc', price: 200, emoji: '🐼', happiness: 80, hunger: 90, foodNeeded: 4 },
            { id: 5, name: 'Rồng Nhỏ', price: 500, emoji: '🐲', happiness: 100, hunger: 60, foodNeeded: 5 },
            { id: 6, name: 'Kỳ Lân', price: 300, emoji: '🦄', happiness: 90, hunger: 70, foodNeeded: 4 }
        ];
        
        console.log('PetManager khởi tạo với các loại:', this.petTypes);
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
            showNotification(`🎉 Bạn đã mua ${pet.name} thành công!`);
            return true;
        }
        showNotification('❌ Không đủ điểm!', 'error');
        return false;
    }

    selectPet(petId) {
        AppState.currentPet = petId;
        this.save();
        showNotification(`✅ Đã chọn ${this.getCurrentPet()?.name} làm thú cưng!`);
    }

    getCurrentPet() {
        return this.petTypes.find(p => p.id === AppState.currentPet);
    }

    // Thêm thức ăn khi hoàn thành nhiệm vụ
    addFoodFromTask() {
        if (!AppState.currentPet) return;
        
        AppState.petStats.food = (AppState.petStats.food || 0) + 1;
        this.save();
        this.updateFoodDisplay();
        
        // Kiểm tra nếu đủ thức ăn để cho pet ăn
        const currentPet = this.getCurrentPet();
        if (currentPet && AppState.petStats.food >= currentPet.foodNeeded) {
            this.autoFeedPet();
        }
    }

    // Tự động cho ăn khi đủ thức ăn
    autoFeedPet() {
        const currentPet = this.getCurrentPet();
        if (!currentPet) return;
        
        if (AppState.petStats.food >= currentPet.foodNeeded) {
            AppState.petStats.food -= currentPet.foodNeeded;
            AppState.petStats.hunger = Math.min(100, (AppState.petStats.hunger || 100) + 30);
            AppState.petStats.happiness = Math.min(100, (AppState.petStats.happiness || 50) + 10);
            
            this.save();
            this.updateFoodDisplay();
            showNotification(`🍖 ${currentPet.name} đã được cho ăn!`);
            
            // Animation cho pet
            this.animatePet();
        }
    }

    // Cho ăn thủ công (dùng nút)
    feedPet() {
        const currentPet = this.getCurrentPet();
        if (!currentPet) {
            showNotification('❌ Bạn chưa có thú cưng!', 'error');
            return false;
        }
        
        if (AppState.petStats.food > 0) {
            AppState.petStats.food--;
            AppState.petStats.hunger = Math.min(100, (AppState.petStats.hunger || 100) + 20);
            AppState.petStats.happiness = Math.min(100, (AppState.petStats.happiness || 50) + 5);
            
            this.save();
            this.updateFoodDisplay();
            showNotification(`🍖 Đã cho ${currentPet.name} ăn!`);
            this.animatePet();
            return true;
        } else {
            showNotification('❌ Hết thức ăn! Hoàn thành nhiệm vụ để nhận thức ăn.', 'error');
            return false;
        }
    }

    // Chơi với pet
    playWithPet() {
        const currentPet = this.getCurrentPet();
        if (!currentPet) {
            showNotification('❌ Bạn chưa có thú cưng!', 'error');
            return false;
        }
        
        if (AppState.petStats.hunger > 20) {
            AppState.petStats.happiness = Math.min(100, (AppState.petStats.happiness || 50) + 15);
            AppState.petStats.hunger = Math.max(0, (AppState.petStats.hunger || 100) - 10);
            
            this.save();
            showNotification(`🎮 Đã chơi với ${currentPet.name}!`);
            this.animatePet();
            return true;
        } else {
            showNotification('❌ Thú cưng đói quá! Hãy cho ăn trước.', 'error');
            return false;
        }
    }

    // Thêm kinh nghiệm
    addExp(amount) {
        if (!AppState.currentPet) return;
        
        AppState.petStats.exp = (AppState.petStats.exp || 0) + amount;
        
        // Level up
        const expNeeded = (AppState.petStats.level || 1) * 100;
        if (AppState.petStats.exp >= expNeeded) {
            AppState.petStats.level = (AppState.petStats.level || 1) + 1;
            AppState.petStats.exp -= expNeeded;
            showNotification(`🎉 ${this.getCurrentPet()?.name} đã lên cấp ${AppState.petStats.level}!`);
        }
        
        this.save();
    }

    // Giảm chỉ số theo thời gian
    decreaseStats() {
        if (!AppState.currentPet) return;
        
        AppState.petStats.happiness = Math.max(0, (AppState.petStats.happiness || 50) - 1);
        AppState.petStats.hunger = Math.max(0, (AppState.petStats.hunger || 100) - 2);
        
        this.save();
    }

    // Animation cho pet
    animatePet() {
        const petImage = document.getElementById('pet-image');
        if (petImage) {
            petImage.style.transform = 'scale(1.2)';
            setTimeout(() => {
                petImage.style.transform = 'scale(1)';
            }, 300);
        }
    }

    // Cập nhật hiển thị thức ăn
    updateFoodDisplay() {
        const foodCount = document.getElementById('food-count');
        const foodProgressBar = document.getElementById('food-progress-bar');
        const currentPet = this.getCurrentPet();
        
        if (foodCount) {
            foodCount.textContent = AppState.petStats.food || 0;
        }
        
        if (foodProgressBar && currentPet) {
            const percent = ((AppState.petStats.food || 0) / currentPet.foodNeeded) * 100;
            foodProgressBar.style.width = `${Math.min(percent, 100)}%`;
        }
    }

    save() {
        localStorage.setItem('2n1_points', AppState.points.toString());
        localStorage.setItem('2n1_pets', JSON.stringify(AppState.pets));
        localStorage.setItem('2n1_current_pet', JSON.stringify(AppState.currentPet));
        localStorage.setItem('2n1_pet_stats', JSON.stringify(AppState.petStats));
        localStorage.setItem('2n1_pet_food', (AppState.petStats.food || 0).toString());
    }
}

// ================ TASK MANAGER (CẬP NHẬT) ================
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
            
            // Tổng số nhiệm vụ đã hoàn thành
            AppState.completedTasksCount = (AppState.completedTasksCount || 0) + 1;
            localStorage.setItem('2n1_completed_tasks', AppState.completedTasksCount);
            
            // Thêm điểm
            AppState.points += task.points || 10;
            
            // Thêm kinh nghiệm cho pet
            if (AppState.currentPet) {
                petManager.addExp(task.points || 10);
            }
            
            // THÊM THỨC ĂN CHO PET (quan trọng)
            if (AppState.currentPet) {
                petManager.addFoodFromTask();
            }
            
            // Play sound
            audioManager.playCompleteSound();
            
            this.save();
            updatePoints();
            updateProgress();
            
            // Cập nhật hiển thị thức ăn
            if (petManager) {
                petManager.updateFoodDisplay();
            }
            
            return true;
        }
        return false;
    }

    calculatePoints(duration) {
        const minutes = parseInt(duration) || 30;
        return Math.floor(minutes / 5);
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

// ================ SCHEDULE MANAGER (CẬP NHẬT) ================
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

    renderSchedule() {
        const container = document.getElementById('week-schedule');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.days.forEach((day, index) => {
            const daySchedule = AppState.schedule[day] || [];
            
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            dayCard.innerHTML = `
                <div class="day-name">${day}</div>
                <div class="day-schedule-inputs" id="schedule-${index}">
                    ${daySchedule.map((item, i) => `
                        <div class="schedule-item">
                            <input type="text" class="schedule-subject" 
                                   value="${item.subject || ''}" 
                                   placeholder="Môn học" 
                                   data-day="${day}" 
                                   data-index="${i}"
                                   data-field="subject">
                            <input type="time" class="schedule-time" 
                                   value="${item.time || ''}" 
                                   data-day="${day}" 
                                   data-index="${i}"
                                   data-field="time">
                            <input type="text" class="schedule-room" 
                                   value="${item.room || ''}" 
                                   placeholder="Tòa/P. học" 
                                   data-day="${day}" 
                                   data-index="${i}"
                                   data-field="room">
                        </div>
                    `).join('')}
                    <button class="add-schedule-item" data-day="${day}">
                        <i class="fas fa-plus"></i> Thêm môn
                    </button>
                </div>
            `;
            
            container.appendChild(dayCard);
            
            // Add input listeners
            dayCard.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', (e) => {
                    this.handleScheduleInput(day, e.target);
                });
            });
            
            // Add button listener
            dayCard.querySelector('.add-schedule-item').addEventListener('click', (e) => {
                e.preventDefault();
                this.addScheduleItem(day);
            });
        });
    }

    handleScheduleInput(day, input) {
        const index = parseInt(input.dataset.index);
        const field = input.dataset.field;
        const value = input.value.trim();
        
        if (!AppState.schedule[day]) {
            AppState.schedule[day] = [];
        }
        
        if (!AppState.schedule[day][index]) {
            AppState.schedule[day][index] = { subject: '', time: '', room: '' };
        }
        
        AppState.schedule[day][index][field] = value;
        this.save();
    }

    addScheduleItem(day) {
        if (!AppState.schedule[day]) {
            AppState.schedule[day] = [];
        }
        
        AppState.schedule[day].push({ subject: '', time: '', room: '' });
        this.save();
        this.renderSchedule();
    }

    save() {
        localStorage.setItem('2n1_schedule', JSON.stringify(AppState.schedule));
    }
}

// Khởi tạo các manager
const audioManager = new AudioManager();
const petManager = new PetManager();
const taskManager = new TaskManager();
const scheduleManager = new ScheduleManager();

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
}

function updatePetDisplay() {
    if (!AppState.currentPet) {
        document.getElementById('pet-name').textContent = 'Chưa có thú cưng';
        document.getElementById('pet-level').textContent = 'Cấp 0';
        document.getElementById('pet-happiness').style.width = '0%';
        document.getElementById('pet-hunger').style.width = '0%';
        document.getElementById('pet-exp').style.width = '0%';
        document.getElementById('happiness-value').textContent = '0%';
        document.getElementById('hunger-value').textContent = '0%';
        document.getElementById('exp-value').textContent = '0/0';
        return;
    }
    
    const pet = petManager.getCurrentPet();
    if (pet) {
        document.getElementById('pet-image').textContent = pet.emoji;
        document.getElementById('pet-name').textContent = pet.name;
        document.getElementById('pet-level').textContent = `Cấp ${AppState.petStats.level || 1}`;
        
        const happiness = AppState.petStats.happiness || 50;
        const hunger = AppState.petStats.hunger || 100;
        const exp = AppState.petStats.exp || 0;
        const expNeeded = (AppState.petStats.level || 1) * 100;
        
        document.getElementById('pet-happiness').style.width = `${happiness}%`;
        document.getElementById('pet-hunger').style.width = `${hunger}%`;
        document.getElementById('pet-exp').style.width = `${(exp / expNeeded) * 100}%`;
        
        document.getElementById('happiness-value').textContent = `${happiness}%`;
        document.getElementById('hunger-value').textContent = `${hunger}%`;
        document.getElementById('exp-value').textContent = `${exp}/${expNeeded}`;
        
        // Cập nhật thức ăn
        petManager.updateFoodDisplay();
        
        // Cập nhật message
        const petMessage = document.getElementById('pet-message');
        if (petMessage) {
            if (hunger < 30) {
                petMessage.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f44336;"></i> Thú cưng đang đói! Hãy cho ăn!';
            } else if (happiness < 30) {
                petMessage.innerHTML = '<i class="fas fa-frown" style="color: #ff9800;"></i> Thú cưng đang buồn! Hãy chơi với nó!';
            } else {
                petMessage.innerHTML = '<i class="fas fa-smile" style="color: #4CAF50;"></i> Thú cưng đang vui vẻ!';
            }
        }
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
    
    if (display) {
        display.textContent = `${pomodoroMinutes.toString().padStart(2, '0')}:${pomodoroSeconds.toString().padStart(2, '0')}`;
    }
    
    if (sessionType) {
        sessionType.textContent = pomodoroSession === 'work' ? '🎯 Tập trung' : '☕ Nghỉ ngơi';
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
        
        AppState.points += 5;
        
        if (AppState.currentPet) {
            petManager.addExp(5);
        }
        
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
    
    if (!modal || !grid) return;
    
    document.getElementById('shop-points').textContent = AppState.points;
    grid.innerHTML = '';
    
    petManager.petTypes.forEach(pet => {
        const owned = AppState.pets.includes(pet.id);
        const current = AppState.currentPet === pet.id;
        
        const petElement = document.createElement('div');
        petElement.className = `pet-shop-item ${owned ? 'owned' : ''} ${current ? 'current' : ''}`;
        
        petElement.innerHTML = `
            <div class="pet-shop-emoji">${pet.emoji}</div>
            <div class="pet-shop-name">${pet.name}</div>
            <div class="pet-shop-price">
                <i class="fas fa-star"></i> ${pet.price}
            </div>
            <div class="pet-shop-food">Cần ${pet.foodNeeded} thức ăn/lần</div>
            <button class="pet-shop-btn" data-id="${pet.id}">
                ${owned ? (current ? 'Đang dùng' : 'Chọn') : 'Mua'}
            </button>
        `;
        
        const btn = petElement.querySelector('button');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!owned) {
                petManager.buyPet(pet.id);
                updatePoints();
                openShop();
                updatePetDisplay();
            } else if (!current) {
                petManager.selectPet(pet.id);
                openShop();
                updatePetDisplay();
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
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ================ YOUTUBE API READY ================
function onYouTubeIframeAPIReady() {
    console.log('YouTube API sẵn sàng');
    audioManager.initPlayer();
}

// ================ INITIALIZATION ================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Trang đã load, bắt đầu khởi tạo...');
    
    if (!AppState.user) {
        window.location.href = 'register.html';
        return;
    }
    
    document.getElementById('username').textContent = AppState.user.name;
    
    // Hiển thị ngày hiện tại
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerHTML = `<i class="fas fa-calendar-alt"></i> ${today.toLocaleDateString('vi-VN', options)}`;
    
    renderTasks();
    updateProgress();
    updatePoints();
    updatePetDisplay();
    scheduleManager.renderSchedule();
    
    // Sound controls
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audioManager.setVolume(e.target.value);
        });
    }
    
    document.getElementById('stop-sound').addEventListener('click', () => {
        audioManager.stopSound();
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
    
    // Giảm chỉ số pet mỗi phút
    setInterval(() => {
        if (AppState.currentPet) {
            petManager.decreaseStats();
            updatePetDisplay();
        }
    }, 60000);
    
    console.log('Khởi tạo hoàn tất!');
});
