# Indian Law RAG Chatbot - Configuration Module
"""
Centralized configuration management using Pydantic Settings.
Loads environment variables and provides type-safe access to configuration.
"""

from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Viva Explanation:
    - Uses Pydantic BaseSettings for automatic environment variable parsing
    - @lru_cache ensures single instance (singleton pattern)
    - Type hints provide validation and IDE support
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # -------------------------------------------------------------------------
    # LLM Configuration
    # -------------------------------------------------------------------------
    llm_provider: Literal["gemini", "openai", "openrouter", "groq"] = "groq"
    google_api_key: str = ""
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-oss-120b:free"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"  # Fast and free
    llm_temperature: float = 0.0  # Deterministic for legal accuracy
    
    # Embedding provider (Groq/OpenRouter don't provide embeddings)
    # "huggingface_api" = FREE cloud embeddings (RECOMMENDED for deploy!)
    # "huggingface" = local embeddings (needs sentence-transformers, 400MB)
    # "gemini" or "openai" = API-based
    embedding_provider: Literal["huggingface_api", "huggingface", "gemini", "openai"] = "huggingface_api"
    huggingface_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    huggingface_api_key: str = ""
    
    # -------------------------------------------------------------------------
    # Database Configuration
    # -------------------------------------------------------------------------
    database_url: str = "postgresql://postgres:password@localhost:5432/indian_law_db"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "indian_law_db"
    db_user: str = "postgres"
    db_password: str = "password"
    
    # -------------------------------------------------------------------------
    # FAISS Vector Store
    # -------------------------------------------------------------------------
    faiss_index_path: str = "./data/faiss_index"
    
    # -------------------------------------------------------------------------
    # Application Settings
    # -------------------------------------------------------------------------
    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "Indian Law RAG Chatbot"
    app_version: str = "1.0.0"
    debug: bool = True
    log_level: str = "INFO"
    
    # -------------------------------------------------------------------------
    # JWT Authentication
    # -------------------------------------------------------------------------
    jwt_secret_key: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # -------------------------------------------------------------------------
    # RAG Configuration
    # -------------------------------------------------------------------------
    top_k_results: int = 5
    chunk_size: int = 800
    chunk_overlap: int = 150
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.app_env == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Returns:
        Settings: Application settings singleton
        
    Viva Explanation:
    - @lru_cache creates a singleton pattern
    - Environment variables are loaded once at startup
    - Subsequent calls return the cached instance
    """
    return Settings()


# Create a global settings instance for easy imports
settings = get_settings()
