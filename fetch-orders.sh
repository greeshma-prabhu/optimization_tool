#!/bin/bash

###############################################################################
# Florinet API - Fetch Orders Script
# 
# Purpose: Fetch all orders for a specific date from Florinet API
# Usage: ./fetch-orders.sh [DATE]
# 
# Examples:
#   ./fetch-orders.sh                    # Fetch today's orders
#   ./fetch-orders.sh 09-02-2026         # Fetch specific date (dd-mm-yyyy)
#   ./fetch-orders.sh today              # Fetch today's orders
#   ./fetch-orders.sh yesterday          # Fetch yesterday's orders
#   ./fetch-orders.sh tomorrow           # Fetch tomorrow's orders
#
# Output: orders_YYYY-MM-DD.json
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_BASE="https://summit.florinet.nl/api/v1"
API_USERNAME="JeroenMainfact"
API_PASSWORD='&WWpxaM@#'

# Parse date argument
parse_date() {
    local input="$1"
    
    if [ -z "$input" ] || [ "$input" = "today" ]; then
        # Today
        date +"%d-%m-%Y"
    elif [ "$input" = "yesterday" ]; then
        # Yesterday
        date -d "yesterday" +"%d-%m-%Y" 2>/dev/null || date -v-1d +"%d-%m-%Y" 2>/dev/null
    elif [ "$input" = "tomorrow" ]; then
        # Tomorrow
        date -d "tomorrow" +"%d-%m-%Y" 2>/dev/null || date -v+1d +"%d-%m-%Y" 2>/dev/null
    else
        # Assume it's already in dd-mm-yyyy format
        echo "$input"
    fi
}

# Convert dd-mm-yyyy to yyyy-mm-dd for filename
to_filename_date() {
    local dd_mm_yyyy="$1"
    local day="${dd_mm_yyyy:0:2}"
    local month="${dd_mm_yyyy:3:2}"
    local year="${dd_mm_yyyy:6:4}"
    echo "${year}-${month}-${day}"
}

# Main script
main() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  FLORINET API - FETCH ORDERS                              ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Parse target date
    TARGET_DATE=$(parse_date "$1")
    FILENAME_DATE=$(to_filename_date "$TARGET_DATE")
    OUTPUT_FILE="orders_${FILENAME_DATE}.json"
    
    echo -e "${BLUE}📅 Target Date:${NC} $TARGET_DATE"
    echo -e "${BLUE}💾 Output File:${NC} $OUTPUT_FILE"
    echo ""
    
    # Step 1: Authentication
    echo -e "${YELLOW}Step 1: Authenticating...${NC}"
    
    AUTH_RESPONSE=$(curl -s -X POST \
        "${API_BASE}/authenticate" \
        -H 'Content-Type: application/json' \
        -H 'Accept: application/json' \
        -d "{
            \"username\": \"${API_USERNAME}\",
            \"password\": \"${API_PASSWORD}\"
        }")
    
    # Extract token
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Authentication failed!${NC}"
        echo "Response: $AUTH_RESPONSE"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Authentication successful${NC}"
    echo -e "   Token: ${TOKEN:0:30}..."
    echo ""
    
    # Step 2: Fetch Orders
    echo -e "${YELLOW}Step 2: Fetching orders...${NC}"
    echo -e "${YELLOW}⏳ This may take 1-5 minutes depending on order volume...${NC}"
    echo ""
    
    # Show progress
    START_TIME=$(date +%s)
    
    HTTP_CODE=$(curl -w "%{http_code}" \
        --progress-bar \
        -X GET \
        "${API_BASE}/external/orderrows?deliveryStartDate=${TARGET_DATE}&deliveryEndDate=${TARGET_DATE}&slim=1" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H 'Accept: application/json' \
        -H 'Content-Type: application/json' \
        --max-time 300 \
        -o "$OUTPUT_FILE")
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    
    # Check response
    if [ "$HTTP_CODE" = "200" ]; then
        # Success
        FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        
        # Count orders using basic text parsing (works even if JSON is incomplete)
        ORDER_COUNT=$(grep -o '"id":' "$OUTPUT_FILE" | wc -l | tr -d ' ')
        
        echo -e "${GREEN}✅ Successfully fetched orders!${NC}"
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}📊 SUMMARY${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "Date:           $TARGET_DATE"
        echo -e "File:           $OUTPUT_FILE"
        echo -e "File Size:      $FILE_SIZE"
        echo -e "Orderrows:      ~$ORDER_COUNT"
        echo -e "Duration:       ${DURATION}s"
        echo -e "HTTP Code:      $HTTP_CODE"
        echo ""
        
        # Try to parse JSON and get exact count
        if command -v node &> /dev/null; then
            EXACT_COUNT=$(node -e "
                try {
                    const fs = require('fs');
                    const data = JSON.parse(fs.readFileSync('$OUTPUT_FILE', 'utf8'));
                    console.log(data.length);
                } catch(e) {
                    console.log('N/A');
                }
            " 2>/dev/null)
            
            if [ "$EXACT_COUNT" != "N/A" ]; then
                # Count unique orders
                UNIQUE_ORDERS=$(node -e "
                    const fs = require('fs');
                    const data = JSON.parse(fs.readFileSync('$OUTPUT_FILE', 'utf8'));
                    const uniqueIds = new Set();
                    data.forEach(row => {
                        const id = row.order_id || row.order?.id || row.id;
                        if (id) uniqueIds.add(String(id));
                    });
                    console.log(uniqueIds.size);
                " 2>/dev/null)
                
                echo -e "${GREEN}✅ JSON Validation: Valid${NC}"
                echo -e "Total Orderrows:    $EXACT_COUNT"
                echo -e "Unique Orders:      $UNIQUE_ORDERS"
                echo ""
            fi
        fi
        
        echo -e "${GREEN}💾 Orders saved to: $OUTPUT_FILE${NC}"
        echo ""
        
    elif [ "$HTTP_CODE" = "401" ]; then
        echo -e "${RED}❌ Authentication error (401)${NC}"
        echo "Token may have expired. Try again."
        exit 1
        
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ Request timeout or connection error${NC}"
        echo "The API took too long to respond (>5 minutes)"
        echo "This usually means there are A LOT of orders for this date."
        echo ""
        echo "Try:"
        echo "  1. Increase --max-time to 600 (10 minutes) in the script"
        echo "  2. Check network connection"
        echo "  3. Try a different date with fewer orders"
        exit 1
        
    else
        echo -e "${RED}❌ Request failed with HTTP code: $HTTP_CODE${NC}"
        echo ""
        echo "Response preview:"
        head -n 20 "$OUTPUT_FILE"
        exit 1
    fi
}

# Show usage if --help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Florinet API - Fetch Orders Script"
    echo ""
    echo "Usage: $0 [DATE]"
    echo ""
    echo "DATE formats:"
    echo "  (none)           Fetch today's orders"
    echo "  today            Fetch today's orders"
    echo "  yesterday        Fetch yesterday's orders"
    echo "  tomorrow         Fetch tomorrow's orders"
    echo "  dd-mm-yyyy       Fetch specific date (e.g., 09-02-2026)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Today's orders"
    echo "  $0 today              # Today's orders"
    echo "  $0 yesterday          # Yesterday's orders"
    echo "  $0 09-02-2026         # Feb 9, 2026 orders"
    echo ""
    echo "Output:"
    echo "  orders_YYYY-MM-DD.json"
    echo ""
    exit 0
fi

# Run main function
main "$1"

