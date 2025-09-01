// Global variables
let storeData = null;
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentCategory = '';
let searchTimeout = null;

// Theme management
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Initialize theme
const currentTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', currentTheme);
updateThemeIcon();

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
});

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    const isDark = body.getAttribute('data-theme') === 'dark';
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// Loading management
function showLoading() {
    document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 500);
}

// Fetch and load data
async function loadStoreData() {
    try {
        showLoading();
        
        // Try to fetch from the JSON file
        const response = await fetch('./data.json');
        
        if (response.ok) {
            storeData = await response.json();
            console.log('Data loaded successfully from data.json');
        } else {
            throw new Error('Failed to load data.json');
        }
        
    } catch (error) {
        console.error('Could not load from file:', error);
        
        // Show error message to user
        alert('डेटा लोड करण्यात त्रुटी झाली. कृपया पुन्हा प्रयत्न करा.');
        
        // Minimal fallback to prevent crashes
        storeData = {
            "store": "Maharashtra Kirana",
            "locale": "mr-IN",
            "sections": []
        };
    }
    
    processData();
    hideLoading();
}

// Process the loaded data
function processData() {
    allProducts = [];
    
    if (storeData && storeData.sections) {
        storeData.sections.forEach(section => {
            if (section.subsections) {
                section.subsections.forEach(subsection => {
                    if (subsection.items) {
                        subsection.items.forEach(item => {
                            allProducts.push({
                                ...item,
                                categoryId: section.id,
                                categoryName: section.title_mr,
                                categoryNameEn: section.title_en,
                                subcategoryName: subsection.title_mr,
                                subcategoryNameEn: subsection.title_en
                            });
                        });
                    }
                });
            }
        });
    }
    
    filteredProducts = [...allProducts];
    initializeApp();
}

// Initialize the application
function initializeApp() {
    renderCategories();
    setupEventListeners();
    updateCartDisplay();
    setupSearch();
    populateCategoryFilter();
    
    // Initially hide products section and show explanation
    const productsSection = document.querySelector('.products-section');
    const explanationBar = document.getElementById('explanation-bar');
    
    if (productsSection) {
        productsSection.classList.remove('visible');
        productsSection.style.display = 'none';
    }
    
    if (explanationBar) {
        explanationBar.classList.remove('hidden');
        explanationBar.style.display = 'block';
    }
    
    // Don't render products initially
    filteredProducts = [];
    
    // Add fade-in animation to main content
    document.querySelector('.main-content').classList.add('fade-in');
}

// Render categories
function renderCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    
    if (!storeData || !storeData.sections) {
        categoriesGrid.innerHTML = '<p>डेटा लोड करण्यात त्रुटी</p>';
        return;
    }
    
    categoriesGrid.innerHTML = storeData.sections.map(section => `
        <div class="category-card" onclick="filterByCategory(${section.id})" data-category="${section.id}">
            <i class="category-icon ${getCategoryIcon(section.id)}"></i>
            <h3>${section.title_mr}</h3>
            <p>${section.description || section.title_en}</p>
        </div>
    `).join('');
    
    // Add animation to category cards
    setTimeout(() => {
        document.querySelectorAll('.category-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('slide-up');
            }, index * 100);
        });
    }, 500);
}

// Get icon for category
function getCategoryIcon(categoryId) {
    const icons = {
        1: 'fas fa-seedling',
        2: 'fas fa-pepper-hot',
        3: 'fas fa-cheese',
        4: 'fas fa-cookie-bite',
        5: 'fas fa-coffee',
        6: 'fas fa-broom',
        7: 'fas fa-soap',
        8: 'fas fa-pray',
        9: 'fas fa-candy-cane'
    };
    return icons[categoryId] || 'fas fa-shopping-basket';
}

