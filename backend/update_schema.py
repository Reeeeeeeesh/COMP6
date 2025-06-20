"""
Database Schema Update Script

This script updates the database schema to add the calculation_parameters column
to the batch_uploads table without dropping existing data.
"""

import sqlite3
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database file path
DB_PATH = "./bonus_calculator.db"

def update_schema():
    """Update the database schema to add missing columns"""
    try:
        # Check if database file exists
        if not os.path.exists(DB_PATH):
            logger.error(f"Database file {DB_PATH} not found")
            return False
        
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if calculation_parameters column exists in batch_uploads table
        cursor.execute("PRAGMA table_info(batch_uploads)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if "calculation_parameters" not in column_names:
            logger.info("Adding calculation_parameters column to batch_uploads table")
            cursor.execute("ALTER TABLE batch_uploads ADD COLUMN calculation_parameters JSON")
            conn.commit()
            logger.info("Column added successfully")
        else:
            logger.info("calculation_parameters column already exists")
        
        # Close the connection
        conn.close()
        return True
    
    except Exception as e:
        logger.error(f"Error updating schema: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting schema update")
    success = update_schema()
    if success:
        logger.info("Schema update completed successfully")
    else:
        logger.error("Schema update failed")
