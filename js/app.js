/* ================================================
   DANURA TEXTILES - MAIN APPLICATION
   ================================================ */

// App State
const app = {
    products: [],
    categories: [],
    currentCategory: 'all',
    currentPage: 0,
    productsPerPage: 8,
    isLoading: false,
    settings: {}
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize AOS
    AOS.init({
        duration: 800,
        easing: 'ease-out',cubic',
        once: true,
        offset: 50
    });

    // Setup preloader
    setupPreloader();

    // Initialize language
    initLanguage();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await loadInitialData();

    // Setup scroll effects
    setupScrollEffects();
});

// Setup Preloader
function setupPreloader() {
    const preloader = document.getElementById('preloader');
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader?.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        }, 2000);
    });
}

// Initialize Language
function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'en';
    setLanguage(savedLang);

    // Language button click handlers
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang);
        });
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    
    menuToggle?.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        nav?.classList.toggle('active');
    });

    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle?.classList.remove('active');
            nav?.classList.remove('active');
        });
    });

    // Cart button
    document.getElementById('cartBtn')?.addEventListener('click', openCart);
    document.getElementById('cartClose')?.addEventListener('click', closeCart);
    document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

    // Checkout button
    document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);
    document.getElementById('checkoutClose')?.addEventListener('click', closeCheckout);

    // Search
    document.getElementById('searchBtn')?.addEventListener('click', openSearch);
    document.getElementById('searchClose')?.addEventListener('click', closeSearch);
    document.getElementById('searchInput')?.addEventListener('input', debounce(handleSearch, 300));

    // Product modal
    document.getElementById('modalClose')?.addEventListener('click', closeProductModal);
    document.getElementById('productModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'productModal') closeProductModal();
    });

    // Quantity controls in modal
    document.getElementById('modalQtyMinus')?.addEventListener('click', () => {
        const input = document.getElementById('modalQty');
        if (input.value > 1) input.value = parseInt(input.value) - 1;
    });
    
    document.getElementById('modalQtyPlus')?.addEventListener('click', () => {
        const input = document.getElementById('modalQty');
        input.value = parseInt(input.value) + 1;
    });

    // Load more button
    document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreProducts);

    // Notice banner close
    document.querySelector('.notice-close')?.addEventListener('click', () => {
        document.getElementById('notice-banner').style.display = 'none';
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.getElementById('header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Contact form
    document.getElementById('contactForm')?.addEventListener('submit', handleContactForm);

    // Newsletter form
    document.getElementById('newsletterForm')?.addEventListener('submit', handleNewsletterForm);
}

// Load Initial Data
async function loadInitialData() {
    try {
        // Load site settings
        app.settings = await db.getSiteSettings();
        applySettings();

        // Load categories
        app.categories = await db.getCategories();
        renderCategories();
        renderCategoryFilters();

        // Load products
        await loadProducts();

        // Load notices
        await loadNotices();

    } catch (error) {
        console.error('Error loading initial data:', error);
        showToast(t('error_occurred'), 'error');
    }
}

// Apply Site Settings
function applySettings() {
    // Contact info
    if (app.settings.contact_phone) {
        document.getElementById('contactPhone').textContent = app.settings.contact_phone;
        const whatsappFloat = document.getElementById('whatsappFloat');
        if (whatsappFloat) {
            whatsappFloat.href = `https://wa.me/${app.settings.contact_phone.replace(/\D/g, '')}`;
        }
    }

    if (app.settings.contact_email) {
        document.getElementById('contactEmail').textContent = app.settings.contact_email;
    }

    if (app.settings.contact_address) {
        const address = typeof app.settings.contact_address === 'object' 
            ? getLocalizedText(app.settings.contact_address, '') 
            : app.settings.contact_address;
        document.getElementById('contactAddress').textContent = address;
    }

    // Social links
    if (app.settings.social_links) {
        const social = app.settings.social_links;
        if (social.facebook) document.getElementById('socialFacebook').href = social.facebook;
        if (social.instagram) document.getElementById('socialInstagram').href = social.instagram;
        if (social.whatsapp) document.getElementById('socialWhatsapp').href = `https://wa.me/${social.whatsapp}`;
    }
}

// Render Categories
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid || !app.categories.length) return;

    grid.innerHTML = app.categories.map((cat, index) => `
        <div class="category-card" data-aos="fade-up" data-aos-delay="${index * 100}" onclick="filterByCategory('${cat.id}')">
            <img src="${cat.image_url || 'https://via.placeholder.com/400x300'}" alt="${getLocalizedText(cat)}">
            <div class="category-overlay">
                <h3>${getLocalizedText(cat)}</h3>
                <p>${t('shop_now')} <i class="fas fa-arrow-right"></i></p>
            </div>
        </div>
    `).join('');
}

