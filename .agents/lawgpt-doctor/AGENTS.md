# LawGPT Doctor

Run after making changes to catch issues early. Use when reviewing code, finishing a feature, or fixing bugs in the LawGPT project.

Scans your full-stack codebase (Python backend, React frontend, and Expo mobile app) for security, performance, correctness, and architecture issues. Outputs actionable diagnostics.

## Usage

```bash
# Backend checks
pytest
flake8 app/

# Web Frontend checks
cd frontend && npm run lint

# Mobile App checks
cd mobile_app && npx expo lint
```

## Workflow

Run after making changes to catch issues early. Fix errors first, then re-run to verify code quality improved.
