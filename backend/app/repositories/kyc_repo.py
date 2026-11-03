import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.kyc import KycRecord, KycDocument


class KycRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_latest_for_citizen(self, citizen_id: uuid.UUID) -> Optional[KycRecord]:
        stmt = (
            select(KycRecord)
            .where(KycRecord.citizen_id == citizen_id)
            .order_by(KycRecord.submitted_at.desc())
        )
        return self.db.scalars(stmt).first()

    def get_by_id(self, record_id: uuid.UUID) -> Optional[KycRecord]:
        stmt = select(KycRecord).where(KycRecord.id == record_id)
        return self.db.scalars(stmt).first()

    def create_record(
        self,
        citizen_id: uuid.UUID,
        kyc_tier: str = "T0",
        status: str = "PENDING",
    ) -> KycRecord:
        record = KycRecord(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            kyc_tier=kyc_tier,
            status=status,
            submitted_at=datetime.utcnow(),
        )
        self.db.add(record)
        self.db.flush()
        return record

    def create_document(
        self,
        kyc_record_id: uuid.UUID,
        document_type: str,
        storage_object_key: str,
        content_type: str,
        file_size_bytes: int,
        original_filename: Optional[str] = None,
        document_number_token: Optional[str] = None,
    ) -> KycDocument:
        doc = KycDocument(
            id=uuid.uuid4(),
            kyc_record_id=kyc_record_id,
            document_type=document_type,
            document_number_token=document_number_token,
            storage_object_key=storage_object_key,
            original_filename=original_filename,
            content_type=content_type,
            file_size_bytes=file_size_bytes,
            verification_status="PENDING",
            uploaded_at=datetime.utcnow(),
        )
        self.db.add(doc)
        self.db.flush()
        return doc

    def get_documents_for_record(self, kyc_record_id: uuid.UUID) -> List[KycDocument]:
        stmt = select(KycDocument).where(KycDocument.kyc_record_id == kyc_record_id)
        return list(self.db.scalars(stmt).all())

    def get_document_by_id(
        self, document_id: uuid.UUID, citizen_id: Optional[uuid.UUID] = None
    ) -> Optional[KycDocument]:
        stmt = (
            select(KycDocument)
            .join(KycRecord, KycDocument.kyc_record_id == KycRecord.id)
            .where(KycDocument.id == document_id)
        )
        if citizen_id:
            stmt = stmt.where(KycRecord.citizen_id == citizen_id)
        return self.db.scalars(stmt).first()

    def update_status(
        self,
        record_id: uuid.UUID,
        status: str,
        tier: Optional[str] = None,
        reviewer_id: Optional[uuid.UUID] = None,
        reason_code: Optional[str] = None,
    ) -> Optional[KycRecord]:
        record = self.get_by_id(record_id)
        if record:
            record.status = status
            record.reviewed_at = datetime.utcnow()
            if tier:
                record.kyc_tier = tier
            if reviewer_id:
                record.reviewed_by_citizen_id = reviewer_id
            if reason_code:
                record.review_reason_code = reason_code
        return record