// Render Category Filters
function renderCategoryFilters() {
    const container = document.getElementById('categoryFilter');
    if (!container) return;

    const filterButtons = app.categories.map(cat => 
        `<button class="filter-btn" data-category="${cat.id}">${getLocalizedText(cat)}</button>`
    ).join('');

    container.innerHTML = `
        <button class="filter-btn active" data-category="all">${t('filter_all')}</button>
        ${filterButtons}
    `;

    // Add click handlers
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterByCategory(btn.dataset.category);
        });
    });
}

// Filter by Category
async function filterByCategory(categoryId) {
    app.currentCategory = categoryId;
    app.currentPage = 0;
    app.products = [];
    
    // Scroll to products section
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    await loadProducts();
}

// Load Products
async function loadProducts() {
    if (app.isLoading) return;
    app.isLoading = true;

    const loader = document.getElementById('productsLoader');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    loader.style.display = 'block';
    loadMoreBtn.style.display = 'none';

    try {
        const products = await db.getProducts({
            categoryId: app.currentCategory,
            limit: app.productsPerPage,
            offset: app.currentPage * app.productsPerPage
        });

        if (app.currentPage === 0) {
            app.products = products;
        } else {
            app.products = [...app.products, ...products];
        }

        renderProducts();

        // Show/hide load more button
        if (products.length === app.productsPerPage) {
            loadMoreBtn.style.display = 'inline-flex';
        }

    } catch (error) {
        console.error('Error loading products:', error);
        showToast(t('error_occurred'), 'error');
    } finally {
        app.isLoading = false;
        loader.style.display = 'none';
    }
}

// Load More Products
async function loadMoreProducts() {
    app.currentPage++;
    await loadProducts();
}

