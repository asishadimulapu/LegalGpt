# Indian Law RAG Chatbot - Extended Dataset Loader
"""
Load multiple Indian law datasets for comprehensive coverage.
Includes IPC sections, Constitution, and legal Q&A datasets.
"""

import re
import sys
from pathlib import Path
from typing import List
import logging

from datasets import load_dataset
from langchain_core.documents import Document

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    """Clean and normalize text."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_legal_references(text: str) -> dict:
    """Extract act and section info from text."""
    metadata = {"act_name": "Indian Law", "section": None, "title": None}
    
    act_patterns = [
        (r"(Indian Penal Code|IPC)", "Indian Penal Code"),
        (r"(Code of Criminal Procedure|CrPC)", "CrPC"),
        (r"(Constitution of India)", "Constitution of India"),
        (r"(Indian Contract Act)", "Indian Contract Act"),
        (r"(Indian Evidence Act)", "Indian Evidence Act"),
        (r"(Consumer Protection Act)", "Consumer Protection Act"),
        (r"(Motor Vehicles Act)", "Motor Vehicles Act"),
        (r"(Information Technology Act|IT Act)", "IT Act"),
    ]
    
    for pattern, act_name in act_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            metadata["act_name"] = act_name
            break
    
    section_match = re.search(r"Section\s+(\d+[A-Z]?)", text, re.IGNORECASE)
    article_match = re.search(r"Article\s+(\d+[A-Z]?)", text, re.IGNORECASE)
    
    if section_match:
        metadata["section"] = f"Section {section_match.group(1)}"
    elif article_match:
        metadata["section"] = f"Article {article_match.group(1)}"
    
    return metadata


def load_viber1_dataset() -> List[Document]:
    """Load viber1/indian-law-dataset (Q&A format)."""
    logger.info("Loading viber1/indian-law-dataset...")
    documents = []
    
    try:
        dataset = load_dataset("viber1/indian-law-dataset")
        data = dataset["train"]
        
        for idx, row in enumerate(data):
            response = clean_text(row.get("Response", "") or "")
            instruction = clean_text(row.get("Instruction", "") or "")
            
            if len(response) < 50:
                continue
            
            content = f"Question: {instruction}\n\nAnswer: {response}"
            metadata = extract_legal_references(response)
            metadata["source"] = "viber1/indian-law-dataset"
            metadata["index"] = idx
            
            documents.append(Document(page_content=content, metadata=metadata))
        
        logger.info(f"Loaded {len(documents)} from viber1/indian-law-dataset")
    except Exception as e:
        logger.warning(f"Failed to load viber1 dataset: {e}")
    
    return documents


def load_ipc_dataset() -> List[Document]:
    """Load harshitv804/Indian_Penal_Code dataset."""
    logger.info("Loading harshitv804/Indian_Penal_Code...")
    documents = []
    
    try:
        dataset = load_dataset("harshitv804/Indian_Penal_Code")
        data = dataset["train"] if "train" in dataset else list(dataset.values())[0]
        
        for idx, row in enumerate(data):
            # Try different column names
            content = ""
            for field in ["text", "content", "section_text", "description"]:
                if field in row and row[field]:
                    content = clean_text(str(row[field]))
                    break
            
            if not content or len(content) < 30:
                continue
            
            metadata = extract_legal_references(content)
            metadata["act_name"] = "Indian Penal Code"
            metadata["source"] = "harshitv804/Indian_Penal_Code"
            metadata["index"] = idx
            
            documents.append(Document(page_content=content, metadata=metadata))
        
        logger.info(f"Loaded {len(documents)} from IPC dataset")
    except Exception as e:
        logger.warning(f"Failed to load IPC dataset: {e}")
    
    return documents


def load_legal_finetuning_dataset() -> List[Document]:
    """Load Techmaestro369/indian-legal-texts-finetuning."""
    logger.info("Loading Techmaestro369/indian-legal-texts-finetuning...")
    documents = []
    
    try:
        dataset = load_dataset("Techmaestro369/indian-legal-texts-finetuning")
        data = dataset["train"] if "train" in dataset else list(dataset.values())[0]
        
        for idx, row in enumerate(data):
            # This dataset has Q&A pairs
            question = row.get("question", row.get("input", ""))
            answer = row.get("answer", row.get("output", ""))
            
            if question and answer:
                content = f"Question: {clean_text(question)}\n\nAnswer: {clean_text(answer)}"
            else:
                content = clean_text(str(row.get("text", "")))
            
            if len(content) < 50:
                continue
            
            metadata = extract_legal_references(content)
            metadata["source"] = "Techmaestro369/indian-legal-texts-finetuning"
            metadata["index"] = idx
            
            documents.append(Document(page_content=content, metadata=metadata))
        
        logger.info(f"Loaded {len(documents)} from legal finetuning dataset")
    except Exception as e:
        logger.warning(f"Failed to load finetuning dataset: {e}")
    
    return documents


def get_ipc_core_sections() -> List[Document]:
    """Add core IPC sections that are commonly asked about."""
    logger.info("Adding core IPC sections...")
    
    ipc_sections = [
        {
            "section": "Section 302",
            "title": "Punishment for murder",
            "content": "Section 302 of the Indian Penal Code provides the punishment for murder. Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine. Murder is defined under Section 300 as culpable homicide with the intention of causing death or with the intention of causing such bodily injury as the offender knows to be likely to cause death, or with the intention of causing bodily injury sufficient in the ordinary course of nature to cause death."
        },
        {
            "section": "Section 300",
            "title": "Murder",
            "content": "Section 300 of the Indian Penal Code defines Murder. Culpable homicide is murder if the act by which the death is caused is done with the intention of causing death, or if it is done with the intention of causing such bodily injury as the offender knows to be likely to cause the death of the person to whom the harm is caused, or if it is done with the intention of causing bodily injury to any person and the bodily injury intended to be inflicted is sufficient in the ordinary course of nature to cause death."
        },
        {
            "section": "Section 376",
            "title": "Punishment for rape",
            "content": "Section 376 of the Indian Penal Code deals with the punishment for rape. Whoever commits rape shall be punished with rigorous imprisonment for a term which shall not be less than ten years, but which may extend to imprisonment for life, and shall also be liable to fine. The punishment may extend to imprisonment for life which shall mean imprisonment for the remainder of that person's natural life, in certain aggravated cases."
        },
        {
            "section": "Section 307",
            "title": "Attempt to murder",
            "content": "Section 307 of the Indian Penal Code deals with attempt to murder. Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, he would be guilty of murder, shall be punished with imprisonment of either description for a term which may extend to ten years, and shall also be liable to fine; and if hurt is caused to any person by such act, the offender shall be liable either to imprisonment for life, or to such punishment as is hereinbefore mentioned."
        },
        {
            "section": "Section 304B",
            "title": "Dowry death",
            "content": "Section 304B of the Indian Penal Code deals with dowry death. Where the death of a woman is caused by any burns or bodily injury or occurs otherwise than under normal circumstances within seven years of her marriage and it is shown that soon before her death she was subjected to cruelty or harassment by her husband or any relative of her husband for, or in connection with, any demand for dowry, such death shall be called dowry death, and such husband or relative shall be deemed to have caused her death."
        },
        {
            "section": "Section 354",
            "title": "Assault or criminal force to woman with intent to outrage her modesty",
            "content": "Section 354 of the Indian Penal Code provides punishment for assault or criminal force to woman with intent to outrage her modesty. Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty, shall be punished with imprisonment of either description for a term which shall not be less than one year but which may extend to five years, and shall also be liable to fine."
        },
        {
            "section": "Section 420",
            "title": "Cheating and dishonestly inducing delivery of property",
            "content": "Section 420 of the Indian Penal Code deals with cheating and dishonestly inducing delivery of property. Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine."
        },
        {
            "section": "Section 498A",
            "title": "Husband or relative of husband subjecting woman to cruelty",
            "content": "Section 498A of the Indian Penal Code deals with husband or relative of husband of a woman subjecting her to cruelty. Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine. Cruelty means any wilful conduct which is of such a nature as is likely to drive the woman to commit suicide or to cause grave injury or danger to life, limb or health of the woman."
        },
        {
            "section": "Section 379",
            "title": "Punishment for theft",
            "content": "Section 379 of the Indian Penal Code provides the punishment for theft. Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both. Theft is defined under Section 378 as the dishonest taking of any movable property out of the possession of any person without that person's consent."
        },
        {
            "section": "Section 378",
            "title": "Theft",
            "content": "Section 378 of the Indian Penal Code defines Theft. Whoever, intending to take dishonestly any movable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft. The essential elements are: dishonest intention, movable property, possession of another person, absence of consent, and actual moving of the property."
        },
        {
            "section": "Section 323",
            "title": "Punishment for voluntarily causing hurt",
            "content": "Section 323 of the Indian Penal Code provides punishment for voluntarily causing hurt. Whoever, except in the case provided for by section 334, voluntarily causes hurt, shall be punished with imprisonment of either description for a term which may extend to one year, or with fine which may extend to one thousand rupees, or with both."
        },
        {
            "section": "Section 506",
            "title": "Punishment for criminal intimidation",
            "content": "Section 506 of the Indian Penal Code deals with punishment for criminal intimidation. Whoever commits the offence of criminal intimidation shall be punished with imprisonment of either description for a term which may extend to two years, or with fine, or with both. If threat be to cause death or grievous hurt, or to cause the destruction of any property by fire, or to cause an offence punishable with death or imprisonment for life, the punishment may extend to seven years."
        },
        {
            "section": "Section 299",
            "title": "Culpable Homicide",
            "content": "Section 299 of the Indian Penal Code defines Culpable Homicide. Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide."
        }
    ]
    
    documents = []
    for idx, section_data in enumerate(ipc_sections):
        content = f"""IPC {section_data['section']} - {section_data['title']}

