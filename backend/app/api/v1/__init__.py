from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.citizens import router as citizens_router
from app.api.v1.personas import router as personas_router
from app.api.v1.kyc import router as kyc_router
from app.api.v1.wallets import router as wallets_router
from app.api.v1.internal import router as internal_router
from app.api.v1.consents import router as consents_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.admin import router as admin_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(citizens_router)
api_v1_router.include_router(personas_router)
api_v1_router.include_router(kyc_router)
api_v1_router.include_router(wallets_router)
api_v1_router.include_router(internal_router)
api_v1_router.include_router(consents_router)
api_v1_router.include_router(sessions_router)
api_v1_router.include_router(admin_router)

__all__ = ["api_v1_router"]
