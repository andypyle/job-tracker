from functools import lru_cache
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    # Neon Auth's base URL for the branch, e.g. https://ep-….neonauth.….aws.neon.tech/neondb/auth
    NEON_AUTH_BASE_URL: str

    # Neon Object Storage (S3-compatible). Read here rather than by boto3 from the environment,
    # so a local .env works too.
    AWS_ENDPOINT_URL_S3: str
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    STORAGE_BUCKET: str = "application-files"

    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def neon_auth_jwks_url(self) -> str:
        return f"{self.NEON_AUTH_BASE_URL.rstrip('/')}/.well-known/jwks.json"

    @property
    def neon_auth_issuer(self) -> str:
        """Neon Auth JWTs use the auth host's origin as both issuer and audience."""
        parts = urlsplit(self.NEON_AUTH_BASE_URL)
        return f"{parts.scheme}://{parts.netloc}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
