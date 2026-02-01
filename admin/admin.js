/* ================================================
   DANURA TEXTILES - ADMIN PANEL JAVASCRIPT
   ================================================ */

// State
let currentSection = 'dashboard';
let isLoggedIn = false;
let allOrders = [];
let allProducts = [];
let allCategories = [];
let allCustomers = [];
let allDeliveryCharges = [];
let allPaymentMethods = [];
let allNotices = [];
let siteSettings = {};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check Authentication
function checkAuth() {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        showDashboard();
        loadDashboardData();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('active');
    });

    // Order status filter
    document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => {
        filterOrders(e.target.value);
    });

    // Settings forms
    document.getElementById('contactSettingsForm')?.addEventListener('submit', saveContactSettings);
    document.getElementById('socialSettingsForm')?.addEventListener('submit', saveSocialSettings);

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
        // For demo purposes - in production, use proper authentication
        // You can use Supabase Auth or your own authentication system
        
        if (email === 'admin@danura.com' && password === 'admin123') {
            localStorage.setItem('adminToken', 'demo-token');
            localStorage.setItem('adminEmail', email);
            showDashboard();
            loadDashboardData();
            showAdminToast('Login successful!', 'success');
        } else {
            // Try Supabase auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            localStorage.setItem('adminToken', data.session.access_token);
            localStorage.setItem('adminEmail', email);
            showDashboard();
            loadDashboardData();
            showAdminToast('Login successful!', 'success');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAdminToast('Invalid credentials!', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    showAdminToast('Logged out successfully', 'success');
}

// Show Dashboard
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    document.getElementById('adminName').textContent = localStorage.getItem('adminEmail') || 'Admin';
}

// Show Section
function showSection(section) {
    currentSection = section;

    // Update nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Show/hide sections
    document.querySelectorAll('.section').forEach(el => {
        el.style.display = 'none';
    });
    document.getElementById(`section-${section}`).style.display = 'block';

    // Load section data
    loadSectionData(section);

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('active');
}

// Load Section Data
async function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'orders':
            await loadOrders();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'categories':
            await loadCategories();
            break;
        case 'customers':
            await loadCustomers();
            break;
        case 'delivery':
            await loadDeliveryCharges();
            break;
        case 'payments':
            await loadPaymentMethods();
            break;
        case 'notices':
            await loadNotices();
            break;
        case 'settings':
            await loadSettings();
            break;
    }
}

// =============================================
// DASHBOARD
// =============================================

async function loadDashboardData() {
    try {
        // Load stats
        const [orders, products, customers] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact' }),
            supabase.from('products').select('*', { count: 'exact' }),
            supabase.from('customers').select('*', { count: 'exact' })
        ]);

        const pendingOrders = await supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('order_status', 'pending');

        // Update stats
        document.getElementById('totalOrders').textContent = orders.count || 0;
        document.getElementById('pendingOrders').textContent = pendingOrders.count || 0;
        document.getElementById('totalProducts').textContent = products.count || 0;
        document.getElementById('totalCustomers').textContent = customers.count || 0;
        document.getElementById('ordersBadge').textContent = pendingOrders.count || 0;

        // Load recent orders
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        renderRecentOrders(recentOrders || []);

    } catch (error) {
        console.error('Dashboard error:', error);
        showAdminToast('Error loading dashboard data', 'error');
    }
}

function renderRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.order_number}</strong></td>
            <td>${order.customer_name || 'N/A'}</td>
            <td>${order.customer_phone}</td>
            <td>LKR ${order.total?.toLocaleString() || 0}</td>
            <td><span class="status-badge ${order.order_status}">${order.order_status}</span></td>
            <td>${formatDate(order.created_at)}</td>
        </tr>
    `).join('');
}

// =============================================
// ORDERS
// =============================================

async function loadOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allOrders = data || [];
        renderOrders(allOrders);

    } catch (error) {
        console.error('Orders error:', error);
        showAdminToast('Error loading orders', 'error');
    }
}

function filterOrders(status) {
    if (!status) {
        renderOrders(allOrders);
    } else {
        const filtered = allOrders.filter(order => order.order_status === status);
        renderOrders(filtered);
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const items = order.items || [];
        const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        return `
            <tr>
                <td><strong>${order.order_number}</strong></td>
                <td>${order.customer_name || 'N/A'}</td>
                <td>${order.customer_phone}</td>
                <td>${order.district || 'N/A'}</td>
                <td>${itemCount} items</td>
                <td>LKR ${order.total?.toLocaleString() || 0}</td>
                <td><span class="status-badge ${order.payment_status}">${order.payment_status}</span></td>
                <td><span class="status-badge ${order.order_status}">${order.order_status}</span></td>
                <td>${formatDate(order.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary btn-icon" onclick="viewOrder('${order.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    const items = order.items || [];
    const itemsHtml = items.map(item => `
        <tr>
            <td>${item.name || 'Product'}</td>
            <td>${item.quantity || 1}</td>
            <td>LKR ${(item.price || 0).toLocaleString()}</td>
            <td>LKR ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
        </tr>
    `).join('');

    const modalBody = document.getElementById('orderModalBody');
    modalBody.innerHTML = `
        <div class="order-detail-grid">
            <div class="order-detail-section">
                <h4>Order Information</h4>
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Date:</strong> ${formatDateTime(order.created_at)}</p>
                <p><strong>Payment Method:</strong> ${order.payment_method || 'N/A'}</p>
                <p><strong>Payment Status:</strong> <span class="status-badge ${order.payment_status}">${order.payment_status}</span></p>
            </div>
            <div class="order-detail-section">
                <h4>Customer Details</h4>
                <p><strong>Name:</strong> ${order.customer_name || 'N/A'}</p>
                <p><strong>Phone:</strong> ${order.customer_phone}</p>
                <p><strong>District:</strong> ${order.district || 'N/A'}</p>
                <p><strong>City:</strong> ${order.city || 'N/A'}</p>
                <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
            </div>
        </div>

        <h4 style="margin-bottom: 15px;">Order Items</h4>
        <table class="order-items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="order-totals">
            <p><strong>Subtotal:</strong> LKR ${(order.subtotal || 0).toLocaleString()}</p>
            <p><strong>Delivery:</strong> LKR ${(order.delivery_charge || 0).toLocaleString()}</p>
            <p class="total"><strong>Total:</strong> LKR ${(order.total || 0).toLocaleString()}</p>
        </div>

        <div class="order-status-select">
            <label>Update Status:</label>
            <select class="form-control" id="orderStatusSelect">
                <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
                <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn btn-primary" onclick="updateOrderStatus('${order.id}')">
                Update
            </button>
        </div>
    `;

    document.getElementById('orderModal').classList.add('active');
}

async function updateOrderStatus(orderId) {
    const status = document.getElementById('orderStatusSelect').value;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                order_status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) throw error;

        showAdminToast('Order status updated!', 'success');
        closeOrderModal();
        loadOrders();
        loadDashboardData();

    } catch (error) {
        console.error('Update error:', error);
        showAdminToast('Error updating order', 'error');
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// =============================================
// PRODUCTS
// =============================================

async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories (
                    id,
                    name_en
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = data || [];
        renderProducts(allProducts);

    } catch (error) {
        console.error('Products error:', error);
        showAdminToast('Error loading products', 'error');
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('productsTable');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <img src="${product.images?.[0] || 'https://via.placeholder.com/50'}" alt="${product.name_en}">
            </td>
            <td>${product.name_en}</td>
            <td>${product.categories?.name_en || 'Uncategorized'}</td>
            <td>LKR ${product.price?.toLocaleString() || 0}</td>
            <td>${product.sale_price ? 'LKR ' + product.sale_price.toLocaleString() : '-'}</td>
            <td>${product.stock_quantity || 0}</td>
            <td><span class="status-badge ${product.is_active ? 'active' : 'inactive'}">${product.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary btn-icon" onclick="editProduct('${product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteProduct('${product.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function openProductForm(productId = null) {
    // Load categories first
    if (allCategories.length === 0) {
        const { data } = await supabase.from('categories').select('*').eq('is_active', true);
        allCategories = data || [];
    }

    const product = productId ? allProducts.find(p => p.id === productId) : null;
    const isEdit = !!product;

    const categoryOptions = allCategories.map(cat => 
        `<option value="${cat.id}" ${product?.category_id === cat.id ? 'selected' : ''}>${cat.name_en}</option>`
    ).join('');

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Product' : 'Add Product';
    document.getElementById('modalBody').innerHTML = `
        <form id="productForm">
            <input type="hidden" id="productId" value="${product?.id || ''}">
            
            <div class="form-row">
                <div class="form-group">
                    <label>Name (English) *</label>
                    <input type="text" class="form-control" id="productNameEn" value="${product?.name_en || ''}" required>
                </div>
                <div class="form-group">
                    <label>Category *</label>
                    <select class="form-control" id="productCategory" required>
                        <option value="">Select Category</option>
                        ${categoryOptions}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Name (Sinhala)</label>
                    <input type="text" class="form-control" id="productNameSi" value="${product?.name_si || ''}">
                </div>
                <div class="form-group">
                    <label>Name (Tamil)</label>
                    <input type="text" class="form-control" id="productNameTa" value="${product?.name_ta || ''}">
                </div>
            </div>

            <div class="form-group">
                <label>Description (English)</label>
                <textarea class="form-control" id="productDescEn" rows="3">${product?.description_en || ''}</textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Price (LKR) *</label>
                    <input type="number" class="form-control" id="productPrice" value="${product?.price || ''}" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Sale Price (LKR)</label>
                    <input type="number" class="form-control" id="productSalePrice" value="${product?.sale_price || ''}" min="0" step="0.01">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" class="form-control" id="productStock" value="${product?.stock_quantity || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <div class="form-check">
                        <input type="checkbox" id="productFeatured" ${product?.is_featured ? 'checked' : ''}>
                        <label for="productFeatured">Featured Product</label>
                    </div>
                    <div class="form-check">
                        <input type="checkbox" id="productActive" ${product?.is_active !== false ? 'checked' : ''}>
                        <label for="productActive">Active</label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Product Images</label>
                <div class="file-upload" onclick="document.getElementById('productImages').click()">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Click to upload images</p>
                    <input type="file" id="productImages" accept="image/*" multiple style="display: none;" onchange="handleImageUpload(this)">
                </div>
                <div class="image-preview" id="imagePreview">
                    ${(product?.images || []).map((img, idx) => `
                        <div class="image-preview-item" data-url="${img}">
                            <img src="${img}" alt="">
                            <button type="button" class="remove-btn" onclick="removeImage(${idx})"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Product</button>
            </div>
        </form>
    `;

    // Store current images
    window.productImages = product?.images || [];

    document.getElementById('productForm').addEventListener('submit', saveProduct);
    document.getElementById('adminModal').classList.add('active');
}

function editProduct(productId) {
    openProductForm(productId);
}

let uploadedImages = [];

async function handleImageUpload(input) {
    const files = Array.from(input.files);
    const preview = document.getElementById('imagePreview');

    for (const file of files) {
        try {
            // Show loading
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'image-preview-item';
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>';
            preview.appendChild(loadingDiv);

            // Upload to Supabase
            const url = await db.uploadImage(file);
            window.productImages.push(url);

            // Replace loading with image
            loadingDiv.innerHTML = `
                <img src="${url}" alt="">
                <button type="button" class="remove-btn" onclick="removeImage(${window.productImages.length - 1})"><i class="fas fa-times"></i></button>
            `;
            loadingDiv.dataset.url = url;

        } catch (error) {
            console.error('Upload error:', error);
            showAdminToast('Error uploading image', 'error');
        }
    }

    input.value = '';
}

function removeImage(index) {
    window.productImages.splice(index, 1);
    refreshImagePreview();
}

function refreshImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = window.productImages.map((img, idx) => `
        <div class="image-preview-item" data-url="${img}">
            <img src="${img}" alt="">
            <button type="button" class="remove-btn" onclick="removeImage(${idx})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

async function saveProduct(e) {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const isEdit = !!productId;

    const productData = {
        name_en: document.getElementById('productNameEn').value,
        name_si: document.getElementById('productNameSi').value || null,
        name_ta: document.getElementById('productNameTa').value || null,
        description_en: document.getElementById('productDescEn').value || null,
        category_id: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        sale_price: document.getElementById('productSalePrice').value ? parseFloat(document.getElementById('productSalePrice').value) : null,
        stock_quantity: parseInt(document.getElementById('productStock').value) || 0,
        is_featured: document.getElementById('productFeatured').checked,
        is_active: document.getElementById('productActive').checked,
        images: window.productImages || []
    };

    try {
        if (isEdit) {
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId);
            if (error) throw error;
            showAdminToast('Product updated successfully!', 'success');
        } else {
            const { error } = await supabase
                .from('products')
                .insert([productData]);
            if (error) throw error;
            showAdminToast('Product created successfully!', 'success');
        }

        closeModal();
        loadProducts();

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        showAdminToast('Product deleted!', 'success');
        loadProducts();

    } catch (error) {
        console.error('Delete error:', error);
        showAdminToast('Error deleting product', 'error');
    }
}

// =============================================
// CATEGORIES
// =============================================

async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order');

        if (error) throw error;

        allCategories = data || [];
        renderCategories(allCategories);

    } catch (error) {
        console.error('Categories error:', error);
        showAdminToast('Error loading categories', 'error');
    }
}

function renderCategories(categories) {
    const tbody = document.getElementById('categoriesTable');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No categories found</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>
                <img src="${cat.image_url || 'https://via.placeholder.com/50'}" alt="${cat.name_en}">
            </td>
            <td>${cat.name_en}</td>
            <td>${cat.name_si || '-'}</td>
            <td>${cat.name_ta || '-'}</td>
            <td>${cat.sort_order || 0}</td>
            <td><span class="status-badge ${cat.is_active ? 'active' : 'inactive'}">${cat.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary btn-icon" onclick="editCategory('${cat.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteCategory('${cat.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCategoryForm(categoryId = null) {
    const category = categoryId ? allCategories.find(c => c.id === categoryId) : null;
    const isEdit = !!category;

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Category' : 'Add Category';
    document.getElementById('modalBody').innerHTML = `
        <form id="categoryForm">
            <input type="hidden" id="categoryId" value="${category?.id || ''}">
            
            <div class="form-group">
                <label>Name (English) *</label>
                <input type="text" class="form-control" id="categoryNameEn" value="${category?.name_en || ''}" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Name (Sinhala)</label>
                    <input type="text" class="form-control" id="categoryNameSi" value="${category?.name_si || ''}">
                </div>
                <div class="form-group">
                    <label>Name (Tamil)</label>
                    <input type="text" class="form-control" id="categoryNameTa" value="${category?.name_ta || ''}">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Sort Order</label>
                    <input type="number" class="form-control" id="categorySortOrder" value="${category?.sort_order || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <div class="form-check">
                        <input type="checkbox" id="categoryActive" ${category?.is_active !== false ? 'checked' : ''}>
                        <label for="categoryActive">Active</label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Category Image</label>
                <div class="file-upload" onclick="document.getElementById('categoryImage').click()">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Click to upload image</p>
                    <input type="file" id="categoryImage" accept="image/*" style="display: none;" onchange="handleCategoryImageUpload(this)">
                </div>
                <div class="image-preview" id="categoryImagePreview">
                    ${category?.image_url ? `
                        <div class="image-preview-item">
                            <img src="${category.image_url}" alt="">
                        </div>
                    ` : ''}
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Category</button>
            </div>
        </form>
    `;

    window.categoryImageUrl = category?.image_url || null;

    document.getElementById('categoryForm').addEventListener('submit', saveCategory);
    document.getElementById('adminModal').classList.add('active');
}

function editCategory(categoryId) {
    openCategoryForm(categoryId);
}

async function handleCategoryImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const preview = document.getElementById('categoryImagePreview');
    preview.innerHTML = '<div class="image-preview-item"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i></div>';

    try {
        const url = await db.uploadImage(file);
        window.categoryImageUrl = url;
        preview.innerHTML = `
            <div class="image-preview-item">
                <img src="${url}" alt="">
            </div>
        `;
    } catch (error) {
        console.error('Upload error:', error);
        showAdminToast('Error uploading image', 'error');
        preview.innerHTML = '';
    }
}

async function saveCategory(e) {
    e.preventDefault();

    const categoryId = document.getElementById('categoryId').value;
    const isEdit = !!categoryId;

    const categoryData = {
        name_en: document.getElementById('categoryNameEn').value,
        name_si: document.getElementById('categoryNameSi').value || null,
        name_ta: document.getElementById('categoryNameTa').value || null,
        sort_order: parseInt(document.getElementById('categorySortOrder').value) || 0,
        is_active: document.getElementById('categoryActive').checked,
        image_url: window.categoryImageUrl || null
    };

    try {
        if (isEdit) {
            const { error } = await supabase
                .from('categories')
                .update(categoryData)
                .eq('id', categoryId);
            if (error) throw error;
            showAdminToast('Category updated!', 'success');
        } else {
            const { error } = await supabase
                .from('categories')
                .insert([categoryData]);
            if (error) throw error;
            showAdminToast('Category created!', 'success');
        }

        closeModal();
        loadCategories();

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving category', 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (error) throw error;

        showAdminToast('Category deleted!', 'success');
        loadCategories();

    } catch (error) {
        console.error('Delete error:', error);
        showAdminToast('Error deleting category', 'error');
    }
}

// =============================================
// CUSTOMERS
// =============================================

async function loadCustomers() {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allCustomers = data || [];
        renderCustomers(allCustomers);

    } catch (error) {
        console.error('Customers error:', error);
        showAdminToast('Error loading customers', 'error');
    }
}

function renderCustomers(customers) {
    const tbody = document.getElementById('customersTable');
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name || 'N/A'}</td>
            <td>${customer.phone}</td>
            <td>${customer.district || 'N/A'}</td>
            <td>${customer.city || 'N/A'}</td>
            <td>${customer.address || 'N/A'}</td>
            <td>${formatDate(customer.created_at)}</td>
        </tr>
    `).join('');
}

// =============================================
// DELIVERY CHARGES
// =============================================

async function loadDeliveryCharges() {
    try {
        const { data, error } = await supabase
            .from('delivery_charges')
            .select('*')
            .order('district');

        if (error) throw error;

        allDeliveryCharges = data || [];
        renderDeliveryCharges(allDeliveryCharges);

    } catch (error) {
        console.error('Delivery charges error:', error);
        showAdminToast('Error loading delivery charges', 'error');
    }
}

function renderDeliveryCharges(charges) {
    const tbody = document.getElementById('deliveryTable');
    
    if (charges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No delivery charges found</td></tr>';
        return;
    }

    tbody.innerHTML = charges.map(charge => `
        <tr>
            <td>${charge.district}</td>
            <td>${charge.city || 'All cities'}</td>
            <td>LKR ${charge.charge?.toLocaleString() || 0}</td>
            <td><span class="status-badge ${charge.is_active ? 'active' : 'inactive'}">${charge.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary btn-icon" onclick="editDeliveryCharge('${charge.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteDeliveryCharge('${charge.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openDeliveryForm(chargeId = null) {
    const charge = chargeId ? allDeliveryCharges.find(c => c.id === chargeId) : null;
    const isEdit = !!charge;

    const districts = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Monaragala', 'Ratnapura', 'Kegalle'
    ];

    const districtOptions = districts.map(d => 
        `<option value="${d}" ${charge?.district === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Delivery Charge' : 'Add Delivery Charge';
    document.getElementById('modalBody').innerHTML = `
        <form id="deliveryForm">
            <input type="hidden" id="deliveryChargeId" value="${charge?.id || ''}">
            
            <div class="form-group">
                <label>District *</label>
                <select class="form-control" id="deliveryDistrict" required>
                    <option value="">Select District</option>
                    ${districtOptions}
                </select>
            </div>

            <div class="form-group">
                <label>City (Optional - leave empty for all cities)</label>
                <input type="text" class="form-control" id="deliveryCity" value="${charge?.city || ''}">
            </div>

            <div class="form-group">
                <label>Delivery Charge (LKR) *</label>
                <input type="number" class="form-control" id="deliveryChargeAmount" value="${charge?.charge || ''}" required min="0" step="0.01">
            </div>

            <div class="form-check">
                <input type="checkbox" id="deliveryActive" ${charge?.is_active !== false ? 'checked' : ''}>
                <label for="deliveryActive">Active</label>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
            </div>
        </form>
    `;

    document.getElementById('deliveryForm').addEventListener('submit', saveDeliveryCharge);
    document.getElementById('adminModal').classList.add('active');
}

function editDeliveryCharge(chargeId) {
    openDeliveryForm(chargeId);
}

async function saveDeliveryCharge(e) {
    e.preventDefault();

    const chargeId = document.getElementById('deliveryChargeId').value;
    const isEdit = !!chargeId;

    const chargeData = {
        district: document.getElementById('deliveryDistrict').value,
        city: document.getElementById('deliveryCity').value || null,
        charge: parseFloat(document.getElementById('deliveryChargeAmount').value),
        is_active: document.getElementById('deliveryActive').checked
    };

    try {
        if (isEdit) {
            const { error } = await supabase
                .from('delivery_charges')
                .update(chargeData)
                .eq('id', chargeId);
            if (error) throw error;
            showAdminToast('Delivery charge updated!', 'success');
        } else {
            const { error } = await supabase
                .from('delivery_charges')
                .insert([chargeData]);
            if (error) throw error;
            showAdminToast('Delivery charge created!', 'success');
        }

        closeModal();
        loadDeliveryCharges();

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving delivery charge', 'error');
    }
}

async function deleteDeliveryCharge(chargeId) {
    if (!confirm('Are you sure you want to delete this delivery charge?')) return;

    try {
        const { error } = await supabase
            .from('delivery_charges')
            .delete()
            .eq('id', chargeId);

        if (error) throw error;

        showAdminToast('Delivery charge deleted!', 'success');
        loadDeliveryCharges();

    } catch (error) {
        console.error('Delete error:', error);
        showAdminToast('Error deleting delivery charge', 'error');
    }
}

// =============================================
// PAYMENT METHODS
// =============================================

async function loadPaymentMethods() {
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('sort_order');

        if (error) throw error;

        allPaymentMethods = data || [];
        renderPaymentMethods(allPaymentMethods);

    } catch (error) {
        console.error('Payment methods error:', error);
        showAdminToast('Error loading payment methods', 'error');
    }
}

function renderPaymentMethods(methods) {
    const tbody = document.getElementById('paymentsTable');
    
    if (methods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No payment methods found</td></tr>';
        return;
    }

    tbody.innerHTML = methods.map(method => `
        <tr>
            <td>${method.name}</td>
            <td>${method.type}</td>
            <td>${JSON.stringify(method.details || {}).substring(0, 50)}...</td>
            <td>${method.sort_order || 0}</td>
            <td><span class="status-badge ${method.is_active ? 'active' : 'inactive'}">${method.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary btn-icon" onclick="editPaymentMethod('${method.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deletePaymentMethod('${method.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openPaymentForm(methodId = null) {
    const method = methodId ? allPaymentMethods.find(m => m.id === methodId) : null;
    const isEdit = !!method;

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Payment Method' : 'Add Payment Method';
    document.getElementById('modalBody').innerHTML = `
        <form id="paymentMethodForm">
            <input type="hidden" id="paymentMethodId" value="${method?.id || ''}">
            
            <div class="form-group">
                <label>Name *</label>
                <input type="text" class="form-control" id="paymentName" value="${method?.name || ''}" required>
            </div>

            <div class="form-group">
                <label>Type *</label>
                <select class="form-control" id="paymentType" required onchange="showPaymentDetails()">
                    <option value="">Select Type</option>
                    <option value="card" ${method?.type === 'card' ? 'selected' : ''}>Card Payment</option>
                    <option value="bank" ${method?.type === 'bank' ? 'selected' : ''}>Bank Transfer</option>
                    <option value="koko" ${method?.type === 'koko' ? 'selected' : ''}>Koko Pay</option>
                    <option value="cod" ${method?.type === 'cod' ? 'selected' : ''}>Cash on Delivery</option>
                </select>
            </div>

            <div id="paymentDetailsFields">
                ${method?.type === 'bank' ? `
                    <div class="form-group">
                        <label>Bank Name</label>
                        <input type="text" class="form-control" id="bankName" value="${method?.details?.bank_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Account Name</label>
                        <input type="text" class="form-control" id="accountName" value="${method?.details?.account_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Account Number</label>
                        <input type="text" class="form-control" id="accountNumber" value="${method?.details?.account_number || ''}">
                    </div>
                    <div class="form-group">
                        <label>Branch</label>
                        <input type="text" class="form-control" id="bankBranch" value="${method?.details?.branch || ''}">
                    </div>
                ` : `
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" id="paymentDescription" rows="2">${method?.details?.description || ''}</textarea>
                    </div>
                `}
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Sort Order</label>
                    <input type="number" class="form-control" id="paymentSortOrder" value="${method?.sort_order || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <div class="form-check">
                        <input type="checkbox" id="paymentActive" ${method?.is_active !== false ? 'checked' : ''}>
                        <label for="paymentActive">Active</label>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
            </div>
        </form>
    `;

    document.getElementById('paymentMethodForm').addEventListener('submit', savePaymentMethod);
    document.getElementById('adminModal').classList.add('active');
}

function showPaymentDetails() {
    const type = document.getElementById('paymentType').value;
    const container = document.getElementById('paymentDetailsFields');

    if (type === 'bank') {
        container.innerHTML = `
            <div class="form-group">
                <label>Bank Name</label>
                <input type="text" class="form-control" id="bankName">
            </div>
            <div class="form-group">
                <label>Account Name</label>
                <input type="text" class="form-control" id="accountName">
            </div>
            <div class="form-group">
                <label>Account Number</label>
                <input type="text" class="form-control" id="accountNumber">
            </div>
            <div class="form-group">
                <label>Branch</label>
                <input type="text" class="form-control" id="bankBranch">
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" id="paymentDescription" rows="2"></textarea>
            </div>
        `;
    }
}

function editPaymentMethod(methodId) {
    openPaymentForm(methodId);
}

async function savePaymentMethod(e) {
    e.preventDefault();

    const methodId = document.getElementById('paymentMethodId').value;
    const isEdit = !!methodId;
    const type = document.getElementById('paymentType').value;

    let details = {};
    if (type === 'bank') {
        details = {
            bank_name: document.getElementById('bankName')?.value || '',
            account_name: document.getElementById('accountName')?.value || '',
            account_number: document.getElementById('accountNumber')?.value || '',
            branch: document.getElementById('bankBranch')?.value || ''
        };
    } else {
        details = {
            description: document.getElementById('paymentDescription')?.value || ''
        };
    }

    const methodData = {
        name: document.getElementById('paymentName').value,
        type: type,
        details: details,
        sort_order: parseInt(document.getElementById('paymentSortOrder').value) || 0,
        is_active: document.getElementById('paymentActive').checked
    };

    try {
        if (isEdit) {
            const { error } = await supabase
                .from('payment_methods')
                .update(methodData)
                .eq('id', methodId);
            if (error) throw error;
            showAdminToast('Payment method updated!', 'success');
        } else {
            const { error } = await supabase
                .from('payment_methods')
                .insert([methodData]);
            if (error) throw error;
            showAdminToast('Payment method created!', 'success');
        }

        closeModal();
        loadPaymentMethods();

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving payment method', 'error');
    }
}

async function deletePaymentMethod(methodId) {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', methodId);

        if (error) throw error;

        showAdminToast('Payment method deleted!', 'success');
        loadPaymentMethods();

    } catch (error) {
        console.error('Delete error:', error);
        showAdminToast('Error deleting payment method', 'error');
    }
}

// =============================================
// NOTICES
// =============================================

async function loadNotices() {
    try {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allNotices = data || [];
        renderNotices(allNotices);

    } catch (error) {
        console.error('Notices error:', error);
        showAdminToast('Error loading notices', 'error');
    }
}

function renderNotices(notices) {
    const tbody = document.getElementById('noticesTable');
    
    if (notices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No notices found</td></tr>';
        return;
    }

    tbody.innerHTML = notices.map(notice => `
        <tr>
            <td>${notice.title_en || '-'}</td>
            <td>${notice.title_si || '-'}</td>
            <td>${notice.title_ta || '-'}</td>
            <td><span class="status-badge ${notice.is_active ? 'active' : 'inactive'}">${notice.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${formatDate(notice.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary btn-icon" onclick="editNotice('${notice.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteNotice('${notice.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openNoticeForm(noticeId = null) {
    const notice = noticeId ? allNotices.find(n => n.id === noticeId) : null;
    const isEdit = !!notice;

    document.getElementById('modalTitle').textContent = isEdit ? 'Edit Notice' : 'Add Notice';
    document.getElementById('modalBody').innerHTML = `
        <form id="noticeForm">
            <input type="hidden" id="noticeId" value="${notice?.id || ''}">
            
            <div class="form-group">
                <label>Title (English) *</label>
                <input type="text" class="form-control" id="noticeTitleEn" value="${notice?.title_en || ''}" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Title (Sinhala)</label>
                    <input type="text" class="form-control" id="noticeTitleSi" value="${notice?.title_si || ''}">
                </div>
                <div class="form-group">
                    <label>Title (Tamil)</label>
                    <input type="text" class="form-control" id="noticeTitleTa" value="${notice?.title_ta || ''}">
                </div>
            </div>

            <div class="form-group">
                <label>Content (English)</label>
                <textarea class="form-control" id="noticeContentEn" rows="3">${notice?.content_en || ''}</textarea>
            </div>

            <div class="form-group">
                <label>Link (Optional)</label>
                <input type="url" class="form-control" id="noticeLink" value="${notice?.link || ''}" placeholder="https://...">
            </div>

            <div class="form-check">
                <input type="checkbox" id="noticeActive" ${notice?.is_active !== false ? 'checked' : ''}>
                <label for="noticeActive">Active</label>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
            </div>
        </form>
    `;

    document.getElementById('noticeForm').addEventListener('submit', saveNotice);
    document.getElementById('adminModal').classList.add('active');
}

function editNotice(noticeId) {
    openNoticeForm(noticeId);
}

async function saveNotice(e) {
    e.preventDefault();

    const noticeId = document.getElementById('noticeId').value;
    const isEdit = !!noticeId;

    const noticeData = {
        title_en: document.getElementById('noticeTitleEn').value,
        title_si: document.getElementById('noticeTitleSi').value || null,
        title_ta: document.getElementById('noticeTitleTa').value || null,
        content_en: document.getElementById('noticeContentEn').value || null,
        link: document.getElementById('noticeLink').value || null,
        is_active: document.getElementById('noticeActive').checked
    };

    try {
        if (isEdit) {
            const { error } = await supabase
                .from('notices')
                .update(noticeData)
                .eq('id', noticeId);
            if (error) throw error;
            showAdminToast('Notice updated!', 'success');
        } else {
            const { error } = await supabase
                .from('notices')
                .insert([noticeData]);
            if (error) throw error;
            showAdminToast('Notice created!', 'success');
        }

        closeModal();
        loadNotices();

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving notice', 'error');
    }
}

async function deleteNotice(noticeId) {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', noticeId);

        if (error) throw error;

        showAdminToast('Notice deleted!', 'success');
        loadNotices();

    } catch (error) {
        console.error('Delete error:', error);
        showAdminToast('Error deleting notice', 'error');
    }
}

// =============================================
// SETTINGS
// =============================================

async function loadSettings() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*');

        if (error) throw error;

        siteSettings = {};
        (data || []).forEach(item => {
            siteSettings[item.key] = item.value;
        });

        // Populate contact form
        document.getElementById('settingPhone').value = siteSettings.contact_phone || '';
        document.getElementById('settingEmail').value = siteSettings.contact_email || '';
        
        const address = siteSettings.contact_address || {};
        document.getElementById('settingAddressEn').value = address.en || '';
        document.getElementById('settingAddressSi').value = address.si || '';
        document.getElementById('settingAddressTa').value = address.ta || '';

        // Populate social form
        const social = siteSettings.social_links || {};
        document.getElementById('settingFacebook').value = social.facebook || '';
        document.getElementById('settingInstagram').value = social.instagram || '';
        document.getElementById('settingWhatsapp').value = social.whatsapp || '';

    } catch (error) {
        console.error('Settings error:', error);
        showAdminToast('Error loading settings', 'error');
    }
}

async function saveContactSettings(e) {
    e.preventDefault();

    try {
        // Save phone
        await upsertSetting('contact_phone', document.getElementById('settingPhone').value);
        
        // Save email
        await upsertSetting('contact_email', document.getElementById('settingEmail').value);
        
        // Save address
        await upsertSetting('contact_address', {
            en: document.getElementById('settingAddressEn').value,
            si: document.getElementById('settingAddressSi').value,
            ta: document.getElementById('settingAddressTa').value
        });

        showAdminToast('Contact settings saved!', 'success');

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving settings', 'error');
    }
}

async function saveSocialSettings(e) {
    e.preventDefault();

    try {
        await upsertSetting('social_links', {
            facebook: document.getElementById('settingFacebook').value,
            instagram: document.getElementById('settingInstagram').value,
            whatsapp: document.getElementById('settingWhatsapp').value
        });

        showAdminToast('Social settings saved!', 'success');

    } catch (error) {
        console.error('Save error:', error);
        showAdminToast('Error saving settings', 'error');
    }
}

async function upsertSetting(key, value) {
    // Check if setting exists
    const { data } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', key)
        .single();

    if (data) {
        await supabase
            .from('site_settings')
            .update({ value: value, updated_at: new Date().toISOString() })
            .eq('key', key);
    } else {
        await supabase
            .from('site_settings')
            .insert([{ key: key, value: value }]);
    }
}

// =============================================
// UTILITIES
// =============================================

function closeModal() {
    document.getElementById('adminModal').classList.remove('active');
}

function showAdminToast(message, type = 'success') {
    const toast = document.getElementById('adminToast');
    const icon = toast.querySelector('.toast-icon');
    const msg = toast.querySelector('.toast-message');

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    icon.className = `toast-icon ${icons[type] || icons.success}`;
    msg.textContent = message;
    
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeOrderModal();
    }
});