{section_data['content']}

Legal Reference: [Indian Penal Code, {section_data['section']}]"""
        
        documents.append(Document(
            page_content=content,
            metadata={
                "act_name": "Indian Penal Code",
                "section": section_data["section"],
                "title": section_data["title"],
                "source": "core_ipc_sections",
                "index": idx
            }
        ))
    
    logger.info(f"Added {len(documents)} core IPC sections")
    return documents


def get_it_act_core_sections() -> List[Document]:
    """Add core IT Act sections (Section 66, 66A, etc.)"""
    logger.info("Adding core IT Act sections...")
    
    sections = [
        {
            "section": "Section 66",
            "title": "Computer Related Offences",
            "content": "Section 66 of the Information Technology Act, 2000 - Computer Related Offences. If any person, dishonestly or fraudulently, does any act referred to in section 43 (damage to computer, computer system, etc.), he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or with both. (Note: The term 'hacking' was used in the original 2000 Act but substituted by 'Computer Related Offences' in 2008, expanding the scope)."
        },
        {
            "section": "Section 66A",
            "title": "Punishment for sending offensive messages through communication service, etc.",
            "content": "Section 66A of the Information Technology Act, 2000. Any person who sends, by means of a computer resource or a communication device, (a) any information that is grossly offensive or has menacing character; or (b) any information which he knows to be false, but for the purpose of causing annoyance, inconvenience, danger, obstruction, insult, injury, criminal intimidation, enmity, hatred or ill will, persistently by making use of such computer resource or a communication device, (c) any electronic mail or electronic mail message for the purpose of causing annoyance or inconvenience or to deceive or to mislead the addressee or recipient about the origin of such messages, shall be punishable with imprisonment for a term which may extend to three years and with fine. \n\nIMPORTANT: This section was struck down by the Supreme Court of India in Shreya Singhal v. Union of India (2015) as unconstitutional for violating Article 19(1)(a) (Freedom of Speech and Expression)."
        },
        {
            "section": "Section 43",
            "title": "Penalty and Compensation for damage to computer, computer system, etc.",
            "content": "Section 43 of the Info Tech Act covers civil liability (penalty/compensation) for unauthorized access, downloading data, introducing viruses, disrupting service, etc. It mandates compensation to the affected person. Section 66 makes these acts criminally punishable if done dishonestly or fraudulently."
        }
    ]
    
    documents = []
    for idx, s in enumerate(sections):
        content = f"""IT Act {s['section']} - {s['title']}