// Render Products
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (app.products.length === 0) {
        grid.innerHTML = `
            <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>${t('no_results')}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = app.products.map((product, index) => {
        const hasDiscount = product.sale_price && product.sale_price < product.price;
        const discountPercent = hasDiscount 
            ? Math.round((1 - product.sale_price / product.price) * 100) 
            : 0;

        return `
            <div class="product-card" data-aos="fade-up" data-aos-delay="${(index % 4) * 100}">
                ${hasDiscount ? `<span class="product-badge sale">-${discountPercent}%</span>` : ''}
                ${product.is_featured ? `<span class="product-badge new">Featured</span>` : ''}
                
                <div class="product-image">
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/300'}" 
                         alt="${getLocalizedText(product)}"
                         loading="lazy">
                    <div class="product-actions">
                        <button class="product-action-btn" onclick="openProductModal('${product.id}')" title="${t('quick_view')}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="product-action-btn" onclick="quickAddToCart('${product.id}')" title="${t('add_to_cart')}">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
                
                <div class="product-info">
                    <p class="product-category">${product.categories ? getLocalizedText(product.categories) : ''}</p>
                    <h3 class="product-name">${getLocalizedText(product)}</h3>
                    <div class="product-price">
                        <span class="current-price">LKR ${(product.sale_price || product.price).toLocaleString()}</span>
                        ${hasDiscount ? `<span class="original-price">LKR ${product.price.toLocaleString()}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Quick Add to Cart
async function quickAddToCart(productId) {
    try {
        const product = app.products.find(p => p.id === productId) || await db.getProductById(productId);
        if (product) {
            cart.add(product, 1);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast(t('error_occurred'), 'error');
    }
}

// Product Modal
let currentModalProduct = null;

async function openProductModal(productId) {
    try {
        const product = app.products.find(p => p.id === productId) || await db.getProductById(productId);
        if (!product) return;

        currentModalProduct = product;

        // Set main image
        const mainImage = document.getElementById('modalMainImage');
        mainImage.src = product.images?.[0] || 'https://via.placeholder.com/500';
        mainImage.alt = getLocalizedText(product);

        // Set thumbnails
        const thumbnailList = document.getElementById('modalThumbnails');
        if (product.images?.length > 1) {
            thumbnailList.innerHTML = product.images.map((img, index) => `
                <img src="${img}" alt="" class="${index === 0 ? 'active' : ''}" 
                     onclick="changeModalImage('${img}', this)">
            `).join('');
            thumbnailList.style.display = 'flex';
        } else {
            thumbnailList.style.display = 'none';
        }

        // Set product info
        document.getElementById('modalProductTitle').textContent = getLocalizedText(product);
        
        const hasDiscount = product.sale_price && product.sale_price < product.price;
        document.getElementById('modalProductPrice').innerHTML = `
            <span class="current-price">LKR ${(product.sale_price || product.price).toLocaleString()}</span>
            ${hasDiscount ? `<span class="original-price">LKR ${product.price.toLocaleString()}</span>` : ''}
        `;

        document.getElementById('modalProductDescription').textContent = 
            getLocalizedText(product, 'description') || 'No description available.';

        // Reset quantity
        document.getElementById('modalQty').value = 1;

        // Setup add to cart button
        document.getElementById('modalAddToCart').onclick = () => {
            const qty = parseInt(document.getElementById('modalQty').value) || 1;
            cart.add(currentModalProduct, qty);
            closeProductModal();
        };

        // Show modal
        document.getElementById('productModal').classList.add('active');
        document.body.classList.add('no-scroll');

    } catch (error) {
        console.error('Error opening product modal:', error);
        showToast(t('error_occurred'), 'error');
    }
}

function changeModalImage(src, thumbnail) {
    document.getElementById('modalMainImage').src = src;
    document.querySelectorAll('#modalThumbnails img').forEach(img => img.classList.remove('active'));
    thumbnail.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.classList.remove('no-scroll');
    currentModalProduct = null;
}

// Search Functions
function openSearch() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').focus();
    document.body.classList.add('no-scroll');
}

function closeSearch() {
    document.getElementById('searchModal').classList.remove('active');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    document.body.classList.remove('no-scroll');
}

async function handleSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('searchResults');

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    try {
        const products = await db.getProducts({ search: query, limit: 10 });
        
        if (products.length === 0) {
            resultsContainer.innerHTML = `<p style="color: white; text-align: center;">${t('no_results')}</p>`;
            return;
        }

        resultsContainer.innerHTML = products.map(product => `
            <div class="search-result-item" onclick="openProductModal('${product.id}'); closeSearch();">
                <img src="${product.images?.[0] || 'https://via.placeholder.com/60'}" alt="${getLocalizedText(product)}">
                <div class="search-result-info">
                    <h4>${getLocalizedText(product)}</h4>
                    <p>LKR ${(product.sale_price || product.price).toLocaleString()}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Search error:', error);
    }
}

// Load Notices
async function loadNotices() {
    try {
        const notices = await db.getActiveNotices();
        
        if (notices && notices.length > 0) {
            const notice = notices[0];
            const noticeText = getLocalizedText(notice, 'title') || getLocalizedText(notice, 'content');
            
            if (noticeText) {
                document.getElementById('notice-text').textContent = noticeText;
                document.getElementById('notice-banner').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

// Scroll Effects
function setupScrollEffects() {
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Header shadow on scroll
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Active nav link based on scroll position
        const sections = ['home', 'categories', 'products', 'contact'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                const rect = section.getBoundingClientRect();
                const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
                
                if (rect.top <= 150 && rect.bottom >= 150) {
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    navLink?.classList.add('active');
                }
            }
        });

        lastScroll = currentScroll;
    });
}

// Form Handlers
function handleContactForm(e) {
    e.preventDefault();
    showToast(t('send_message') + ' - Coming soon!', 'info');
    e.target.reset();
}

function handleNewsletterForm(e) {
    e.preventDefault();
    showToast('Subscribed successfully!', 'success');
    e.target.reset();
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
        closeSearch();
        closeProductModal();
        closeCheckout();
        closeCart();
    }
});

// Export app state
window.app = app;