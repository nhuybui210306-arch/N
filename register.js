// register.js - Xử lý đăng ký

// DOM Elements
const registerForm = document.getElementById('registerForm');
const fullname = document.getElementById('fullname');
const age = document.getElementById('age');
const email = document.getElementById('email');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const terms = document.getElementById('terms');
const registerBtn = document.getElementById('registerBtn');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Password strength elements
const strengthProgress = document.getElementById('strength-progress');
const strengthText = document.getElementById('strength-text');

// Toggle password visibility
togglePassword.addEventListener('click', function() {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

toggleConfirmPassword.addEventListener('click', function() {
    const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPassword.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Check password strength
function checkPasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 25;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 25;
    
    // Contains numbers
    if (/[0-9]/.test(password)) strength += 25;
    
    // Contains special characters
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
    
    return Math.min(strength, 100);
}

// Update password strength indicator
password.addEventListener('input', function() {
    const strength = checkPasswordStrength(this.value);
    strengthProgress.style.width = strength + '%';
    
    if (strength < 50) {
        strengthProgress.style.background = '#f44336';
        strengthText.textContent = 'Độ mạnh: Yếu';
        strengthText.style.color = '#f44336';
    } else if (strength < 75) {
        strengthProgress.style.background = '#ff9800';
        strengthText.textContent = 'Độ mạnh: Trung bình';
        strengthText.style.color = '#ff9800';
    } else {
        strengthProgress.style.background = '#4caf50';
        strengthText.textContent = 'Độ mạnh: Mạnh';
        strengthText.style.color = '#4caf50';
    }
});

// Validation functions
function validateFullname(name) {
    return name.trim().length >= 2;
}

function validateAge(age) {
    const ageNum = parseInt(age);
    return !isNaN(ageNum) && ageNum >= 1 && ageNum <= 120;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(password);
}

function validateConfirmPassword(password, confirm) {
    return password === confirm;
}

// Show error
function showError(elementId, show = true) {
    const group = document.getElementById(elementId + '-group');
    if (show) {
        group.classList.add('error');
    } else {
        group.classList.remove('error');
    }
}

// Save user to localStorage
function saveUser(userData) {
    // Get existing users or create new array
    let users = JSON.parse(localStorage.getItem('2n1_users')) || [];
    
    // Check if email already exists
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
        showError('email');
        document.getElementById('email-error').textContent = 'Email đã được đăng ký!';
        return false;
    }
    
    // Add new user
    users.push(userData);
    localStorage.setItem('2n1_users', JSON.stringify(users));
    
    // Set current user
    localStorage.setItem('2n1_current_user', JSON.stringify({
        name: userData.name,
        email: userData.email,
        age: userData.age,
        loggedIn: true,
        loginTime: new Date().toISOString()
    }));
    
    return true;
}

// Handle form submission
registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    let isValid = true;
    
    // Validate fullname
    if (!validateFullname(fullname.value)) {
        showError('name');
        isValid = false;
    } else {
        showError('name', false);
    }
    
    // Validate age
    if (!validateAge(age.value)) {
        showError('age');
        isValid = false;
    } else {
        showError('age', false);
    }
    
    // Validate email
    if (!validateEmail(email.value)) {
        showError('email');
        isValid = false;
    } else {
        showError('email', false);
    }
    
    // Validate password
    if (!validatePassword(password.value)) {
        showError('password');
        isValid = false;
    } else {
        showError('password', false);
    }
    
    // Validate confirm password
    if (!validateConfirmPassword(password.value, confirmPassword.value)) {
        showError('confirm');
        isValid = false;
    } else {
        showError('confirm', false);
    }
    
    // Validate terms
    if (!terms.checked) {
        alert('Vui lòng đồng ý với điều khoản dịch vụ!');
        isValid = false;
    }
    
    if (isValid) {
        // Disable button to prevent double submission
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        
        // Prepare user data
        const userData = {
            name: fullname.value.trim(),
            age: parseInt(age.value),
            email: email.value.trim().toLowerCase(),
            password: password.value, // Trong thực tế nên mã hóa mật khẩu
            registeredAt: new Date().toISOString()
        };
        
        // Save to localStorage
        if (saveUser(userData)) {
            // Show success message
            showSuccessMessage();
            
            // Redirect to homepage after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Đăng Ký';
        }
    }
});

// Show success message
function showSuccessMessage() {
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideInRight 0.5s ease-out;
        font-weight: 500;
    `;
    successDiv.innerHTML = `
        <i class="fas fa-check-circle" style="margin-right: 10px;"></i>
        Đăng ký thành công! Đang chuyển đến trang chủ...
    `;
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Check if already logged in
window.addEventListener('load', function() {
    const currentUser = localStorage.getItem('2n1_current_user');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        if (user.loggedIn) {
            // Already logged in, ask if want to continue
            if (confirm('Bạn đã đăng nhập với tài khoản ' + user.email + '. Bạn muốn đăng xuất không?')) {
                localStorage.removeItem('2n1_current_user');
            } else {
                window.location.href = 'index.html';
            }
        }
    }
});

// Add input event listeners for real-time validation
fullname.addEventListener('input', function() {
    if (validateFullname(this.value)) {
        showError('name', false);
    }
});

age.addEventListener('input', function() {
    if (validateAge(this.value)) {
        showError('age', false);
    }
});

email.addEventListener('input', function() {
    if (validateEmail(this.value)) {
        showError('email', false);
        document.getElementById('email-error').textContent = 'Vui lòng nhập email hợp lệ';
    }
});

password.addEventListener('input', function() {
    if (validatePassword(this.value)) {
        showError('password', false);
    }
});

confirmPassword.addEventListener('input', function() {
    if (validateConfirmPassword(password.value, this.value)) {
        showError('confirm', false);
    }
});

// Login link
document.getElementById('loginLink').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Tính năng đăng nhập sẽ được phát triển sau!');
});

// Social login
document.querySelectorAll('.social-icon').forEach(icon => {
    icon.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Đăng nhập qua ' + this.classList[1] + ' sẽ được tích hợp sau!');
    });
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}