{s['content']}

Legal Reference: [Information Technology Act, 2000, {s['section']}]"""
        
        documents.append(Document(
            page_content=content,
            metadata={
                "act_name": "Information Technology Act, 2000",
                "section": s["section"],
                "title": s["title"],
                "source": "core_it_act_sections",
                "index": idx
            }
        ))
        
    logger.info(f"Added {len(documents)} core IT Act sections")
    return documents


def get_constitution_articles() -> List[Document]:
    """Add key Constitutional articles."""
    logger.info("Adding Constitution articles...")
    
    articles = [
        {
            "article": "Article 14",
            "title": "Equality before law",
            "content": "Article 14 of the Constitution of India guarantees equality before law. The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. This article embodies the principle that all persons are equal before the law and are entitled to equal protection of the law."
        },
        {
            "article": "Article 19",
            "title": "Protection of certain rights regarding freedom of speech, etc.",
            "content": "Article 19 of the Constitution of India guarantees six fundamental freedoms to all citizens: (a) freedom of speech and expression; (b) freedom to assemble peaceably and without arms; (c) freedom to form associations or unions; (d) freedom to move freely throughout the territory of India; (e) freedom to reside and settle in any part of the territory of India; (f) freedom to practice any profession, or to carry on any occupation, trade or business."
        },
        {
            "article": "Article 21",
            "title": "Protection of life and personal liberty",
            "content": "Article 21 of the Constitution of India provides that no person shall be deprived of his life or personal liberty except according to procedure established by law. This is one of the most fundamental rights. The Supreme Court has expanded its scope to include the right to live with dignity, right to livelihood, right to health, right to education, right to shelter, right to privacy, and many other rights."
        },
        {
            "article": "Article 21A",
            "title": "Right to education",
            "content": "Article 21A of the Constitution of India provides that the State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may, by law, determine. This article was inserted by the Constitution (Eighty-sixth Amendment) Act, 2002."
        },
        {
            "article": "Article 32",
            "title": "Remedies for enforcement of rights",
            "content": "Article 32 of the Constitution of India provides the right to move the Supreme Court for the enforcement of fundamental rights. The Supreme Court shall have power to issue directions or orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, for the enforcement of any of the rights conferred by Part III of the Constitution."
        },
        {
            "article": "Article 226",
            "title": "Power of High Courts to issue writs",
            "content": "Article 226 of the Constitution of India gives the High Courts the power to issue writs including habeas corpus, mandamus, prohibition, quo warranto, and certiorari for the enforcement of fundamental rights and for any other purpose. This power is wider than Article 32 as it can be invoked for purposes other than enforcement of fundamental rights."
        }
    ]
    
    documents = []
    for idx, article_data in enumerate(articles):
        content = f"""Constitution of India - {article_data['article']} - {article_data['title']}

