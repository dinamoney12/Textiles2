/* ================================================
   DANURA TEXTILES - SUPABASE CONFIGURATION
   ================================================ */

// Supabase Configuration - REPLACE WITH YOUR CREDENTIALS
const SUPABASE_URL = 'https://cnnsnirlkgfkincrdvpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubnNuaXJsa2dma2luY3JkdnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDkwNTUsImV4cCI6MjA4NTUyNTA1NX0.P2u2qG3l5OnYHFdoXRzSt4g_VaykkyqObAMFv4o0nFU';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Helper Functions
const db = {
    // Categories
    async getCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');
        
        if (error) throw error;
        return data;
    },

    // Products
    async getProducts(options = {}) {
        let query = supabase
            .from('products')
            .select(`
                *,
                categories (
                    id,
                    name_en,
                    name_si,
                    name_ta
                )
            `)
            .eq('is_active', true);

        if (options.categoryId && options.categoryId !== 'all') {
            query = query.eq('category_id', options.categoryId);
        }

        if (options.featured) {
            query = query.eq('is_featured', true);
        }

        if (options.search) {
            query = query.or(`name_en.ilike.%${options.search}%,name_si.ilike.%${options.search}%,name_ta.ilike.%${options.search}%`);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getProductById(id) {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                categories (
                    id,
                    name_en,
                    name_si,
                    name_ta
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Delivery Charges
    async getDeliveryCharges() {
        const { data, error } = await supabase
            .from('delivery_charges')
            .select('*')
            .eq('is_active', true)
            .order('district');

        if (error) throw error;
        return data;
    },

    async getDeliveryCharge(district) {
        const { data, error } = await supabase
            .from('delivery_charges')
            .select('charge')
            .eq('district', district)
            .eq('is_active', true)
            .single();

        if (error) return 0;
        return data?.charge || 0;
    },

    // Payment Methods
    async getPaymentMethods() {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

        if (error) throw error;
        return data;
    },

    // Site Settings
    async getSiteSettings() {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*');

        if (error) throw error;
        
        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });
        return settings;
    },

    // Notices
    async getActiveNotices() {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        return data;
    },

    // Customers
    async findOrCreateCustomer(phone, customerData = {}) {
        let { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!customer) {
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert([{
                    phone: phone,
                    name: customerData.name || null,
                    district: customerData.district || null,
                    city: customerData.city || null,
                    address: customerData.address || null
                }])
                .select()
                .single();

            if (createError) throw createError;
            customer = newCustomer;
        } else if (customerData.name || customerData.address) {
            const { data: updatedCustomer, error: updateError } = await supabase
                .from('customers')
                .update({
                    name: customerData.name || customer.name,
                    district: customerData.district || customer.district,
                    city: customerData.city || customer.city,
                    address: customerData.address || customer.address
                })
                .eq('id', customer.id)
                .select()
                .single();

            if (updateError) throw updateError;
            customer = updatedCustomer;
        }

        return customer;
    },

    // Orders
    async createOrder(orderData) {
        const orderNumber = 'DT' + Date.now().toString(36).toUpperCase();
        
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                order_number: orderNumber,
                customer_id: orderData.customerId,
                customer_phone: orderData.phone,
                customer_name: orderData.name,
                district: orderData.district,
                city: orderData.city,
                address: orderData.address,
                items: orderData.items,
                subtotal: orderData.subtotal,
                delivery_charge: orderData.deliveryCharge,
                total: orderData.total,
                payment_method: orderData.paymentMethod,
                payment_status: 'pending',
                order_status: 'pending',
                notes: orderData.notes || null
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Storage - Upload Image
    async uploadImage(file, bucket = 'products') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    }
};

// Export for use in other files
window.db = db;
window.supabase = supabase;