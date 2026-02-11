#!/usr/bin/env python3
"""
FUZZY CUSTOMER MATCHING SCRIPT
Matches API customer names with Excel customer names using fuzzy string matching

Usage:
    python fuzzy_match_customers.py --api api_orders_export.csv --excel Planningstabel_2_0__2_.xlsx --output customer_mapping.csv
"""

import pandas as pd
import argparse
import re
from pathlib import Path
from collections import defaultdict
import json

try:
    from rapidfuzz import fuzz, process
    USE_RAPIDFUZZ = True
except ImportError:
    try:
        from fuzzywuzzy import fuzz, process
        USE_RAPIDFUZZ = False
    except ImportError:
        print("⚠️  Warning: Neither rapidfuzz nor fuzzywuzzy installed. Using basic matching.")
        print("   Install with: pip install rapidfuzz (recommended) or pip install fuzzywuzzy")
        USE_RAPIDFUZZ = None

class CustomerMatcher:
    def __init__(self):
        self.api_customers = {}
        self.excel_customers = {}
        self.matches = []
        self.unmatched_api = []
        self.unmatched_excel = []
        
    def normalize_name(self, name):
        """Normalize customer name for comparison"""
        if pd.isna(name) or name == '':
            return ''
        
        name = str(name).strip()
        
        # Remove extra whitespace
        name = ' '.join(name.split())
        
        # Common replacements
        name = name.replace('&', 'en')
        name = name.replace('.', '')
        name = name.replace(',', '')
        name = name.replace('-', ' ')
        name = name.replace('/', ' ')
        
        # Remove common suffixes (for base name comparison)
        name = re.sub(r'\s+(bv|b\.v\.|vof|v\.o\.f\.|gmbh|webshop|retail|export|holland)\s*$', '', name, flags=re.IGNORECASE)
        
        # Lowercase for comparison
        return name.lower().strip()
    
    def get_base_name(self, name):
        """Get base name without location/variant suffixes"""
        normalized = self.normalize_name(name)
        
        # Remove location indicators
        normalized = re.sub(r'\s+(naaldwijk|aalsmeer|rijnsburg|villa|klondike|koolhaas|houter|zuidplas)\s*$', '', normalized, flags=re.IGNORECASE)
        
        return normalized
    
    def load_api_customers(self, api_path):
        """Load customers from API export CSV"""
        print("🔍 Reading API export...")
        
        df = pd.read_csv(api_path)
        
        # Group by route and get unique customers
        route_customers = defaultdict(set)
        
        for _, row in df.iterrows():
            customer = str(row.get('Customer Name', '')).strip()
            route_key = str(row.get('Route Key', '')).strip()
            
            if customer and customer != 'nan' and customer != 'Unknown':
                route_customers[route_key].add(customer)
        
        # Convert to dict
        for route_key, customers in route_customers.items():
            self.api_customers[route_key] = sorted(list(customers))
            print(f"   {route_key}: {len(customers)} unique customers")
        
        total = sum(len(c) for c in self.api_customers.values())
        print(f"✅ Found {total} total unique customers in API")
        return self.api_customers
    
    def load_excel_customers(self, excel_path):
        """Load customers from Excel file"""
        print("\n🔍 Reading Excel file...")
        
        evening_sheets = {
            'Avond. Aalsmeer': 'aalsmeer_evening',
            'Avond. Naaldwijk': 'naaldwijk_evening',
            'Avond. Rijnsburg': 'rijnsburg_evening'
        }
        
        xls = pd.ExcelFile(excel_path)
        
        for sheet_name, route_key in evening_sheets.items():
            if sheet_name not in xls.sheet_names:
                print(f"   ⚠️  Sheet '{sheet_name}' not found")
                self.excel_customers[route_key] = []
                continue
            
            df = pd.read_excel(excel_path, sheet_name=sheet_name)
            
            # Find customer name column (usually column B or first text column)
            customer_col = None
            for col in df.columns:
                col_lower = str(col).lower()
                if any(term in col_lower for term in ['klant', 'customer', 'client', 'naam', 'name']):
                    customer_col = col
                    break
            
            # If no customer column found, use first column
            if customer_col is None and len(df.columns) > 0:
                customer_col = df.columns[0]
            
            if customer_col:
                customers = df[customer_col].dropna().unique()
                customers = [str(c).strip() for c in customers if str(c).strip() and str(c).strip().lower() != 'nan']
                self.excel_customers[route_key] = sorted(customers)
                print(f"   {sheet_name}: {len(customers)} customers")
            else:
                self.excel_customers[route_key] = []
                print(f"   ⚠️  {sheet_name}: No customer column found")
        
        total = sum(len(c) for c in self.excel_customers.values())
        print(f"✅ Found {total} total unique customers in Excel")
        return self.excel_customers
    
    def fuzzy_match(self, excel_name, api_names, threshold=70):
        """Find best fuzzy match for Excel name in API names"""
        if not api_names:
            return None, 0
        
        if USE_RAPIDFUZZ:
            # Use rapidfuzz (faster, better)
            result = process.extractOne(
                excel_name,
                api_names,
                scorer=fuzz.WRatio,
                score_cutoff=threshold
            )
            if result:
                return result[0], result[1]
        elif USE_RAPIDFUZZ is False:
            # Use fuzzywuzzy (slower but works)
            result = process.extractOne(
                excel_name,
                api_names,
                scorer=fuzz.WRatio
            )
            if result and result[1] >= threshold:
                return result[0], result[1]
        else:
            # Basic matching (fallback)
            excel_normalized = self.normalize_name(excel_name)
            best_match = None
            best_score = 0
            
            for api_name in api_names:
                api_normalized = self.normalize_name(api_name)
                
                # Simple similarity
                if excel_normalized in api_normalized or api_normalized in excel_normalized:
                    score = 90  # High score for substring match
                elif self.get_base_name(excel_name) == self.get_base_name(api_name):
                    score = 85  # High score for base name match
                else:
                    # Simple character overlap
                    excel_chars = set(excel_normalized)
                    api_chars = set(api_normalized)
                    if excel_chars and api_chars:
                        score = len(excel_chars & api_chars) / len(excel_chars | api_chars) * 100
                    else:
                        score = 0
                
                if score > best_score:
                    best_score = score
                    best_match = api_name
            
            if best_score >= threshold:
                return best_match, best_score
        
        return None, 0
    
    def match_customers(self, threshold_high=90, threshold_medium=70):
        """Perform fuzzy matching between Excel and API customers"""
        print("\n🔄 Performing fuzzy matching...")
        
        all_matches = []
        
        # Match for each route
        for route_key in ['aalsmeer_evening', 'naaldwijk_evening', 'rijnsburg_evening']:
            excel_customers = self.excel_customers.get(route_key, [])
            api_customers = self.api_customers.get(route_key, [])
            
            print(f"\n   Matching {route_key}...")
            print(f"      Excel: {len(excel_customers)} customers")
            print(f"      API: {len(api_customers)} customers")
            
            # Track matched API customers
            matched_api = set()
            
            # Match each Excel customer
            for excel_name in excel_customers:
                match_name, score = self.fuzzy_match(excel_name, api_customers, threshold_medium)
                
                if match_name:
                    matched_api.add(match_name)
                    confidence = 'HIGH' if score >= threshold_high else 'MEDIUM' if score >= threshold_medium else 'LOW'
                    
                    # Determine action
                    if score >= threshold_high:
                        action = 'UPDATE_EXCEL'
                        notes = f"High confidence match ({score:.1f}%)"
                    elif score >= threshold_medium:
                        action = 'REVIEW'
                        notes = f"Medium confidence match ({score:.1f}%) - review needed"
                    else:
                        action = 'MANUAL_REVIEW'
                        notes = f"Low confidence match ({score:.1f}%) - manual review required"
                    
                    all_matches.append({
                        'Route': route_key,
                        'Excel_Name': excel_name,
                        'API_Name': match_name,
                        'Match_Score': f"{score:.1f}%",
                        'Confidence': confidence,
                        'Action': action,
                        'Notes': notes
                    })
                else:
                    # No match found
                    all_matches.append({
                        'Route': route_key,
                        'Excel_Name': excel_name,
                        'API_Name': '',
                        'Match_Score': '0%',
                        'Confidence': 'NONE',
                        'Action': 'NOT_IN_API',
                        'Notes': 'Customer exists in Excel but not found in API'
                    })
            
            # Find unmatched API customers
            unmatched_api = [c for c in api_customers if c not in matched_api]
            for api_name in unmatched_api:
                all_matches.append({
                    'Route': route_key,
                    'Excel_Name': '',
                    'API_Name': api_name,
                    'Match_Score': '0%',
                    'Confidence': 'NONE',
                    'Action': 'ADD_TO_EXCEL',
                    'Notes': 'Customer exists in API but not in Excel - needs to be added'
                })
            
            print(f"      Matched: {len(matched_api)}/{len(excel_customers)} Excel customers")
            print(f"      Unmatched API: {len(unmatched_api)} customers")
        
        self.matches = all_matches
        return all_matches
    
    def generate_summary(self):
        """Generate summary statistics"""
        df = pd.DataFrame(self.matches)
        
        summary = {
            'total_matches': len(df),
            'high_confidence': len(df[df['Confidence'] == 'HIGH']),
            'medium_confidence': len(df[df['Confidence'] == 'MEDIUM']),
            'low_confidence': len(df[df['Confidence'] == 'LOW']),
            'not_in_api': len(df[df['Action'] == 'NOT_IN_API']),
            'add_to_excel': len(df[df['Action'] == 'ADD_TO_EXCEL']),
            'update_excel': len(df[df['Action'] == 'UPDATE_EXCEL']),
            'needs_review': len(df[df['Action'].isin(['REVIEW', 'MANUAL_REVIEW'])])
        }
        
        return summary
    
    def save_mapping(self, output_path):
        """Save mapping to CSV"""
        df = pd.DataFrame(self.matches)
        df.to_csv(output_path, index=False)
        print(f"\n💾 Saved mapping to: {output_path}")
        return output_path