{article_data['content']}

Legal Reference: [Constitution of India, {article_data['article']}]"""
        
        documents.append(Document(
            page_content=content,
            metadata={
                "act_name": "Constitution of India",
                "section": article_data["article"],
                "title": article_data["title"],
                "source": "constitution_articles",
                "index": idx
            }
        ))
    
    logger.info(f"Added {len(documents)} Constitution articles")
    return documents


def get_evidence_act_sections() -> List[Document]:
    """Add key Evidence Act sections that are commonly asked about."""
    logger.info("Adding Evidence Act sections...")
    
    sections = [
        {
            "section": "Section 65B",
            "title": "Admissibility of electronic records",
            "content": """Section 65B of the Indian Evidence Act, 1872 - Admissibility of electronic records.

(1) Notwithstanding anything contained in this Act, any information contained in an electronic record which is printed on a paper, stored, recorded or copied in optical or magnetic media produced by a computer (hereinafter referred to as the computer output) shall be deemed to be also a document, if the conditions mentioned in this section are satisfied in relation to the information and computer in question and shall be admissible in any proceedings, without further proof or production of the original, as evidence or any contents of the original or of any fact stated therein of which direct evidence would be admissible.

(2) The conditions referred to in sub-section (1) in respect of a computer output shall be the following, namely:
(a) the computer output containing the information was produced by the computer during the period over which the computer was used regularly to store or process information for the purposes of any activities regularly carried on over that period by the person having lawful control over the use of the computer;
(b) during the said period, information of the kind contained in the electronic record or of the kind from which the information so contained is derived was regularly fed into the computer in the ordinary course of the said activities;
(c) throughout the material part of the said period, the computer was operating properly or, if not, then in respect of any period in which it was not operating properly or was out of operation during that part of the period, was not such as to affect the electronic record or the accuracy of its contents; and
(d) the information contained in the electronic record reproduces or is derived from such information fed into the computer in the ordinary course of the said activities.

