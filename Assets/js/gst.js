const GST_RATES = {

    'Grains & Staples': 5,
    'Dairy & Breakfast': 5,
    'Spices & Oils': 12,
    'Snacks & Sweets': 18,
    'Beverages': 18,
    'Frozen Foods': 12,
    'Canned Foods': 12,
    'Personal Care': 18,
    'Household': 18,
    'Fresh Produce': 0
};

function calculateGST(price, gstRate) {

    return (price * gstRate) / 100;
}