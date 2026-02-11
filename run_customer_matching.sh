#!/bin/bash
# Quick-start script for customer matching workflow

echo "=========================================="
echo "CUSTOMER MATCHING WORKFLOW"
echo "=========================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    exit 1
fi

# Check if required packages are installed
echo "🔍 Checking dependencies..."
python3 -c "import pandas, openpyxl" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Missing dependencies. Installing..."
    pip install pandas openpyxl
fi

python3 -c "import rapidfuzz" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  rapidfuzz not found. Installing..."
    pip install rapidfuzz
fi

echo "✅ Dependencies OK"
echo ""

# Get file paths
read -p "Enter API export CSV path: " API_FILE
read -p "Enter Excel file path: " EXCEL_FILE
read -p "Enter date (YYYY-MM-DD): " DATE

# Validate files
if [ ! -f "$API_FILE" ]; then
    echo "❌ Error: API file not found: $API_FILE"
    exit 1
fi

if [ ! -f "$EXCEL_FILE" ]; then
    echo "❌ Error: Excel file not found: $EXCEL_FILE"
    exit 1
fi

echo ""
echo "=========================================="
echo "STEP 1: Fuzzy Matching"
echo "=========================================="
python3 fuzzy_match_customers.py \
    --api "$API_FILE" \
    --excel "$EXCEL_FILE" \
    --output "customer_mapping_${DATE}.csv"

if [ $? -ne 0 ]; then
    echo "❌ Matching failed"
    exit 1
fi

echo ""
echo "✅ Matching complete! Review customer_mapping_${DATE}.csv"
echo ""
read -p "Press Enter to continue to Step 2..."

echo ""
echo "=========================================="
echo "STEP 2: Update Excel"
echo "=========================================="
read -p "Update Excel file? (yes/no): " UPDATE_CHOICE

if [ "$UPDATE_CHOICE" = "yes" ]; then
    OUTPUT_FILE="${EXCEL_FILE%.xlsx}_UPDATED_${DATE}.xlsx"
    
    python3 update_excel_customers.py \
        --excel "$EXCEL_FILE" \
        --mapping "customer_mapping_${DATE}.csv" \
        --output "$OUTPUT_FILE"
    
    if [ $? -ne 0 ]; then
        echo "❌ Update failed"
        exit 1
    fi
    
    echo ""
    echo "✅ Excel updated! Saved to: $OUTPUT_FILE"
    
    echo ""
    echo "=========================================="
    echo "STEP 3: Generate Report"
    echo "=========================================="
    read -p "Generate reconciliation report? (yes/no): " REPORT_CHOICE
    
    if [ "$REPORT_CHOICE" = "yes" ]; then
        python3 generate_reconciliation_report.py \
            --api "$API_FILE" \
            --excel-before "$EXCEL_FILE" \
            --excel-after "$OUTPUT_FILE" \
            --output "reconciliation_report_${DATE}.xlsx"
        
        if [ $? -eq 0 ]; then
            echo "✅ Report generated: reconciliation_report_${DATE}.xlsx"
        fi
    fi
else
    echo "⏭️  Skipping Excel update"
fi

echo ""
echo "=========================================="
echo "✅ WORKFLOW COMPLETE!"
echo "=========================================="
echo ""
echo "Files created:"
echo "  - customer_mapping_${DATE}.csv"
if [ "$UPDATE_CHOICE" = "yes" ]; then
    echo "  - ${OUTPUT_FILE}"
    if [ "$REPORT_CHOICE" = "yes" ]; then
        echo "  - reconciliation_report_${DATE}.xlsx"
    fi
fi
echo ""

