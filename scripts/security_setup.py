#!/usr/bin/env python3
"""
Security Setup Script for LegalGPT
Generates secure secrets and validates configuration
"""

import secrets
import os
import sys
from pathlib import Path


def generate_secret(length_bytes: int = 32) -> str:
    """Generate cryptographically secure random secret."""
    return secrets.token_urlsafe(length_bytes)


def check_file_permissions(filepath: str) -> None:
    """Check if file has secure permissions."""
    if os.path.exists(filepath):
        stat = os.stat(filepath)
        mode = stat.st_mode & 0o777
        if mode > 0o600:
            print(f"⚠️  WARNING: {filepath} has insecure permissions {oct(mode)}")
            print(f"   Recommended: chmod 600 {filepath}")


def create_secure_env():
    """Create .env file with secure secrets."""
    env_path = Path(".env")
    example_path = Path(".env.example")
    
    if env_path.exists():
        response = input("⚠️  .env file already exists. Overwrite? (yes/no): ")
        if response.lower() != "yes":
            print("❌ Aborted. Keeping existing .env file.")
            return
    
    print("🔐 Generating secure secrets...\n")
    
    # Generate secrets
    jwt_secret = generate_secret(64)  # 512 bits
    encryption_key = generate_secret(32)  # 256 bits
    signing_key = generate_secret(32)  # 256 bits
    
    print("✅ Generated secrets:")
    print(f"   JWT Secret: {jwt_secret[:20]}... ({len(jwt_secret)} chars)")
    print(f"   Encryption Key: {encryption_key[:20]}... ({len(encryption_key)} chars)")
    print(f"   Signing Key: {signing_key[:20]}... ({len(signing_key)} chars)")
    print()
    
    # Read example file
    if not example_path.exists():
        print("❌ Error: .env.example not found")
        return
    
    with open(example_path, 'r') as f:
        content = f.read()
    
    # Replace placeholders
    content = content.replace(
        'JWT_SECRET_KEY=CHANGE-ME-generate-a-secure-random-key-minimum-256-bits',
        f'JWT_SECRET_KEY={jwt_secret}'
    )
    content = content.replace(
        'ENCRYPTION_KEY=CHANGE-ME-generate-a-secure-encryption-key',
        f'ENCRYPTION_KEY={encryption_key}'
    )
    content = content.replace(
        'API_SIGNING_KEY=CHANGE-ME-generate-a-secure-signing-key',
        f'API_SIGNING_KEY={signing_key}'
    )
    
    # Write .env file
    with open(env_path, 'w') as f:
        f.write(content)
    
    # Set secure permissions (Unix-like systems)
    if os.name != 'nt':  # Not Windows
        os.chmod(env_path, 0o600)
        print("✅ Set .env permissions to 600 (owner read/write only)")
    else:
        print("⚠️  Windows detected. Please manually secure .env file permissions.")
    
    print(f"\n✅ Created {env_path}")
    print("\n⚠️  IMPORTANT: Update the following in .env:")
    print("   - GROQ_API_KEY (get from https://console.groq.com)")
    print("   - DATABASE_URL (your PostgreSQL connection string)")
    print("   - CORS_ORIGINS (your frontend domain)")
    print("\n🔒 BACKUP YOUR ENCRYPTION_KEY! Data cannot be recovered without it.\n")


def create_keys_directory():
    """Create secure keys directory for RSA keys."""
    keys_path = Path("keys")
    keys_path.mkdir(exist_ok=True)
    
    # Set secure permissions
    if os.name != 'nt':
        os.chmod(keys_path, 0o700)
        print("✅ Created keys/ directory with 700 permissions")
    else:
        print("✅ Created keys/ directory")


def validate_env():
    """Validate .env configuration."""
    print("\n🔍 Validating .env configuration...\n")
    
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env file not found. Run with --create flag first.")
        return False
    
    issues = []
    warnings = []
    
    # Read .env
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    config = {}
    for line in lines:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key] = value
    
    # Check critical secrets
    critical_keys = [
        'JWT_SECRET_KEY',
        'ENCRYPTION_KEY',
        'API_SIGNING_KEY',
        'DATABASE_URL'
    ]
    
    for key in critical_keys:
        if key not in config:
            issues.append(f"Missing: {key}")
        elif 'CHANGE-ME' in config[key] or 'your-' in config[key]:
            issues.append(f"Not configured: {key} (still has placeholder)")
        elif key.endswith('_KEY') and len(config[key]) < 32:
            issues.append(f"Too short: {key} (should be at least 32 chars)")
    
    # Check security settings
    if config.get('DEBUG', 'false').lower() == 'true':
        warnings.append("DEBUG is enabled (should be false in production)")
    
    if config.get('APP_ENV', 'development') == 'development':
        warnings.append("APP_ENV is 'development' (change to 'production')")
    
    if config.get('CORS_ORIGINS', '') == '*':
        warnings.append("CORS_ORIGINS is '*' (too permissive for production)")
    
    if config.get('RATE_LIMIT_ENABLED', 'true').lower() != 'true':
        warnings.append("RATE_LIMIT_ENABLED is disabled (should be enabled)")
    
    # Report results
    if issues:
        print("❌ CRITICAL ISSUES:")
        for issue in issues:
            print(f"   - {issue}")
        print()
    
    if warnings:
        print("⚠️  WARNINGS:")
        for warning in warnings:
            print(f"   - {warning}")
        print()
    
    if not issues and not warnings:
        print("✅ Configuration looks good!\n")
        return True
    elif not issues:
        print("✅ No critical issues, but review warnings.\n")
        return True
    else:
        print("❌ Fix critical issues before deploying.\n")
        return False


