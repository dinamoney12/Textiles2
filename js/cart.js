/* ================================================
   DANURA TEXTILES - CART MANAGEMENT
   ================================================ */

class Cart {
    constructor() {
        this.items = [];
        this.storageKey = 'danura_cart';
        this.load();
    }

    // Load cart from localStorage
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.items = saved ? JSON.parse(saved) : [];
        } catch (e) {
            this.items = [];
        }
        this.updateUI();
    }

    // Save cart to localStorage
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        this.updateUI();
    }

    // Add item to cart
    add(product, quantity = 1) {
        const existingIndex = this.items.findIndex(item => item.id === product.id);
        
        if (existingIndex > -1) {
            this.items[existingIndex].quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name_en: product.name_en,
                name_si: product.name_si,
                name_ta: product.name_ta,
                price: product.sale_price || product.price,
                originalPrice: product.price,
                image: product.images?.[0] || 'https://via.placeholder.com/100',
                quantity: quantity
            });
        }
        
        this.save();
        showToast(t('added_to_cart'), 'success');
        this.animateCartIcon();
    }

    // Remove item from cart
    remove(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        showToast(t('removed_from_cart'), 'success');
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.remove(productId);
            } else {
                item.quantity = quantity;
                this.save();
            }
        }
    }

    // Get total items count
    getCount() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Get subtotal
    getSubtotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Clear cart
    clear() {
        this.items = [];
        this.save();
    }

    // Update UI elements
    updateUI() {
        // Update cart count badge
        const countEl = document.getElementById('cartCount');
        if (countEl) {
            const count = this.getCount();
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'flex' : 'none';
        }

        // Update cart sidebar
        this.renderCartSidebar();

        // Update checkout if open
        if (document.getElementById('checkoutModal')?.classList.contains('active')) {
            this.renderCheckoutSummary();
        }
    }

    // Render cart sidebar
    renderCartSidebar() {
        const cartItemsEl = document.getElementById('cartItems');
        const subtotalEl = document.getElementById('cartSubtotal');
        
        if (!cartItemsEl) return;

        if (this.items.length === 0) {
            cartItemsEl.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>${t('cart_empty')}</p>
                </div>
            `;
        } else {
            cartItemsEl.innerHTML = this.items.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image}" alt="${getLocalizedText(item)}" class="cart-item-image">
                    <div class="cart-item-info">
                        <h4 class="cart-item-name">${getLocalizedText(item)}</h4>
                        <p class="cart-item-price">LKR ${item.price.toLocaleString()}</p>
                        <div class="cart-item-quantity">
                            <button class="cart-qty-btn" onclick="cart.updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                            <span class="cart-item-qty">${item.quantity}</span>
                            <button class="cart-qty-btn" onclick="cart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" onclick="cart.remove('${item.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }

        if (subtotalEl) {
            subtotalEl.textContent = `LKR ${this.getSubtotal().toLocaleString()}`;
        }
    }

    // Render checkout summary
    renderCheckoutSummary() {
        const summaryItems = document.getElementById('summaryItems');
        const summarySubtotal = document.getElementById('summarySubtotal');
        
        if (summaryItems) {
            summaryItems.innerHTML = this.items.map(item => `
                <div class="summary-item">
                    <div class="summary-item-info">
                        <img src="${item.image}" alt="${getLocalizedText(item)}">
                        <div>
                            <p>${getLocalizedText(item)}</p>
                            <small>x${item.quantity}</small>
                        </div>
                    </div>
                    <span>LKR ${(item.price * item.quantity).toLocaleString()}</span>
                </div>
            `).join('');
        }

        if (summarySubtotal) {
            summarySubtotal.textContent = `LKR ${this.getSubtotal().toLocaleString()}`;
        }
    }

    // Animate cart icon
    animateCartIcon() {
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.classList.add('bounce');
            setTimeout(() => cartBtn.classList.remove('bounce'), 500);
        }
        
        const countEl = document.getElementById('cartCount');
        if (countEl) {
            countEl.classList.add('badge-pop');
            setTimeout(() => countEl.classList.remove('badge-pop'), 300);
        }
    }
}

// Initialize cart
const cart = new Cart();

// Cart sidebar controls
function openCart() {
    document.getElementById('cartSidebar')?.classList.add('active');
    document.getElementById('cartOverlay')?.classList.add('active');
    document.body.classList.add('no-scroll');
}

function closeCart() {
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.getElementById('cartOverlay')?.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const icon = toast.querySelector('.toast-icon');
    const msg = toast.querySelector('.toast-message');

    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    icon.className = `toast-icon ${icons[type] || icons.info}`;
    msg.textContent = message;
    
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export
window.cart = cart;
window.openCart = openCart;
window.closeCart = closeCart;
window.showToast = showToast;