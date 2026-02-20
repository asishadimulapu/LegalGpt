# Indian Law RAG Chatbot - Legal Guides Routes
"""
Endpoint to serve static legal guides for mobile offline caching.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/guides", tags=["Guides"])

class LegalGuide(BaseModel):
    id: str
    title: str
    category: str
    content: str
    last_updated: datetime

# Hardcoded content for now (in production, this would come from DB)
STATIC_GUIDES = [
    LegalGuide(
        id="ipc-summary",
        title="IPC at a Glance",
        category="Criminal Law",
        content="""
# Indian Penal Code (IPC) Summary

The standard criminal code of India.

## Key Sections
- **Section 302**: Punishment for murder (Death or life imprisonment).
- **Section 307**: Attempt to murder.
- **Section 378**: Theft.
- **Section 420**: Cheating and dishonestly inducing delivery of property.
- **Section 498A**: Husband or relative of husband of a woman subjecting her to cruelty.

## Structure
The IPC is divided into 23 chapters and comprises 511 sections.
        """,
        last_updated=datetime(2023, 1, 1)
    ),
    LegalGuide(
        id="fundamental-rights",
        title="Fundamental Rights",
        category="Constitution",
        content="""
# Fundamental Rights of Indian Citizens

Guaranteed by Part III of the Constitution.

1. **Right to Equality (Articles 14-18)**: Equality before law, prohibition of discrimination.
2. **Right to Freedom (Articles 19-22)**: Freedom of speech, assembly, association.
3. **Right against Exploitation (Articles 23-24)**: Prohibition of human trafficking and forced labor.
4. **Right to Freedom of Religion (Articles 25-28)**.
5. **Cultural and Educational Rights (Articles 29-30)**.
6. **Right to Constitutional Remedies (Article 32)**: Right to move Supreme Court.
        """,
        last_updated=datetime(2023, 1, 1)
    ),
    LegalGuide(
        id="first-info-report",
        title="How to file an FIR",
        category="Procedure",
        content="""
# First Information Report (FIR)

An FIR is a written document prepared by police when they receive information about the commission of a cognizable offence.

## Steps
1. **Visit Police Station**: Go to the nearest station to the crime scene.
2. **Oral or Written**: You can give information orally (police must write it down) or in writing.
3. **Sign It**: You must sign the FIR after verifying the contents.
4. **Get a Copy**: You are entitled to a free copy of the FIR immediately.

## Zero FIR
An FIR can be filed in any police station (even if outside jurisdiction), which then transfers it to the appropriate station.
        """,
        last_updated=datetime(2023, 1, 1)
    ),
    LegalGuide(
        id="arrest-rights",
        title="Rights of an Arrested Person",
        category="Rights",
        content="""
# Your Rights If Arrested

As per D.K. Basu Guidelines and CrPC:

1. **Right to Know Grounds**: Police must inform you why you are being arrested.
2. **Right to Bail**: Information if the offence is bailable.
3. **Right to Family**: Right to inform a friend or relative.
4. **Right to Lawyer**: Right to consult a legal practitioner.
5. **Medical Examination**: Right to be examined by a doctor.
6. **Magistrate Appearance**: Must be produced before a magistrate within 24 hours.
        """,
        last_updated=datetime(2023, 1, 1)
    )
]

@router.get("", response_model=List[LegalGuide])
async def get_guides():
    """
    Get all legal guides.
    Used for initial sync and updates.
    """
    return STATIC_GUIDES

@router.get("/{guide_id}", response_model=LegalGuide)
async def get_guide(guide_id: str):
    """
    Get a specific guide.
    """
    for guide in STATIC_GUIDES:
        if guide.id == guide_id:
            return guide
    
    raise HTTPException(status_code=404, detail="Guide not found")