def print_security_checklist():
    """Print security deployment checklist."""
    print("\n" + "="*70)
    print("🔒 SECURITY DEPLOYMENT CHECKLIST")
    print("="*70)
    print("""
Before deploying to production:

Configuration:
  [ ] Generated unique JWT_SECRET_KEY (not example value)
  [ ] Generated unique ENCRYPTION_KEY (backed up securely!)
  [ ] Generated unique API_SIGNING_KEY
  [ ] Updated DATABASE_URL with production database
  [ ] Added LLM API key (GROQ_API_KEY or similar)
  [ ] Set APP_ENV=production
  [ ] Set DEBUG=false
  [ ] Configured CORS_ORIGINS to your domain only
  [ ] Set RATE_LIMIT_ENABLED=true

Security:
  [ ] .env file is NOT committed to Git
  [ ] .env has secure permissions (600 on Unix)
  [ ] keys/ directory created with 700 permissions
  [ ] SSL/TLS certificate configured
  [ ] HTTPS enforced (no HTTP)
  [ ] Security headers enabled (HSTS, CSP, etc.)
  [ ] Rate limiting tested
  [ ] Password policy enforced (12+ chars, complexity)

Database:
  [ ] Database migrations applied (alembic upgrade head)
  [ ] Database backups configured
  [ ] encrypted_data table created
  [ ] audit_logs table created
  [ ] PostgreSQL user has minimal permissions

Infrastructure:
  [ ] Firewall configured (only ports 80, 443 open)
  [ ] Server OS updated and patched
  [ ] Monitoring/alerting configured
  [ ] Log rotation configured
  [ ] Backup encryption key stored securely (offline)

Testing:
  [ ] All endpoints tested
  [ ] Authentication tested
  [ ] Rate limiting tested
  [ ] Error handling tested
  [ ] Security scan completed (pip-audit or safety)
  [ ] Penetration test considered

Documentation:
  [ ] Team trained on security procedures
  [ ] Incident response plan documented
  [ ] Key rotation schedule documented
  [ ] Backup recovery procedures tested
    """)
    print("="*70 + "\n")


def main():
    """Main script entry point."""
    print("\n" + "="*70)
    print("🔐 LegalGPT Security Setup Script")
    print("="*70 + "\n")
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "--create":
            create_secure_env()
            create_keys_directory()
            print_security_checklist()
        
        elif command == "--validate":
            validate_env()
        
        elif command == "--generate-secret":
            length = int(sys.argv[2]) if len(sys.argv) > 2 else 32
            print(f"Generated secret ({length} bytes): {generate_secret(length)}")
        
        elif command == "--help":
            print("Usage: python security_setup.py [COMMAND]")
            print("\nCommands:")
            print("  --create          Create .env with secure secrets")
            print("  --validate        Validate existing .env configuration")
            print("  --generate-secret Generate a random secret (optional: specify bytes)")
            print("  --help            Show this help message")
            print("\nExample:")
            print("  python security_setup.py --create")
            print("  python security_setup.py --generate-secret 64")
        
        else:
            print(f"❌ Unknown command: {command}")
            print("Run with --help for usage information.")
    
    else:
        print("Interactive mode:\n")
        print("1. Create secure .env file")
        print("2. Validate existing .env")
        print("3. Generate random secret")
        print("4. Exit")
        
        choice = input("\nEnter choice (1-4): ")
        
        if choice == "1":
            create_secure_env()
            create_keys_directory()
            print_security_checklist()
        elif choice == "2":
            validate_env()
        elif choice == "3":
            length = input("Enter secret length in bytes (default 32): ")
            length = int(length) if length.isdigit() else 32
            print(f"\nGenerated secret: {generate_secret(length)}")
        elif choice == "4":
            print("Goodbye!")
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    main()
