#!/usr/bin/env python3
"""
DATA RECONCILIATION TOOL
Compares Excel planning data with API data to identify discrepancies

Usage:
    python data_reconciliation.py --date 2026-02-09 --excel Planningstabel_2_0__2_.xlsx --api-export api_orders_export.csv
"""

import pandas as pd
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
import re

class DataReconciliation:
    def __init__(self, excel_path, api_export_path, date):
        self.excel_path = excel_path
        self.api_export_path = api_export_path
        self.date = date
        self.excel_data = {}
        self.api_data = {}
        
    def load_excel_data(self):
        """Load data from Excel file (Planningstabel format)"""
        print(f"📖 Loading Excel data from {self.excel_path}...")
        
        try:
            # Read evening route sheets
            evening_sheets = {
                'Avond. Aalsmeer': 'aalsmeer_evening',
                'Avond. Naaldwijk': 'naaldwijk_evening',
                'Avond. Rijnsburg': 'rijnsburg_evening'
            }
            
            xls = pd.ExcelFile(self.excel_path)
            print(f"   Available sheets: {xls.sheet_names}")
            
            for sheet_name, route_key in evening_sheets.items():
                if sheet_name in xls.sheet_names:
                    df = pd.read_excel(self.excel_path, sheet_name=sheet_name)
                    self.excel_data[route_key] = df
                    print(f"   ✅ Loaded {sheet_name}: {len(df)} rows")
                else:
                    print(f"   ⚠️  Sheet '{sheet_name}' not found")
                    self.excel_data[route_key] = pd.DataFrame()
            
            # Also try morning routes if needed
            morning_sheets = {
                'Rijnsburg': 'rijnsburg_morning',
                'Aalsmeer': 'aalsmeer_morning',
                'Naaldwijk': 'naaldwijk_morning'
            }
            
            for sheet_name, route_key in morning_sheets.items():
                if sheet_name in xls.sheet_names:
                    df = pd.read_excel(self.excel_path, sheet_name=sheet_name)
                    self.excel_data[route_key] = df
                    print(f"   ✅ Loaded {sheet_name}: {len(df)} rows")
                    
        except Exception as e:
            print(f"❌ Error loading Excel: {e}")
            raise
    
    def load_api_data(self):
        """Load data from API export (CSV or Excel)"""
        print(f"📖 Loading API data from {self.api_export_path}...")
        
        try:
            path = Path(self.api_export_path)
            
            if path.suffix == '.csv':
                # Load all data
                df_all = pd.read_csv(self.api_export_path)
                
                # Group by route
                for route_key in ['rijnsburg_morning', 'aalsmeer_morning', 'naaldwijk_morning',
                                 'rijnsburg_evening', 'aalsmeer_evening', 'naaldwijk_evening']:
                    route_df = df_all[df_all['Route Key'] == route_key].copy()
                    self.api_data[route_key] = route_df
                    print(f"   ✅ {route_key}: {len(route_df)} orders")
                    
            elif path.suffix in ['.xlsx', '.xls']:
                # Load from Excel sheets
                xls = pd.ExcelFile(self.api_export_path)
                sheet_mapping = {
                    'Rijnsburg Morning': 'rijnsburg_morning',
                    'Aalsmeer Morning': 'aalsmeer_morning',
                    'Naaldwijk Morning': 'naaldwijk_morning',
                    'Rijnsburg Evening': 'rijnsburg_evening',
                    'Aalsmeer Evening': 'aalsmeer_evening',
                    'Naaldwijk Evening': 'naaldwijk_evening',
                    'Unmatched Orders': 'unmatched'
                }
                
                for sheet_name, route_key in sheet_mapping.items():
                    if sheet_name in xls.sheet_names:
                        df = pd.read_excel(self.api_export_path, sheet_name=sheet_name)
                        self.api_data[route_key] = df
                        print(f"   ✅ {sheet_name}: {len(df)} orders")
            else:
                raise ValueError(f"Unsupported file format: {path.suffix}")
                
        except Exception as e:
            print(f"❌ Error loading API data: {e}")
            raise
    
    def normalize_customer_name(self, name):
        """Normalize customer name for comparison"""
        if pd.isna(name) or name == '':
            return ''
        
        name = str(name).lower().strip()
        # Remove common suffixes
        name = re.sub(r'\s+(bv|b\.v\.|vof|v\.o\.f\.|gmbh|webshop|retail|export)\s*$', '', name)
        # Remove punctuation
        name = re.sub(r'[^\w\s]', ' ', name)
        # Normalize whitespace
        name = re.sub(r'\s+', ' ', name)
        return name.strip()
    
    def extract_customers_from_excel(self, df, route_key):
        """Extract customer names from Excel sheet"""
        customers = set()
        
        # Try common column names
        customer_columns = ['Klant', 'Customer', 'Client', 'Naam', 'Name', 'Customer Name']
        
        for col in df.columns:
            col_lower = str(col).lower()
            if any(term in col_lower for term in ['klant', 'customer', 'client', 'naam', 'name']):
                # Get unique non-empty values
                unique_values = df[col].dropna().unique()
                for val in unique_values:
                    normalized = self.normalize_customer_name(val)
                    if normalized:
                        customers.add(normalized)
        
        # If no customer column found, use first column (usually customer names)
        if len(customers) == 0 and len(df.columns) > 0:
            first_col = df.columns[0]
            unique_values = df[first_col].dropna().unique()
            for val in unique_values:
                normalized = self.normalize_customer_name(val)
                if normalized:
                    customers.add(normalized)
        
        return customers
    
    def compare_route(self, route_key):
        """Compare Excel vs API data for a specific route"""
        excel_df = self.excel_data.get(route_key, pd.DataFrame())
        api_df = self.api_data.get(route_key, pd.DataFrame())
        
        # Extract customers
        excel_customers = self.extract_customers_from_excel(excel_df, route_key)
        api_customers = set()
        
        if 'Customer Name' in api_df.columns:
            api_customers = set(
                self.normalize_customer_name(name) 
                for name in api_df['Customer Name'].dropna().unique()
            )
        
        # Count orders
        excel_order_count = len(excel_df)
        api_order_count = len(api_df)
        
        # Find differences
        missing_in_api = excel_customers - api_customers
        extra_in_api = api_customers - excel_customers
        common = excel_customers & api_customers
        
        return {
            'route': route_key,
            'excel_orders': excel_order_count,
            'api_orders': api_order_count,
            'excel_customers': len(excel_customers),
            'api_customers': len(api_customers),
            'common_customers': len(common),
            'missing_in_api': missing_in_api,
            'extra_in_api': extra_in_api,
            'order_diff': api_order_count - excel_order_count,
            'customer_diff': len(api_customers) - len(excel_customers)
        }
    
    def generate_report(self, output_path='reconciliation_report.xlsx'):
        """Generate comprehensive reconciliation report"""
        print("\n📊 Generating reconciliation report...")
        
        comparisons = []
        details = []
        
        # Compare each route
        routes = [
            'rijnsburg_morning', 'aalsmeer_morning', 'naaldwijk_morning',
            'rijnsburg_evening', 'aalsmeer_evening', 'naaldwijk_evening'
        ]
        
        for route_key in routes:
            comp = self.compare_route(route_key)
            comparisons.append(comp)
            
            # Add details
            if comp['missing_in_api']:
                for customer in comp['missing_in_api']:
                    details.append({
                        'Route': route_key,
                        'Issue': 'Missing in API',
                        'Customer': customer,
                        'Excel Orders': comp['excel_orders'],
                        'API Orders': comp['api_orders']
                    })
            
            if comp['extra_in_api']:
                for customer in comp['extra_in_api']:
                    details.append({
                        'Route': route_key,
                        'Issue': 'Extra in API',
                        'Customer': customer,
                        'Excel Orders': comp['excel_orders'],
                        'API Orders': comp['api_orders']
                    })
        
        # Create summary DataFrame
        summary_data = []
        for comp in comparisons:
            status = '✅ MATCH' if comp['order_diff'] == 0 else '❌ MISMATCH'
            summary_data.append({
                'Route': comp['route'],
                'Excel Orders': comp['excel_orders'],
                'API Orders': comp['api_orders'],
                'Difference': comp['order_diff'],
                'Excel Customers': comp['excel_customers'],
                'API Customers': comp['api_customers'],
                'Common Customers': comp['common_customers'],
                'Missing in API': len(comp['missing_in_api']),
                'Extra in API': len(comp['extra_in_api']),
                'Status': status
            })
        
        # Write to Excel
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Summary sheet
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Details sheet
            if details:
                details_df = pd.DataFrame(details)
                details_df.to_excel(writer, sheet_name='Details', index=False)
            
            # Per-route comparisons
            for comp in comparisons:
                if comp['missing_in_api'] or comp['extra_in_api']:
                    route_details = []
                    if comp['missing_in_api']:
                        route_details.extend([
                            {'Type': 'Missing in API', 'Customer': c} 
                            for c in comp['missing_in_api']
                        ])
                    if comp['extra_in_api']:
                        route_details.extend([
                            {'Type': 'Extra in API', 'Customer': c} 
                            for c in comp['extra_in_api']
                        ])
                    
                    if route_details:
                        route_df = pd.DataFrame(route_details)
                        sheet_name = comp['route'].replace('_', ' ').title()[:31]  # Excel sheet name limit
                        route_df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        print(f"✅ Report saved to {output_path}")
        
        # Print summary
        print("\n" + "="*80)
        print("RECONCILIATION SUMMARY")
        print("="*80)
        for comp in comparisons:
            status_icon = '✅' if comp['order_diff'] == 0 else '❌'
            print(f"{status_icon} {comp['route']:25} | Excel: {comp['excel_orders']:3} | API: {comp['api_orders']:3} | Diff: {comp['order_diff']:+3}")
            if comp['missing_in_api']:
                print(f"   Missing in API ({len(comp['missing_in_api'])}): {', '.join(list(comp['missing_in_api'])[:5])}")
            if comp['extra_in_api']:
                print(f"   Extra in API ({len(comp['extra_in_api'])}): {', '.join(list(comp['extra_in_api'])[:5])}")
        
        return output_path

def main():
    parser = argparse.ArgumentParser(description='Reconcile Excel and API data')
    parser.add_argument('--excel', required=True, help='Path to Excel planning file')
    parser.add_argument('--api-export', required=True, help='Path to API export CSV/Excel file')
    parser.add_argument('--date', required=True, help='Date in YYYY-MM-DD format')
    parser.add_argument('--output', default='reconciliation_report.xlsx', help='Output report file')
    
    args = parser.parse_args()
    
    print("="*80)
    print("DATA RECONCILIATION TOOL")
    print("="*80)
    print(f"Date: {args.date}")
    print(f"Excel: {args.excel}")
    print(f"API Export: {args.api_export}")
    print("="*80)
    print()
    
    try:
        reconciler = DataReconciliation(args.excel, args.api_export, args.date)
        reconciler.load_excel_data()
        reconciler.load_api_data()
        reconciler.generate_report(args.output)
        
        print("\n✅ Reconciliation complete!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

