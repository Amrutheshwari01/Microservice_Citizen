import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.api.v1.dependencies import get_current_citizen
from app.models.citizen import Citizen
from app.services.citizen_service import WalletService
from app.schemas.wallet import TransferRequest, TopupRequest, CashoutRequest

router = APIRouter(prefix="/wallets", tags=["Wallet"])


@router.get(
    "/me",
    summary="Get wallet summary",
    description="Returns available balance, active holds, today's and month's spend for the citizen's INR wallet.",
)
def get_wallet(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return {
        "success": True,
        "data": service.get_wallet_summary(citizen),
    }


@router.get(
    "/me/transactions",
    summary="Get transaction history",
    description="Returns paginated wallet transaction history (newest first).",
)
def get_transactions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return {
        "success": True,
        "data": service.get_transactions(citizen, limit=limit, offset=offset),
    }


@router.post(
    "/transfer",
    status_code=201,
    summary="Transfer funds to another citizen",
    description=(
        "Performs an atomic double-entry peer-to-peer transfer. "
        "Requires an idempotency_key to prevent duplicate submissions. "
        "Uses row-level locking to prevent concurrent overdraft."
    ),
)
def transfer(
    req: TransferRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.transfer(citizen, req)


@router.post(
    "/topup",
    status_code=201,
    summary="Top up wallet",
    description="Credits the citizen's wallet for a confirmed top-up from UPI or NETBANKING.",
)
def topup(
    req: TopupRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.topup(citizen, req)


@router.post(
    "/cashout",
    status_code=201,
    summary="Cash out from wallet",
    description="Initiates a payout from wallet to bank account.",
)
def cashout(
    req: CashoutRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.cashout(citizen, req)


@router.get(
    "/holds",
    summary="Get all wallet holds",
    description="Lists all escrow holds on the citizen's wallet (active and historical).",
)
def get_holds(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return {
        "success": True,
        "data": service.get_holds(citizen),
    }


@router.post(
    "/holds/{hold_id}/release",
    summary="Release a hold",
    description="Releases an active escrow hold and returns funds to the wallet's available balance.",
)
def release_hold(
    hold_id: uuid.UUID,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.release_hold(citizen, hold_id)