// Render products
function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    const noProductsDiv = document.getElementById('no-products');
    const productsTitle = document.getElementById('products-title');
    
    if (filteredProducts.length === 0) {
        productsGrid.style.display = 'none';
        noProductsDiv.style.display = 'block';
        return;
    }
    
    productsGrid.style.display = 'grid';
    noProductsDiv.style.display = 'none';
    
    // Update title based on current filter
    if (currentCategory) {
        const category = storeData.sections.find(s => s.id == currentCategory);
        productsTitle.textContent = category ? category.title_mr : 'उत्पादने';
    } else {
        productsTitle.textContent = 'सर्व उत्पादने';
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => {
        const productId = generateProductId(product);
        const cartItem = cart.find(item => item.id === productId);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        return `
            <div class="product-card" data-product-id="${productId}">
                <div class="product-header">
                    <div class="product-names">
                        <div class="product-name">${product.name_mr}</div>
                        <div class="product-name-en">${product.name_en}</div>
                    </div>
                    <div class="product-category">${product.categoryName}</div>
                </div>
                
                <div class="product-info">
                    ${product.variants ? `
                        <div class="product-variants">
                            <strong>प्रकार:</strong><br>
                            ${product.variants.map(variant => `<span class="variant-tag">${variant}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${product.pack_sizes ? `
    <div class="product-pack-sizes">
        <strong>पॅक साइझ:</strong><br>
        <div class="pack-size-selector" id="pack-${productId}">
            ${product.pack_sizes.map((size, index) => `
                <button class="size-tag clickable ${index === 0 ? 'selected' : ''}" 
                        onclick="selectPackSize('${productId}', '${size}', this)"
                        data-size="${size}">
                    ${size}
                </button>
            `).join('')}
            <button class="size-tag clickable custom-size-btn" 
                    onclick="showCustomSizeInput('${productId}', this)"
                    data-size="custom">
                Custom
            </button>
        </div>
        <div id="custom-input-${productId}" class="custom-pack-size" style="display: none;">
            <div class="custom-input-container">
                <input type="text" class="custom-size-input" placeholder="Enter amount (e.g., 2.5 kg)">
                <button class="confirm-custom-size" onclick="confirmCustomSize('${productId}')">✓</button>
                <button class="cancel-custom-size" onclick="cancelCustomSize('${productId}')">✕</button>
            </div>
        </div>
    </div>
` : ''}
                    
                    ${product.brands ? `
                        <div class="product-brands">
                            <strong>ब्रँड:</strong><br>
                            ${product.brands.map(brand => `<span class="brand-tag">${brand}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${product.notes ? `
                        <div class="product-notes">${product.notes}</div>
                    ` : ''}
                </div>
                
                <div class="product-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="decreaseQuantity('${productId}')" ${quantity <= 0 ? 'disabled' : ''}>-</button>
                        <input type="number" class="quantity-input" value="${quantity}" min="0" 
                               onchange="updateQuantity('${productId}', this.value)" readonly>
                        <button class="quantity-btn" onclick="increaseQuantity('${productId}')">+</button>
                    </div>
                    
                    <button class="add-to-cart" onclick="addToCart('${productId}')" 
                            ${quantity > 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        ${quantity > 0 ? 'कार्टमध्ये आहे' : 'कार्टमध्ये टाका'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add animation to product cards
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('slide-up');
            }, index * 50);
        });
    }, 100);
}

// Generate unique product ID
function generateProductId(product) {
    return `${product.categoryId}-${product.name_en.replace(/\s+/g, '-').toLowerCase()}`;
}

// Pack size selection
function selectPackSize(productId, size, element) {
    // Remove selected class from all pack size buttons for this product
    const packSelector = document.getElementById(`pack-${productId}`);
    packSelector.querySelectorAll('.size-tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    element.classList.add('selected');
    
    // Update the product in cart if it exists
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.selectedPackSize = size;
        updateCartDisplay();
    }
}

// Get selected pack size for a product
function getSelectedPackSize(productId) {
    const packSelector = document.getElementById(`pack-${productId}`);
    if (packSelector) {
        const selectedTag = packSelector.querySelector('.size-tag.selected');
        return selectedTag ? selectedTag.dataset.size : null;
    }
    return null;
}

function addToCart(productId) {
    const product = findProductById(productId);
    if (!product) return;
    
    const selectedPackSize = getSelectedPackSize(productId);
    const cartItemId = `${productId}-${selectedPackSize || 'default'}`;
    
    const existingItem = cart.find(item => item.id === cartItemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: cartItemId,
            originalId: productId,
            product: product,
            selectedPackSize: selectedPackSize,
            quantity: 1,
            price: 0 // Price would be determined at the store
        });
    }
    
    updateCartDisplay();
    renderProducts(); // Re-render to update button states
    showNotification(`उत्पादन कार्टमध्ये जोडले गेले! (${selectedPackSize || 'साइझ निवडला नाही'})`, 'success');
}

function increaseQuantity(productId) {
    const product = findProductById(productId);
    if (!product) return;
    
    const selectedPackSize = getSelectedPackSize(productId) || 'default';
    const cartItemId = `${productId}-${selectedPackSize}`;
    
    const existingItem = cart.find(item => item.id === cartItemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: cartItemId,
            originalId: productId,
            product: product,
            selectedPackSize: selectedPackSize === 'default' ? null : selectedPackSize,
            quantity: 1,
            price: 0
        });
    }
    
    updateCartDisplay();
    updateProductQuantityDisplay(productId);
    
    console.log('Cart after increase:', cart); // Debug line
}

function decreaseQuantity(productId) {
    const selectedPackSize = getSelectedPackSize(productId) || 'default';
    const cartItemId = `${productId}-${selectedPackSize}`;
    
    const existingItem = cart.find(item => item.id === cartItemId);
    if (existingItem) {
        existingItem.quantity -= 1;
        if (existingItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== cartItemId);
        }
    }
    
    updateCartDisplay();
    updateProductQuantityDisplay(productId);
    
    console.log('Cart after decrease:', cart); // Debug line
}

function updateProductQuantityDisplay(productId, cartItemId = null) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (productCard) {
        // Find the relevant cart item
        const selectedPackSize = getSelectedPackSize(productId);
        const actualCartItemId = cartItemId || (selectedPackSize ? `${productId}-${selectedPackSize}` : productId);
        const cartItem = cart.find(item => item.id === actualCartItemId);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        const quantityInput = productCard.querySelector('.quantity-input');
        const decreaseBtn = productCard.querySelector('.quantity-btn:first-child');
        const addToCartBtn = productCard.querySelector('.add-to-cart');
        
        if (quantityInput) quantityInput.value = quantity;
        if (decreaseBtn) decreaseBtn.disabled = quantity <= 0;
        
        if (addToCartBtn) {
            if (quantity > 0) {
                addToCartBtn.disabled = true;
                addToCartBtn.innerHTML = '<i class="fas fa-check"></i> कार्टमध्ये आहे';
                addToCartBtn.classList.add('added');
            } else {
                addToCartBtn.disabled = false;
                addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> कार्टमध्ये टाका';
                addToCartBtn.classList.remove('added');
            }
        }
    }
}
function updateQuantity(productId, newQuantity) {
    const quantity = parseInt(newQuantity) || 0;
    
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const product = findProductById(productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity = quantity;
    } else {
        cart.push({
            id: productId,
            product: product,
            quantity: quantity,
            price: 0
        });
    }
    
    updateCartDisplay();
    updateProductQuantityDisplay(productId);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    renderProducts(); // Re-render to update button states
    showNotification('उत्पादन कार्टमधून काढले गेले!', 'error');
}

function updateProductQuantityDisplay(productId, cartItemId = null) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;
    
    // Get the selected pack size for this product
    const selectedPackSize = getSelectedPackSize(productId);
    
    // Find the correct cart item - check multiple possible IDs
    let cartItem = null;
    let quantity = 0;
    
    if (cartItemId) {
        cartItem = cart.find(item => item.id === cartItemId);
    }
    
    if (!cartItem && selectedPackSize) {
        cartItem = cart.find(item => item.id === `${productId}-${selectedPackSize}`);
    }
    
    if (!cartItem) {
        cartItem = cart.find(item => item.originalId === productId || item.id === productId);
    }
    
    // Calculate total quantity for this product (all pack sizes)
    quantity = cart.filter(item => 
        item.originalId === productId || item.id === productId || 
        (item.originalId && item.originalId === productId)
    ).reduce((total, item) => total + item.quantity, 0);
    
    const quantityInput = productCard.querySelector('.quantity-input');
    const decreaseBtn = productCard.querySelector('.quantity-btn:first-child');
    const addToCartBtn = productCard.querySelector('.add-to-cart');
    
    if (quantityInput) quantityInput.value = quantity;
    if (decreaseBtn) decreaseBtn.disabled = quantity <= 0;
    
    if (addToCartBtn) {
        if (quantity > 0) {
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = '<i class="fas fa-check"></i> कार्टमध्ये आहे';
            addToCartBtn.classList.add('added');
        } else {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> कार्टमध्ये टाका';
            addToCartBtn.classList.remove('added');
        }
    }
}

function findProductById(productId) {
    return allProducts.find(product => generateProductId(product) === productId);
}

// Update cart display
function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartEmpty = document.getElementById('cart-empty');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        cartTotal.textContent = '0';
        checkoutBtn.disabled = true;
        return;
    }
    
    cartItems.style.display = 'block';
    cartEmpty.style.display = 'none';
    checkoutBtn.disabled = false;
    
    cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
        <div class="cart-item-info">
            <div class="cart-item-name">${item.product.name_mr}</div>
            <div class="cart-item-details">
                ${item.product.name_en}
                ${item.selectedPackSize ? `<br><strong>साइझ:</strong> ${item.selectedPackSize}` : ''}
            </div>
        </div>
        
        <div class="cart-item-actions">
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="decreaseQuantity('${item.originalId || item.id}')">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="increaseQuantity('${item.originalId || item.id}')">+</button>
            </div>
            
            <div class="cart-item-total">किमत पुढे</div>
            
            <button class="remove-item" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
`).join('');
    
    // Since we don't have prices, we'll show "किमत दुकानात ठरेल"
    cartTotal.textContent = 'दुकानात ठरेल';
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchSuggestions = document.getElementById('search-suggestions');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                showSearchSuggestions(query);
            } else {
                hideSearchSuggestions();
            }
        }, 300);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    searchBtn.addEventListener('click', performSearch);
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            hideSearchSuggestions();
        }
    });
}

