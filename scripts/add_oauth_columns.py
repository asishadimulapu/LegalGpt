"""
Add OAuth columns to users table.
Run this script to add google_id, auth_provider, and picture_url columns.
"""

import sys
sys.path.insert(0, '.')

from app.db.database import engine
from sqlalchemy import text

def add_oauth_columns():
    """Add OAuth columns to users table if they don't exist."""
    
    with engine.connect() as conn:
        # Check if columns exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'google_id'
        """))
        
        if result.fetchone():
            print("✓ OAuth columns already exist")
            return
        
        print("Adding OAuth columns to users table...")
        
        # Add google_id column
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE
        """))
        print("✓ Added google_id column")
        
        # Add auth_provider column
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email' NOT NULL
        """))
        print("✓ Added auth_provider column")
        
        # Add picture_url column
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS picture_url VARCHAR(500)
        """))
        print("✓ Added picture_url column")
        
        # Create index on google_id
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_google_id ON users(google_id)
        """))
        print("✓ Created index on google_id")
        
        conn.commit()
        print("\n✅ OAuth columns added successfully!")


if __name__ == "__main__":
    add_oauth_columns()
