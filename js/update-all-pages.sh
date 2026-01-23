#!/bin/bash
# Script to update all HTML pages with new top navigation

PAGES=("orders.html" "optimization.html" "trucks.html" "cart-loading.html" "costs.html")
PAGE_NAMES=("orders" "optimization" "trucks" "cart-loading" "costs")

for i in "${!PAGES[@]}"; do
    PAGE="${PAGES[$i]}"
    PAGE_NAME="${PAGE_NAMES[$i]}"
    echo "Updating $PAGE..."
done