(3) Where over any period, the function of storing or processing information for the purposes of any activities regularly carried on over that period as mentioned in clause (a) of sub-section (2) was regularly performed by computers, whether by a combination of computers operating over that period, or by different computers operating in succession over that period, or by different combinations of computers operating in succession over that period, or in any other manner involving the successive operation over that period, in whatever order, of one or more computers and one or more combinations of computers, all the computers used for that purpose during that period shall be treated for the purposes of this section as constituting a single computer.

(4) In any proceedings where it is desired to give a statement in evidence by virtue of this section, a certificate doing any of the following things, that is to say:
(a) identifying the electronic record containing the statement and describing the manner in which it was produced;
(b) giving such particulars of any device involved in the production of that electronic record as may be appropriate for the purpose of showing that the electronic record was produced by a computer;
(c) dealing with any of the matters to which the conditions mentioned in sub-section (2) relate,
and purporting to be signed by a person occupying a responsible official position in relation to the operation of the relevant device or the management of the relevant activities (whichever is appropriate) shall be evidence of any matter stated in the certificate.

(5) For the purposes of this section:
(a) information shall be taken to be supplied to a computer if it is supplied thereto in any appropriate form and whether it is so supplied directly or (with or without human intervention) by means of any appropriate equipment;
(b) a computer output shall be taken to have been produced by a computer whether it was produced by it directly or (with or without human intervention) by means of any appropriate equipment.

This section is crucial for admitting phone call recordings, WhatsApp messages, emails, CCTV footage, and other electronic evidence in court proceedings."""
        },
        {
            "section": "Section 65A",
            "title": "Special provisions as to evidence relating to electronic record",
            "content": """Section 65A of the Indian Evidence Act, 1872 - Special provisions as to evidence relating to electronic record.

The contents of electronic records may be proved in accordance with the provisions of section 65B.

This section establishes that electronic records are a valid form of evidence and their contents can be proved using the procedure laid down in Section 65B."""
        },
    ]
    
    documents = []
    for idx, section in enumerate(sections):
        content = f"""Indian Evidence Act, 1872 - {section['section']}

{section['title'].upper()}

{section['content']}

Legal Reference: [Indian Evidence Act, 1872, {section['section']}]"""
        
        documents.append(Document(
            page_content=content,
            metadata={
                "act_name": "Indian Evidence Act, 1872",
                "section": section["section"],
                "title": section["title"],
                "source": "evidence_act_sections",
                "index": idx
            }
        ))
    
    logger.info(f"Added {len(documents)} Evidence Act sections")
    return documents


def load_all_datasets() -> List[Document]:
    """Load all available datasets and combine them."""
    logger.info("=" * 60)
    logger.info("Loading All Indian Law Datasets")
    logger.info("=" * 60)
    
    all_documents = []
    
    # 1. Core IPC sections (most important - always include)
    all_documents.extend(get_ipc_core_sections())
    
    # 2. Constitution articles
    all_documents.extend(get_constitution_articles())
    
    # 3. Load PDF documents (IPC, CrPC, CPC, Evidence Act)
    try:
        from scripts.load_pdf_documents import load_all_pdfs
        pdf_docs = load_all_pdfs()
        all_documents.extend(pdf_docs)
        logger.info(f"Loaded {len(pdf_docs)} documents from PDFs")
    except Exception as e:
        logger.warning(f"Could not load PDF documents: {e}")
    
    # 4. viber1/indian-law-dataset
    all_documents.extend(load_viber1_dataset())
    
    # 5. Try to load additional datasets
    try:
        all_documents.extend(load_ipc_dataset())
    except:
        pass
    
    try:
        all_documents.extend(load_legal_finetuning_dataset())
    except:
        pass
    
    logger.info("=" * 60)
    logger.info(f"Total documents loaded: {len(all_documents)}")
    logger.info("=" * 60)
    
    return all_documents


if __name__ == "__main__":
    docs = load_all_datasets()
    print(f"\nTotal documents: {len(docs)}")
    
    # Show breakdown by source
    sources = {}
    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        sources[src] = sources.get(src, 0) + 1
    
    print("\nDocuments by source:")
    for src, count in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {src}: {count}")
