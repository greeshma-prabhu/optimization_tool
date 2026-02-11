#!/usr/bin/env python3
"""
EXCEL CUSTOMER UPDATE SCRIPT
Updates Excel file with corrected customer names based on mapping

Usage:
    python update_excel_customers.py --excel Planningstabel_2_0__2_.xlsx --mapping customer_mapping.csv --output Planningstabel_2_0__2_UPDATED.xlsx
"""

import pandas as pd
import argparse
from pathlib import Path
from datetime import datetime
import shutil

class ExcelUpdater:
    def __init__(self, excel_path, mapping_path):
        self.excel_path = excel_path
        self.mapping_path = mapping_path
        self.changes_log = []
        self.backup_path = None
        
    def create_backup(self):
        """Create backup of original Excel file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.backup_path = str(self.excel_path).replace('.xlsx', f'_BACKUP_{timestamp}.xlsx')
        shutil.copy2(self.excel_path, self.backup_path)
        print(f"✅ Created backup: {self.backup_path}")
        return self.backup_path
    
    def load_mapping(self):
        """Load customer mapping from CSV"""
        print("🔍 Loading customer mapping...")
        df = pd.read_csv(self.mapping_path)
        print(f"   Loaded {len(df)} mapping entries")
        return df
    
    def find_customer_column(self, df):
        """Find the customer name column in Excel sheet"""
        # Try common column names
        for col in df.columns:
            col_lower = str(col).lower()
            if any(term in col_lower for term in ['klant', 'customer', 'client', 'naam', 'name']):
                return col
        
        # If not found, use first column
        if len(df.columns) > 0:
            return df.columns[0]
        
        return None
    
    def update_customer_name(self, df, customer_col, old_name, new_name, route):
        """Update customer name in DataFrame"""
        mask = df[customer_col].astype(str).str.strip() == str(old_name).strip()
        if mask.any():
            df.loc[mask, customer_col] = new_name
            self.changes_log.append({
                'Route': route,
                'Action': 'UPDATED',
                'Old_Name': old_name,
                'New_Name': new_name,
                'Rows_Affected': mask.sum()
            })
            return True
        return False
    
    def add_customer(self, df, customer_col, customer_name, route):
        """Add new customer row to DataFrame"""
        # Create new row
        new_row = pd.Series(index=df.columns)
        new_row[customer_col] = customer_name
        
        # Fill other columns with empty/default values
        for col in df.columns:
            if col != customer_col:
                new_row[col] = ''
        
        # Append row
        df = pd.concat([df, new_row.to_frame().T], ignore_index=True)
        
        self.changes_log.append({
            'Route': route,
            'Action': 'ADDED',
            'Old_Name': '',
            'New_Name': customer_name,
            'Rows_Affected': 1
        })
        
        return df
    
    def sort_customers(self, df, customer_col):
        """Sort customers alphabetically"""
        if customer_col and customer_col in df.columns:
            # Sort by customer name, but preserve empty rows at top/bottom
            df[customer_col] = df[customer_col].astype(str)
            empty_mask = df[customer_col].isin(['', 'nan', 'NaN'])
            
            # Separate empty and non-empty rows
            empty_rows = df[empty_mask].copy()
            non_empty_rows = df[~empty_mask].copy()
            
            # Sort non-empty rows
            if len(non_empty_rows) > 0:
                non_empty_rows = non_empty_rows.sort_values(by=customer_col, key=lambda x: x.str.lower())
            
            # Combine: empty rows first, then sorted non-empty
            df = pd.concat([empty_rows, non_empty_rows], ignore_index=True)
        
        return df
    
    def update_excel(self, auto_update_high_confidence=True, review_required=True):
        """Update Excel file with customer name changes"""
        print("\n🔄 Updating Excel file...")
        
        # Create backup
        self.create_backup()
        
        # Load mapping
        mapping_df = self.load_mapping()
        
        # Filter mapping based on action
        if auto_update_high_confidence:
            # Only auto-update high confidence matches
            update_df = mapping_df[
                (mapping_df['Action'] == 'UPDATE_EXCEL') |
                (mapping_df['Action'] == 'ADD_TO_EXCEL')
            ].copy()
        else:
            # Include all actions (user will review)
            update_df = mapping_df[
                mapping_df['Action'].isin(['UPDATE_EXCEL', 'ADD_TO_EXCEL', 'REVIEW'])
            ].copy()
        
        if review_required:
            # Show what will be changed
            print("\n📋 Changes to be applied:")
            print("="*80)
            for _, row in update_df.iterrows():
                action = row['Action']
                excel_name = row['Excel_Name'] if pd.notna(row['Excel_Name']) else '(new)'
                api_name = row['API_Name']
                route = row['Route']
                
                if action == 'UPDATE_EXCEL':
                    print(f"   🔄 {route}: '{excel_name}' → '{api_name}'")
                elif action == 'ADD_TO_EXCEL':
                    print(f"   ➕ {route}: Add '{api_name}'")
                elif action == 'REVIEW':
                    print(f"   👀 {route}: Review '{excel_name}' → '{api_name}' (confidence: {row['Match_Score']})")
            print("="*80)
            
            response = input("\n⚠️  Proceed with these changes? (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                print("❌ Update cancelled by user")
                return False
        
        # Sheet mapping
        sheet_mapping = {
            'aalsmeer_evening': 'Avond. Aalsmeer',
            'naaldwijk_evening': 'Avond. Naaldwijk',
            'rijnsburg_evening': 'Avond. Rijnsburg'
        }
        
        # Open Excel file
        xls = pd.ExcelFile(self.excel_path)
        writer = pd.ExcelWriter(self.excel_path, engine='openpyxl')
        
        # Process each sheet
        for route_key, sheet_name in sheet_mapping.items():
            print(f"\n   Processing {sheet_name}...")
            
            if sheet_name not in xls.sheet_names:
                print(f"      ⚠️  Sheet '{sheet_name}' not found, skipping")
                continue
            
            # Read sheet
            df = pd.read_excel(self.excel_path, sheet_name=sheet_name)
            
            # Find customer column
            customer_col = self.find_customer_column(df)
            if not customer_col:
                print(f"      ⚠️  No customer column found, skipping")
                # Write unchanged sheet
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                continue
            
            print(f"      Found customer column: {customer_col}")
            
            # Get updates for this route
            route_updates = update_df[update_df['Route'] == route_key]
            
            # Apply updates
            updates_count = 0
            adds_count = 0
            
            for _, update_row in route_updates.iterrows():
                action = update_row['Action']
                excel_name = update_row['Excel_Name'] if pd.notna(update_row['Excel_Name']) else ''
                api_name = update_row['API_Name']
                
                if action == 'UPDATE_EXCEL' and excel_name:
                    if self.update_customer_name(df, customer_col, excel_name, api_name, route_key):
                        updates_count += 1
                        print(f"      ✅ Updated: '{excel_name}' → '{api_name}'")
                
                elif action == 'ADD_TO_EXCEL':
                    # Check if already exists
                    if customer_col in df.columns:
                        existing = df[customer_col].astype(str).str.strip().str.lower()
                        if api_name.lower() not in existing.str.lower().values:
                            df = self.add_customer(df, customer_col, api_name, route_key)
                            adds_count += 1
                            print(f"      ➕ Added: '{api_name}'")
                        else:
                            print(f"      ⏭️  Skipped (already exists): '{api_name}'")
            
            # Sort customers alphabetically
            df = self.sort_customers(df, customer_col)
            
            # Write updated sheet
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            print(f"      Summary: {updates_count} updated, {adds_count} added")
        
        # Create changes log sheet
        if self.changes_log:
            changes_df = pd.DataFrame(self.changes_log)
            changes_df.to_excel(writer, sheet_name='Changes_Log', index=False)
            print(f"\n   📝 Created 'Changes_Log' sheet with {len(self.changes_log)} changes")
        
        # Save
        writer.close()
        
        print(f"\n✅ Excel file updated successfully!")
        print(f"📁 Backup saved: {self.backup_path}")
        print(f"📝 Changes log: {len(self.changes_log)} changes applied")
        
        return True

def main():
    parser = argparse.ArgumentParser(description='Update Excel file with customer name changes')
    parser.add_argument('--excel', required=True, help='Path to Excel file')
    parser.add_argument('--mapping', required=True, help='Path to customer mapping CSV')
    parser.add_argument('--output', help='Output Excel file (default: overwrites original)')
    parser.add_argument('--auto-update', action='store_true', help='Auto-update high confidence matches without review')
    parser.add_argument('--no-review', action='store_true', help='Skip review prompt (use with caution)')
    
    args = parser.parse_args()
    
    print("="*80)
    print("EXCEL CUSTOMER UPDATE TOOL")
    print("="*80)
    print()
    
    # Validate files
    if not Path(args.excel).exists():
        print(f"❌ Error: Excel file not found: {args.excel}")
        return 1
    
    if not Path(args.mapping).exists():
        print(f"❌ Error: Mapping file not found: {args.mapping}")
        return 1
    
    # Set output path
    output_path = args.output or args.excel
    
    # Create updater
    updater = ExcelUpdater(args.excel, args.mapping)
    
    # Update Excel
    success = updater.update_excel(
        auto_update_high_confidence=args.auto_update,
        review_required=not args.no_review
    )
    
    if success:
        if args.output and args.output != args.excel:
            # Copy to output path
            shutil.copy2(args.excel, args.output)
            print(f"📄 Saved updated file to: {args.output}")
        
        print("\n✅ Update complete!")
        return 0
    else:
        print("\n❌ Update failed or cancelled")
        return 1

if __name__ == '__main__':
    exit(main())

