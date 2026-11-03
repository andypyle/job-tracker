from typing import Literal, Optional

from pydantic import BaseModel

# The choices on the Settings page; the database CHECK constraint allows the same values
UnlikelyAfterDays = Literal[7, 14, 21, 30, 60]

# For users without a user_settings row
DEFAULT_UNLIKELY_AFTER_DAYS: UnlikelyAfterDays = 14


class UserSettings(BaseModel):
    # None turns the nightly move to Unlikely off for this user
    unlikely_after_days: Optional[UnlikelyAfterDays]


class UserSettingsUpdate(BaseModel):
    # Required but nullable: the client always sends it, and null means never
    unlikely_after_days: Optional[UnlikelyAfterDays]
