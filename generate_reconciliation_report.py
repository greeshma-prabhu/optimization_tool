#!/usr/bin/env python3
"""
RECONCILIATION REPORT GENERATOR
Generates before/after comparison report

Usage:
    python generate_reconciliation_report.py --api api_orders_export.csv --excel-before Planningstabel_2_0__2_.xlsx --excel-after Planningstabel_2_0__2_UPDATED.xlsx --output reconciliation_report.xlsx
"""

import pandas as pd
import argparse
from pathlib import Path
from collections import defaultdict

class ReconciliationReport:
    def __init__(self):
        self.before_stats = {}
        self.after_stats = {}
        self.api_stats = {}
        self.changes = []
        
    def load_api_data(self, api_path):
        """Load API customer data"""
        print("🔍 Loading API data...")
        df = pd.read_csv(api_path)
        
        route_customers = defaultdict(set)
        for _, row in df.iterrows():
            customer = str(row.get('Customer Name', '')).strip()
            route_key = str(row.get('Route Key', '')).strip()
            
            if customer and customer != 'nan' and customer != 'Unknown':
                route_customers[route_key].add(customer)
        
        self.api_stats = {k: sorted(list(v)) for k, v in route_customers.items()}
        
        for route, customers in self.api_stats.items():
            print(f"   {route}: {len(customers)} customers")
        
        return self.api_stats
    
    def load_excel_data(self, excel_path, label='Excel'):
        """Load Excel customer data"""
        print(f"\n🔍 Loading {label} data...")
        
        evening_sheets = {
            'Avond. Aalsmeer': 'aalsmeer_evening',
            'Avond. Naaldwijk': 'naaldwijk_evening',
            'Avond. Rijnsburg': 'rijnsburg_evening'
        }
        
        xls = pd.ExcelFile(excel_path)
        excel_customers = {}
        
        for sheet_name, route_key in evening_sheets.items():
            if sheet_name not in xls.sheet_names:
                excel_customers[route_key] = []
                continue
            
            df = pd.read_excel(excel_path, sheet_name=sheet_name)
            
            # Find customer column
            customer_col = None
            for col in df.columns:
                col_lower = str(col).lower()
                if any(term in col_lower for term in ['klant', 'customer', 'client', 'naam', 'name']):
                    customer_col = col
                    break
            
            if customer_col is None and len(df.columns) > 0:
                customer_col = df.columns[0]
            
            if customer_col:
                customers = df[customer_col].dropna().unique()
                customers = [str(c).strip() for c in customers if str(c).strip() and str(c).strip().lower() != 'nan']
                excel_customers[route_key] = sorted(customers)
                print(f"   {sheet_name}: {len(customers)} customers")
            else:
                excel_customers[route_key] = []
        
        return excel_customers
    
    def normalize_name(self, name):
        """Normalize name for comparison"""
        if pd.isna(name) or name == '':
            return ''
        return str(name).lower().strip()
    
    def count_matches(self, excel_customers, api_customers):
        """Count how many Excel customers match API customers"""
        matches = 0
        matched_names = []
        
        excel_normalized = {self.normalize_name(c): c for c in excel_customers}
        api_normalized = {self.normalize_name(c): c for c in api_customers}
        
        for excel_norm, excel_orig in excel_normalized.items():
            if excel_norm in api_normalized:
                matches += 1
                matched_names.append((excel_orig, api_normalized[excel_norm]))
            else:
                # Check for partial matches
                for api_norm, api_orig in api_normalized.items():
                    if excel_norm in api_norm or api_norm in excel_norm:
                        matches += 1
                        matched_names.append((excel_orig, api_orig))
                        break
        
        return matches, matched_names
    
    def generate_report(self, api_path, excel_before_path, excel_after_path, output_path):
        """Generate comprehensive reconciliation report"""
        print("="*80)
        print("RECONCILIATION REPORT GENERATOR")
        print("="*80)
        print()
        
        # Load data
        self.load_api_data(api_path)
        self.before_stats = self.load_excel_data(excel_before_path, 'Excel (Before)')
        self.after_stats = self.load_excel_data(excel_after_path, 'Excel (After)')
        
        # Generate comparison
        print("\n📊 Generating comparison report...")
        
        routes = ['aalsmeer_evening', 'naaldwijk_evening', 'rijnsburg_evening']
        report_data = []
        
        for route in routes:
            api_customers = self.api_stats.get(route, [])
            before_customers = self.before_stats.get(route, [])
            after_customers = self.after_stats.get(route, [])
            
            # Count matches
            before_matches, _ = self.count_matches(before_customers, api_customers)
            after_matches, after_matched_names = self.count_matches(after_customers, api_customers)
            
            # Calculate match rates
            before_rate = (before_matches / len(api_customers) * 100) if api_customers else 0
            after_rate = (after_matches / len(api_customers) * 100) if api_customers else 0
            
            report_data.append({
                'Route': route,
                'API_Customers': len(api_customers),
                'Excel_Before': len(before_customers),
                'Excel_After': len(after_customers),
                'Before_Matched': before_matches,
                'After_Matched': after_matches,
                'Before_Match_Rate': f"{before_rate:.1f}%",
                'After_Match_Rate': f"{after_rate:.1f}%",
                'Improvement': f"+{after_matches - before_matches}",
                'New_Customers_Added': len(after_customers) - len(before_customers)
            })
        
        # Create DataFrame
        report_df = pd.DataFrame(report_data)
        
        # Calculate totals
        totals = {
            'Route': 'TOTAL',
            'API_Customers': sum(r['API_Customers'] for r in report_data),
            'Excel_Before': sum(r['Excel_Before'] for r in report_data),
            'Excel_After': sum(r['Excel_After'] for r in report_data),
            'Before_Matched': sum(r['Before_Matched'] for r in report_data),
            'After_Matched': sum(r['After_Matched'] for r in report_data),
            'Before_Match_Rate': f"{(sum(r['Before_Matched'] for r in report_data) / sum(r['API_Customers'] for r in report_data) * 100):.1f}%" if sum(r['API_Customers'] for r in report_data) > 0 else "0%",
            'After_Match_Rate': f"{(sum(r['After_Matched'] for r in report_data) / sum(r['API_Customers'] for r in report_data) * 100):.1f}%" if sum(r['API_Customers'] for r in report_data) > 0 else "0%",
            'Improvement': f"+{sum(r['After_Matched'] - r['Before_Matched'] for r in report_data)}",
            'New_Customers_Added': sum(r['New_Customers_Added'] for r in report_data)
        }
        
        report_df = pd.concat([report_df, pd.DataFrame([totals])], ignore_index=True)
        
        # Write to Excel
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # Summary sheet
            report_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Detailed per-route sheets
            for route in routes:
                api_customers = self.api_stats.get(route, [])
                before_customers = self.before_stats.get(route, [])
                after_customers = self.after_stats.get(route, [])
                
                detail_data = []
                
                # API customers
                for api_cust in api_customers:
                    in_before = api_cust in before_customers or any(self.normalize_name(api_cust) == self.normalize_name(b) for b in before_customers)
                    in_after = api_cust in after_customers or any(self.normalize_name(api_cust) == self.normalize_name(a) for a in after_customers)
                    
                    detail_data.append({
                        'API_Customer': api_cust,
                        'In_Excel_Before': 'Yes' if in_before else 'No',
                        'In_Excel_After': 'Yes' if in_after else 'No',
                        'Status': '✅ Matched' if in_after else '❌ Missing'
                    })
                
                detail_df = pd.DataFrame(detail_data)
                sheet_name = route.replace('_', ' ').title()[:31]  # Excel sheet name limit
                detail_df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        print(f"\n✅ Report saved to: {output_path}")
        
        # Print summary
        print("\n" + "="*80)
        print("RECONCILIATION SUMMARY")
        print("="*80)
        print(report_df.to_string(index=False))
        print("="*80)
        
        return output_path

def main():
    parser = argparse.ArgumentParser(description='Generate reconciliation report')
    parser.add_argument('--api', required=True, help='Path to API export CSV')
    parser.add_argument('--excel-before', required=True, help='Path to original Excel file')
    parser.add_argument('--excel-after', required=True, help='Path to updated Excel file')
    parser.add_argument('--output', default='reconciliation_report.xlsx', help='Output report file')
    
    args = parser.parse_args()
    
    # Validate files
    for file_path, label in [
        (args.api, 'API export'),
        (args.excel_before, 'Excel (before)'),
        (args.excel_after, 'Excel (after)')
    ]:
        if not Path(file_path).exists():
            print(f"❌ Error: {label} file not found: {file_path}")
            return 1
    
    # Generate report
    reporter = ReconciliationReport()
    reporter.generate_report(
        args.api,
        args.excel_before,
        args.excel_after,
        args.output
    )
    
    print("\n✅ Reconciliation report complete!")
    return 0

if __name__ == '__main__':
    exit(main())

