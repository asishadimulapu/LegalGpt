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
    groq_model: str = "llama-3.1-8b-instant"  # Fast model for low latency
    llm_temperature: float = 0.0  # Deterministic for legal accuracy
    
    # Embedding provider (Groq/OpenRouter don't provide embeddings)
    # "huggingface" = FREE local embeddings with sentence-transformers
    # "gemini" or "openai" = API-based
    embedding_provider: Literal["huggingface", "gemini", "openai"] = "huggingface"
    huggingface_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # -------------------------------------------------------------------------
    # Database Configuration
    # -------------------------------------------------------------------------
    database_url: str = ""  # Required: set in .env
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "indian_law_db"
    db_user: str = "postgres"
    db_password: str = ""  # Required: set in .env
    
    # Redis (used for temp auth codes; set REDIS_URL in docker-compose)
    redis_url: str = "redis://localhost:6379/0"
    
    # -------------------------------------------------------------------------
    # FAISS Vector Store
    # -------------------------------------------------------------------------
    faiss_index_path: str = "./data/faiss_index"
    
    # -------------------------------------------------------------------------
    # Application Settings
    # -------------------------------------------------------------------------
    app_env: Literal["development", "staging", "production"] = "production"  # Default to production for safety
    app_name: str = "Indian Law RAG Chatbot"
    app_version: str = "1.0.0"
    app_url: str = "https://law-gpt.app"  # Base URL for the application
    debug: bool = False  # Default to False for production
    log_level: str = "INFO"
    
    # CORS Configuration
    cors_origins: str = ""  # Comma-separated list of allowed origins, empty = allow based on environment
    
    # -------------------------------------------------------------------------
    # JWT Authentication
    # -------------------------------------------------------------------------
    jwt_secret_key: str = ""  # Required: set in .env for production
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # -------------------------------------------------------------------------
    # Google OAuth 2.0
    # -------------------------------------------------------------------------
    google_client_id: str = ""  # Set in .env
    google_client_secret: str = ""  # Set in .env
    google_redirect_uri: str = "https://law-gpt.app/auth/callback"
    
    # -------------------------------------------------------------------------
    # Encryption Configuration
    # -------------------------------------------------------------------------
    encryption_key: str = ""  # Required: for metadata encryption
    api_signing_key: str = ""  # Required: for HMAC signatures
    
    # -------------------------------------------------------------------------
    # Security Settings
    # -------------------------------------------------------------------------
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 100
    rate_limit_burst: int = 20
    enable_hsts: bool = True
    enable_csp: bool = True
    allowed_hosts: str = "law-gpt.app,localhost"
    trusted_proxy_ips: str = ""  # Comma-separated list of trusted reverse-proxy IPs
    
    # Password Policy
    password_min_length: int = 12
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_digit: bool = True
    password_require_special: bool = True

    # -------------------------------------------------------------------------
    # Brevo (Sendinblue) Transactional Email
    # -------------------------------------------------------------------------
    brevo_api_key: str = ""  # Set in .env
    support_email: str = "support@law-gpt.app"
    support_email_name: str = "LawGPT Support"
    password_reset_expire_minutes: int = 30
    
    @property
    def get_cors_origins(self) -> list:
        """Get CORS origins based on environment."""
        if self.cors_origins:
            return [origin.strip() for origin in self.cors_origins.split(",")]
        if self.is_development:
            return ["*"]  # Allow all in development
        return ["https://law-gpt.app"]  # Production default
    
    # -------------------------------------------------------------------------
    # RAG Configuration
    # -------------------------------------------------------------------------
    top_k_results: int = 5  # Reduced from 8 for faster retrieval
    chunk_size: int = 1500
    chunk_overlap: int = 300
    
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
    - Validates critical secrets in non-development environments
    """
    instance = Settings()
    
    # Fail-fast: critical secrets must be set outside development
    if not instance.is_development:
        missing = []
        if not instance.jwt_secret_key:
            missing.append("jwt_secret_key")
        if not instance.encryption_key:
            missing.append("encryption_key")
        if not instance.api_signing_key:
            missing.append("api_signing_key")
        if missing:
            raise RuntimeError(
                f"FATAL: Missing required secrets for {instance.app_env} environment: "
                f"{', '.join(missing)}. Set these in your .env file."
            )
    
    return instance


# Create a global settings instance for easy imports
settings = get_settings()
