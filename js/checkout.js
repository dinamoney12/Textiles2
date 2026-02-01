/* ================================================
   DANURA TEXTILES - CHECKOUT MANAGEMENT
   ================================================ */

class Checkout {
    constructor() {
        this.currentStep = 1;
        this.deliveryData = {};
        this.selectedPaymentMethod = null;
        this.deliveryCharge = 0;
        this.deliveryCharges = [];
        this.paymentMethods = [];
    }

    // Initialize checkout
    async init() {
        try {
            // Load delivery charges
            this.deliveryCharges = await db.getDeliveryCharges();
            this.populateDistricts();

            // Load payment methods
            this.paymentMethods = await db.getPaymentMethods();
            this.renderPaymentMethods();

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Checkout init error:', error);
            showToast(t('error_occurred'), 'error');
        }
    }

    // Populate districts dropdown
    populateDistricts() {
        const select = document.getElementById('customerDistrict');
        if (!select) return;

        const districts = [...new Set(this.deliveryCharges.map(d => d.district))];
        
        select.innerHTML = `<option value="">${t('form_district')}</option>` +
            districts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    // Render payment methods
    renderPaymentMethods() {
        const container = document.getElementById('paymentMethods');
        if (!container) return;

        container.innerHTML = this.paymentMethods.map(method => `
            <label class="payment-method-item" data-method-id="${method.id}">
                <input type="radio" name="paymentMethod" value="${method.type}">
                <div class="payment-method-icon">
                    <i class="${this.getPaymentIcon(method.type)}"></i>
                </div>
                <div class="payment-method-info">
                    <h4>${method.name}</h4>
                    <p>${method.details?.description || ''}</p>
                </div>
            </label>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.payment-method-item').forEach(item => {
            item.addEventListener('click', () => {
                container.querySelectorAll('.payment-method-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                item.querySelector('input').checked = true;
                
                const methodId = item.dataset.methodId;
                this.selectedPaymentMethod = this.paymentMethods.find(m => m.id === methodId);
                this.showPaymentDetails();
            });
        });
    }

    // Get payment icon
    getPaymentIcon(type) {
        const icons = {
            card: 'fas fa-credit-card',
            bank: 'fas fa-university',
            koko: 'fas fa-wallet',
            cod: 'fas fa-money-bill-wave'
        };
        return icons[type] || 'fas fa-money-check';
    }

    // Show payment details
    showPaymentDetails() {
        const container = document.getElementById('paymentDetails');
        if (!container || !this.selectedPaymentMethod) return;

        const details = this.selectedPaymentMethod.details;
        let html = '';

        switch (this.selectedPaymentMethod.type) {
            case 'bank':
                html = `
                    <div class="bank-details">
                        <h4>Bank Transfer Details</h4>
                        <p><strong>Bank:</strong> ${details.bank_name || 'N/A'}</p>
                        <p><strong>Account Name:</strong> ${details.account_name || 'N/A'}</p>
                        <p><strong>Account Number:</strong> ${details.account_number || 'N/A'}</p>
                        <p><strong>Branch:</strong> ${details.branch || 'N/A'}</p>
                        <p class="note"><i class="fas fa-info-circle"></i> Please send payment receipt via WhatsApp after transfer.</p>
                    </div>
                `;
                break;
            case 'koko':
                html = `
                    <div class="koko-details">
                        <h4>Koko Pay</h4>
                        <p>${details.description || 'Pay in 3 easy installments with Koko'}</p>
                        <p class="note"><i class="fas fa-info-circle"></i> You will receive Koko payment link via SMS after order confirmation.</p>
                    </div>
                `;
                break;
            case 'card':
                html = `
                    <div class="card-details">
                        <h4>Card Payment</h4>
                        <p>${details.description || 'Pay securely with Visa/Mastercard'}</p>
                        <p class="note"><i class="fas fa-info-circle"></i> You will be redirected to secure payment gateway.</p>
                    </div>
                `;
                break;
            case 'cod':
                html = `
                    <div class="cod-details">
                        <h4>Cash on Delivery</h4>
                        <p>${details.description || 'Pay when you receive your order'}</p>
                        <p class="note"><i class="fas fa-info-circle"></i> Please have exact amount ready.</p>
                    </div>
                `;
                break;
        }

        container.innerHTML = html;
        container.style.display = html ? 'block' : 'none';
    }

    // Setup event listeners
    setupEventListeners() {
        // District change - update delivery charge
        const districtSelect = document.getElementById('customerDistrict');
        if (districtSelect) {
            districtSelect.addEventListener('change', async (e) => {
                const district = e.target.value;
                if (district) {
                    this.deliveryCharge = await db.getDeliveryCharge(district);
                    document.getElementById('deliveryChargeAmount').textContent = 
                        `LKR ${this.deliveryCharge.toLocaleString()}`;
                }
            });
        }

        // Delivery form submission
        const deliveryForm = document.getElementById('deliveryForm');
        if (deliveryForm) {
            deliveryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleDeliverySubmit();
            });
        }

        // Back to delivery
        document.getElementById('backToDelivery')?.addEventListener('click', () => {
            this.goToStep(1);
        });

        // Continue to confirm
        document.getElementById('continueToConfirm')?.addEventListener('click', () => {
            if (!this.selectedPaymentMethod) {
                showToast(t('select_payment'), 'warning');
                return;
            }
            this.goToStep(3);
            this.renderOrderConfirmation();
        });

        // Back to payment
        document.getElementById('backToPayment')?.addEventListener('click', () => {
            this.goToStep(2);
        });

        // Place order
        document.getElementById('placeOrderBtn')?.addEventListener('click', () => {
            this.placeOrder();
        });

        // Continue shopping
        document.getElementById('continueShopping')?.addEventListener('click', () => {
            closeCheckout();
            cart.clear();
        });
    }

    // Handle delivery form submission
    handleDeliverySubmit() {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const district = document.getElementById('customerDistrict').value;
        const city = document.getElementById('customerCity').value.trim();
        const address = document.getElementById('customerAddress').value.trim();

        // Validation
        if (!name || !phone || !district || !address) {
            showToast(t('fill_required'), 'warning');
            return;
        }

        // Phone validation (Sri Lankan format)
        const phoneRegex = /^(?:0|94|\+94)?(?:7\d{8})$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            showToast(t('invalid_phone'), 'warning');
            return;
        }

        this.deliveryData = { name, phone, district, city, address };
        this.goToStep(2);
    }

    // Go to step
    goToStep(step) {
        this.currentStep = step;

        // Update step indicators
        document.querySelectorAll('.checkout-steps .step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            if (index + 1 < step) {
                el.classList.add('completed');
            } else if (index + 1 === step) {
                el.classList.add('active');
            }
        });

        // Show/hide step content
        document.getElementById('step1Content').style.display = step === 1 ? 'block' : 'none';
        document.getElementById('step2Content').style.display = step === 2 ? 'block' : 'none';
        document.getElementById('step3Content').style.display = step === 3 ? 'block' : 'none';
        document.getElementById('orderSuccess').style.display = 'none';
    }

    // Render order confirmation
    renderOrderConfirmation() {
        cart.renderCheckoutSummary();

        // Update delivery summary
        const deliveryDetails = document.getElementById('summaryDeliveryDetails');
        if (deliveryDetails) {
            deliveryDetails.innerHTML = `
                <strong>${this.deliveryData.name}</strong><br>
                ${this.deliveryData.phone}<br>
                ${this.deliveryData.address}<br>
                ${this.deliveryData.city ? this.deliveryData.city + ', ' : ''}${this.deliveryData.district}
            `;
        }

        // Update payment summary
        const paymentMethod = document.getElementById('summaryPaymentMethod');
        if (paymentMethod && this.selectedPaymentMethod) {
            paymentMethod.textContent = this.selectedPaymentMethod.name;
        }

        // Update totals
        const subtotal = cart.getSubtotal();
        const total = subtotal + this.deliveryCharge;

        document.getElementById('summarySubtotal').textContent = `LKR ${subtotal.toLocaleString()}`;
        document.getElementById('summaryDelivery').textContent = `LKR ${this.deliveryCharge.toLocaleString()}`;
        document.getElementById('summaryTotal').textContent = `LKR ${total.toLocaleString()}`;
    }

    // Place order
    async placeOrder() {
        const btn = document.getElementById('placeOrderBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            // Create or find customer
            const customer = await db.findOrCreateCustomer(this.deliveryData.phone, {
                name: this.deliveryData.name,
                district: this.deliveryData.district,
                city: this.deliveryData.city,
                address: this.deliveryData.address
            });

            // Prepare order items
            const items = cart.items.map(item => ({
                productId: item.id,
                name: item.name_en,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
            }));

            // Create order
            const order = await db.createOrder({
                customerId: customer.id,
                phone: this.deliveryData.phone,
                name: this.deliveryData.name,
                district: this.deliveryData.district,
                city: this.deliveryData.city,
                address: this.deliveryData.address,
                items: items,
                subtotal: cart.getSubtotal(),
                deliveryCharge: this.deliveryCharge,
                total: cart.getSubtotal() + this.deliveryCharge,
                paymentMethod: this.selectedPaymentMethod.type
            });

            // Show success
            this.showOrderSuccess(order.order_number);

        } catch (error) {
            console.error('Order error:', error);
            showToast(t('error_occurred'), 'error');
            btn.disabled = false;
            btn.innerHTML = t('place_order');
        }
    }

    // Show order success
    showOrderSuccess(orderNumber) {
        document.getElementById('step1Content').style.display = 'none';
        document.getElementById('step2Content').style.display = 'none';
        document.getElementById('step3Content').style.display = 'none';
        document.getElementById('orderSuccess').style.display = 'block';

        document.getElementById('orderNumberDisplay').textContent = orderNumber;

        // Update step indicators to show all complete
        document.querySelectorAll('.checkout-steps .step').forEach(el => {
            el.classList.add('completed');
        });
    }

    // Reset checkout
    reset() {
        this.currentStep = 1;
        this.deliveryData = {};
        this.selectedPaymentMethod = null;
        this.deliveryCharge = 0;

        // Reset form
        document.getElementById('deliveryForm')?.reset();

        // Reset payment selection
        document.querySelectorAll('.payment-method-item').forEach(item => {
            item.classList.remove('selected');
            item.querySelector('input').checked = false;
        });
        document.getElementById('paymentDetails').innerHTML = '';

        // Reset delivery charge display
        document.getElementById('deliveryChargeAmount').textContent = 'LKR 0.00';

        // Go to step 1
        this.goToStep(1);
    }
}

// Initialize checkout
const checkout = new Checkout();

// Checkout modal controls
function openCheckout() {
    if (cart.items.length === 0) {
        showToast(t('cart_empty'), 'warning');
        return;
    }

    closeCart();
    checkout.reset();
    checkout.init();
    
    document.getElementById('checkoutModal')?.classList.add('active');
    document.body.classList.add('no-scroll');
}

function closeCheckout() {
    document.getElementById('checkoutModal')?.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

// Export
window.checkout = checkout;
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;