def main():
    parser = argparse.ArgumentParser(description='Fuzzy match customers between API and Excel')
    parser.add_argument('--api', required=True, help='Path to API export CSV')
    parser.add_argument('--excel', required=True, help='Path to Excel file')
    parser.add_argument('--output', default='customer_mapping.csv', help='Output mapping CSV')
    parser.add_argument('--threshold-high', type=float, default=90, help='High confidence threshold (default: 90)')
    parser.add_argument('--threshold-medium', type=float, default=70, help='Medium confidence threshold (default: 70)')
    
    args = parser.parse_args()
    
    print("="*80)
    print("FUZZY CUSTOMER MATCHING TOOL")
    print("="*80)
    print()
    
    # Validate files
    if not Path(args.api).exists():
        print(f"❌ Error: API file not found: {args.api}")
        return 1
    
    if not Path(args.excel).exists():
        print(f"❌ Error: Excel file not found: {args.excel}")
        return 1
    
    # Create matcher
    matcher = CustomerMatcher()
    
    # Load data
    matcher.load_api_customers(args.api)
    matcher.load_excel_customers(args.excel)
    
    # Perform matching
    matches = matcher.match_customers(args.threshold_high, args.threshold_medium)
    
    # Generate summary
    summary = matcher.generate_summary()
    
    print("\n" + "="*80)
    print("MATCHING SUMMARY")
    print("="*80)
    print(f"Total matches found: {summary['total_matches']}")
    print(f"  ✅ High confidence (≥{args.threshold_high}%): {summary['high_confidence']}")
    print(f"  ⚠️  Medium confidence (≥{args.threshold_medium}%): {summary['medium_confidence']}")
    print(f"  ⚠️  Low confidence (<{args.threshold_medium}%): {summary['low_confidence']}")
    print(f"  ❌ Not in API: {summary['not_in_api']}")
    print(f"  ➕ Add to Excel: {summary['add_to_excel']}")
    print(f"  🔄 Update Excel: {summary['update_excel']}")
    print(f"  👀 Needs review: {summary['needs_review']}")
    print("="*80)
    
    # Save mapping
    matcher.save_mapping(args.output)
    
    print("\n✅ Matching complete!")
    print(f"📋 Review the mapping file: {args.output}")
    print("   - High confidence matches can be auto-updated")
    print("   - Medium/Low confidence matches need manual review")
    print("   - 'ADD_TO_EXCEL' customers need to be added to Excel")
    print("   - 'NOT_IN_API' customers exist in Excel but not in API")
    
    return 0

if __name__ == '__main__':
    exit(main())

