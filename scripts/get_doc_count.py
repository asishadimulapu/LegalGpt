
import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import engine

def get_counts():
    try:
        with engine.connect() as conn:
            # Count document embeddings
            result = conn.execute(text("SELECT COUNT(*) FROM document_embeddings"))
            doc_count = result.scalar()
            
            # Count unique sources
            result = conn.execute(text("SELECT DISTINCT source FROM document_embeddings"))
            sources = result.fetchall()
            source_count = len(sources)
            
            # Count by act type
            result = conn.execute(text("SELECT act_type, COUNT(*) FROM document_embeddings GROUP BY act_type"))
            act_counts = result.fetchall()
            
            print(f"\n📊 --- LegalGpt Document Statistics ---")
            print(f"Total Chunks (Embeddings): {doc_count:,}")
            print(f"Total Unique Sources: {source_count:,}")
            print(f"Source Names:")
            for s in sources:
                print(f"  - {s[0]}")
            print(f"\nBreakdown by Act Type:")
            for act, count in act_counts:
                print(f"- {act if act else 'Unknown'}: {count:,} chunks")
            print(f"---------------------------------------\n")
            
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    get_counts()
