from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app import auth
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/register", response_model=UserResponse, status_code=201)
def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(name=body.name.strip(), email=email, password=auth.hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    auth.create_session(db, user, request, response)
    return user


@router.post("/login", response_model=UserResponse)
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == body.email.lower()).first()

    if user is None:
        auth.verify_password(body.password, auth.DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not auth.verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if auth.needs_rehash(user.password):
        user.password = auth.hash_password(body.password)
        db.commit()

    auth.create_session(db, user, request, response)
    return user


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(auth.get_current_user)):
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    auth.end_session(db, request, response)
