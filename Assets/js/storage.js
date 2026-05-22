// Load  products into localStorage once
async function initInventory() {
    const response = await fetch('./grocerylist.json');
    const data = await response.json();
    // Flatten categories into a single array for easier searching
    const flatInventory = data.flatMap(cat => cat.products.map(p => ({
        ...p,
        category: cat.category_name
    })));
    localStorage.setItem('inventory', JSON.stringify(flatInventory));
}

//======json data is accessible as a single list=====

function getFlattenedProducts(data) {
    return data.flatMap(cat => 
        cat.products.map(p => ({
            ...p,
            category: cat.category_name
        }))
    );
}

// Assume data is loaded from your JSON
async function loadInventory() {
    const response = await fetch('./grocerylist.json');
    const data = await response.json();
    const flatInventory = getFlattenedProducts(data);
    localStorage.setItem('inventory', JSON.stringify(flatInventory));
    renderTable(flatInventory);
}