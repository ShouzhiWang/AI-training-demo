from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import CurrentUser


router = APIRouter(tags=["auth"])


@router.get("/me")
async def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    return user