function showSearchSuggestions(query) {
    const searchSuggestions = document.getElementById('search-suggestions');
    const suggestions = allProducts.filter(product => 
        product.name_mr.toLowerCase().includes(query.toLowerCase()) ||
        product.name_en.toLowerCase().includes(query.toLowerCase()) ||
        product.categoryName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    
    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    searchSuggestions.innerHTML = suggestions.map(product => `
        <div class="search-suggestion" onclick="selectSuggestion('${product.name_mr}')">
            <strong>${product.name_mr}</strong>
            <div style="font-size: 0.9em; color: var(--text-secondary);">${product.name_en}</div>
        </div>
    `).join('');
    
    searchSuggestions.style.display = 'block';
}

function hideSearchSuggestions() {
    document.getElementById('search-suggestions').style.display = 'none';
}

function selectSuggestion(productName) {
    document.getElementById('search-input').value = productName;
    hideSearchSuggestions();
    performSearch();
}

function performSearch() {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    hideSearchSuggestions();
    
    if (!query) {
        // If empty search, show explanation bar
        filteredProducts = [];
        currentCategory = '';
        const explanationBar = document.getElementById('explanation-bar');
        const productsSection = document.querySelector('.products-section');
        
        if (explanationBar) {
            explanationBar.style.display = 'block';
            explanationBar.classList.remove('hidden');
        }
        
        if (productsSection) {
            productsSection.style.display = 'none';
            productsSection.classList.remove('visible');
        }
    } else {
        // Hide explanation bar and show products for search
        const explanationBar = document.getElementById('explanation-bar');
        const productsSection = document.querySelector('.products-section');
        
        if (explanationBar) {
            explanationBar.style.display = 'none';
            explanationBar.classList.add('hidden');
        }
        
        if (productsSection) {
            productsSection.style.display = 'block';
            productsSection.classList.add('visible');
        }
        
        filteredProducts = allProducts.filter(product =>
            product.name_mr.toLowerCase().includes(query) ||
            product.name_en.toLowerCase().includes(query) ||
            product.categoryName.toLowerCase().includes(query) ||
            product.subcategoryName.toLowerCase().includes(query) ||
            (product.variants && product.variants.some(variant => 
                variant.toLowerCase().includes(query)
            )) ||
            (product.brands && product.brands.some(brand => 
                brand.toLowerCase().includes(query)
            ))
        );
        currentCategory = '';
        renderProducts();
        
        // Scroll to products section
        document.querySelector('.products-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }
    
    // Update category filter
    document.getElementById('category-filter').value = '';
}

// Filter and sort functions
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    const category = storeData.sections.find(s => s.id === categoryId);
    
    if (category) {
        // Hide explanation bar and show products
        const explanationBar = document.getElementById('explanation-bar');
        const productsSection = document.querySelector('.products-section');
        
        if (explanationBar) {
            explanationBar.style.display = 'none';
            explanationBar.classList.add('hidden');
        }
        
        if (productsSection) {
            productsSection.style.display = 'block';
            productsSection.classList.add('visible');
        }
        
        filteredProducts = allProducts.filter(product => product.categoryId === categoryId);
        document.getElementById('category-filter').value = categoryId;
        document.getElementById('search-input').value = '';
        renderProducts();
        
        // Scroll to products section
        document.querySelector('.products-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
        
        showNotification(`${category.title_mr} श्रेणी निवडली गेली`, 'success');
    }
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    
    if (storeData && storeData.sections) {
        const options = storeData.sections.map(section => 
            `<option value="${section.id}">${section.title_mr}</option>`
        ).join('');
        
        categoryFilter.innerHTML = '<option value="">सर्व श्रेणी</option>' + options;
    }
}

// Event listeners setup
function setupEventListeners() {
    // Category filter
    document.getElementById('category-filter').addEventListener('change', (e) => {
        const categoryId = parseInt(e.target.value);
        if (categoryId) {
            filterByCategory(categoryId);
        } else {
            clearFilters();
        }
    });
    
    // Sort filter
    document.getElementById('sort-filter').addEventListener('change', (e) => {
        const sortBy = e.target.value;
        sortProducts(sortBy);
    });
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
    
    // Cart toggle
    document.getElementById('cart-toggle').addEventListener('click', toggleCart);
    document.getElementById('close-cart').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    
    // Checkout
    document.getElementById('checkout-btn').addEventListener('click', openCheckout);
    document.getElementById('close-checkout').addEventListener('click', closeCheckout);
    document.getElementById('confirm-order').addEventListener('click', confirmOrder);
    
    // Receipt
    document.getElementById('print-receipt').addEventListener('click', printReceipt);
    document.getElementById('close-receipt').addEventListener('click', closeReceipt);
    
    // Explore button
    document.getElementById('explore-btn').addEventListener('click', () => {
        document.querySelector('.products-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    });
    
    // Set minimum date for pickup
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pickup-date').min = today;
    document.getElementById('pickup-date').value = today;
}

function sortProducts(sortBy) {
    switch (sortBy) {
        case 'name':
            filteredProducts.sort((a, b) => a.name_mr.localeCompare(b.name_mr, 'mr'));
            break;
        case 'category':
            filteredProducts.sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'mr'));
            break;
        default:
            break;
    }
    renderProducts();
}

function clearFilters() {
    filteredProducts = [];
    currentCategory = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('sort-filter').value = 'name';
    document.getElementById('search-input').value = '';
    
    // Show explanation bar and hide products
    const explanationBar = document.getElementById('explanation-bar');
    const productsSection = document.querySelector('.products-section');
    
    if (explanationBar) {
        explanationBar.style.display = 'block';
        explanationBar.classList.remove('hidden');
    }
    
    if (productsSection) {
        productsSection.style.display = 'none';
        productsSection.classList.remove('visible');
    }
    
    showNotification('सर्व फिल्टर साफ केले गेले', 'success');
}

// Cart UI functions
function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Checkout functions
function openCheckout() {
    if (cart.length === 0) return;
    
    const checkoutModal = document.getElementById('checkout-modal');
    const orderItems = document.getElementById('order-items');
    const finalTotal = document.getElementById('final-total');
    
    // Populate order summary
    orderItems.innerHTML = cart.map(item => `
        <div class="order-item">
            <span>${item.product.name_mr} x ${item.quantity}</span>
            <span>किमत दुकानात ठरेल</span>
        </div>
    `).join('');
    
    finalTotal.textContent = 'दुकानात ठरेल';
    
    checkoutModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    closeCart();
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Clear form
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('pickup-time').value = '';
}

async function confirmOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const date = document.getElementById('pickup-date').value;
    const time = document.getElementById('pickup-time').value;
    
    if (!name || !phone || !date || !time) {
        showNotification('कृपया सर्व माहिती भरा', 'error');
        return;
    }
    
    if (phone.length !== 10) {
        showNotification('कृपया वैध फोन नंबर टाका (10 अंक)', 'error');
        return;
    }
    
    // Show loading state
    const confirmBtn = document.getElementById('confirm-order');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF तयार करत आहे...';
    confirmBtn.disabled = true;
    
    // Generate order
    const order = {
        id: Date.now(),
        customer: { name, phone },
        pickupDateTime: `${date} ${time}`,
        items: [...cart],
        orderTime: new Date().toLocaleString('mr-IN'),
        status: 'confirmed'
    };
    
    // Send PDF to Telegram
    const pdfSent = await sendPDFToTelegram(order);
    
    if (pdfSent) {
        showNotification('ऑर्डर कन्फर्म झाला! PDF रसीद Telegram वर पाठवली गेली.', 'success');
    } else {
        showNotification('ऑर्डर कन्फर्म झाला! परंतु PDF पाठवण्यात त्रुटी.', 'error');
    }
    
    generateReceipt(order);
    closeCheckout();
    
    // Clear cart
    cart = [];
    updateCartDisplay();
    renderProducts();
    
    // Reset button
    confirmBtn.innerHTML = originalText;
    confirmBtn.disabled = false;
}

// Receipt functions
function generateReceipt(order) {
    const receiptModal = document.getElementById('receipt-modal');
    const receipt = document.getElementById('receipt');
    
    const receiptHTML = `
        <div class="receipt-header">
            <h2>${storeData.store}</h2>
            <p>तुमचे स्थानिक किराणा दुकान</p>
            <p>फोन: +91-XXXXXXXXXX</p>
        </div>
        
        <div class="receipt-info">
            <div><strong>रसीद क्रमांक:</strong> ${order.id}</div>
            <div><strong>दिनांक व वेळ:</strong> ${order.orderTime}</div>
            <div><strong>ग्राहकाचे नाव:</strong> ${order.customer.name}</div>
            <div><strong>फोन नंबर:</strong> ${order.customer.phone}</div>
            <div><strong>पिकअप वेळ:</strong> ${order.pickupDateTime}</div>
        </div>
        
        <div class="receipt-items">
            <div style="border-bottom: 2px solid #000; margin-bottom: 0.5rem; padding-bottom: 0.5rem;">
                <strong>उत्पादने:</strong>
            </div>
            ${order.items.map(item => `
                <div class="receipt-item">
                    <div>
                        ${item.product.name_mr}<br>
                        <small>${item.product.name_en}</small>
                    </div>
                    <div>${item.quantity} x दुकानातील किमत</div>
                </div>
            `).join('')}
        </div>
        
        <div class="receipt-total">
            <div>एकूण: दुकानात ठरेल</div>
        </div>
        
        <div class="receipt-footer">
            <p>धन्यवाद! पुन्हा भेट द्या!</p>
            <p>कृपया वेळेवर उत्पादने घेऊन जा</p>
            <p>* किमत दुकानातील दरानुसार ठरेल *</p>
        </div>
    `;
    
    receipt.innerHTML = receiptHTML;
    receiptModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function printReceipt() {
    window.print();
}

function closeReceipt() {
    document.getElementById('receipt-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Utility functions
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow-medium);
        z-index: 5000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadStoreData();
});

// Handle errors gracefully
window.addEventListener('error', (e) => {
    console.error('Application error:', e);
    hideLoading();
    showNotification('काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.', 'error');
});

// Service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

function showCustomSizeInput(productId, element) {
    // Remove selected class from all pack size buttons
    const packSelector = document.getElementById(`pack-${productId}`);
    packSelector.querySelectorAll('.size-tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    // Add selected class to custom button
    element.classList.add('selected');
    
    // Show custom input
    document.getElementById(`custom-input-${productId}`).style.display = 'block';
    
    // Focus on input
    const input = document.querySelector(`#custom-input-${productId} .custom-size-input`);
    input.focus();
}

function confirmCustomSize(productId) {
    const input = document.querySelector(`#custom-input-${productId} .custom-size-input`);
    const customSize = input.value.trim();
    
    if (!customSize) {
        showNotification('कृपया रक्कम लिहा', 'error');
        return;
    }
    
    // Hide custom input
    document.getElementById(`custom-input-${productId}`).style.display = 'none';
    
    // Update the custom button text
    const customBtn = document.querySelector(`#pack-${productId} .custom-size-btn`);
    customBtn.textContent = customSize;
    customBtn.dataset.size = customSize;
    
    // Update cart item if it exists
    const cartItem = cart.find(item => item.originalId === productId || item.id === productId);
    if (cartItem) {
        cartItem.selectedPackSize = customSize;
        updateCartDisplay();
    }
    
    showNotification(`कस्टम साइझ सेट केला: ${customSize}`, 'success');
}

function cancelCustomSize(productId) {
    // Hide custom input
    document.getElementById(`custom-input-${productId}`).style.display = 'none';
    
    // Reset to first pack size
    const packSelector = document.getElementById(`pack-${productId}`);
    packSelector.querySelectorAll('.size-tag').forEach(tag => {
        tag.classList.remove('selected');
    });
    
    const firstSize = packSelector.querySelector('.size-tag:not(.custom-size-btn)');
    if (firstSize) {
        firstSize.classList.add('selected');
    }
    
    // Reset custom button text
    const customBtn = packSelector.querySelector('.custom-size-btn');
    customBtn.textContent = 'Custom';
    customBtn.dataset.size = 'custom';
}

// PDF Configuration
const PDF_CONFIG = {
    storeName: 'गजानन ट्रेडिंग कंपनी',
    address: 'बस स्टँड समोर, मुख्य रस्ता\nमंठा, जालना - 431504',
    phone: '+91-98765-43210',
    
    // Telegram Bot Config
    telegram: {
        botToken: 'YOUR_BOT_TOKEN',
        chatId: 'YOUR_CHAT_ID'
    }
};

// Function to generate PDF receipt
function generatePDFReceipt(order) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set font for Devanagari (if available)
    doc.setFont('helvetica');
    
    let yPos = 20;
    
    // Store Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(PDF_CONFIG.storeName, 105, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressLines = PDF_CONFIG.address.split('\n');
    addressLines.forEach(line => {
        doc.text(line, 105, yPos, { align: 'center' });
        yPos += 5;
    });
    
    doc.text(`Phone: ${PDF_CONFIG.phone}`, 105, yPos, { align: 'center' });
    
    // Line separator
    yPos += 10;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // Order Details
    doc.setFontSize(10);
    doc.text(`Order ID: ${order.id}`, 20, yPos);
    yPos += 7;
    doc.text(`Date: ${new Date().toLocaleString('en-IN')}`, 20, yPos);
    yPos += 7;
    doc.text(`Customer: ${order.customer.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Phone: ${order.customer.phone}`, 20, yPos);
    yPos += 7;
    doc.text(`Pickup Time: ${order.pickupDateTime}`, 20, yPos);
    
    // Items Header
    yPos += 15;
    doc.line(20, yPos, 190, yPos);
    yPos += 7;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 20, yPos);
    doc.text('Qty', 120, yPos);
    doc.text('Rate', 140, yPos);
    doc.text('Amount', 165, yPos);
    
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    // Items List
    doc.setFont('helvetica', 'normal');
    order.items.forEach(item => {
        const itemName = item.product.name_en + (item.selectedPackSize ? ` (${item.selectedPackSize})` : '');
        
        // Handle long item names
        if (itemName.length > 35) {
            const lines = doc.splitTextToSize(itemName, 90);
            doc.text(lines, 20, yPos);
            yPos += (lines.length * 5);
        } else {
            doc.text(itemName, 20, yPos);
            yPos += 7;
        }
        
        doc.text(item.quantity.toString(), 120, yPos - 7);
        doc.text('_____', 140, yPos - 7);
        doc.text('_____', 165, yPos - 7);
        
        // Dotted line
        for (let x = 20; x < 190; x += 3) {
            doc.circle(x, yPos - 2, 0.2, 'F');
        }
        yPos += 5;
    });
    
    // Total Section
    yPos += 10;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`, 20, yPos);
    yPos += 10;
    doc.text('Total Amount: Rs. _______', 130, yPos);
    
    // Footer
    yPos += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Please call customer to confirm order', 105, yPos, { align: 'center' });
    yPos += 7;
    doc.text('Thank you! Visit again!', 105, yPos, { align: 'center' });
    yPos += 10;
    doc.text('* Fill rates according to your stock *', 105, yPos, { align: 'center' });
    
    return doc;
}

// Function to send PDF via Telegram
async function sendPDFToTelegram(order) {
    try {
        // Generate PDF
        const pdfDoc = generatePDFReceipt(order);
        const pdfBlob = pdfDoc.output('blob');
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        
        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                try {
                    const base64data = reader.result.split(',')[1];
                    
                    // Create FormData for file upload
                    const formData = new FormData();
                    formData.append('chat_id', PDF_CONFIG.telegram.chatId);
                    formData.append('document', pdfBlob, `Order_${order.id}.pdf`);
                    formData.append('caption', `🧾 New Order Receipt\nCustomer: ${order.customer.name}\nPhone: ${order.customer.phone}\nPickup: ${order.pickupDateTime}`);
                    
                    // Send to Telegram
                    const response = await fetch(`https://api.telegram.org/bot${PDF_CONFIG.telegram.botToken}/sendDocument`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.ok) {
                        console.log('PDF sent successfully to Telegram');
                        resolve(true);
                    } else {
                        console.error('Telegram API error:', result);
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error sending PDF:', error);
                    resolve(false);
                }
            };
            
            reader.onerror = () => {
                reject(false);
            };
        });
        
    } catch (error) {
        console.error('PDF generation error:', error);
        return false;
    }
}