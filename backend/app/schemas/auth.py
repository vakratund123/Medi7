from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    staff_id: str
    full_name: str


class TokenData(BaseModel):
    staff_id: str
    role: str
