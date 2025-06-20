"""
Database Schema Fix Script

This script fixes the database schema by ensuring the calculation_parameters column
exists in the batch_uploads table. It will:
1. Check if the database file exists
2. Add the missing column if needed
3. Handle the case where the column might already exist
"""

import sqlite3
import os
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database file path
DB_PATH = "./bonus_calculator.db"

def fix_database_schema():
    """Fix the database schema by ensuring required columns exist"""
    try:
        # Check if database file exists
        if not os.path.exists(DB_PATH):
            logger.error(f"Database file {DB_PATH} not found")
            return False
        
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all tables in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        logger.info(f"Found tables: {[table[0] for table in tables]}")
        
        # Check if batch_uploads table exists
        if ('batch_uploads',) not in tables:
            logger.error("batch_uploads table does not exist in the database")
            return False
        
        # Get columns in batch_uploads table
        cursor.execute("PRAGMA table_info(batch_uploads)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        logger.info(f"Columns in batch_uploads table: {column_names}")
        
        # Check if calculation_parameters column exists
        if "calculation_parameters" not in column_names:
            logger.info("Adding calculation_parameters column to batch_uploads table")
            try:
                cursor.execute("ALTER TABLE batch_uploads ADD COLUMN calculation_parameters JSON")
                conn.commit()
                logger.info("Column added successfully")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    logger.info("Column already exists (duplicate column error)")
                else:
                    logger.error(f"Error adding column: {str(e)}")
                    return False
        else:
            logger.info("calculation_parameters column already exists")
        
        # Create a backup of the database
        backup_path = f"{DB_PATH}.backup"
        try:
            with open(DB_PATH, 'rb') as src, open(backup_path, 'wb') as dst:
                dst.write(src.read())
            logger.info(f"Created database backup at {backup_path}")
        except Exception as e:
            logger.warning(f"Failed to create database backup: {str(e)}")
        
        # Close the connection
        conn.close()
        return True
    
    except Exception as e:
        logger.error(f"Error fixing database schema: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting database schema fix")
    success = fix_database_schema()
    if success:
        logger.info("Database schema fix completed successfully")
        sys.exit(0)
    else:
        logger.error("Database schema fix failed")
        sys.exit(1)
