from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ApplicationStatus(str, Enum):
    Applied = "Applied"
    Interviewing = "Interviewing"
    Unlikely = "Unlikely"
    Offer = "Offer"
    Rejected = "Rejected"
    RoleEliminated = "Role Eliminated"


class ApplicationBase(BaseModel):
    job_post_url: Optional[str] = None
    job_title: str
    company: str
    company_logo_url: Optional[str] = None
    industry: Optional[str] = None
    compensation: Optional[str] = None
    notes: Optional[str] = None
    is_referral: bool = False
    date_applied: date


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    job_post_url: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    company_logo_url: Optional[str] = None
    industry: Optional[str] = None
    compensation: Optional[str] = None
    notes: Optional[str] = None
    is_referral: Optional[bool] = None
    date_applied: Optional[date] = None
    status: Optional[ApplicationStatus] = None


class ApplicationResponse(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    status: ApplicationStatus
    resume_path: Optional[str] = None
    cover_letter_path: Optional[str] = None
    resume_url: Optional[str] = None
    cover_letter_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
